const express = require("express");
const { handleWebhook } = require("../controllers/stripeController");

const router = express.Router();

// express.raw() هون مقصود ومهم — Stripe محتاج الجسم الخام (raw bytes) للتحقق من
// التوقيع عبر constructEvent. هالراوتر لازم ينحط بـapp.js *قبل* express.json()
// العام، وإلا الجسم يوصل هون متحوّل JSON مسبقًا ويفشل التحقق دايمًا.
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

module.exports = router;
