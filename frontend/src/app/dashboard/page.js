"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as carService from "@/services/carService";
import * as branchService from "@/services/branchService";

const ROLE_LABELS = {
  superadmin: "مدير عام",
  branchManager: "مدير فرع",
  salesAgent: "مندوب مبيعات",
  technician: "فني صيانة",
  customer: "زبون",
};

const STAFF_ROLES = ["superadmin", "branchManager", "salesAgent"];
const SERVICE_ROLES = ["superadmin", "branchManager", "technician"];
const ANALYTICS_ROLES = ["superadmin", "branchManager"];

const emptyCarForm = {
  branch: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  price: "",
  mileage: 0,
  vin: "",
  fuelType: "بنزين",
  transmission: "أوتوماتيك",
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [branches, setBranches] = useState([]);
  const [carForm, setCarForm] = useState(emptyCarForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "superadmin") {
      branchService.getBranches().then((data) => setBranches(data.branches)).catch(() => {});
    }
  }, [user]);

  if (loading || !user) {
    return <p className="max-w-4xl mx-auto px-4 py-10 text-gray-500">جارِ التحميل...</p>;
  }

  const canManageCars = STAFF_ROLES.includes(user.role);
  const canManageService = SERVICE_ROLES.includes(user.role);
  const canViewAnalytics = ANALYTICS_ROLES.includes(user.role);

  const handleAddCar = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await carService.createCar({
        ...carForm,
        year: Number(carForm.year),
        price: Number(carForm.price),
        mileage: Number(carForm.mileage) || 0,
        branch: user.role === "superadmin" ? carForm.branch : undefined,
      });
      setMessage("تمت إضافة السيارة بنجاح ✅");
      setCarForm(emptyCarForm);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بإضافة السيارة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">لوحة التحكم</h1>
      <p className="text-gray-500 mb-6">
        مرحبًا {user.name} — دورك: <span className="font-medium">{ROLE_LABELS[user.role]}</span>
      </p>

      {!canManageCars && !canManageService && !canViewAnalytics && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-gray-600">
            حسابك كـ{ROLE_LABELS[user.role]} — تقدر تتصفّح السيارات وتحجز تجارب قيادة من صفحة المعرض.
            باقي أقسام لوحة التحكم رح تنضاف بالخطوات الجاية.
          </p>
        </div>
      )}

      {(canManageCars || canManageService || canViewAnalytics) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {canViewAnalytics && (
            <Link
              href="/dashboard/analytics"
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[var(--color-primary)] transition-colors"
            >
              <h3 className="font-bold mb-1">التحليلات</h3>
              <p className="text-sm text-gray-500">الإيرادات، أكثر الموديلات مبيعًا، وأداء الفروع</p>
            </Link>
          )}
          {canManageCars && (
            <>
              <Link
                href="/dashboard/leads"
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[var(--color-primary)] transition-colors"
              >
                <h3 className="font-bold mb-1">Leads</h3>
                <p className="text-sm text-gray-500">تسجيل ومتابعة العملاء المهتمين</p>
              </Link>
              <Link
                href="/dashboard/sales"
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[var(--color-primary)] transition-colors"
              >
                <h3 className="font-bold mb-1">الصفقات</h3>
                <p className="text-sm text-gray-500">متابعة صفقات البيع والموافقات</p>
              </Link>
            </>
          )}
          {canManageService && (
            <>
              <Link
                href="/dashboard/service"
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[var(--color-primary)] transition-colors"
              >
                <h3 className="font-bold mb-1">مواعيد الصيانة</h3>
                <p className="text-sm text-gray-500">حجز وتتبع مواعيد الصيانة</p>
              </Link>
              <Link
                href="/dashboard/inventory"
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[var(--color-primary)] transition-colors"
              >
                <h3 className="font-bold mb-1">مخزون قطع الغيار</h3>
                <p className="text-sm text-gray-500">متابعة الكميات المتوفرة بكل فرع</p>
              </Link>
            </>
          )}
        </div>
      )}

      {canManageCars && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold mb-4">إضافة سيارة جديدة</h2>

          <form onSubmit={handleAddCar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.role === "superadmin" && (
              <select
                required
                value={carForm.branch}
                onChange={(e) => setCarForm({ ...carForm, branch: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2"
              >
                <option value="">اختر الفرع</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} — {b.city}
                  </option>
                ))}
              </select>
            )}

            <input
              required
              placeholder="الماركة"
              value={carForm.make}
              onChange={(e) => setCarForm({ ...carForm, make: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="الموديل"
              value={carForm.model}
              onChange={(e) => setCarForm({ ...carForm, model: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              placeholder="سنة الصنع"
              value={carForm.year}
              onChange={(e) => setCarForm({ ...carForm, year: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              placeholder="السعر ($)"
              value={carForm.price}
              onChange={(e) => setCarForm({ ...carForm, price: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="رقم الشاصي (VIN)"
              value={carForm.vin}
              onChange={(e) => setCarForm({ ...carForm, vin: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2"
            />

            {(error || message) && (
              <p className={`sm:col-span-2 text-sm ${error ? "text-red-600" : "text-green-600"}`}>
                {error || message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="sm:col-span-2 bg-[var(--color-primary)] text-white rounded-md py-2 font-medium disabled:opacity-50"
            >
              {submitting ? "جارِ الإضافة..." : "إضافة السيارة"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
