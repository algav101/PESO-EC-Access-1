"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PesoLogo } from "./PesoLogo";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  QrCode,
  Printer,
  CalendarCheck,
  UserPlus,
  Clock,
  Camera,
  Banknote,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  History,
  RefreshCw,
  Search,
  X,
  LogOut,
  User as UserIcon,
} from "lucide-react";

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();

  const navSections = [
    {
      title: "Core Operations",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
        { label: "Programs & Work Plans", href: "/programs", icon: FolderKanban, permission: "program.read" },
        { label: "Beneficiaries Masterlist", href: "/beneficiaries", icon: Users, permission: "beneficiary.read" },
        { label: "QR & Stub Designer", href: "/stubs", icon: Printer, permission: "stub.configure" },
      ],
    },
    {
      title: "Field Scanner Hub",
      items: [
        { label: "Stub Distribution & Affirmation", href: "/field/stub-distribution", icon: QrCode, permission: "stub.distribution.scan" },
        { label: "Orientation Verification", href: "/field/orientation", icon: CalendarCheck, permission: "orientation.scan" },
        { label: "Daily Attendance (AM/PM)", href: "/field/attendance", icon: Clock, permission: "attendance.scan" },
        { label: "Accomplishment Photos", href: "/field/photos", icon: Camera, permission: "photo.upload" },
        { label: "Payout Verification", href: "/field/payout", icon: Banknote, permission: "payout.scan" },
      ],
    },
    {
      title: "Integrity & Compliance",
      items: [
        { label: "Onsite Replacements", href: "/replacements", icon: UserPlus, permission: "replacement.read" },
        { label: "365-Day Restriction Hub", href: "/restrictions", icon: ShieldAlert, permission: "restriction.read" },
        { label: "Eligibility Checker", href: "/restrictions/checker", icon: Search, permission: "dashboard.view" },
      ],
    },
    {
      title: "Reports & Auditing",
      items: [
        { label: "Report Center", href: "/reports", icon: FileSpreadsheet, permission: "report.generate" },
        { label: "Audit Trail Explorer", href: "/admin/audit", icon: History, permission: "audit.read" },
        { label: "Offline Sync Center", href: "/sync", icon: RefreshCw, permission: "sync.read" },
      ],
    },
    ...(can("user.read") || can("settings.read")
      ? [
          {
            title: "System Administration",
            items: [
              ...(can("user.read")
                ? [{ label: "User Management", href: "/admin/users", icon: Users, permission: "user.read" }]
                : []),
              ...(can("settings.read")
                ? [{ label: "System Settings", href: "/admin/settings", icon: Settings, permission: "settings.read" }]
                : []),
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col ${
        isMobile
          ? "w-full h-full min-h-screen overflow-y-auto"
          : "w-64 hidden lg:flex min-h-[calc(100vh-4rem)] border-r border-slate-800"
      }`}
    >
      {/* Mobile Drawer Top Header */}
      {isMobile && (
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <PesoLogo className="h-8 w-8" size={32} />
            <div>
              <h2 className="text-xs font-black text-white tracking-tight leading-tight">PESO DINGALAN</h2>
              <p className="text-[10px] text-gov-goldLight font-bold uppercase">Navigation Menu</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition focus:outline-none"
            aria-label="Close mobile sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* User Info Badge in Mobile Drawer */}
      {isMobile && user && (
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-gov-blue text-gov-goldLight flex items-center justify-center font-bold text-xs">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.fullName || user.username}</p>
              <p className="text-[10px] text-gov-gold font-mono uppercase">{user.role?.replace(/_/g, " ")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => !item.permission || can(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (isMobile && onClose) {
                          onClose();
                        }
                      }}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-gov-blue text-white shadow-md font-bold border border-blue-400/30"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-800"
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-gov-goldLight" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info & Mobile Logout */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-3 bg-slate-950/50">
        {isMobile && user && (
          <button
            onClick={() => {
              if (onClose) onClose();
              logout();
            }}
            className="w-full py-2 px-3 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
        <div className="text-center sm:text-left">
          <p className="font-semibold text-slate-400">PESO Dingalan • DOLE Aurora</p>
          <p className="text-[10px]">TUPAD EC Management Platform v1.0</p>
        </div>
      </div>
    </aside>
  );
}
