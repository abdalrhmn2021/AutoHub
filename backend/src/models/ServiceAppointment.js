const mongoose = require("mongoose");

const SERVICE_TYPES = ["routine_maintenance", "repair", "inspection", "other"];
const APPOINTMENT_STATUS = ["requested", "confirmed", "in_progress", "completed", "cancelled"];
const INVOICE_STATUS = ["not_issued", "unpaid", "paid"];

const invoiceSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: null },
    status: { type: String, enum: INVOICE_STATUS, default: "not_issued" },
    stripeSessionId: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const serviceAppointmentSchema = new mongoose.Schema(
  {
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: [true, "السيارة مطلوبة"],
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      default: "routine_maintenance",
    },
    description: {
      type: String,
      trim: true,
    },
    preferredDate: {
      type: Date,
      required: [true, "التاريخ المفضّل مطلوب"],
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUS,
      default: "requested",
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completionNotes: {
      type: String,
      trim: true,
      default: null,
    },
    // بتنعبّى وقت إنهاء الموعد (status: completed) لو الموظف حدّد مبلغ فاتورة —
    // بتضل "not_issued" لو ما في فاتورة أصلاً (زي صيانة تحت الضمان مثلاً).
    invoice: {
      type: invoiceSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

serviceAppointmentSchema.index({ car: 1, status: 1 });
serviceAppointmentSchema.index({ branch: 1, status: 1 });

const ServiceAppointment =
  mongoose.models.ServiceAppointment || mongoose.model("ServiceAppointment", serviceAppointmentSchema);

module.exports = ServiceAppointment;
module.exports.SERVICE_TYPES = SERVICE_TYPES;
module.exports.APPOINTMENT_STATUS = APPOINTMENT_STATUS;
module.exports.INVOICE_STATUS = INVOICE_STATUS;
