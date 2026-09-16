const express = require("express");
const rateLimit = require("express-rate-limit");
const { chat } = require("../controllers/assistantController");

const router = express.Router();

// كل رسالة بتكلف فعليًا (OpenAI billing)، فسقف أشد بكثير من الـlimiter العام
// (300/15 دقيقة بـapp.js) — 20 رسالة كل 15 دقيقة لكل IP كافية لمحادثة حقيقية
// وبتمنع استنزاف الرصيد لو حد حاول يسيء الاستخدام.
const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "وصلت الحد الأقصى من الأسئلة مؤقتًا، جرّب بعد شوي" },
});

router.post("/chat", assistantLimiter, chat); // عام — بدون تسجيل دخول، متل حاسبة التمويل

module.exports = router;
