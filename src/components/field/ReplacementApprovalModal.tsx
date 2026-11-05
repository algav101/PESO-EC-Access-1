"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Users,
  IdCard,
  RefreshCw,
  X,
} from "lucide-react";

export interface PendingReplacementAssessmentItem {
  id: string;
  reason: string;
  initiatedAt?: string;
  initiatedBy?: string;
  originalBeneficiary: {
    designatedNumber: string | number;
    fullName: string;
    birthday?: string | null;
    barangay?: string | null;
    sitio?: string | null;
  };
  candidateBeneficiary: {
    fullName: string;
    birthday?: string | null;
    sex?: string | null;
    barangay?: string | null;
    sitio?: string | null;
    contactNumber?: string | null;
    idType?: string | null;
    idNumber?: string | null;
    dependentFullName?: string | null;
    dependentRelationship?: string | null;
    dependentBirthday?: string | null;
    dependentAge?: number | null;
    documents?: Array<{
      id?: string;
      documentType: string;
      fileKey: string;
      fileName: string;
    }>;
  } | null;
}

interface Props {
  isOpen: boolean;
  item: PendingReplacementAssessmentItem | null;
  onClose: () => void;
  onProcessed: (status: "APPROVED" | "REJECTED", message: string) => void;
}

const DOC_LABELS: Record<string, string> = {
  ID_FRONT: "Replacement Applicant ID — FRONT",
  ID_BACK: "Replacement Applicant ID — BACK",
  DEPENDENT_ID_FRONT: "Dependent ID — FRONT",
  DEPENDENT_ID_BACK: "Dependent ID — BACK",
};

export function ReplacementApprovalModal({
  isOpen,
  item,
  onClose,
  onProcessed,
}: Props) {
  const [processingStatus, setProcessingStatus] = useState<
    "APPROVED" | "REJECTED" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    label: string;
  } | null>(null);

  if (!isOpen || !item) return null;

  const orig = item.originalBeneficiary;
  const cand = item.candidateBeneficiary;
  const docs = cand?.documents || [];
  const isOrigDeclaredAsDependent =
    Boolean(cand?.dependentFullName) &&
    cand!.dependentFullName!.trim().toUpperCase() ===
      orig.fullName.trim().toUpperCase();

  const handleDecision = async (status: "APPROVED" | "REJECTED") => {
    setProcessingStatus(status);
    setError(null);
    try {
      const res = await fetch("/api/v1/replacements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replacementId: item.id,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${status.toLowerCase()} replacement.`);
      }
      onProcessed(
        status,
        data.message ||
          (status === "APPROVED"
            ? `Approved! Remarks marked as "Replaced - ${orig.fullName}".`
            : "Replacement request rejected.")
      );
      onClose();
    } catch (err: any) {
      setError(err.message || "Error processing replacement decision.");
    } finally {
      setProcessingStatus(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-gov-blue via-blue-800 to-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-gov-goldLight" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
                  ADMIN & PESO PERSONNEL ASSESSMENT • SLOT #{orig.designatedNumber}
                </span>
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  Assess & Approve Beneficiary Replacement Request
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(processingStatus)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Comparison Cards: Original vs Replacement Candidate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Original Beneficiary */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                  Original Scanned Beneficiary (Slot #{orig.designatedNumber})
                </span>
                <div className="text-sm font-black text-slate-900">
                  {orig.fullName}
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>
                    <strong>Birthday:</strong> {orig.birthday || "N/A"} (Consent
                    PIN Verified ✓)
                  </div>
                  <div>
                    <strong>Barangay:</strong> {orig.barangay || "N/A"}{" "}
                    {orig.sitio ? `• ${orig.sitio}` : ""}
                  </div>
                </div>
              </div>

              {/* Candidate Replacement */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  Proposed Replacement Applicant (Qualified ✓)
                </span>
                <div className="text-sm font-black text-slate-900">
                  {cand?.fullName || "N/A"}
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>
                    <strong>Birthday / Sex:</strong> {cand?.birthday || "N/A"} •{" "}
                    {cand?.sex || "N/A"}
                  </div>
                  <div>
                    <strong>Barangay / Contact:</strong>{" "}
                    {cand?.barangay || "N/A"} • {cand?.contactNumber || "N/A"}
                  </div>
                  <div>
                    <strong>Valid ID:</strong> {cand?.idType || "ID"}{" "}
                    {cand?.idNumber ? `(${cand.idNumber})` : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Dependent & Reason Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-gov-blue" />
                    <span>Replacement&apos;s Declared Dependent</span>
                  </span>
                  {isOrigDeclaredAsDependent && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-gov-blue border border-blue-200">
                      Original Beneficiary as Dependent
                    </span>
                  )}
                </div>
                <div className="font-black text-slate-900 text-xs">
                  {cand?.dependentFullName || "N/A"}
                </div>
                <div className="text-[11px] text-slate-600">
                  Relationship:{" "}
                  <strong>{cand?.dependentRelationship || "N/A"}</strong>
                  {cand?.dependentAge != null
                    ? ` • Age: ${cand.dependentAge}`
                    : ""}
                  {cand?.dependentBirthday
                    ? ` • Born: ${cand.dependentBirthday}`
                    : ""}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500 block">
                  Reason & Consent Details
                </span>
                <div className="text-[11px] font-bold text-slate-800">
                  {item.reason}
                </div>
                <div className="text-[10px] text-slate-500">
                  Submitted by {item.initiatedBy || "Field Coordinator"}{" "}
                  {item.initiatedAt
                    ? `on ${new Date(item.initiatedAt).toLocaleString()}`
                    : ""}
                </div>
              </div>
            </div>

            {/* Remarks Preview Banner */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-bold uppercase text-[10px] text-amber-700 block">
                  Official Remarks to be Recorded Upon Approval:
                </span>
                <strong className="font-mono text-xs font-black text-slate-900">
                  Replaced - {orig.fullName}
                </strong>
              </div>
              <UserCheck className="w-5 h-5 text-amber-700 shrink-0" />
            </div>

            {/* 4 Captured ID Photos */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5">
                <IdCard className="w-4 h-4 text-gov-blue" />
                <h4 className="font-black text-slate-900 uppercase tracking-tight">
                  Captured Front & Back Valid IDs ({docs.length}/4)
                </h4>
              </div>

              {docs.length === 0 ? (
                <div className="p-4 text-center text-slate-400 border border-dashed rounded-xl">
                  No attached ID photos found for this request.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      "ID_FRONT",
                      "ID_BACK",
                      "DEPENDENT_ID_FRONT",
                      "DEPENDENT_ID_BACK",
                    ] as const
                  ).map((docType) => {
                    const doc = docs.find((d) => d.documentType === docType);
                    const label = DOC_LABELS[docType] || docType;
                    const isDataImage = doc?.fileKey?.startsWith("data:image/");
                    return (
                      <div
                        key={docType}
                        className="border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5"
                      >
                        <span className="text-[10px] font-black text-slate-700 block truncate">
                          {label}
                        </span>
                        {doc && isDataImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedImage({ url: doc.fileKey, label })
                            }
                            className="block w-full h-24 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 hover:opacity-90 transition"
                            title="Click to enlarge ID photo"
                          >
                            <img
                              src={doc.fileKey}
                              alt={label}
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ) : (
                          <div className="h-24 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                            {doc ? doc.fileName : "Missing"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(processingStatus)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl bg-white"
            >
              Close
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleDecision("REJECTED")}
                disabled={Boolean(processingStatus)}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black text-xs rounded-xl flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {processingStatus === "REJECTED" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Reject Request</span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision("APPROVED")}
                disabled={Boolean(processingStatus)}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {processingStatus === "APPROVED" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                )}
                <span>Approve & Replace Beneficiary</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for Enlarged ID Inspection */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="text-white text-xs font-black mb-2">
            {zoomedImage.label} (Click anywhere to close)
          </div>
          <img
            src={zoomedImage.url}
            alt={zoomedImage.label}
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl border border-white/20"
          />
        </div>
      )}
    </>
  );
}

