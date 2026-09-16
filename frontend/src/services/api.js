import axios from "axios";

// التوكن صار بكوكي httpOnly (مش localStorage) — جافاسكريبت هون ما بيقدر يقرأه
// أو يرفقه يدويًا حتى لو حاول (وهيك أفضل، هاد بالضبط الهدف: حماية من XSS). withCredentials:true
// كافي تمامًا عشان المتصفح يرفق الكوكي تلقائيًا بكل طلب — ما في داعي لأي interceptor.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

export default api;
