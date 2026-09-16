import api from "./api";

export const getSales = async (status = "") => {
  const res = await api.get("/sales", { params: status ? { status } : {} });
  return res.data;
};

export const getSale = async (id) => {
  const res = await api.get(`/sales/${id}`);
  return res.data;
};

export const createSale = async (data) => {
  const res = await api.post("/sales", data);
  return res.data;
};

export const createDepositCheckout = async (id) => {
  const res = await api.post(`/sales/${id}/deposit-checkout`);
  return res.data;
};

export const approveSale = async (id) => {
  const res = await api.patch(`/sales/${id}/approve`);
  return res.data;
};

export const rejectSale = async (id, reason) => {
  const res = await api.patch(`/sales/${id}/reject`, { reason });
  return res.data;
};

// عام — ما بيحتاج تسجيل دخول
export const getFinancingQuote = async (data) => {
  const res = await api.post("/sales/financing-quote", data);
  return res.data;
};
