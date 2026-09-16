const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const branchRoutes = require("./routes/branchRoutes");
const carRoutes = require("./routes/carRoutes");
const leadRoutes = require("./routes/leadRoutes");
const saleRoutes = require("./routes/saleRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const tradeInRoutes = require("./routes/tradeInRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const { errorHandler } = require("./utils/errors");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // لازم true عشان المتصفح يبعت الكوكي (httpOnly JWT) مع كل طلب cross-origin
  })
);

// بيقرأ الكوكيز من req.headers.cookie ويحطها بـreq.cookies — يعتمد عليه protect() تحت
// عشان يقرأ توكن الـJWT من كوكي httpOnly بدل Authorization header (حماية من XSS، راجع middleware/auth.js)
app.use(cookieParser());

// لازم قبل express.json() العام — /api/stripe/webhook محتاج الجسم الخام (raw)
// للتحقق من توقيع Stripe، وإلا express.json() تحته بياكل الجسم كـJSON أول.
app.use("/api/stripe", stripeRoutes);

app.use(express.json({ limit: "2mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "AutoHub API شغّالة" });
});

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/trade-ins", tradeInRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "المسار غير موجود" });
});

app.use(errorHandler);

module.exports = app;
