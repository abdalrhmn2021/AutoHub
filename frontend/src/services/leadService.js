import api from "./api";

export const getLeads = async (status = "") => {
  const res = await api.get("/leads", { params: status ? { status } : {} });
  return res.data;
};

export const getLead = async (id) => {
  const res = await api.get(`/leads/${id}`);
  return res.data;
};

export const createLead = async (data) => {
  const res = await api.post("/leads", data);
  return res.data;
};

export const updateLeadStatus = async (id, status) => {
  const res = await api.patch(`/leads/${id}`, { status });
  return res.data;
};

export const addNote = async (id, text) => {
  const res = await api.post(`/leads/${id}/notes`, { text });
  return res.data;
};
