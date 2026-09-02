"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ParsedBarangayWorkProgram, WorkProgramPreviewResult } from "@/lib/work-program-parser";
import { useAuth } from "@/context/AuthContext";

export default function WorkProgramManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "PESO_ADMIN";

  const [program, setProgram] = useState<any>(null);
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload & Preview state
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<WorkProgramPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Active view state
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | "ALL">("ALL");

  // Activity Edit/Add modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [activityForm, setActivityForm] = useState({
    dayNumber: 1,
    specificActivities: "",
    area: "",
    maleCount: 0,
    femaleCount: 0,
    scPwdMaleCount: 0,
    scPwdFemaleCount: 0,
    totalCount: 0,
  });

  useEffect(() => {
    fetchProgramAndWorkPrograms();
  }, [params.id]);

  const fetchProgramAndWorkPrograms = async () => {
    try {
      setLoading(true);
      const resProg = await fetch(`/api/v1/programs/${params.id}`);
      if (resProg.ok) {
        const data = await resProg.json();
        setProgram(data.program);
      }

      const resWp = await fetch(`/api/v1/programs/${params.id}/work-program`);
      if (resWp.ok) {
        const data = await resWp.json();
        const wps = data.workPrograms || [];
        setWorkPrograms(wps);
        if (user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay) {
          setSelectedBarangay(user.assignedBarangay);
        } else if (wps.length > 0 && !selectedBarangay) {
          setSelectedBarangay(wps[0].barangay);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setError(null);
    }
  };

  const handleUploadPreview = async () => {
    if (!file) {
      setError("Please select an Excel (.xlsx / .xls) or CSV spreadsheet.");
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/programs/${params.id}/work-program/preview`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse work program spreadsheet");

      setPreview(data.preview);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleCommitWorkProgram = async () => {
    if (!preview || preview.programs.length === 0) return;

    setCommitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/programs/${params.id}/work-program/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programs: preview.programs }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit work program");

      alert(`Successfully saved TUPAD Work Program for ${data.committedBarangays} Barangays with ${data.committedActivities} activities!`);
      setPreview(null);
      setFile(null);
      setIsUploadModalOpen(false);
      fetchProgramAndWorkPrograms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentWp = workPrograms.find((w) => w.barangay === selectedBarangay);
      if (!currentWp) return;

      if (editingItem) {
        // Update
        const res = await fetch(`/api/v1/programs/${params.id}/work-program`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingItem.id,
            ...activityForm,
          }),
        });
        if (!res.ok) throw new Error("Failed to update activity");
      } else {
        // Create
        const res = await fetch(`/api/v1/programs/${params.id}/work-program`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workProgramId: currentWp.id,
            ...activityForm,
          }),
        });
        if (!res.ok) throw new Error("Failed to create activity");
      }

      setIsActivityModalOpen(false);
      setEditingItem(null);
      fetchProgramAndWorkPrograms();
    } catch (e: any) {
      alert(e.message || "Failed to save activity");
    }
  };

  const handleDeleteActivity = async (itemId: string) => {
    if (!confirm("Are you sure you want to remove this activity from the work plan?")) return;
    try {
      const res = await fetch(`/api/v1/programs/${params.id}/work-program?itemId=${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProgramAndWorkPrograms();
      }
    } catch (e) {
      alert("Failed to delete activity");
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading TUPAD Work Program Hub...</div>;
  }

  const currentWp = workPrograms.find((w) => w.barangay === selectedBarangay) || workPrograms[0];
  const items = currentWp?.items || [];
  const filteredItems = selectedDayFilter === "ALL" ? items : items.filter((it: any) => it.dayNumber === selectedDayFilter);

  const totalActivities = workPrograms.reduce((acc, wp) => acc + (wp.items?.length || 0), 0);
  const totalTargetBeneficiaries = workPrograms.reduce((acc, wp) => acc + (wp.beneficiaryCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="gov-card p-6 bg-white border-l-4 border-l-gov-blue flex flex-col md:flex-row md:items-center justify-between gap-4 shadow">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-gov-blue border border-blue-200">
              {program?.programCode}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              10-DAY WORK PROGRAM
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            TUPAD Work Program Management & Automation
          </h1>
          <p className="text-xs text-slate-500">
            Official 10-day activity schedules, work area allocations (Sitio/Purok), and gender quotas per Barangay
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/v1/programs/${params.id}/work-program/template`}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition border border-slate-300 flex items-center space-x-1.5"
            title="Download blank 10-day TUPAD work program spreadsheet template"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Template (.XLSX)</span>
          </a>

          {isAdmin && (
            <button
              onClick={() => {
                setIsUploadModalOpen(true);
                setPreview(null);
                setFile(null);
              }}
              className="px-3.5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5"
            >
              <UploadCloud className="w-4 h-4 text-gov-goldLight" />
              <span>Upload Work Program</span>
            </button>
          )}

          <a
            href={`/api/v1/reports/export?type=WORK_PROGRAM&programId=${params.id}`}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-200" />
            <span>Export 10-Day Plan</span>
          </a>

          <a
            href={`/programs/${params.id}`}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border rounded-lg"
          >
            Back to Hub
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="gov-card p-4 bg-white border-l-4 border-l-blue-600">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured Barangays</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{workPrograms.length} <span className="text-xs font-normal text-slate-500">Barangays</span></p>
        </div>

        <div className="gov-card p-4 bg-white border-l-4 border-l-emerald-600">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Scheduled Activities</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalActivities} <span className="text-xs font-normal text-slate-500">Activities</span></p>
        </div>

        <div className="gov-card p-4 bg-white border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Beneficiaries</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalTargetBeneficiaries} <span className="text-xs font-normal text-slate-500">Pax</span></p>
        </div>

        <div className="gov-card p-4 bg-white border-l-4 border-l-indigo-600">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Standard Working Hours</span>
          <p className="text-xs font-bold text-slate-800 mt-2 line-clamp-1">8:00 AM–12:00 NN | 1:00 PM–5:00 PM</p>
        </div>
      </div>

      {/* UPLOAD & PREVIEW MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <UploadCloud className="w-5 h-5 text-gov-blue" />
                  <span>Upload TUPAD Work Program (.xlsx / .csv)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Upload official 10-day work plan spreadsheets containing project locations, daily activities, areas, and gender distributions.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!preview && (
              <div className="border-2 border-dashed border-slate-300 hover:border-gov-blue p-8 rounded-2xl text-center space-y-4 transition">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-gov-blue flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Select or Drag TUPAD Work Program File</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Multi-barangay workbooks (Paltic, Matawe, Caragsacan, Umiray, etc.) and consolidated CSVs are automatically recognized.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <label className="px-5 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow cursor-pointer transition">
                    <span>{file ? file.name : "Choose File"}</span>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                  </label>

                  {file && (
                    <button
                      onClick={handleUploadPreview}
                      disabled={parsing}
                      className="px-5 py-2.5 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {parsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{parsing ? "Parsing Work Plans..." : "Validate & Preview Rows"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PREVIEW SECTION */}
            {preview && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="text-xs font-bold text-gov-goldLight">Spreadsheet Pre-Validation Result</p>
                    <p className="text-[11px] text-slate-300">
                      Found <strong>{preview.totalBarangays} Barangays</strong> with <strong>{preview.totalActivities} scheduled activities</strong> ({preview.totalTargetBeneficiaries} target beneficiaries).
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPreview(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                    >
                      Change File
                    </button>
                    <button
                      onClick={handleCommitWorkProgram}
                      disabled={committing}
                      className="px-5 py-1.5 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-black text-xs rounded-lg shadow flex items-center space-x-1 disabled:opacity-50"
                    >
                      {committing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{committing ? "Saving to Database..." : "Commit Work Program"}</span>
                    </button>
                  </div>
                </div>

                {/* Barangay Validation Cards */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto">
                  {preview.programs.map((p) => {
                    const isMatched = p.validation.status === "MATCHED";
                    return (
                      <div
                        key={p.barangay}
                        className={`p-3.5 rounded-xl border ${
                          isMatched ? "bg-emerald-50/40 border-emerald-200" : "bg-amber-50/50 border-amber-200"
                        } space-y-2`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gov-blue" />
                            <strong className="text-xs text-slate-900">Barangay {p.barangay}</strong>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white font-bold text-slate-700 border">
                              {p.items.length} Activities
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isMatched
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isMatched ? "✓ Matched with Masterlist" : "⚠ Check Masterlist Alignment"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Work Plan Target:</span>
                            <strong className="text-slate-800">{p.beneficiaryCount} Pax</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Masterlist Enrolled:</span>
                            <strong className="text-slate-800">{p.validation.masterlistCount} Pax</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Gender (M / F):</span>
                            <span>{p.validation.masterlistMaleCount} Male / {p.validation.masterlistFemaleCount} Female</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">PWD / Senior:</span>
                            <span>{p.validation.masterlistPwdCount} PWD / {p.validation.masterlistSeniorCount} SC</span>
                          </div>
                        </div>

                        {p.validation.warnings.length > 0 && (
                          <div className="space-y-0.5 text-[10px] text-amber-700">
                            {p.validation.warnings.map((w, idx) => (
                              <p key={idx} className="flex items-center space-x-1">
                                <span>•</span>
                                <span>{w}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE WORK PROGRAM SCHEDULE VIEWER */}
      {workPrograms.length === 0 ? (
        <div className="gov-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No TUPAD Work Program Uploaded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload the 10-day TUPAD Work Program spreadsheet to automate work area attendance tracking and accomplishment reporting.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow"
          >
            Upload Work Program File (.XLSX / .CSV)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barangay Tabs Navigation */}
          <div className="gov-card p-2 bg-slate-100 flex flex-wrap gap-1.5 overflow-x-auto">
            {workPrograms.map((wp) => {
              const isActive = wp.barangay === selectedBarangay;
              return (
                <button
                  key={wp.id}
                  onClick={() => setSelectedBarangay(wp.barangay)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    isActive
                      ? "bg-gov-blue text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Building className={`w-3.5 h-3.5 ${isActive ? "text-gov-goldLight" : "text-slate-400"}`} />
                  <span>{wp.barangay}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {wp.beneficiaryCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Barangay Details & Schedule */}
          {currentWp && (
            <div className="gov-card p-6 space-y-6">
              {/* Header Details Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-black text-slate-900">
                      Barangay {currentWp.barangay}
                    </h2>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-gov-blue">
                      Target: {currentWp.beneficiaryCount} Beneficiaries
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Nature of Work:</strong> {currentWp.natureOfWork}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <strong className="text-slate-700">Working Hours:</strong> {currentWp.workingHours}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setActivityForm({
                          dayNumber: 1,
                          specificActivities: "",
                          area: "",
                          maleCount: 0,
                          femaleCount: 0,
                          scPwdMaleCount: 0,
                          scPwdFemaleCount: 0,
                          totalCount: 0,
                        });
                        setIsActivityModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-gov-goldLight" />
                      <span>Add Activity</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Day Filter Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-500 uppercase flex-shrink-0">Filter Day:</span>
                <button
                  onClick={() => setSelectedDayFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    selectedDayFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All 10 Days
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDayFilter(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 ${
                      selectedDayFilter === d
                        ? "bg-gov-blue text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Day {d}
                  </button>
                ))}
              </div>

              {/* Activities Table */}
              <div className="gov-card overflow-hidden border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b">
                      <tr>
                        <th className="px-4 py-3">Day #</th>
                        <th className="px-4 py-3">Specific Activities</th>
                        <th className="px-4 py-3">Assigned Work Area (Purok / Sitio)</th>
                        <th className="px-4 py-3 text-center">Male</th>
                        <th className="px-4 py-3 text-center">Female</th>
                        <th className="px-4 py-3 text-center">SC/PWD</th>
                        <th className="px-4 py-3 text-center">Total</th>
                        {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-xs text-slate-400">
                            No activities scheduled for this day filter.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((it: any) => (
                          <tr key={it.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-black text-gov-blue font-mono">
                              Day {it.dayNumber}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 max-w-sm">
                              {it.specificActivities}
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-medium">
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-gov-gold flex-shrink-0" />
                                <span>{it.area}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                              {it.maleCount || "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                              {it.femaleCount || "-"}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-500">
                              {(it.scPwdMaleCount || 0) + (it.scPwdFemaleCount || 0) || "-"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-blue-50 text-gov-blue border border-blue-200">
                                {it.totalCount || it.maleCount + it.femaleCount} Pax
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-right space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingItem(it);
                                    setActivityForm({
                                      dayNumber: it.dayNumber,
                                      specificActivities: it.specificActivities,
                                      area: it.area,
                                      maleCount: it.maleCount || 0,
                                      femaleCount: it.femaleCount || 0,
                                      scPwdMaleCount: it.scPwdMaleCount || 0,
                                      scPwdFemaleCount: it.scPwdFemaleCount || 0,
                                      totalCount: it.totalCount || 0,
                                    });
                                    setIsActivityModalOpen(true);
                                  }}
                                  className="p-1 text-slate-500 hover:text-gov-blue rounded"
                                  title="Edit activity"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteActivity(it.id)}
                                  className="p-1 text-slate-500 hover:text-rose-600 rounded"
                                  title="Delete activity"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT ACTIVITY MODAL */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleSaveActivity}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {editingItem ? "Edit Work Program Activity" : `Add Activity for ${selectedBarangay}`}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Work Day #</label>
                <select
                  value={activityForm.dayNumber}
                  onChange={(e) => setActivityForm({ ...activityForm, dayNumber: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                    <option key={d} value={d}>Day {d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Work Area (Purok/Sitio) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purok Mulawin to Ipil-ipil"
                  value={activityForm.area}
                  onChange={(e) => setActivityForm({ ...activityForm, area: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specific Activity Description *</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. De-clogging of canals, creeks, waterways, and drainage inlets..."
                value={activityForm.specificActivities}
                onChange={(e) => setActivityForm({ ...activityForm, specificActivities: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Male Quota</label>
                <input
                  type="number"
                  min={0}
                  value={activityForm.maleCount}
                  onChange={(e) => setActivityForm({ ...activityForm, maleCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Female Quota</label>
                <input
                  type="number"
                  min={0}
                  value={activityForm.femaleCount}
                  onChange={(e) => setActivityForm({ ...activityForm, femaleCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Pax</label>
                <input
                  type="number"
                  min={0}
                  value={activityForm.totalCount || activityForm.maleCount + activityForm.femaleCount}
                  onChange={(e) => setActivityForm({ ...activityForm, totalCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold bg-slate-50"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="px-4 py-2 text-xs font-bold border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow"
              >
                Save Activity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
