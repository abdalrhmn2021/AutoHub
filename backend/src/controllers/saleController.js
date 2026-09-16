const Sale = require("../models/Sale");
const Lead = require("../models/Lead");
const Car = require("../models/Car");
const TradeInRequest = require("../models/TradeInRequest");
const { AppError, asyncHandler } = require("../utils/errors");
const { calculateFinancing } = require("../utils/finance");
const { getIO } = require("../socket");
const getStripe = require("../utils/stripe");

// بيبعت حدث لحظي لمندوب المبيعات صاحب الصفقة بس (غرفة user:<id>) — لو Socket.io
// مش شغّال (مثلاً بالتيست) getIO() بترجع null فبنتجاهل بهدوء، ما بنكسر الطلب الأساسي.
const notifySaleAgent = (sale) => {
  const io = getIO();
  if (!io) return;
  io.to(`user:${sale.salesAgent}`).emit("sale:statusChanged", {
    saleId: sale._id,
    status: sale.status,
  });
};

// GET /api/sales — نفس منطق فلترة الفرع متل الـLeads
const getSales = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "branchManager") filter.branch = req.user.branch;
  if (req.user.role === "salesAgent") filter.salesAgent = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const sales = await Sale.find(filter)
    .populate("car", "make model year vin")
    .populate("salesAgent", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: sales.length, sales });
});

// GET /api/sales/:id
const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate("car")
    .populate("salesAgent", "name email")
    .populate("approvedBy", "name")
    .populate("lead");

  if (!sale) throw new AppError("الصفقة غير موجودة", 404);
  res.status(200).json({ success: true, sale });
});

// POST /api/sales — تحويل Lead لصفقة بيع (بانتظار موافقة مدير الفرع)
const createSale = asyncHandler(async (req, res) => {
  const { lead: leadId, price, paymentMethod, downPayment, months, annualInterestRate, tradeIn: tradeInId } =
    req.body;

  if (!leadId || !price) {
    throw new AppError("الـLead والسعر النهائي مطلوبين", 400);
  }

  const lead = await Lead.findById(leadId);
  if (!lead) throw new AppError("الـLead غير موجود", 404);

  if (req.user.role === "salesAgent" && lead.assignedTo.toString() !== req.user._id.toString()) {
    throw new AppError("ما إلك صلاحية تحوّل هالـLead لصفقة بيع", 403);
  }

  // نحجز السيارة بعملية ذرّية واحدة (فحص الحالة + تحديثها سوا بنفس استعلام قاعدة البيانات)
  // بدل قراءة الحالة بـfindById وحفظها لاحقاً بـsave() — هيك التقييم والحفظ ما بيصيرو
  // خطوتين منفصلتين بأزمنة مختلفة، وما بيصير احتمال طلبين يحجزوا نفس السيارة بنفس اللحظة.
  const car = await Car.findOneAndUpdate(
    { _id: lead.car, status: "available" },
    { $set: { status: "reserved" } },
    { new: true }
  );

  if (!car) {
    const carExists = await Car.exists({ _id: lead.car });
    if (!carExists) throw new AppError("السيارة المرتبطة بالـLead غير موجودة", 404);
    throw new AppError("السيارة مش متوفرة حاليًا (محجوزة أو مباعة)", 409);
  }

  try {
    // لو الزبون قدّم سيارته القديمة، نتحقق من طلب التقييم ونحجزه لهالصفقة (نفس منطق حجز السيارة:
    // منع استخدام نفس التقييم بصفقتين بنفس الوقت)
    let tradeInRequest = null;
    let tradeInValue = 0;
    if (tradeInId) {
      tradeInRequest = await TradeInRequest.findById(tradeInId);
      if (!tradeInRequest) throw new AppError("طلب تقييم السيارة المستعملة غير موجود", 404);
      if (tradeInRequest.status !== "pending") {
        throw new AppError("طلب التقييم هذا مستخدم مسبقًا أو منتهي", 409);
      }
      if (lead.customer && tradeInRequest.customer.toString() !== lead.customer.toString()) {
        throw new AppError("طلب التقييم هذا مش لنفس زبون الـLead", 403);
      }
      tradeInValue = tradeInRequest.estimatedValue;
    }

    // السعر الفعلي يلي رح يدفعه الزبون (وعليه بيتحسب التمويل)، بعد ما ننزل قيمة التقييم
    const netPrice = Math.max(0, price - tradeInValue);

    // لو الدفع تقسيط، نحسب القسط الشهري تلقائيًا على السعر الصافي (بعد التقييم)
    let financing = null;
    if (paymentMethod === "installment") {
      if (!downPayment || !months || annualInterestRate === undefined) {
        throw new AppError("الدفعة الأولى وعدد الأشهر ونسبة الفائدة مطلوبين للتقسيط", 400);
      }
      const calc = calculateFinancing(netPrice, downPayment, months, annualInterestRate);
      financing = {
        downPayment,
        months,
        annualInterestRate,
        monthlyPayment: calc.monthlyPayment,
        totalPayable: calc.totalPayable,
      };
    }

    const sale = await Sale.create({
      lead: lead._id,
      car: car._id,
      branch: lead.branch,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      salesAgent: req.user.role === "salesAgent" ? req.user._id : lead.assignedTo,
      price,
      netPrice,
      tradeIn: tradeInRequest ? { request: tradeInRequest._id, value: tradeInValue } : undefined,
      paymentMethod: paymentMethod || "cash",
      financing,
    });

    if (tradeInRequest) {
      tradeInRequest.status = "applied";
      tradeInRequest.appliedToSale = sale._id;
      await tradeInRequest.save();
    }

    lead.status = "negotiating";
    await lead.save();

    res.status(201).json({ success: true, sale });
  } catch (error) {
    // لو صار خطأ بعد ما حجزنا السيارة (trade-in غير صالح، فشل إنشاء الصفقة...)، نرجّعها
    // متوفرة تاني — وإلا كانت تضل محجوزة للأبد بدون أي صفقة فعلية مرتبطة فيها.
    await Car.findByIdAndUpdate(car._id, { status: "available" });
    throw error;
  }
});

// POST /api/sales/:id/deposit-checkout — بينشئ جلسة دفع Stripe لعربون الحجز
const createDepositCheckout = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError("الصفقة غير موجودة", 404);

  if (req.user.role === "salesAgent" && sale.salesAgent.toString() !== req.user._id.toString()) {
    throw new AppError("ما إلك صلاحية على هالصفقة", 403);
  }
  if (req.user.role === "branchManager" && sale.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية على صفقة فرع تاني", 403);
  }

  if (sale.status !== "pending_approval") {
    throw new AppError("الصفقة تمت معالجتها مسبقًا، ما بينفع تدفع عربون", 409);
  }
  if (sale.deposit.status === "paid") {
    throw new AppError("العربون مدفوع مسبقًا", 409);
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `عربون حجز — صفقة #${sale._id}` },
          unit_amount: Math.round(sale.deposit.amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { type: "sale_deposit", saleId: sale._id.toString() },
    success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/sales?deposit=success`,
    cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/sales?deposit=cancelled`,
  });

  sale.deposit.stripeSessionId = session.id;
  await sale.save();

  res.status(200).json({ success: true, url: session.url });
});

// PATCH /api/sales/:id/approve — superadmin أو branchManager بس
const approveSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError("الصفقة غير موجودة", 404);

  if (sale.status !== "pending_approval") {
    throw new AppError("الصفقة تمت معالجتها مسبقًا", 409);
  }

  if (req.user.role === "branchManager" && sale.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية توافق على صفقة فرع تاني", 403);
  }

  // ما بنوافق على صفقة لحد ما العربون يتدفع — هيك منضمن جدية الزبون قبل ما نأكّد البيع
  if (sale.deposit.status !== "paid") {
    throw new AppError("لازم يتدفع عربون الحجز أول قبل الموافقة على الصفقة", 400);
  }

  // العربون المدفوع بينخصم من السعر الصافي المتبقي على الزبون (سياسة: عربون بينخصم لو
  // الصفقة انوافق عليها، وبيضل مصادر عند الشركة لو انرفضت — معمول فوق بـrejectSale).
  sale.netPrice = Math.max(0, sale.netPrice - sale.deposit.amount);

  sale.status = "approved";
  sale.approvedBy = req.user._id;
  sale.approvedAt = new Date();
  await sale.save();

  const lead = await Lead.findByIdAndUpdate(sale.lead, { status: "won" }, { new: true });

  await Car.findByIdAndUpdate(sale.car, {
    status: "sold",
    owner: {
      name: sale.customerName,
      phone: sale.customerPhone,
      customer: lead?.customer || null,
    },
  });

  notifySaleAgent(sale);

  res.status(200).json({ success: true, sale });
});

// PATCH /api/sales/:id/reject — superadmin أو branchManager بس
const rejectSale = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError("الصفقة غير موجودة", 404);

  if (sale.status !== "pending_approval") {
    throw new AppError("الصفقة تمت معالجتها مسبقًا", 409);
  }

  if (req.user.role === "branchManager" && sale.branch.toString() !== req.user.branch?.toString()) {
    throw new AppError("ما إلك صلاحية ترفض صفقة فرع تاني", 403);
  }

  sale.status = "rejected";
  sale.rejectionReason = reason || null;
  // لو كان الزبون دفع العربون، منعتبره مصادر (forfeited) — مش برجع تلقائيًا. سياسة الشركة
  // انه العربون بيترد بس اذا الموافقة تمت وانخصم من السعر النهائي، مش لو انرفضت الصفقة.
  if (sale.deposit.status === "paid") {
    sale.deposit.status = "forfeited";
  }
  await sale.save();

  // نرجّع السيارة متوفرة تاني
  await Car.findByIdAndUpdate(sale.car, { status: "available" });
  await Lead.findByIdAndUpdate(sale.lead, { status: "negotiating" });

  // ولو كان في تقييم سيارة مستعملة مرتبط، نرجّعه "pending" — الزبون يقدر يستخدمه بمحاولة تانية
  if (sale.tradeIn?.request) {
    await TradeInRequest.findByIdAndUpdate(sale.tradeIn.request, { status: "pending", appliedToSale: null });
  }

  notifySaleAgent(sale);

  res.status(200).json({ success: true, sale });
});

// POST /api/sales/financing-quote — عام، حاسبة تمويل بدون حفظ (للزبون بصفحة السيارة)
const getFinancingQuote = asyncHandler(async (req, res) => {
  const { price, downPayment, months, annualInterestRate } = req.body;

  if (!price || downPayment === undefined || !months || annualInterestRate === undefined) {
    throw new AppError("السعر والدفعة الأولى وعدد الأشهر ونسبة الفائدة مطلوبين", 400);
  }
  if (downPayment >= price) {
    throw new AppError("الدفعة الأولى لازم تكون أقل من سعر السيارة", 400);
  }

  const quote = calculateFinancing(price, downPayment, months, annualInterestRate);
  res.status(200).json({ success: true, quote });
});

module.exports = {
  getSales,
  getSale,
  createSale,
  createDepositCheckout,
  approveSale,
  rejectSale,
  getFinancingQuote,
};
