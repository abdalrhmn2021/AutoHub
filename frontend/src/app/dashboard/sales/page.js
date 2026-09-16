"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as saleService from "@/services/saleService";

const STATUS_LABELS = {
  pending_approval: "بانتظار الموافقة",
  approved: "تمت الموافقة",
  rejected: "مرفوضة",
};

const STATUS_COLORS = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const DEPOSIT_LABELS = {
  pending: "العربون لسا ما انسدد",
  paid: "العربون مدفوع ✓",
  forfeited: "العربون مصادر (الصفقة انرفضت بعد الدفع)",
};

const DEPOSIT_COLORS = {
  pending: "text-yellow-600",
  paid: "text-green-600",
  forfeited: "text-red-600",
};

const STAFF_ROLES = ["superadmin", "branchManager", "salesAgent"];
const APPROVERS = ["superadmin", "branchManager"];

const formatMoney = (n) => new Intl.NumberFormat("en-US").format(n);

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !STAFF_ROLES.includes(user.role))) {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await saleService.getSales();
      setSales(data.sales);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بتحميل الصفقات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && STAFF_ROLES.includes(user.role)) loadSales();
  }, [user]);

  const canApprove = user && APPROVERS.includes(user.role);

  const handleApprove = async (id) => {
    setActioningId(id);
    try {
      await saleService.approveSale(id);
      loadSales();
    } catch (err) {
      alert(err.response?.data?.message || "صار خطأ بالموافقة");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("سبب الرفض (اختياري):") || "";
    setActioningId(id);
    try {
      await saleService.rejectSale(id, reason);
      loadSales();
    } catch (err) {
      alert(err.response?.data?.message || "صار خطأ بالرفض");
    } finally {
      setActioningId(null);
    }
  };

  const handlePayDeposit = async (id) => {
    setActioningId(id);
    try {
      const data = await saleService.createDepositCheckout(id);
      window.location.href = data.url;
    } catch (err) {
      alert(err.response?.data?.message || "صار خطأ بإنشاء رابط الدفع");
      setActioningId(null);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">الصفقات</h1>

      {loading ? (
        <p className="text-gray-500">جارِ التحميل...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : sales.length === 0 ? (
        <p className="text-gray-500">ما في صفقات لسا.</p>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">
                    {sale.car?.make} {sale.car?.model} {sale.car?.year}
                  </p>
                  <p className="text-sm text-gray-500">
                    {sale.customerName} — ${formatMoney(sale.price)} ({sale.paymentMethod === "cash" ? "كاش" : "تقسيط"})
                  </p>
                  {sale.financing && (
                    <p className="text-xs text-gray-400 mt-1">
                      قسط شهري: ${formatMoney(sale.financing.monthlyPayment)} × {sale.financing.months} شهر
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">مندوب: {sale.salesAgent?.name}</p>
                  {sale.status === "pending_approval" && (
                    <p className={`text-xs font-medium mt-1 ${DEPOSIT_COLORS[sale.deposit?.status]}`}>
                      عربون الحجز (${formatMoney(sale.deposit?.amount)}): {DEPOSIT_LABELS[sale.deposit?.status]}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[sale.status]}`}>
                  {STATUS_LABELS[sale.status]}
                </span>
              </div>

              {sale.status === "pending_approval" && sale.deposit?.status !== "paid" && (
                <div className="mt-3">
                  <button
                    onClick={() => handlePayDeposit(sale._id)}
                    disabled={actioningId === sale._id}
                    className="w-full bg-blue-600 text-white rounded-md py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    ادفع عربون الحجز الآن
                  </button>
                </div>
              )}

              {canApprove && sale.status === "pending_approval" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(sale._id)}
                    disabled={actioningId === sale._id || sale.deposit?.status !== "paid"}
                    title={sale.deposit?.status !== "paid" ? "لازم يتدفع العربون أول" : ""}
                    className="flex-1 bg-green-600 text-white rounded-md py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    موافقة
                  </button>
                  <button
                    onClick={() => handleReject(sale._id)}
                    disabled={actioningId === sale._id}
                    className="flex-1 bg-red-600 text-white rounded-md py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
