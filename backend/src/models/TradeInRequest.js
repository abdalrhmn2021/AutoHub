const mongoose = require("mongoose");

const TRADE_IN_STATUS = ["pending", "applied", "expired"];

const tradeInRequestSchema = new mongoose.Schema(
  {
    // الزبون لازم يكون مسجّل دخول عشان يقدر يقدّم طلب رسمي (مش بس معاينة سريعة)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    make: { type: String, required: [true, "الماركة مطلوبة"], trim: true },
    model: { type: String, required: [true, "الموديل مطلوب"], trim: true },
    year: { type: Number, required: [true, "سنة الصنع مطلوبة"] },
    mileage: { type: Number, required: [true, "عدد الكيلومترات مطلوب"], min: 0 },
    // سعر السيارة وقت الشراء (أو أقرب تقدير له) — الأساس يلي بنحسب عليه الاستهلاك
    purchasePrice: { type: Number, required: [true, "السعر وقت الشراء مطلوب"], min: 0 },
    // بتتحسب تلقائيًا وقت الإنشاء عبر calculateTradeInValue — مو المستخدم يلي بيدخلها
    estimatedValue: { type: Number, required: true },
    status: {
      type: String,
      enum: TRADE_IN_STATUS,
      default: "pending",
    },
    // بتتعبى لما صفقة بيع تستخدم هالتقييم لتخفيض سعر سيارة جديدة
    appliedToSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
    },
  },
  { timestamps: true }
);

tradeInRequestSchema.index({ customer: 1, status: 1 });

const TradeInRequest =
  mongoose.models.TradeInRequest || mongoose.model("TradeInRequest", tradeInRequestSchema);

module.exports = TradeInRequest;
module.exports.TRADE_IN_STATUS = TRADE_IN_STATUS;
