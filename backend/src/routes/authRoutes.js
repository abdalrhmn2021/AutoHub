const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, getMe, logout, createStaff, getTechnicians } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// limiter أشد بكثير من الـlimiter العام (app.js: 300 طلب/15 دقيقة على كل /api).
// تسجيل الدخول والتسجيل هدف مباشر لهجمات تخمين الباسورد (brute-force)، فسقف 300
// محاولة كان متساهل جداً هون تحديداً — 10 محاولات كل 15 دقيقة لكل IP كافية لأي
// مستخدم حقيقي غلط بباسورده كذا مرة، وبتوقف أي محاولة تخمين آلية بسرعة.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "محاولات كتيرة، جرّب بعد شوي" },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post("/staff", protect, authorize("superadmin", "branchManager"), createStaff);
router.get("/technicians", protect, authorize("superadmin", "branchManager"), getTechnicians);

module.exports = router;
