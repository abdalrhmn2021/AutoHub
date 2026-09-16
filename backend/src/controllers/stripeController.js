const getStripe = require("../utils/stripe");
const Sale = require("../models/Sale");
const ServiceAppointment = require("../models/ServiceAppointment");
const { asyncHandler } = require("../utils/errors");

// POST /api/stripe/webhook — Stripe بينادي هالمسار مباشرة، مش من الفرونت اند.
// req.body هون Buffer خام (raw) مش JSON متحوّل — لازم كذا عشان constructEvent يقدر
// يتحقق من التوقيع صح (نفس مبدأ AutoFlow AI بالضبط: أي تحويل JSON قبل هيك بيكسر التحقق).
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { type, saleId, serviceId } = session.metadata || {};

    if (type === "sale_deposit" && saleId) {
      // idempotency: لو already "paid" (مثلاً Stripe أعاد إرسال نفس الحدث)، نتجاهل بهدوء
      const sale = await Sale.findById(saleId);
      if (sale && sale.deposit.status !== "paid") {
        sale.deposit.status = "paid";
        sale.deposit.stripeSessionId = session.id;
        sale.deposit.paidAt = new Date();
        await sale.save();
        console.log(`✅ Deposit paid for sale ${saleId}`);
      } else {
        console.log(`Deposit webhook for sale ${saleId} ignored (already paid or sale not found)`);
      }
    } else if (type === "service_invoice" && serviceId) {
      const appointment = await ServiceAppointment.findById(serviceId);
      if (appointment && appointment.invoice.status !== "paid") {
        appointment.invoice.status = "paid";
        appointment.invoice.stripeSessionId = session.id;
        appointment.invoice.paidAt = new Date();
        await appointment.save();
        console.log(`✅ Invoice paid for service appointment ${serviceId}`);
      } else {
        console.log(`Invoice webhook for service ${serviceId} ignored (already paid or not found)`);
      }
    } else {
      console.warn("Unhandled checkout session metadata:", session.metadata);
    }
  } else {
    console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

module.exports = { handleWebhook };
