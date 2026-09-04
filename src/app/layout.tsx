import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";
import { ClientLayout } from "@/components/layout/ClientLayout";

import { ServiceWorkerRegister } from "@/components/common/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "LGU Dingalan - PESO EC Access",
  description: "Official PESO EC Access portal for LGU Dingalan and DOLE programs.",
  manifest: "/manifest.json",
  themeColor: "#1e3a8a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PESO TUPAD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e3a8a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PESO TUPAD" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-gov-blue selection:text-white">
        <ServiceWorkerRegister />
        <AuthProvider>
          <OfflineProvider>
            <ClientLayout>{children}</ClientLayout>
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
