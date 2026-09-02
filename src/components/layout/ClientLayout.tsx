"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/";

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Drawer Sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 shadow-xl z-10">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
