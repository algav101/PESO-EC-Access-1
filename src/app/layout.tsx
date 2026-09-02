import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";
import { ClientLayout } from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "LGU Dingalan - PESO Dingalan | TUPAD EC Management System",
  description: "Official offline-first TUPAD EC Management System for LGU Dingalan PESO and DOLE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-gov-blue selection:text-white">
        <AuthProvider>
          <OfflineProvider>
            <ClientLayout>{children}</ClientLayout>
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
