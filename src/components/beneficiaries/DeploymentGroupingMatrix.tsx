"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  Users,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ArrowRight,
  Filter,
  Plus,
  PlusCircle,
  Search,
  Save,
  X,
  Layers,
  Check,
  Send,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  DINGALAN_BARANGAY_GROUPINGS,
  getBarangayKey,
  getStandardBarangayName,
  classifyBeneficiaryGroup,
  computeGroupDemographics,
  PurokSitioGroupDefinition,
} from "@/lib/dingalan-groupings";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, isFieldCoordinator } from "@/lib/permissions";

interface DeploymentGroupingMatrixProps {
  beneficiaries: any[];
  selectedBarangay: string;
  onEditBeneficiary?: (pb: any) => void;
  onDeleteBeneficiary?: (pb: any) => void;
  programId?: string;
}

export function DeploymentGroupingMatrix({
  beneficiaries,
  selectedBarangay,
  onEditBeneficiary,
  onDeleteBeneficiary,
  programId,
}: DeploymentGroupingMatrixProps) {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const isCoordinator = isFieldCoordinator(user);
  const canManage = isAdmin || isCoordinator;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeBarangayFilter, setActiveBarangayFilter] = useState<string>(
    user?.assignedBarangay || selectedBarangay || "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Custom Groups State (Persisted in localStorage & component state)
  const [customGroups, setCustomGroups] = useState<Record<string, PurokSitioGroupDefinition[]>>({});

  // Group Create Modal State
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [targetBarangayForNewGroup, setTargetBarangayForNewGroup] = useState("Aplaya");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newDesignatedArea, setNewDesignatedArea] = useState("");
  const [newCoveredPuroks, setNewCoveredPuroks] = useState("");

  // Area Assignment Modal State
  const [isAssignAreaModalOpen, setIsAssignAreaModalOpen] = useState(false);
  const [assigningGroup, setAssigningGroup] = useState<any | null>(null);
  const [assignAreaName, setAssignAreaName] = useState("");
  const [assignSpecificActivity, setAssignSpecificActivity] = useState("");
  const [assignTargetDays, setAssignTargetDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState<string | null>(null);

  // Load custom groups on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tupad_custom_deployment_groupings");
      if (saved) {
        setCustomGroups(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load custom groupings from storage:", e);
    }
  }, []);

  const saveCustomGroupsToStorage = (updated: Record<string, PurokSitioGroupDefinition[]>) => {
    setCustomGroups(updated);
    try {
      localStorage.setItem("tupad_custom_deployment_groupings", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save custom groupings:", e);
    }
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleExpandAll = () => {
    const allExp: Record<string, boolean> = {};
    displayBarangays.forEach((brgy) => {
      brgy.groups.forEach((g) => {
        allExp[`${brgy.barangay}_${g.groupName}`] = true;
      });
    });
    setExpandedGroups(allExp);
  };

  const handleCollapseAll = () => {
    setExpandedGroups({});
  };

  // Group active beneficiaries by standard Barangay and Group
  const groupedData = useMemo(() => {
    const barangayMap: Record<
      string,
      {
        barangay: string;
        groups: Array<{
          groupName: string;
          groupLabel: string;
          designatedMainArea: string;
          coveredPuroks: string[];
          isCustom?: boolean;
          beneficiaries: any[];
          demographics: ReturnType<typeof computeGroupDemographics>;
        }>;
        totalCount: number;
      }
    > = {};

    // 1. Initialize all barangays and default configured groups
    Object.entries(DINGALAN_BARANGAY_GROUPINGS).forEach(([bKey, cfg]) => {
      const stdName = cfg.barangay;
      const customForBrgy = customGroups[stdName] || [];

      const initialGroups = [
        ...cfg.groups.map((g) => ({
          groupName: g.groupName,
          groupLabel: g.groupLabel,
          designatedMainArea: g.designatedMainArea,
          coveredPuroks: g.purokSitios,
          isCustom: false,
          beneficiaries: [],
          demographics: {
            totalCount: 0,
            maleCount: 0,
            femaleCount: 0,
            scPwdMaleCount: 0,
            scPwdFemaleCount: 0,
            isSeniorCount: 0,
            isPwdCount: 0,
            isIpCount: 0,
            is4PsCount: 0,
          },
        })),
        ...customForBrgy.map((cg) => ({
          groupName: cg.groupName,
          groupLabel: cg.groupLabel,
          designatedMainArea: cg.designatedMainArea,
          coveredPuroks: cg.purokSitios,
          isCustom: true,
          beneficiaries: [],
          demographics: {
            totalCount: 0,
            maleCount: 0,
            femaleCount: 0,
            scPwdMaleCount: 0,
            scPwdFemaleCount: 0,
            isSeniorCount: 0,
            isPwdCount: 0,
            isIpCount: 0,
            is4PsCount: 0,
          },
        })),
      ];

      barangayMap[stdName] = {
        barangay: stdName,
        groups: initialGroups,
        totalCount: 0,
      };
    });

    // 2. Populate beneficiaries into groups
    beneficiaries.forEach((pb) => {
      if (pb.participationStatus === "REPLACED") return;
      const b = pb.beneficiary || pb;
      const rawBrgy = b.barangay || "Paltic";
      const stdBrgy = getStandardBarangayName(rawBrgy);

      if (!barangayMap[stdBrgy]) {
        barangayMap[stdBrgy] = {
          barangay: stdBrgy,
          groups: [],
          totalCount: 0,
        };
      }

      const brgyEntry = barangayMap[stdBrgy];
      brgyEntry.totalCount += 1;

      // Classify which group this beneficiary belongs to
      const sitio = (b.sitio || "").trim().toUpperCase();
      let matchedGroup = brgyEntry.groups.find((g) =>
        g.coveredPuroks.some((p) => sitio.includes(p.toUpperCase()) || p.toUpperCase().includes(sitio))
      );

      if (!matchedGroup) {
        // Fallback to standard algorithmic classifier
        const classification = classifyBeneficiaryGroup(stdBrgy, b.sitio || "");
        matchedGroup = brgyEntry.groups.find((g) => g.groupName === classification.groupName);

        if (!matchedGroup && brgyEntry.groups.length > 0) {
          matchedGroup = brgyEntry.groups[0];
        } else if (!matchedGroup) {
          matchedGroup = {
            groupName: classification.groupName,
            groupLabel: classification.groupLabel,
            designatedMainArea: classification.designatedMainArea,
            coveredPuroks: [],
            isCustom: false,
            beneficiaries: [],
            demographics: {
              totalCount: 0,
              maleCount: 0,
              femaleCount: 0,
              scPwdMaleCount: 0,
              scPwdFemaleCount: 0,
              isSeniorCount: 0,
              isPwdCount: 0,
              isIpCount: 0,
              is4PsCount: 0,
            },
          };
          brgyEntry.groups.push(matchedGroup);
        }
      }

      matchedGroup.beneficiaries.push(pb);
    });

    // 3. Compute demographics for each group
    Object.values(barangayMap).forEach((brgyEntry) => {
      brgyEntry.groups.forEach((g) => {
        g.demographics = computeGroupDemographics(g.beneficiaries);
      });
    });

    return barangayMap;
  }, [beneficiaries, customGroups]);

  // Handle creating a new custom group
  const handleCreateNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const stdBrgy = getStandardBarangayName(targetBarangayForNewGroup);
    const purokList = newCoveredPuroks
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean);

    const newDef: PurokSitioGroupDefinition = {
      groupName: newGroupName.trim().toUpperCase(),
      groupLabel: newGroupLabel.trim() || newGroupName.trim(),
      designatedMainArea: newDesignatedArea.trim() || `${stdBrgy} Designated Sector`,
      purokSitios: purokList.length > 0 ? purokList : [newGroupName.trim()],
    };

    const currentForBrgy = customGroups[stdBrgy] || [];
    const updated = {
      ...customGroups,
      [stdBrgy]: [...currentForBrgy, newDef],
    };

    saveCustomGroupsToStorage(updated);
    setIsCreateGroupModalOpen(false);
    setNewGroupName("");
    setNewGroupLabel("");
    setNewDesignatedArea("");
    setNewCoveredPuroks("");
  };

  // Handle deleting a custom group
  const handleDeleteCustomGroup = (barangay: string, groupName: string) => {
    if (!confirm(`Are you sure you want to remove the custom group "${groupName}" from Barangay ${barangay}?`)) return;

    const currentForBrgy = customGroups[barangay] || [];
    const updatedForBrgy = currentForBrgy.filter((g) => g.groupName !== groupName);

    const updated = {
      ...customGroups,
      [barangay]: updatedForBrgy,
    };

    saveCustomGroupsToStorage(updated);
  };

  // Handle assigning deployment area and syncing with TUPAD Work Program
  const handleOpenAssignAreaModal = (brgy: string, group: any) => {
    setAssigningGroup({ ...group, barangay: brgy });
    setAssignAreaName(group.designatedMainArea || "");
    setAssignSpecificActivity(`Roadside maintenance, drainage declogging, and environmental cleaning in ${group.designatedMainArea}`);
    setAssignTargetDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    setAssignmentFeedback(null);
    setIsAssignAreaModalOpen(true);
  };

  const handleSaveAreaAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningGroup || !assignAreaName.trim()) return;

    setIsSubmittingAssignment(true);
    setAssignmentFeedback(null);

    try {
      // 1. If programId is present, we sync directly to the TUPAD Work Program for this barangay
      if (programId) {
        // Fetch existing work program for this barangay
        const resWp = await fetch(`/api/v1/programs/${programId}/work-program?barangay=${encodeURIComponent(assigningGroup.barangay)}`);
        if (resWp.ok) {
          const wpData = await resWp.json();
          const targetWp = wpData.workPrograms?.find((w: any) => w.barangay === assigningGroup.barangay) || wpData.workPrograms?.[0];

          if (targetWp && targetWp.items) {
            // Find items for the target days
            const targetItemIds = targetWp.items
              .filter((it: any) => assignTargetDays.includes(it.dayNumber))
              .map((it: any) => it.id);

            if (targetItemIds.length > 0) {
              // Batch update activities with new area and activity description
              await fetch(`/api/v1/programs/${programId}/work-program/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "UPDATE",
                  itemIds: targetItemIds,
                  groupName: assigningGroup.groupName,
                  area: assignAreaName.trim(),
                  specificActivities: assignSpecificActivity.trim(),
                  updates: {
                    maleCount: assigningGroup.demographics.maleCount,
                    femaleCount: assigningGroup.demographics.femaleCount,
                    scPwdMaleCount: assigningGroup.demographics.scPwdMaleCount,
                    scPwdFemaleCount: assigningGroup.demographics.scPwdFemaleCount,
                    totalCount: assigningGroup.demographics.totalCount,
                  },
                }),
              });
            }
          }
        }
      }

      // Update local storage area name for the group
      setAssignmentFeedback(`✓ Itinalaga ang "${assigningGroup.groupLabel}" sa "${assignAreaName.trim()}" para sa Araw ${assignTargetDays.join(", ")}!`);
      setTimeout(() => {
        setIsAssignAreaModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setAssignmentFeedback("Nagkaroon ng error sa pag-save: " + err.message);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const toggleTargetDay = (dayNum: number) => {
    setAssignTargetDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum].sort((a, b) => a - b)
    );
  };

  // Filtered barangays to display
  const displayBarangays = Object.values(groupedData).filter((b) => {
    if (activeBarangayFilter === "ALL") return true;
    return b.barangay === activeBarangayFilter;
  });

  const totalMunicipalGroups = Object.values(groupedData).reduce((acc, b) => acc + b.groups.length, 0);
  const totalMunicipalBeneficiaries = Object.values(groupedData).reduce((acc, b) => acc + b.totalCount, 0);

  const ALL_BARANGAYS = [
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
      {/* 1. Municipal Grouping & Deployment Overview Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center space-x-1 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>TUPAD Work Program Deployment Grouping Matrix</span>
              </span>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-[10px] font-bold">
                {canManage ? "Coordinator & Admin Enabled" : "Read-Only View"}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Beneficiaries Grouped by Barangay &amp; Purok/Sitio Assignment
            </h3>

            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Opisyal na batayan ng deployment para sa 10-araw na TUPAD work program. Ang mga grupo ay nagpapasya ng mga magkakalapit na Purok/Sitio na sabay-sabay ide-deploy sa itinalagang work area kalakip ang tamang demographic tallies.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setTargetBarangayForNewGroup(activeBarangayFilter !== "ALL" ? activeBarangayFilter : "Aplaya");
                  setIsCreateGroupModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Lumikha ng Bagong Grupo</span>
              </button>
            )}

            {programId && (
              <a
                href={`/programs/${programId}/work-program`}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5"
              >
                <span>View 10-Day Work Program</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Total Number of Groups per Barangay Distribution Summary Strip */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold uppercase text-slate-300 text-[11px] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>Kabuuang Bilang ng Grupo Bawat Barangay ({totalMunicipalGroups} Groups Total • {totalMunicipalBeneficiaries} Pax)</span>
            </span>
            <div className="space-x-2 hidden sm:block">
              <button
                type="button"
                onClick={handleExpandAll}
                className="text-[11px] text-amber-300 hover:underline font-bold cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="text-[11px] text-slate-400 hover:underline font-bold cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* 11-Barangay Group Count Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveBarangayFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                activeBarangayFilter === "ALL"
                  ? "bg-amber-400 text-slate-950 font-black shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span>Lahat (11 Barangays)</span>
              <span className="px-1.5 py-0.2 bg-slate-950/40 rounded font-mono text-[10px]">
                {totalMunicipalGroups} Groups
              </span>
            </button>

            {Object.values(groupedData).map((b) => {
              const isSelected = activeBarangayFilter === b.barangay;
              return (
                <button
                  key={b.barangay}
                  type="button"
                  onClick={() => setActiveBarangayFilter(b.barangay)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white font-black shadow-md"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>{b.barangay}</span>
                  <span className="px-1.5 py-0.2 bg-slate-950/50 rounded font-mono text-[10px] text-amber-300">
                    {b.groups.length} {b.groups.length === 1 ? "Grp" : "Grps"} ({b.totalCount})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Barangay Group Cards Grid */}
      <div className="space-y-6">
        {displayBarangays.map((brgy) => (
          <div key={brgy.barangay} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-200">
            {/* Barangay Title Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-900 text-white rounded-2xl shadow-xs">
                  <Building className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      Barangay {brgy.barangay}
                    </h4>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 font-black text-xs rounded-full border border-amber-300">
                      {brgy.groups.length} Deployment Group(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Kabuuang Enrolled Beneficiaries: <span className="font-bold text-blue-900">{brgy.totalCount} Tao</span>
                  </p>
                </div>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetBarangayForNewGroup(brgy.barangay);
                    setIsCreateGroupModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center space-x-1 border border-slate-300 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Magdagdag ng Grupo sa {brgy.barangay}</span>
                </button>
              )}
            </div>

            {/* Groups List */}
            <div className="divide-y divide-slate-100">
              {brgy.groups.map((g) => {
                const groupKey = `${brgy.barangay}_${g.groupName}`;
                const isExpanded = Boolean(expandedGroups[groupKey]);
                const demo = g.demographics;

                return (
                  <div key={g.groupName} className="p-5 sm:p-6 space-y-4 hover:bg-slate-50/60 transition">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Group Label, Designated Main Area & Covered Puroks */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 bg-amber-100 text-amber-950 font-black text-xs rounded-xl border border-amber-300 shadow-2xs">
                            {g.groupLabel}
                          </span>
                          <span className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{g.designatedMainArea}</span>
                          </span>
                          {g.isCustom && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-bold rounded-md">
                              Custom Group
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          Sakop na Puroks &amp; Sitios:{" "}
                          <span className="font-bold text-slate-900">
                            {g.coveredPuroks.length > 0 ? g.coveredPuroks.join(", ") : "Lahat ng Purok sa Barangay"}
                          </span>
                        </p>
                      </div>

                      {/* Right: Demographics Pills & Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1.5 bg-slate-900 text-amber-300 border border-slate-800 rounded-xl text-xs font-black font-mono">
                          Total: {demo.totalCount}
                        </span>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-[11px] font-bold">
                          ♂ {demo.maleCount}
                        </span>
                        <span className="px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-[11px] font-bold">
                          ♀ {demo.femaleCount}
                        </span>
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold">
                          SC: {demo.isSeniorCount}
                        </span>
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-[11px] font-bold">
                          PWD: {demo.isPwdCount}
                        </span>
                        {demo.isIpCount > 0 && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold">
                            IP: {demo.isIpCount}
                          </span>
                        )}

                        {/* Assign Area & Deploy to Work Program */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignAreaModal(brgy.barangay, g)}
                            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-sm cursor-pointer"
                            title="Assign what area this group will be deployed to in the 10-day work program"
                          >
                            <MapPin className="w-3.5 h-3.5 text-gov-gold" />
                            <span>Italaga sa Work Area</span>
                          </button>
                        )}

                        {/* Custom Group Delete */}
                        {g.isCustom && canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomGroup(brgy.barangay, g.groupName)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                            title="Delete custom group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Toggle Roster Table */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKey)}
                          className="px-3 py-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl border border-slate-300 transition flex items-center space-x-1 text-xs font-bold shadow-2xs cursor-pointer"
                        >
                          <span>{isExpanded ? "Itago ang Talaan" : "Tingnan ang Talaan"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Group Roster Table */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200 animate-fadeIn">
                        <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-white font-extrabold uppercase text-[10px] border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-3">Slot #</th>
                                <th className="px-4 py-3">Full Name</th>
                                <th className="px-4 py-3">Purok / Sitio</th>
                                <th className="px-4 py-3">Kasarian &amp; Edad</th>
                                <th className="px-4 py-3">Sectors</th>
                                <th className="px-4 py-3">Contact No.</th>
                                {onEditBeneficiary && <th className="px-4 py-3 text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {g.beneficiaries.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400">
                                    Walang nakalistang benepisyaryo sa grupong ito.
                                  </td>
                                </tr>
                              ) : (
                                g.beneficiaries.map((pb) => {
                                  const b = pb.beneficiary || pb;
                                  return (
                                    <tr key={pb.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3 font-mono font-black text-slate-950">
                                        #{pb.designatedNumber || "-"}
                                      </td>
                                      <td className="px-4 py-3 font-black text-slate-900 uppercase">{b.fullName}</td>
                                      <td className="px-4 py-3 font-bold text-slate-800">{b.sitio || "-"}</td>
                                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                                        {b.sex || "-"} {b.age ? `• ${b.age} yrs` : ""}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {(b.isSenior || (b.age && b.age >= 60)) && (
                                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 font-bold rounded text-[9px]">
                                              SC
                                            </span>
                                          )}
                                          {b.isPwd && (
                                            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 font-bold rounded text-[9px]">
                                              PWD
                                            </span>
                                          )}
                                          {b.isIp && (
                                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 font-bold rounded text-[9px]">
                                              IP
                                            </span>
                                          )}
                                          {b.is4Ps && (
                                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 font-bold rounded text-[9px]">
                                              4Ps
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 font-mono text-slate-800">{b.contactNumber || "-"}</td>
                                      {onEditBeneficiary && (
                                        <td className="px-4 py-3 text-right space-x-1">
                                          <button
                                            type="button"
                                            onClick={() => onEditBeneficiary(pb)}
                                            className="p-1 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded transition"
                                            title="Edit Beneficiary"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          {onDeleteBeneficiary && (
                                            <button
                                              type="button"
                                              onClick={() => onDeleteBeneficiary(pb)}
                                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                              title="Delete Beneficiary"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. CREATE NEW GROUP MODAL */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border-t-4 border-t-emerald-600">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Lumikha ng Bagong Deployment Group</h3>
                  <p className="text-xs text-slate-500">I-grupo ang mga Purok o Sitio para sa work program deployment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewGroup} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Barangay (Dingalan) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetBarangayForNewGroup}
                  onChange={(e) => setTargetBarangayForNewGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  {ALL_BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      Barangay {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Pangalan ng Grupo (Group Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => {
                    setNewGroupName(e.target.value);
                    if (!newGroupLabel) setNewGroupLabel(e.target.value);
                  }}
                  placeholder="Hal. Umiray Group 5"
                  className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Designated Main Work Area <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDesignatedArea}
                  onChange={(e) => setNewDesignatedArea(e.target.value)}
                  placeholder="Hal. Purok Riverside, Coastal Area & Mangrove Buffer"
                  className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mga Sakop na Purok / Sitio (Paghiwalayin gamit ang kuwit o bagong linya)
                </label>
                <textarea
                  rows={3}
                  value={newCoveredPuroks}
                  onChange={(e) => setNewCoveredPuroks(e.target.value)}
                  placeholder="Hal. Purok 5, Purok 6, Sitio Riverside"
                  className="w-full px-3.5 py-2.5 font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow transition flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>I-save ang Bagong Grupo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ASSIGN DEPLOYMENT AREA & WORK PROGRAM MODAL */}
      {isAssignAreaModalOpen && assigningGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border-t-4 border-t-blue-900">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-100 text-blue-900 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Italaga ang Work Area &amp; Iskedyul ng Grupo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Barangay {assigningGroup.barangay} • <strong>{assigningGroup.groupLabel}</strong> ({assigningGroup.demographics.totalCount} Pax)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignAreaModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAreaAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Itinalagang Lugar ng Paggawa (Designated Work Area) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assignAreaName}
                  onChange={(e) => setAssignAreaName(e.target.value)}
                  placeholder="Hal. Purok Lapu-Lapu to Tanigue Roadside & Coastal Zone"
                  className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Partikular na Gawain (Specific Activities) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={assignSpecificActivity}
                  onChange={(e) => setAssignSpecificActivity(e.target.value)}
                  placeholder="Isulat ang partikular na gawain ng grupong ito..."
                  className="w-full px-3.5 py-2.5 font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-900 leading-relaxed"
                />
              </div>

              {/* Day Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 uppercase">
                    Piliin ang mga Araw na Itatalaga ang Grupong Ito:
                  </label>
                  <div className="space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setAssignTargetDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
                      className="text-[11px] font-bold text-blue-900 hover:underline"
                    >
                      Lahat (10 Araw)
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setAssignTargetDays([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      I-clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => {
                    const isSelected = assignTargetDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleTargetDay(d)}
                        className={`py-2 rounded-xl text-center text-xs font-mono font-black transition border cursor-pointer ${
                          isSelected
                            ? "bg-blue-900 text-white border-blue-900 shadow-xs scale-105"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        Araw {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {assignmentFeedback && (
                <div className={`p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
                  assignmentFeedback.startsWith("✓")
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                    : "bg-rose-50 text-rose-900 border-rose-300"
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assignmentFeedback}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAssignAreaModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition"
                >
                  Isara
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssignment || assignTargetDays.length === 0}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-black rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-gov-gold" />
                  <span>{isSubmittingAssignment ? "Isinasaayos..." : "Ipatupad sa Work Program"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
