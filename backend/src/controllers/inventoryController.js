const InventoryItem = require("../models/InventoryItem");
const { AppError, asyncHandler } = require("../utils/errors");

// GET /api/inventory — مخزون فرع الموظف (superadmin بيقدر يحدد فرع عبر query)
const getInventory = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "superadmin") {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }

  const items = await InventoryItem.find(filter).sort({ name: 1 });
  res.status(200).json({ success: true, count: items.length, items });
});

// POST /api/inventory — إضافة صنف جديد للمخزون (branchManager / superadmin)
const createItem = asyncHandler(async (req, res) => {
  const { name, partNumber, quantity, unit, branch } = req.body;
  if (!name) throw new AppError("اسم القطعة مطلوب", 400);

  const branchId = req.user.role === "superadmin" ? branch : req.user.branch;
  if (!branchId) throw new AppError("لازم يكون في فرع واضح لهالصنف", 400);

  const item = await InventoryItem.create({
    branch: branchId,
    name,
    partNumber,
    quantity: quantity || 0,
    unit,
  });

  res.status(201).json({ success: true, item });
});

// PATCH /api/inventory/:id/adjust — إضافة أو خصم كمية يدويًا { delta: 5 } أو { delta: -2 }
const adjustQuantity = asyncHandler(async (req, res) => {
  const { delta } = req.body;
  if (delta === undefined || Number.isNaN(Number(delta))) {
    throw new AppError("delta (رقم موجب أو سالب) مطلوب", 400);
  }
  const deltaNum = Number(delta);

  const existing = await InventoryItem.findById(req.params.id);
  if (!existing) throw new AppError("الصنف غير موجود", 404);

  if (req.user.role !== "superadmin" && existing.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل مخزون فرع تاني", 403);
  }

  // فحص الكمية وتحديثها بعملية ذرّية واحدة (بدل قراءة الكمية وحسابها بالـJS ثم حفظها
  // كخطوتين منفصلتين) — نفس فكرة حجز السيارة بـcreateSale بالضبط، بس هون الشرط رقمي:
  // الكمية الحالية لازم تكون كافية لتحمّل الخصم (quantity >= -delta) قبل ما نطبّق $inc.
  // لاحظ إنه هالشرط بيشتغل صح مع الإضافة كمان (delta موجبة): -delta بتصير سالبة،
  // وبما إنه quantity لازم تكون >= 0 دايمًا (حسب الموديل)، الشرط بيتحقق تلقائيًا.
  const item = await InventoryItem.findOneAndUpdate(
    { _id: req.params.id, quantity: { $gte: -deltaNum } },
    { $inc: { quantity: deltaNum } },
    { new: true },
  );

  if (!item) {
    throw new AppError("الكمية المتوفرة أقل من المطلوب خصمه", 400);
  }

  res.status(200).json({ success: true, item });
});

module.exports = { getInventory, createItem, adjustQuantity };
