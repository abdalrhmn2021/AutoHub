import { io } from "socket.io-client";

let socket = null;

// بنشتق عنوان السوكيت من نفس عنوان الـAPI (بنشيل /api من الآخر)
// عشان ما نضطر نضيف env variable ثانية لنفس السيرفر.
const getSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

export const getSocket = () => {
  if (typeof window === "undefined") return null;

  if (socket) return socket;

  // التوكن بكوكي httpOnly، فما فينا نقرأه من هون ونبعته بـauth زي قبل. withCredentials:true
  // كافي — المتصفح بيرفق الكوكي تلقائيًا مع طلب الـhandshake، والسيرفر (socket.js
  // بالباك اند) بيقرأها من رأس الكوكي مباشرة. NotificationContext أصلاً ما بينادي
  // هالدالة إلا لما `user` موجود (يعني تسجيل الدخول تأكد عبر /auth/me)، فمش قلقانين
  // من محاولة اتصال بدون جلسة صالحة.
  socket = io(getSocketUrl(), {
    withCredentials: true,
    transports: ["websocket"],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
