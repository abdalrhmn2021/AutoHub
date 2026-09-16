const ServiceAppointment = require("../models/ServiceAppointment");
const Car = require("../models/Car");
const User = require("../models/User");
const { AppError, asyncHandler } = require("../utils/errors");
const getStripe = require("../utils/stripe");

// الانتقالات المسموحة بين حالات الموعد — بيمنع الرجوع لحالة سابقة أو القفز
// لحالة غير منطقية (مثلاً requested → completed مباشرة بدون ما يمر بأي خطوة).
const ALLOWED_STATUS_TRANSITIONS = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// GET /api/service
// superadmin: الكل. branchManager: فرعه. technician: المسندة له بس.
const getAppointments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "branchManager") filter.branch = req.user.branch;
  if (req.user.role === "technician") filter.assignedTechnician = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const appointments = await ServiceAppointment.find(filter)
    .populate("car", "make model year vin")
    .populate("assignedTechnician", "name")
    .sort({ preferredDate: 1 });

  res.status(200).json({ success: true, count: appointments.length, appointments });
});

// GET /api/service/:id
const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await ServiceAppointment.findById(req.params.id)
    .populate("car")
    .populate("assignedTechnician", "name email")
    .populate("registeredBy", "name");

  if (!appointment) throw new AppError("الموعد غير موجود", 404);
  res.status(200).json({ success: true, appointment });
});

// GET /api/service/car/:carId — سجل الصيانة الكامل لسيارة معيّنة (حسب VIN فعليًا)
const getCarServiceHistory = asyncHandler(async (req, res) => {
  const car = await Car.findById(req.params.carId);
  if (!car) throw new AppError("السيارة غير موجودة", 404);

  if (req.user.role === "branchManager" && car.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تشوف سجل سيارة فرع تاني", 403);
  }

  const appointments = await ServiceAppointment.find({ car: car._id })
    .populate("assignedTechnician", "name")
    .sort({ preferredDate: -1 });

  res.status(200).json({ success: true, car: { make: car.make, model: car.model, vin: car.vin }, appointments });
});

// POST /api/service — تسجيل موعد لزبون واصل للمعرض
const createAppointment = asyncHandler(async (req, res) => {
  const { car: carId, customerName, customerPhone, serviceType, description, preferredDate } = req.body;

  if (!carId || !customerName || !customerPhone || !preferredDate) {
    throw new AppError("السيارة واسم الزبون وهاتفه والتاريخ المفضّل مطلوبين", 400);
  }

  const car = await Car.findById(carId);
  if (!car) throw new AppError("السيارة غير موجودة", 404);

  // الموعد لازم ينحفظ بفرع السيارة الفعلي، مش فرع الموظف — منعًا لتناقض البيانات
  // (سيارة فيزيائيًا بفرع، وسجل صيانتها مسجّل تحت فرع تاني). مدير الفرع مقيّد بفرعه بس.
  if (req.user.role === "branchManager" && car.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تسجّل موعد لسيارة فرع تاني", 403);
  }

  const appointment = await ServiceAppointment.create({
    car: carId,
    branch: car.branch,
    customerName,
    customerPhone,
    serviceType,
    description,
    preferredDate,
    registeredBy: req.user._id,
  });

  res.status(201).json({ success: true, appointment });
});

// PATCH /api/service/:id/assign — تعيين فني (branchManager / superadmin)
const assignTechnician = asyncHandler(async (req, res) => {
  const { technicianId } = req.body;
  if (!technicianId) throw new AppError("الفني مطلوب", 400);

  const appointment = await ServiceAppointment.findById(req.params.id);
  if (!appointment) throw new AppError("الموعد غير موجود", 404);

  if (req.user.role === "branchManager" && appointment.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل موعد فرع تاني", 403);
  }

  // التحقق الناقص سابقًا: التأكد إنه الـtechnicianId فعليًا مستخدم موجود، دوره technician
  // بالضبط (مش أي دور تاني)، وتابع لنفس فرع الموعد.
  const technician = await User.findById(technicianId);
  if (!technician || technician.role !== "technician") {
    throw new AppError("الفني المحدد غير صالح", 400);
  }
  if (technician.branch?.toString() !== appointment.branch.toString()) {
    throw new AppError("الفني لازم يكون تابع لنفس فرع الموعد", 400);
  }

  appointment.assignedTechnician = technicianId;
  if (appointment.status === "requested") appointment.status = "confirmed";
  await appointment.save();

  res.status(200).json({ success: true, appointment });
});

// PATCH /api/service/:id/status — تحديث حالة الموعد (الفني المسؤول، أو مدير الفرع/superadmin)
const updateStatus = asyncHandler(async (req, res) => {
  const { status, completionNotes, invoiceAmount } = req.body;
  const appointment = await ServiceAppointment.findById(req.params.id);
  if (!appointment) throw new AppError("الموعد غير موجود", 404);

  const isAssignedTechnician =
    req.user.role === "technician" && appointment.assignedTechnician?.toString() === req.user._id.toString();
  const isManager = req.user.role === "superadmin" || req.user.role === "branchManager";

  if (!isAssignedTechnician && !isManager) {
    throw new AppError("ما إلك صلاحية تعدّل هالموعد", 403);
  }
  if (req.user.role === "branchManager" && appointment.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية تعدّل موعد فرع تاني", 403);
  }

  // التحقق الناقص سابقًا: enum بالموديل بيتحقق إنه القيمة من ضمن القائمة المسموحة، بس
  // ما بيتحقق من منطقية الانتقال (مثلاً الرجوع من completed لـrequested). هون منتحقق
  // من الانتقال نفسه قبل ما نطبّقه.
  if (status && status !== appointment.status) {
    const allowedNext = ALLOWED_STATUS_TRANSITIONS[appointment.status] || [];
    if (!allowedNext.includes(status)) {
      throw new AppError(
        `ما بينفع تغيّر حالة الموعد من "${appointment.status}" لـ"${status}" مباشرة`,
        400,
      );
    }
    appointment.status = status;
  }
  if (completionNotes) appointment.completionNotes = completionNotes;

  // لو الموعد خلص (completed) وفي مبلغ فاتورة محدد، منجهّز الفاتورة كـ"unpaid" —
  // لو ما في مبلغ (مثلاً صيانة تحت الضمان)، الفاتورة بتضل "not_issued" (القيمة الافتراضية).
  if (status === "completed" && invoiceAmount !== undefined && invoiceAmount !== null) {
    if (invoiceAmount <= 0) throw new AppError("مبلغ الفاتورة لازم يكون أكبر من صفر", 400);
    appointment.invoice.amount = invoiceAmount;
    appointment.invoice.status = "unpaid";
  }

  await appointment.save();

  res.status(200).json({ success: true, appointment });
});

// POST /api/service/:id/invoice-checkout — بينشئ جلسة دفع Stripe لفاتورة الصيانة
const createInvoiceCheckout = asyncHandler(async (req, res) => {
  const appointment = await ServiceAppointment.findById(req.params.id);
  if (!appointment) throw new AppError("الموعد غير موجود", 404);

  if (req.user.role === "branchManager" && appointment.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية على موعد فرع تاني", 403);
  }

  if (appointment.invoice.status === "not_issued") {
    throw new AppError("ما في فاتورة صادرة لهالموعد بعد", 409);
  }
  if (appointment.invoice.status === "paid") {
    throw new AppError("الفاتورة مدفوعة مسبقًا", 409);
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `فاتورة صيانة — موعد #${appointment._id}` },
          unit_amount: Math.round(appointment.invoice.amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { type: "service_invoice", serviceId: appointment._id.toString() },
    success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/service?invoice=success`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/service?invoice=cancelled`,
  });

  appointment.invoice.stripeSessionId = session.id;
  await appointment.save();

  res.status(200).json({ success: true, url: session.url });
});

module.exports = {
  getAppointments,
  getAppointment,
  getCarServiceHistory,
  createAppointment,
  assignTechnician,
  updateStatus,
  createInvoiceCheckout,
};
