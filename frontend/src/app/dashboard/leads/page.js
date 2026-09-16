"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as leadService from "@/services/leadService";
import * as carService from "@/services/carService";

const STATUS_LABELS = {
  new: "جديد",
  contacted: "تم التواصل",
  negotiating: "قيد التفاوض",
  won: "مكسوب",
  lost: "مفقود",
};

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  negotiating: "bg-purple-100 text-purple-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

const STAFF_ROLES = ["superadmin", "branchManager", "salesAgent"];

const emptyForm = { customerName: "", customerPhone: "", customerEmail: "", car: "" };

export default function LeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [leads, setLeads] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !STAFF_ROLES.includes(user.role))) {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await leadService.getLeads();
      setLeads(data.leads);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بتحميل الـLeads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && STAFF_ROLES.includes(user.role)) {
      loadLeads();
      carService.getCars({ status: "available", limit: 100 }).then((data) => setCars(data.cars));
    }
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await leadService.createLead(form);
      setForm(emptyForm);
      setShowForm(false);
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بإنشاء الـLead");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads (عملاء مهتمين)</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          {showForm ? "إلغاء" : "+ Lead جديد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="اسم الزبون"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="رقم الهاتف"
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="البريد الإلكتروني (اختياري)"
            value={form.customerEmail}
            onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <select
            required
            value={form.car}
            onChange={(e) => setForm({ ...form, car: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">اختر السيارة</option>
            {cars.map((c) => (
              <option key={c._id} value={c._id}>
                {c.make} {c.model} {c.year} — ${new Intl.NumberFormat("en-US").format(c.price)}
              </option>
            ))}
          </select>

          {error && <p className="sm:col-span-2 text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 bg-[var(--color-accent)] text-gray-900 rounded-md py-2 font-medium disabled:opacity-50"
          >
            {submitting ? "جارِ الحفظ..." : "حفظ الـLead"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">جارِ التحميل...</p>
      ) : leads.length === 0 ? (
        <p className="text-gray-500">ما في Leads لسا.</p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <Link
              key={lead._id}
              href={`/dashboard/leads/${lead._id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{lead.customerName}</p>
                  <p className="text-sm text-gray-500">
                    {lead.car?.make} {lead.car?.model} {lead.car?.year} — مسؤول: {lead.assignedTo?.name}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[lead.status]}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
