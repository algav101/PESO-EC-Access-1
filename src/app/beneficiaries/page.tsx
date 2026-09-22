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
  CheckSquare,
  CheckCircle2,
  GraduationCap,
  Zap,
  RotateCcw,
  X,
  Check,
  Loader2,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Layers,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";
import { EditBeneficiaryModal } from "@/components/beneficiaries/EditBeneficiaryModal";
import { AdminStubOverrideModal } from "@/components/beneficiaries/AdminStubOverrideModal";
import { MasterlistUploadModal } from "@/components/beneficiaries/MasterlistUploadModal";
import { DeploymentGroupingMatrix } from "@/components/beneficiaries/DeploymentGroupingMatrix";
import { BeneficiarySummaryDropdown } from "@/components/beneficiaries/BeneficiarySummaryDropdown";
import { TableScrollWrapper } from "@/components/common/TableScrollWrapper";
import { useAuth } from "@/context/AuthContext";
import { offlineDb } from "@/lib/dexie";
import { isAdminUser, isFieldCoordinator } from "@/lib/permissions";
import {
  normalizeBarangayName,
  normalizeSitioName,
  getStandardBarangayName,
  CANONICAL_SITIOS_BY_BARANGAY,
} from "@/lib/dingalan-groupings";
import { useRouter, useSearchParams } from "next/navigation";

export default function BeneficiariesMasterlistPage() {
  return (
    <React.Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading Beneficiaries Hub...</div>}>
      <BeneficiariesMasterlistContent />
    </React.Suspense>
  );
}

function BeneficiariesMasterlistContent() {
  const { user, can } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = isAdminUser(user);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedBarangay, setSelectedBarangay] = useState<string>("ALL");
  const [selectedSitio, setSelectedSitio] = useState<string>("ALL");
  const [selectedStubStatus, setSelectedStubStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Manual Selection & Batch Action State
  const [selectedPbIds, setSelectedPbIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [confirmModalAction, setConfirmModalAction] = useState<string | null>(null);
  const [batchRemarks, setBatchRemarks] = useState<string>("");
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);
  const [deleteGlobalInBatch, setDeleteGlobalInBatch] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

  // View Mode: Roster Table vs. Deployment Grouping Matrix
  const [activeViewMode, setActiveViewMode] = useState<"ROSTER" | "GROUPING">("ROSTER");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Handle URL params and Coordinator view
  useEffect(() => {
    const viewParam = searchParams.get("view");
    const brgyParam = searchParams.get("barangay");
    if (viewParam === "groupings" || viewParam === "grouping") {
      setActiveViewMode("GROUPING");
    }
    if (brgyParam) {
      setSelectedBarangay(brgyParam);
    } else if (isFieldCoordinator(user) && user?.assignedBarangay) {
      setSelectedBarangay(user.assignedBarangay);
    }
  }, [searchParams, user]);

  // Sorting State
  const [sortBy, setSortBy] = useState<string>("designatedNumber");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");


  // Editing, Override & Deletion state
  const [beneficiaryToEdit, setBeneficiaryToEdit] = useState<any | null>(null);
  const [stubOverridePb, setStubOverridePb] = useState<any | null>(null);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeduplicateRoster = async () => {
    if (!confirm("Are you sure you want to clean up duplicate names/numbers and test sample data across the masterlist?")) return;
    setIsDeduplicating(true);
    try {
      const res = await fetch("/api/v1/beneficiaries/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: selectedProgram, removeTestData: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deduplicate masterlist");
      setBatchSuccessMsg(data.message || "Masterlist successfully deduplicated and cleaned!");
      setTimeout(() => setBatchSuccessMsg(null), 8000);
      await fetchBeneficiaries(selectedProgram);
    } catch (err: any) {
      alert(err.message || "Failed to deduplicate");
    } finally {
      setIsDeduplicating(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      // 1. If currently offline, load cached data from IndexedDB as fallback
      if (typeof window !== "undefined" && !navigator.onLine) {
        try {
          const cachedProgs = await offlineDb.cachedPrograms.toArray();
          if (cachedProgs && cachedProgs.length > 0) {
            setPrograms(cachedProgs);
            const activeProgId = selectedProgram || cachedProgs[0].id;
            setSelectedProgram(activeProgId);
            const cachedBenes = await offlineDb.cachedBeneficiaries
              .where("programId")
              .equals(activeProgId)
              .toArray();
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
            }
          }
        } catch (e) {
          console.warn("Offline cache load error:", e);
        } finally {
          setLoading(false);
        }
        return;
      }

      // 2. When online: Fetch authoritative live data directly from server
      fetchProgramsAndBeneficiaries();
    }

    loadData();
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
        const serverBenes = data.beneficiaries || [];
        setBeneficiaries(serverBenes);

        // Update IndexedDB cache so stale data (e.g. 1179 records) is purged
        try {
          await offlineDb.cachedBeneficiaries.where("programId").equals(programId).delete();
          const toCache = serverBenes.map((pb: any) => {
            const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE") || pb.qrCodes?.[0];
            return {
              id: pb.id,
              programId: programId,
              beneficiaryId: pb.beneficiaryId,
              designatedNumber: pb.designatedNumber,
              fullName: pb.beneficiary?.fullName || "",
              birthday: pb.beneficiary?.birthday || "",
              birthdayPin: pb.beneficiary?.birthday || "",
              barangay: pb.beneficiary?.barangay || "",
              sitio: pb.beneficiary?.sitio || "",
              tableNumber: pb.tableNumber || "",
              qrToken: activeQr?.publicToken || "",
              status: pb.participationStatus || "ACTIVE",
              orientationStatus: pb.orientationAttendance && pb.orientationAttendance.length > 0 ? "PRESENT" : "ABSENT",
            };
          });
          if (toCache.length > 0) {
            await offlineDb.cachedBeneficiaries.bulkPut(toCache);
          }
        } catch (cacheErr) {
          console.warn("Offline cache update warning:", cacheErr);
        }
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
      // Also remove from offline cache
      try {
        await offlineDb.cachedBeneficiaries.delete(beneficiaryToDelete.id);
      } catch (e) {}
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProgramChange = (progId: string) => {
    setSelectedProgram(progId);
    setSelectedSitio("ALL");
    setLoading(true);
    fetchBeneficiaries(progId);
  };

  // Collect unique Puroks / Sitios dynamically (Canonical & Normalized)
  const uniqueSitios = useMemo(() => {
    const list = beneficiaries
      .filter((pb) => {
        if (selectedBarangay === "ALL") return true;
        return (
          normalizeBarangayName(pb.beneficiary?.barangay) ===
          normalizeBarangayName(selectedBarangay)
        );
      })
      .map((pb) => normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay))
      .filter((s) => Boolean(s) && s !== "None" && s !== "N/A" && s !== "Centro");

    // When a specific barangay is selected, ensure all canonical sitios for that barangay are available
    if (selectedBarangay !== "ALL") {
      const stdBrgy = getStandardBarangayName(selectedBarangay);
      const canon = CANONICAL_SITIOS_BY_BARANGAY[stdBrgy] || [];
      for (const c of canon) {
        list.push(c);
      }
    }

    return Array.from(new Set(list)).sort((a: any, b: any) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [beneficiaries, selectedBarangay]);

  // Filter beneficiaries with robust canonical normalization
  const filtered = useMemo(() => {
    return beneficiaries.filter((pb) => {
      const q = searchQuery.toLowerCase();
      const bBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
      const bSitio = normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay);

      const matchesSearch =
        pb.designatedNumber?.toLowerCase().includes(q) ||
        pb.beneficiary?.fullName?.toLowerCase().includes(q) ||
        (bSitio && bSitio.toLowerCase().includes(q)) ||
        (pb.beneficiary?.sitio && pb.beneficiary.sitio.toLowerCase().includes(q)) ||
        (pb.tableNumber && pb.tableNumber.toLowerCase().includes(q));

      const matchesBrgy =
        selectedBarangay === "ALL" ||
        bBrgy === normalizeBarangayName(selectedBarangay);

      const matchesSitio =
        selectedSitio === "ALL" ||
        bSitio === selectedSitio;

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
        const sitioA = normalizeSitioName(a.beneficiary?.sitio, a.beneficiary?.barangay);
        const sitioB = normalizeSitioName(b.beneficiary?.sitio, b.beneficiary?.barangay);
        comp = sitioA.localeCompare(sitioB, undefined, { numeric: true });
        if (comp === 0) {
          comp = (a.beneficiary?.fullName || "").localeCompare(b.beneficiary?.fullName || "");
        }
      } else if (sortBy === "fullName") {
        comp = (a.beneficiary?.fullName || "").localeCompare(b.beneficiary?.fullName || "");
      } else if (sortBy === "birthday") {
        comp = (a.beneficiary?.birthday || "").localeCompare(b.beneficiary?.birthday || "");
      } else if (sortBy === "barangay") {
        const brgyA = normalizeBarangayName(a.beneficiary?.barangay);
        const brgyB = normalizeBarangayName(b.beneficiary?.barangay);
        comp = brgyA.localeCompare(brgyB, undefined, { numeric: true });
        if (comp === 0) {
          const sitioA = normalizeSitioName(a.beneficiary?.sitio, a.beneficiary?.barangay);
          const sitioB = normalizeSitioName(b.beneficiary?.sitio, b.beneficiary?.barangay);
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

  // Selection Calculations & Handlers
  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((pb) => selectedPbIds.includes(pb.id));
  const isSomeFilteredSelected =
    filtered.some((pb) => selectedPbIds.includes(pb.id)) && !isAllFilteredSelected;

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filtered.map((pb) => pb.id));
      setSelectedPbIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedPbIds, ...filtered.map((pb) => pb.id)]);
      setSelectedPbIds(Array.from(newIds));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedPbIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectEntireProgram = () => {
    setSelectedPbIds(beneficiaries.map((pb) => pb.id));
  };

  const handleClearSelection = () => {
    setSelectedPbIds([]);
  };

  const handleExecuteBatchAction = async () => {
    if (!confirmModalAction || selectedPbIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch(`/api/v1/programs/${selectedProgram}/beneficiaries/batch-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programBeneficiaryIds: selectedPbIds,
          action: confirmModalAction,
          remarks: batchRemarks.trim() || undefined,
          deleteGlobal: deleteGlobalInBatch,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process batch action");

      const actionNames: Record<string, string> = {
        APPROVE_STUB: "Stub Distribution / Affirmation Approval",
        APPROVE_ORIENTATION: "Orientation Attendance Verification",
        APPROVE_BOTH: "Stubs & Orientation Batch Approval",
        RESET_STUB: "Stub Distribution Reset",
        RESET_ORIENTATION: "Orientation Attendance Reset",
        RESET_BOTH: "Stubs & Orientation Reset",
        DELETE_BENEFICIARIES: "Batch Deletion & Roster Removal",
      };

      if (confirmModalAction === "DELETE_BENEFICIARIES") {
        setBeneficiaries((prev) => prev.filter((b) => !selectedPbIds.includes(b.id)));
      }

      setBatchSuccessMsg(
        `Successfully processed ${actionNames[confirmModalAction] || confirmModalAction} for ${
          data.updatedCount || selectedPbIds.length
        } beneficiaries.`
      );
      setTimeout(() => setBatchSuccessMsg(null), 6000);

      // Refresh masterlist
      await fetchBeneficiaries(selectedProgram);
      setSelectedPbIds([]);
      setConfirmModalAction(null);
      setBatchRemarks("");
      setDeleteGlobalInBatch(false);
    } catch (err: any) {
      alert(`Batch action failed: ${err.message}`);
    } finally {
      setBatchLoading(false);
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
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-800 text-xs font-black uppercase tracking-wider mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>PESO EC Access - EC TUPAD Implementation System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-slate-900" />
            <span>Final List of Beneficiaries for Implementation</span>
          </h1>
          <p className="text-xs text-slate-700 font-medium">
            Authoritative Masterlist for TUPAD Deployment, Purok/Sitio Allocation, Biometric QR Verification &amp; Work Program Scheduling
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Beneficiaries Demographic & Geographic Summary Dropdown Button */}
          <BeneficiarySummaryDropdown beneficiaries={beneficiaries} />

          <a
            href="/api/v1/beneficiaries/template"
            download="tupad_final_beneficiaries_template.csv"
            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center space-x-1.5 transition shadow-xs"
            title="Download standard CSV template for Final Masterlist"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>Template CSV</span>
          </a>

          {(isAdmin || can("beneficiary.import")) && (
            <>
              <button
                type="button"
                disabled={isDeduplicating}
                onClick={handleDeduplicateRoster}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50 border border-slate-700"
                title="Remove duplicate names/numbers and test sample data from masterlist"
              >
                <Sparkles className={`w-3.5 h-3.5 text-slate-300 ${isDeduplicating ? "animate-spin" : ""}`} />
                <span>{isDeduplicating ? "Cleaning..." : "Clean Duplicates"}</span>
              </button>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition"
              >
                <UploadCloud className="w-4 h-4 text-emerald-100" />
                <span>Upload CSV / Excel Masterlist</span>
              </button>
            </>
          )}

          {selectedProgram && (
            <a
              href={`/programs/${selectedProgram}/work-program`}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition border border-slate-800"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-300" />
              <span>Work Program Deployment</span>
            </a>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveViewMode("ROSTER")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
              activeViewMode === "ROSTER"
                ? "bg-white text-gov-blue shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Masterlist Implementation Roster ({beneficiaries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode("GROUPING")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
              activeViewMode === "GROUPING"
                ? "bg-white text-gov-blue shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Purok &amp; Sitio Deployment Groupings</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {batchSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{batchSuccessMsg}</span>
          </div>
          <button
            onClick={() => setBatchSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Coordinator Scoped Scope Banner */}
      {(user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>Assigned Field Scope: Showing Beneficiaries for <strong>Barangay {user.assignedBarangay}</strong> only.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-950 rounded uppercase tracking-wider">
            Barangay Restricted
          </span>
        </div>
      )}

      {/* Conditional View: Deployment Grouping Matrix vs. Table Roster */}
      {activeViewMode === "GROUPING" ? (
        <DeploymentGroupingMatrix
          beneficiaries={beneficiaries}
          selectedBarangay={selectedBarangay}
          onEditBeneficiary={(pb) => setBeneficiaryToEdit(pb)}
          onDeleteBeneficiary={(pb) => setBeneficiaryToDelete(pb)}
          programId={selectedProgram}
        />
      ) : (
        <>
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
              disabled={(user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && !!user.assignedBarangay}
              onChange={(e) => {
                setSelectedBarangay(e.target.value);
                setSelectedSitio("ALL");
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:border-gov-blue font-semibold disabled:bg-slate-100 disabled:text-slate-500"
            >
              {!((user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) && (
                <option value="ALL">All Barangays</option>
              )}
              {barangays
                .filter((b) => !((user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) || b === user.assignedBarangay)
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

      {/* Masterlist Table Card */}
      <div className="gov-card overflow-hidden">
        {/* Table Top Controls & Selection Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Showing {sortedBeneficiaries.length} of {beneficiaries.length} Beneficiaries
            </span>

            {/* Quick Multi-Select Helpers */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleToggleSelectAllFiltered}
                className="px-2 py-0.5 rounded text-[11px] font-bold border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition"
              >
                {isAllFilteredSelected ? "Deselect Visible" : `Select Visible (${sortedBeneficiaries.length})`}
              </button>

              {beneficiaries.length > sortedBeneficiaries.length && (
                <button
                  type="button"
                  onClick={handleSelectEntireProgram}
                  className="px-2 py-0.5 rounded text-[11px] font-bold border border-blue-300 bg-blue-50 hover:bg-blue-100 text-gov-blue transition"
                >
                  Select All Program ({beneficiaries.length})
                </button>
              )}

              {selectedPbIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2 py-0.5 rounded text-[11px] font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                >
                  Clear ({selectedPbIds.length})
                </button>
              )}
            </div>

            {sortBy === "sitio" && (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-gov-blue font-bold text-[10px]">
                Sorted by Purok / Sitio ({sortOrder})
              </span>
            )}
            {sortBy === "stubAffirmation" && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                Sorted by Stub ({sortOrder === "ASC" ? "Affirmed → Pending → Flagged" : "Flagged → Pending → Affirmed"})
              </span>
            )}
            {sortBy === "orientation" && (
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                Sorted by Orientation ({sortOrder === "ASC" ? "Present First" : "Pending First"})
              </span>
            )}
          </div>

          {/* Action Buttons Header Toolbar (When items selected) */}
          {(isAdmin || can("stub.override") || can("orientation.correct")) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedPbIds.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmModalAction("APPROVE_STUB")}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center space-x-1"
                    title="Bulk mark stub distribution as Affirmed and generate active QR codes"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Approve Stubs ({selectedPbIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmModalAction("APPROVE_ORIENTATION")}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center space-x-1"
                    title="Bulk mark orientation as Present"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Verify Orientation ({selectedPbIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmModalAction("APPROVE_BOTH")}
                    className="px-3 py-1.5 bg-gov-blue hover:bg-gov-light text-white font-black text-[11px] rounded-lg shadow-xs transition flex items-center space-x-1"
                    title="Approve both Stubs & Orientation in 1 click"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Approve Both ({selectedPbIds.length})</span>
                  </button>

                  {(isAdmin || can("beneficiary.delete") || can("beneficiary.update")) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteGlobalInBatch(false);
                        setConfirmModalAction("DELETE_BENEFICIARIES");
                      }}
                      className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center space-x-1"
                      title="Delete selected beneficiaries from masterlist roster"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-200" />
                      <span>Delete Selected ({selectedPbIds.length})</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  Select beneficiaries below or click &quot;Select Visible&quot; for bulk approvals
                </div>
              )}
            </div>
          )}
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
          <TableScrollWrapper>
            <table className="w-full text-left text-xs min-w-[1050px]">
              <thead className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  {/* Master Checkbox Header */}
                  <th className="px-3 py-3.5 w-10 text-center select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={handleToggleSelectAllFiltered}
                      title={isAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
                    />
                  </th>
                  {renderSortHeader("# Desig", "designatedNumber")}
                  {renderSortHeader("Full Name", "fullName")}
                  {renderSortHeader("Birthday", "birthday")}
                  {renderSortHeader("Barangay / Sitio", "sitio")}
                  {renderSortHeader("Table Assignment", "tableNumber")}
                  {renderSortHeader("Stub & Affirmation", "stubAffirmation")}
                  {renderSortHeader("Orientation", "orientation")}
                  {renderSortHeader("Attendance", "attendance")}
                  {renderSortHeader("Status", "status")}
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {sortedBeneficiaries.map((pb) => {
                  if (!pb) return null;
                  const isSelected = selectedPbIds.includes(pb.id);
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
                    <tr
                      key={pb.id || Math.random()}
                      onClick={() => handleToggleSelectRow(pb.id)}
                      className={`transition cursor-pointer ${
                        isSelected
                          ? "bg-slate-100 border-l-4 border-l-slate-900"
                          : "hover:bg-slate-50/90"
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(pb.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-slate-950">
                        {pb.designatedNumber || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-slate-950 block">{pb.beneficiary?.fullName || "Unnamed"}</span>
                        <span className="text-[11px] text-slate-600 font-mono font-bold">{pb.beneficiary?.beneficiaryNumber || pb.designatedNumber || "-"}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {pb.beneficiary?.birthday || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-950 block">
                          {normalizeBarangayName(pb.beneficiary?.barangay) || "-"}
                        </span>
                        <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                          {normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay) || "Centro"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-slate-950">
                        {pb.tableNumber || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {isFlagged ? (
                          <div className="space-y-1">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 inline-flex items-center space-x-1"
                              title={flagRemarks || "Flagged for onsite replacement"}
                            >
                              <span>🚩 Flagged Repl.</span>
                            </span>
                            {flagRemarks && (
                              <p
                                className="text-[10px] text-rose-800 font-semibold max-w-[170px] truncate leading-tight"
                                title={flagRemarks}
                              >
                                {flagRemarks}
                              </p>
                            )}
                          </div>
                        ) : dist ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1"
                            title={`Affirmed: ${dist.verificationMethod || "Verified"}${formattedDistDate ? ` on ${formattedDistDate}` : ""}`}
                          >
                            <span>✓ Affirmed</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            ⏳ Uninformed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOriented ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Present
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {attendCount} / 10 Days
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pb.participationStatus || "ACTIVE"} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
          </TableScrollWrapper>
        )}
      </div>

      {/* Floating Sticky Bulk Actions Bar (When 1+ beneficiaries selected) */}
      {selectedPbIds.length > 0 && (isAdmin || can("stub.override") || can("orientation.correct")) && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-4xl z-40 px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3 sm:p-4 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-gov-blue text-white font-black text-xs rounded-lg flex items-center space-x-1 shadow-sm">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{selectedPbIds.length} Selected</span>
                </span>
                {selectedPbIds.length < beneficiaries.length && (
                  <button
                    type="button"
                    onClick={handleSelectEntireProgram}
                    className="text-[11px] text-blue-300 hover:text-white underline font-semibold transition"
                  >
                    Select All ({beneficiaries.length})
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                title="Deselect all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Approve Stubs */}
              <button
                type="button"
                onClick={() => setConfirmModalAction("APPROVE_STUB")}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
                <span>Approve Stubs ({selectedPbIds.length})</span>
              </button>

              {/* Verify Orientation */}
              <button
                type="button"
                onClick={() => setConfirmModalAction("APPROVE_ORIENTATION")}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5 text-slate-950" />
                <span>Verify Orientation ({selectedPbIds.length})</span>
              </button>

              {/* Approve Both */}
              <button
                type="button"
                onClick={() => setConfirmModalAction("APPROVE_BOTH")}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 ring-1 ring-white/20"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Approve Both</span>
              </button>

              {/* Reset Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setConfirmModalAction("RESET_BOTH")}
                className="px-2.5 py-2 bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 font-bold text-xs rounded-xl border border-slate-700 hover:border-rose-700 transition flex items-center space-x-1"
                title="Reset or Undo distribution and orientation status"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset...</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Action Confirmation Modal */}
      {confirmModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className={`bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-t-4 ${
            confirmModalAction === "DELETE_BENEFICIARIES" || confirmModalAction.startsWith("RESET")
              ? "border-t-rose-600"
              : "border-t-gov-blue"
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-full ${
                confirmModalAction === "DELETE_BENEFICIARIES" || confirmModalAction.startsWith("RESET")
                  ? "bg-rose-100 text-rose-700"
                  : "bg-blue-100 text-gov-blue"
              }`}>
                {confirmModalAction === "DELETE_BENEFICIARIES" ? (
                  <Trash2 className="w-6 h-6 text-rose-600" />
                ) : confirmModalAction.startsWith("RESET") ? (
                  <RotateCcw className="w-6 h-6" />
                ) : confirmModalAction === "APPROVE_BOTH" ? (
                  <Zap className="w-6 h-6 text-amber-600" />
                ) : confirmModalAction === "APPROVE_STUB" ? (
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-emerald-600" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {confirmModalAction === "DELETE_BENEFICIARIES" && "Bulk Delete Beneficiaries from Masterlist"}
                  {confirmModalAction === "APPROVE_STUB" && "Bulk Approve Stub Distribution / Affirmation"}
                  {confirmModalAction === "APPROVE_ORIENTATION" && "Bulk Verify Orientation Attendance"}
                  {confirmModalAction === "APPROVE_BOTH" && "Bulk Approve Stubs & Orientation Attendance"}
                  {confirmModalAction === "RESET_STUB" && "Reset Stub Distribution Status"}
                  {confirmModalAction === "RESET_ORIENTATION" && "Reset Orientation Attendance Status"}
                  {confirmModalAction === "RESET_BOTH" && "Reset Beneficiaries Distribution & Orientation"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Applying to <strong>{selectedPbIds.length}</strong> selected beneficiaries
                </p>
              </div>
            </div>

            {/* Action Details Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800">Operation Summary:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                {confirmModalAction === "DELETE_BENEFICIARIES" && (
                  <>
                    <li className="text-rose-700 font-bold">
                      Permanently removes <strong>{selectedPbIds.length}</strong> beneficiaries from this program batch.
                    </li>
                    <li>Deletes all associated QR passes, attendance scans, and orientation records for these entries.</li>
                    <li>Recalculates and updates the program&apos;s total beneficiary count automatically.</li>
                  </>
                )}
                {confirmModalAction === "APPROVE_STUB" && (
                  <>
                    <li>Sets stub distribution status to <strong>DISTRIBUTED / Affirmed</strong>.</li>
                    <li>Generates active QR tokens for any beneficiaries lacking an active pass.</li>
                    <li>Restores any flagged replacement status back to active status.</li>
                  </>
                )}
                {confirmModalAction === "APPROVE_ORIENTATION" && (
                  <>
                    <li>Marks orientation verification attendance as <strong>PRESENT</strong>.</li>
                    <li>Enables scanning eligibility during TUPAD work days.</li>
                  </>
                )}
                {confirmModalAction === "APPROVE_BOTH" && (
                  <>
                    <li>Affirms & marks stub distribution as <strong>DISTRIBUTED</strong> with valid QR tokens.</li>
                    <li>Marks orientation attendance as <strong>PRESENT</strong>.</li>
                    <li>Fully qualifies all <strong>{selectedPbIds.length}</strong> beneficiaries for work day check-in.</li>
                  </>
                )}
                {confirmModalAction.startsWith("RESET") && (
                  <>
                    <li className="text-rose-700 font-semibold">
                      Clears previously recorded stub distribution and/or orientation check-ins.
                    </li>
                    <li>Allows re-verifying or re-distributing stubs from a clean state.</li>
                  </>
                )}
              </ul>
            </div>

            {/* Global Delete checkbox for DELETE_BENEFICIARIES */}
            {confirmModalAction === "DELETE_BENEFICIARIES" && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteGlobalInBatch}
                    onChange={(e) => setDeleteGlobalInBatch(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-bold text-rose-950">Also delete from Global Masterlist Database</span>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      If checked, also permanently removes their global profiles, dependents, and historical restrictions from the system.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Reset Sub-action selector if in RESET mode */}
            {confirmModalAction.startsWith("RESET") && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Select Reset Scope:</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setConfirmModalAction("RESET_STUB")}
                    className={`p-2 rounded-lg border font-bold text-center transition ${
                      confirmModalAction === "RESET_STUB"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Stubs Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmModalAction("RESET_ORIENTATION")}
                    className={`p-2 rounded-lg border font-bold text-center transition ${
                      confirmModalAction === "RESET_ORIENTATION"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Orientation Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmModalAction("RESET_BOTH")}
                    className={`p-2 rounded-lg border font-bold text-center transition ${
                      confirmModalAction === "RESET_BOTH"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Reset Both
                  </button>
                </div>
              </div>
            )}

            {/* Optional Remarks input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Audit Remarks (Optional):
              </label>
              <input
                type="text"
                value={batchRemarks}
                onChange={(e) => setBatchRemarks(e.target.value)}
                placeholder="e.g., Removed via Beneficiaries Masterlist Bulk Action"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setConfirmModalAction(null);
                  setBatchRemarks("");
                  setDeleteGlobalInBatch(false);
                }}
                disabled={batchLoading}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchAction}
                disabled={batchLoading}
                className={`w-full sm:w-auto px-5 py-2 text-white font-bold text-xs rounded-lg shadow transition flex items-center justify-center space-x-2 ${
                  confirmModalAction === "DELETE_BENEFICIARIES" || confirmModalAction.startsWith("RESET")
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-gov-blue hover:bg-gov-light"
                }`}
              >
                {batchLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing {selectedPbIds.length} Records...</span>
                  </>
                ) : confirmModalAction === "DELETE_BENEFICIARIES" ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm &amp; Delete {selectedPbIds.length} Beneficiaries</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Apply to {selectedPbIds.length} Beneficiaries</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    )}

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
      {/* CSV / Excel Masterlist Upload Modal */}
      <MasterlistUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        programs={programs}
        defaultProgramId={selectedProgram}
        onSuccess={() => fetchBeneficiaries(selectedProgram)}
      />
    </div>
  );
}
