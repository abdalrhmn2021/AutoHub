const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    name: {
      type: String,
      required: [true, "اسم القطعة مطلوب"],
      trim: true,
    },
    partNumber: {
      type: String,
      trim: true,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: "قطعة",
    },
  },
  { timestamps: true }
);

// اسم القطعة فريد جوا نفس الفرع (منعًا لتكرار نفس الصنف بسجلّين منفصلين)
inventoryItemSchema.index({ branch: 1, name: 1 }, { unique: true });

const InventoryItem = mongoose.models.InventoryItem || mongoose.model("InventoryItem", inventoryItemSchema);

module.exports = InventoryItem;
