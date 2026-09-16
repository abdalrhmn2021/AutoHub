const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

let io = null;

// كل مستخدم متصل بينضم لغرفة خاصة فيه (user:<id>) — هيك أي حدث بدنا نبعته
// له بس (متل تحديث حالة صفقته) منقدر نستهدفه مباشرة بدون ما نبثّ لكل المتصلين.
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // مصادقة الاتصال بنفس الـJWT المستخدم بالـAPI. التوكن صار بكوكي httpOnly (مش
  // localStorage)، فما نقدر نقرأه من جافاسكريبت الفرونت اند ونبعته بـhandshake.auth
  // زي قبل — بدل هيك، عميل السوكيت بيتصل بـwithCredentials:true، فالمتصفح بيرفق
  // الكوكي تلقائيًا برأس الـhandshake HTTP request، ومنقرأها من هون يدويًا.
  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error("التوكن مطلوب"));
      const token = cookie.parse(rawCookie).token;
      if (!token) return next(new Error("التوكن مطلوب"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("توكن غير صالح"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  console.log("🔌 Socket.io شغّال");
  return io;
};

// دالة مساعدة يستخدمها أي كونترولر عشان يبعت حدث لحظي، بدون ما يحتاج يعرف تفاصيل التهيئة
const getIO = () => io;

module.exports = { initSocket, getIO };
