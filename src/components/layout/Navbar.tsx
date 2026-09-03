"use client";

import React from "react";
import Link from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { PesoLogo } from "./PesoLogo";
import {
  ShieldCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Menu,
  FileSpreadsheet,
} from "lucide-react";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, syncNow } = useOffline();

  return (
    <header className="gov-header-gradient text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
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

            <a href="/dashboard" className="flex items-center space-x-3 group">
              <PesoLogo className="h-10 w-10" />
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold tracking-tight text-base sm:text-lg">LGU DINGALAN</span>
                  <span className="bg-gov-gold/30 text-gov-goldLight text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-gov-gold/40 tracking-wider">
                    PESO Dingalan
                  </span>
                </div>
                <span className="text-xs text-blue-200 hidden sm:inline font-medium">
                  TUPAD EC Management System
                </span>
              </div>
            </a>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Sync & Offline Status Indicator */}
            <div className="flex items-center space-x-2">
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
                  <span className="bg-gov-gold text-gov-dark px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </a>

              {pendingCount > 0 && isOnline && (
                <button
                  onClick={() => syncNow()}
                  disabled={isSyncing}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                  title="Sync offline transactions now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-gov-gold" : ""}`} />
                </button>
              )}
            </div>

            {/* User Profile & Role */}
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-white/20">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white leading-tight">{user.fullName}</span>
                  <span className="text-[11px] text-gov-goldLight font-mono">
                    {user.role.replace(/_/g, " ")}
                  </span>
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
