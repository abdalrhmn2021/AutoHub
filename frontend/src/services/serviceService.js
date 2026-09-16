import api from "./api";

export const getAppointments = async (status = "") => {
  const res = await api.get("/service", { params: status ? { status } : {} });
  return res.data;
};

export const getAppointment = async (id) => {
  const res = await api.get(`/service/${id}`);
  return res.data;
};

export const getCarServiceHistory = async (carId) => {
  const res = await api.get(`/service/car/${carId}`);
  return res.data;
};

export const createAppointment = async (data) => {
  const res = await api.post("/service", data);
  return res.data;
};

export const assignTechnician = async (id, technicianId) => {
  const res = await api.patch(`/service/${id}/assign`, { technicianId });
  return res.data;
};

export const updateStatus = async (id, data) => {
  const res = await api.patch(`/service/${id}/status`, data);
  return res.data;
};

export const createInvoiceCheckout = async (id) => {
  const res = await api.post(`/service/${id}/invoice-checkout`);
  return res.data;
};
