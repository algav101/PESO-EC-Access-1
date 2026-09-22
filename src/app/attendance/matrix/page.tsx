"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  MapPin,
  Users,
  Clock,
  Printer,
  ShieldAlert,
  RefreshCw,
  RotateCcw,
  Key,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { isAdminUser } from "@/lib/permissions";
import {
  normalizeBarangayName,
  normalizeSitioName,
  getStandardBarangayName,
  CANONICAL_BARANGAYS,
  CANONICAL_SITIOS_BY_BARANGAY,
} from "@/lib/dingalan-groupings";
import { MultiSelectFilter } from "@/components/common/MultiSelectFilter";
import { AdminStubOverrideModal } from "@/components/beneficiaries/AdminStubOverrideModal";
import { TableScrollWrapper } from "@/components/common/TableScrollWrapper";
import { offlineDb } from "@/lib/dexie";

function AttendanceMatrixContent() {
  const searchParams = useSearchParams();
  const urlProgramId = searchParams.get("programId");
  const { user } = useAuth();
  const { isOnline, masterSyncNow, isSyncing } = useOffline();
  const isAdmin = isAdminUser(user);

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(urlProgramId || "");
  const [program, setProgram] = useState<any | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>(["ALL"]);
  const [selectedSitios, setSelectedSitios] = useState<string[]>(["ALL"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPbForOverride, setSelectedPbForOverride] = useState<any | null>(null);

  // Barangay Multi-Select Options with counts
  const barangayOptions = React.useMemo(() => {
    return CANONICAL_BARANGAYS.map((b) => {
      const stdB = normalizeBarangayName(b);
      const count = beneficiaries.filter(
        (pb) => normalizeBarangayName(pb.beneficiary?.barangay) === stdB
      ).length;
      return {
        value: b,
        label: `Brgy. ${b}`,
        count,
      };
    });
  }, [beneficiaries]);

  // Collect unique Puroks / Sitios dynamically (Canonical & Normalized)
  const uniqueSitios = React.useMemo(() => {
    const list: string[] = [];
    const isAllBrgy = selectedBarangays.length === 0 || selectedBarangays.includes("ALL");

    beneficiaries.forEach((pb) => {
      const bBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
      if (isAllBrgy || selectedBarangays.some((sb) => normalizeBarangayName(sb) === bBrgy)) {
        const s = normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay);
        if (s && s !== "None" && s !== "N/A" && s !== "Centro") {
          list.push(s);
        }
      }
    });

    if (!isAllBrgy) {
      selectedBarangays.forEach((sb) => {
        const stdBrgy = getStandardBarangayName(sb);
        const canon = CANONICAL_SITIOS_BY_BARANGAY[stdBrgy] || [];
        canon.forEach((c) => list.push(c));
      });
    } else {
      Object.values(CANONICAL_SITIOS_BY_BARANGAY).forEach((sitios) => {
        sitios.forEach((c) => list.push(c));
      });
    }

    return Array.from(new Set(list)).sort((a: any, b: any) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [beneficiaries, selectedBarangays]);

  // Sitio Multi-Select Options with counts
  const sitioOptions = React.useMemo(() => {
    return uniqueSitios.map((s) => {
      const count = beneficiaries.filter((pb) => {
        const bBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
        const isBrgyMatch =
          selectedBarangays.length === 0 ||
          selectedBarangays.includes("ALL") ||
          selectedBarangays.some((sb) => normalizeBarangayName(sb) === bBrgy);
        if (!isBrgyMatch) return false;
        const bSitio = normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay);
        return bSitio === s;
      }).length;
      return {
        value: s,
        label: s,
        count,
      };
    });
  }, [uniqueSitios, beneficiaries, selectedBarangays]);

  // 1. Merge server attendance records with local offline scans
  const mergeWithOfflineScans = useCallback(
    async (serverBeneficiaries: any[], progId: string, workDays: any[]) => {
      try {
        const offlineRecords = await offlineDb.offlineAttendanceRecords
          .where("programId")
          .equals(progId)
          .toArray();

        if (!offlineRecords || offlineRecords.length === 0) {
          return serverBeneficiaries;
        }

        return serverBeneficiaries.map((pb) => {
          const pbScans = offlineRecords.filter(
            (r) =>
              r.programBeneficiaryId === pb.id ||
              (pb.beneficiaryId && r.programBeneficiaryId === pb.beneficiaryId) ||
              (pb.designatedNumber && r.designatedNumber && String(pb.designatedNumber) === String(r.designatedNumber))
          );

          if (pbScans.length === 0) return pb;

          const mergedRecords = [...(pb.attendanceRecords || [])];

          for (const scan of pbScans) {
            const matchingWorkDay = workDays?.find(
              (w: any) =>
                w.id === scan.workDayId ||
                w.dayNumber === scan.dayNumber ||
                (scan.workDayId && String(scan.workDayId).endsWith(String(w.dayNumber))) ||
                w.workDate === scan.attendanceDate
            );

            const resolvedWorkDayId = matchingWorkDay?.id || scan.workDayId;
            const resolvedAttendanceDate = matchingWorkDay?.workDate || scan.attendanceDate;

            const existingIdx = mergedRecords.findIndex(
              (r: any) =>
                (resolvedWorkDayId && r.workDayId === resolvedWorkDayId) ||
                (matchingWorkDay && r.workDayId === matchingWorkDay.id) ||
                (matchingWorkDay && r.attendanceDate === matchingWorkDay.workDate) ||
                (scan.dayNumber && r.dayNumber === scan.dayNumber) ||
                r.workDayId === scan.workDayId ||
                r.attendanceDate === scan.attendanceDate
            );

            if (existingIdx >= 0) {
              mergedRecords[existingIdx] = {
                ...mergedRecords[existingIdx],
                workDayId: resolvedWorkDayId || mergedRecords[existingIdx].workDayId,
                attendanceDate: resolvedAttendanceDate || mergedRecords[existingIdx].attendanceDate,
                dayNumber: matchingWorkDay?.dayNumber || scan.dayNumber || mergedRecords[existingIdx].dayNumber,
                morningTimeIn:
                  scan.morningTimeIn || mergedRecords[existingIdx].morningTimeIn,
                morningTimeOut:
                  scan.morningTimeOut || mergedRecords[existingIdx].morningTimeOut,
                afternoonTimeIn:
                  scan.afternoonTimeIn || mergedRecords[existingIdx].afternoonTimeIn,
                afternoonTimeOut:
                  scan.afternoonTimeOut || mergedRecords[existingIdx].afternoonTimeOut,
                status: scan.status || mergedRecords[existingIdx].status,
              };
            } else {
              mergedRecords.push({
                id: `offline-${scan.id || Date.now()}`,
                workDayId: resolvedWorkDayId,
                dayNumber: matchingWorkDay?.dayNumber || scan.dayNumber,
                attendanceDate: resolvedAttendanceDate,
                morningTimeIn: scan.morningTimeIn,
                morningTimeOut: scan.morningTimeOut,
                afternoonTimeIn: scan.afternoonTimeIn,
                afternoonTimeOut: scan.afternoonTimeOut,
                status: scan.status || "PRESENT",
              });
            }
          }

          return {
            ...pb,
            attendanceRecords: mergedRecords,
          };
        });
      } catch (err) {
        console.warn("Could not merge local offline scans:", err);
        return serverBeneficiaries;
      }
    },
    []
  );

  // 2. Instant Load from Local IndexedDB Cache
  const loadFromLocalCache = useCallback(
    async (progId?: string) => {
      try {
        const cachedProgs = await offlineDb.cachedPrograms.toArray();
        if (cachedProgs && cachedProgs.length > 0) {
          setPrograms(cachedProgs);
          const activeProgId = progId || selectedProgramId || cachedProgs[0].id;
          if (!selectedProgramId) {
            setSelectedProgramId(activeProgId);
          }

          const cachedProg = cachedProgs.find((p) => p.id === activeProgId) || cachedProgs[0];
          const cachedDays = await offlineDb.cachedWorkDays
            .where("programId")
            .equals(activeProgId)
            .toArray();

          const fullProg = {
            ...cachedProg,
            workDays: cachedDays.sort((a, b) => a.dayNumber - b.dayNumber),
          };
          setProgram(fullProg);

          // Beneficiaries
          let cachedBenes = await offlineDb.cachedBeneficiaries
            .where("programId")
            .equals(activeProgId)
            .toArray();

          if (cachedBenes.length > 0) {
            const formattedBenes = cachedBenes.map((b) => ({
              id: b.id,
              designatedNumber: b.designatedNumber,
              tableNumber: b.tableNumber,
              participationStatus: b.status,
              beneficiary: {
                id: b.beneficiaryId,
                fullName: b.fullName,
                barangay: b.barangay,
                sitio: b.sitio,
              },
              attendanceRecords: [],
            }));

            // Sort naturally
            formattedBenes.sort((a, b) => {
              const numA = parseInt(a.designatedNumber, 10);
              const numB = parseInt(b.designatedNumber, 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, {
                numeric: true,
              });
            });

            const merged = await mergeWithOfflineScans(formattedBenes, activeProgId, fullProg.workDays);
            setBeneficiaries(merged);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn("Local cache matrix read:", err);
      }
    },
    [mergeWithOfflineScans, selectedProgramId]
  );

  // 3. Fast Parallel Fetch from Optimized Server API
  const fetchProgramAndMatrix = useCallback(
    async (progId: string, isSilent = false) => {
      if (!isSilent) setIsRefreshing(true);
      try {
        const res = await fetch(`/api/v1/programs/${progId}/matrix`);
        if (res.ok) {
          const data = await res.json();
          const progData = data.program;
          const beneData = data.beneficiaries || [];

          setProgram(progData);

          // Merge with any local offline scans immediately
          const mergedBenes = await mergeWithOfflineScans(beneData, progId, progData.workDays || []);
          setBeneficiaries(mergedBenes);
          setLoading(false);
        }
      } catch (e) {
        console.warn("Matrix fetch warning:", e);
      } finally {
        setIsRefreshing(false);
        setLoading(false);
      }
    },
    [mergeWithOfflineScans]
  );

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        if (progs.length > 0) {
          setPrograms(progs);
          if (!selectedProgramId) {
            setSelectedProgramId(progs[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedProgramId]);

  // Initial mount: immediate cache render then parallel fetch
  useEffect(() => {
    loadFromLocalCache();
    fetchPrograms();
  }, [loadFromLocalCache, fetchPrograms]);

  useEffect(() => {
    if (selectedProgramId) {
      loadFromLocalCache(selectedProgramId);
      fetchProgramAndMatrix(selectedProgramId);
    }
  }, [selectedProgramId, fetchProgramAndMatrix, loadFromLocalCache]);

  // Listen to offline scan and sync events to re-merge attendance instantly
  useEffect(() => {
    const handleUpdate = () => {
      if (selectedProgramId) {
        loadFromLocalCache(selectedProgramId);
        if (navigator.onLine) {
          fetchProgramAndMatrix(selectedProgramId, true);
        }
      }
    };

    window.addEventListener("tupad-attendance-updated", handleUpdate);
    window.addEventListener("tupad-offline-synced", handleUpdate);

    return () => {
      window.removeEventListener("tupad-attendance-updated", handleUpdate);
      window.removeEventListener("tupad-offline-synced", handleUpdate);
    };
  }, [selectedProgramId, loadFromLocalCache, fetchProgramAndMatrix]);

  const filtered = React.useMemo(() => {
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

      const isAllBrgy = selectedBarangays.length === 0 || selectedBarangays.includes("ALL");
      const matchesBrgy =
        isAllBrgy ||
        selectedBarangays.some((sb) => normalizeBarangayName(sb) === bBrgy);

      const isAllSitio = selectedSitios.length === 0 || selectedSitios.includes("ALL");
      const matchesSitio =
        isAllSitio ||
        selectedSitios.some(
          (st) => normalizeSitioName(st, pb.beneficiary?.barangay) === bSitio || st === bSitio
        );

      return matchesSearch && matchesBrgy && matchesSitio;
    });
  }, [beneficiaries, searchQuery, selectedBarangays, selectedSitios]);

  const numWorkDays = program?.workDays?.length || program?.requiredWorkDays || 10;
  const workDaysList = program?.workDays || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-gov-blue" />
            <span>10-Day Dynamic Attendance Matrix</span>
          </h1>
          <p className="text-xs text-slate-500">
            Pivoted attendance records formatted strictly according to Dingalan TUPAD Reference 2 structure
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (
                confirm(
                  "Execute Master Key Sync?\n\nThis will purge local device cache and re-align all attendance and beneficiary records with the PESO Admin central database (scoped to your access permissions)."
                )
              ) {
                await masterSyncNow();
                if (selectedProgramId) {
                  await fetchProgramAndMatrix(selectedProgramId, true);
                }
              }
            }}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition disabled:opacity-50"
            title="Purge local device cache & synchronize authoritative records with PESO Admin database"
          >
            <Key className={`w-3.5 h-3.5 text-slate-950 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Master Key Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedProgramId) fetchProgramAndMatrix(selectedProgramId);
            }}
            disabled={isRefreshing}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition"
            title="Refresh Attendance Matrix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-gov-blue" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {selectedProgramId && (
            <a
              href={`/api/v1/reports/export?type=ATTENDANCE&programId=${selectedProgramId}`}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel (.XLSX)</span>
            </a>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Select Program */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Program</label>
          <select
            value={selectedProgramId}
            onChange={(e) => {
              setSelectedProgramId(e.target.value);
              setSelectedSitios(["ALL"]);
            }}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} - {p.programName}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Barangay (Multi-Select) */}
        <MultiSelectFilter
          label="Filter Barangay"
          options={barangayOptions}
          selectedValues={selectedBarangays}
          onChange={(vals) => {
            setSelectedBarangays(vals);
            setSelectedSitios(["ALL"]);
          }}
          allLabel="All Barangays (11)"
        />

        {/* Filter Purok / Sitio (Multi-Select) */}
        <MultiSelectFilter
          label="Filter Purok / Sitio"
          icon={<MapPin className="w-3 h-3 text-gov-blue" />}
          options={sitioOptions}
          selectedValues={selectedSitios}
          onChange={(vals) => setSelectedSitios(vals)}
          allLabel={`All Puroks & Sitios (${uniqueSitios.length})`}
        />

        {/* Search Beneficiary */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Beneficiary</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, #, table, sitio..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue bg-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Consolidated Attendance Matrix ({filtered.length} Beneficiaries • {numWorkDays} Work Days)
          </span>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                💡 PESO Admin: Click "Reset" to modify slots or restart days
              </span>
            )}
          </div>
        </div>

        {loading && beneficiaries.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading Attendance Matrix...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No records found.</div>
        ) : (
          <TableScrollWrapper>
            <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b text-center">
                {/* Row 1: Day Headers */}
                <tr>
                  {isAdmin && (
                    <th rowSpan={2} className="px-2 py-2 border-r bg-slate-200 text-center">
                      Action
                    </th>
                  )}
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200 text-left">
                    # Desig
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200 text-left min-w-[180px]">
                    Beneficiary Name
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200 text-left min-w-[130px]">
                    Barangay / Sitio
                  </th>
                  <th rowSpan={2} className="px-3 py-2 border-r bg-slate-200">
                    Table
                  </th>

                  {Array.from({ length: numWorkDays }).map((_, dIdx) => {
                    const dayObj = workDaysList.find((w: any) => w.dayNumber === dIdx + 1);
                    return (
                      <th
                        key={dIdx}
                        colSpan={4}
                        className="px-2 py-1.5 border-r border-b bg-blue-50 text-gov-blue text-[10px] font-extrabold uppercase"
                      >
                        Day {dIdx + 1} {dayObj ? `(${dayObj.workDate})` : ""}
                      </th>
                    );
                  })}
                </tr>

                {/* Row 2: In/Out Headers */}
                <tr className="text-[9px] bg-slate-100 text-slate-600">
                  {Array.from({ length: numWorkDays }).map((_, dIdx) => (
                    <React.Fragment key={dIdx}>
                      <th className="px-1.5 py-1 border-r">AM IN</th>
                      <th className="px-1.5 py-1 border-r">AM OUT</th>
                      <th className="px-1.5 py-1 border-r">PM IN</th>
                      <th className="px-1.5 py-1 border-r">PM OUT</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                {filtered.map((pb) => (
                  <tr key={pb.id} className="hover:bg-slate-50 text-center">
                    {isAdmin && (
                      <td className="px-2 py-2 border-r text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPbForOverride(pb)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-300 rounded font-bold text-[10px] transition inline-flex items-center space-x-1"
                          title="PESO Admin: Edit / Reset Attendance Slots"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </td>
                    )}
                    <td className="px-3 py-2 text-left font-bold text-gov-blue border-r">
                      #{pb.designatedNumber}
                    </td>
                    <td className="px-3 py-2 text-left font-bold text-slate-900 font-sans border-r truncate">
                      {pb.beneficiary?.fullName || "Unnamed"}
                    </td>
                    <td className="px-3 py-2 text-left font-sans border-r">
                      <span className="font-bold text-slate-900 block">
                        {normalizeBarangayName(pb.beneficiary?.barangay) || "-"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                        {normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay) || "Centro"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800 border-r">
                      {pb.tableNumber || "T1"}
                    </td>

                    {/* Work Days Pivoted In/Out columns */}
                    {Array.from({ length: numWorkDays }).map((_, dIdx) => {
                      const dayObj = workDaysList.find((w: any) => w.dayNumber === dIdx + 1);
                      const rec = dayObj
                        ? pb.attendanceRecords?.find(
                            (a: any) =>
                              a.workDayId === dayObj.id ||
                              a.dayNumber === dayObj.dayNumber ||
                              a.dayNumber === dIdx + 1 ||
                              a.workDayId === `WD-${dayObj.dayNumber}` ||
                              a.workDayId === `WD-${dIdx + 1}` ||
                              (dayObj.id && String(a.workDayId).includes(dayObj.id)) ||
                              a.attendanceDate === dayObj.workDate
                          )
                        : null;

                      return (
                        <React.Fragment key={dIdx}>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.morningTimeIn ? formatTime(rec.morningTimeIn) : "-"}
                          </td>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.morningTimeOut ? formatTime(rec.morningTimeOut) : "-"}
                          </td>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.afternoonTimeIn ? formatTime(rec.afternoonTimeIn) : "-"}
                          </td>
                          <td className="px-1.5 py-2 border-r text-slate-800">
                            {rec?.afternoonTimeOut ? formatTime(rec.afternoonTimeOut) : "-"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollWrapper>
        )}
      </div>

      {/* Override Modal for Attendance Matrix */}
      {selectedPbForOverride && (
        <AdminStubOverrideModal
          isOpen={!!selectedPbForOverride}
          onClose={() => setSelectedPbForOverride(null)}
          programId={selectedProgramId}
          programBeneficiary={selectedPbForOverride}
          onUpdated={(updatedPb) => {
            setBeneficiaries((prev) =>
              prev.map((b) => (b.id === updatedPb.id ? { ...b, ...updatedPb } : b))
            );
          }}
        />
      )}
    </div>
  );
}

export default function AttendanceMatrixPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Attendance Matrix...</div>}>
      <AttendanceMatrixContent />
    </Suspense>
  );
}
