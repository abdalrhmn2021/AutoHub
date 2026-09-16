"use client";

import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "@/services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // عند تحميل التطبيق: التوكن صار بكوكي httpOnly، فما فينا نتحقق من وجوده من
  // جافاسكريبت مباشرة (هيك بالضبط الهدف — منع أي وصول له من كود الفرونت اند). بدل
  // هيك، منسأل الباك اند مباشرة "مين أنا؟" — المتصفح بيرفق الكوكي تلقائيًا لو موجودة،
  // ولو مافي كوكي صالحة الطلب برجع 401 ومنعتبر المستخدم مش مسجّل دخول.
  useEffect(() => {
    authService
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    // ما في token برجع الـJSON عمدًا — الباك اند حطّه مباشرة بكوكي httpOnly عبر
    // Set-Cookie header، فما في شي نخزّنه إحنا هون.
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await authService.logout(); // بيمسح الكوكي من طرف السيرفر
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth لازم يستخدم جوا AuthProvider");
  return ctx;
}
