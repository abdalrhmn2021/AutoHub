const mongoose = require("mongoose");

const LEAD_STATUS = ["new", "contacted", "negotiating", "won", "lost"];

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    // بيانات الزبون — بنخزنها مباشرة لأن الزبون ممكن يكون واصل للمعرض
    // بدون ما يكون عنده حساب مسجّل بالموقع أصلاً
    customerName: {
      type: String,
      required: [true, "اسم الزبون مطلوب"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "رقم هاتف الزبون مطلوب"],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // لو الزبون فعلاً عنده حساب بالمنصة، نربطه (اختياري)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: [true, "السيارة المهتم فيها الزبون مطلوبة"],
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "لازم يكون في مندوب مسؤول عن الـLead"],
    },
    status: {
      type: String,
      enum: LEAD_STATUS,
      default: "new",
    },
    notes: [noteSchema],
  },
  { timestamps: true }
);

leadSchema.index({ branch: 1, status: 1 });
leadSchema.index({ assignedTo: 1 });

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

module.exports = Lead;
module.exports.LEAD_STATUS = LEAD_STATUS;
