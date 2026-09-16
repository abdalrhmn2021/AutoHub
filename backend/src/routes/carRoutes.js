const express = require("express");
const { getCars, getCar, createCar, updateCar, deleteCar } = require("../controllers/carController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getCars); // عام — أي زائر يقدر يتصفح السيارات
router.get("/:id", getCar);
router.post("/", protect, authorize("superadmin", "branchManager", "salesAgent"), createCar);
router.patch("/:id", protect, authorize("superadmin", "branchManager", "salesAgent"), updateCar);
router.delete("/:id", protect, authorize("superadmin", "branchManager"), deleteCar);

module.exports = router;
