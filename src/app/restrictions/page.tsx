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
  Building,
  UserCheck,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableScrollWrapper } from "@/components/common/TableScrollWrapper";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, isFieldCoordinator } from "@/lib/permissions";
import { MultiSelectFilter } from "@/components/common/MultiSelectFilter";
import { CANONICAL_BARANGAYS, normalizeBarangayName } from "@/lib/dingalan-groupings";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RestrictionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = isAdminUser(user);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>(["ALL"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear / Reset Modal State
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isFieldCoordinator(user)) {
      router.replace("/restrictions/checker");
      return;
    }
    fetchRestrictions();
  }, [user, router]);

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

  const handleClearRestrictions = async () => {
    setIsClearing(true);
    setClearSuccessMsg(null);
    try {
      const res = await fetch("/api/v1/restrictions", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setClearSuccessMsg(`✓ ${data.message || "Restrictions cleared"}`);
        setRestrictions([]);
        setTimeout(() => {
          setIsClearModalOpen(false);
          setClearSuccessMsg(null);
        }, 1800);
      } else {
        alert(data.error || "Failed to clear restrictions");
      }
    } catch (e) {
      alert("Error clearing restrictions");
    } finally {
      setIsClearing(false);
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

        const previewRows = data.slice(0, 8).map((row, idx) => {
          const name =
            row["NAME OF BENEFICIARIES"] ||
            row["NAME OF BENEFICIARY"] ||
            row["FULL NAME"] ||
            row["BENEFICIARY NAME"] ||
            row["NAME"] ||
            `Row ${idx + 1}`;

          const adl =
            row["Batch / Appointive Position"] ||
            row["BATCH / APPOINTIVE POSITION"] ||
            row["Batch / Position"] ||
            row["ADL NO."] ||
            row["ADL NO"] ||
            row["BARANGAY APPOINTIVE POSITION"] ||
            "HISTORICAL_BATCH";
          const workDate = row["WORK DATE"] || row["WORK DURATION DATE"] || "N/A";
          const payout = row["PAYOUT DATE"] || row["PAYOUT DATE (YYYY-MM-DD)"] || "N/A";
          const brgy = row["Barangay"] || row["BARANGAY"] || "BUHANGIN";
          const city = row["City/ Municipality"] || row["MUNICIPALITY"] || "BALER";

          return {
            name: String(name).toUpperCase(),
            adl: String(adl),
            workDate: String(workDate),
            payout: String(payout),
            barangay: String(brgy),
            city: String(city),
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

  const barangayOptions = React.useMemo(() => {
    return CANONICAL_BARANGAYS.map((b) => {
      const stdB = normalizeBarangayName(b);
      const count = restrictions.filter((r) => {
        const rBrgy = normalizeBarangayName(r.barangay || r.beneficiary?.barangay);
        return rBrgy === stdB;
      }).length;
      return {
        value: b,
        label: `Brgy. ${b}`,
        count,
      };
    });
  }, [restrictions]);

  const filtered = React.useMemo(() => {
    return restrictions.filter((r) => {
      const name = r.beneficiary?.fullName?.toLowerCase() || "";
      const adl = r.adlNo?.toLowerCase() || "";
      const rBrgy = normalizeBarangayName(r.barangay || r.beneficiary?.barangay);
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || adl.includes(query) || rBrgy.toLowerCase().includes(query);

      const isAllBrgy = selectedBarangays.length === 0 || selectedBarangays.includes("ALL");
      const matchesBrgy = isAllBrgy || selectedBarangays.some((sb) => normalizeBarangayName(sb) === rBrgy);

      return matchesSearch && matchesBrgy;
    });
  }, [restrictions, searchQuery, selectedBarangays]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-gov-blue" />
            <span>TUPAD 320-Day & Appointive Restriction Registry</span>
          </h1>
          <p className="text-xs text-slate-500">
            Enforces the 320-day payout interval & Barangay Appointive Personnel disqualification policies
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/restrictions/checker"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
          >
            <UserCheck className="w-4 h-4 text-emerald-200" />
            <span>Open Eligibility Checker</span>
          </Link>

          <a
            href="/api/v1/restrictions/template"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Excel Template</span>
          </a>

          {isAdmin && (
            <>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-gov-blue hover:bg-gov-dark text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
              >
                <UploadCloud className="w-4 h-4 text-gov-goldLight" />
                <span>Upload Reference List</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsClearModalOpen(true);
                  setClearSuccessMsg(null);
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition"
                title="I-reset sa 0 ang Talaan"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Clear List (Reset to 0)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Search & Multi-Select Barangay Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="gov-card p-3 md:col-span-2 flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Beneficiary Name, Batch / Appointive Position, or Barangay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-bold focus:outline-none bg-transparent"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs">
              ✕
            </button>
          )}
        </div>

        <div className="md:col-span-1">
          <MultiSelectFilter
            label="Filter Barangay"
            options={barangayOptions}
            selectedValues={selectedBarangays}
            onChange={(vals) => setSelectedBarangays(vals)}
            allLabel="All Barangays (11)"
          />
        </div>

        <div className="gov-card p-3 flex items-center justify-between bg-rose-50/50 border border-rose-200">
          <div>
            <span className="text-[10px] font-bold text-rose-700 uppercase block">Registered Lockouts</span>
            <span className="text-base font-black text-rose-900">{filtered.length} of {restrictions.length}</span>
          </div>
          <ShieldCheck className="w-6 h-6 text-rose-600 opacity-80" />
        </div>
      </div>

      {/* Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Disqualified / Restricted Beneficiaries ({filtered.length})
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
          <TableScrollWrapper>
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-4 py-3">Beneficiary Name</th>
                  <th className="px-4 py-3">Batch / Appointive Position</th>
                  <th className="px-4 py-3">Work Duration Date</th>
                  <th className="px-4 py-3">Payout Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Eligible Again On</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{r.beneficiary?.fullName}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gov-blue font-semibold">
                      {r.adlNo || "Batch Reference"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.workDate || "10-Day Work"}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{r.payoutDate}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.barangay || r.beneficiary?.barangay}, {r.municipality || r.beneficiary?.municipality}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                      {r.isAppointivePersonnel ? "Permanent (Barangay Appointive)" : r.restrictionEnd}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollWrapper>
        )}
      </div>

      {/* Upload Masterlist Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="gov-card max-w-2xl w-full p-6 space-y-5 bg-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-black text-slate-900">Upload Disqualified Reference Masterlist</h2>
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
                  statutory 320-day payout lockouts and Barangay Appointive Personnel restrictions.
                </p>

                {/* Template Download Box */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-gov-blue block">Official Reference Template</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      [A] NAME OF BENEFICIARIES • [B] Batch / Appointive Position • [C] ORIENTATION DATE • [D] WORK DATE • [E] PAYOUT DATE • [F] Barangay • [G] City/ Municipality
                    </span>
                  </div>
                  <a
                    href="/api/v1/restrictions/template"
                    className="px-3.5 py-1.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1"
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
                            <th className="p-2">Batch / Appointive Position</th>
                            <th className="p-2">Work Date</th>
                            <th className="p-2">Payout Date</th>
                            <th className="p-2">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedPreview.map((r, i) => (
                            <tr key={i}>
                              <td className="p-2 font-bold text-slate-900">{r.name}</td>
                              <td className="p-2 font-mono text-slate-600">{r.adl}</td>
                              <td className="p-2 text-slate-600">{r.workDate}</td>
                              <td className="p-2 font-mono text-slate-600">{r.payout}</td>
                              <td className="p-2 text-slate-600">{r.barangay}, {r.city}</td>
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
                        <span>Commit Records to Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear Restrictions (Reset to 0) */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 text-rose-700">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Clear Reference Registry
                  </h3>
                  <span className="text-[11px] text-rose-700 font-semibold">I-reset sa 0 ang Talaan</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isClearing && setIsClearModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                Sigurado ka ba na nais mong burahin ang lahat ng {restrictions.length} restriction/disqualification records mula sa reference list?
              </p>
              
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-950">
                <div className="flex items-center space-x-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Kasalukuyang Database: {restrictions.length} records</span>
                </div>
                <p className="text-[11px] text-rose-900 leading-relaxed">
                  Lahat ng active lockouts ay mabubura at babalik sa <strong>0</strong>. Maaari kang mag-upload muli ng panibagong Excel reference list anumang oras.
                </p>
              </div>
            </div>

            {clearSuccessMsg && (
              <div className="p-3 rounded-xl text-xs font-bold flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{clearSuccessMsg}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-100 transition text-slate-700"
              >
                Kanselahin (Cancel)
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearRestrictions}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Clearing Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>I-reset sa 0 (Clear All)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
