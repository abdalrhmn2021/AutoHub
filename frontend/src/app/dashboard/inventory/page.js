"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as inventoryService from "@/services/inventoryService";

const SERVICE_ROLES = ["superadmin", "branchManager", "technician"];
const MANAGERS = ["superadmin", "branchManager"];

const emptyForm = { name: "", partNumber: "", quantity: 0, unit: "قطعة" };

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState([]);
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

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getInventory();
      setItems(data.items);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بتحميل المخزون");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && SERVICE_ROLES.includes(user.role)) loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await inventoryService.createItem({ ...form, quantity: Number(form.quantity) || 0 });
      setForm(emptyForm);
      setShowForm(false);
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بإضافة الصنف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async (id, sign) => {
    const raw = prompt(sign > 0 ? "كمية الإضافة:" : "كمية الخصم:");
    const value = Number(raw);
    if (!raw || Number.isNaN(value) || value <= 0) return;
    setActioningId(id);
    try {
      await inventoryService.adjustQuantity(id, sign * value);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || "صار خطأ بتعديل الكمية");
    } finally {
      setActioningId(null);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">مخزون قطع الغيار</h1>
        {isManager && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-[var(--color-primary)] text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            {showForm ? "إلغاء" : "+ صنف جديد"}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <input
            required
            placeholder="اسم القطعة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            placeholder="رقم القطعة (اختياري)"
            value={form.partNumber}
            onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="الكمية الابتدائية"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            placeholder="الوحدة (قطعة، لتر...)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 bg-[var(--color-primary)] text-white rounded-md py-2 font-medium disabled:opacity-50"
          >
            {submitting ? "جارِ الإضافة..." : "إضافة الصنف"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">جارِ التحميل...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">ما في قطع مسجّلة بالمخزون لسا.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-right">
              <tr>
                <th className="px-4 py-2">القطعة</th>
                <th className="px-4 py-2">رقم القطعة</th>
                <th className="px-4 py-2">الكمية</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2 text-gray-400">{item.partNumber || "—"}</td>
                  <td className="px-4 py-2 font-medium">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleAdjust(item._id, 1)}
                        disabled={actioningId === item._id}
                        className="bg-green-100 text-green-700 rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50"
                      >
                        + إضافة
                      </button>
                      <button
                        onClick={() => handleAdjust(item._id, -1)}
                        disabled={actioningId === item._id}
                        className="bg-red-100 text-red-700 rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50"
                      >
                        - خصم
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
