"use client";

import { useEffect, useState } from "react";
import * as carService from "@/services/carService";
import CarCard from "@/components/CarCard";
import CarFilters from "@/components/CarFilters";

export default function HomePage() {
  const [filters, setFilters] = useState({});
  const [cars, setCars] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCars = async (activeFilters) => {
    setLoading(true);
    setError("");
    try {
      const data = await carService.getCars(activeFilters);
      setCars(data.cars);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بتحميل السيارات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCars({});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">تصفّح السيارات المتوفرة</h1>
        <p className="text-gray-500 text-sm">{total} سيارة متوفرة حاليًا</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <CarFilters filters={filters} onChange={setFilters} onSubmit={() => loadCars(filters)} />
        </div>

        <div className="md:col-span-3">
          {loading ? (
            <p className="text-gray-500">جارِ التحميل...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : cars.length === 0 ? (
            <p className="text-gray-500">ما في سيارات مطابقة لهاي الفلترة.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cars.map((car) => (
                <CarCard key={car._id} car={car} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
