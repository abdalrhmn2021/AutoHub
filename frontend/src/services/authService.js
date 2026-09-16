import api from "./api";

export const register = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const login = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const getMe = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

export const logout = async () => {
  const res = await api.post("/auth/logout");
  return res.data;
};

export const createStaff = async (data) => {
  const res = await api.post("/auth/staff", data);
  return res.data;
};

export const getTechnicians = async () => {
  const res = await api.get("/auth/technicians");
  return res.data;
};
