const Sale = require("../models/Sale");
const Car = require("../models/Car");
const { asyncHandler } = require("../utils/errors");

// مدير الفرع يشوف فرعه بس (نفس منطق sameBranchOnly المستخدم بباقي الكونترولرز)،
// superadmin بيشوف كل شي — بدون فلتر إطلاقًا.
const branchScope = (req) => (req.user.role === "branchManager" ? { branch: req.user.branch } : {});

// GET /api/analytics/overview — superadmin / branchManager
const getOverview = asyncHandler(async (req, res) => {
  const scope = branchScope(req);

  const [salesStats] = await Sale.aggregate([
    { $match: { status: "approved", ...scope } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$netPrice" },
        totalSales: { $sum: 1 },
        avgDealSize: { $avg: "$netPrice" },
      },
    },
  ]);

  const [pendingApprovals, carsAvailable, carsSold, carsReserved] = await Promise.all([
    Sale.countDocuments({ status: "pending_approval", ...scope }),
    Car.countDocuments({ status: "available", ...scope }),
    Car.countDocuments({ status: "sold", ...scope }),
    Car.countDocuments({ status: "reserved", ...scope }),
  ]);

  res.status(200).json({
    success: true,
    overview: {
      totalRevenue: salesStats?.totalRevenue || 0,
      totalSales: salesStats?.totalSales || 0,
      avgDealSize: Math.round(salesStats?.avgDealSize || 0),
      pendingApprovals,
      carsAvailable,
      carsSold,
      carsReserved,
    },
  });
});

// GET /api/analytics/by-branch — superadmin بس (مقارنة بين فروع مالها معنى لمدير فرع واحد)
const getByBranch = asyncHandler(async (req, res) => {
  const results = await Sale.aggregate([
    { $match: { status: "approved" } },
    {
      $group: {
        _id: "$branch",
        totalRevenue: { $sum: "$netPrice" },
        totalSales: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "branches",
        localField: "_id",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: "$branch" },
    {
      $project: {
        _id: 0,
        branchId: "$branch._id",
        name: "$branch.name",
        city: "$branch.city",
        totalRevenue: 1,
        totalSales: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  res.status(200).json({ success: true, branches: results });
});

// GET /api/analytics/top-models — superadmin / branchManager (مفلترة حسب الفرع لمدير الفرع)
const getTopModels = asyncHandler(async (req, res) => {
  const scope = branchScope(req);

  const results = await Sale.aggregate([
    { $match: { status: "approved", ...scope } },
    {
      $lookup: {
        from: "cars",
        localField: "car",
        foreignField: "_id",
        as: "carDoc",
      },
    },
    { $unwind: "$carDoc" },
    {
      $group: {
        _id: { make: "$carDoc.make", model: "$carDoc.model" },
        unitsSold: { $sum: 1 },
        revenue: { $sum: "$netPrice" },
      },
    },
    { $sort: { unitsSold: -1, revenue: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        make: "$_id.make",
        model: "$_id.model",
        unitsSold: 1,
        revenue: 1,
      },
    },
  ]);

  res.status(200).json({ success: true, models: results });
});

module.exports = { getOverview, getByBranch, getTopModels };
