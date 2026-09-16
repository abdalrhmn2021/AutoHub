"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as serviceService from "@/services/serviceService";
import * as carService from "@/services/carService";
import * as authService from "@/services/authService";

const SERVICE_ROLES = ["superadmin", "branchManager", "technician"];
const MANAGERS = ["superadmin", "branchManager"];

const STATUS_LABELS = {
  requested: "بانتظار التعيين",
  confirmed: "معيّن لفني",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const STATUS_COLORS = {
  requested: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-200 text-gray-600",
};

const TYPE_LABELS = {
  routine_maintenance: "صيانة دورية",
  repair: "إصلاح",
  inspection: "فحص",
  other: "أخرى",
};

const INVOICE_LABELS = {
  not_issued: null,
  unpaid: "الفاتورة غير مدفوعة",
  paid: "الفاتورة مدفوعة ✓",
};

const INVOICE_COLORS = {
  unpaid: "text-yellow-600",
  paid: "text-green-600",
};

const emptyForm = {
  car: "",
  customerName: "",
  customerPhone: "",
  serviceType: "routine_maintenance",
  description: "",
  preferredDate: "",
};

export default function ServicePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [cars, setCars] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !SERVICE_ROLES.includes(user.role))) {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  const isManager = user && MANAGERS.includes(user.role);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await serviceService.getAppointments();
      setAppointments(data.appointments);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بتحميل المواعيد");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && SERVICE_ROLES.includes(user.role)) {
      loadAppointments();
      if (isManager) {
        const branchFilter = user.role === "branchManager" ? user.branch : undefined;
        carService.getCars({ branch: branchFilter, limit: 100 }).then((d) => setCars(d.cars)).catch(() => {});
        authService.getTechnicians().then((d) => setTechnicians(d.technicians)).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCarSelect = (carId) => {
    const car = cars.find((c) => c._id === carId);
    setForm({
      ...form,
      car: carId,
      customerName: car?.owner?.name || form.customerName,
      customerPhone: car?.owner?.phone || form.customerPhone,
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await serviceService.createAppointment(form);
      setForm(emptyForm);
      setShowForm(false);
      loadAppointments();
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بتسجيل الموعد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (id) => {
    const technicianId = prompt(
      "معرّف الفني (اختر من: " + technicians.map((t) => `${t.name} = ${t._id}`).join(" | ") + ")"
    );
    if (!technicianId) return;
    setActioningId(id);
    try {
      await serviceService.assignTechnician(id, technicianId);
      loadAppointments();
    } catch (err) {
      alert(err.response?.data?.message || "صار خطأ بالتعيين");
    } finally {
      setActioningId(null);
    }
  };

  const handleStatusChange = async (id, status) => {
    let completionNotes;
    let invoiceAmount;
    if (status === "completed") {
      completionNotes = prompt("ملاحظات الإنجاز (اختياري):") || undefined;
      const raw = prompt("مبلغ الفاتورة بالدولار (اتركه فاضي لو الصيانة تحت الضمان بدون فاتورة):");
      if (raw && !isNaN(Number(raw)) && Number(raw) > 0) invoiceAmount = Number(raw);
    }
    setActioningId(id);
    try {
      await serviceService.updateStatus(id, { status, completionNotes, invoiceAmount });
      loadAppointments();
    } catch (err) {
      alert(err.response?.data?.message || "صار خطأ بتحديث الحالة");
    } finally {
      setActioningId(null);
    }
  };

  const handlePayInvoice = async (id) => {
    setActioningId(id);
    try {
      const data = await serviceService.createInvoiceCheckout(id);
      window.location.href = data.url;
    } catch (err) {
      alert(err.response?.data?.message || "صار خطأ بإنشاء رابط الدفع");
      setActioningId(null);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">مواعيد الصيانة</h1>
        {isManager && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-[var(--color-primary)] text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            {showForm ? "إلغاء" : "+ موعد جديد"}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <select
            required
            value={form.car}
            onChange={(e) => handleCarSelect(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2"
          >
            <option value="">اختر السيارة (VIN)</option>
            {cars.map((c) => (
              <option key={c._id} value={c._id}>
                {c.make} {c.model} {c.year} — {c.vin} {c.owner?.name ? `(${c.owner.name})` : ""}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="اسم الزبون"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="هاتف الزبون"
            value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <select
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            required
            type="date"
            value={form.preferredDate}
            onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <textarea
            placeholder="وصف المشكلة (اختياري)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2"
          />
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 bg-[var(--color-primary)] text-white rounded-md py-2 font-medium disabled:opacity-50"
          >
            {submitting ? "جارِ التسجيل..." : "تسجيل الموعد"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">جارِ التحميل...</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500">ما في مواعيد صيانة لسا.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">
                    {a.car?.make} {a.car?.model} {a.car?.year} — {a.car?.vin}
                  </p>
                  <p className="text-sm text-gray-500">
                    {a.customerName} — {a.customerPhone} — {TYPE_LABELS[a.serviceType]}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    التاريخ المفضّل: {new Date(a.preferredDate).toLocaleDateString("ar-EG")}
                    {a.assignedTechnician && ` — الفني: ${a.assignedTechnician.name}`}
                  </p>
                  {a.description && <p className="text-xs text-gray-400 mt-1">{a.description}</p>}
                  {a.completionNotes && (
                    <p className="text-xs text-green-600 mt-1">ملاحظات الإنجاز: {a.completionNotes}</p>
                  )}
                  {INVOICE_LABELS[a.invoice?.status] && (
                    <p className={`text-xs font-medium mt-1 ${INVOICE_COLORS[a.invoice?.status]}`}>
                      {INVOICE_LABELS[a.invoice.status]} (${a.invoice.amount})
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[a.status]}`}>
                  {STATUS_LABELS[a.status]}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {isManager && a.status === "requested" && (
                  <button
                    onClick={() => handleAssign(a._id)}
                    disabled={actioningId === a._id}
                    className="bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    تعيين فني
                  </button>
                )}
                {(isManager ||
                  (user.role === "technician" && a.assignedTechnician?._id === user._id)) &&
                  a.status === "confirmed" && (
                    <button
                      onClick={() => handleStatusChange(a._id, "in_progress")}
                      disabled={actioningId === a._id}
                      className="bg-purple-600 text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    >
                      بدء التنفيذ
                    </button>
                  )}
                {(isManager ||
                  (user.role === "technician" && a.assignedTechnician?._id === user._id)) &&
                  a.status === "in_progress" && (
                    <button
                      onClick={() => handleStatusChange(a._id, "completed")}
                      disabled={actioningId === a._id}
                      className="bg-green-600 text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    >
                      إنهاء
                    </button>
                  )}
                {isManager && !["completed", "cancelled"].includes(a.status) && (
                  <button
                    onClick={() => handleStatusChange(a._id, "cancelled")}
                    disabled={actioningId === a._id}
                    className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                )}
                {a.invoice?.status === "unpaid" && (
                  <button
                    onClick={() => handlePayInvoice(a._id)}
                    disabled={actioningId === a._id}
                    className="bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    دفع الفاتورة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
