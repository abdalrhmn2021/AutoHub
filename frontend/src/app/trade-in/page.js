"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import * as tradeInService from "@/services/tradeInService";

const STATUS_LABELS = {
  pending: "بانتظار الاستخدام بصفقة",
  applied: "مستخدم بصفقة بيع",
  expired: "منتهي",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  applied: "bg-green-100 text-green-700",
  expired: "bg-gray-200 text-gray-600",
};

const emptyForm = { make: "", model: "", year: new Date().getFullYear(), mileage: "", purchasePrice: "" };
const formatMoney = (n) => new Intl.NumberFormat("en-US").format(n);

export default function TradeInPage() {
  const { user } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [myRequests, setMyRequests] = useState([]);

  const isCustomer = user?.role === "customer";

  const loadMyRequests = async () => {
    try {
      const data = await tradeInService.getMyRequests();
      setMyRequests(data.requests);
    } catch {
      // تجاهل بهدوء — مو ضروري تفشل الصفحة كلها
    }
  };

  useEffect(() => {
    if (isCustomer) loadMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomer]);

  const handleEstimate = async (e) => {
    e.preventDefault();
    setError("");
    setSaveMessage("");
    setEstimate(null);
    setCalculating(true);
    try {
      const data = await tradeInService.getEstimate({
        purchasePrice: Number(form.purchasePrice),
        year: Number(form.year),
        mileage: Number(form.mileage),
      });
      setEstimate(data);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بحساب التقييم");
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveRequest = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await tradeInService.createRequest({
        make: form.make,
        model: form.model,
        year: Number(form.year),
        mileage: Number(form.mileage),
        purchasePrice: Number(form.purchasePrice),
      });
      setSaveMessage("تم تسجيل طلبك بنجاح — رح يقدر المندوب يستخدمه لما تشتري سيارة جديدة ✅");
      loadMyRequests();
    } catch (err) {
      setSaveMessage(err.response?.data?.message || "صار خطأ بتسجيل الطلب");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">قيّم سيارتك المستعملة</h1>
      <p className="text-gray-500 text-sm mb-6">
        جرّب احصل على تقدير فوري لقيمة سيارتك — وممكن تستخدمها لتخفيض سعر سيارة جديدة لما تشتري.
      </p>

      <form onSubmit={handleEstimate} className="bg-white border border-gray-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <input
          required
          placeholder="الماركة"
          value={form.make}
          onChange={(e) => setForm({ ...form, make: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="الموديل"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          placeholder="سنة الصنع"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          placeholder="الكيلومترات المقطوعة"
          value={form.mileage}
          onChange={(e) => setForm({ ...form, mileage: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          placeholder="سعر الشراء الأصلي ($)"
          value={form.purchasePrice}
          onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2"
        />

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={calculating}
          className="sm:col-span-2 bg-[var(--color-primary)] text-white rounded-md py-2 font-medium disabled:opacity-50"
        >
          {calculating ? "جارِ الحساب..." : "احسب التقييم"}
        </button>
      </form>

      {estimate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 text-center">
          <p className="text-gray-500 text-sm mb-1">القيمة التقديرية</p>
          <p className="text-3xl font-bold text-[var(--color-primary)] mb-3">${formatMoney(estimate.estimatedValue)}</p>
          <p className="text-xs text-gray-400 mb-4">
            عمر السيارة: {estimate.ageYears} سنة {estimate.excessMileage > 0 && `— كيلومترات زايدة عن المتوسط: ${formatMoney(estimate.excessMileage)} كم`}
          </p>

          {isCustomer ? (
            <button
              onClick={handleSaveRequest}
              disabled={saving}
              className="w-full bg-[var(--color-accent)] text-gray-900 font-bold rounded-lg py-2.5 disabled:opacity-50"
            >
              {saving ? "جارِ التسجيل..." : "سجّل هالتقييم رسميًا"}
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              سجّل دخول كزبون عشان تقدر تحفظ هالتقييم وتستخدمه وقت شراء سيارة جديدة.
            </p>
          )}

          {saveMessage && <p className="text-sm mt-3 text-green-700">{saveMessage}</p>}
        </div>
      )}

      {isCustomer && myRequests.length > 0 && (
        <div>
          <h2 className="font-bold mb-3">طلباتي المسجّلة</h2>
          <div className="space-y-2">
            {myRequests.map((r) => (
              <div key={r._id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {r.make} {r.model} {r.year}
                  </p>
                  <p className="text-sm text-gray-500">${formatMoney(r.estimatedValue)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
