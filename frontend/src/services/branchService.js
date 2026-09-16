import api from "./api";

export const getBranches = async () => {
  const res = await api.get("/branches");
  return res.data;
};

export const createBranch = async (data) => {
  const res = await api.post("/branches", data);
  return res.data;
};
