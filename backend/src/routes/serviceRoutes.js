const express = require("express");
const {
  getAppointments,
  getAppointment,
  getCarServiceHistory,
  createAppointment,
  assignTechnician,
  updateStatus,
  createInvoiceCheckout,
} = require("../controllers/serviceController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const STAFF = ["superadmin", "branchManager", "technician"];

router.use(protect, authorize(...STAFF));

router.get("/", getAppointments);
router.get("/car/:carId", getCarServiceHistory);
router.get("/:id", getAppointment);
router.post("/", authorize("superadmin", "branchManager"), createAppointment);
router.patch("/:id/assign", authorize("superadmin", "branchManager"), assignTechnician);
router.patch("/:id/status", updateStatus);
router.post("/:id/invoice-checkout", createInvoiceCheckout);

module.exports = router;
