const express = require("express");
const { getInventory, createItem, adjustQuantity } = require("../controllers/inventoryController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const STAFF = ["superadmin", "branchManager", "technician"];

router.use(protect, authorize(...STAFF));

router.get("/", getInventory);
router.post("/", authorize("superadmin", "branchManager"), createItem);
router.patch("/:id/adjust", adjustQuantity);

module.exports = router;
