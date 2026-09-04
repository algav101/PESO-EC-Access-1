"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FolderKanban,
  Users,
  QrCode,
  Printer,
  CalendarCheck,
  UserPlus,
  Clock,
  Camera,
  Banknote,
  FileSpreadsheet,
  History,
  MapPin,
  Calendar,
  Download,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Table as TableIcon,
  Sparkles,
  Edit2,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, formatTime } from "@/lib/utils";
import { useOffline } from "@/context/OfflineContext";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";
import { TableAssignmentModal } from "@/components/tables/TableAssignmentModal";
import { EditProgramModal } from "@/components/programs/EditProgramModal";
import { DeleteProgramModal } from "@/components/programs/DeleteProgramModal";
import { EditBeneficiaryModal } from "@/components/beneficiaries/EditBeneficiaryModal";

export default function ProgramDetailsHub() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const { cacheProgramData } = useOffline();

  const [program, setProgram] = useState<any>(null);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [tableRules, setTableRules] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [beneficiaryToEdit, setBeneficiaryToEdit] = useState<any | null>(null);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<any | null>(null);
  const [isDeletingBene, setIsDeletingBene] = useState(false);
  const [loadingBene, setLoadingBene] = useState(true);

  useEffect(() => {
    fetchProgramDetails();
  }, [params.id]);

  const fetchProgramDetails = async () => {
    try {
      // 1. Fetch main program details and render immediately
      const res = await fetch(`/api/v1/programs/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProgram(data.program);
        setTableRules(data.program?.tableRules || []);
        setLoading(false); // Render UI immediately!
      } else {
        setLoading(false);
      }

      // 2. Fetch secondary lists in parallel (non-blocking)
      Promise.allSettled([
        fetch(`/api/v1/programs/${params.id}/beneficiaries`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v1/replacements?programId=${params.id}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v1/photos?programId=${params.id}`).then((r) => (r.ok ? r.json() : null)),
      ]).then(([beneRes, repRes, photoRes]) => {
        if (beneRes.status === "fulfilled" && beneRes.value?.beneficiaries) {
          setBeneficiaries(beneRes.value.beneficiaries);
        }
        if (repRes.status === "fulfilled" && repRes.value?.replacements) {
          setReplacements(repRes.value.replacements);
        }
        if (photoRes.status === "fulfilled" && photoRes.value?.photos) {
          setPhotos(photoRes.value.photos);
        }
        setLoadingBene(false);
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleDeleteBeneficiary = async (deleteGlobal: boolean = false) => {
    if (!beneficiaryToDelete) return;
    setIsDeletingBene(true);
    try {
      const res = await fetch(
        `/api/v1/programs/${params.id}/beneficiaries?programBeneficiaryId=${beneficiaryToDelete.id}&deleteGlobal=${deleteGlobal}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete beneficiary entry");

      setBeneficiaries((prev) => prev.filter((b) => b.id !== beneficiaryToDelete.id));
      setProgram((prev: any) => ({
        ...prev,
        beneficiaryCount: Math.max(0, (prev?.beneficiaryCount || 1) - 1),
      }));
      setBeneficiaryToDelete(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeletingBene(false);
    }
  };

  const handleGenerateQrs = async () => {
    try {
      const res = await fetch(`/api/v1/programs/${params.id}/qr/generate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully generated ${data.generatedCount} QR codes!`);
        fetchProgramDetails();
      }
    } catch (e) {
      alert("Failed to generate QR codes");
    }
  };

  const handleCacheOffline = async () => {
    if (!program) return;
    await cacheProgramData(program.id);
    alert("Program data and beneficiaries successfully cached for Offline Field Use!");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-2xl border" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl border" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="gov-card p-12 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800">Program details could not be loaded.</p>
        <button
          onClick={() => fetchProgramDetails()}
          className="px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-xl shadow"
        >
          Retry Connection ↺
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: FolderKanban },
    { id: "work_program", label: `Work Program (${program?.tupadWorkPrograms?.length || 0})`, icon: CalendarCheck },
    { id: "beneficiaries", label: `Beneficiaries (${beneficiaries.length})`, icon: Users },
    { id: "table_rules", label: "Table Rules", icon: TableIcon },
    { id: "work_days", label: `Work Days (${program.workDays?.length || 0})`, icon: Calendar },
    { id: "replacements", label: `Replacements (${replacements.length})`, icon: UserPlus },
    { id: "photos", label: `Accomplishment (${photos.length})`, icon: Camera },
    { id: "reports", label: "Export Reports", icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Top Program Banner */}
      <div className="gov-card p-6 bg-white border-l-4 border-l-gov-blue flex flex-col md:flex-row md:items-center justify-between gap-4 shadow">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-gov-blue border border-blue-200">
              {program.programCode}
            </span>
            <StatusBadge status={program.status} />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {program.programName}
          </h1>
          <p className="text-xs text-slate-500">
            {program.municipality}, {program.province} • {program.requiredWorkDays} Working Days ({program.dailyHours}h/day)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/programs/${program.id}/work-program`}
            className="px-3 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5"
            title="View 10-day TUPAD Work Program schedule and work areas"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-gov-goldLight" />
            <span>TUPAD Work Program</span>
          </a>

          {isAdmin && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition shadow-xs border border-slate-300 flex items-center space-x-1.5"
              title="Edit program details, parameters, schedule, and barangays"
            >
              <Edit2 className="w-3.5 h-3.5 text-gov-blue" />
              <span>Edit Program</span>
            </button>
          )}

          <button
            onClick={handleCacheOffline}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5"
            title="Download records into local browser IndexedDB for offline scanning"
          >
            <Sparkles className="w-3.5 h-3.5 text-gov-goldLight" />
            <span>Cache Offline</span>
          </button>

          {isAdmin && (
            <a
              href={`/programs/${program.id}/import`}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition shadow-xs border border-slate-300 flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-gov-blue" />
              <span>Upload Roster</span>
            </a>
          )}

          <a
            href={`/stubs?programId=${program.id}`}
            className="px-3 py-2 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Stubs</span>
          </a>

          {isAdmin && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg transition border border-rose-200 flex items-center space-x-1"
              title="Permanently delete program and all associated records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="gov-card p-1.5 flex flex-wrap gap-1 bg-slate-100">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                isActive
                  ? "bg-gov-blue text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-gov-goldLight" : "text-slate-400"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {/* 1. OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="gov-card p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Work Program Parameters
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Project Location:</span>
                <span className="font-bold text-slate-800">{program.projectLocation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Partner DOLE Office:</span>
                <span className="font-bold text-slate-800">{program.doleOffice}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Required Work Days:</span>
                <span className="font-bold text-slate-800">{program.requiredWorkDays} Days</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Daily Hours:</span>
                <span className="font-bold text-slate-800">{program.dailyHours} Hours/Day</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Morning Shift:</span>
                <span className="font-bold text-slate-800">{program.morningStart} - {program.morningEnd}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Afternoon Shift:</span>
                <span className="font-bold text-slate-800">{program.afternoonStart} - {program.afternoonEnd}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs">
              <strong className="text-slate-700">Scope of Work: </strong>
              <p className="text-slate-600 mt-1">{program.natureOfWork}</p>
            </div>
          </div>

          <div className="gov-card p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Venues & Participating Barangays
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold text-gov-blue uppercase">Orientation Session</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {formatDate(program.orientationDate)} • {program.orientationTime || "08:30 AM"}
                </p>
                <p className="text-[11px] text-slate-500">{program.orientationVenue}</p>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Payout Distribution</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {formatDate(program.payoutDate)} • {program.payoutTime || "09:00 AM"}
                </p>
                <p className="text-[11px] text-slate-500">{program.payoutVenue}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Participating Barangays:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(program.programBarangays || []).map((b: any) => (
                    <span key={b.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded font-medium">
                      {b.barangayName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.5. WORK PROGRAM */}
      {activeTab === "work_program" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                10-Day TUPAD Work Program & Area Schedules
              </h2>
              <p className="text-[11px] text-slate-500">
                Official daily activity plans, assigned Sitio/Purok work areas, and gender quotas used for attendance and accomplishment reports.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={`/programs/${program.id}/work-program`}
                className="px-3.5 py-1.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5 text-gov-goldLight" />
                <span>Manage / Upload Work Program</span>
              </a>
              <a
                href={`/api/v1/reports/export?type=WORK_PROGRAM&programId=${program.id}`}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </a>
            </div>
          </div>

          {(program.tupadWorkPrograms || []).length === 0 ? (
            <div className="gov-card p-10 text-center space-y-3">
              <p className="text-xs text-slate-400">No 10-Day TUPAD Work Program uploaded yet for this program.</p>
              <a
                href={`/programs/${program.id}/work-program`}
                className="inline-block px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow"
              >
                Upload Work Program Spreadsheet (.XLSX / .CSV)
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {program.tupadWorkPrograms.map((wp: any) => (
                <div key={wp.id} className="gov-card p-4 space-y-3 border-t-2 border-t-gov-blue hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">Barangay {wp.barangay}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-gov-blue font-mono">
                      {wp.beneficiaryCount} Pax
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    <strong className="text-slate-700">Scope:</strong> {wp.natureOfWork}
                  </p>
                  <div className="pt-2 border-t flex items-center justify-between text-xs text-slate-500">
                    <span>{wp.items?.length || 0} Activities Scheduled</span>
                    <a
                      href={`/programs/${program.id}/work-program`}
                      className="text-gov-blue font-bold hover:underline"
                    >
                      View Schedule →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. BENEFICIARIES */}
      {activeTab === "beneficiaries" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Enrolled Beneficiaries ({beneficiaries.length})
            </h2>
            {isAdmin && (
              <div className="flex space-x-2">
                <button
                  onClick={handleGenerateQrs}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition"
                >
                  Generate Missing QRs
                </button>
                <a
                  href={`/programs/${program.id}/import`}
                  className="px-3 py-1.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg transition"
                >
                  Upload Excel Masterlist
                </a>
              </div>
            )}
          </div>

          <div className="gov-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3"># Desig</th>
                    <th className="px-4 py-3">Beneficiary Name</th>
                    <th className="px-4 py-3">Birthday</th>
                    <th className="px-4 py-3">Barangay</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Slot</th>
                    <th className="px-4 py-3">QR Token</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingBene && beneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-xs text-slate-400">
                        <span className="inline-block animate-spin mr-2">⟳</span> Loading enrolled beneficiaries...
                      </td>
                    </tr>
                  ) : beneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-xs text-slate-400">
                        No beneficiaries enrolled yet in this program batch.
                      </td>
                    </tr>
                  ) : (
                    beneficiaries.map((pb) => {
                      const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE");
                      return (
                        <tr key={pb.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-gov-blue">
                            {pb.designatedNumber}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {pb.beneficiary.fullName}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {pb.beneficiary.birthday}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {pb.beneficiary.barangay}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {pb.tableNumber || "-"}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-500">
                            {pb.slotGroup || "Main"}
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                            {activeQr ? activeQr.publicToken : <span className="text-amber-600 font-bold">Pending</span>}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={pb.participationStatus} />
                          </td>
                          <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                            {isAdmin && (
                              <button
                                onClick={() => setBeneficiaryToEdit(pb)}
                                className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-800 border border-slate-300 rounded transition inline-flex items-center space-x-1"
                                title="Edit Beneficiary Details & Status"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            )}
                            <a
                              href={`/beneficiaries/${pb.beneficiary.id}`}
                              className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:text-gov-blue bg-slate-100 hover:bg-slate-200 rounded transition inline-flex items-center space-x-0.5"
                              title="View Full Profile"
                            >
                              <span>Profile</span>
                            </a>
                            {isAdmin && (
                              <button
                                onClick={() => setBeneficiaryToDelete(pb)}
                                className="px-2 py-1 text-[11px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded transition inline-flex items-center space-x-1"
                                title="Delete Entry from Program"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TABLE RULES */}
      {activeTab === "table_rules" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Automatic Table Assignment & Range Configuration
              </h2>
              <p className="text-[11px] text-slate-500">
                Define beneficiary designated number ranges mapped to table numbers with calculated equivalent beneficiary capacities.
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAddingRule(true)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-gov-goldLight font-bold text-xs rounded-lg shadow flex items-center space-x-1 border border-gov-gold/30"
                >
                  <TableIcon className="w-3.5 h-3.5 text-gov-gold" />
                  <span>Configure Table Ranges</span>
                </button>
              </div>
            )}
          </div>

          <div className="gov-card overflow-hidden shadow">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Configured Table Rules ({tableRules.length} Tables)
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Total Enrolled: <strong>{beneficiaries.length}</strong> Beneficiaries
              </span>
            </div>

            {tableRules.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-3">
                <p>No table assignment rules defined yet.</p>
                <button
                  onClick={() => setIsAddingRule(true)}
                  className="px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg"
                >
                  Create Initial Table Ranges
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                    <tr>
                      <th className="px-4 py-3">Table Assignment</th>
                      <th className="px-4 py-3">Designated Range</th>
                      <th className="px-4 py-3 text-center">Equivalent Beneficiary Count</th>
                      <th className="px-4 py-3 text-center">Actual Enrolled in Range</th>
                      <th className="px-4 py-3">Slot / Group Tag</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableRules.map((r: any) => {
                      const capacity = Math.max(0, r.endNumber - r.startNumber + 1);
                      const actualInRang = beneficiaries.filter((b) => {
                        const num = parseInt(b.designatedNumber, 10);
                        return !isNaN(num) && num >= r.startNumber && num <= r.endNumber;
                      }).length;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-extrabold text-gov-blue text-sm">
                            {r.tableNumber}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            #{r.startNumber} — #{r.endNumber}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-blue-50 text-gov-blue border border-blue-200 inline-block">
                              {capacity} Beneficiaries
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">
                            {actualInRang} Assigned
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {r.slotGroup || "Main Regular"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. WORK DAYS */}
      {activeTab === "work_days" && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            10-Day Work Schedule
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {(program.workDays || []).map((wd: any) => (
              <div key={wd.id} className="gov-card p-3.5 space-y-1.5 border-t-2 border-t-gov-blue">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gov-blue text-xs">Day {wd.dayNumber}</span>
                  <StatusBadge status={wd.status} />
                </div>
                <p className="font-bold text-slate-800 text-xs">{formatDate(wd.workDate, "MMM dd, yyyy")}</p>
                <p className="text-[11px] text-slate-400 line-clamp-1">{wd.description || "Community Activities"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. REPLACEMENTS */}
      {activeTab === "replacements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Onsite Replacements Audit Trail
            </h2>
            <a
              href={`/replacements?programId=${program.id}`}
              className="px-3 py-1.5 bg-gov-blue text-white font-bold text-xs rounded-lg"
            >
              Process New Replacement
            </a>
          </div>

          <div className="gov-card divide-y">
            {replacements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No replacements registered for this program.</div>
            ) : (
              replacements.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-600 line-through">
                        {r.originalProgramBeneficiary?.beneficiary?.fullName}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-bold text-emerald-700">
                        {r.replacementProgramBeneficiary?.beneficiary?.fullName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Reason: {r.reason} • Initiated by: {r.initiatedBy?.fullName}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. ACCOMPLISHMENT PHOTOS */}
      {activeTab === "photos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Accomplishment Photo Documentation
            </h2>
            <a
              href="/field/photos"
              className="px-3 py-1.5 bg-gov-blue text-white font-bold text-xs rounded-lg"
            >
              Upload Geotagged Photo
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="gov-card overflow-hidden space-y-2">
                <div className="h-40 bg-slate-900 relative flex items-center justify-center text-white">
                  <Camera className="w-8 h-8 text-slate-500" />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/70 p-2 rounded text-[10px] backdrop-blur-sm">
                    <p className="font-bold text-gov-goldLight">Brgy. {p.barangay}, Dingalan</p>
                    <p className="text-slate-300">GPS: {p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}</p>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Day {p.workDay?.dayNumber || 1}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. REPORTS */}
      {activeTab === "reports" && (
        <div className="gov-card p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Download TUPAD Official Workbooks
            </h2>
            <p className="text-xs text-slate-500">
              Generate formatted spreadsheets strictly matching Dingalan TUPAD templates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reference 2 */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-gov-blue bg-slate-50/50 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">10-Day Attendance Matrix (.XLSX)</h3>
                  <p className="text-[11px] text-slate-500">Reference 2 Layout: Designated #, Name, AM/PM In/Out</p>
                </div>
              </div>
              <a
                href={`/api/v1/reports/export?type=ATTENDANCE&programId=${program.id}`}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Attendance Excel</span>
              </a>
            </div>

            {/* Reference 3 */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-gov-blue bg-slate-50/50 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 text-gov-blue">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Accomplishment Workbook (.XLSX)</h3>
                  <p className="text-[11px] text-slate-500">Reference 3: 11 Barangay Worksheets with Signatories</p>
                </div>
              </div>
              <a
                href={`/api/v1/reports/export?type=ACCOMPLISHMENT&programId=${program.id}`}
                className="w-full py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Barangay Accomplishment Excel</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {program && (
        <>
          <TableAssignmentModal
            isOpen={isAddingRule}
            onClose={() => setIsAddingRule(false)}
            programId={program.id}
            programName={program.programName}
            totalBeneficiaryCount={beneficiaries.length}
            onRulesUpdated={() => {
              fetchProgramDetails();
            }}
          />

          <EditProgramModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            program={program}
            onProgramUpdated={() => {
              fetchProgramDetails();
            }}
          />

          <DeleteProgramModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            program={program}
            beneficiaryCount={beneficiaries.length}
          />

          {/* Delete Beneficiary Entry Modal */}
          {beneficiaryToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border-t-4 border-t-rose-600">
                <div className="flex items-center space-x-3 text-rose-700">
                  <div className="p-2.5 bg-rose-100 rounded-full">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Delete Beneficiary Entry</h3>
                    <p className="text-xs text-slate-500 font-medium">Remove from {program.programCode}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Designated #:</span>
                    <span className="font-mono font-bold text-gov-blue">#{beneficiaryToDelete.designatedNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Beneficiary Name:</span>
                    <span className="font-bold text-slate-900">{beneficiaryToDelete.beneficiary?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Barangay:</span>
                    <span className="font-semibold text-slate-700">{beneficiaryToDelete.beneficiary?.barangay}</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <p className="font-bold">⚠️ Warning:</p>
                  <p className="text-[11px] leading-relaxed">
                    This will delete this beneficiary entry, their active QR code, orientation status, and any logged daily attendance for this program.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBeneficiaryToDelete(null)}
                    disabled={isDeletingBene}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBeneficiary(false)}
                    disabled={isDeletingBene}
                    className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingBene ? "Deleting..." : "Confirm & Delete Entry"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Edit Beneficiary Modal */}
          {beneficiaryToEdit && (
            <EditBeneficiaryModal
              isOpen={!!beneficiaryToEdit}
              onClose={() => setBeneficiaryToEdit(null)}
              programId={program.id}
              programBeneficiary={beneficiaryToEdit}
              onUpdated={(updatedPb) => {
                setBeneficiaries((prev) =>
                  prev.map((b) => (b.id === updatedPb.id ? { ...b, ...updatedPb } : b))
                );
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
