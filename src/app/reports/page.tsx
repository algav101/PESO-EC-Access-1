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
  QrCode,
  MapPin,
  Search,
  RefreshCw,
  X,
  Layers,
  Compass,
  Navigation,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, isFieldCoordinator } from "@/lib/permissions";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { useRouter } from "next/navigation";

export default function ReportCenterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isPesoAdmin = isAdminUser(user);

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Quick Assignment Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  useEffect(() => {
    if (isFieldCoordinator(user)) {
      router.replace("/field");
      return;
    }
    fetchPrograms();
  }, [user, router]);

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

  const handleLookup = async (tokenOrNum: string, dayNum: number = 1) => {
    if (!tokenOrNum.trim()) return;
    setLookupLoading(true);
    setLookupError(null);

    try {
      const queryParams = new URLSearchParams();
      if (/^\d+$/.test(tokenOrNum.trim())) {
        queryParams.set("designatedNumber", tokenOrNum.trim());
      } else {
        queryParams.set("qrToken", tokenOrNum.trim());
      }
      if (selectedProgramId) {
        queryParams.set("programId", selectedProgramId);
      }
      queryParams.set("dayNumber", String(dayNum));

      const res = await fetch(`/api/v1/work-assignment/lookup?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setLookupResult(json);
        setSelectedDay(json.workDay.dayNumber);
      } else {
        setLookupError(json.error || "Beneficiary not found.");
        setLookupResult(null);
      }
    } catch (err: any) {
      setLookupError("Error connecting to server: " + err.message);
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleQrScan = (scannedToken: string) => {
    setIsScannerOpen(false);
    setLookupQuery(scannedToken);
    setIsLookupModalOpen(true);
    handleLookup(scannedToken, selectedDay);
  };

  const reportCards = [
    {
      id: "WORK_ASSIGNMENT_SCAN",
      title: "Work Area & Schedule Assignment Scanner",
      refNote: "Live Field Proximity Engine",
      description: "Scan any beneficiary QR code to verify their designated work area, specific daily activity, and address proximity routing.",
      icon: MapPin,
      color: "text-amber-700 bg-amber-50",
      action: "Scan / Lookup Area",
      isCustomAction: true,
      onClick: () => {
        setIsLookupModalOpen(true);
      },
    },
    {
      id: "ACCOMPLISHMENT",
      title: "Multi-Barangay Accomplishment Report (.XLSX)",
      refNote: "Direct Excel Reference 3 Layout",
      description: "Official workbook with worksheets for all 11 Dingalan barangays, enriched with assigned work areas, activities, and QR tokens.",
      icon: Building,
      color: "text-blue-700 bg-blue-50",
      action: "Export Excel",
      href: `/api/v1/reports/export?type=ACCOMPLISHMENT&programId=${selectedProgramId}`,
    },
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
            Generate pixel-accurate workbooks, attendance matrices, work area QR routing, and compliance audits for LGU Dingalan & DOLE
          </p>
        </div>

        {/* Action Button: QR Lookup */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsLookupModalOpen(true)}
            className="px-4 py-2 bg-gov-blue hover:bg-gov-dark text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
          >
            <QrCode className="w-4 h-4 text-gov-goldLight" />
            <span>QR Area Scanner Hub</span>
          </button>

          <a
            href="/my-assignment"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition flex items-center space-x-1"
            title="Open Mobile Beneficiary View"
          >
            <span>Public View</span>
          </a>
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
                {r.isCustomAction ? (
                  <button
                    type="button"
                    onClick={r.onClick}
                    className="w-full py-2 px-3 bg-gov-blue hover:bg-gov-dark text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-gov-goldLight" />
                    <span>{r.action}</span>
                  </button>
                ) : (
                  <a
                    href={r.href}
                    className="w-full py-2 px-3 bg-gov-blue hover:bg-gov-dark text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-gov-goldLight" />
                    <span>{r.action}</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Work Area & Schedule Assignment Modal */}
      {isLookupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 text-slate-200 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Work Area &amp; Schedule Assignment Scanner
                  </h3>
                  <p className="text-xs text-gov-goldLight font-semibold">
                    Proximity &amp; Gender Routing Engine
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLookupModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lookup Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookup(lookupQuery, selectedDay);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Scan QR or enter Designated Slot # (e.g. 1, 15, TUPAD-DGL-...)"
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-gov-goldLight"
              />

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-2 bg-gov-blue hover:bg-gov-light text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <QrCode className="w-4 h-4 text-gov-goldLight" />
                <span>Camera</span>
              </button>

              <button
                type="submit"
                disabled={lookupLoading || !lookupQuery.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Lookup</span>
              </button>
            </form>

            {/* Error message */}
            {lookupError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            {/* Results Display */}
            {lookupResult && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                {/* Beneficiary Header */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gov-gold text-gov-dark flex items-center justify-center font-black text-sm">
                      #{lookupResult.beneficiary.designatedNumber}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{lookupResult.beneficiary.fullName}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {lookupResult.beneficiary.sitio}, Brgy. {lookupResult.beneficiary.barangay}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {lookupResult.beneficiary.sex}
                    </span>
                    {lookupResult.beneficiary.isSenior && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        Senior
                      </span>
                    )}
                  </div>
                </div>

                {/* Day selector pills */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-gov-goldLight">Select Day Schedule:</span>
                    <span>Viewing Day {lookupResult.workDay.dayNumber} of {lookupResult.program.requiredWorkDays}</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {Array.from({ length: lookupResult.program.requiredWorkDays || 10 }, (_, i) => i + 1).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setSelectedDay(d);
                          handleLookup(lookupQuery, d);
                        }}
                        className={`py-1 rounded text-[11px] font-bold transition text-center ${
                          selectedDay === d
                            ? "bg-gov-gold text-gov-dark font-black"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assigned Work Area Box */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Designated Work Area</span>
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {lookupResult.assignment.allocationMethod}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white">{lookupResult.assignment.area}</p>

                  <div className="pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                      Specific Activity:
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">{lookupResult.assignment.specificActivity}</p>
                  </div>
                </div>

                {/* Rationale */}
                <div className="p-3 bg-gov-blue/20 rounded-xl border border-blue-500/30 text-[11px] text-blue-200 flex items-start space-x-2">
                  <Compass className="w-4 h-4 text-gov-goldLight flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gov-goldLight">Allocation Rationale: </span>
                    <span>{lookupResult.assignment.matchingRationale}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLookupModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {isScannerOpen && (
        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleQrScan}
          title="Scan Beneficiary QR Code for Work Area Lookup"
        />
      )}
    </div>
  );
}
