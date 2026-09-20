"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  CheckSquare,
  Square,
  Layers,
  Check,
  X,
  Sliders,
  Split,
  GitMerge,
  Combine,
  Link2,
  Unlink,
  FolderDown,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ParsedBarangayWorkProgram, WorkProgramPreviewResult } from "@/lib/work-program-parser";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, isFieldCoordinator } from "@/lib/permissions";
import {
  DINGALAN_BARANGAY_GROUPINGS,
  getBarangayKey,
  getStandardBarangayName,
  classifyBeneficiaryGroup,
  computeGroupDemographics,
  PurokSitioGroupDefinition,
} from "@/lib/dingalan-groupings";

export default function WorkProgramManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const isCoordinator = isFieldCoordinator(user);
  const canManage = isAdmin || isCoordinator;

  const [program, setProgram] = useState<any>(null);
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom Groups from Local Storage
  const [customGroups, setCustomGroups] = useState<Record<string, PurokSitioGroupDefinition[]>>({});

  // Upload & Preview state
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [autoDeploying, setAutoDeploying] = useState(false);
  const [preview, setPreview] = useState<WorkProgramPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Active view state
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | "ALL">("ALL");

  // Day-to-Day Activity Selection & Batch Operations State
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [batchActionFeedback, setBatchActionFeedback] = useState<string | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchSelectedGroup, setBatchSelectedGroup] = useState<string>("");

  // Batch Modal Mode: STANDARD | SUB_TEAMS | MERGE_GROUPS
  const [batchModalMode, setBatchModalMode] = useState<"STANDARD" | "SUB_TEAMS" | "MERGE_GROUPS">("STANDARD");

  const [batchForm, setBatchForm] = useState({
    specificActivities: "",
    area: "",
    maleCount: "",
    femaleCount: "",
    scPwdMaleCount: "",
    scPwdFemaleCount: "",
    totalCount: "",
  });

  // Batch Sub-Teams State
  const [batchSubParentGroup, setBatchSubParentGroup] = useState<string>("");
  const [batchSubTeamA, setBatchSubTeamA] = useState({
    name: "",
    area: "",
    activity: "",
    maleCount: 0,
    femaleCount: 0,
    scPwdMaleCount: 0,
    scPwdFemaleCount: 0,
    totalCount: 0,
  });
  const [batchSubTeamB, setBatchSubTeamB] = useState({
    name: "",
    area: "",
    activity: "",
    maleCount: 0,
    femaleCount: 0,
    scPwdMaleCount: 0,
    scPwdFemaleCount: 0,
    totalCount: 0,
  });

  // Batch Merged Groups State
  const [batchSelectedMergeGroups, setBatchSelectedMergeGroups] = useState<string[]>([]);
  const [batchMergedLabel, setBatchMergedLabel] = useState("");
  const [batchMergedArea, setBatchMergedArea] = useState("");
  const [batchMergedActivity, setBatchMergedActivity] = useState("");

  // Single Activity Edit/Add modal state
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
    loadCustomGroups();
  }, [params.id]);

  const loadCustomGroups = () => {
    try {
      const saved = localStorage.getItem("tupad_custom_deployment_groupings");
      if (saved) {
        setCustomGroups(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load custom groupings from storage:", e);
    }
  };

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

      // Also fetch beneficiaries for accurate demographic quotas
      const resBen = await fetch(`/api/v1/beneficiaries?programId=${params.id}`);
      if (resBen.ok) {
        const data = await resBen.json();
        setBeneficiaries(data.beneficiaries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Groupings available for the currently selected Barangay
  const currentBarangayGroups = useMemo(() => {
    if (!selectedBarangay) return [];
    const stdName = getStandardBarangayName(selectedBarangay);
    const bKey = getBarangayKey(selectedBarangay);
    const defaultCfg = DINGALAN_BARANGAY_GROUPINGS[bKey]?.groups || [];
    const customForBrgy = customGroups[stdName] || [];

    const allGroups = [
      ...defaultCfg.map((g) => ({
        groupName: g.groupName,
        groupLabel: g.groupLabel,
        designatedMainArea: g.designatedMainArea,
        coveredPuroks: g.purokSitios,
        isCustom: false,
      })),
      ...customForBrgy.map((cg) => ({
        groupName: cg.groupName,
        groupLabel: cg.groupLabel,
        designatedMainArea: cg.designatedMainArea,
        coveredPuroks: cg.purokSitios,
        isCustom: true,
      })),
    ];

    // Compute demographic tallies for each group in this barangay based on masterlist
    return allGroups.map((g) => {
      const groupBenes = beneficiaries.filter((pb) => {
        if (pb.participationStatus === "REPLACED") return false;
        const b = pb.beneficiary || pb;
        const bBrgy = getStandardBarangayName(b.barangay || "");
        if (bBrgy !== stdName) return false;
        const sitio = (b.sitio || "").trim().toUpperCase();
        return g.coveredPuroks.some(
          (p) => sitio.includes(p.toUpperCase()) || p.toUpperCase().includes(sitio)
        );
      });

      const demo = computeGroupDemographics(groupBenes);
      return {
        ...g,
        demographics: demo,
        beneficiaryCount: groupBenes.length,
      };
    });
  }, [selectedBarangay, customGroups, beneficiaries]);

  const currentWp = workPrograms.find((w) => w.barangay === selectedBarangay) || workPrograms[0];
  const items: any[] = currentWp?.items || [];
  const filteredItems = selectedDayFilter === "ALL" ? items : items.filter((it: any) => it.dayNumber === selectedDayFilter);

  // Multi-selection handlers
  const toggleSelectActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredItems.map((it: any) => it.id);
    const allSelected = filteredIds.every((id) => selectedActivityIds.includes(id));
    if (allSelected) {
      setSelectedActivityIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedActivityIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectAll10Days = () => {
    const allIds = items.map((it: any) => it.id);
    setSelectedActivityIds(allIds);
  };

  const handleSelectDayRange = (startDay: number, endDay: number) => {
    const rangeIds = items
      .filter((it: any) => it.dayNumber >= startDay && it.dayNumber <= endDay)
      .map((it: any) => it.id);
    setSelectedActivityIds(Array.from(new Set([...selectedActivityIds, ...rangeIds])));
  };

  const handleUnselectAll = () => {
    setSelectedActivityIds([]);
  };

  // Sub-Teams and Merged Groups Helpers
  const handleSelectSubParentGroup = (grpName: string) => {
    setBatchSubParentGroup(grpName);
    const grp = currentBarangayGroups.find((g) => g.groupName === grpName);
    if (grp) {
      const male = grp.demographics.maleCount;
      const female = grp.demographics.femaleCount;
      const scPwdM = grp.demographics.scPwdMaleCount;
      const scPwdF = grp.demographics.scPwdFemaleCount;

      const maleA = Math.ceil(male / 2);
      const maleB = Math.floor(male / 2);
      const femA = Math.ceil(female / 2);
      const femB = Math.floor(female / 2);

      setBatchSubTeamA({
        name: `${grp.groupLabel} - Sub-Team A`,
        area: `${grp.designatedMainArea} (Team A Zone)`,
        activity: "De-clogging, desiltation of main canals and drainage waterways",
        maleCount: maleA,
        femaleCount: femA,
        scPwdMaleCount: Math.ceil(scPwdM / 2),
        scPwdFemaleCount: Math.ceil(scPwdF / 2),
        totalCount: maleA + femA,
      });

      setBatchSubTeamB({
        name: `${grp.groupLabel} - Sub-Team B`,
        area: `${grp.designatedMainArea} (Team B Zone)`,
        activity: "Roadside brushing, debris sweeping, tree planting, and greening",
        maleCount: maleB,
        femaleCount: femB,
        scPwdMaleCount: Math.floor(scPwdM / 2),
        scPwdFemaleCount: Math.floor(scPwdF / 2),
        totalCount: maleB + femB,
      });
    }
  };

  const handleSplitSubTeams5050 = () => {
    const grp = currentBarangayGroups.find((g) => g.groupName === batchSubParentGroup);
    if (!grp) return;
    const male = grp.demographics.maleCount;
    const female = grp.demographics.femaleCount;
    const scM = grp.demographics.scPwdMaleCount;
    const scF = grp.demographics.scPwdFemaleCount;

    const maleA = Math.ceil(male / 2);
    const maleB = Math.floor(male / 2);
    const femA = Math.ceil(female / 2);
    const femB = Math.floor(female / 2);

    setBatchSubTeamA((prev) => ({
      ...prev,
      maleCount: maleA,
      femaleCount: femA,
      scPwdMaleCount: Math.ceil(scM / 2),
      scPwdFemaleCount: Math.ceil(scF / 2),
      totalCount: maleA + femA,
    }));

    setBatchSubTeamB((prev) => ({
      ...prev,
      maleCount: maleB,
      femaleCount: femB,
      scPwdMaleCount: Math.floor(scM / 2),
      scPwdFemaleCount: Math.floor(scF / 2),
      totalCount: maleB + femB,
    }));
  };

  const handleSplitSubTeamsByGender = () => {
    const grp = currentBarangayGroups.find((g) => g.groupName === batchSubParentGroup);
    if (!grp) return;
    const male = grp.demographics.maleCount;
    const female = grp.demographics.femaleCount;

    setBatchSubTeamA((prev) => ({
      ...prev,
      name: `${grp.groupLabel} - Heavy Labor Team (Male)`,
      activity: "Heavy declogging, drainage desiltation, deep excavation & clearing",
      maleCount: male,
      femaleCount: 0,
      scPwdMaleCount: 0,
      scPwdFemaleCount: 0,
      totalCount: male,
    }));

    setBatchSubTeamB((prev) => ({
      ...prev,
      name: `${grp.groupLabel} - Maintenance Team (Female)`,
      activity: "Sweeping, debris bagging, vegetation maintenance & tree planting",
      maleCount: 0,
      femaleCount: female,
      scPwdMaleCount: 0,
      scPwdFemaleCount: grp.demographics.scPwdFemaleCount,
      totalCount: female,
    }));
  };

  const handleSplitSubTeamsByVulnerable = () => {
    const grp = currentBarangayGroups.find((g) => g.groupName === batchSubParentGroup);
    if (!grp) return;
    const male = grp.demographics.maleCount;
    const female = grp.demographics.femaleCount;
    const scM = grp.demographics.scPwdMaleCount;
    const scF = grp.demographics.scPwdFemaleCount;
    const totalVuln = scM + scF;
    const ableMale = Math.max(0, male - scM);
    const ableFemale = Math.max(0, female - scF);

    setBatchSubTeamA((prev) => ({
      ...prev,
      name: `${grp.groupLabel} - General Operations Team`,
      activity: "Canal desiltation, heavy clearing, and street sweeping",
      maleCount: ableMale,
      femaleCount: ableFemale,
      scPwdMaleCount: 0,
      scPwdFemaleCount: 0,
      totalCount: ableMale + ableFemale,
    }));

    setBatchSubTeamB((prev) => ({
      ...prev,
      name: `${grp.groupLabel} - Light Tasks Team (SC/PWD)`,
      activity: "Light sweeping, seedling preparation, watering and tree guard fixing",
      maleCount: scM,
      femaleCount: scF,
      scPwdMaleCount: scM,
      scPwdFemaleCount: scF,
      totalCount: totalVuln,
    }));
  };

  const handleToggleMergeGroup = (grpName: string) => {
    const next = batchSelectedMergeGroups.includes(grpName)
      ? batchSelectedMergeGroups.filter((n) => n !== grpName)
      : [...batchSelectedMergeGroups, grpName];

    setBatchSelectedMergeGroups(next);

    const matched = currentBarangayGroups.filter((g) => next.includes(g.groupName));
    if (matched.length > 0) {
      const label = matched.map((g) => g.groupLabel).join(" & ") + " Joint Taskforce";
      const area = matched.map((g) => g.designatedMainArea).join(" & ");
      setBatchMergedLabel(label);
      setBatchMergedArea(area);
      setBatchMergedActivity(`Joint comprehensive community clean-up, canal de-clogging, and environmental rehabilitation in Barangay ${selectedBarangay}`);
    }
  };

  // Merged Groups Demographics summary
  const mergedDemographicsSummary = useMemo(() => {
    const matched = currentBarangayGroups.filter((g) => batchSelectedMergeGroups.includes(g.groupName));
    return {
      maleCount: matched.reduce((acc, g) => acc + g.demographics.maleCount, 0),
      femaleCount: matched.reduce((acc, g) => acc + g.demographics.femaleCount, 0),
      scPwdMaleCount: matched.reduce((acc, g) => acc + g.demographics.scPwdMaleCount, 0),
      scPwdFemaleCount: matched.reduce((acc, g) => acc + g.demographics.scPwdFemaleCount, 0),
      totalCount: matched.reduce((acc, g) => acc + g.demographics.totalCount, 0),
    };
  }, [currentBarangayGroups, batchSelectedMergeGroups]);

  // Available Work Program items for selected barangay
  const availableWpItems = useMemo(() => {
    const combined: Array<{ workArea: string; specificActivities: string }> = [];
    const seen = new Set<string>();

    (items || []).forEach((it: any) => {
      const area = (it.area || it.workArea || "").trim();
      const act = (it.specificActivities || "").trim();
      const key = `${area}|${act}`;
      if (!seen.has(key) && (area || act)) {
        seen.add(key);
        combined.push({ workArea: area, specificActivities: act });
      }
    });

    currentBarangayGroups.forEach((g) => {
      const area = (g.designatedMainArea || "").trim();
      const act = ((g as any).specificActivity || "Roadside maintenance, canal declogging, and community sanitation").trim();
      const key = `${area}|${act}`;
      if (!seen.has(key) && (area || act)) {
        seen.add(key);
        combined.push({ workArea: area, specificActivities: act });
      }
    });

    return combined;
  }, [items, currentBarangayGroups]);

  // Quick Batch Grouping Assignment
  const handleBatchAssignGroup = async (group: (typeof currentBarangayGroups)[0]) => {
    if (selectedActivityIds.length === 0) {
      alert("Pumili muna ng mga araw o aktibidad na lalapatan ng grupong ito.");
      return;
    }

    if (
      !confirm(
        `Italaga ang "${group.groupLabel}" sa ${selectedActivityIds.length} napiling aktibidad?\n\nItatakda nito ang Designated Area sa: "${group.designatedMainArea}" at ilalapat ang kaukulang demograpiko (${group.demographics.maleCount} Male, ${group.demographics.femaleCount} Female, ${group.demographics.totalCount} Total).`
      )
    ) {
      return;
    }

    setIsBatchSubmitting(true);
    setBatchActionFeedback(null);
    try {
      const res = await fetch(`/api/v1/programs/${params.id}/work-program/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE",
          itemIds: selectedActivityIds,
          groupName: group.groupName,
          area: group.designatedMainArea,
          updates: {
            maleCount: group.demographics.maleCount,
            femaleCount: group.demographics.femaleCount,
            scPwdMaleCount: group.demographics.scPwdMaleCount,
            scPwdFemaleCount: group.demographics.scPwdFemaleCount,
            totalCount: group.demographics.totalCount,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to batch assign grouping");

      setBatchActionFeedback(`✓ Matagumpay na itinalaga ang ${group.groupLabel} sa ${selectedActivityIds.length} aktibidad!`);
      setTimeout(() => setBatchActionFeedback(null), 5000);
      setSelectedActivityIds([]);
      fetchProgramAndWorkPrograms();
    } catch (err: any) {
      alert(err.message || "Failed to batch assign group");
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Batch Edit Submission (Supports STANDARD, SUB_TEAMS, and MERGE_GROUPS)
  const handleSaveBatchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedActivityIds.length === 0) return;

    setIsBatchSubmitting(true);
    try {
      if (batchModalMode === "MERGE_GROUPS") {
        if (batchSelectedMergeGroups.length === 0) {
          alert("Pumili ng kahit 2 grupo na pagsasamahin sa Joint Taskforce.");
          setIsBatchSubmitting(false);
          return;
        }

        const res = await fetch(`/api/v1/programs/${params.id}/work-program/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE",
            itemIds: selectedActivityIds,
            specificActivities: batchMergedActivity.trim() || undefined,
            area: batchMergedArea.trim() || undefined,
            groupName: batchMergedLabel.trim() || undefined,
            updates: {
              maleCount: mergedDemographicsSummary.maleCount,
              femaleCount: mergedDemographicsSummary.femaleCount,
              scPwdMaleCount: mergedDemographicsSummary.scPwdMaleCount,
              scPwdFemaleCount: mergedDemographicsSummary.scPwdFemaleCount,
              totalCount: mergedDemographicsSummary.totalCount,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to merge activities");

        setIsBatchEditModalOpen(false);
        setBatchActionFeedback(`✓ Matagumpay na nai-merge ang ${batchSelectedMergeGroups.length} grupo sa ${selectedActivityIds.length} aktibidad!`);
        setTimeout(() => setBatchActionFeedback(null), 5000);
        setSelectedActivityIds([]);
        fetchProgramAndWorkPrograms();
      } else if (batchModalMode === "SUB_TEAMS") {
        if (!batchSubParentGroup) {
          alert("Pumili ng pangunahing grupo na hahatiin.");
          setIsBatchSubmitting(false);
          return;
        }

        const selectedDays = Array.from(
          new Set(
            items
              .filter((it: any) => selectedActivityIds.includes(it.id))
              .map((it: any) => it.dayNumber)
          )
        );

        // Sync Sub-Team A
        await fetch(`/api/v1/programs/${params.id}/work-program/sync-group`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barangay: selectedBarangay,
            groupName: (batchSubTeamA.name || "Sub-Team A").toUpperCase(),
            groupLabel: batchSubTeamA.name || "Sub-Team A",
            designatedArea: batchSubTeamA.area,
            specificActivities: batchSubTeamA.activity,
            targetDays: selectedDays,
            demographics: {
              maleCount: batchSubTeamA.maleCount,
              femaleCount: batchSubTeamA.femaleCount,
              scPwdMaleCount: batchSubTeamA.scPwdMaleCount,
              scPwdFemaleCount: batchSubTeamA.scPwdFemaleCount,
              totalCount: batchSubTeamA.totalCount,
            },
          }),
        });

        // Sync Sub-Team B
        await fetch(`/api/v1/programs/${params.id}/work-program/sync-group`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barangay: selectedBarangay,
            groupName: (batchSubTeamB.name || "Sub-Team B").toUpperCase(),
            groupLabel: batchSubTeamB.name || "Sub-Team B",
            designatedArea: batchSubTeamB.area,
            specificActivities: batchSubTeamB.activity,
            targetDays: selectedDays,
            demographics: {
              maleCount: batchSubTeamB.maleCount,
              femaleCount: batchSubTeamB.femaleCount,
              scPwdMaleCount: batchSubTeamB.scPwdMaleCount,
              scPwdFemaleCount: batchSubTeamB.scPwdFemaleCount,
              totalCount: batchSubTeamB.totalCount,
            },
          }),
        });

        setIsBatchEditModalOpen(false);
        setBatchActionFeedback(`✓ Matagumpay na nai-deploy ang Sub-Team A at Sub-Team B para sa Araw: ${selectedDays.join(", ")}!`);
        setTimeout(() => setBatchActionFeedback(null), 5000);
        setSelectedActivityIds([]);
        fetchProgramAndWorkPrograms();
      } else {
        // STANDARD mode
        const updates: any = {};
        if (batchForm.maleCount !== "") updates.maleCount = parseInt(batchForm.maleCount, 10);
        if (batchForm.femaleCount !== "") updates.femaleCount = parseInt(batchForm.femaleCount, 10);
        if (batchForm.scPwdMaleCount !== "") updates.scPwdMaleCount = parseInt(batchForm.scPwdMaleCount, 10);
        if (batchForm.scPwdFemaleCount !== "") updates.scPwdFemaleCount = parseInt(batchForm.scPwdFemaleCount, 10);
        if (batchForm.totalCount !== "") updates.totalCount = parseInt(batchForm.totalCount, 10);

        const res = await fetch(`/api/v1/programs/${params.id}/work-program/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE",
            itemIds: selectedActivityIds,
            specificActivities: batchForm.specificActivities.trim() || undefined,
            area: batchForm.area.trim() || undefined,
            updates: Object.keys(updates).length > 0 ? updates : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update selected activities");

        setIsBatchEditModalOpen(false);
        setBatchActionFeedback(`✓ Na-update ang ${selectedActivityIds.length} napiling aktibidad!`);
        setTimeout(() => setBatchActionFeedback(null), 5000);
        setSelectedActivityIds([]);
        fetchProgramAndWorkPrograms();
      }
    } catch (err: any) {
      alert(err.message || "Failed to batch update");
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedActivityIds.length === 0) return;
    if (
      !confirm(
        `Sigurado ka bang nais mong burahin ang ${selectedActivityIds.length} napiling aktibidad mula sa TUPAD Work Program?`
      )
    ) {
      return;
    }

    setIsBatchSubmitting(true);
    try {
      const res = await fetch(`/api/v1/programs/${params.id}/work-program/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          itemIds: selectedActivityIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete selected activities");

      setBatchActionFeedback(`✓ Nabura ang ${selectedActivityIds.length} aktibidad.`);
      setTimeout(() => setBatchActionFeedback(null), 5000);
      setSelectedActivityIds([]);
      fetchProgramAndWorkPrograms();
    } catch (err: any) {
      alert(err.message || "Failed to batch delete");
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Single Activity Save
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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

  const handleAutoDeployFromMasterlist = async () => {
    if (
      !confirm(
        `Are you sure you want to revise and auto-deploy the TUPAD Work Program based on the Final Implementation Masterlist?\n\nThis will organize designated areas into official Purok/Sitio groups (e.g. Umiray Group 1: Singawan, Pinamaypayan, Dugyan) and recalculate exact demographic counts (Male, Female, SC, PWD, IP).`
      )
    )
      return;

    setAutoDeploying(true);
    try {
      const res = await fetch(`/api/v1/programs/${params.id}/work-program/auto-deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barangay: selectedBarangay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to auto-deploy work program");

      alert(data.message || "Successfully revised and deployed TUPAD Work Program from Masterlist!");
      fetchProgramAndWorkPrograms();
    } catch (err: any) {
      alert(err.message || "Error deploying work program");
    } finally {
      setAutoDeploying(false);
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

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading TUPAD Work Program Hub...</div>;
  }

  const totalActivities = workPrograms.reduce((acc, wp) => acc + (wp.items?.length || 0), 0);
  const totalTargetBeneficiaries = workPrograms.reduce((acc, wp) => acc + (wp.beneficiaryCount || 0), 0);
  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((it: any) => selectedActivityIds.includes(it.id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
            TUPAD Work Program &amp; Day-to-Day Activity Management
          </h1>
          <p className="text-xs text-slate-500">
            Select/unselect daily activities to edit schedules, sub-divide into Sub-Teams, merge groups into Joint Taskforces, and automate gender quotas per Barangay
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              onClick={handleAutoDeployFromMasterlist}
              disabled={autoDeploying}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
              title="Auto-organize designated work areas according to official Purok & Sitio matrix and demographic tallies from Final Masterlist"
            >
              {autoDeploying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Auto-Deploying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Deploy from Masterlist</span>
                </>
              )}
            </button>
          )}

          <a
            href={`/beneficiaries?view=groupings&barangay=${encodeURIComponent(selectedBarangay)}`}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-black text-xs rounded-xl transition shadow flex items-center space-x-1.5"
            title="View & Configure Purok/Sitio Groupings"
          >
            <Layers className="w-3.5 h-3.5 text-teal-200" />
            <span>Purok Groupings Matrix</span>
          </a>

          <a
            href="/beneficiaries"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-300 flex items-center space-x-1.5"
            title="View Final Implementation Masterlist"
          >
            <Users className="w-3.5 h-3.5 text-gov-blue" />
            <span>Masterlist Roster</span>
          </a>

          <a
            href={`/api/v1/programs/${params.id}/work-program/template`}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-300 flex items-center space-x-1.5"
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
              className="px-3.5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl transition shadow flex items-center space-x-1.5"
            >
              <UploadCloud className="w-4 h-4 text-gov-goldLight" />
              <span>Upload Work Program</span>
            </button>
          )}

          <a
            href={`/api/v1/reports/export?type=WORK_PROGRAM&programId=${params.id}`}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-200" />
            <span>Export 10-Day Plan</span>
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

        <div className="gov-card p-4 bg-white border-l-4 border-l-teal-600">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brgy Deployment Groups</span>
          <p className="text-2xl font-black text-teal-900 mt-1">{currentBarangayGroups.length} <span className="text-xs font-normal text-slate-500">Groups in {selectedBarangay}</span></p>
        </div>
      </div>

      {/* SUCCESS / FEEDBACK BANNER */}
      {batchActionFeedback && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 font-bold text-xs shadow-md animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{batchActionFeedback}</span>
          </div>
          <button onClick={() => setBatchActionFeedback(null)} className="text-emerald-700 hover:text-emerald-900 text-sm">✕</button>
        </div>
      )}

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
                  onClick={() => {
                    setSelectedBarangay(wp.barangay);
                    setSelectedActivityIds([]);
                  }}
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
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-black text-slate-900">
                      Barangay {currentWp.barangay}
                    </h2>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-gov-blue">
                      Target: {currentWp.beneficiaryCount} Beneficiaries
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                      {currentBarangayGroups.length} Deployment Group(s)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Nature of Work:</strong> {currentWp.natureOfWork}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <strong className="text-slate-700">Working Hours:</strong> {currentWp.workingHours}
                  </p>
                </div>

                {canManage && (
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
                      className="px-3.5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-gov-goldLight" />
                      <span>Add Activity</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Day Filter & Multi-Select Control Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                {/* Day Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
                  <span className="text-[11px] font-bold text-slate-500 uppercase flex-shrink-0 mr-1">Talaan ng Araw:</span>
                  <button
                    onClick={() => setSelectedDayFilter("ALL")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      selectedDayFilter === "ALL"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-200 border"
                    }`}
                  >
                    All 10 Days ({items.length})
                  </button>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => {
                    const countForDay = items.filter((it: any) => it.dayNumber === d).length;
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDayFilter(d)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 flex items-center space-x-1 ${
                          selectedDayFilter === d
                            ? "bg-gov-blue text-white shadow-sm"
                            : "bg-white text-slate-600 hover:bg-slate-200 border"
                        }`}
                      >
                        <span>Day {d}</span>
                        {countForDay > 0 && (
                          <span className={`text-[9px] px-1 rounded-full ${selectedDayFilter === d ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {countForDay}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Day Multi-Selection Quick Presets */}
                {canManage && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Select:</span>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border rounded-lg shadow-2xs flex items-center space-x-1"
                    >
                      <CheckSquare className="w-3 h-3 text-gov-blue" />
                      <span>{allFilteredSelected ? "Deselect Filtered" : "Select Filtered"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAll10Days}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border rounded-lg shadow-2xs"
                    >
                      All 10 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectDayRange(1, 5)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border rounded-lg shadow-2xs"
                    >
                      Days 1–5 (W1)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectDayRange(6, 10)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border rounded-lg shadow-2xs"
                    >
                      Days 6–10 (W2)
                    </button>
                    {selectedActivityIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUnselectAll}
                        className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg"
                      >
                        Unselect All ({selectedActivityIds.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* BATCH ACTION FLOATING TOOLBAR (WHEN ITEMS ARE SELECTED) */}
              {canManage && selectedActivityIds.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl border-2 border-gov-gold/60 shadow-xl space-y-3 animate-fadeIn">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-gov-gold text-gov-dark flex items-center justify-center font-black text-sm shrink-0">
                        {selectedActivityIds.length}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-gov-goldLight">
                          {selectedActivityIds.length} Day-to-Day Activity(ies) Selected
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          Magsagawa ng batch grouping assignment, hatiin sa Sub-Teams, o i-merge ang mga grupo para sa mga napiling araw.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBatchModalMode("STANDARD");
                          setBatchForm({
                            specificActivities: "",
                            area: "",
                            maleCount: "",
                            femaleCount: "",
                            scPwdMaleCount: "",
                            scPwdFemaleCount: "",
                            totalCount: "",
                          });
                          setIsBatchEditModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
                        title="I-edit ang detalye ng mga napiling aktibidad"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Batch Edit Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBatchModalMode("SUB_TEAMS");
                          if (currentBarangayGroups.length > 0) {
                            handleSelectSubParentGroup(currentBarangayGroups[0].groupName);
                          }
                          setIsBatchEditModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
                        title="Hatiin ang grupo sa dalawang Sub-Teams para sa mga napiling araw"
                      >
                        <Split className="w-3.5 h-3.5 text-indigo-200" />
                        <span>Hatiin sa Sub-Teams</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBatchModalMode("MERGE_GROUPS");
                          if (currentBarangayGroups.length >= 2) {
                            setBatchSelectedMergeGroups([currentBarangayGroups[0].groupName, currentBarangayGroups[1].groupName]);
                            const matched = [currentBarangayGroups[0], currentBarangayGroups[1]];
                            setBatchMergedLabel(`${matched[0].groupLabel} & ${matched[1].groupLabel} Joint Taskforce`);
                            setBatchMergedArea(`${matched[0].designatedMainArea} & ${matched[1].designatedMainArea}`);
                            setBatchMergedActivity(`Joint comprehensive community clean-up, canal de-clogging, and massive tree planting in Barangay ${selectedBarangay}`);
                          } else if (currentBarangayGroups.length === 1) {
                            setBatchSelectedMergeGroups([currentBarangayGroups[0].groupName]);
                          }
                          setIsBatchEditModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
                        title="Pagsamahin o i-merge ang maraming grupo sa isang Joint Taskforce"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-emerald-200" />
                        <span>I-merge ang mga Grupo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBatchDelete}
                        disabled={isBatchSubmitting}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleUnselectAll}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Quick Assign Grouping Selector */}
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-gov-gold shrink-0" />
                      <span className="text-xs font-bold text-slate-200">
                        Quick Assign Deployment Grouping to Selected:
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {currentBarangayGroups.length === 0 ? (
                        <span className="text-xs text-slate-400">Walang naka-configure na grupo para sa {selectedBarangay}.</span>
                      ) : (
                        currentBarangayGroups.map((g) => (
                          <button
                            key={g.groupName}
                            type="button"
                            onClick={() => handleBatchAssignGroup(g)}
                            disabled={isBatchSubmitting}
                            className="px-3 py-1.5 bg-teal-900/80 hover:bg-teal-700 text-teal-200 hover:text-white text-xs font-bold rounded-lg border border-teal-700/60 transition flex items-center space-x-1.5 disabled:opacity-50"
                            title={`Italaga ang ${g.groupLabel} (${g.designatedMainArea})`}
                          >
                            <span>{g.groupLabel}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-teal-950 text-teal-300">
                              {g.demographics.totalCount} Pax
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Activities Table */}
              <div className="gov-card overflow-hidden border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b">
                      <tr>
                        {canManage && (
                          <th className="px-3 py-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={handleSelectAllFiltered}
                              className="rounded border-slate-300 text-gov-blue focus:ring-gov-blue h-4 w-4 cursor-pointer"
                              title="Select/Unselect All Visible"
                            />
                          </th>
                        )}
                        <th className="px-4 py-3">Day #</th>
                        <th className="px-4 py-3">Specific Activities</th>
                        <th className="px-4 py-3">Assigned Work Area (Purok / Sitio)</th>
                        <th className="px-4 py-3 text-center">Male</th>
                        <th className="px-4 py-3 text-center">Female</th>
                        <th className="px-4 py-3 text-center">SC/PWD</th>
                        <th className="px-4 py-3 text-center">Total</th>
                        {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={canManage ? 9 : 8} className="px-4 py-8 text-center text-xs text-slate-400">
                            No activities scheduled for this day filter.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((it: any) => {
                          const isSelected = selectedActivityIds.includes(it.id);
                          const isSubTeam = (it.area || "").toLowerCase().includes("sub-team") || (it.specificActivities || "").toLowerCase().includes("sub-team") || (it.area || "").toLowerCase().includes("team a") || (it.area || "").toLowerCase().includes("team b");
                          const isJointMerge = (it.area || "").toLowerCase().includes("joint") || (it.area || "").toLowerCase().includes("taskforce") || (it.area || "").toLowerCase().includes("&") || (it.specificActivities || "").toLowerCase().includes("joint");

                          return (
                            <tr
                              key={it.id}
                              className={`transition-colors ${
                                isSelected ? "bg-blue-50/80 border-l-4 border-l-gov-blue" : "hover:bg-slate-50"
                              }`}
                            >
                              {canManage && (
                                <td className="px-3 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectActivity(it.id)}
                                    className="rounded border-slate-300 text-gov-blue focus:ring-gov-blue h-4 w-4 cursor-pointer"
                                  />
                                </td>
                              )}
                              <td className="px-4 py-3 font-black text-gov-blue font-mono">
                                Day {it.dayNumber}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900 max-w-sm">
                                <div className="space-y-1">
                                  <div>{it.specificActivities}</div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {isSubTeam && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        <Split className="w-2.5 h-2.5 text-indigo-500" />
                                        <span>Sub-Team Deployment</span>
                                      </span>
                                    )}
                                    {isJointMerge && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <GitMerge className="w-2.5 h-2.5 text-emerald-500" />
                                        <span>Joint Taskforce</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-700 font-medium">
                                <span className="flex items-center space-x-1">
                                  <MapPin className="w-3.5 h-3.5 text-gov-gold flex-shrink-0" />
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
                              {canManage && (
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
                                    className="p-1 text-slate-500 hover:text-gov-blue rounded cursor-pointer"
                                    title="Edit activity"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivity(it.id)}
                                    className="p-1 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                                    title="Delete activity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
            </div>
          )}
        </div>
      )}

      {/* BATCH EDIT MODAL (WITH SUB-TEAMS & MERGED GROUPS TABS) */}
      {isBatchEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveBatchEdit}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Edit2 className="w-4 h-4 text-gov-blue" />
                  <span>Batch Edit {selectedActivityIds.length} Selected Activities</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pumili ng pamamaraan ng pagpapakilos para sa mga napiling araw sa Barangay {selectedBarangay}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setBatchModalMode("STANDARD")}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
                  batchModalMode === "STANDARD"
                    ? "bg-gov-blue text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Solong Grupo / Direct</span>
                </div>
                <span className="text-[10px] font-normal opacity-85">Standard Activity Edit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBatchModalMode("SUB_TEAMS");
                  if (currentBarangayGroups.length > 0 && !batchSubParentGroup) {
                    handleSelectSubParentGroup(currentBarangayGroups[0].groupName);
                  }
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
                  batchModalMode === "SUB_TEAMS"
                    ? "bg-indigo-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Split className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Hatiin sa Sub-Teams</span>
                </div>
                <span className="text-[10px] font-normal opacity-85">Team A &amp; Team B Division</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBatchModalMode("MERGE_GROUPS");
                  if (batchSelectedMergeGroups.length === 0 && currentBarangayGroups.length >= 2) {
                    setBatchSelectedMergeGroups([currentBarangayGroups[0].groupName, currentBarangayGroups[1].groupName]);
                    const matched = [currentBarangayGroups[0], currentBarangayGroups[1]];
                    setBatchMergedLabel(`${matched[0].groupLabel} & ${matched[1].groupLabel} Joint Taskforce`);
                    setBatchMergedArea(`${matched[0].designatedMainArea} & ${matched[1].designatedMainArea}`);
                    setBatchMergedActivity(`Joint comprehensive community clean-up, canal de-clogging, and massive tree planting in Barangay ${selectedBarangay}`);
                  }
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex flex-col items-center gap-1 cursor-pointer ${
                  batchModalMode === "MERGE_GROUPS"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-emerald-300" />
                  <span>I-merge ang mga Grupo</span>
                </div>
                <span className="text-[10px] font-normal opacity-85">Joint Taskforce Merge</span>
              </button>
            </div>

            {/* MODE 1: STANDARD / DIRECT EDIT */}
            {batchModalMode === "STANDARD" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Quick Fill from Group */}
                {currentBarangayGroups.length > 0 && (
                  <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl space-y-1.5">
                    <label className="block text-[10px] font-black text-teal-900 uppercase">
                      ⚡ Auto-Fill Details from Official Grouping:
                    </label>
                    <select
                      value={batchSelectedGroup}
                      onChange={(e) => {
                        const grpName = e.target.value;
                        setBatchSelectedGroup(grpName);
                        const grp = currentBarangayGroups.find((g) => g.groupName === grpName);
                        if (grp) {
                          setBatchForm({
                            ...batchForm,
                            area: grp.designatedMainArea,
                            maleCount: String(grp.demographics.maleCount),
                            femaleCount: String(grp.demographics.femaleCount),
                            scPwdMaleCount: String(grp.demographics.scPwdMaleCount),
                            scPwdFemaleCount: String(grp.demographics.scPwdFemaleCount),
                            totalCount: String(grp.demographics.totalCount),
                          });
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-teal-300 rounded-xl bg-white font-bold text-teal-950"
                    >
                      <option value="">-- Pumili ng Grupo upang Auto-Fill --</option>
                      {currentBarangayGroups.map((g) => (
                        <option key={g.groupName} value={g.groupName}>
                          {g.groupLabel} ({g.designatedMainArea}) - {g.demographics.totalCount} Pax
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Assigned Work Area (Purok/Sitio)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Purok Mulawin to Ipil-ipil (or leave blank to retain)"
                    value={batchForm.area}
                    onChange={(e) => setBatchForm({ ...batchForm, area: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Specific Activity Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. De-clogging of canals, creeks, waterways, and drainage inlets... (leave blank to retain)"
                    value={batchForm.specificActivities}
                    onChange={(e) => setBatchForm({ ...batchForm, specificActivities: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Male Quota</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Leave blank"
                      value={batchForm.maleCount}
                      onChange={(e) => setBatchForm({ ...batchForm, maleCount: e.target.value })}
                      className="w-full px-3 py-2 text-xs border rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Female Quota</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Leave blank"
                      value={batchForm.femaleCount}
                      onChange={(e) => setBatchForm({ ...batchForm, femaleCount: e.target.value })}
                      className="w-full px-3 py-2 text-xs border rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Pax</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Leave blank"
                      value={batchForm.totalCount}
                      onChange={(e) => setBatchForm({ ...batchForm, totalCount: e.target.value })}
                      className="w-full px-3 py-2 text-xs border rounded-xl font-mono font-bold bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: SUB-TEAMS DIVISION */}
            {batchModalMode === "SUB_TEAMS" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-950 uppercase flex items-center space-x-1.5">
                      <Split className="w-4 h-4 text-indigo-700" />
                      <span>Pumili ng Pangunahing Grupo na Hahatiin:</span>
                    </span>
                  </div>

                  <select
                    value={batchSubParentGroup}
                    onChange={(e) => handleSelectSubParentGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-xl bg-white font-bold text-indigo-950"
                  >
                    <option value="">-- Pumili ng Grupo --</option>
                    {currentBarangayGroups.map((g) => (
                      <option key={g.groupName} value={g.groupName}>
                        {g.groupLabel} ({g.designatedMainArea}) - {g.demographics.totalCount} Pax (♂ {g.demographics.maleCount}, ♀ {g.demographics.femaleCount})
                      </option>
                    ))}
                  </select>

                  {/* Split Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase">⚡ Auto-Distribute:</span>
                    <button
                      type="button"
                      onClick={handleSplitSubTeams5050}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 text-[11px] font-bold rounded-lg border border-indigo-200 cursor-pointer"
                    >
                      50 / 50 Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={handleSplitSubTeamsByGender}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 text-[11px] font-bold rounded-lg border border-indigo-200 cursor-pointer"
                    >
                      Heavy (Male) vs Maintenance (Female)
                    </button>
                    <button
                      type="button"
                      onClick={handleSplitSubTeamsByVulnerable}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 text-[11px] font-bold rounded-lg border border-indigo-200 cursor-pointer"
                    >
                      Operations vs Light Tasks (SC/PWD)
                    </button>
                  </div>
                </div>

                {/* Sub-Team Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Team A */}
                  <div className="p-3.5 bg-slate-50 border-2 border-indigo-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-indigo-700 text-white font-black text-xs rounded-lg">
                        Sub-Team A
                      </span>
                      <span className="text-xs font-mono font-black text-indigo-900">
                        Total: {batchSubTeamA.totalCount} Pax
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Label / Pangalan</label>
                      <input
                        type="text"
                        value={batchSubTeamA.name}
                        onChange={(e) => setBatchSubTeamA({ ...batchSubTeamA, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg font-bold"
                      />
                    </div>

                    {/* Dropdown for Sub-Team A */}
                    <div className="bg-indigo-50/80 p-2 rounded-lg border border-indigo-200 space-y-1">
                      <label className="block text-[9px] font-black text-indigo-950 uppercase flex items-center space-x-1">
                        <FolderDown className="w-3 h-3 text-indigo-600" />
                        <span>Pumili mula sa Work Program:</span>
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "") {
                            const item = availableWpItems[parseInt(val, 10)];
                            if (item) {
                              setBatchSubTeamA({
                                ...batchSubTeamA,
                                area: item.workArea ? `${item.workArea} (Team A Zone)` : batchSubTeamA.area,
                                activity: item.specificActivities || batchSubTeamA.activity,
                              });
                            }
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border border-indigo-300 rounded bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="">-- Piliin ang Lugar / Gawain para sa Team A --</option>
                        {availableWpItems.map((item, idx) => (
                          <option key={idx} value={idx}>
                            📍 {item.workArea || "Work Area"} — {item.specificActivities?.substring(0, 45)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Work Zone / Area</label>
                      <input
                        type="text"
                        value={batchSubTeamA.area}
                        onChange={(e) => setBatchSubTeamA({ ...batchSubTeamA, area: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Gawain / Task</label>
                      <textarea
                        rows={2}
                        value={batchSubTeamA.activity}
                        onChange={(e) => setBatchSubTeamA({ ...batchSubTeamA, activity: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Male</label>
                        <input
                          type="number"
                          value={batchSubTeamA.maleCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setBatchSubTeamA({ ...batchSubTeamA, maleCount: val, totalCount: val + batchSubTeamA.femaleCount });
                          }}
                          className="w-full px-2 py-1 text-xs border rounded font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Female</label>
                        <input
                          type="number"
                          value={batchSubTeamA.femaleCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setBatchSubTeamA({ ...batchSubTeamA, femaleCount: val, totalCount: batchSubTeamA.maleCount + val });
                          }}
                          className="w-full px-2 py-1 text-xs border rounded font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="p-3.5 bg-slate-50 border-2 border-indigo-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-purple-700 text-white font-black text-xs rounded-lg">
                        Sub-Team B
                      </span>
                      <span className="text-xs font-mono font-black text-purple-900">
                        Total: {batchSubTeamB.totalCount} Pax
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Label / Pangalan</label>
                      <input
                        type="text"
                        value={batchSubTeamB.name}
                        onChange={(e) => setBatchSubTeamB({ ...batchSubTeamB, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg font-bold"
                      />
                    </div>

                    {/* Dropdown for Sub-Team B */}
                    <div className="bg-purple-50/80 p-2 rounded-lg border border-purple-200 space-y-1">
                      <label className="block text-[9px] font-black text-purple-950 uppercase flex items-center space-x-1">
                        <FolderDown className="w-3 h-3 text-purple-600" />
                        <span>Pumili mula sa Work Program:</span>
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "") {
                            const item = availableWpItems[parseInt(val, 10)];
                            if (item) {
                              setBatchSubTeamB({
                                ...batchSubTeamB,
                                area: item.workArea ? `${item.workArea} (Team B Zone)` : batchSubTeamB.area,
                                activity: item.specificActivities || batchSubTeamB.activity,
                              });
                            }
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border border-purple-300 rounded bg-white text-slate-800 cursor-pointer"
                      >
                        <option value="">-- Piliin ang Lugar / Gawain para sa Team B --</option>
                        {availableWpItems.map((item, idx) => (
                          <option key={idx} value={idx}>
                            📍 {item.workArea || "Work Area"} — {item.specificActivities?.substring(0, 45)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Work Zone / Area</label>
                      <input
                        type="text"
                        value={batchSubTeamB.area}
                        onChange={(e) => setBatchSubTeamB({ ...batchSubTeamB, area: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Gawain / Task</label>
                      <textarea
                        rows={2}
                        value={batchSubTeamB.activity}
                        onChange={(e) => setBatchSubTeamB({ ...batchSubTeamB, activity: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Male</label>
                        <input
                          type="number"
                          value={batchSubTeamB.maleCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setBatchSubTeamB({ ...batchSubTeamB, maleCount: val, totalCount: val + batchSubTeamB.femaleCount });
                          }}
                          className="w-full px-2 py-1 text-xs border rounded font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">Female</label>
                        <input
                          type="number"
                          value={batchSubTeamB.femaleCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setBatchSubTeamB({ ...batchSubTeamB, femaleCount: val, totalCount: batchSubTeamB.maleCount + val });
                          }}
                          className="w-full px-2 py-1 text-xs border rounded font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3: MERGED MULTI-GROUPS */}
            {batchModalMode === "MERGE_GROUPS" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <span className="text-xs font-black text-emerald-950 uppercase flex items-center space-x-1.5">
                    <GitMerge className="w-4 h-4 text-emerald-700" />
                    <span>Pumili ng mga Grupo na Pagsasamahin / I-merge:</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentBarangayGroups.map((g) => {
                      const isChecked = batchSelectedMergeGroups.includes(g.groupName);
                      return (
                        <label
                          key={g.groupName}
                          className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition ${
                            isChecked
                              ? "bg-emerald-100/70 border-emerald-500 text-emerald-950 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMergeGroup(g.groupName)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                          />
                          <div className="text-xs">
                            <p className="font-bold">{g.groupLabel}</p>
                            <p className="text-[10px] text-slate-500 font-normal">{g.designatedMainArea}</p>
                            <p className="text-[10px] font-mono text-emerald-800 font-bold">
                              {g.demographics.totalCount} Pax (♂ {g.demographics.maleCount}, ♀ {g.demographics.femaleCount})
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Combined Live Tally Strip */}
                  <div className="p-3 bg-emerald-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-black text-emerald-200">
                      Pinagsamang Quota ({batchSelectedMergeGroups.length} Grupo):
                    </span>
                    <div className="flex items-center space-x-2 font-mono font-bold">
                      <span className="px-2 py-0.5 bg-emerald-950 rounded text-emerald-300">
                        Total: {mergedDemographicsSummary.totalCount} Pax
                      </span>
                      <span>♂ {mergedDemographicsSummary.maleCount}</span>
                      <span>♀ {mergedDemographicsSummary.femaleCount}</span>
                      <span>SC/PWD: {mergedDemographicsSummary.scPwdMaleCount + mergedDemographicsSummary.scPwdFemaleCount}</span>
                    </div>
                  </div>
                </div>

                {/* Dropdown for Merged Joint Taskforce */}
                <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300 space-y-1">
                  <label className="block text-[10px] font-black text-emerald-950 uppercase flex items-center space-x-1">
                    <FolderDown className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pumili ng Pinagsamang Lugar / Gawain mula sa Work Program:</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "") {
                        const item = availableWpItems[parseInt(val, 10)];
                        if (item) {
                          if (item.workArea) setBatchMergedArea(item.workArea);
                          if (item.specificActivities) setBatchMergedActivity(item.specificActivities);
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 rounded-lg bg-white text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Piliin ang Lugar / Gawain mula sa Work Program --</option>
                    {availableWpItems.map((item, idx) => (
                      <option key={idx} value={idx}>
                        📍 {item.workArea || "Work Area"} — {item.specificActivities?.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Joint Taskforce Name / Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={batchMergedLabel}
                    onChange={(e) => setBatchMergedLabel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Unified Designated Work Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={batchMergedArea}
                    onChange={(e) => setBatchMergedArea(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Joint Specific Activity Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={batchMergedActivity}
                    onChange={(e) => setBatchMergedActivity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsBatchEditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold border rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBatchSubmitting}
                className="px-5 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isBatchSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>
                  {batchModalMode === "SUB_TEAMS"
                    ? "Deploy Sub-Teams to Selected Days"
                    : batchModalMode === "MERGE_GROUPS"
                    ? `Apply Joint Merge to ${selectedActivityIds.length} Activities`
                    : `Apply Changes to ${selectedActivityIds.length} Activities`}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD / EDIT SINGLE ACTIVITY MODAL (WITH QUICK SUB-GROUP / MERGED PRESETS) */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleSaveActivity}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
          >
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              {editingItem ? "Edit Work Program Activity" : `Add Activity for Barangay ${selectedBarangay}`}
            </h3>

            {/* Quick Populate from Barangay Grouping or Sub-Group / Merged Combinations */}
            {currentBarangayGroups.length > 0 && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl space-y-2">
                <label className="block text-[10px] font-black text-teal-900 uppercase">
                  ⚡ Quick Auto-Fill from Official Groupings:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    onChange={(e) => {
                      const grpName = e.target.value;
                      const grp = currentBarangayGroups.find((g) => g.groupName === grpName);
                      if (grp) {
                        setActivityForm({
                          ...activityForm,
                          area: grp.designatedMainArea,
                          specificActivities: `Roadside maintenance, canal declogging, and community sanitation in ${grp.designatedMainArea}`,
                          maleCount: grp.demographics.maleCount,
                          femaleCount: grp.demographics.femaleCount,
                          scPwdMaleCount: grp.demographics.scPwdMaleCount,
                          scPwdFemaleCount: grp.demographics.scPwdFemaleCount,
                          totalCount: grp.demographics.totalCount,
                        });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-teal-300 rounded-xl bg-white font-bold text-teal-950"
                  >
                    <option value="">-- Buong Grupo (100%) --</option>
                    {currentBarangayGroups.map((g) => (
                      <option key={g.groupName} value={g.groupName}>
                        {g.groupLabel} ({g.demographics.totalCount} Pax)
                      </option>
                    ))}
                  </select>

                  <select
                    onChange={(e) => {
                      const grpName = e.target.value;
                      const grp = currentBarangayGroups.find((g) => g.groupName === grpName);
                      if (grp) {
                        const halfM = Math.ceil(grp.demographics.maleCount / 2);
                        const halfF = Math.ceil(grp.demographics.femaleCount / 2);
                        setActivityForm({
                          ...activityForm,
                          area: `${grp.designatedMainArea} (Sub-Team Zone)`,
                          specificActivities: `Sectoral canal declogging and vegetation maintenance (Sub-Team)`,
                          maleCount: halfM,
                          femaleCount: halfF,
                          scPwdMaleCount: Math.ceil(grp.demographics.scPwdMaleCount / 2),
                          scPwdFemaleCount: Math.ceil(grp.demographics.scPwdFemaleCount / 2),
                          totalCount: halfM + halfF,
                        });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-indigo-300 rounded-xl bg-white font-bold text-indigo-950"
                  >
                    <option value="">-- Sub-Team (50% Hati) --</option>
                    {currentBarangayGroups.map((g) => (
                      <option key={g.groupName} value={g.groupName}>
                        {g.groupLabel} - Sub-Team (50%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Work Day #</label>
                <select
                  value={activityForm.dayNumber}
                  onChange={(e) => setActivityForm({ ...activityForm, dayNumber: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 font-bold"
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
                  className="w-full px-3 py-2 text-xs border rounded-xl"
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
                className="w-full px-3 py-2 text-xs border rounded-xl"
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
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Female Quota</label>
                <input
                  type="number"
                  min={0}
                  value={activityForm.femaleCount}
                  onChange={(e) => setActivityForm({ ...activityForm, femaleCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Pax</label>
                <input
                  type="number"
                  min={0}
                  value={activityForm.totalCount || activityForm.maleCount + activityForm.femaleCount}
                  onChange={(e) => setActivityForm({ ...activityForm, totalCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono font-bold bg-slate-50"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="px-4 py-2 text-xs font-bold border rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gov-blue text-white font-bold text-xs rounded-xl shadow cursor-pointer"
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
