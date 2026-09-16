import api from "./api";

// عام — بدون تسجيل دخول. بيبعت كامل سجل المحادثة (messages) عشان السيرفر
// بدون حالة (stateless) — ما بنخزن محادثات بقاعدة البيانات بهالمرحلة.
export const sendMessage = async (messages) => {
  const res = await api.post("/assistant/chat", { messages });
  return res.data;
};
