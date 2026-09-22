"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, isFieldCoordinator } from "@/lib/permissions";
import {
  FolderKanban,
  Users,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Search,
  Printer,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building,
  Sparkles,
  Layers,
  ArrowRight,
  UserCheck,
  Info,
  Lock,
  Download,
} from "lucide-react";
import {
  DINGALAN_BARANGAY_GROUPINGS,
  getBarangayKey,
  getStandardBarangayName,
  classifyBeneficiaryGroup,
  computeGroupDemographics,
  PurokSitioGroupDefinition,
} from "@/lib/dingalan-groupings";
import { normalizeBarangayName, DINGALAN_BARANGAYS } from "@/lib/utils";

export default function FieldWorkProgramPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [program, setProgram] = useState<any>(null);
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: "groups" | "schedule"
  const [activeTab, setActiveTab] = useState<"groups" | "schedule">("groups");

  // Filter states
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Groupings loaded from system definition & local custom storage
  const [customGroups, setCustomGroups] = useState<Record<string, PurokSitioGroupDefinition[]>>({});
  const [beneficiaryGroupAssignments, setBeneficiaryGroupAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPrograms();
    loadCustomGroupStorage();
  }, []);

  // Sync assigned barangay from user profile
  useEffect(() => {
    if (user?.assignedBarangay && !isAdmin) {
      setSelectedBarangay(normalizeBarangayName(user.assignedBarangay));
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (selectedProgramId) {
      fetchProgramDetail(selectedProgramId);
    }
  }, [selectedProgramId, selectedBarangay]);

  const loadCustomGroupStorage = () => {
    try {
      const saved = localStorage.getItem("tupad_custom_deployment_groupings");
      if (saved) setCustomGroups(JSON.parse(saved));
      const savedAssignments = localStorage.getItem("tupad_beneficiary_group_assignments");
      if (savedAssignments) setBeneficiaryGroupAssignments(JSON.parse(savedAssignments));
    } catch (e) {
      console.warn("Storage read error:", e);
    }
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        setPrograms(progs);
        if (progs.length > 0) {
          setSelectedProgramId(progs[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch programs error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgramDetail = async (progId: string) => {
    try {
      setLoading(true);

      let wpUrl = `/api/v1/programs/${progId}/work-program`;
      if (selectedBarangay && selectedBarangay !== "ALL") {
        wpUrl += `?barangay=${encodeURIComponent(selectedBarangay)}`;
      }

      let beneUrl = `/api/v1/programs/${progId}/beneficiaries?withSchedule=false`;
      if (selectedBarangay && selectedBarangay !== "ALL") {
        beneUrl += `&barangay=${encodeURIComponent(selectedBarangay)}`;
      }

      const [resProg, resWp, resBene] = await Promise.all([
        fetch(`/api/v1/programs/${progId}`),
        fetch(wpUrl),
        fetch(beneUrl),
      ]);

      if (resProg.ok) {
        const data = await resProg.json();
        setProgram(data.program);
      }

      if (resWp.ok) {
        const data = await resWp.json();
        const wps = data.workPrograms || [];
        setWorkPrograms(wps);
        if (!selectedBarangay && wps.length > 0) {
          setSelectedBarangay(wps[0].barangay);
        }
      }

      if (resBene.ok) {
        const data = await resBene.json();
        setBeneficiaries(data.beneficiaries || []);
      }
    } catch (err) {
      console.error("Fetch work program detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Determine standard barangay name
  const activeBarangayName = useMemo(() => {
    if (user?.assignedBarangay && !isAdmin) {
      return normalizeBarangayName(user.assignedBarangay);
    }
    return selectedBarangay || "Paltic";
  }, [user, isAdmin, selectedBarangay]);

  // Compute groupings and distribute beneficiaries into their designated groups
  const barangayGroups = useMemo(() => {
    const stdName = getStandardBarangayName(activeBarangayName);
    const bKey = getBarangayKey(activeBarangayName);
    const defaultCfg = DINGALAN_BARANGAY_GROUPINGS[bKey]?.groups || [];
    const customForBrgy = customGroups[stdName] || [];

    // Filter beneficiaries belonging to this barangay
    const brgyBeneficiaries = beneficiaries.filter((pb) => {
      if (pb.participationStatus === "REPLACED") return false;
      const b = pb.beneficiary || pb;
      const bBrgy = getStandardBarangayName(b.barangay || "");
      return bBrgy === stdName;
    });

    // 1. Build initial list of groups
    const initialGroups = [
      ...defaultCfg.map((g) => {
        const customOverride = customForBrgy.find((cg) => cg.groupName === g.groupName);
        return {
          groupName: g.groupName,
          groupLabel: customOverride?.groupLabel || g.groupLabel,
          designatedMainArea: customOverride?.designatedMainArea || g.designatedMainArea,
          specificActivity: (customOverride as any)?.specificActivity || (g as any).specificActivity || "",
          coveredPuroks: customOverride?.purokSitios || g.purokSitios,
          beneficiaries: [] as any[],
        };
      }),
      ...customForBrgy
        .filter((cg) => !defaultCfg.some((g) => g.groupName === cg.groupName))
        .map((cg) => ({
          groupName: cg.groupName,
          groupLabel: cg.groupLabel,
          designatedMainArea: cg.designatedMainArea,
          specificActivity: (cg as any).specificActivity || "",
          coveredPuroks: cg.purokSitios,
          beneficiaries: [] as any[],
        })),
    ];

    // 2. Populate beneficiaries into their assigned groups
    brgyBeneficiaries.forEach((pb) => {
      const b = pb.beneficiary || pb;

      // Check explicit assignment
      const explicitGroupName =
        beneficiaryGroupAssignments[pb.id] ||
        beneficiaryGroupAssignments[b.id] ||
        beneficiaryGroupAssignments[b.designatedNumber];

      let matchedGroup = initialGroups.find((g) => g.groupName === explicitGroupName);

      // If no explicit assignment, match by covered puroks
      if (!matchedGroup) {
        const sitio = (b.sitio || "").trim().toUpperCase();
        matchedGroup = initialGroups.find((g) =>
          g.coveredPuroks.some((p) => sitio.includes(p.toUpperCase()) || p.toUpperCase().includes(sitio))
        );
      }

      // Fallback to default classifier
      if (!matchedGroup) {
        const classification = classifyBeneficiaryGroup(stdName, b.sitio || "");
        matchedGroup = initialGroups.find((g) => g.groupName === classification.groupName);
        if (!matchedGroup && initialGroups.length > 0) {
          matchedGroup = initialGroups[0];
        }
      }

      if (matchedGroup) {
        matchedGroup.beneficiaries.push(pb);
      }
    });

    // 3. Compute demographics & sort beneficiaries naturally
    return initialGroups.map((g) => {
      const sortedBenes = [...g.beneficiaries].sort((a, b) => {
        const numA = parseInt(a.designatedNumber || a.beneficiary?.designatedNumber, 10);
        const numB = parseInt(b.designatedNumber || b.beneficiary?.designatedNumber, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return (a.beneficiary?.fullName || "").localeCompare(b.beneficiary?.fullName || "");
      });

      const demo = computeGroupDemographics(sortedBenes);
      return {
        ...g,
        beneficiaries: sortedBenes,
        demographics: demo,
        beneficiaryCount: sortedBenes.length,
      };
    });
  }, [activeBarangayName, customGroups, beneficiaryGroupAssignments, beneficiaries]);

  // Expand all groups by default on first load
  useEffect(() => {
    if (barangayGroups.length > 0 && Object.keys(expandedGroups).length === 0) {
      const initialMap: Record<string, boolean> = {};
      barangayGroups.forEach((g) => {
        initialMap[g.groupName] = true;
      });
      setExpandedGroups(initialMap);
    }
  }, [barangayGroups]);

  const toggleGroupExpand = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Filtered beneficiaries based on search query
  const filteredBarangayGroups = useMemo(() => {
    if (!searchQuery.trim()) return barangayGroups;
    const q = searchQuery.toLowerCase().trim();

    return barangayGroups.map((g) => {
      const matchingBenes = g.beneficiaries.filter((pb) => {
        const b = pb.beneficiary || pb;
        const name = (b.fullName || "").toLowerCase();
        const desig = String(pb.designatedNumber || b.designatedNumber || "");
        const sitio = (b.sitio || "").toLowerCase();
        return name.includes(q) || desig.includes(q) || sitio.includes(q);
      });

      return {
        ...g,
        beneficiaries: matchingBenes,
      };
    });
  }, [barangayGroups, searchQuery]);

  // Active Work Program Items for Schedule Tab
  const currentWp = workPrograms.find((w) => w.barangay === activeBarangayName) || workPrograms[0];
  const scheduleItems: any[] = currentWp?.items || [];
  const filteredScheduleItems =
    selectedDayFilter === "ALL"
      ? scheduleItems
      : scheduleItems.filter((it: any) => it.dayNumber === selectedDayFilter);

  // Overall Barangay Totals
  const totalBeneficiaries = barangayGroups.reduce((sum, g) => sum + g.beneficiaryCount, 0);
  const totalMale = barangayGroups.reduce((sum, g) => sum + g.demographics.maleCount, 0);
  const totalFemale = barangayGroups.reduce((sum, g) => sum + g.demographics.femaleCount, 0);
  const totalScPwd = barangayGroups.reduce(
    (sum, g) => sum + g.demographics.scPwdMaleCount + g.demographics.scPwdFemaleCount,
    0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 print:p-0 print:max-w-none">
      {/* 1. Header Banner */}
      <div className="gov-card p-6 bg-gradient-to-r from-gov-dark via-slate-900 to-blue-950 text-white rounded-3xl border-2 border-gov-gold/40 shadow-xl print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-gov-gold text-gov-dark font-mono">
                PESO DINGALAN
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center space-x-1">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>View-Only Mode</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Barangay {activeBarangayName}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center space-x-2">
              <FolderKanban className="w-7 h-7 text-gov-gold" />
              <span>TUPAD Work Program &amp; Deployment Groupings</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Official 10-day work plan schedule, purok deployment groups, designated work areas, and assigned beneficiary rosters for{" "}
              <strong>Barangay {activeBarangayName}</strong>.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition border border-white/20 flex items-center space-x-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-gov-gold" />
              <span>Print Official Roster</span>
            </button>
          </div>
        </div>

        {/* Notice for Coordinators */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center space-x-3 text-xs text-amber-200">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Official Approved Record:</strong> As a Field Coordinator / Assisting Documentor, this view is strictly in <strong>read-only mode</strong>. All schedules, work areas, and quotas represent the central PESO Admin approved deployment for your barangay.
          </span>
        </div>
      </div>

      {/* 2. Controls & Program / Barangay Scope */}
      <div className="gov-card p-4 bg-white space-y-4 shadow-sm print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Program Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Program</label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 focus:outline-none focus:border-gov-blue"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.programCode} - {p.programName}
                </option>
              ))}
            </select>
          </div>

          {/* Barangay Scope (Locked for field coordinators, switchable for admins) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Assigned Barangay Scope
            </label>
            {isAdmin ? (
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 focus:outline-none focus:border-gov-blue"
              >
                {DINGALAN_BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    Barangay {b}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 text-xs border border-emerald-200 rounded-lg bg-emerald-50 text-emerald-900 font-bold flex items-center justify-between">
                <span>Barangay {activeBarangayName}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-950">
                  Assigned
                </span>
              </div>
            )}
          </div>

          {/* View Tab Switcher */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Display View</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("groups")}
                className={`py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center space-x-1 ${
                  activeTab === "groups"
                    ? "bg-gov-blue text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Purok Groupings ({barangayGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className={`py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center space-x-1 ${
                  activeTab === "schedule"
                    ? "bg-gov-blue text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>10-Day Activities</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demographic Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Beneficiaries</span>
              <strong className="text-base font-black text-slate-900">{totalBeneficiaries} Pax</strong>
            </div>
            <Users className="w-5 h-5 text-gov-blue opacity-80" />
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Male Laborers</span>
              <strong className="text-base font-black text-blue-900">{totalMale}</strong>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600">
              {totalBeneficiaries > 0 ? Math.round((totalMale / totalBeneficiaries) * 100) : 0}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-700 uppercase block">Female Laborers</span>
              <strong className="text-base font-black text-rose-900">{totalFemale}</strong>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600">
              {totalBeneficiaries > 0 ? Math.round((totalFemale / totalBeneficiaries) * 100) : 0}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-700 uppercase block">SC &amp; PWD Quota</span>
              <strong className="text-base font-black text-purple-900">{totalScPwd}</strong>
            </div>
            <span className="text-xs font-mono font-bold text-purple-600">
              {totalBeneficiaries > 0 ? Math.round((totalScPwd / totalBeneficiaries) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. PRINT HEADER (Visible only on print) */}
      <div className="hidden print:block text-center space-y-2 mb-6 border-b-2 border-slate-900 pb-4">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-700">Republic of the Philippines</div>
        <div className="text-sm font-black uppercase text-slate-900">Province of Aurora • Municipality of Dingalan</div>
        <div className="text-base font-black text-slate-900">PUBLIC EMPLOYMENT SERVICE OFFICE (PESO)</div>
        <div className="text-xs font-bold text-slate-600 mt-1">
          TUPAD EMERGENCY EMPLOYMENT PROGRAM • 10-DAY WORK PLAN &amp; DEPLOYMENT ROSTER
        </div>
        <div className="text-sm font-black text-gov-blue mt-1">
          BARANGAY {activeBarangayName.toUpperCase()}, DINGALAN, AURORA
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Program: {program?.programCode} - {program?.programName} • Total Quota: {totalBeneficiaries} Beneficiaries
        </div>
      </div>

      {/* 4. TAB 1: PUROK DEPLOYMENT GROUPINGS & BENEFICIARY ROSTER */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          {/* Search box & Expand Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search beneficiary name, designated slot (#), or purok..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white shadow-xs focus:outline-none focus:border-gov-blue"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const allOpen: Record<string, boolean> = {};
                  barangayGroups.forEach((g) => (allOpen[g.groupName] = true));
                  setExpandedGroups(allOpen);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-[11px]"
              >
                Expand All Groups
              </button>
              <button
                type="button"
                onClick={() => setExpandedGroups({})}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-[11px]"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Group Cards */}
          {filteredBarangayGroups.length === 0 ? (
            <div className="gov-card p-12 text-center text-slate-400 text-xs">
              No groupings or beneficiaries matched your search criteria.
            </div>
          ) : (
            filteredBarangayGroups.map((group, idx) => {
              const isExpanded = expandedGroups[group.groupName] ?? true;
              return (
                <div
                  key={group.groupName}
                  className="gov-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition print:border print:shadow-none print:break-inside-avoid mb-4"
                >
                  {/* Group Header Bar */}
                  <div
                    onClick={() => toggleGroupExpand(group.groupName)}
                    className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-gov-blue text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-black text-slate-900">{group.groupLabel}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-gov-blue font-bold">
                            {group.beneficiaryCount} Pax
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-gov-gold shrink-0" />
                          <span>
                            <strong>Designated Work Area:</strong> {group.designatedMainArea}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 self-end sm:self-auto">
                      {/* Demographic Pill */}
                      <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        <span>
                          <strong className="text-blue-700">{group.demographics.maleCount}</strong> M
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-rose-700">{group.demographics.femaleCount}</strong> F
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-purple-700">
                            {group.demographics.scPwdMaleCount + group.demographics.scPwdFemaleCount}
                          </strong>{" "}
                          SC/PWD
                        </span>
                      </div>

                      <div className="text-slate-400 print:hidden">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Covered Puroks / Sitios */}
                  <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                    <strong className="text-slate-700 text-[10px] uppercase">Covered Purok / Sitio Zones:</strong>
                    {group.coveredPuroks && group.coveredPuroks.length > 0 ? (
                      group.coveredPuroks.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-800 font-semibold"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="italic text-slate-400">All Purok sectors in {activeBarangayName}</span>
                    )}
                  </div>

                  {/* Beneficiary Names Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/75 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                            <th className="py-2 px-3 w-16 text-center">Slot #</th>
                            <th className="py-2 px-3">Beneficiary Full Name</th>
                            <th className="py-2 px-3">Purok / Sitio</th>
                            <th className="py-2 px-3 text-center">Sex</th>
                            <th className="py-2 px-3 text-center">Age</th>
                            <th className="py-2 px-3">Special Status</th>
                            <th className="py-2 px-3 text-center">Program Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.beneficiaries.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                                Walang nakatalagang benepisyaryo sa grupong ito.
                              </td>
                            </tr>
                          ) : (
                            group.beneficiaries.map((pb, bIdx) => {
                              const b = pb.beneficiary || pb;
                              return (
                                <tr
                                  key={pb.id || bIdx}
                                  className="hover:bg-blue-50/30 transition text-slate-800"
                                >
                                  <td className="py-2 px-3 text-center font-mono font-black text-gov-blue">
                                    #{pb.designatedNumber || b.designatedNumber || bIdx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-900">
                                    {b.fullName}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">
                                    {b.sitio ? `Purok / Sitio ${b.sitio}` : `Brgy. ${activeBarangayName}`}
                                  </td>
                                  <td className="py-2 px-3 text-center font-semibold">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        b.sex === "FEMALE"
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {b.sex || "N/A"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono text-slate-700">
                                    {b.age || "—"}
                                  </td>
                                  <td className="py-2 px-3">
                                    <div className="flex flex-wrap gap-1">
                                      {b.isSenior && (
                                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                                          Senior
                                        </span>
                                      )}
                                      {b.isPwd && (
                                        <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[9px] font-bold">
                                          PWD
                                        </span>
                                      )}
                                      {b.is4Ps && (
                                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                                          4Ps
                                        </span>
                                      )}
                                      {b.isIp && (
                                        <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded text-[9px] font-bold">
                                          IP
                                        </span>
                                      )}
                                      {!b.isSenior && !b.isPwd && !b.is4Ps && !b.isIp && (
                                        <span className="text-slate-400 text-[10px]">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Active</span>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. TAB 2: 10-DAY SCHEDULE OF ACTIVITIES & WORK AREAS */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          {/* Day Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 print:hidden">
            <button
              type="button"
              onClick={() => setSelectedDayFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedDayFilter === "ALL"
                  ? "bg-gov-blue text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              All 10 Days
            </button>
            {Array.from({ length: 10 }).map((_, i) => {
              const d = i + 1;
              const isSelected = selectedDayFilter === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDayFilter(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isSelected
                      ? "bg-gov-blue text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Day {d}
                </button>
              );
            })}
          </div>

          {/* Activities Table */}
          <div className="gov-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  10-Day Work Activity Schedule &amp; Target Areas
                </h3>
                <p className="text-xs text-slate-500">
                  Showing {filteredScheduleItems.length} activities scheduled for Barangay {activeBarangayName}
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-blue-100 text-gov-blue">
                {selectedDayFilter === "ALL" ? "All Days (1–10)" : `Day ${selectedDayFilter}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3 w-16 text-center">Day #</th>
                    <th className="py-2.5 px-3 w-48">Designated Work Area</th>
                    <th className="py-2.5 px-3">Specific Activities Description</th>
                    <th className="py-2.5 px-3 text-center">Male</th>
                    <th className="py-2.5 px-3 text-center">Female</th>
                    <th className="py-2.5 px-3 text-center">SC / PWD</th>
                    <th className="py-2.5 px-3 text-center font-bold">Total Pax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScheduleItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                        Walang nakatakdang aktibidad para sa napiling araw.
                      </td>
                    </tr>
                  ) : (
                    filteredScheduleItems.map((it: any) => (
                      <tr key={it.id} className="hover:bg-blue-50/20 transition text-slate-800">
                        <td className="py-3 px-3 text-center font-mono font-black text-gov-blue">
                          Day {it.dayNumber}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-gov-gold shrink-0" />
                            <span>{it.area}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 leading-relaxed">
                          {it.specificActivities}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-blue-700">
                          {it.maleCount || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-rose-700">
                          {it.femaleCount || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-purple-700">
                          {(it.scPwdMaleCount || 0) + (it.scPwdFemaleCount || 0)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-900 bg-slate-50/50">
                          {it.totalCount || (it.maleCount || 0) + (it.femaleCount || 0)} Pax
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SIGNATURE SECTION (Visible on Print) */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-300 text-xs">
        <div className="space-y-12">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Prepared &amp; Monitored By:</span>
            <div className="mt-8 border-b border-slate-900 w-64 pb-1">
              <strong>{user?.fullName}</strong>
            </div>
            <span className="text-[10px] text-slate-600 block mt-0.5">
              TUPAD Field Coordinator / Assisting Documentor • Brgy. {activeBarangayName}
            </span>
          </div>
        </div>

        <div className="space-y-12 text-right">
          <div className="inline-block text-left">
            <span className="text-[10px] uppercase font-bold text-slate-500">Approved for Field Deployment:</span>
            <div className="mt-8 border-b border-slate-900 w-64 pb-1">
              <strong>PESO DINGALAN MANAGEMENT</strong>
            </div>
            <span className="text-[10px] text-slate-600 block mt-0.5">
              Public Employment Service Office • Municipality of Dingalan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
