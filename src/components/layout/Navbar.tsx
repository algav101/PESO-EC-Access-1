"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { PesoLogo } from "./PesoLogo";
import { isFieldCoordinator } from "@/lib/permissions";
import {
  ShieldCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Menu,
  FileSpreadsheet,
  Key,
  Home,
  LayoutDashboard,
} from "lucide-react";

const ROLE_HOME_LINKS: Record<string, { href: string; label: string }> = {
  DOMAIN_MASTER: { href: "/dashboard", label: "Back to Admin Section" },
  PESO_ADMIN: { href: "/dashboard", label: "Back to Admin Section" },
  PESO_STAFF: { href: "/dashboard", label: "Back to Staff Section" },
  DOLE_COORDINATOR: { href: "/dashboard", label: "Back to DOLE Section" },
  TUPAD_COORDINATOR: { href: "/field", label: "Back to Coordinator Section" },
  TUPAD_ASSISTING_DOCUMENTOR: { href: "/field", label: "Back to Documentor Section" },
};

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, syncNow, masterSyncNow } = useOffline();
  const roleHomeLink = user ? ROLE_HOME_LINKS[user.role] : null;
  // Standalone public pages have no sidebar. Offer a way back without logging out.
  const showRoleReturn = Boolean(user && roleHomeLink && !onToggleSidebar);

  const isLandingOrMigrantsPortal =
    !user || pathname === "/" || pathname === "/login" || pathname.startsWith("/migrants");

  return (
    <header className="gov-header-gradient text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
          {/* Left branding */}
          <div className="flex items-center space-x-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-md hover:bg-white/10 lg:hidden text-white focus:outline-none"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <a
              href={
                isLandingOrMigrantsPortal
                  ? "/"
                  : isFieldCoordinator(user)
                  ? "/field"
                  : "/dashboard"
              }
              className="flex items-center space-x-3 group"
            >
              <PesoLogo className="h-10 w-10" src="/images/peso-eccess-chrome-emblem.png?v=ffeb0acf" />
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold tracking-tight text-base sm:text-lg">LGU DINGALAN</span>
                </div>
                <span className="text-xs text-slate-300 hidden sm:inline font-semibold">
                  PESO EC Access
                </span>
              </div>
            </a>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex max-w-full items-center space-x-2 sm:space-x-4">
            {/* Sync & Offline Status Indicator */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <a
                href="/sync"
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                  isOnline
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-400/40 hover:bg-rose-500/30"
                }`}
                title={isOnline ? "System Online" : "Offline Mode Active"}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isOnline ? "Online" : "Offline"}</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                    {pendingCount}
                  </span>
                )}
              </a>

              {user && (
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        "Execute Master Key Sync?\n\nThis will purge local device cache and re-align all attendance and beneficiary records with the PESO Admin central database."
                      )
                    ) {
                      await masterSyncNow();
                      window.location.reload();
                    }
                  }}
                  disabled={!isOnline || isSyncing}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[11px] font-bold transition flex items-center space-x-1 disabled:opacity-40"
                  title="Master Key Sync: Align local device with PESO Admin database"
                >
                  <Key className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span className="hidden lg:inline">Master Sync</span>
                </button>
              )}

              {pendingCount > 0 && isOnline && (
                <button
                  onClick={() => syncNow()}
                  disabled={isSyncing}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                  title="Sync offline transactions now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-amber-300" : ""}`} />
                </button>
              )}
            </div>

            {showRoleReturn && roleHomeLink && (
              <a
                href={roleHomeLink.href}
                aria-label={roleHomeLink.label}
                title={roleHomeLink.label}
                data-testid="back-to-role-section"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">{roleHomeLink.label}</span>
              </a>
            )}

            {user && pathname !== "/" && (
              <Link
                href="/"
                aria-label="Back to Landing Page"
                title="Back to Landing Page"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 p-2 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">Back to Landing Page</span>
              </Link>
            )}

            {/* User Profile & Role */}
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-white/20">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-tight">{user.fullName}</span>
                  {user.role === "DOMAIN_MASTER" ? (
                    <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-400/40 inline-flex items-center space-x-1 justify-end">
                      <span>👑 Domain Master</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-300 font-mono font-bold">
                      {(user.role || "").replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/90 hover:text-white transition flex items-center space-x-1 text-xs"
                  title="Sign out of system"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="group flex items-center space-x-2 bg-slate-950/90 hover:bg-slate-900 px-2.5 py-1 rounded-xl border border-amber-400/50 hover:border-amber-300 transition shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                title="MAEDUP! e PESO access - Staff Login"
              >
                <img
                  src="/images/login-portal-badge.png"
                  alt="MAEDUP! e PESO access"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
                <span className="text-xs font-black text-white group-hover:text-amber-300 transition pr-1 hidden sm:inline">
                  Log in
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
