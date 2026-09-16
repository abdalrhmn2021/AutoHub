const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم الفرع مطلوب"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "المدينة مطلوبة"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Branch = mongoose.models.Branch || mongoose.model("Branch", branchSchema);

module.exports = Branch;
