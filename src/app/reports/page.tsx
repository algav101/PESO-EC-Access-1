"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  Filter,
  Printer,
  Sparkles,
  Building,
  ShieldAlert,
  Clock,
  Banknote,
  UserPlus,
  History,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";

export default function ReportCenterPage() {
  const { user } = useAuth();
  const isPesoAdmin = isAdminUser(user);

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        setPrograms(progs);
        if (progs.length > 0) {
          setSelectedProgramId(progs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reportCards = [
    {
      id: "WORK_PROGRAM",
      title: "10-Day TUPAD Work Program (.XLSX)",
      refNote: "Official Work Plan",
      description: "Official 10-day activity schedules, work areas (Sitio/Purok), and gender quotas for all 11 Dingalan barangays.",
      icon: FileSpreadsheet,
      color: "text-blue-700 bg-blue-50",
      action: "Export Work Plan",
      href: `/api/v1/reports/export?type=WORK_PROGRAM&programId=${selectedProgramId}`,
    },
    {
      id: "ATTENDANCE",
      title: "10-Day Attendance Matrix (.XLSX)",
      refNote: "Direct Excel Reference 2 Layout",
      description: "Pivoted attendance workbook with Designated #, Beneficiary Name, and Day 1–10 AM/PM In/Out columns.",
      icon: Clock,
      color: "text-emerald-700 bg-emerald-50",
      action: "Export Excel",
      href: `/api/v1/reports/export?type=ATTENDANCE&programId=${selectedProgramId}`,
    },
    {
      id: "ACCOMPLISHMENT",
      title: "Multi-Barangay Accomplishment Report (.XLSX)",
      refNote: "Direct Excel Reference 3 Layout",
      description: "Workbook containing individual worksheets for all 11 Dingalan barangays, scope of work, and signatories.",
      icon: Building,
      color: "text-blue-700 bg-blue-50",
      action: "Export Excel",
      href: `/api/v1/reports/export?type=ACCOMPLISHMENT&programId=${selectedProgramId}`,
    },
    {
      id: "MATRIX_VIEW",
      title: "Interactive Dynamic Matrix View",
      refNote: "Live Browser Pivot Table",
      description: "Interactive real-time web matrix viewer with instant filtering and cell timestamps.",
      icon: FileSpreadsheet,
      color: "text-indigo-700 bg-indigo-50",
      action: "Open Viewer",
      href: `/attendance/matrix?programId=${selectedProgramId}`,
    },
    {
      id: "REPLACEMENTS",
      title: "Onsite Replacements Audit Report",
      refNote: "Integrity Trail",
      description: "Full mapping of original absent beneficiaries to replacement recipients, reasons, and ID verification logs.",
      icon: UserPlus,
      color: "text-purple-700 bg-purple-50",
      action: "View Replacements",
      href: `/replacements?programId=${selectedProgramId}`,
    },
    {
      id: "RESTRICTIONS",
      title: "365-Day Restriction Compliance Log",
      refNote: "Compliance Registry",
      description: "Comprehensive listing of all active restrictions preventing double-compensation within 365 days.",
      icon: ShieldAlert,
      color: "text-rose-700 bg-rose-50",
      action: "View Restrictions",
      href: `/restrictions`,
    },
    ...(isPesoAdmin
      ? [
          {
            id: "AUDIT",
            title: "Immutable System Audit Log",
            refNote: "Admin Audit Standards",
            description: "Complete chronological event trail of every mutation, QR scan, reprint, and payout in the system.",
            icon: History,
            color: "text-slate-700 bg-slate-100",
            action: "Open Audit Trail",
            href: `/admin/audit`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-gov-blue" />
            <span>TUPAD Report & Documentation Center</span>
          </h1>
          <p className="text-xs text-slate-500">
            Generate pixel-accurate workbooks, attendance matrices, and compliance audits for LGU Dingalan & DOLE
          </p>
        </div>
      </div>

      {/* Program Selector */}
      <div className="gov-card p-4 flex items-center space-x-3">
        <span className="text-xs font-bold text-slate-700">Target Program:</span>
        <select
          value={selectedProgramId}
          onChange={(e) => setSelectedProgramId(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
          disabled={loading || programs.length === 0}
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.programCode} — {p.programName}
            </option>
          ))}
        </select>
      </div>

      {/* Reports Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="gov-card p-6 flex flex-col justify-between space-y-4 gov-card-hover border-t-4 border-t-gov-blue"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${r.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {r.refNote}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{r.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{r.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <a
                  href={r.href}
                  className="w-full py-2 px-3 bg-gov-blue hover:bg-gov-dark text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-gov-goldLight" />
                  <span>{r.action}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
