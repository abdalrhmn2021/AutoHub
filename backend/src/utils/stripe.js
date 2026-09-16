const Stripe = require("stripe");
const { AppError } = require("./errors");

// الإصدار الحالي من مكتبة stripe صار يتحقق من apiKey وقت الإنشاء (`new Stripe(...)`)
// ويرمي خطأ فورًا لو فاضي — يعني `new Stripe(process.env.STRIPE_SECRET_KEY || "")`
// وقت استيراد الملف كان بيكسر إقلاع السيرفر بالكامل لو STRIPE_SECRET_KEY غير معرّف
// (حتى لو الميزات التانية كلها ما إلها علاقة بالدفع). الحل: نبني العميل lazy — بس
// أول ما ميزة دفع فعلية تُستخدم — ونرمي AppError واضح (503) قبلها لو المفتاح ناقص.
// نفس فلسفة OPENAI_API_KEY بالضبط بـassistantController.js.
let stripeInstance = null;

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError("الدفع الإلكتروني غير مفعّل حاليًا (مفتاح Stripe غير معرّف بالسيرفر)", 503);
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

module.exports = getStripe;
