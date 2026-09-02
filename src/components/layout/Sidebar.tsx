"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, can } = useAuth();

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
        { label: "Stub Distribution", href: "/field/stub-distribution", icon: QrCode, permission: "stub.distribution.scan" },
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
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden lg:flex flex-col min-h-[calc(100vh-4rem)] border-r border-slate-800">
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
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? "bg-gov-blue text-white shadow-sm font-bold border border-blue-400/30"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/80"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-gov-goldLight" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">PESO Dingalan • DOLE Aurora</p>
        <p className="text-[10px]">TUPAD Beneficiary Engine v1.0</p>
      </div>
    </aside>
  );
}
