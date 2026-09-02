"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ShieldAlert,
  Search,
  CheckCircle,
  Calendar,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Download,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDistanceToNow, parseISO, isAfter } from "date-fns";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";

export default function RestrictionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "PESO_ADMIN";
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRestrictions();
  }, []);

  const fetchRestrictions = async () => {
    try {
      const res = await fetch("/api/v1/restrictions");
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data.restrictions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    parseFileForPreview(file);
  };

  const parseFileForPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const previewRows = data.slice(0, 10).map((row, idx) => {
          const name =
            row["FULL NAME"] ||
            row["BENEFICIARY NAME"] ||
            row["NAME"] ||
            row["fullname"] ||
            (row["FIRST NAME"] && row["LAST NAME"] ? `${row["LAST NAME"]}, ${row["FIRST NAME"]}` : `Row ${idx + 1}`);

          const bday = row["BIRTHDAY (YYYY-MM-DD)"] || row["BIRTHDAY"] || row["DOB"] || row["DATE OF BIRTH"] || "1990-01-01";
          const payout = row["PAYOUT DATE (YYYY-MM-DD)"] || row["PAYOUT DATE"] || row["DATE OF PAYOUT"] || new Date().toISOString().split("T")[0];
          const program = row["SOURCE PROGRAM NAME"] || row["PROGRAM"] || "Historical TUPAD Batch";

          let lockoutEnd = "";
          try {
            const d = new Date(payout);
            d.setFullYear(d.getFullYear() + 1);
            lockoutEnd = d.toISOString().split("T")[0];
          } catch {
            lockoutEnd = "1 Year Lockout";
          }

          return {
            name: String(name).toUpperCase(),
            birthday: String(bday),
            payoutDate: String(payout),
            lockoutEnd,
            program: String(program),
            status: name && bday ? "VALID" : "INCOMPLETE",
          };
        });

        setParsedPreview(previewRows);
      } catch (err) {
        console.error("Preview parse error:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch("/api/v1/restrictions/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadSuccessMsg(`✓ ${data.message}`);
        fetchRestrictions();
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setUploadFile(null);
          setParsedPreview([]);
          setUploadSuccessMsg(null);
        }, 2000);
      } else {
        alert(data.error || "Failed to import restriction masterlist");
      }
    } catch (e) {
      alert("An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const filtered = restrictions.filter((r) => {
    const name = r.beneficiary?.fullName?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <span>365-Day Restriction Compliance Database</span>
          </h1>
          <p className="text-xs text-slate-500">
            Automated registry of beneficiaries who received TUPAD payouts within the statutory 365-day lockout window
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
            >
              <UploadCloud className="w-4 h-4 text-emerald-200" />
              <span>Upload Restriction Masterlist</span>
            </button>
          )}

          <a
            href="/restrictions/checker"
            className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
          >
            <Search className="w-4 h-4 text-gov-goldLight" />
            <span>Real-Time Eligibility Checker</span>
          </a>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-3 gov-card p-3 flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restricted beneficiaries by full name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white"
            />
          </div>
        </div>

        <div className="gov-card p-3 flex items-center justify-between bg-rose-50/50 border border-rose-200">
          <div>
            <span className="text-[10px] font-bold text-rose-700 uppercase block">Active Restrictions</span>
            <span className="text-base font-black text-rose-900">{restrictions.length} Individuals</span>
          </div>
          <ShieldCheck className="w-6 h-6 text-rose-600 opacity-80" />
        </div>
      </div>

      {/* Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Restricted Individuals ({filtered.length})
          </span>
          <button
            onClick={() => fetchRestrictions()}
            className="text-[11px] text-gov-blue font-bold hover:underline flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading restriction records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No active restrictions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-3">Beneficiary Name</th>
                  <th className="px-4 py-3">Birthday</th>
                  <th className="px-4 py-3">Source Program</th>
                  <th className="px-4 py-3">Payout Date</th>
                  <th className="px-4 py-3">Lockout Start</th>
                  <th className="px-4 py-3">Eligible Again On</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{r.beneficiary?.fullName}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{r.beneficiary?.birthday}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.sourceProgram?.programName || r.reason || "Historical TUPAD Batch"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{formatDate(r.payoutDate, "yyyy-MM-dd")}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{r.restrictionStart}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">{r.restrictionEnd}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Masterlist Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="gov-card max-w-2xl w-full p-6 space-y-5 bg-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-black text-slate-900">Upload 365-Day Restriction Masterlist</h2>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>{uploadSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Upload historical payout records or prior batch masterlists (.XLSX / .CSV) to automatically register
                  statutory 365-day lockout periods and prevent double compensation during upcoming program intakes.
                </p>

                {/* Template Download Box */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-gov-blue block">Official Restriction Template</span>
                    <span className="text-[11px] text-slate-500">Includes Full Name, Birthday, Barangay, and Payout Date headers.</span>
                  </div>
                  <a
                    href="/api/v1/restrictions/template"
                    className="px-3 py-1.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5 text-gov-goldLight" />
                    <span>Download .XLSX</span>
                  </a>
                </div>

                {/* File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/40 transition space-y-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  {uploadFile ? (
                    <p className="font-bold text-emerald-800">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700">Click to browse or drag & drop spreadsheet</p>
                      <p className="text-[11px] text-slate-400">Supports .XLSX, .XLS, and .CSV files</p>
                    </div>
                  )}
                </div>

                {/* Pre-validation Preview Table */}
                {parsedPreview.length > 0 && (
                  <div className="space-y-2 border rounded-xl p-3 bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-700 uppercase block">
                      Preview of Uploaded Records (Showing first {parsedPreview.length} rows):
                    </span>
                    <div className="max-h-40 overflow-y-auto border rounded bg-white">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b sticky top-0">
                          <tr>
                            <th className="p-2">Name</th>
                            <th className="p-2">Birthday</th>
                            <th className="p-2">Payout Date</th>
                            <th className="p-2">Lockout Expiration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedPreview.map((r, i) => (
                            <tr key={i}>
                              <td className="p-2 font-bold text-slate-900">{r.name}</td>
                              <td className="p-2 font-mono text-slate-600">{r.birthday}</td>
                              <td className="p-2 font-mono text-slate-600">{r.payoutDate}</td>
                              <td className="p-2 font-mono font-bold text-rose-700">{r.lockoutEnd}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitUpload}
                    disabled={!uploadFile || isUploading}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow disabled:opacity-50 transition flex items-center space-x-1.5"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Importing Restrictions...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Commit Restrictions to Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
