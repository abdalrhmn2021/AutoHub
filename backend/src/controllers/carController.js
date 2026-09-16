const Car = require("../models/Car");
const { AppError, asyncHandler } = require("../utils/errors");

// GET /api/cars — عام، بفلاتر (make, model, minPrice, maxPrice, fuelType, transmission, branch, status)
const getCars = asyncHandler(async (req, res) => {
  const { make, model, minPrice, maxPrice, fuelType, transmission, branch, status, year } = req.query;

  const filter = {};
  if (make) filter.make = new RegExp(make, "i");
  if (model) filter.model = new RegExp(model, "i");
  if (fuelType) filter.fuelType = fuelType;
  if (transmission) filter.transmission = transmission;
  if (branch) filter.branch = branch;
  if (year) filter.year = Number(year);
  filter.status = status || "available"; // افتراضيًا نعرض السيارات المتوفرة بس للزبون

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [cars, total] = await Promise.all([
    Car.find(filter).populate("branch", "name city").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Car.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: cars.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    cars,
  });
});

// GET /api/cars/:id
const getCar = asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id).populate("branch", "name city phone");
  if (!car) throw new AppError("السيارة غير موجودة", 404);
  res.status(200).json({ success: true, car });
});

// POST /api/cars — superadmin / branchManager / salesAgent
const createCar = asyncHandler(async (req, res) => {
  const branchId = req.user.role === "superadmin" ? req.body.branch : req.user.branch;
  if (!branchId) throw new AppError("الفرع مطلوب لإضافة سيارة", 400);

  const car = await Car.create({
    ...req.body,
    branch: branchId,
    addedBy: req.user._id,
  });

  res.status(201).json({ success: true, car });
});

// الحقول المسموح تعديلها يدويًا عبر هالنقطة بس — status وowner وaddedBy وbranch
// حساسين ولازم يتغيّروا بس من مسارات مخصصة (approveSale, superadmin مباشرة...)،
// مش عن طريق تعديل عشوائي (mass assignment) من أي حقل يبعته العميل بالـbody.
const UPDATABLE_CAR_FIELDS = [
  "make",
  "model",
  "year",
  "trim",
  "price",
  "mileage",
  "fuelType",
  "transmission",
  "color",
  "vin",
  "images",
  "description",
];

// PATCH /api/cars/:id
const updateCar = asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car) throw new AppError("السيارة غير موجودة", 404);

  if (req.user.role !== "superadmin" && car.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل سيارة فرع تاني", 403);
  }

  for (const field of UPDATABLE_CAR_FIELDS) {
    if (req.body[field] !== undefined) car[field] = req.body[field];
  }
  // الفرع (branch) قابل للتغيير من superadmin بس، ومنفصل عن باقي الحقول المسموحة
  if (req.user.role === "superadmin" && req.body.branch !== undefined) {
    car.branch = req.body.branch;
  }

  await car.save();

  res.status(200).json({ success: true, car });
});

// DELETE /api/cars/:id
const deleteCar = asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.id);
  if (!car) throw new AppError("السيارة غير موجودة", 404);

  if (req.user.role !== "superadmin" && car.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تحذف سيارة فرع تاني", 403);
  }

  await car.deleteOne();
  res.status(200).json({ success: true, message: "تم حذف السيارة" });
});

module.exports = { getCars, getCar, createCar, updateCar, deleteCar };
