import api from "./api";

// superadmin / branchManager بس — التوكن مرفق تلقائيًا عبر interceptor بـapi.js
export const getOverview = async () => {
  const res = await api.get("/analytics/overview");
  return res.data;
};

// superadmin بس (مقارنة بين الفروع)
export const getByBranch = async () => {
  const res = await api.get("/analytics/by-branch");
  return res.data;
};

export const getTopModels = async () => {
  const res = await api.get("/analytics/top-models");
  return res.data;
};
