const mongoose = require("mongoose");

const FUEL_TYPES = ["بنزين", "ديزل", "هايبرد", "كهربائي"];
const TRANSMISSION_TYPES = ["أوتوماتيك", "عادي"];
const CAR_STATUS = ["available", "reserved", "sold"];

const carSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "الفرع مطلوب"],
    },
    make: {
      type: String,
      required: [true, "الماركة مطلوبة"],
      trim: true,
    },
    model: {
      type: String,
      required: [true, "الموديل مطلوب"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "سنة الصنع مطلوبة"],
      min: 1980,
      max: new Date().getFullYear() + 1,
    },
    trim: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "السعر مطلوب"],
      min: 0,
    },
    mileage: {
      type: Number,
      default: 0,
      min: 0,
    },
    fuelType: {
      type: String,
      enum: FUEL_TYPES,
      default: "بنزين",
    },
    transmission: {
      type: String,
      enum: TRANSMISSION_TYPES,
      default: "أوتوماتيك",
    },
    color: {
      type: String,
      trim: true,
    },
    vin: {
      type: String,
      required: [true, "رقم الشاصي (VIN) مطلوب"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: CAR_STATUS,
      default: "available",
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // بتتعبى تلقائيًا لما توافق صفقة بيع على هالسيارة (Sale.approve)
    owner: {
      name: { type: String, trim: true, default: null },
      phone: { type: String, trim: true, default: null },
      customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { timestamps: true }
);

carSchema.index({ branch: 1, status: 1 });
carSchema.index({ make: 1, model: 1 });

const Car = mongoose.models.Car || mongoose.model("Car", carSchema);

module.exports = Car;
module.exports.FUEL_TYPES = FUEL_TYPES;
module.exports.TRANSMISSION_TYPES = TRANSMISSION_TYPES;
module.exports.CAR_STATUS = CAR_STATUS;
