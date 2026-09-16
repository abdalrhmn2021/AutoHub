"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const STAFF_ROLES = ["superadmin", "branchManager", "salesAgent"];
const SERVICE_ROLES = ["superadmin", "branchManager", "technician"];
const ANALYTICS_ROLES = ["superadmin", "branchManager"];

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const isStaff = user && STAFF_ROLES.includes(user.role);
  const isServiceStaff = user && SERVICE_ROLES.includes(user.role);
  const isAnalyticsRole = user && ANALYTICS_ROLES.includes(user.role);

  return (
    <header className="bg-[var(--color-primary)] text-white sticky top-0 z-50 shadow">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Auto<span className="text-[var(--color-accent)]">Hub</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-[var(--color-accent)]">
            المعرض
          </Link>
          <Link href="/trade-in" className="hover:text-[var(--color-accent)]">
            قيّم سيارتك
          </Link>
          <Link href="/assistant" className="hover:text-[var(--color-accent)]">
            المساعد الذكي
          </Link>

          {loading ? null : user ? (
            <>
              <Link href="/dashboard" className="hover:text-[var(--color-accent)]">
                لوحة التحكم
              </Link>
              {isStaff && (
                <>
                  <Link href="/dashboard/leads" className="hover:text-[var(--color-accent)]">
                    Leads
                  </Link>
                  <Link href="/dashboard/sales" className="hover:text-[var(--color-accent)]">
                    الصفقات
                  </Link>
                </>
              )}
              {isServiceStaff && (
                <>
                  <Link href="/dashboard/service" className="hover:text-[var(--color-accent)]">
                    الصيانة
                  </Link>
                  <Link href="/dashboard/inventory" className="hover:text-[var(--color-accent)]">
                    المخزون
                  </Link>
                </>
              )}
              {isAnalyticsRole && (
                <Link href="/dashboard/analytics" className="hover:text-[var(--color-accent)]">
                  التحليلات
                </Link>
              )}
              <span className="text-gray-300 hidden sm:inline">مرحبًا، {user.name}</span>
              <button
                onClick={logout}
                className="bg-[var(--color-accent)] text-gray-900 px-3 py-1.5 rounded-md font-medium hover:opacity-90"
              >
                خروج
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-[var(--color-accent)]">
                تسجيل دخول
              </Link>
              <Link
                href="/register"
                className="bg-[var(--color-accent)] text-gray-900 px-3 py-1.5 rounded-md font-medium hover:opacity-90"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
