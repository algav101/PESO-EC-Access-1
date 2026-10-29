"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";

export default function AdminApplicationsPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  const [applicants, setApplicants] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<"APPEND" | "REPLACE">("APPEND");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicants();
  }, [search, selectedBarangay, selectedStatus]);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search,
        barangay: selectedBarangay,
        status: selectedStatus,
      }).toString();

      const res = await fetch(`/api/v1/applications?${q}`);
      if (res.ok) {
        const data = await res.json();
        setApplicants(data.applicants || []);
        setTotalCount(data.totalCount || 0);
        setIncompleteCount(data.incompleteCount || 0);
        setQueuedCount(data.queuedCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadLoading(true);
    setUploadError(null);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("mode", uploadMode);

      const res = await fetch("/api/v1/applications/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload file");

      setUploadMessage(data.message);
      setUploadFile(null);
      await fetchApplicants();
      setTimeout(() => {
        setIsUploading(false);
        setUploadMessage(null);
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL application roster records? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch("/api/v1/applications", { method: "DELETE" });
      if (res.ok) {
        await fetchApplicants();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const BARANGAYS = [
    "Aplaya",
    "Butas na Bato",
    "Caragsacan",
    "Davildavilan",
    "Dikapanikian",
    "Ibona",
    "Matawe",
    "Paltic",
    "Poblacion",
    "Tanawan",
    "Umiray",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-gov-blue" />
            <span>TUPAD Application Status Master Roster</span>
          </h1>
          <p className="text-xs text-slate-500">
            Official applicant data source used by the Public Status Inquiry on the landing page
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/applications/walk-in"
            className="px-3.5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4 text-gov-goldLight" />
            <span>Walk-in Encoding</span>
          </a>
          <a
            href="/api/v1/applications/template"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Template (.XLSX)</span>
          </a>

          {isAdmin && (
            <button
              onClick={() => setIsUploading(true)}
              className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
            >
              <Upload className="w-4 h-4 text-gov-gold" />
              <span>Upload Applicant File</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {isAdmin && <nav aria-label="Application inboxes" className="flex flex-wrap gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-gov-blue"><a href="/admin/applications/online" className="hover:underline">Online Applications inbox</a><a href="/admin/applications/walk-in-submissions" className="hover:underline">Walk-in Submissions inbox</a><p className="w-full text-xs font-normal text-slate-600">This roster contains spreadsheet imports only. New applications are kept in their separate admin inboxes.</p></nav>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gov-card p-5 bg-white border-l-4 border-l-gov-blue shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">
              Total Inquiring Applicants
            </span>
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-gov-blue rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="gov-card p-5 bg-white border-l-4 border-l-emerald-600 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">
              Complete & Queued
            </span>
            <span className="text-2xl font-black text-emerald-700">{queuedCount}</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="gov-card p-5 bg-white border-l-4 border-l-amber-500 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase block">
              Incomplete / Lacking Details
            </span>
            <span className="text-2xl font-black text-amber-700">{incompleteCount}</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Filter Barangay
          </label>
          <select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
          >
            <option value="ALL">All Barangays</option>
            {BARANGAYS.map((b) => (
              <option key={b} value={b.toUpperCase()}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Status Filter
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
          >
            <option value="ALL">All Application Statuses</option>
            <option value="QUEUED">Queued (Complete)</option>
            <option value="INCOMPLETE">Incomplete (Lacking Details)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Search Applicant
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, contact, ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Applicant Roster Entries ({applicants.length} of {totalCount})
          </span>

          {isAdmin && totalCount > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Entire Roster</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading applicant data...</div>
        ) : applicants.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No applicants found. Upload an Excel file using the template.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Applicant Name</th>
                  <th className="px-4 py-3">Birthday</th>
                  <th className="px-4 py-3">Barangay / Sitio</th>
                  <th className="px-4 py-3">Contact #</th>
                  <th className="px-4 py-3">ID Presented / No.</th>
                  <th className="px-4 py-3">Dependent</th>
                  <th className="px-4 py-3">Public Status</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((a) => {
                  const isIncomplete = a.status === "INCOMPLETE";

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <strong className="font-bold text-slate-900 block">{a.fullName}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {a.civilStatus || "-"} • {a.occupation || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {a.birthday || (a.birthYear ? `${a.birthMonth}/${a.birthDay}/${a.birthYear}` : "-")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">{a.barangay || "-"}</span>
                        <span className="text-[10px] text-slate-500">{a.streetSitio || "Centro"}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {a.contactNumber ? (
                          <span className="text-slate-800">{a.contactNumber}</span>
                        ) : (
                          <span className="text-rose-600 font-bold text-[10px]">No Contact</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.idPresented ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{a.idPresented}</span>
                            <span className="font-mono text-[10px] text-slate-400">{a.idNumber || "No ID #"}</span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-bold text-[10px]">No ID Listed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 block">{a.dependentFullName || "-"}</span>
                        {a.dependentRelationship && (
                          <span className="text-[10px] text-slate-400">({a.dependentRelationship})</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.submissionStatus === "DRAFT" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                            Draft
                          </span>
                        ) : isIncomplete ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            May Kakulangan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Nakapila (Complete)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-44">
                        {a.documents?.length ? (
                          <div className="flex flex-col gap-1">
                            {a.documents.map((document: any) => (
                              <a key={document.id} href={`/api/v1/applications/documents/${document.id}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-gov-blue hover:underline">
                                {document.fieldName} — {document.fileName}
                              </a>
                            ))}
                          </div>
                        ) : <span className="text-[10px] text-slate-400">No documents</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs truncate" title={a.remarks || ""}>
                        {a.remarks || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border-t-4 border-t-gov-blue">
            <div className="flex items-center space-x-3 text-gov-blue">
              <div className="p-2.5 bg-blue-100 rounded-full">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Upload Applicant Roster</h3>
                <p className="text-xs text-slate-500 font-medium">Excel spreadsheet ingestion (.xlsx, .csv)</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Excel File
                </label>
                <input
                  type="file"
                  required
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gov-blue file:text-white hover:file:bg-gov-light"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ingestion Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadMode("APPEND")}
                    className={`p-2.5 rounded-xl text-left border-2 text-xs font-bold transition ${
                      uploadMode === "APPEND"
                        ? "border-gov-blue bg-blue-50 text-gov-blue"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <span>Append / Update</span>
                    <p className="text-[10px] text-slate-400 font-normal">Add to existing roster</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadMode("REPLACE")}
                    className={`p-2.5 rounded-xl text-left border-2 text-xs font-bold transition ${
                      uploadMode === "REPLACE"
                        ? "border-rose-600 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <span>Replace Entire Roster</span>
                    <p className="text-[10px] text-slate-400 font-normal">Wipes old data first</p>
                  </button>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{uploadMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg border transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !uploadFile}
                  className="px-5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-gov-goldLight" />
                  <span>{uploadLoading ? "Uploading..." : "Start Import"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
