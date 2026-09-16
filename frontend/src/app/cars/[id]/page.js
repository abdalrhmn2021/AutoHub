"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import * as carService from "@/services/carService";
import FinancingCalculator from "@/components/FinancingCalculator";

const formatPrice = (price) => new Intl.NumberFormat("en-US").format(price);

export default function CarDetailPage() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    carService
      .getCar(id)
      .then((data) => setCar(data.car))
      .catch((err) => setError(err.response?.data?.message || "السيارة غير موجودة"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="max-w-4xl mx-auto px-4 py-10 text-gray-500">جارِ التحميل...</p>;
  if (error) return <p className="max-w-4xl mx-auto px-4 py-10 text-red-600">{error}</p>;
  if (!car) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-72 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
          {car.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={car.images[0]} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover rounded-xl" />
          ) : (
            "لا توجد صورة"
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">
            {car.make} {car.model} {car.year}
          </h1>
          <p className="text-3xl font-bold text-[var(--color-primary)] mb-4">${formatPrice(car.price)}</p>

          <dl className="grid grid-cols-2 gap-y-2 text-sm mb-4">
            <dt className="text-gray-500">سنة الصنع</dt>
            <dd>{car.year}</dd>
            <dt className="text-gray-500">ناقل الحركة</dt>
            <dd>{car.transmission}</dd>
            <dt className="text-gray-500">نوع الوقود</dt>
            <dd>{car.fuelType}</dd>
            <dt className="text-gray-500">الممشى</dt>
            <dd>{new Intl.NumberFormat("en-US").format(car.mileage)} كم</dd>
            <dt className="text-gray-500">اللون</dt>
            <dd>{car.color || "—"}</dd>
            <dt className="text-gray-500">الفرع</dt>
            <dd>{car.branch?.name || "—"}</dd>
            <dt className="text-gray-500">الحالة</dt>
            <dd>
              {car.status === "available"
                ? "متوفرة"
                : car.status === "reserved"
                ? "محجوزة"
                : "مباعة"}
            </dd>
          </dl>

          {car.description && (
            <p className="text-gray-700 leading-relaxed border-t border-gray-200 pt-4">
              {car.description}
            </p>
          )}

          <button
            disabled={car.status !== "available"}
            className="mt-6 w-full bg-[var(--color-accent)] text-gray-900 font-bold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {car.status === "available" ? "احجز تجربة قيادة" : "غير متوفرة حاليًا"}
          </button>
        </div>
      </div>

      {car.status === "available" && (
        <div className="mt-8">
          <FinancingCalculator key={car._id} price={car.price} />
        </div>
      )}
    </div>
  );
}
