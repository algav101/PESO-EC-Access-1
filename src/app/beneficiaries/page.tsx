"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  QrCode,
  ArrowRight,
  Table as TableIcon,
  Trash2,
  AlertTriangle,
  Edit2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";
import { EditBeneficiaryModal } from "@/components/beneficiaries/EditBeneficiaryModal";
import { AdminStubOverrideModal } from "@/components/beneficiaries/AdminStubOverrideModal";
import { useAuth } from "@/context/AuthContext";
import { offlineDb } from "@/lib/dexie";
import { isAdminUser } from "@/lib/permissions";

export default function BeneficiariesMasterlistPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedBarangay, setSelectedBarangay] = useState<string>("ALL");
  const [selectedSitio, setSelectedSitio] = useState<string>("ALL");
  const [selectedStubStatus, setSelectedStubStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Set assigned barangay on load for TUPAD Coordinators
  useEffect(() => {
    if (user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay) {
      setSelectedBarangay(user.assignedBarangay);
    }
  }, [user]);

  // Sorting State
  const [sortBy, setSortBy] = useState<string>("designatedNumber");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  // Editing, Override & Deletion state
  const [beneficiaryToEdit, setBeneficiaryToEdit] = useState<any | null>(null);
  const [stubOverridePb, setStubOverridePb] = useState<any | null>(null);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 1. Instant Cache Load from local IndexedDB (takes < 15ms)
    async function loadCachedFirst() {
      try {
        const [cachedProgs, cachedBenes] = await Promise.all([
          offlineDb.cachedPrograms.toArray(),
          offlineDb.cachedBeneficiaries.toArray(),
        ]);

        if (cachedProgs && cachedProgs.length > 0) {
          setPrograms(cachedProgs);
          setSelectedProgram((prev) => prev || cachedProgs[0].id);
        }

        if (cachedBenes && cachedBenes.length > 0) {
          const mapped = cachedBenes.map((c) => ({
            id: c.id,
            designatedNumber: c.designatedNumber,
            tableNumber: c.tableNumber,
            participationStatus: c.status || "ACTIVE",
            beneficiary: {
              id: c.beneficiaryId,
              fullName: c.fullName,
              birthday: c.birthday,
              barangay: c.barangay,
              sitio: c.sitio,
              beneficiaryNumber: c.designatedNumber,
            },
            qrCodes: c.qrToken ? [{ publicToken: c.qrToken, status: "ACTIVE" }] : [],
            stubDistributions: [],
            orientationAttendance: [],
            attendanceRecords: [],
            payouts: [],
          }));
          setBeneficiaries(mapped);
          setLoading(false);
        }
      } catch (e) {}
    }
    loadCachedFirst();

    // 2. Background Network Sync
    fetchProgramsAndBeneficiaries();
  }, []);

  const fetchProgramsAndBeneficiaries = async () => {
    try {
      const pRes = await fetch("/api/v1/programs");
      if (pRes.ok) {
        const pData = await pRes.json();
        const progs = pData.programs || [];
        setPrograms(progs);
        if (progs.length > 0) {
          const activeProgId = selectedProgram || progs[0].id;
          setSelectedProgram(activeProgId);
          await fetchBeneficiaries(activeProgId);
        } else {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchBeneficiaries = async (programId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${programId}/beneficiaries`);
      if (res.ok) {
        const data = await res.json();
        setBeneficiaries(data.beneficiaries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBeneficiary = async (deleteGlobal: boolean = false) => {
    if (!beneficiaryToDelete) return;
    setIsDeleting(true);
    try {
      const progId = beneficiaryToDelete.programId || selectedProgram;
      const res = await fetch(
        `/api/v1/programs/${progId}/beneficiaries?programBeneficiaryId=${beneficiaryToDelete.id}&deleteGlobal=${deleteGlobal}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete beneficiary");

      setBeneficiaries((prev) => prev.filter((b) => b.id !== beneficiaryToDelete.id));
      setBeneficiaryToDelete(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProgramChange = (progId: string) => {
    setSelectedProgram(progId);
    setSelectedSitio("ALL");
    fetchBeneficiaries(progId);
  };

  // Collect unique Puroks / Sitios dynamically
  const uniqueSitios = useMemo(() => {
    const list = beneficiaries
      .filter((pb) => selectedBarangay === "ALL" || pb.beneficiary?.barangay === selectedBarangay)
      .map((pb) => pb.beneficiary?.sitio)
      .filter(Boolean);
    return Array.from(new Set(list)).sort((a: any, b: any) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [beneficiaries, selectedBarangay]);

  // Filter beneficiaries
  const filtered = useMemo(() => {
    return beneficiaries.filter((pb) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        pb.designatedNumber?.toLowerCase().includes(q) ||
        pb.beneficiary?.fullName?.toLowerCase().includes(q) ||
        (pb.beneficiary?.sitio && pb.beneficiary.sitio.toLowerCase().includes(q)) ||
        (pb.tableNumber && pb.tableNumber.toLowerCase().includes(q));
      const matchesBrgy = selectedBarangay === "ALL" || pb.beneficiary?.barangay === selectedBarangay;
      const matchesSitio = selectedSitio === "ALL" || pb.beneficiary?.sitio === selectedSitio;

      const isReplaced = pb.participationStatus === "REPLACED";
      if (selectedStubStatus === "REPLACED") {
        return matchesSearch && matchesBrgy && matchesSitio && isReplaced;
      }
      if (isReplaced) return false;

      const isDist = Boolean(pb.stubDistributions?.some((d: any) => d.status === "DISTRIBUTED"));
      const isFlagged =
        pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
        Boolean(pb.stubDistributions?.some((d: any) => d.status === "FLAGGED_REPLACEMENT"));

      const matchesStub =
        selectedStubStatus === "ALL" ||
        (selectedStubStatus === "DISTRIBUTED" && isDist && !isFlagged) ||
        (selectedStubStatus === "FLAGGED_REPLACEMENT" && isFlagged) ||
        (selectedStubStatus === "PENDING" && !isDist && !isFlagged);

      return matchesSearch && matchesBrgy && matchesSitio && matchesStub;
    });
  }, [beneficiaries, searchQuery, selectedBarangay, selectedSitio, selectedStubStatus]);

  // Sort beneficiaries (supports Purok/Sitio, Designated #, Name, Barangay, Table, Stub & Affirmation, Orientation, etc.)
  const sortedBeneficiaries = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comp = 0;
      if (sortBy === "designatedNumber") {
        const numA = parseInt(a.designatedNumber, 10);
        const numB = parseInt(b.designatedNumber, 10);
        if (!isNaN(numA) && !isNaN(numB)) comp = numA - numB;
        else comp = String(a.designatedNumber || "").localeCompare(String(b.designatedNumber || ""), undefined, { numeric: true });
      } else if (sortBy === "sitio") {
        const sitioA = (a.beneficiary?.sitio || "").trim();
        const sitioB = (b.beneficiary?.sitio || "").trim();
        comp = sitioA.localeCompare(sitioB, undefined, { numeric: true });
        if (comp === 0) {
          comp = (a.beneficiary?.fullName || "").localeCompare(b.beneficiary?.fullName || "");
        }
      } else if (sortBy === "fullName") {
        comp = (a.beneficiary?.fullName || "").localeCompare(b.beneficiary?.fullName || "");
      } else if (sortBy === "birthday") {
        comp = (a.beneficiary?.birthday || "").localeCompare(b.beneficiary?.birthday || "");
      } else if (sortBy === "barangay") {
        comp = (a.beneficiary?.barangay || "").localeCompare(b.beneficiary?.barangay || "");
        if (comp === 0) {
          const sitioA = (a.beneficiary?.sitio || "").trim();
          const sitioB = (b.beneficiary?.sitio || "").trim();
          comp = sitioA.localeCompare(sitioB, undefined, { numeric: true });
        }
      } else if (sortBy === "tableNumber") {
        const tblA = String(a.tableNumber || "");
        const tblB = String(b.tableNumber || "");
        comp = tblA.localeCompare(tblB, undefined, { numeric: true });
      } else if (sortBy === "stubAffirmation") {
        const getStubRank = (pb: any) => {
          if (
            pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
            pb.stubDistributions?.some((d: any) => d.status === "FLAGGED_REPLACEMENT")
          ) {
            return 3; // Flagged for Replacement
          }
          if (pb.stubDistributions?.some((d: any) => d.status === "DISTRIBUTED")) {
            return 1; // Affirmed & Distributed
          }
          return 2; // Uninformed / Pending
        };

        const rankA = getStubRank(a);
        const rankB = getStubRank(b);
        comp = rankA - rankB;
        if (comp === 0) {
          const numA = parseInt(a.designatedNumber, 10);
          const numB = parseInt(b.designatedNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) comp = numA - numB;
          else comp = String(a.designatedNumber || "").localeCompare(String(b.designatedNumber || ""), undefined, { numeric: true });
        }
      } else if (sortBy === "orientation") {
        const isOrientedA = Boolean(a.orientationAttendance && a.orientationAttendance.length > 0) ? 1 : 2;
        const isOrientedB = Boolean(b.orientationAttendance && b.orientationAttendance.length > 0) ? 1 : 2;
        comp = isOrientedA - isOrientedB;
        if (comp === 0) {
          const numA = parseInt(a.designatedNumber, 10);
          const numB = parseInt(b.designatedNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) comp = numA - numB;
          else comp = String(a.designatedNumber || "").localeCompare(String(b.designatedNumber || ""), undefined, { numeric: true });
        }
      } else if (sortBy === "attendance") {
        comp = (a.attendanceRecords?.length || 0) - (b.attendanceRecords?.length || 0);
      } else if (sortBy === "status") {
        comp = (a.participationStatus || "").localeCompare(b.participationStatus || "");
      }
      return sortOrder === "ASC" ? comp : -comp;
    });
  }, [filtered, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(field);
      setSortOrder("ASC");
    }
  };

  const renderSortHeader = (label: string, field: string) => {
    const isActive = sortBy === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="px-4 py-3 cursor-pointer select-none hover:bg-slate-200/80 transition group"
        title={`Click to sort by ${label}`}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          <span className="text-slate-400 group-hover:text-gov-blue">
            {isActive ? (
              sortOrder === "ASC" ? (
                <ChevronUp className="w-3.5 h-3.5 text-gov-blue font-bold" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gov-blue font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const barangays = [
    "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
    "Dikapanikian", "Ibona", "Matawe", "Paltic",
    "Poblacion", "Tanawan", "Umiray"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-gov-blue" />
            <span>Beneficiaries Masterlist</span>
          </h1>
          <p className="text-xs text-slate-500">
            Comprehensive TUPAD roster, Purok/Sitio sorting & filtering, table assignments, and attendance track
          </p>
        </div>

        {selectedProgram && (isAdmin || can("beneficiary.import")) && (
          <a
            href={`/programs/${selectedProgram}/import`}
            className="px-3.5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
          >
            Import Excel Batch
          </a>
        )}
      </div>

      {/* Coordinator Scoped Scope Banner */}
      {user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>Assigned Coordinator Scope: Showing Beneficiaries for <strong>Barangay {user.assignedBarangay}</strong> only.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-950 rounded uppercase tracking-wider">
            Barangay Restricted
          </span>
        </div>
      )}

      {/* Filter & Sort Bar */}
      <div className="gov-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Select Program */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.programCode} - {p.programName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Barangay */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Barangay</label>
            <select
              value={selectedBarangay}
              disabled={user?.role === "TUPAD_COORDINATOR" && !!user.assignedBarangay}
              onChange={(e) => {
                setSelectedBarangay(e.target.value);
                setSelectedSitio("ALL");
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:border-gov-blue font-semibold disabled:bg-slate-100 disabled:text-slate-500"
            >
              {!(user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay) && (
                <option value="ALL">All Barangays</option>
              )}
              {barangays
                .filter((b) => !(user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay) || b === user.assignedBarangay)
                .map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
            </select>
          </div>

          {/* Filter Purok / Sitio */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-gov-blue" />
              <span>Filter Purok / Sitio</span>
            </label>
            <select
              value={selectedSitio}
              onChange={(e) => setSelectedSitio(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:border-gov-blue font-semibold text-slate-800"
            >
              <option value="ALL">All Puroks & Sitios ({uniqueSitios.length})</option>
              {uniqueSitios.map((s: any) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Stub & Affirmation */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              <span>Stub & Affirmation</span>
            </label>
            <select
              value={selectedStubStatus}
              onChange={(e) => setSelectedStubStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:border-gov-blue font-semibold text-slate-800"
            >
              <option value="ALL">All Active Target Beneficiaries</option>
              <option value="DISTRIBUTED">✓ Affirmed & Distributed</option>
              <option value="PENDING">⏳ Uninformed (Pending)</option>
              <option value="FLAGGED_REPLACEMENT">🚩 Flagged Replacement</option>
              <option value="REPLACED">Archived (Replaced Onsite)</option>
            </select>
          </div>

          {/* Search Beneficiary */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Beneficiary</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, purok, #, table..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white"
              />
            </div>
          </div>
        </div>

        {/* Quick Sorting Toolbar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-600 text-[11px] uppercase flex items-center space-x-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gov-blue" />
              <span>Sort Order:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "Purok / Sitio", field: "sitio" },
                { label: "# Desig", field: "designatedNumber" },
                { label: "Full Name", field: "fullName" },
                { label: "Barangay", field: "barangay" },
                { label: "Table Assignment", field: "tableNumber" },
                { label: "Stub & Affirmation", field: "stubAffirmation" },
                { label: "Orientation", field: "orientation" },
                { label: "Status", field: "status" },
              ].map(({ label, field }) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 border ${
                    sortBy === field
                      ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                  }`}
                >
                  <span>{label}</span>
                  {sortBy === field && (
                    <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {(selectedBarangay !== "ALL" || selectedSitio !== "ALL" || selectedStubStatus !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBarangay("ALL");
                setSelectedSitio("ALL");
                setSelectedStubStatus("ALL");
                setSearchQuery("");
                setSortBy("designatedNumber");
                setSortOrder("ASC");
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Masterlist Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Showing {sortedBeneficiaries.length} of {beneficiaries.length} Beneficiaries
            {sortBy === "sitio" && (
              <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-gov-blue font-bold text-[10px]">
                Sorted by Purok / Sitio ({sortOrder})
              </span>
            )}
            {sortBy === "stubAffirmation" && (
              <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                Sorted by Stub & Affirmation ({sortOrder === "ASC" ? "Affirmed → Pending → Flagged" : "Flagged → Pending → Affirmed"})
              </span>
            )}
            {sortBy === "orientation" && (
              <span className="ml-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                Sorted by Orientation ({sortOrder === "ASC" ? "Present First" : "Pending First"})
              </span>
            )}
          </span>
        </div>

        {loading && beneficiaries.length === 0 ? (
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-gov-blue">
              <span className="inline-block animate-spin mr-1">⟳</span>
              <span>Loading beneficiaries masterlist...</span>
            </div>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-lg animate-pulse flex items-center px-4 justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-4 bg-slate-200 rounded"></div>
                    <div className="w-48 h-4 bg-slate-200 rounded"></div>
                    <div className="w-24 h-4 bg-slate-200 rounded"></div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-4 bg-slate-200 rounded"></div>
                    <div className="w-16 h-4 bg-slate-200 rounded"></div>
                    <div className="w-20 h-6 bg-slate-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : sortedBeneficiaries.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No beneficiaries match criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b">
                <tr>
                  {renderSortHeader("# Desig", "designatedNumber")}
                  {renderSortHeader("Full Name", "fullName")}
                  {renderSortHeader("Birthday", "birthday")}
                  {renderSortHeader("Barangay / Sitio", "sitio")}
                  {renderSortHeader("Table Assignment", "tableNumber")}
                  {renderSortHeader("Stub & Affirmation", "stubAffirmation")}
                  {renderSortHeader("Orientation", "orientation")}
                  {renderSortHeader("Attendance", "attendance")}
                  {renderSortHeader("Status", "status")}
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedBeneficiaries.map((pb) => {
                  if (!pb) return null;
                  const isOriented = Boolean(pb.orientationAttendance && pb.orientationAttendance.length > 0);
                  const attendCount = Array.isArray(pb.attendanceRecords) ? pb.attendanceRecords.length : 0;
                  const dist = Array.isArray(pb.stubDistributions)
                    ? pb.stubDistributions.find((d: any) => d?.status === "DISTRIBUTED")
                    : null;
                  const flaggedDist = Array.isArray(pb.stubDistributions)
                    ? pb.stubDistributions.find((d: any) => d?.status === "FLAGGED_REPLACEMENT")
                    : null;
                  const isFlagged =
                    pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
                    Boolean(flaggedDist);

                  const flagRemarks = flaggedDist?.remarks || pb.stubDistributions?.[0]?.remarks || "";

                  const formattedDistDate = dist?.distributedAt
                    ? new Date(dist.distributedAt).toLocaleDateString()
                    : "";

                  return (
                    <tr key={pb.id || Math.random()} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-gov-blue">
                        {pb.designatedNumber || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{pb.beneficiary?.fullName || "Unnamed"}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{pb.beneficiary?.beneficiaryNumber || pb.designatedNumber || "-"}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {pb.beneficiary?.birthday || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">{pb.beneficiary?.barangay || "-"}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                          {pb.beneficiary?.sitio || "Centro"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {pb.tableNumber || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {isFlagged ? (
                          <div className="space-y-1">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center space-x-1"
                              title={flagRemarks || "Flagged for onsite replacement"}
                            >
                              <span>🚩 Flagged Repl.</span>
                            </span>
                            {flagRemarks && (
                              <p
                                className="text-[10px] text-rose-700 font-semibold max-w-[170px] truncate leading-tight"
                                title={flagRemarks}
                              >
                                {flagRemarks}
                              </p>
                            )}
                          </div>
                        ) : dist ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1"
                            title={`Affirmed: ${dist.verificationMethod || "Verified"}${formattedDistDate ? ` on ${formattedDistDate}` : ""}`}
                          >
                            <span>✓ Affirmed</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⏳ Uninformed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOriented ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Present
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {attendCount} / 10 Days
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pb.participationStatus || "ACTIVE"} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {(isAdmin || can("stub.override")) && (
                          <button
                            onClick={() => setStubOverridePb(pb)}
                            className="px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-300 hover:border-amber-600 rounded-lg transition inline-flex items-center space-x-1 shadow-xs"
                            title="Edit / Reset Stub Distribution, Orientation & 10-Day Attendance"
                          >
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            <span>Workflow & Reset</span>
                          </button>
                        )}
                        {(isAdmin || can("beneficiary.update")) && (
                          <button
                            onClick={() => setBeneficiaryToEdit(pb)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-800 border border-slate-300 rounded-lg transition inline-flex items-center space-x-1 shadow-xs"
                            title="Edit Beneficiary Details & Status"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-white" />
                            <span>Edit</span>
                          </button>
                        )}
                        {pb.beneficiary?.id ? (
                          <a
                            href={`/beneficiaries/${pb.beneficiary.id}`}
                            className="px-2.5 py-1 text-[11px] font-bold text-gov-blue hover:text-white hover:bg-gov-blue border border-gov-blue/30 rounded-lg transition inline-flex items-center space-x-1 shadow-xs"
                          >
                            <span>Profile</span>
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        ) : null}
                        {isAdmin && (
                          <button
                            onClick={() => setBeneficiaryToDelete(pb)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition inline-flex items-center space-x-1 shadow-xs"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PESO Admin Stub & Affirmation Override Modal */}
      {stubOverridePb && (
        <AdminStubOverrideModal
          isOpen={!!stubOverridePb}
          onClose={() => setStubOverridePb(null)}
          programId={selectedProgram}
          programBeneficiary={stubOverridePb}
          onUpdated={(updatedPb) => {
            setBeneficiaries((prev) =>
              prev.map((b) => (b.id === updatedPb.id ? { ...b, ...updatedPb } : b))
            );
          }}
        />
      )}

      {/* Edit Beneficiary Modal */}
      {beneficiaryToEdit && (
        <EditBeneficiaryModal
          isOpen={!!beneficiaryToEdit}
          onClose={() => setBeneficiaryToEdit(null)}
          programId={selectedProgram}
          programBeneficiary={beneficiaryToEdit}
          onUpdated={(updatedPb) => {
            setBeneficiaries((prev) =>
              prev.map((b) => (b.id === updatedPb.id ? { ...b, ...updatedPb } : b))
            );
          }}
        />
      )}

      {/* Delete Beneficiary Confirmation Modal */}
      {beneficiaryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border-t-4 border-t-rose-600">
            <div className="flex items-center space-x-3 text-rose-700">
              <div className="p-2.5 bg-rose-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Beneficiary Entry</h3>
                <p className="text-xs text-slate-500 font-medium">Remove from masterlist records</p>
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
                <span className="text-slate-500 font-medium">Barangay / Sitio:</span>
                <span className="font-semibold text-slate-700">
                  {beneficiaryToDelete.beneficiary?.barangay} - {beneficiaryToDelete.beneficiary?.sitio || "Centro"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Confirm Removal:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This action will delete this beneficiary entry, their QR code, and associated attendance history.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBeneficiaryToDelete(null)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBeneficiary(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Confirm & Delete Entry"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
