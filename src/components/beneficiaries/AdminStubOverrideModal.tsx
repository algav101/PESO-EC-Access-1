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
} from "lucide-react";

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
  const isCurrentlyFlagged =
    pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
    pb.stubDistributions?.some((d: any) => d.status === "FLAGGED_REPLACEMENT");

  const [targetStatus, setTargetStatus] = useState<"DISTRIBUTED" | "PENDING" | "FLAGGED_REPLACEMENT">(
    isCurrentlyFlagged ? "FLAGGED_REPLACEMENT" : existingDist ? "DISTRIBUTED" : "PENDING"
  );
  const [method, setMethod] = useState<"MANUAL_ADMIN_OVERRIDE" | "BIRTHDAY_PIN">("MANUAL_ADMIN_OVERRIDE");
  const [reason, setReason] = useState("UNREACHABLE_PHONE_OR_RESIDENCE");
  const [remarks, setRemarks] = useState(existingDist?.remarks || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCurrentlyFlagged) {
      setTargetStatus("FLAGGED_REPLACEMENT");
    } else if (existingDist) {
      setTargetStatus("DISTRIBUTED");
      setRemarks(existingDist.remarks || "");
    } else {
      setTargetStatus("PENDING");
      setRemarks("");
    }
  }, [programBeneficiary]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/programs/${programId}/beneficiaries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programBeneficiaryId: pb.id,
          distributionStatus: targetStatus,
          distributionMethod: method,
          replacementReason: targetStatus === "FLAGGED_REPLACEMENT" ? reason : undefined,
          replacementRemarks: remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update distribution status");

      onUpdated(data.beneficiary);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border-t-4 border-t-gov-gold">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-gov-gold" />
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                PESO Admin Stub & Affirmation Control
              </h3>
              <p className="text-[11px] text-slate-500">
                Manually adjust distribution, reset coordinator mistakes, or flag for replacement
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
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
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

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Current State</span>
            {isCurrentlyFlagged ? (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                Flagged Replacement
              </span>
            ) : existingDist ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                Distributed & Affirmed
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                Pending / Uninformed
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Target Status Options */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase">
              Select Desired Administrative Status
            </label>

            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Distributed */}
              <label
                className={`p-3 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition ${
                  targetStatus === "DISTRIBUTED"
                    ? "border-emerald-600 bg-emerald-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="targetStatus"
                  value="DISTRIBUTED"
                  checked={targetStatus === "DISTRIBUTED"}
                  onChange={() => setTargetStatus("DISTRIBUTED")}
                  className="mt-1 accent-emerald-600"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      ✓ Mark as Distributed & Affirmed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Affirms that the beneficiary received their stub and will attend orientation.
                  </p>
                </div>
              </label>

              {/* Option 2: Pending (Reset) */}
              <label
                className={`p-3 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition ${
                  targetStatus === "PENDING"
                    ? "border-amber-500 bg-amber-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="targetStatus"
                  value="PENDING"
                  checked={targetStatus === "PENDING"}
                  onChange={() => setTargetStatus("PENDING")}
                  className="mt-1 accent-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">
                      ⏳ Reset to Pending (Uninformed / Not Yet Distributed)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clears distribution record if coordinator scanned the wrong person or made a mistake. Allows re-scanning.
                  </p>
                </div>
              </label>

              {/* Option 3: Flag for Replacement */}
              <label
                className={`p-3 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition ${
                  targetStatus === "FLAGGED_REPLACEMENT"
                    ? "border-rose-600 bg-rose-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="targetStatus"
                  value="FLAGGED_REPLACEMENT"
                  checked={targetStatus === "FLAGGED_REPLACEMENT"}
                  onChange={() => setTargetStatus("FLAGGED_REPLACEMENT")}
                  className="mt-1 accent-rose-600"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-1.5">
                    <UserX className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-slate-900">
                      🚩 Flag as Possible Onsite Replacement
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Marks beneficiary slot as candidate for substitute beneficiary in Onsite Replacement module.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Reason selector for Replacement */}
          {targetStatus === "FLAGGED_REPLACEMENT" && (
            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2 animate-in fade-in">
              <label className="block text-[11px] font-bold text-rose-900 uppercase">
                Reason for Replacement Flag
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold border border-rose-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-rose-600"
              >
                {REPLACEMENT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Verification Method selector if Distributed */}
          {targetStatus === "DISTRIBUTED" && (
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2 animate-in fade-in">
              <label className="block text-[11px] font-bold text-emerald-900 uppercase">
                Affirmation Method
              </label>
              <select
                value={method}
                onChange={(e: any) => setMethod(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold border border-emerald-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="MANUAL_ADMIN_OVERRIDE">PESO Admin Manual Affirmation Override</option>
                <option value="BIRTHDAY_PIN">Beneficiary Birthday PIN Verified</option>
              </select>
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">
              Administrative Notes / Audit Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Corrected coordinator scanning mistake, affirmed via phone call"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
            />
          </div>

          {/* Submit Actions */}
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
              <span>{isSaving ? "Saving Override..." : "Save Status Override"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
