import api from "./api";

export const getInventory = async (branch = "") => {
  const res = await api.get("/inventory", { params: branch ? { branch } : {} });
  return res.data;
};

export const createItem = async (data) => {
  const res = await api.post("/inventory", data);
  return res.data;
};

export const adjustQuantity = async (id, delta) => {
  const res = await api.patch(`/inventory/${id}/adjust`, { delta });
  return res.data;
};
