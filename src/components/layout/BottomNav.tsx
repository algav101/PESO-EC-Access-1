"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Clock,
  Camera,
  RefreshCw,
} from "lucide-react";
import { useOffline } from "@/context/OfflineContext";

export function BottomNav() {
  const pathname = usePathname();
  const { pendingCount } = useOffline();

  const links = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Attendance", href: "/field/attendance", icon: Clock },
    { label: "Scan Hub", href: "/field/stub-distribution", icon: QrCode, isPrimary: true },
    { label: "Photos", href: "/field/photos", icon: Camera },
    { label: "Sync", href: "/sync", icon: RefreshCw, badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  return (
    <nav className="bottom-nav lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 px-2 py-1 shadow-2xl">
      <div className="flex items-center justify-around">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          if (item.isPrimary) {
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-gov-blue text-white flex items-center justify-center shadow-lg border-2 border-gov-gold">
                  <Icon className="w-6 h-6 text-gov-goldLight" />
                </div>
                <span className="text-[10px] font-bold text-slate-300 mt-0.5">{item.label}</span>
              </a>
            );
          }

          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 relative ${
                isActive ? "text-gov-goldLight font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-0 right-1 bg-gov-gold text-gov-dark text-[9px] font-bold px-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
