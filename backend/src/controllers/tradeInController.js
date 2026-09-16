const TradeInRequest = require("../models/TradeInRequest");
const { AppError, asyncHandler } = require("../utils/errors");
const { calculateTradeInValue } = require("../utils/tradeIn");

// سقف منطقي لسعر الشراء المُدخل — منعًا لزبون يبعت رقم مبالغ فيه (بدون أي إثبات
// شراء حقيقي) عشان ياخذ خصم ضخم غير مستحق وقت البيع (estimatedValue بينخصم من netPrice).
const MAX_PURCHASE_PRICE = 200000;

// POST /api/trade-ins/estimate — عام، بدون حفظ (زي financing-quote تمامًا)
const getEstimate = asyncHandler(async (req, res) => {
  const { purchasePrice, year, mileage } = req.body;

  if (!purchasePrice || !year || mileage === undefined) {
    throw new AppError("سعر الشراء وسنة الصنع والكيلومترات مطلوبين", 400);
  }

  const result = calculateTradeInValue(purchasePrice, year, mileage);
  res.status(200).json({ success: true, ...result });
});

// POST /api/trade-ins — تسجيل طلب رسمي، لازم يكون الزبون مسجّل دخول (أي مستخدم مسجّل فعليًا)
const createRequest = asyncHandler(async (req, res) => {
  const { make, model, year, mileage, purchasePrice } = req.body;

  if (!make || !model || !year || mileage === undefined || !purchasePrice) {
    throw new AppError("كل بيانات السيارة (الماركة، الموديل، السنة، الكيلومترات، سعر الشراء) مطلوبة", 400);
  }
  if (Number(year) > new Date().getFullYear()) {
    throw new AppError("سنة الصنع غير منطقية (بالمستقبل)", 400);
  }
  if (Number(mileage) < 0) {
    throw new AppError("الكيلومترات لازم تكون رقم موجب", 400);
  }
  if (Number(purchasePrice) <= 0 || Number(purchasePrice) > MAX_PURCHASE_PRICE) {
    throw new AppError("سعر الشراء غير منطقي", 400);
  }

  const { estimatedValue } = calculateTradeInValue(purchasePrice, year, mileage);

  const request = await TradeInRequest.create({
    customer: req.user._id,
    make,
    model,
    year,
    mileage,
    purchasePrice,
    estimatedValue,
  });

  res.status(201).json({ success: true, request });
});

// GET /api/trade-ins/mine — طلبات الزبون نفسه
const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await TradeInRequest.find({ customer: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, requests });
});

// GET /api/trade-ins — للموظفين، للبحث عن طلبات زبون معيّن وقت تحويل Lead لصفقة
// (فلترة بـcustomer أو status عبر query، ما في فلترة فرع لأن طلب التقييم مش مرتبط بفرع أصلاً)
const getRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.status) filter.status = req.query.status;

  const requests = await TradeInRequest.find(filter).populate("customer", "name phone").sort({ createdAt: -1 });
  res.status(200).json({ success: true, requests });
});

module.exports = { getEstimate, createRequest, getMyRequests, getRequests };
