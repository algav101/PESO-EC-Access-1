"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [isRedirecting, setIsRedirecting] = useState(false);

  // Automatically close mobile sidebar on navigation
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Ensure shared links to unauthenticated sub-addresses acknowledge landing cookie
  // without kicking authenticated staff or new-tab navigations back to /
  useEffect(() => {
    if (
      pathname === "/" ||
      pathname.startsWith("/my-assignment") ||
      pathname.startsWith("/qr/") ||
      pathname.startsWith("/migrants")
    ) {
      try {
        sessionStorage.setItem("peso_entered_via_landing", "1");
        document.cookie = "peso_landing_visited=1; path=/; SameSite=Lax";
      } catch (e) {}
      return;
    }

    try {
      const enteredViaLanding = sessionStorage.getItem("peso_entered_via_landing");
      const hasLandingCookie = document.cookie.includes("peso_landing_visited=1");
      const hasCachedAuth = Boolean(
        localStorage.getItem("peso_cached_user") || localStorage.getItem("peso_jwt_token")
      );

      if (hasLandingCookie || hasCachedAuth) {
        sessionStorage.setItem("peso_entered_via_landing", "1");
        return;
      }

      if (!enteredViaLanding) {
        setIsRedirecting(true);
        window.location.replace("/");
      }
    } catch (e) {}
  }, [pathname]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 border-4 border-gov-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-600">Nagre-redirect sa Landing Page...</span>
        </div>
      </div>
    );
  }

  const isAuthPage = pathname === "/login" || pathname === "/";

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Migrants' Corner Hub (/migrants*) and unauthenticated public sub-routes
  // must stay in the standalone Landing Page Portal layout and NEVER open the Dashboard Sidebar/BottomNav
  const isStandaloneLandingPortal =
    pathname.startsWith("/migrants") ||
    (!user &&
      (pathname.startsWith("/apply") ||
        pathname.startsWith("/restrictions/checker") ||
        pathname.startsWith("/my-assignment") ||
        pathname.startsWith("/qr/")));

  if (isStandaloneLandingPortal) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Fixed Sidebar */}
        <Sidebar isMobile={false} />

        {/* Mobile Slide-Over Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer container */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 shadow-2xl z-10 transform transition-transform duration-300 ease-in-out">
              <Sidebar
                isMobile={true}
                onClose={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
