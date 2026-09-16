"use client";

const FUEL_TYPES = ["بنزين", "ديزل", "هايبرد", "كهربائي"];
const TRANSMISSION_TYPES = ["أوتوماتيك", "عادي"];

export default function CarFilters({ filters, onChange, onSubmit }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
    >
      <h3 className="font-bold mb-2">فلترة النتائج</h3>

      <input
        type="text"
        placeholder="الماركة (مثال: تويوتا)"
        value={filters.make || ""}
        onChange={(e) => set("make", e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />

      <input
        type="text"
        placeholder="الموديل"
        value={filters.model || ""}
        onChange={(e) => set("model", e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="أقل سعر"
          value={filters.minPrice || ""}
          onChange={(e) => set("minPrice", e.target.value)}
          className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="أعلى سعر"
          value={filters.maxPrice || ""}
          onChange={(e) => set("maxPrice", e.target.value)}
          className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <select
        value={filters.fuelType || ""}
        onChange={(e) => set("fuelType", e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      >
        <option value="">كل أنواع الوقود</option>
        {FUEL_TYPES.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <select
        value={filters.transmission || ""}
        onChange={(e) => set("transmission", e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      >
        <option value="">كل أنواع ناقل الحركة</option>
        {TRANSMISSION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="w-full bg-[var(--color-primary)] text-white rounded-md py-2 font-medium hover:opacity-90"
      >
        تطبيق الفلترة
      </button>
    </form>
  );
}
