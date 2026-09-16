const Lead = require("../models/Lead");
const Car = require("../models/Car");
const User = require("../models/User");
const { AppError, asyncHandler } = require("../utils/errors");

// GET /api/leads
// superadmin: كل الـLeads. branchManager: leads فرعه. salesAgent: بس الـLeads المسندة له.
const getLeads = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === "branchManager") {
    filter.branch = req.user.branch;
  } else if (req.user.role === "salesAgent") {
    filter.assignedTo = req.user._id;
  }
  // superadmin: بدون فلترة

  if (req.query.status) filter.status = req.query.status;

  const leads = await Lead.find(filter)
    .populate("car", "make model year price")
    .populate("assignedTo", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: leads.length, leads });
});

// GET /api/leads/:id
const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate("car", "make model year price status")
    .populate("assignedTo", "name email")
    .populate("notes.addedBy", "name");

  if (!lead) throw new AppError("الـLead غير موجود", 404);

  if (req.user.role === "salesAgent" && lead.assignedTo._id.toString() !== req.user._id.toString()) {
    throw new AppError("ما إلك صلاحية تشوف هالـLead", 403);
  }
  if (req.user.role === "branchManager" && lead.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تشوف هالـLead", 403);
  }

  res.status(200).json({ success: true, lead });
});

// POST /api/leads — تسجيل يدوي من مندوب المبيعات أو مدير الفرع
const createLead = asyncHandler(async (req, res) => {
  const { customerName, customerPhone, customerEmail, car: carId, assignedTo } = req.body;

  if (!customerName || !customerPhone || !carId) {
    throw new AppError("اسم الزبون ورقم هاتفه والسيارة مطلوبين", 400);
  }

  const car = await Car.findById(carId);
  if (!car) throw new AppError("السيارة غير موجودة", 404);

  // الـLead لازم ينحفظ بفرع السيارة الفعلي، مش فرع الموظف — نفس فكرة createAppointment
  // (منعًا لتناقض البيانات: سيارة بفرع، وLead تبعها مسجّل تحت فرع تاني).
  if (req.user.role === "branchManager" && car.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تسجّل Lead لسيارة فرع تاني", 403);
  }

  // مندوب المبيعات بيسجّل الـLead لنفسه، مدير الفرع يقدر يسند لأي مندوب بفرعه —
  // بس لازم نتحقق إنه المندوب هاد فعلاً موجود، دوره salesAgent بالضبط، وتابع لنفس الفرع.
  let finalAssignedTo = req.user._id;
  if (req.user.role === "branchManager" && assignedTo) {
    const agent = await User.findById(assignedTo);
    if (!agent || agent.role !== "salesAgent") {
      throw new AppError("المندوب المحدد غير صالح", 400);
    }
    if (agent.branch?.toString() !== car.branch.toString()) {
      throw new AppError("المندوب لازم يكون تابع لنفس فرع السيارة", 400);
    }
    finalAssignedTo = assignedTo;
  }

  const lead = await Lead.create({
    customerName,
    customerPhone,
    customerEmail,
    car: carId,
    branch: car.branch,
    assignedTo: finalAssignedTo,
  });

  res.status(201).json({ success: true, lead });
});

// PATCH /api/leads/:id — تحديث الحالة
const updateLeadStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError("الـLead غير موجود", 404);

  if (req.user.role === "salesAgent" && lead.assignedTo.toString() !== req.user._id.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل هالـLead", 403);
  }
  if (req.user.role === "branchManager" && lead.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل هالـLead", 403);
  }

  if (status) lead.status = status;
  await lead.save();

  res.status(200).json({ success: true, lead });
});

// POST /api/leads/:id/notes — إضافة ملاحظة متابعة
const addNote = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new AppError("نص الملاحظة مطلوب", 400);

  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError("الـLead غير موجود", 404);

  if (req.user.role === "salesAgent" && lead.assignedTo.toString() !== req.user._id.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل هالـLead", 403);
  }
  if (req.user.role === "branchManager" && lead.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل هالـLead", 403);
  }

  lead.notes.push({ text, addedBy: req.user._id });
  await lead.save();

  res.status(201).json({ success: true, lead });
});

module.exports = { getLeads, getLead, createLead, updateLeadStatus, addNote };
