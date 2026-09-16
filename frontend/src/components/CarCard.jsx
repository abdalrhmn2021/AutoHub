import Link from "next/link";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-US").format(price);

export default function CarCard({ car }) {
  return (
    <Link
      href={`/cars/${car._id}`}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="h-44 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        {car.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={car.images[0]} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
        ) : (
          "لا توجد صورة"
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg">
          {car.make} {car.model}
        </h3>
        <p className="text-gray-500 text-sm mb-2">
          {car.year} • {car.transmission} • {car.fuelType}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-primary)] font-bold">${formatPrice(car.price)}</span>
          {car.branch?.name && (
            <span className="text-xs text-gray-400">{car.branch.name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
