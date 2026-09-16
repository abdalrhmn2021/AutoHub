"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as leadService from "@/services/leadService";
import * as saleService from "@/services/saleService";
import * as tradeInService from "@/services/tradeInService";
import FinancingCalculator from "@/components/FinancingCalculator";

const formatMoney = (n) => new Intl.NumberFormat("en-US").format(n);

const STATUS_LABELS = {
  new: "جديد",
  contacted: "تم التواصل",
  negotiating: "قيد التفاوض",
  won: "مكسوب",
  lost: "مفقود",
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteText, setNoteText] = useState("");

  const [showSaleForm, setShowSaleForm] = useState(false);
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [financing, setFinancing] = useState(null);
  const [saleError, setSaleError] = useState("");
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState("");

  const [tradeInRequests, setTradeInRequests] = useState([]);
  const [selectedTradeIn, setSelectedTradeIn] = useState("");

  const loadLead = async () => {
    setLoading(true);
    try {
      const data = await leadService.getLead(id);
      setLead(data.lead);
      if (!price) setPrice(data.lead.car?.price || "");
    } catch (err) {
      setError(err.response?.data?.message || "الـLead غير موجود");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // لو الـLead مرتبط بحساب زبون فعلي، نجيب طلبات التقييم المعلّقة تبعه —
  // بدون حساب مرتبط ما في طريقة نتأكد إنه نفس الشخص، فبنتجاهل الميزة بهاي الحالة
  useEffect(() => {
    if (lead?.customer) {
      tradeInService
        .getRequests({ customer: lead.customer, status: "pending" })
        .then((data) => setTradeInRequests(data.requests))
        .catch(() => {});
    }
  }, [lead?.customer]);

  const handleStatusChange = async (status) => {
    await leadService.updateLeadStatus(id, status);
    loadLead();
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await leadService.addNote(id, noteText.trim());
    setNoteText("");
    loadLead();
  };

  const selectedTradeInObj = tradeInRequests.find((t) => t._id === selectedTradeIn);
  const tradeInValue = selectedTradeInObj?.estimatedValue || 0;
  const netPrice = Math.max(0, (Number(price) || 0) - tradeInValue);

  const handleCreateSale = async (e) => {
    e.preventDefault();
    setSaleError("");
    setSaleSubmitting(true);
    try {
      const payload = { lead: id, price: Number(price), paymentMethod };
      if (selectedTradeIn) payload.tradeIn = selectedTradeIn;
      if (paymentMethod === "installment") {
        if (!financing) {
          throw { response: { data: { message: "احسب القسط الشهري أول من حاسبة التمويل تحت" } } };
        }
        payload.downPayment = financing.downPayment;
        payload.months = financing.months;
        payload.annualInterestRate = financing.annualInterestRate;
      }
      await saleService.createSale(payload);
      setSaleSuccess("تم إنشاء الصفقة، بانتظار موافقة مدير الفرع ✅");
      setShowSaleForm(false);
      setTimeout(() => router.push("/dashboard/sales"), 1500);
    } catch (err) {
      setSaleError(err.response?.data?.message || "صار خطأ بإنشاء الصفقة");
    } finally {
      setSaleSubmitting(false);
    }
  };

  if (loading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">جارِ التحميل...</p>;
  if (error) return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">{error}</p>;
  if (!lead) return null;

  const canConvert = ["new", "contacted", "negotiating"].includes(lead.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={() => router.push("/dashboard/leads")} className="text-sm text-gray-500 mb-4">
        ← رجوع للقائمة
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{lead.customerName}</h1>
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <dl className="grid grid-cols-2 gap-y-2 text-sm mb-4">
          <dt className="text-gray-500">الهاتف</dt>
          <dd>{lead.customerPhone}</dd>
          <dt className="text-gray-500">السيارة</dt>
          <dd>
            {lead.car?.make} {lead.car?.model} {lead.car?.year} — ${new Intl.NumberFormat("en-US").format(lead.car?.price || 0)}
          </dd>
          <dt className="text-gray-500">المسؤول</dt>
          <dd>{lead.assignedTo?.name}</dd>
        </dl>

        {canConvert && (
          <button
            onClick={() => setShowSaleForm((s) => !s)}
            className="w-full bg-[var(--color-accent)] text-gray-900 font-bold py-2.5 rounded-lg"
          >
            {showSaleForm ? "إلغاء" : "تحويل لصفقة بيع"}
          </button>
        )}

        {saleSuccess && <p className="text-green-600 text-sm mt-3">{saleSuccess}</p>}
      </div>

      {showSaleForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-bold">تفاصيل الصفقة</h2>

          <form onSubmit={handleCreateSale} className="space-y-3">
            <label className="text-sm block">
              السعر النهائي ($)
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              />
            </label>

            <label className="text-sm block">
              طريقة الدفع
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              >
                <option value="cash">كاش</option>
                <option value="installment">تقسيط</option>
              </select>
            </label>

            {tradeInRequests.length > 0 && (
              <label className="text-sm block">
                استخدام تقييم سيارة مستعملة (اختياري)
                <select
                  value={selectedTradeIn}
                  onChange={(e) => {
                    setSelectedTradeIn(e.target.value);
                    setFinancing(null); // السعر الصافي بيتغيّر، أي حساب تمويل سابق بطل صالح
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                >
                  <option value="">بدون تقييم</option>
                  {tradeInRequests.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.make} {t.model} {t.year} — ${formatMoney(t.estimatedValue)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedTradeIn && (
              <p className="text-sm bg-gray-50 rounded-md px-3 py-2">
                السعر بعد خصم التقييم (${formatMoney(tradeInValue)}):{" "}
                <span className="font-bold text-[var(--color-primary)]">${formatMoney(netPrice)}</span>
              </p>
            )}

            {paymentMethod === "installment" && (
              <FinancingCalculator price={netPrice} onQuoteChange={setFinancing} />
            )}

            {saleError && <p className="text-red-600 text-sm">{saleError}</p>}

            <button
              type="submit"
              disabled={saleSubmitting}
              className="w-full bg-[var(--color-primary)] text-white rounded-md py-2.5 font-medium disabled:opacity-50"
            >
              {saleSubmitting ? "جارِ الإرسال..." : "إرسال الصفقة لموافقة مدير الفرع"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-bold mb-3">ملاحظات المتابعة</h2>

        <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
          <input
            placeholder="أضف ملاحظة..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm">
            إضافة
          </button>
        </form>

        {lead.notes?.length === 0 ? (
          <p className="text-gray-400 text-sm">ما في ملاحظات لسا.</p>
        ) : (
          <ul className="space-y-2">
            {[...(lead.notes || [])].reverse().map((note, i) => (
              <li key={i} className="text-sm border-b border-gray-100 pb-2">
                <p>{note.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {note.addedBy?.name} — {new Date(note.createdAt).toLocaleString("ar")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
