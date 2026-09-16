import api from "./api";

// عام — بدون تسجيل دخول
export const getEstimate = async (data) => {
  const res = await api.post("/trade-ins/estimate", data);
  return res.data;
};

// customer فقط — يسجّل طلب رسمي
export const createRequest = async (data) => {
  const res = await api.post("/trade-ins", data);
  return res.data;
};

// customer فقط — طلباته هو
export const getMyRequests = async () => {
  const res = await api.get("/trade-ins/mine");
  return res.data;
};

// موظفين — للبحث عن طلبات زبون معيّن وقت تحويل Lead لصفقة
export const getRequests = async (params = {}) => {
  const res = await api.get("/trade-ins", { params });
  return res.data;
};
