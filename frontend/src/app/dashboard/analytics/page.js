"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as analyticsService from "@/services/analyticsService";

const ANALYTICS_ROLES = ["superadmin", "branchManager"];

const formatMoney = (n) => `$${new Intl.NumberFormat("en-US").format(Math.round(n || 0))}`;

function KpiCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent || ""}`}>{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [overview, setOverview] = useState(null);
  const [topModels, setTopModels] = useState([]);
  const [byBranch, setByBranch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSuperadmin = user?.role === "superadmin";

  useEffect(() => {
    if (!authLoading && (!user || !ANALYTICS_ROLES.includes(user.role))) {
      router.push("/dashboard");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !ANALYTICS_ROLES.includes(user.role)) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const requests = [analyticsService.getOverview(), analyticsService.getTopModels()];
        if (user.role === "superadmin") requests.push(analyticsService.getByBranch());

        const results = await Promise.all(requests);
        setOverview(results[0].overview);
        setTopModels(results[1].models);
        if (results[2]) setByBranch(results[2].branches);
      } catch (err) {
        setError(err.response?.data?.message || "صار خطأ بتحميل التقارير");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (authLoading || !user) return null;

  const maxBranchRevenue = Math.max(1, ...byBranch.map((b) => b.totalRevenue));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">لوحة التحكم التحليلية</h1>
      <p className="text-gray-500 text-sm mb-6">
        {isSuperadmin ? "أداء كل الفروع" : "أداء فرعك"} — مبني بس على الصفقات المعتمدة فعليًا.
      </p>

      {loading ? (
        <p className="text-gray-500">جارِ التحميل...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <KpiCard label="إجمالي الإيرادات" value={formatMoney(overview.totalRevenue)} accent="text-[var(--color-primary)]" />
              <KpiCard label="صفقات مكتملة" value={overview.totalSales} />
              <KpiCard label="متوسط قيمة الصفقة" value={formatMoney(overview.avgDealSize)} />
              <KpiCard label="بانتظار الموافقة" value={overview.pendingApprovals} accent="text-yellow-600" />
              <KpiCard label="سيارات متوفرة" value={overview.carsAvailable} accent="text-green-600" />
              <KpiCard label="سيارات محجوزة" value={overview.carsReserved} accent="text-yellow-600" />
              <KpiCard label="سيارات مباعة" value={overview.carsSold} />
            </div>
          )}

          {isSuperadmin && byBranch.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="font-bold mb-4">الإيرادات حسب الفرع</h2>
              <div className="space-y-3">
                {byBranch.map((b) => (
                  <div key={b.branchId}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {b.name} — {b.city}
                      </span>
                      <span className="text-gray-500">
                        {formatMoney(b.totalRevenue)} ({b.totalSales} صفقة)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)] h-2 rounded-full"
                        style={{ width: `${(b.totalRevenue / maxBranchRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-bold mb-4">الأكثر مبيعًا</h2>
            {topModels.length === 0 ? (
              <p className="text-sm text-gray-500">ما في صفقات معتمدة بعد لعرض إحصائيات.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-right py-2 font-medium">الماركة والموديل</th>
                    <th className="text-right py-2 font-medium">الوحدات المباعة</th>
                    <th className="text-right py-2 font-medium">الإيرادات</th>
                  </tr>
                </thead>
                <tbody>
                  {topModels.map((m) => (
                    <tr key={`${m.make}-${m.model}`} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">
                        {m.make} {m.model}
                      </td>
                      <td className="py-2">{m.unitsSold}</td>
                      <td className="py-2">{formatMoney(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
