"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  CalendarCheck,
  Clock,
  Camera,
  Banknote,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Navigation,
  CheckCircle2,
  Users,
  Smartphone,
  Download,
  Search,
} from "lucide-react";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { FieldQrPassGeneratorCard } from "@/components/field/FieldQrPassGeneratorCard";

import { useAuth } from "@/context/AuthContext";

const FIELD_OPERATIONS = [
  {
    title: "TUPAD Work Program & Groupings",
    href: "/field/work-program",
    icon: Users,
    permission: "work_program.read",
    color: "from-teal-600 to-teal-800",
    badge: "Official 10-Day Plan",
    description: "Tingnan ang opisyal na 10-araw na iskedyul ng aktibidad, mga grupo sa purok, at listahan ng mga nakatalagang benepisyaryo para sa iyong barangay.",
  },
  {
    title: "Stub Distribution & Affirmation",
    href: "/field/stub-distribution",
    icon: QrCode,
    permission: "stub.distribution.scan",
    color: "from-blue-600 to-blue-800",
    badge: "Day 0 • Issuance",
    description: "Scan stub QR codes upon releasing official TUPAD ID stubs, verify beneficiary identity, and record citizen affirmation.",
  },
  {
    title: "Orientation Verification",
    href: "/field/orientation",
    icon: CalendarCheck,
    permission: "orientation.scan",
    color: "from-amber-600 to-amber-800",
    badge: "Day 1 • Briefing",
    description: "Verify beneficiary attendance during the official DOLE TUPAD pre-deployment orientation and safety protocol briefing.",
  },
  {
    title: "Daily Attendance (AM / PM)",
    href: "/field/attendance",
    icon: Clock,
    permission: "attendance.scan",
    color: "from-emerald-600 to-emerald-800",
    badge: "Days 1–10 • Shifts",
    description: "Real-time morning and afternoon attendance scanning with automatic offline caching and work area matching.",
  },
  {
    title: "Accomplishment Photos",
    href: "/field/photos",
    icon: Camera,
    permission: "photo.upload",
    color: "from-indigo-600 to-indigo-800",
    badge: "Field Evidence",
    description: "Upload geotagged daily work accomplishment photos per Barangay sector and Purok/Sitio project location.",
  },
  {
    title: "Payout Verification",
    href: "/field/payout",
    icon: Banknote,
    permission: "payout.scan",
    color: "from-purple-600 to-purple-800",
    badge: "Wage Disbursal",
    description: "Final scanning and identification check during official DOLE wage release and payroll disbursement.",
  },
  {
    title: "Purok Groupings & Area Assignment",
    href: "/beneficiaries?view=groupings",
    icon: Users,
    color: "from-teal-600 to-teal-800",
    badge: "Work Area Deployment",
    description: "Tingnan ang total groups bawat barangay, lumikha ng mga bagong grupo, at italaga sa designated work areas ayon sa TUPAD 10-day work program.",
  },
];

export default function FieldScannerHubPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-gov-gold border-t-transparent rounded-full animate-spin" />
          <span>Ikinakarga ang TUPAD Field Scanner Hub...</span>
        </div>
      }
    >
      <FieldScannerHubContent />
    </React.Suspense>
  );
}

function FieldScannerHubContent() {
  const { user, can } = useAuth();
  const [activeTab, setActiveTab] = useState<"qr-generator" | "scanner-tools">("qr-generator");

  const visibleOperations = FIELD_OPERATIONS.filter(
    (op) => !op.permission || can(op.permission)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="gov-card p-6 sm:p-8 bg-gradient-to-r from-gov-dark via-slate-900 to-blue-950 text-white rounded-3xl border-2 border-gov-gold/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <PesoLogo className="w-12 h-12 shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-gov-gold text-gov-dark font-mono">
                  PESO DINGALAN
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {user?.role === "TUPAD_ASSISTING_DOCUMENTOR"
                    ? "Tupad Assisting Documentor Hub"
                    : "Field Scanner Operations Hub"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
                TUPAD Field Scanner Hub &amp; QR Pass Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-0.5">
                {user?.role === "TUPAD_ASSISTING_DOCUMENTOR"
                  ? "Assisting Documentor Portal: Kumuha ng daily accomplishment photo documentation at magsagawa ng DTR attendance scanning sa field."
                  : "Sentro ng field operations para sa mga scanner coordinators: Mag-generate ng scannable QR pass para sa bawat benepisyaryo at magsagawa ng field scanning."}
              </p>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-700 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("qr-generator")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 ${
                activeTab === "qr-generator"
                  ? "bg-gov-gold text-gov-dark shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>QR Pass Generator</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scanner-tools")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 ${
                activeTab === "scanner-tools"
                  ? "bg-gov-gold text-gov-dark shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Scanner Hub Tools ({visibleOperations.length})</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-gov-gold/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Primary Tab View: QR Pass Generator & Screenshot Studio */}
      {activeTab === "qr-generator" && (
        <div className="space-y-6 animate-fadeIn">
          <FieldQrPassGeneratorCard />
        </div>
      )}

      {/* 3. Secondary Tab View: Filtered Field Scanner Operations Tools */}
      {activeTab === "scanner-tools" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <QrCode className="w-5 h-5 text-gov-blue" />
              <span>Pumili ng Field Scanner Tool:</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pumili ng partikular na proseso para sa live mobile camera scanning sa field.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleOperations.map((op) => {
              const Icon = op.icon;
              return (
                <Link
                  key={op.href}
                  href={op.href}
                  className="gov-card bg-white p-5 rounded-2xl border border-slate-200 hover:border-gov-blue hover:shadow-lg transition-all group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${op.color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border">
                        {op.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-gov-blue transition-colors">
                        {op.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {op.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-gov-blue group-hover:text-blue-700">
                    <span>Buksan ang Scanner</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
