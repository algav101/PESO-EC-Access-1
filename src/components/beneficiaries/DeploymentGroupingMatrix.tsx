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
  CheckSquare,
  Square,
  Activity,
  Sliders,
  UserCheck,
  Briefcase,
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

  // Beneficiary-to-Group Explicit Mapping: { [pbId or beneficiaryId]: groupName }
  const [beneficiaryGroupAssignments, setBeneficiaryGroupAssignments] = useState<Record<string, string>>({});

  // Work Program Activities Cache per Barangay
  const [wpActivitiesByBarangay, setWpActivitiesByBarangay] = useState<Record<string, string[]>>({});

  // Comprehensive Create / Edit Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [modalBarangay, setModalBarangay] = useState("Aplaya");
  const [modalGroupName, setModalGroupName] = useState("");
  const [modalGroupLabel, setModalGroupLabel] = useState("");
  const [modalActivityPuroks, setModalActivityPuroks] = useState<string[]>([]);
  const [modalCustomPurokInput, setModalCustomPurokInput] = useState("");
  const [modalDesignatedArea, setModalDesignatedArea] = useState("");
  const [modalSpecificActivity, setModalSpecificActivity] = useState("");
  const [modalSelectedPbIds, setModalSelectedPbIds] = useState<string[]>([]);
  const [modalTargetDays, setModalTargetDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [modalAutoSyncToWorkProgram, setModalAutoSyncToWorkProgram] = useState(true);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [groupModalFeedback, setGroupModalFeedback] = useState<string | null>(null);

  // Beneficiary Selection Filters in Modal
  const [modalBeneSearch, setModalBeneSearch] = useState("");
  const [modalBeneGenderFilter, setModalBeneGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [modalBeneCategoryFilter, setModalBeneCategoryFilter] = useState<"ALL" | "SC" | "PWD" | "IP" | "4PS">("ALL");
  const [modalBenePurokFilter, setModalBenePurokFilter] = useState("ALL");

  // Quick Area Assignment Modal State
  const [isAssignAreaModalOpen, setIsAssignAreaModalOpen] = useState(false);
  const [assigningGroup, setAssigningGroup] = useState<any | null>(null);
  const [assignAreaName, setAssignAreaName] = useState("");
  const [assignSpecificActivity, setAssignSpecificActivity] = useState("");
  const [assignTargetDays, setAssignTargetDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState<string | null>(null);

  // Global Notification Banner
  const [globalBannerMsg, setGlobalBannerMsg] = useState<string | null>(null);

  // Load custom groups & assignments on mount
  useEffect(() => {
    try {
      const savedGroups = localStorage.getItem("tupad_custom_deployment_groupings");
      if (savedGroups) {
        setCustomGroups(JSON.parse(savedGroups));
      }
      const savedAssignments = localStorage.getItem("tupad_beneficiary_group_assignments");
      if (savedAssignments) {
        setBeneficiaryGroupAssignments(JSON.parse(savedAssignments));
      }
    } catch (e) {
      console.warn("Failed to load groupings/assignments from storage:", e);
    }
  }, []);

  // Fetch existing work program activities when programId or barangay changes
  useEffect(() => {
    if (!programId) return;
    const fetchWpActivities = async () => {
      try {
        const res = await fetch(`/api/v1/programs/${programId}/work-program`);
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, string[]> = {};
          (data.workPrograms || []).forEach((wp: any) => {
            const activities = (wp.items || [])
              .map((it: any) => it.specificActivities?.trim())
              .filter(Boolean);
            map[wp.barangay] = Array.from(new Set(activities));
          });
          setWpActivitiesByBarangay(map);
        }
      } catch (e) {
        console.warn("Could not fetch work program activities:", e);
      }
    };
    fetchWpActivities();
  }, [programId]);

  const saveCustomGroupsToStorage = (updated: Record<string, PurokSitioGroupDefinition[]>) => {
    setCustomGroups(updated);
    try {
      localStorage.setItem("tupad_custom_deployment_groupings", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save custom groupings:", e);
    }
  };

  const saveBeneficiaryAssignmentsToStorage = (updated: Record<string, string>) => {
    setBeneficiaryGroupAssignments(updated);
    try {
      localStorage.setItem("tupad_beneficiary_group_assignments", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save beneficiary assignments:", e);
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
          specificActivity?: string;
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
          specificActivity: (g as any).specificActivity || "",
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
          specificActivity: (cg as any).specificActivity || "",
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

      // Check explicit assignment first
      const explicitGroupName = beneficiaryGroupAssignments[pb.id] || beneficiaryGroupAssignments[b.id] || beneficiaryGroupAssignments[b.designatedNumber];
      let matchedGroup = brgyEntry.groups.find((g) => g.groupName === explicitGroupName);

      // If no explicit assignment, match by covered puroks
      if (!matchedGroup) {
        const sitio = (b.sitio || "").trim().toUpperCase();
        matchedGroup = brgyEntry.groups.find((g) =>
          g.coveredPuroks.some((p) => sitio.includes(p.toUpperCase()) || p.toUpperCase().includes(sitio))
        );
      }

      // Fallback to default classifier
      if (!matchedGroup) {
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
  }, [beneficiaries, customGroups, beneficiaryGroupAssignments]);

  // Available puroks in a given barangay based on masterlist data
  const getPuroksInBarangay = (brgyName: string) => {
    const stdBrgy = getStandardBarangayName(brgyName);
    const purokSet = new Set<string>();
    beneficiaries.forEach((pb) => {
      const b = pb.beneficiary || pb;
      if (getStandardBarangayName(b.barangay || "") === stdBrgy && b.sitio) {
        purokSet.add(b.sitio.trim());
      }
    });

    // Also include default puroks from configuration
    const bKey = getBarangayKey(brgyName);
    const defaultCfg = DINGALAN_BARANGAY_GROUPINGS[bKey]?.groups || [];
    defaultCfg.forEach((g) => {
      g.purokSitios.forEach((p) => purokSet.add(p));
    });

    return Array.from(purokSet).sort();
  };

  // Beneficiaries in modal's selected barangay
  const modalBarangayBeneficiaries = useMemo(() => {
    const stdBrgy = getStandardBarangayName(modalBarangay);
    return beneficiaries.filter((pb) => {
      if (pb.participationStatus === "REPLACED") return false;
      const b = pb.beneficiary || pb;
      return getStandardBarangayName(b.barangay || "") === stdBrgy;
    });
  }, [beneficiaries, modalBarangay]);

  // Filtered beneficiaries inside the modal selection table
  const filteredModalBeneficiaries = useMemo(() => {
    return modalBarangayBeneficiaries.filter((pb) => {
      const b = pb.beneficiary || pb;
      const name = (b.fullName || `${b.lastName}, ${b.firstName}`).toLowerCase();
      const num = String(b.designatedNumber || pb.designatedNumber || "");
      const sitio = (b.sitio || "").toLowerCase();

      // Search filter
      if (modalBeneSearch.trim()) {
        const q = modalBeneSearch.toLowerCase().trim();
        if (!name.includes(q) && !num.includes(q) && !sitio.includes(q)) {
          return false;
        }
      }

      // Gender filter
      if (modalBeneGenderFilter !== "ALL") {
        const sex = (b.sex || b.gender || "").toUpperCase();
        if (modalBeneGenderFilter === "MALE" && sex !== "MALE" && sex !== "M") return false;
        if (modalBeneGenderFilter === "FEMALE" && sex !== "FEMALE" && sex !== "F") return false;
      }

      // Category filter
      if (modalBeneCategoryFilter === "SC" && !b.isSenior) return false;
      if (modalBeneCategoryFilter === "PWD" && !b.isPwd) return false;
      if (modalBeneCategoryFilter === "IP" && !b.isIp) return false;
      if (modalBeneCategoryFilter === "4PS" && !b.is4Ps) return false;

      // Purok filter
      if (modalBenePurokFilter !== "ALL") {
        if ((b.sitio || "").trim() !== modalBenePurokFilter) return false;
      }

      return true;
    });
  }, [modalBarangayBeneficiaries, modalBeneSearch, modalBeneGenderFilter, modalBeneCategoryFilter, modalBenePurokFilter]);

  // Computed demographics of the currently checked beneficiaries in modal
  const modalSelectionDemographics = useMemo(() => {
    const selectedObjects = modalBarangayBeneficiaries.filter((pb) =>
      modalSelectedPbIds.includes(pb.id) || modalSelectedPbIds.includes(pb.beneficiary?.id)
    );
    return computeGroupDemographics(selectedObjects);
  }, [modalBarangayBeneficiaries, modalSelectedPbIds]);

  // Open Create Modal
  const handleOpenCreateModal = (brgy: string) => {
    const stdBrgy = getStandardBarangayName(brgy);
    const existingGroups = groupedData[stdBrgy]?.groups || [];
    const nextGroupIndex = existingGroups.length + 1;
    const defaultGroupName = `${stdBrgy.toUpperCase()} GROUP ${nextGroupIndex}`;
    const defaultLabel = `${stdBrgy} Group ${nextGroupIndex}`;

    setEditingGroup(null);
    setModalBarangay(stdBrgy);
    setModalGroupName(defaultGroupName);
    setModalGroupLabel(defaultLabel);
    setModalActivityPuroks([]);
    setModalCustomPurokInput("");
    setModalDesignatedArea(`${stdBrgy} Designated Sector`);
    setModalSpecificActivity(`Roadside cleaning, canal maintenance, and environmental sanitation in Barangay ${stdBrgy}`);
    setModalSelectedPbIds([]);
    setModalTargetDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    setModalAutoSyncToWorkProgram(true);
    setModalBeneSearch("");
    setModalBeneGenderFilter("ALL");
    setModalBeneCategoryFilter("ALL");
    setModalBenePurokFilter("ALL");
    setGroupModalFeedback(null);
    setIsGroupModalOpen(true);
  };

  // Open Edit Modal for an existing group
  const handleOpenEditModal = (brgy: string, group: any) => {
    const stdBrgy = getStandardBarangayName(brgy);
    setEditingGroup(group);
    setModalBarangay(stdBrgy);
    setModalGroupName(group.groupName);
    setModalGroupLabel(group.groupLabel);
    setModalActivityPuroks(group.coveredPuroks || []);
    setModalCustomPurokInput("");
    setModalDesignatedArea(group.designatedMainArea || "");
    setModalSpecificActivity(
      group.specificActivity ||
        wpActivitiesByBarangay[stdBrgy]?.[0] ||
        `Roadside cleaning, canal maintenance, and environmental sanitation in ${group.designatedMainArea}`
    );
    const currentMemberIds = group.beneficiaries.map((pb: any) => pb.id);
    setModalSelectedPbIds(currentMemberIds);
    setModalTargetDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    setModalAutoSyncToWorkProgram(true);
    setModalBeneSearch("");
    setModalBeneGenderFilter("ALL");
    setModalBeneCategoryFilter("ALL");
    setModalBenePurokFilter("ALL");
    setGroupModalFeedback(null);
    setIsGroupModalOpen(true);
  };

  // Toggle beneficiary selection in modal
  const toggleSelectBeneficiaryInModal = (pbId: string) => {
    setModalSelectedPbIds((prev) =>
      prev.includes(pbId) ? prev.filter((id) => id !== pbId) : [...prev, pbId]
    );
  };

  // Strategic Quick Allocation Helpers
  const handleSelectAllInModal = () => {
    const ids = modalBarangayBeneficiaries.map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...ids])));
  };

  const handleSelectMalesOnly = () => {
    const maleIds = modalBarangayBeneficiaries
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        const sex = (b.sex || b.gender || "").toUpperCase();
        return sex === "MALE" || sex === "M";
      })
      .map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...maleIds])));
  };

  const handleSelectFemalesOnly = () => {
    const femaleIds = modalBarangayBeneficiaries
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        const sex = (b.sex || b.gender || "").toUpperCase();
        return sex === "FEMALE" || sex === "F";
      })
      .map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...femaleIds])));
  };

  const handleSelectSeniorsAndPwds = () => {
    const vulnerableIds = modalBarangayBeneficiaries
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        return b.isSenior || b.isPwd;
      })
      .map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...vulnerableIds])));
  };

  const handleSelectBySelectedPurok = () => {
    if (modalActivityPuroks.length === 0) {
      alert("Pumili muna ng Purok o Sitio ng aktibidad sa itaas.");
      return;
    }
    const purokIds = modalBarangayBeneficiaries
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        const sitio = (b.sitio || "").toUpperCase();
        return modalActivityPuroks.some((p) => sitio.includes(p.toUpperCase()) || p.toUpperCase().includes(sitio));
      })
      .map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...purokIds])));
  };

  const handleClearBeneficiarySelection = () => {
    setModalSelectedPbIds([]);
  };

  // Toggle Purok in activity purok selector
  const toggleActivityPurok = (purok: string) => {
    setModalActivityPuroks((prev) =>
      prev.includes(purok) ? prev.filter((p) => p !== purok) : [...prev, purok]
    );
  };

  // Handle Save / Create / Edit Group
  const handleSaveGroupModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalGroupName.trim()) {
      alert("Pakilagay ang pangalan ng grupo.");
      return;
    }

    const stdBrgy = getStandardBarangayName(modalBarangay);
    setIsSubmittingGroup(true);
    setGroupModalFeedback(null);

    try {
      // 1. Compile Purok list
      let combinedPuroks = [...modalActivityPuroks];
      if (modalCustomPurokInput.trim()) {
        const extra = modalCustomPurokInput.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
        combinedPuroks = Array.from(new Set([...combinedPuroks, ...extra]));
      }
      if (combinedPuroks.length === 0) {
        combinedPuroks = [modalGroupLabel.trim() || modalGroupName.trim()];
      }

      // 2. Save Custom Group Definition
      const isExistingDefault = DINGALAN_BARANGAY_GROUPINGS[getBarangayKey(stdBrgy)]?.groups.some(
        (g) => g.groupName === modalGroupName.trim().toUpperCase()
      );

      const groupDef: PurokSitioGroupDefinition = {
        groupName: modalGroupName.trim().toUpperCase(),
        groupLabel: modalGroupLabel.trim() || modalGroupName.trim(),
        designatedMainArea: modalDesignatedArea.trim() || `${stdBrgy} Designated Sector`,
        purokSitios: combinedPuroks,
        specificActivity: modalSpecificActivity.trim(),
      };

      const currentForBrgy = customGroups[stdBrgy] || [];
      let updatedCustomForBrgy: PurokSitioGroupDefinition[];

      if (editingGroup && editingGroup.isCustom) {
        // Edit custom
        updatedCustomForBrgy = currentForBrgy.map((g) =>
          g.groupName === editingGroup.groupName ? groupDef : g
        );
      } else if (!isExistingDefault) {
        // New custom group
        updatedCustomForBrgy = [...currentForBrgy.filter((g) => g.groupName !== groupDef.groupName), groupDef];
      } else {
        // Modifying default group: persist as override custom definition
        updatedCustomForBrgy = [...currentForBrgy.filter((g) => g.groupName !== groupDef.groupName), groupDef];
      }

      const updatedCustomGroups = {
        ...customGroups,
        [stdBrgy]: updatedCustomForBrgy,
      };
      saveCustomGroupsToStorage(updatedCustomGroups);

      // 3. Save Beneficiary-to-Group Mappings
      const updatedAssignments = { ...beneficiaryGroupAssignments };
      modalSelectedPbIds.forEach((pbId) => {
        updatedAssignments[pbId] = groupDef.groupName;
      });
      saveBeneficiaryAssignmentsToStorage(updatedAssignments);

      // 4. Auto-Sync to 10-Day TUPAD Work Program Database if enabled
      if (modalAutoSyncToWorkProgram && programId) {
        const syncRes = await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barangay: stdBrgy,
            groupName: groupDef.groupName,
            groupLabel: groupDef.groupLabel,
            designatedArea: groupDef.designatedMainArea,
            specificActivities: modalSpecificActivity.trim(),
            targetDays: modalTargetDays,
            demographics: {
              maleCount: modalSelectionDemographics.maleCount,
              femaleCount: modalSelectionDemographics.femaleCount,
              scPwdMaleCount: modalSelectionDemographics.scPwdMaleCount,
              scPwdFemaleCount: modalSelectionDemographics.scPwdFemaleCount,
              totalCount: modalSelectionDemographics.totalCount,
            },
          }),
        });

        if (!syncRes.ok) {
          const syncData = await syncRes.json();
          console.warn("Work program sync warning:", syncData.error);
        }
      }

      setGlobalBannerMsg(
        `✓ Matagumpay na na-save ang "${groupDef.groupLabel}" na may ${modalSelectedPbIds.length} benepisyaryo at awtomatikong nai-sync sa TUPAD Work Program!`
      );
      setTimeout(() => setGlobalBannerMsg(null), 6000);
      setIsGroupModalOpen(false);
    } catch (err: any) {
      alert("Error sa pag-save ng grupo: " + err.message);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Delete a custom group
  const handleDeleteCustomGroup = (barangay: string, groupName: string) => {
    if (!confirm(`Sigurado ka bang nais mong tanggalin ang custom group na "${groupName}" sa Barangay ${barangay}?`)) return;

    const currentForBrgy = customGroups[barangay] || [];
    const updatedForBrgy = currentForBrgy.filter((g) => g.groupName !== groupName);

    const updated = {
      ...customGroups,
      [barangay]: updatedForBrgy,
    };
    saveCustomGroupsToStorage(updated);

    // Clean up assignments pointing to this group
    const updatedAssignments = { ...beneficiaryGroupAssignments };
    Object.keys(updatedAssignments).forEach((id) => {
      if (updatedAssignments[id] === groupName) {
        delete updatedAssignments[id];
      }
    });
    saveBeneficiaryAssignmentsToStorage(updatedAssignments);
  };

  // Quick Area Assignment Modal
  const handleOpenAssignAreaModal = (brgy: string, group: any) => {
    setAssigningGroup({ ...group, barangay: brgy });
    setAssignAreaName(group.designatedMainArea || "");
    setAssignSpecificActivity(
      group.specificActivity ||
        wpActivitiesByBarangay[brgy]?.[0] ||
        `Roadside maintenance, drainage declogging, and environmental cleaning in ${group.designatedMainArea}`
    );
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
      if (programId) {
        await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barangay: assigningGroup.barangay,
            groupName: assigningGroup.groupName,
            groupLabel: assigningGroup.groupLabel,
            designatedArea: assignAreaName.trim(),
            specificActivities: assignSpecificActivity.trim(),
            targetDays: assignTargetDays,
            demographics: {
              maleCount: assigningGroup.demographics.maleCount,
              femaleCount: assigningGroup.demographics.femaleCount,
              scPwdMaleCount: assigningGroup.demographics.scPwdMaleCount,
              scPwdFemaleCount: assigningGroup.demographics.scPwdFemaleCount,
              totalCount: assigningGroup.demographics.totalCount,
            },
          }),
        });
      }

      setAssignmentFeedback(`✓ Matagumpay na itinalaga ang "${assigningGroup.groupLabel}" sa "${assignAreaName.trim()}" para sa Araw ${assignTargetDays.join(", ")}!`);
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

  const toggleModalTargetDay = (dayNum: number) => {
    setModalTargetDays((prev) =>
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
      {/* Global Feedback Banner */}
      {globalBannerMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center justify-between text-emerald-950 font-bold text-xs shadow-md animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{globalBannerMsg}</span>
          </div>
          <button type="button" onClick={() => setGlobalBannerMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-black">✕</button>
        </div>
      )}

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
              Opisyal na batayan ng deployment para sa 10-araw na TUPAD work program. Pumili ng purok/sitio ng aktibidad, partikular na gawain, at magtalaga ng benepisyaryo ayon sa kasarian, senior citizens, at PWD para sa madiskarteng pagpapakilos.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {canManage && (
              <button
                type="button"
                onClick={() => handleOpenCreateModal(activeBarangayFilter !== "ALL" ? activeBarangayFilter : "Aplaya")}
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
                  onClick={() => handleOpenCreateModal(brgy.barangay)}
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

                        {g.specificActivity && (
                          <div className="flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                            <Activity className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span className="font-semibold">{g.specificActivity}</span>
                          </div>
                        )}

                        <p className="text-xs text-slate-600 font-medium">
                          <span className="font-bold text-slate-800">Sakop na Puroks &amp; Sitios:</span>{" "}
                          {g.coveredPuroks.length > 0 ? (
                            <span>{g.coveredPuroks.join(", ")}</span>
                          ) : (
                            <span className="italic text-slate-400">Direktang Itinalagang mga Benepisyaryo</span>
                          )}
                        </p>
                      </div>

                      {/* Middle: Demographic Badge Counters */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-slate-900 text-white shadow-xs">
                          Total: {demo.totalCount}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-blue-50 text-blue-800 border border-blue-200">
                          ♂ {demo.maleCount}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-pink-50 text-pink-800 border border-pink-200">
                          ♀ {demo.femaleCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono bg-amber-50 text-amber-900 border border-amber-200">
                          SC: {demo.isSeniorCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono bg-purple-50 text-purple-900 border border-purple-200">
                          PWD: {demo.isPwdCount}
                        </span>
                        {demo.isIpCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono bg-emerald-50 text-emerald-900 border border-emerald-200">
                            IP: {demo.isIpCount}
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenAssignAreaModal(brgy.barangay, g)}
                              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                              title="Italaga sa Work Area & Sync sa Work Program"
                            >
                              <MapPin className="w-3.5 h-3.5 text-amber-300" />
                              <span>Italaga sa Work Area</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(brgy.barangay, g)}
                              className="p-2 text-slate-600 hover:text-blue-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200"
                              title="I-edit ang Grupo, Gawain at Roster Allocation"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {g.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomGroup(brgy.barangay, g.groupName)}
                                className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition border border-slate-200"
                                title="Burahin ang Custom Group"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKey)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200 flex items-center space-x-1 cursor-pointer"
                        >
                          <span>{isExpanded ? "Itago ang Talaan" : "Tingnan ang Talaan"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Beneficiary Roster Table */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-200 animate-fadeIn">
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">#</th>
                                <th className="px-4 py-2.5">Pangalan ng Benepisyaryo</th>
                                <th className="px-4 py-2.5">Purok / Sitio</th>
                                <th className="px-4 py-2.5">Kasarian at Edad</th>
                                <th className="px-4 py-2.5">Kategorya</th>
                                <th className="px-4 py-2.5">Contact No.</th>
                                {canManage && <th className="px-4 py-2.5 text-right">Aksyon</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {g.beneficiaries.length === 0 ? (
                                <tr>
                                  <td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-xs text-slate-400 space-y-2">
                                    <p>Walang nakatalagang benepisyaryo sa grupong ito.</p>
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(brgy.barangay, g)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-xs inline-flex items-center space-x-1"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Magtalaga ng mga Benepisyaryo sa Grupong Ito</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ) : (
                                g.beneficiaries.map((pb: any, idx: number) => {
                                  const b = pb.beneficiary || pb;
                                  return (
                                    <tr key={pb.id || idx} className="hover:bg-slate-50 transition">
                                      <td className="px-4 py-2.5 font-bold font-mono text-slate-900">
                                        {b.designatedNumber || pb.designatedNumber || idx + 1}
                                      </td>
                                      <td className="px-4 py-2.5 font-black text-slate-900">
                                        {b.fullName || `${b.lastName}, ${b.firstName}`}
                                      </td>
                                      <td className="px-4 py-2.5 font-medium text-slate-700">
                                        {b.sitio || "Poblacion / Sentro"}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">
                                        {(b.sex || b.gender || "-").toUpperCase()}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                          {b.isSenior && (
                                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                              SC
                                            </span>
                                          )}
                                          {b.isPwd && (
                                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                              PWD
                                            </span>
                                          )}
                                          {b.isIp && (
                                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                              IP
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-slate-600 text-[11px]">
                                        {b.contactNumber || b.contactNo || "-"}
                                      </td>
                                      {canManage && (
                                        <td className="px-4 py-2.5 text-right space-x-1">
                                          {onEditBeneficiary && (
                                            <button
                                              type="button"
                                              onClick={() => onEditBeneficiary(pb)}
                                              className="p-1 text-slate-400 hover:text-blue-900"
                                              title="I-edit ang Profile ng Benepisyaryo"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {onDeleteBeneficiary && (
                                            <button
                                              type="button"
                                              onClick={() => onDeleteBeneficiary(pb)}
                                              className="p-1 text-slate-400 hover:text-rose-600"
                                              title="Burahin sa Roster"
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

      {/* 3. COMPREHENSIVE CREATE & EDIT GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border-t-4 border-t-emerald-600 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-2xl">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingGroup ? `I-edit ang Deployment Group: ${editingGroup.groupLabel}` : "Lumikha ng Bagong Deployment Group"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pumili ng purok ng aktibidad, partikular na gawain, at maglaan ng mga benepisyaryo ayon sa lakas, kasarian, at lokasyon.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroupModal} className="space-y-6 text-xs">
              {/* SECTION A: Location, Activity & Work Area */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>1. Lokasyon, Pangalan ng Grupo at Gawain (Work Program Basis)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Barangay <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={modalBarangay}
                      disabled={Boolean(editingGroup)}
                      onChange={(e) => setModalBarangay(e.target.value)}
                      className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
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
                      Pangalan ng Grupo (Group Label) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={modalGroupLabel}
                      onChange={(e) => {
                        setModalGroupLabel(e.target.value);
                        if (!editingGroup) setModalGroupName(e.target.value.toUpperCase());
                      }}
                      placeholder="Hal. Line Canals & Drainage Sector"
                      className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Group Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={modalGroupName}
                      onChange={(e) => setModalGroupName(e.target.value.toUpperCase())}
                      placeholder="Hal. APLAYA GROUP 2"
                      className="w-full px-3.5 py-2.5 font-bold font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 uppercase"
                    />
                  </div>
                </div>

                {/* Purok Selection of the Activity */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase">
                    Purok / Sitio ng Aktibidad (Pumili ng isa o higit pa):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {getPuroksInBarangay(modalBarangay).map((p) => {
                      const isSelected = modalActivityPuroks.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleActivityPurok(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center space-x-1 ${
                            isSelected
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <span>{p}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Itinalagang Lugar ng Paggawa (Designated Work Area) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={modalDesignatedArea}
                      onChange={(e) => setModalDesignatedArea(e.target.value)}
                      placeholder="Hal. Purok Lapu-Lapu, Tanigue & Central Drainage Canal"
                      className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Pumili mula sa Umiiral na TUPAD Work Program Activities:
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) setModalSpecificActivity(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Piliin ang Aktibidad mula sa Work Program --</option>
                      {(wpActivitiesByBarangay[modalBarangay] || []).map((act, idx) => (
                        <option key={idx} value={act}>
                          {act.length > 70 ? act.substring(0, 70) + "..." : act}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Deskripsyon ng Partikular na Gawain (Specific Activities) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={modalSpecificActivity}
                    onChange={(e) => setModalSpecificActivity(e.target.value)}
                    placeholder="Hal. De-clogging of canals, creeks, waterways, and drainage inlets..."
                    className="w-full px-3.5 py-2.5 font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 leading-relaxed"
                  />
                </div>
              </div>

              {/* SECTION B: Precise Beneficiary Allocation & Worker Strategy */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-blue-900" />
                    <span>2. Pagtatalaga ng mga Benepisyaryo (Strength, Capacity &amp; Location Strategy)</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Kabuuan sa {modalBarangay}: <strong className="text-blue-950">{modalBarangayBeneficiaries.length} Enrolled</strong>
                  </span>
                </div>

                {/* Strategic Allocation Preset Buttons */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    ⚡ Mabilisang Estratehiya sa Paglalaan ng Manggagawa:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectMalesOnly}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg border border-blue-200 transition"
                      title="Mabibigat na trabaho gaya ng paghuhukay at de-clogging ng mga kanal"
                    >
                      💪 Heavy Labor (Lahat ng Lalaki)
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectSeniorsAndPwds}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200 transition"
                      title="Magagaang gawain gaya ng community gardening, tree planting, o street sweeping"
                    >
                      🌱 Light Tasks (Senior Citizens &amp; PWDs)
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectFemalesOnly}
                      className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-900 font-bold rounded-lg border border-pink-200 transition"
                    >
                      👩 Maintenance &amp; Sweeping (Kababaihan)
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectBySelectedPurok}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-200 transition"
                    >
                      📍 Proximity (Lahat sa Napiling Purok)
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllInModal}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
                    >
                      Piliin Lahat ({modalBarangayBeneficiaries.length})
                    </button>
                    {modalSelectedPbIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearBeneficiarySelection}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition"
                      >
                        I-clear ang Napili
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-time Allocation & Validation Tally Box */}
                <div className="p-3.5 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white rounded-2xl shadow-sm space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-gov-gold" />
                      <span className="text-xs font-black text-gov-goldLight uppercase tracking-wider">
                        Live Allocation Tally para sa {modalGroupLabel || modalGroupName}:
                      </span>
                    </div>
                    <span className="px-3 py-0.5 rounded-full font-mono font-black text-xs bg-gov-gold text-gov-dark">
                      Nailaan: {modalSelectionDemographics.totalCount} Tao ({((modalSelectionDemographics.totalCount / (modalBarangayBeneficiaries.length || 1)) * 100).toFixed(0)}% ng Barangay)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="bg-white/10 p-2 rounded-xl">
                      <span className="text-slate-400 text-[10px] block uppercase">Kalalakihan (Male)</span>
                      <strong className="text-blue-300 font-mono text-sm">{modalSelectionDemographics.maleCount}</strong>
                    </div>
                    <div className="bg-white/10 p-2 rounded-xl">
                      <span className="text-slate-400 text-[10px] block uppercase">Kababaihan (Female)</span>
                      <strong className="text-pink-300 font-mono text-sm">{modalSelectionDemographics.femaleCount}</strong>
                    </div>
                    <div className="bg-white/10 p-2 rounded-xl">
                      <span className="text-slate-400 text-[10px] block uppercase">Senior Citizens</span>
                      <strong className="text-amber-300 font-mono text-sm">{modalSelectionDemographics.isSeniorCount}</strong>
                    </div>
                    <div className="bg-white/10 p-2 rounded-xl">
                      <span className="text-slate-400 text-[10px] block uppercase">PWDs</span>
                      <strong className="text-purple-300 font-mono text-sm">{modalSelectionDemographics.isPwdCount}</strong>
                    </div>
                    <div className="bg-white/10 p-2 rounded-xl col-span-2 sm:col-span-1">
                      <span className="text-slate-400 text-[10px] block uppercase">Katutubo IP</span>
                      <strong className="text-emerald-300 font-mono text-sm">{modalSelectionDemographics.isIpCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Filter Controls for Beneficiary List */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Maghanap ng pangalan, beneficiary # o purok..."
                      value={modalBeneSearch}
                      onChange={(e) => setModalBeneSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border rounded-xl bg-white text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={modalBeneGenderFilter}
                      onChange={(e) => setModalBeneGenderFilter(e.target.value as any)}
                      className="px-2.5 py-2 border rounded-xl bg-white text-xs font-bold"
                    >
                      <option value="ALL">Lahat ng Kasarian</option>
                      <option value="MALE">Lalaki lamang</option>
                      <option value="FEMALE">Babae lamang</option>
                    </select>

                    <select
                      value={modalBeneCategoryFilter}
                      onChange={(e) => setModalBeneCategoryFilter(e.target.value as any)}
                      className="px-2.5 py-2 border rounded-xl bg-white text-xs font-bold"
                    >
                      <option value="ALL">Lahat ng Kategorya</option>
                      <option value="SC">Senior Citizens lamang</option>
                      <option value="PWD">PWDs lamang</option>
                      <option value="IP">Katutubo IP lamang</option>
                    </select>

                    <select
                      value={modalBenePurokFilter}
                      onChange={(e) => setModalBenePurokFilter(e.target.value)}
                      className="px-2.5 py-2 border rounded-xl bg-white text-xs font-bold"
                    >
                      <option value="ALL">Lahat ng Purok</option>
                      {getPuroksInBarangay(modalBarangay).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interactive Checkbox Beneficiary Table */}
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b">
                      <tr>
                        <th className="px-3 py-2 text-center w-8">
                          <input
                            type="checkbox"
                            checked={
                              filteredModalBeneficiaries.length > 0 &&
                              filteredModalBeneficiaries.every((pb) => modalSelectedPbIds.includes(pb.id))
                            }
                            onChange={() => {
                              const filteredIds = filteredModalBeneficiaries.map((pb) => pb.id);
                              const allIncluded = filteredIds.every((id) => modalSelectedPbIds.includes(id));
                              if (allIncluded) {
                                setModalSelectedPbIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                              } else {
                                setModalSelectedPbIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Pangalan</th>
                        <th className="px-3 py-2">Purok / Sitio</th>
                        <th className="px-3 py-2 text-center">Kasarian</th>
                        <th className="px-3 py-2 text-center">Kategorya</th>
                        <th className="px-3 py-2 text-right">Kasalukuyang Grupo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredModalBeneficiaries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400">
                            Walang tugmang benepisyaryo sa filter.
                          </td>
                        </tr>
                      ) : (
                        filteredModalBeneficiaries.map((pb, idx) => {
                          const b = pb.beneficiary || pb;
                          const isChecked = modalSelectedPbIds.includes(pb.id) || modalSelectedPbIds.includes(b.id);
                          const currentGroup =
                            beneficiaryGroupAssignments[pb.id] || beneficiaryGroupAssignments[b.id] || beneficiaryGroupAssignments[b.designatedNumber];

                          return (
                            <tr
                              key={pb.id || idx}
                              onClick={() => toggleSelectBeneficiaryInModal(pb.id)}
                              className={`cursor-pointer transition-colors ${
                                isChecked ? "bg-emerald-50/80 font-bold text-emerald-950" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectBeneficiaryInModal(pb.id)}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                                {b.designatedNumber || pb.designatedNumber || idx + 1}
                              </td>
                              <td className="px-3 py-2 font-bold text-slate-900">
                                {b.fullName || `${b.lastName}, ${b.firstName}`}
                              </td>
                              <td className="px-3 py-2 text-slate-700">{b.sitio || "-"}</td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-[11px]">
                                {(b.sex || b.gender || "-").toUpperCase()}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {b.isSenior && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                      SC
                                    </span>
                                  )}
                                  {b.isPwd && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                      PWD
                                    </span>
                                  )}
                                  {b.isIp && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      IP
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {currentGroup ? (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-mono">
                                    {currentGroup}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Unassigned</span>
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

              {/* SECTION C: Auto-Sync to 10-Day TUPAD Work Program & Public Inquiry */}
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={modalAutoSyncToWorkProgram}
                      onChange={(e) => setModalAutoSyncToWorkProgram(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="font-black text-amber-950 text-xs">
                      Awtomatikong i-update ang 10-Day TUPAD Work Program Database at Public QR Work Area Inquiry
                    </span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
                    Real-Time Database Sync
                  </span>
                </div>

                {modalAutoSyncToWorkProgram && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-900 uppercase">
                        I-apply ang Grupong ito sa mga Sumusunod na Araw:
                      </span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setModalTargetDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
                          className="font-bold text-amber-900 hover:underline"
                        >
                          Lahat (10 Araw)
                        </button>
                        <span className="text-amber-300">|</span>
                        <button
                          type="button"
                          onClick={() => setModalTargetDays([1, 2, 3, 4, 5])}
                          className="font-bold text-amber-900 hover:underline"
                        >
                          Days 1–5
                        </button>
                        <span className="text-amber-300">|</span>
                        <button
                          type="button"
                          onClick={() => setModalTargetDays([6, 7, 8, 9, 10])}
                          className="font-bold text-amber-900 hover:underline"
                        >
                          Days 6–10
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => {
                        const isSelected = modalTargetDays.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleModalTargetDay(d)}
                            className={`py-1.5 rounded-xl text-center text-xs font-mono font-black transition border cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-slate-950 border-amber-600 shadow-2xs scale-105"
                                : "bg-white text-slate-600 hover:bg-slate-100 border-amber-200"
                            }`}
                          >
                            Day {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup || modalSelectedPbIds.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingGroup ? (
                    <span>Isinasaayos at Inia-update sa Database...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {editingGroup ? "I-update ang Grupo at Work Program" : "I-save ang Grupo at I-sync sa Work Program"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. QUICK ASSIGN DEPLOYMENT AREA MODAL */}
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
                className="text-slate-400 hover:text-slate-700 p-1 font-bold text-base"
              >
                ✕
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
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
                    assignmentFeedback.startsWith("✓")
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                      : "bg-rose-50 text-rose-900 border-rose-300"
                  }`}
                >
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
