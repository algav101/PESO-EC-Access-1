"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  X,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  MapPin,
  Sparkles,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { ImportPreviewResult, ParsedBeneficiaryRow } from "@/lib/excel-importer";

interface MasterlistUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: any[];
  defaultProgramId?: string;
  onSuccess: () => void;
}

const DEFAULT_EXEMPTION_REASONS = [
  "PESO Admin Authorized Exemption for Final Masterlist Implementation",
  "Mayor / LGU Special Directive for Community Employment",
  "Emergency Calamity & Disaster Recovery Exemption",
  "Designated Barangay Priority Community Laborer",
];

export function MasterlistUploadModal({
  isOpen,
  onClose,
  programs,
  defaultProgramId,
  onSuccess,
}: MasterlistUploadModalProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    defaultProgramId || (programs.length > 0 ? programs[0].id : "AUTO")
  );
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "VALID" | "EXEMPTED" | "WARNINGS">("ALL");

  // Exemption Modal State
  const [isExemptionDialogOpen, setIsExemptionDialogOpen] = useState(false);
  const [targetExemptionRow, setTargetExemptionRow] = useState<ParsedBeneficiaryRow | "ALL" | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(DEFAULT_EXEMPTION_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState<string>("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setError(null);
    }
  };

  const handlePreviewUpload = async () => {
    if (!file) {
      setError("Please select a CSV or Excel (.xlsx / .csv) file.");
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("programId", selectedProgramId);

      const res = await fetch("/api/v1/beneficiaries/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse masterlist file");

      setPreview(data.preview);
    } catch (err: any) {
      setError(err.message || "Failed to preview file");
    } finally {
      setParsing(false);
    }
  };

  const recalculatePreviewCounts = (rows: ParsedBeneficiaryRow[]): ImportPreviewResult => {
    const validCount = rows.filter(
      (r) => r.status === "VALID" || r.status === "EXEMPTED" || Boolean(r.isExempted)
    ).length;
    const restrictedCount = rows.filter((r) => r.status === "RESTRICTED" && !r.isExempted).length;
    const duplicateCount = rows.filter((r) => r.status === "DUPLICATE").length;
    const invalidCount = rows.filter(
      (r) =>
        r.status === "MISSING_REQUIRED_FIELD" ||
        r.status === "INVALID_BIRTHDAY" ||
        r.status === "DUPLICATE_DESIGNATED_NUMBER"
    ).length;

    return {
      fileName: preview?.fileName || "masterlist.csv",
      totalRows: rows.length,
      validCount,
      restrictedCount,
      duplicateCount,
      invalidCount,
      rows,
      barangaySummary: preview?.barangaySummary || {},
    };
  };

  const openExemptionDialog = (target: ParsedBeneficiaryRow | "ALL") => {
    setTargetExemptionRow(target);
    setSelectedReason(DEFAULT_EXEMPTION_REASONS[0]);
    setCustomReasonText("");
    setIsExemptionDialogOpen(true);
  };

  const confirmExemption = () => {
    if (!preview) return;
    const finalReason = customReasonText.trim() || selectedReason;

    let updatedRows: ParsedBeneficiaryRow[];

    if (targetExemptionRow === "ALL") {
      updatedRows = preview.rows.map((r) => {
        if (r.status === "RESTRICTED" || r.restrictionEnd) {
          return {
            ...r,
            status: "EXEMPTED" as const,
            isExempted: true,
            exemptionReason: finalReason,
          };
        }
        return r;
      });
    } else if (targetExemptionRow) {
      updatedRows = preview.rows.map((r) => {
        if (r.designatedNumber === targetExemptionRow.designatedNumber && r.fullName === targetExemptionRow.fullName) {
          return {
            ...r,
            status: "EXEMPTED" as const,
            isExempted: true,
            exemptionReason: finalReason,
          };
        }
        return r;
      });
    } else {
      return;
    }

    setPreview(recalculatePreviewCounts(updatedRows));
    setIsExemptionDialogOpen(false);
    setTargetExemptionRow(null);
  };

  const handleRevokeExemption = (targetRow: ParsedBeneficiaryRow) => {
    if (!preview) return;

    const updatedRows = preview.rows.map((r) => {
      if (r.designatedNumber === targetRow.designatedNumber && r.fullName === targetRow.fullName) {
        return {
          ...r,
          status: "RESTRICTED" as const,
          isExempted: false,
          exemptionReason: undefined,
        };
      }
      return r;
    });

    setPreview(recalculatePreviewCounts(updatedRows));
  };

  const handleCommitMasterlist = async () => {
    if (!preview || preview.validCount === 0) return;

    setCommitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/beneficiaries/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          programId: selectedProgramId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit masterlist");

      const msg = data.exemptedCount > 0
        ? `Successfully committed ${data.importedCount} beneficiaries (including ${data.exemptedCount} authorized exemptions) into the Final Masterlist for Implementation!`
        : `Successfully imported ${data.importedCount} beneficiaries into the Final Masterlist for Implementation!`;

      alert(msg);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to commit masterlist");
    } finally {
      setCommitting(false);
    }
  };

  const exemptedCount = preview?.rows.filter((r) => r.isExempted || r.status === "EXEMPTED").length || 0;
  const activeRestrictedCount = preview?.rows.filter((r) => r.status === "RESTRICTED" && !r.isExempted).length || 0;

  const filteredPreviewRows = preview?.rows.filter((r) => {
    if (activeTab === "VALID") return r.status === "VALID" || r.status === "EXEMPTED" || Boolean(r.isExempted);
    if (activeTab === "EXEMPTED") return r.status === "EXEMPTED" || Boolean(r.isExempted);
    if (activeTab === "WARNINGS") return r.status !== "VALID" && r.status !== "EXEMPTED" && !r.isExempted;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 space-y-5 shadow-2xl my-8 border border-slate-200">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-gov-blue" />
              <span>Upload "Final List of Beneficiaries for Implementation"</span>
            </h3>
            <p className="text-xs text-slate-500">
              Upload TUPAD Masterlist CSV/Excel with auto-grouping by Barangay, Purok/Sitio, and demographic classification
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <a
              href="/api/v1/beneficiaries/template"
              download="tupad_final_beneficiaries_template.csv"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template CSV</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Target Program Selector & File Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              1. Target TUPAD Program Batch *
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 font-bold text-slate-800"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.programCode} - {p.programName} ({p.status})
                </option>
              ))}
              <option value="AUTO">+ Create / Use Default Active Program</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              2. Select Masterlist File (.CSV / .XLSX) *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-gov-blue hover:file:bg-blue-100 border rounded-xl"
              />
              <button
                type="button"
                disabled={!file || parsing}
                onClick={handlePreviewUpload}
                className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition whitespace-nowrap disabled:opacity-50"
              >
                {parsing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Parse &amp; Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Preview Section */}
        {preview && (
          <div className="space-y-4 pt-2 border-t">
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="text-[10px] text-blue-900 font-bold uppercase">Total Rows in File</span>
                <p className="text-xl font-black text-blue-950">{preview.totalRows}</p>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-900 font-bold uppercase">Valid &amp; Ready</span>
                <p className="text-xl font-black text-emerald-800">
                  {preview.validCount}
                  {exemptedCount > 0 && (
                    <span className="text-xs font-bold text-purple-700 ml-1">
                      ({exemptedCount} Exempted)
                    </span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <span className="text-[10px] text-amber-900 font-bold uppercase">Duplicates Skipped</span>
                <p className="text-xl font-black text-amber-900">{preview.duplicateCount}</p>
              </div>
              <div className={`p-3 rounded-xl border ${activeRestrictedCount > 0 ? "bg-rose-50/70 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
                <span className="text-[10px] text-slate-700 font-bold uppercase">365-Day Restricted</span>
                <p className="text-xl font-black text-rose-800">
                  {activeRestrictedCount}
                  {exemptedCount > 0 && (
                    <span className="text-xs font-bold text-emerald-700 ml-1">
                      (0 remaining)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Restriction Alert & Exemption Override Banner */}
            {activeRestrictedCount > 0 && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start space-x-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-950">
                      {activeRestrictedCount} Restricted Beneficiaries Detected in Masterlist
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Under DOLE-TUPAD policy, beneficiaries are restricted within 365 days of previous payout. You may grant an authorized administrative exemption to include them in this implementation roster.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openExemptionDialog("ALL")}
                  className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition self-start sm:self-auto whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Grant Exemption to All ({activeRestrictedCount})</span>
                </button>
              </div>
            )}

            {/* Barangay & Group Distribution */}
            {preview.barangaySummary && Object.keys(preview.barangaySummary).length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-amber-600" />
                  <span>Barangay Roster Distribution</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(preview.barangaySummary).map(([brgy, count]) => (
                    <span
                      key={brgy}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      {brgy}: <span className="text-gov-blue font-extrabold">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    activeTab === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  All Rows ({preview.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("VALID")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    activeTab === "VALID" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Valid &amp; Ready ({preview.validCount})
                </button>
                {exemptedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("EXEMPTED")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center space-x-1 ${
                      activeTab === "EXEMPTED" ? "bg-purple-100 text-purple-900 shadow-xs font-black" : "text-purple-700 hover:text-purple-900"
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Exempted ({exemptedCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab("WARNINGS")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    activeTab === "WARNINGS" ? "bg-white text-rose-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Warnings / Skipped ({preview.duplicateCount + activeRestrictedCount + preview.invalidCount})
                </button>
              </div>

              <button
                type="button"
                disabled={committing || preview.validCount === 0}
                onClick={handleCommitMasterlist}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {committing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Committing {preview.validCount} Records...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Commit &amp; Implement Masterlist ({preview.validCount})</span>
                  </>
                )}
              </button>
            </div>

            {/* Data Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0 border-b">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Beneficiary Full Name</th>
                    <th className="px-3 py-2">Barangay &amp; Purok/Sitio</th>
                    <th className="px-3 py-2">Assigned Deployment Group</th>
                    <th className="px-3 py-2">Sex &amp; Age</th>
                    <th className="px-3 py-2">Special Categories</th>
                    <th className="px-3 py-2">Import Status / Exemption</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreviewRows?.map((r: ParsedBeneficiaryRow, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 text-[11px]">
                      <td className="px-3 py-2 font-mono font-bold text-slate-700">{r.designatedNumber}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{r.fullName}</td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-slate-800">{r.barangay}</span>
                        {r.sitio && <span className="text-slate-500"> ({r.sitio})</span>}
                      </td>
                      <td className="px-3 py-2 font-bold text-amber-900">
                        <span className="px-2 py-0.5 bg-amber-50 rounded border border-amber-200 font-extrabold text-[10px]">
                          {r.groupLabel || "Group 1"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {r.sex || "-"} / {r.age || "-"} yrs
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {r.isSenior && <span className="px-1.5 py-0.2 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[9px] font-bold">SC</span>}
                          {r.isPwd && <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[9px] font-bold">PWD</span>}
                          {r.isIp && <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold">IP</span>}
                          {r.is4Ps && <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold">4Ps</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {r.status === "VALID" ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Ready</span>
                          </span>
                        ) : r.status === "EXEMPTED" || r.isExempted ? (
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-300 rounded-full font-bold text-[10px]"
                              title={`Exemption Reason: ${r.exemptionReason || "Authorized"}`}
                            >
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              <span>Exempted</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRevokeExemption(r)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline font-semibold"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : r.status === "RESTRICTED" ? (
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]"
                              title={r.validationError}
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Restricted</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openExemptionDialog(r)}
                              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md font-bold text-[10px] flex items-center space-x-0.5 transition"
                            >
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>Exempt</span>
                            </button>
                          </div>
                        ) : (
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]"
                            title={r.validationError}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>{r.status}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Exemption Confirmation Dialog */}
        {isExemptionDialogOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span>
                    {targetExemptionRow === "ALL"
                      ? `Authorize Exemption for All (${activeRestrictedCount}) Beneficiaries`
                      : `Authorize Exemption: ${(targetExemptionRow as ParsedBeneficiaryRow)?.fullName}`}
                  </span>
                </h4>
                <button
                  onClick={() => setIsExemptionDialogOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Granting this exemption overrides the 365-day restriction and authorizes inclusion in the final implementation masterlist. Please select or state the justification:
                </p>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase text-[10px]">
                    Standard Justification Reason
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 font-bold text-slate-800"
                  >
                    {DEFAULT_EXEMPTION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase text-[10px]">
                    Or Specify Custom Exemption Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="e.g. Special Barangay Resolution / Council Recommendation"
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsExemptionDialogOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmExemption}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Confirm &amp; Apply Exemption</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

