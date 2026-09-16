const express = require("express");
const {
  getSales,
  getSale,
  createSale,
  createDepositCheckout,
  approveSale,
  rejectSale,
  getFinancingQuote,
} = require("../controllers/saleController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const STAFF = ["superadmin", "branchManager", "salesAgent"];
const APPROVERS = ["superadmin", "branchManager"];

// عام — أي زائر يقدر يستخدم حاسبة التمويل من صفحة السيارة بدون تسجيل دخول
router.post("/financing-quote", getFinancingQuote);

router.use(protect, authorize(...STAFF));

router.get("/", getSales);
router.get("/:id", getSale);
router.post("/", createSale);
router.post("/:id/deposit-checkout", createDepositCheckout);
router.patch("/:id/approve", authorize(...APPROVERS), approveSale);
router.patch("/:id/reject", authorize(...APPROVERS), rejectSale);

module.exports = router;
