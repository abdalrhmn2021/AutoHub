"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getSocket, disconnectSocket } from "@/services/socket";

const NotificationContext = createContext(null);

const STATUS_MESSAGES = {
  approved: "تمت الموافقة على صفقتك ✅",
  rejected: "تم رفض صفقتك ❌",
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);

  const pushToast = (message, variant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // لما المستخدم يسجّل دخول (أو الصفحة تعبّي والتوكن موجود) منتّصل بالسوكيت
  // ومنسمع لحدث تغيّر حالة الصفقة — لما يفصل (logout) منقطع الاتصال.
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    const handleSaleStatus = (payload) => {
      pushToast(STATUS_MESSAGES[payload.status] || "في تحديث على إحدى صفقاتك", payload.status);
    };

    socket.on("sale:statusChanged", handleSaleStatus);

    return () => {
      socket.off("sale:statusChanged", handleSaleStatus);
    };
  }, [user]);

  useEffect(() => () => disconnectSocket(), []);

  return (
    <NotificationContext.Provider value={{ pushToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
              t.variant === "approved" ? "bg-green-600" : t.variant === "rejected" ? "bg-red-600" : "bg-gray-800"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications لازم يستخدم جوا NotificationProvider");
  return ctx;
}
