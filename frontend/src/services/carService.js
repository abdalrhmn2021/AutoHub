import api from "./api";

// filters: { make, model, minPrice, maxPrice, fuelType, transmission, branch, year, page, limit }
export const getCars = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  );
  const res = await api.get("/cars", { params });
  return res.data;
};

export const getCar = async (id) => {
  const res = await api.get(`/cars/${id}`);
  return res.data;
};

export const createCar = async (data) => {
  const res = await api.post("/cars", data);
  return res.data;
};

export const updateCar = async (id, data) => {
  const res = await api.patch(`/cars/${id}`, data);
  return res.data;
};

export const deleteCar = async (id) => {
  const res = await api.delete(`/cars/${id}`);
  return res.data;
};
