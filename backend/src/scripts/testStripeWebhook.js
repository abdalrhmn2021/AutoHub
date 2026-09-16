// سكريبت تجريبي محلي — بديل عن ngrok/Stripe CLI لاختبار الـwebhook بدون أي تعرض
// للإنترنت. بيصنع حدث Stripe موقّع فعليًا (checkout.session.completed) بنفس آلية
// التوقيع الحقيقية (Stripe.webhooks.generateTestHeaderString — دالة "static" ما بتحتاج
// STRIPE_SECRET_KEY ولا اتصال حقيقي بـStripe، هي بس عملية تشفير محلية)، وبيبعته
// مباشرة لسيرفرك المحلي (localhost → localhost، بدون تونيل).
//
// الاستخدام:
//   node src/scripts/testStripeWebhook.js sale <SALE_ID>
//   node src/scripts/testStripeWebhook.js service <SERVICE_APPOINTMENT_ID>
//
// شرط وحيد: STRIPE_WEBHOOK_SECRET لازم يكون معرّف بالـ.env — أي قيمة تختارها بنفسك
// (مثلاً whsec_local_test_secret)، ما لازم تجي من Stripe الحقيقي، لأنه هون إحنا يلي
// عم نوقّع الحدث ونتحقق منه بنفس السيرفر (توقيع محلي بمحلي).
//
// وين تحصل على SALE_ID أو SERVICE_APPOINTMENT_ID: افتح Developer Tools بالمتصفح
// (F12) → تبويب Network → اعمل الإجراء بالموقع (مثلاً حوّل Lead لصفقة بيع) → دور على
// طلب POST /api/sales بالاستجابة (response) → sale._id.
require("dotenv").config();
const crypto = require("crypto");

// بنولّد التوقيع يدويًا بنفس خوارزمية Stripe الموثّقة رسميًا (HMAC-SHA256 على
// "timestamp.payload") بدل ما نعتمد على دالة مساعدة معيّنة من مكتبة stripe قد تختلف
// شكلها بين الإصدارات — هيك السكريبت مستقل تمامًا، بدون أي dependency خارجية، وأكيد
// متوافق مع تحقّق stripe.webhooks.constructEvent() الحقيقي بالكونترولر (نفس الخوارزمية
// بالضبط يلي هو بيستخدمها للتحقق). راجع: https://docs.stripe.com/webhooks/signature#verify-manually
function signStripePayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

const [, , type, id] = process.argv;

if (!["sale", "service"].includes(type) || !id) {
  console.error("الاستخدام: node src/scripts/testStripeWebhook.js <sale|service> <ID>");
  process.exit(1);
}

const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret) {
  console.error(
    "STRIPE_WEBHOOK_SECRET غير معرّف بالـ.env — حط أي قيمة تختارها بنفسك (مثلاً STRIPE_WEBHOOK_SECRET=whsec_local_test_secret) وأعد المحاولة."
  );
  process.exit(1);
}

const metadata =
  type === "sale" ? { type: "sale_deposit", saleId: id } : { type: "service_invoice", serviceId: id };

const event = {
  id: `evt_test_${Date.now()}`,
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: `cs_test_${Date.now()}`,
      object: "checkout.session",
      metadata,
    },
  },
};

const payload = JSON.stringify(event);
const header = signStripePayload(payload, secret);

async function main() {
  const port = process.env.PORT || 5000;
  const url = `http://localhost:${port}/api/stripe/webhook`;

  console.log(`بابعت حدث checkout.session.completed تجريبي (${type}: ${id}) لـ ${url} ...`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": header,
    },
    body: payload,
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 200) {
    console.log("✅ نجح — السيرفر قبل الحدث ورد 200. روح تأكد إنه الحالة تحدّثت فعليًا (deposit.status/invoice.status).");
  } else {
    console.log(`❌ رجع السيرفر ${res.status}`);
  }
  console.log("الرد:", body);
}

main().catch((err) => {
  console.error(
    "فشل الاتصال بالسيرفر — تأكد إنه npm run dev شغّال بترمينال تاني قبل ما تشغّل هالسكريبت:",
    err.message
  );
  process.exit(1);
});
