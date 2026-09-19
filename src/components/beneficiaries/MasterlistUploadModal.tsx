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
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ImportPreviewResult, ParsedBeneficiaryRow } from "@/lib/excel-importer";

interface MasterlistUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: any[];
  defaultProgramId?: string;
  onSuccess: () => void;
}

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
  const [activeTab, setActiveTab] = useState<"ALL" | "VALID" | "WARNINGS">("ALL");

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

      alert(
        `Successfully imported ${data.importedCount} beneficiaries into the Final Masterlist for Implementation!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to commit masterlist");
    } finally {
      setCommitting(false);
    }
  };

  const filteredPreviewRows = preview?.rows.filter((r) => {
    if (activeTab === "VALID") return r.status === "VALID";
    if (activeTab === "WARNINGS") return r.status !== "VALID";
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
                <p className="text-xl font-black text-emerald-800">{preview.validCount}</p>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <span className="text-[10px] text-amber-900 font-bold uppercase">Duplicates Skipped</span>
                <p className="text-xl font-black text-amber-900">{preview.duplicateCount}</p>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                <span className="text-[10px] text-rose-900 font-bold uppercase">365-Day Restricted</span>
                <p className="text-xl font-black text-rose-800">{preview.restrictedCount}</p>
              </div>
            </div>

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
            <div className="flex items-center justify-between">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
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
                  Valid Ready ({preview.validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("WARNINGS")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    activeTab === "WARNINGS" ? "bg-white text-rose-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Warnings / Skipped ({preview.duplicateCount + preview.restrictedCount + preview.invalidCount})
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
                    <th className="px-3 py-2">Import Status</th>
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
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]" title={r.validationError}>
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
      </div>
    </div>
  );
}
