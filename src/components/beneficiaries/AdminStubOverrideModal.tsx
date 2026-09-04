"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserX,
  AlertTriangle,
  Save,
  RotateCcw,
  Sparkles,
  MapPin,
  Calendar,
  CheckSquare,
  Square,
  Trash2,
  Layers,
} from "lucide-react";
import { formatTime } from "@/lib/utils";

interface AdminStubOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  programBeneficiary: any;
  onUpdated: (updatedPb: any) => void;
}

const REPLACEMENT_REASONS = [
  { value: "UNREACHABLE_PHONE_OR_RESIDENCE", label: "Unreachable / Contact Number Inactive / Unlocated" },
  { value: "REFUSED_BENEFICIARY", label: "Voluntarily Refused / Declined Participation" },
  { value: "RELOCATED_OR_MOVED", label: "Relocated / Moved Outside Dingalan" },
  { value: "DUPLICATE_OR_INELIGIBLE", label: "Disqualified / Restricted (Duplicate / Appointive / 320-Day Rule)" },
  { value: "HOSPITALIZED_OR_MEDICAL", label: "Medical Incapacity / Hospitalized / Bedridden" },
  { value: "DECEASED", label: "Deceased" },
  { value: "OTHER", label: "Other Administrative Reason" },
];

export function AdminStubOverrideModal({
  isOpen,
  onClose,
  programId,
  programBeneficiary,
  onUpdated,
}: AdminStubOverrideModalProps) {
  if (!isOpen || !programBeneficiary) return null;

  const pb = programBeneficiary;
  const existingDist = pb.stubDistributions?.find((d: any) => d.status === "DISTRIBUTED");
  const flaggedDist = pb.stubDistributions?.find((d: any) => d.status === "FLAGGED_REPLACEMENT");
  const isCurrentlyFlagged =
    pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
    Boolean(flaggedDist);

  const hasOrientation = Boolean(
    pb.orientationAttendance &&
    pb.orientationAttendance.some((o: any) => o.status === "PRESENT")
  );

  // Active Tab: "WORKFLOW" (Distribution & Orientation) vs "ATTENDANCE" (10-Day Attendance Reset)
  const [activeTab, setActiveTab] = useState<"WORKFLOW" | "ATTENDANCE">("WORKFLOW");

  // Step 1: Distribution & Affirmation
  const [distributionStatus, setDistributionStatus] = useState<"DISTRIBUTED" | "PENDING" | "FLAGGED_REPLACEMENT">(
    isCurrentlyFlagged ? "FLAGGED_REPLACEMENT" : existingDist ? "DISTRIBUTED" : "PENDING"
  );
  const [distributionMethod, setDistributionMethod] = useState<"MANUAL_ADMIN_OVERRIDE" | "BIRTHDAY_PIN">("MANUAL_ADMIN_OVERRIDE");
  const [replacementReason, setReplacementReason] = useState("UNREACHABLE_PHONE_OR_RESIDENCE");
  const [remarks, setRemarks] = useState(
    isCurrentlyFlagged
      ? (flaggedDist?.remarks || "")
      : (existingDist?.remarks || "")
  );

  // Step 2: Orientation Verification
  const [orientationStatus, setOrientationStatus] = useState<"PRESENT" | "PENDING" | "ABSENT">(
    hasOrientation ? "PRESENT" : "PENDING"
  );

  // Step 3: Daily Attendance
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [dayAttendanceSlotAmIn, setDayAttendanceSlotAmIn] = useState(false);
  const [dayAttendanceSlotAmOut, setDayAttendanceSlotAmOut] = useState(false);
  const [dayAttendanceSlotPmIn, setDayAttendanceSlotPmIn] = useState(false);
  const [dayAttendanceSlotPmOut, setDayAttendanceSlotPmOut] = useState(false);
  const [attendanceDayStatus, setAttendanceDayStatus] = useState("PRESENT");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync attendance state when day selector changes
  useEffect(() => {
    const matchingRecord = pb.attendanceRecords?.find((r: any) => {
      const dNum =
        r.workDay?.dayNumber ||
        (typeof r.attendanceDate === "string"
          ? parseInt(r.attendanceDate.split("-")[2] || "1", 10)
          : r.attendanceDate instanceof Date
          ? r.attendanceDate.getDate()
          : 1);
      return dNum === selectedDayNumber;
    });

    if (matchingRecord) {
      setDayAttendanceSlotAmIn(Boolean(matchingRecord.morningTimeIn));
      setDayAttendanceSlotAmOut(Boolean(matchingRecord.morningTimeOut));
      setDayAttendanceSlotPmIn(Boolean(matchingRecord.afternoonTimeIn));
      setDayAttendanceSlotPmOut(Boolean(matchingRecord.afternoonTimeOut));
      setAttendanceDayStatus(matchingRecord.status || "PRESENT");
    } else {
      setDayAttendanceSlotAmIn(false);
      setDayAttendanceSlotAmOut(false);
      setDayAttendanceSlotPmIn(false);
      setDayAttendanceSlotPmOut(false);
      setAttendanceDayStatus("PRESENT");
    }
  }, [selectedDayNumber, pb]);

  useEffect(() => {
    if (isCurrentlyFlagged) {
      setDistributionStatus("FLAGGED_REPLACEMENT");
      setRemarks(flaggedDist?.remarks || "");
    } else if (existingDist) {
      setDistributionStatus("DISTRIBUTED");
      setRemarks(existingDist.remarks || "");
    } else {
      setDistributionStatus("PENDING");
      setRemarks("");
    }
    setOrientationStatus(hasOrientation ? "PRESENT" : "PENDING");
  }, [programBeneficiary]);

  // Handle Workflow Save (Distribution & Orientation)
  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const progId = programId || pb.programId;
      const res = await fetch(`/api/v1/programs/${progId}/beneficiaries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programBeneficiaryId: pb.id,
          distributionStatus,
          distributionMethod,
          replacementReason: distributionStatus === "FLAGGED_REPLACEMENT" ? replacementReason : undefined,
          replacementRemarks: remarks,
          orientationStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update workflow status");

      setSuccessMsg("✓ Status updated successfully!");
      onUpdated(data.beneficiary);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset Single Day Attendance
  const handleResetDayAttendance = async () => {
    if (!confirm(`Are you sure you want to reset Day ${selectedDayNumber} attendance for #${pb.designatedNumber}? This will clear accidental scans and allow re-scanning.`)) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/attendance/records`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programBeneficiaryId: pb.id,
          workDayNumber: selectedDayNumber,
          action: "RESET_DAY",
          remarks: `PESO Admin reset Day ${selectedDayNumber} to clear accidental scan`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset day attendance");

      setSuccessMsg(data.message);

      // Update local state
      const updatedAttendance = (pb.attendanceRecords || []).filter((r: any) => {
        const dNum = r.workDay?.dayNumber;
        return dNum !== selectedDayNumber;
      });

      const updatedPb = { ...pb, attendanceRecords: updatedAttendance };
      onUpdated(updatedPb);

      setDayAttendanceSlotAmIn(false);
      setDayAttendanceSlotAmOut(false);
      setDayAttendanceSlotPmIn(false);
      setDayAttendanceSlotPmOut(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset ALL 10 Days Attendance
  const handleResetAllAttendance = async () => {
    if (!confirm(`CAUTION: Reset ALL 10 days of attendance for #${pb.designatedNumber} (${pb.beneficiary?.fullName})? This will restart all attendance tracking.`)) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/attendance/records`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programBeneficiaryId: pb.id,
          action: "RESET_ALL",
          remarks: "PESO Admin reset full attendance track",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset attendance");

      setSuccessMsg(data.message);
      const updatedPb = { ...pb, attendanceRecords: [] };
      onUpdated(updatedPb);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save Manual Slots for Selected Day
  const handleSaveDaySlots = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/attendance/records`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programBeneficiaryId: pb.id,
          workDayNumber: selectedDayNumber,
          action: "UPDATE",
          morningTimeIn: dayAttendanceSlotAmIn ? new Date() : null,
          morningTimeOut: dayAttendanceSlotAmOut ? new Date() : null,
          afternoonTimeIn: dayAttendanceSlotPmIn ? new Date() : null,
          afternoonTimeOut: dayAttendanceSlotPmOut ? new Date() : null,
          status: attendanceDayStatus,
          remarks: `PESO Admin manual update for Day ${selectedDayNumber}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update attendance slots");

      setSuccessMsg(`✓ Day ${selectedDayNumber} attendance updated!`);

      // Update in memory
      const existing = (pb.attendanceRecords || []).filter((r: any) => r.workDay?.dayNumber !== selectedDayNumber);
      const updatedPb = { ...pb, attendanceRecords: [...existing, data.record] };
      onUpdated(updatedPb);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full my-6 p-6 space-y-5 shadow-2xl border-t-4 border-t-gov-gold max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-gov-gold" />
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                PESO Admin Workflow & Attendance Override
              </h3>
              <p className="text-[11px] text-slate-500">
                Correct accidental field scans, restart status, or manually adjust attendance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Beneficiary Badge */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-bold text-gov-blue text-sm">#{pb.designatedNumber}</span>
              <strong className="text-slate-900 text-sm font-bold">{pb.beneficiary?.fullName}</strong>
            </div>
            <div className="flex items-center space-x-2 text-slate-500 text-[11px] mt-0.5">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Barangay {pb.beneficiary?.barangay}</span>
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">{pb.beneficiary?.sitio || "Centro"}</span>
              <span>•</span>
              <span className="font-bold">{pb.tableNumber || "Table 1"}</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Live Status</span>
            <div className="flex items-center space-x-1 justify-end">
              {hasOrientation ? (
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">
                  Oriented
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">
                  Unoriented
                </span>
              )}
              <span className="px-1.5 py-0.5 bg-blue-50 text-gov-blue text-[10px] font-bold rounded border border-blue-200 font-mono">
                {pb.attendanceRecords?.length || 0}/10 Days
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("WORKFLOW")}
            className={`pb-2.5 px-4 flex items-center space-x-2 border-b-2 transition ${
              activeTab === "WORKFLOW"
                ? "border-gov-blue text-gov-blue"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Stub & Orientation Workflow</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ATTENDANCE")}
            className={`pb-2.5 px-4 flex items-center space-x-2 border-b-2 transition ${
              activeTab === "ATTENDANCE"
                ? "border-gov-blue text-gov-blue"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Daily Attendance (10-Day Reset)</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: WORKFLOW CONTROLS (STUB & ORIENTATION) */}
        {activeTab === "WORKFLOW" && (
          <form onSubmit={handleSaveWorkflow} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Step 1: Stub Distribution & Affirmation */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-gov-blue text-white text-[10px] flex items-center justify-center font-mono">1</span>
                  <span>Step 1: Stub Distribution & Affirmation</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Accidental Scan Reset</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDistributionStatus("DISTRIBUTED")}
                  className={`p-2.5 rounded-xl text-left border-2 transition ${
                    distributionStatus === "DISTRIBUTED"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Distributed</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Affirmed & informed</p>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionStatus("PENDING")}
                  className={`p-2.5 rounded-xl text-left border-2 transition ${
                    distributionStatus === "PENDING"
                      ? "border-amber-500 bg-amber-50/70 text-amber-900"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>⏳ Reset (Pending)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Undo accidental scan</p>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionStatus("FLAGGED_REPLACEMENT")}
                  className={`p-2.5 rounded-xl text-left border-2 transition ${
                    distributionStatus === "FLAGGED_REPLACEMENT"
                      ? "border-rose-600 bg-rose-50/70 text-rose-900"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 text-xs font-bold">
                    <UserX className="w-3.5 h-3.5 text-rose-600" />
                    <span>🚩 Flag Replacement</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Onsite substitute</p>
                </button>
              </div>

              {distributionStatus === "FLAGGED_REPLACEMENT" && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-rose-900 uppercase mb-1">
                      Replacement Reason:
                    </label>
                    <select
                      value={replacementReason}
                      onChange={(e) => setReplacementReason(e.target.value)}
                      className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-rose-300 rounded-lg text-slate-800"
                    >
                      {REPLACEMENT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  {flaggedDist?.remarks && (
                    <div className="text-[11px] text-rose-800 bg-white/90 p-2 rounded-lg border border-rose-200">
                      <strong className="block text-[10px] font-bold uppercase text-rose-600 mb-0.5">Recorded Flag Remarks:</strong>
                      <span>{flaggedDist.remarks}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Orientation Attendance Verification */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-gov-blue text-white text-[10px] flex items-center justify-center font-mono">2</span>
                  <span>Step 2: Orientation Attendance Verification</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Restart Orientation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientationStatus("PRESENT")}
                  className={`p-2.5 rounded-xl text-left border-2 transition ${
                    orientationStatus === "PRESENT"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Present (Oriented)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Verified attendance</p>
                </button>

                <button
                  type="button"
                  onClick={() => setOrientationStatus("PENDING")}
                  className={`p-2.5 rounded-xl text-left border-2 transition ${
                    orientationStatus === "PENDING"
                      ? "border-amber-500 bg-amber-50/70 text-amber-900"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 text-xs font-bold">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>⏳ Reset (Restart)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Undo accidental scan</p>
                </button>

                <button
                  type="button"
                  onClick={() => setOrientationStatus("ABSENT")}
                  className={`p-2.5 rounded-xl text-left border-2 transition ${
                    orientationStatus === "ABSENT"
                      ? "border-rose-600 bg-rose-50/70 text-rose-900"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-1 text-xs font-bold">
                    <UserX className="w-3.5 h-3.5 text-rose-600" />
                    <span>✕ Absent</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Did not attend</p>
                </button>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Administrative Notes / Audit Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Cleared accidental scan, verified attendance manually"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-gov-blue hover:bg-gov-light text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-gov-goldLight" />
                <span>{isSaving ? "Saving..." : "Save Workflow Status"}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: DAILY ATTENDANCE & ACCIDENTAL SCAN RESET */}
        {activeTab === "ATTENDANCE" && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Work Day Selector */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <label className="block text-[11px] font-black text-gov-blue uppercase tracking-wider">
                Select 10-Day Work Program Day:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => {
                  const hasRecord = pb.attendanceRecords?.some((r: any) => {
                    const dNum = r.workDay?.dayNumber;
                    return dNum === d;
                  });

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDayNumber(d)}
                      className={`py-2 text-xs font-bold rounded-lg border transition text-center ${
                        selectedDayNumber === d
                          ? "bg-gov-blue text-white border-gov-blue shadow"
                          : hasRecord
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span>Day {d}</span>
                      {hasRecord && <span className="block text-[9px] text-emerald-600 font-mono">Logged</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Slots Management */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-black text-slate-800 uppercase">
                  Day {selectedDayNumber} Time Slots (Accidental Scan Correction)
                </span>
                <span className="text-[10px] font-mono font-bold text-gov-blue bg-blue-100 px-2 py-0.5 rounded">
                  Status: {attendanceDayStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* AM IN */}
                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-gov-blue">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">AM IN (Morning In)</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dayAttendanceSlotAmIn ? "Logged" : "Not scanned"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dayAttendanceSlotAmIn}
                    onChange={(e) => setDayAttendanceSlotAmIn(e.target.checked)}
                    className="w-4 h-4 accent-gov-blue rounded"
                  />
                </label>

                {/* AM OUT */}
                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-gov-blue">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">AM OUT (Lunch Out)</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dayAttendanceSlotAmOut ? "Logged" : "Not scanned"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dayAttendanceSlotAmOut}
                    onChange={(e) => setDayAttendanceSlotAmOut(e.target.checked)}
                    className="w-4 h-4 accent-gov-blue rounded"
                  />
                </label>

                {/* PM IN */}
                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-gov-blue">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">PM IN (Afternoon In)</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dayAttendanceSlotPmIn ? "Logged" : "Not scanned"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dayAttendanceSlotPmIn}
                    onChange={(e) => setDayAttendanceSlotPmIn(e.target.checked)}
                    className="w-4 h-4 accent-gov-blue rounded"
                  />
                </label>

                {/* PM OUT */}
                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-gov-blue">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">PM OUT (Day End Out)</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dayAttendanceSlotPmOut ? "Logged" : "Not scanned"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dayAttendanceSlotPmOut}
                    onChange={(e) => setDayAttendanceSlotPmOut(e.target.checked)}
                    className="w-4 h-4 accent-gov-blue rounded"
                  />
                </label>
              </div>

              {/* Day Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={handleResetDayAttendance}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                  title="Clear Day attendance to allow restarting/re-scanning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Day {selectedDayNumber} Attendance</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDaySlots}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-gov-goldLight" />
                  <span>Save Day {selectedDayNumber} Slots</span>
                </button>
              </div>
            </div>

            {/* Global 10-Day Reset */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Restart full 10-day attendance cycle for this beneficiary:</span>
              </div>
              <button
                type="button"
                onClick={handleResetAllAttendance}
                disabled={isSaving}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow transition whitespace-nowrap"
              >
                Reset All 10 Days
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
