const Branch = require("../models/Branch");
const { AppError, asyncHandler } = require("../utils/errors");

// GET /api/branches — عام لأي مستخدم مسجل دخول
const getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ isActive: true }).populate("manager", "name email");
  res.status(200).json({ success: true, count: branches.length, branches });
});

// GET /api/branches/:id
const getBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id).populate("manager", "name email");
  if (!branch) throw new AppError("الفرع غير موجود", 404);
  res.status(200).json({ success: true, branch });
});

// POST /api/branches — superadmin بس
const createBranch = asyncHandler(async (req, res) => {
  const { name, city, address, phone, manager } = req.body;
  if (!name || !city) {
    throw new AppError("اسم الفرع والمدينة مطلوبين", 400);
  }
  const branch = await Branch.create({ name, city, address, phone, manager });
  res.status(201).json({ success: true, branch });
});

// PATCH /api/branches/:id — superadmin بس
const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!branch) throw new AppError("الفرع غير موجود", 404);
  res.status(200).json({ success: true, branch });
});

// DELETE /api/branches/:id — superadmin بس (تعطيل مش حذف فعلي)
const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!branch) throw new AppError("الفرع غير موجود", 404);
  res.status(200).json({ success: true, message: "تم إلغاء تفعيل الفرع" });
});

module.exports = { getBranches, getBranch, createBranch, updateBranch, deleteBranch };
