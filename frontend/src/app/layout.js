import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "AutoHub — معارض وخدمات سيارات",
  description: "منصة إدارة معارض وخدمات السيارات",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <AuthProvider>
          <NotificationProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
