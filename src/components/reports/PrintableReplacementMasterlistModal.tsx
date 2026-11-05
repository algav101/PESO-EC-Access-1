"use client";

import React, { useEffect, useState } from "react";
import {
  Printer,
  Download,
  X,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Eye,
  FileSpreadsheet,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  programId: string;
  onClose: () => void;
  onOpenApprovalModal?: (item: any) => void;
}

export function PrintableReplacementMasterlistModal({
  isOpen,
  programId,
  onClose,
  onOpenApprovalModal,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomedImage, setZoomedImage] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    if (isOpen && programId) {
      fetchMasterlist();
    }
  }, [isOpen, programId]);

  const fetchMasterlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/flagged-replacements?programId=${programId}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load masterlist of flagged replacements");
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || "Network error loading masterlist");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const items = data?.items || [];
  const program = data?.program;
  const summary = data?.summary || { totalFlagged: 0, totalApproved: 0, totalPending: 0 };

  const filteredItems = items.filter((item: any) => {
    if (statusFilter === "PENDING" && item.status !== "PENDING") return false;
    if (statusFilter === "APPROVED" && item.status !== "APPROVED") return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const origName = (item.originalBeneficiary?.fullName || "").toLowerCase();
    const candName = (item.candidateBeneficiary?.fullName || "").toLowerCase();
    const depName = (item.candidateBeneficiary?.dependent?.fullName || "").toLowerCase();
    const brgy = (item.originalBeneficiary?.barangay || "").toLowerCase();
    const num = String(item.designatedNumber || "");

    return (
      origName.includes(q) ||
      candName.includes(q) ||
      depName.includes(q) ||
      brgy.includes(q) ||
      num.includes(q)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = () => {
    window.open(`/api/v1/reports/export?type=FLAGGED_REPLACEMENTS&programId=${programId}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:max-w-none print:border-none print:shadow-none print:rounded-none">
        {/* Top Controls Toolbar - Hidden during print */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gov-blue text-gov-goldLight flex items-center justify-center font-black">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white flex items-center space-x-2">
                <span>Flagged Beneficiaries Masterlist &amp; Approval Report</span>
                <span className="text-[10px] bg-gov-gold/20 text-gov-goldLight font-mono px-2 py-0.5 rounded-full border border-gov-gold/40">
                  Official DOLE Format
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {program?.programName ? `${program.programName} (${program.programCode})` : "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExcelExport}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 shadow-sm"
              title="Download Excel Workbook (.XLSX)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-extrabold text-xs rounded-lg transition flex items-center space-x-1.5 shadow-md"
              title="Print Official Masterlist Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Masterlist</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar - Hidden during print */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden flex-shrink-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Flagged ({summary.totalFlagged})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 whitespace-nowrap ${
                statusFilter === "PENDING"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-white border text-amber-700 hover:bg-amber-50"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending Admin Approval ({summary.totalPending})</span>
            </button>
            <button
              onClick={() => setStatusFilter("APPROVED")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 whitespace-nowrap ${
                statusFilter === "APPROVED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Approved by Admin ({summary.totalApproved})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, #, barangay..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-gov-blue font-semibold"
            />
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <div className="max-w-6xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none">
            {/* Official Republic Header */}
            <div className="text-center border-b-2 border-slate-900 pb-5 mb-5 space-y-1">
              <div className="flex items-center justify-center space-x-4 mb-2">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-gov-blue text-xs text-center p-1 leading-tight">
                  SEAL OF DINGALAN
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
                    Republic of the Philippines
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Province of Aurora • Municipality of Dingalan
                  </p>
                  <h1 className="text-sm sm:text-base font-black text-gov-blue tracking-tight uppercase">
                    Public Employment Service Office (PESO)
                  </h1>
                  <p className="text-[11px] font-bold text-slate-600 uppercase">
                    DOLE Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers (TUPAD)
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-gov-blue text-xs text-center p-1 leading-tight">
                  PESO LOGO
                </div>
              </div>

              <div className="pt-2">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-sm">
                  Official Masterlist of Beneficiaries Flagged for Replacement &amp; Substitutes
                </span>
              </div>
            </div>

            {/* Program Information & Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 text-xs">
              <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Target Program Details
                </span>
                <p className="font-black text-slate-900 text-xs sm:text-sm">
                  {program?.programName}
                </p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Code: <strong>{program?.programCode}</strong> • Required Days: <strong>{program?.requiredWorkDays || 10} Days</strong>
                </p>
                <p className="text-slate-500 text-[10px]">
                  Municipality: Dingalan, Aurora • Target Slots: {program?.targetBeneficiaries || 500}
                </p>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gov-blue uppercase tracking-wider block">
                    Total Flagged Slots
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {summary.totalFlagged}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Field candidates</span>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Admin Approved
                  </span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {summary.totalApproved}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-800 font-medium">Marked "Replaced"</span>
              </div>
            </div>

            {/* Loading / Error / Empty States */}
            {loading && (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-gov-blue mx-auto" />
                <p className="font-bold">Compiling Flagged Beneficiaries Masterlist...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2 my-4">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl my-4 text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700">No matching flagged beneficiaries found</p>
                <p className="text-[11px] text-slate-400">
                  {statusFilter !== "ALL"
                    ? `No records matching status "${statusFilter}". Try changing the filter.`
                    : "No beneficiaries are currently flagged for replacement for this program."}
                </p>
              </div>
            )}

            {/* Main Masterlist Table */}
            {!loading && filteredItems.length > 0 && (
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase text-[9.5px] border-b border-slate-900">
                      <th className="px-2.5 py-2 text-center w-8">#</th>
                      <th className="px-2.5 py-2 text-center w-14">Slot #</th>
                      <th className="px-3 py-2">Original Beneficiary</th>
                      <th className="px-3 py-2">Replacement Applicant (Substitute)</th>
                      <th className="px-3 py-2">Declared Dependent</th>
                      <th className="px-3 py-2">Reason for Replacement</th>
                      <th className="px-3 py-2">Official Remarks</th>
                      <th className="px-2.5 py-2 text-center">Status</th>
                      <th className="px-2.5 py-2 print:hidden text-center">IDs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {filteredItems.map((item: any, idx: number) => {
                      const orig = item.originalBeneficiary;
                      const cand = item.candidateBeneficiary;
                      const dep = cand?.dependent;
                      const isOrigDeclaredAsDep = Boolean(dep?.isOriginalBeneficiary);
                      const isApproved = item.status === "APPROVED";
                      const isPending = item.status === "PENDING";
                      const docs = cand?.documents || [];

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition ${
                            idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                          }`}
                        >
                          <td className="px-2.5 py-2.5 text-center text-slate-400 font-mono text-[10px]">
                            {idx + 1}
                          </td>

                          <td className="px-2.5 py-2.5 text-center font-mono font-black text-gov-blue">
                            #{item.designatedNumber}
                            <span className="block text-[9px] text-slate-400 font-normal">
                              {item.tableNumber}
                            </span>
                          </td>

                          <td className="px-3 py-2.5">
                            <span
                              className={`font-bold block ${
                                isApproved ? "text-slate-500 line-through" : "text-slate-900"
                              }`}
                            >
                              {orig?.fullName}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {orig?.barangay} {orig?.sitio ? `(${orig.sitio})` : ""}
                            </span>
                            {orig?.birthday && (
                              <span className="text-[9.5px] text-slate-400 font-mono block">
                                Born: {orig.birthday}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            {cand ? (
                              <div>
                                <span className="font-extrabold text-emerald-800 block">
                                  {cand.fullName}
                                </span>
                                <span className="text-[10px] text-slate-600 block">
                                  {cand.barangay} {cand.sitio ? `(${cand.sitio})` : ""} •{" "}
                                  <span className="font-mono">{cand.sex || "N/A"}</span>
                                </span>
                                {cand.idType && (
                                  <span className="text-[9.5px] text-slate-500 font-mono block">
                                    {cand.idType}: {cand.idNumber || "N/A"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-700 italic">
                                Awaiting Onsite Candidate Entry
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            {dep ? (
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  {dep.fullName}
                                </span>
                                <span className="text-[10px] text-slate-600 block">
                                  Rel: <strong>{dep.relationship}</strong>
                                  {dep.age ? ` (${dep.age} y/o)` : ""}
                                </span>
                                {isOrigDeclaredAsDep && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-purple-100 text-purple-900 text-[9px] font-extrabold rounded border border-purple-200">
                                    ★ Original Beneficiary Declared as Dependent
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 max-w-[180px]">
                            <span className="text-slate-800 font-medium block">
                              {item.reason}
                            </span>
                            <span className="text-[9.5px] text-slate-400 block mt-0.5">
                              Init: {item.initiatedBy}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 max-w-[200px]">
                            <div
                              className={`p-1.5 rounded text-[10px] font-bold border ${
                                isApproved
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                  : isPending
                                  ? "bg-amber-50 text-amber-900 border-amber-200"
                                  : "bg-rose-50 text-rose-900 border-rose-200"
                              }`}
                            >
                              {item.remarks}
                            </div>
                            {item.approvedBy && (
                              <span className="text-[9.5px] text-slate-500 block mt-0.5">
                                Verified by: {item.approvedBy}
                              </span>
                            )}
                          </td>

                          <td className="px-2.5 py-2.5 text-center">
                            {isApproved ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ APPROVED
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                ⏳ PENDING
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                ✕ REJECTED
                              </span>
                            )}
                          </td>

                          <td className="px-2.5 py-2.5 text-center print:hidden">
                            {docs.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenApprovalModal) {
                                    onOpenApprovalModal(item);
                                  } else {
                                    setZoomedImage({
                                      url: docs[0].fileKey,
                                      label: `${docs[0].documentType} - ${cand?.fullName}`,
                                    });
                                  }
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-gov-blue text-[10px] font-bold rounded border border-blue-200 transition inline-flex items-center space-x-1"
                                title="View uploaded IDs"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{docs.length} IDs</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Official Signatories Block */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-xs text-center mt-6">
              <div className="space-y-4">
                <span className="text-slate-500 font-semibold text-[11px] block">
                  Prepared &amp; Consolidated by:
                </span>
                <div className="pt-6 border-b border-slate-900 inline-block min-w-[180px]">
                  <p className="font-black text-slate-900 uppercase">
                    PESO TECHNICAL STAFF / FIELD OFFICER
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Public Employment Service Office
                </p>
              </div>

              <div className="space-y-4">
                <span className="text-slate-500 font-semibold text-[11px] block">
                  Reviewed &amp; Verified by:
                </span>
                <div className="pt-6 border-b border-slate-900 inline-block min-w-[180px]">
                  <p className="font-black text-slate-900 uppercase">
                    PESO MANAGER / COORDINATOR
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  LGU Dingalan, Aurora
                </p>
              </div>

              <div className="space-y-4">
                <span className="text-slate-500 font-semibold text-[11px] block">
                  Approved by:
                </span>
                <div className="pt-6 border-b border-slate-900 inline-block min-w-[180px]">
                  <p className="font-black text-slate-900 uppercase">
                    HON. MUNICIPAL MAYOR
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Head of Procuring Entity / LGU Dingalan
                </p>
              </div>
            </div>

            <div className="text-center pt-8 text-[9px] text-slate-400 font-mono">
              Document Authenticated by LGU Dingalan PESO-TUPAD Automated Beneficiary Integrity Registry
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Lightbox Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 print:hidden"
          onClick={() => setZoomedImage(null)}
        >
          <div className="max-w-2xl w-full bg-white rounded-xl overflow-hidden shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-slate-800">{zoomedImage.label}</span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={zoomedImage.url}
              alt={zoomedImage.label}
              className="w-full max-h-[75vh] object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          nav, header, footer, .sidebar, button, input {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }
        }
      `}</style>
    </div>
  );
}

