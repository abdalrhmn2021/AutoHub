const mongoose = require("mongoose");

const SALE_STATUS = ["pending_approval", "approved", "rejected"];
const PAYMENT_METHODS = ["cash", "installment"];
const DEPOSIT_STATUS = ["pending", "paid", "forfeited"];
const DEFAULT_DEPOSIT_AMOUNT = 200;

const depositSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: DEFAULT_DEPOSIT_AMOUNT },
    status: { type: String, enum: DEPOSIT_STATUS, default: "pending" },
    stripeSessionId: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const financingSchema = new mongoose.Schema(
  {
    downPayment: { type: Number, required: true, min: 0 },
    months: { type: Number, required: true, min: 1 },
    annualInterestRate: { type: Number, required: true, min: 0 },
    monthlyPayment: { type: Number, required: true },
    totalPayable: { type: Number, required: true },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: [true, "الصفقة لازم تكون مرتبطة بـLead"],
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    salesAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      required: [true, "السعر النهائي مطلوب"],
      min: 0,
    },
    // لو الزبون قدّم سيارته القديمة كجزء من الصفقة — snapshot لقيمة التقييم وقت البيع
    // (مش رابط حي، عشان لو التقييم الأصلي تغيّر أو انحذف الصفقة تضل موثّقة بالقيمة يلي اتفقوا عليها)
    tradeIn: {
      request: { type: mongoose.Schema.Types.ObjectId, ref: "TradeInRequest", default: null },
      value: { type: Number, default: 0 },
    },
    // price ناقص قيمة التقييم (لو في) — هاد المبلغ الفعلي يلي الزبون رح يدفعه، وعليه بيتحسب التمويل
    netPrice: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash",
    },
    financing: {
      type: financingSchema,
      default: null,
    },
    // عربون حجز — يُدفع قبل ما يوافق مدير الفرع على الصفقة (شرط ضمن approveSale)،
    // بيتخصم من المبلغ المتبقي عند الموافقة، وبيصير "forfeited" (يضل عند المعرض) عند الرفض.
    deposit: {
      type: depositSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: SALE_STATUS,
      default: "pending_approval",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

saleSchema.index({ branch: 1, status: 1 });

const Sale = mongoose.models.Sale || mongoose.model("Sale", saleSchema);

module.exports = Sale;
module.exports.SALE_STATUS = SALE_STATUS;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
