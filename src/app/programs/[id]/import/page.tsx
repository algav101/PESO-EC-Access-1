"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  XCircle,
  ArrowRight,
  Download,
  AlertCircle,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function ExcelImportPage() {
  const params = useParams();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setError(null);
    }
  };

  const handleUploadPreview = async () => {
    if (!file) {
      setError("Please select an Excel (.xlsx / .xls) spreadsheet.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/programs/${params.id}/beneficiaries/import/preview`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse spreadsheet");

      setPreview(data.preview);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || preview.validCount === 0) return;

    setCommitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/programs/${params.id}/beneficiaries/import/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Commit failed");

      alert(`Successfully imported ${data.importedCount} beneficiaries with QR tokens!`);
      router.push(`/programs/${params.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-gov-blue" />
            <span>Excel Beneficiary Masterlist Importer</span>
          </h1>
          <p className="text-xs text-slate-500">
            Import Dingalan TUPAD beneficiary rosters with automatic duplicate detection & 365-day restriction checking
          </p>
        </div>

        <a
          href={`/programs/${params.id}`}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 border rounded-lg"
        >
          Back to Hub
        </a>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Box */}
      {!preview && (
        <div className="gov-card p-8 border-2 border-dashed border-slate-300 hover:border-gov-blue text-center space-y-4 transition">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-gov-blue flex items-center justify-center mx-auto">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              Upload Beneficiary Masterlist (.xlsx / .xls)
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Compatible with Dingalan TUPAD roster layouts. Columns for Designated Number, Name, Birthday, Barangay, and Sitio are automatically mapped.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <label className="px-5 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow cursor-pointer transition">
              <span>{file ? file.name : "Select Excel File"}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {file && (
              <button
                onClick={handleUploadPreview}
                disabled={loading}
                className="px-5 py-2.5 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-extrabold text-xs rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                <span>{loading ? "Analyzing Spreadsheet..." : "Validate & Preview Rows"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview Section */}
      {preview && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="gov-card p-3.5 bg-white border-l-4 border-l-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</p>
              <p className="text-xl font-black text-slate-800">{preview.totalRows}</p>
            </div>
            <div className="gov-card p-3.5 bg-white border-l-4 border-l-emerald-600">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Valid Rows</p>
              <p className="text-xl font-black text-emerald-700">{preview.validCount}</p>
            </div>
            <div className="gov-card p-3.5 bg-white border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold text-amber-600 uppercase">Duplicates</p>
              <p className="text-xl font-black text-amber-700">{preview.duplicateCount}</p>
            </div>
            <div className="gov-card p-3.5 bg-white border-l-4 border-l-rose-600">
              <p className="text-[10px] font-bold text-rose-600 uppercase">365-Day Restricted</p>
              <p className="text-xl font-black text-rose-700">{preview.restrictedCount}</p>
            </div>
            <div className="gov-card p-3.5 bg-white border-l-4 border-l-red-500">
              <p className="text-[10px] font-bold text-red-500 uppercase">Invalid Data</p>
              <p className="text-xl font-black text-red-600">{preview.invalidCount}</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="gov-card p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <p className="text-xs font-bold text-gov-goldLight">Ready for Enrollment</p>
              <p className="text-[11px] text-slate-300">
                {preview.validCount} valid beneficiaries will be registered, assigned tables, and issued unique cryptographic QR tokens.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreview(null)}
                className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Upload Different File
              </button>

              <button
                onClick={handleCommit}
                disabled={committing || preview.validCount === 0}
                className="px-5 py-2 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-extrabold text-xs rounded-lg shadow-lg transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {committing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{committing ? "Committing Database Transaction..." : "Commit Valid Rows"}</span>
              </button>
            </div>
          </div>

          {/* Row Table */}
          <div className="gov-card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pre-Validation Row Classification ({preview.rows.length} Rows)
              </h3>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0 z-10 border-b">
                  <tr>
                    <th className="px-4 py-2.5">Row #</th>
                    <th className="px-4 py-2.5">Designated #</th>
                    <th className="px-4 py-2.5">Beneficiary Name</th>
                    <th className="px-4 py-2.5">Birthday</th>
                    <th className="px-4 py-2.5">Barangay</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Validation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((r: any) => (
                    <tr
                      key={r.rowNumber}
                      className={`hover:bg-slate-50 ${
                        r.status === "RESTRICTED"
                          ? "bg-rose-50/40"
                          : r.status === "VALID"
                          ? "bg-emerald-50/20"
                          : "bg-amber-50/30"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-slate-400">{r.rowNumber}</td>
                      <td className="px-4 py-2.5 font-bold font-mono text-gov-blue">{r.designatedNumber}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{r.fullName}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">{r.birthday || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{r.barangay}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2.5 text-[11px]">
                        {r.validationError ? (
                          <span className="text-rose-700 font-medium">{r.validationError}</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Passed Pre-Validation</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
