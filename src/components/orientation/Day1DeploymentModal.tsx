"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  HeartHandshake,
  Info,
} from "lucide-react";
import { ETupadCard } from "@/components/stubs/ETupadCard";

export interface Day1DeploymentData {
  success: boolean;
  isAuthorizedForDeployment: boolean;
  validationStatus: "DOLE_ORIENTED_AND_VALIDATED" | "ONSITE_REPLACEMENT_VALIDATED" | "AWAITING_ORIENTATION_VERIFICATION" | string;
  beneficiary: {
    id: string;
    beneficiaryId: string;
    designatedNumber: string | number;
    fullName: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    sitio: string;
    barangay: string;
    sex: string;
    birthday?: string;
    age?: number;
    isSenior?: boolean;
    isPwd?: boolean;
    tableNumber?: string;
    originalBeneficiary?: string | null;
    qrToken: string;
  };
  program: {
    id: string;
    programCode: string;
    programName: string;
    municipality: string;
    province: string;
  };
  orientationRecord: {
    status: string;
    scannedAt: string;
    scannedBy: string;
  } | null;
  day1Deployment: {
    dayNumber: number;
    workDate: string;
    workingHours: string;
    specificActivities: string;
    assignedArea: string;
    purokPriorityScore: number;
    purokPriorityRank: "DIRECT_NEAREST_PUROK" | "CONTIGUOUS_SECTOR" | string;
    teamQuota: {
      totalAssigned: number;
      maleQuota: number;
      femaleQuota: number;
      scPwdQuota: number;
    };
    reportingTime: string;
    safetyGuidelines: string;
  };
}

interface Day1DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Day1DeploymentData | null;
  onScanAnother?: () => void;
}

export function Day1DeploymentModal({
  isOpen,
  onClose,
  data,
  onScanAnother,
}: Day1DeploymentModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const { beneficiary, program, orientationRecord, day1Deployment, isAuthorizedForDeployment, validationStatus } = data;

  const isDirectPurok = day1Deployment.purokPriorityScore >= 60;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-gov-navy via-gov-blue to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Calendar className="w-5 h-5 text-gov-goldLight" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gov-gold text-slate-950">
                  Day 1 Itinerary
                </span>
                <span className="text-xs text-blue-200 font-mono">
                  {program.programCode}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center space-x-2">
                <span>Beneficiary Activity Deployment</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center space-x-1.5 border border-white/15"
              title="Print Day 1 Slip & e-TUPAD Card"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 print:p-0" ref={printRef}>
          {/* Validation Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3 shadow-sm ${
              isAuthorizedForDeployment
                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                : "bg-amber-50 border-amber-300 text-amber-950"
            }`}
          >
            {isAuthorizedForDeployment ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-wide uppercase">
                  {validationStatus === "DOLE_ORIENTED_AND_VALIDATED"
                    ? "✓ DOLE VALIDATED & ORIENTED"
                    : validationStatus === "ONSITE_REPLACEMENT_VALIDATED"
                    ? "✓ ONSITE REPLACEMENT VALIDATED"
                    : "⚠️ AWAITING DOLE ORIENTATION RECORD"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 border">
                  Step 2 Verified
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {isAuthorizedForDeployment
                  ? `Orientation verified present by ${orientationRecord?.scannedBy || "DOLE Aurora / PESO Dingalan"} on ${
                      orientationRecord?.scannedAt
                        ? new Date(orientationRecord.scannedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Field Log"
                    }. Ready for Day 1 site deployment.`
                  : "Beneficiary has affirmed stub but orientation attendance has not been registered yet. Please proceed to the orientation scanning table."}
              </p>
            </div>
          </div>

          {/* Section: Format 2 e-TUPAD Card Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gov-navy" />
                <span>Assigned Format 2 ID (e-TUPAD CARD)</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-gov-blue">
                Slot #{beneficiary.designatedNumber} • {beneficiary.tableNumber || "Table 1"}
              </span>
            </div>

            <div className="bg-slate-900/5 p-3 rounded-2xl border border-slate-200 flex justify-center">
              <div className="w-full max-w-[420px]">
                <ETupadCard
                  designatedNumber={beneficiary.designatedNumber}
                  token={beneficiary.qrToken}
                  tableNumber={beneficiary.tableNumber}
                  beneficiaryName={beneficiary.fullName}
                  barangay={beneficiary.barangay}
                  programCode={program.programCode}
                />
              </div>
            </div>
          </div>

          {/* Beneficiary Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
              <span className="font-extrabold text-slate-900 block truncate text-sm">
                {beneficiary.fullName}
              </span>
              {beneficiary.originalBeneficiary && (
                <span className="text-[9px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                  Rep. for {beneficiary.originalBeneficiary}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Barangay & Sitio</span>
              <span className="font-bold text-slate-800 block">
                {beneficiary.barangay}
              </span>
              <span className="text-[11px] text-gov-blue font-semibold">
                Sitio {beneficiary.sitio}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Gender & Age</span>
              <span className="font-bold text-slate-800 block">
                {beneficiary.sex} • {beneficiary.age || "N/A"} yrs old
              </span>
              {(beneficiary.isSenior || beneficiary.isPwd) && (
                <span className="text-[9px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                  {beneficiary.isSenior ? "Senior Citizen" : "PWD"}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Table</span>
              <span className="font-black text-gov-navy block text-sm">
                {beneficiary.tableNumber || "Table 1"}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Dingalan, Aurora
              </span>
            </div>
          </div>

          {/* Day 1 Deployment Schedule Card */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-3xl shadow-xl space-y-4 border border-blue-800/50">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gov-gold text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                  D1
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white">
                    DAY 1 SCHEDULE & ASSIGNMENT
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Target Deployment Date: {day1Deployment.workDate}
                  </p>
                </div>
              </div>

              {/* Nearest Purok Priority Badge */}
              <div
                className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center space-x-1.5 shadow-sm ${
                  isDirectPurok
                    ? "bg-emerald-500 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>
                  {isDirectPurok
                    ? "Nearest Purok Priority Match"
                    : "Sector Deployment Match"}
                </span>
              </div>
            </div>

            {/* Location & Activity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-300 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-gov-goldLight" />
                  <span>Assigned Work Location / Purok Area</span>
                </span>
                <p className="text-sm font-bold text-white leading-snug">
                  {day1Deployment.assignedArea}
                </p>
                <div className="pt-1 flex items-center space-x-2 text-[10px] text-blue-200">
                  <span className="font-semibold">Beneficiary Sitio:</span>
                  <span className="font-mono bg-white/15 px-2 py-0.5 rounded-md text-gov-goldLight">
                    {beneficiary.sitio}
                  </span>
                  <span>(Score: {day1Deployment.purokPriorityScore}/100)</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-300 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-gov-goldLight" />
                  <span>Assembly Time & Hours</span>
                </span>
                <p className="text-sm font-bold text-gov-goldLight leading-snug">
                  {day1Deployment.reportingTime}
                </p>
                <p className="text-[11px] text-blue-200">
                  {day1Deployment.workingHours}
                </p>
              </div>
            </div>

            {/* Specific Activity Description */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-blue-300 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5 text-gov-goldLight" />
                <span>Day 1 Specific Work Program Activity</span>
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed">
                {day1Deployment.specificActivities}
              </p>
            </div>

            {/* Quota & Gender Balance Consideration */}
            <div className="grid grid-cols-4 gap-2 bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-300 block">Total Quota</span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {day1Deployment.teamQuota.totalAssigned}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-300 block">Male Slot</span>
                <span className="text-xs sm:text-sm font-black text-blue-200">
                  {day1Deployment.teamQuota.maleQuota}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-300 block">Female Slot</span>
                <span className="text-xs sm:text-sm font-black text-pink-200">
                  {day1Deployment.teamQuota.femaleQuota}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-300 block">SC / PWD</span>
                <span className="text-xs sm:text-sm font-black text-gov-goldLight">
                  {day1Deployment.teamQuota.scPwdQuota}
                </span>
              </div>
            </div>
          </div>

          {/* DOLE Safety Directives & Reminders */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-gov-navy" />
              <span>DOLE TUPAD Field Directives & PPE Protocol</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {day1Deployment.safetyGuidelines}
            </p>
            <div className="pt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
              <span className="bg-slate-200/80 px-2 py-0.5 rounded font-mono">1. Wear TUPAD Long Sleeve</span>
              <span className="bg-slate-200/80 px-2 py-0.5 rounded font-mono">2. Wear Safety Cap & Gloves</span>
              <span className="bg-slate-200/80 px-2 py-0.5 rounded font-mono">3. Present e-TUPAD Card</span>
              <span className="bg-slate-200/80 px-2 py-0.5 rounded font-mono">4. Sign DTR Morning/Afternoon</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-gov-blue" />
            <span>Format 2 e-TUPAD Card • Validated for Municipality of Dingalan</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {onScanAnother && (
              <button
                onClick={() => {
                  onClose();
                  onScanAnother();
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <span>Scan Another QR</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
