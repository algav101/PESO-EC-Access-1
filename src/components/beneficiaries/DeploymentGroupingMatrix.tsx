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
  Split,
  GitMerge,
  Combine,
  Link2,
  Unlink,
  FolderDown,
} from "lucide-react";
import {
  DINGALAN_BARANGAY_GROUPINGS,
  getBarangayKey,
  getStandardBarangayName,
  classifyBeneficiaryGroup,
  computeGroupDemographics,
  PurokSitioGroupDefinition,
  SubGroupScheduleConfig,
  MergedGroupScheduleConfig,
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
  const [wpItemsByBarangay, setWpItemsByBarangay] = useState<
    Record<string, Array<{ workArea: string; specificActivities: string }>>
  >({});

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
  const [modalBeneCategoryFilter, setModalBeneCategoryFilter] = useState<string>("ALL");
  const [modalBenePurokFilter, setModalBenePurokFilter] = useState<string>("ALL");
  // Group Configuration Mode: STANDARD | SUB_DIVIDE | MERGE_GROUP
  const [modalMode, setModalMode] = useState<"STANDARD" | "SUB_DIVIDE" | "MERGE_GROUP">("STANDARD");

  // Sub-Group Division State
  const [subGroupTargetDays, setSubGroupTargetDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [subGroupA, setSubGroupA] = useState({
    name: "",
    area: "",
    activity: "",
    pbIds: [] as string[],
  });
  const [subGroupB, setSubGroupB] = useState({
    name: "",
    area: "",
    activity: "",
    pbIds: [] as string[],
  });

  // Merge Group State
  const [mergeTargetGroup, setMergeTargetGroup] = useState<string>("");
  const [mergeTargetDays, setMergeTargetDays] = useState<number[]>([6, 7, 8, 9, 10]);
  const [mergedGroupLabel, setMergedGroupLabel] = useState<string>("");
  const [mergedDesignatedArea, setMergedDesignatedArea] = useState<string>("");
  const [mergedSpecificActivity, setMergedSpecificActivity] = useState<string>("");

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
        const parsed = JSON.parse(savedGroups);
        // Sanitize legacy custom groups to remove old search token dumps or "Group 1"
        const sanitized: Record<string, PurokSitioGroupDefinition[]> = {};
        Object.entries(parsed).forEach(([brgy, groups]) => {
          if (Array.isArray(groups)) {
            sanitized[brgy] = groups.map((g: any) => ({
              ...g,
              purokSitios: (g.purokSitios || []).filter(
                (p: string) =>
                  p &&
                  !p.toLowerCase().startsWith("group") &&
                  !p.toLowerCase().startsWith("grupo") &&
                  !p.includes(",") &&
                  p.length < 35
              ),
            }));
          }
        });
        setCustomGroups(sanitized);
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
          const actMap: Record<string, string[]> = {};
          const itemMap: Record<string, Array<{ workArea: string; specificActivities: string }>> = {};

          (data.workPrograms || []).forEach((wp: any) => {
            const brgy = wp.barangay;
            const activities: string[] = [];
            const items: Array<{ workArea: string; specificActivities: string }> = [];

            (wp.items || []).forEach((it: any) => {
              const act = (it.specificActivities || "").trim();
              const area = (it.workArea || it.area || "").trim();
              if (act && !activities.includes(act)) activities.push(act);
              if (act || area) {
                if (!items.some((existing) => existing.workArea === area && existing.specificActivities === act)) {
                  items.push({ workArea: area, specificActivities: act });
                }
              }
            });

            actMap[brgy] = activities;
            itemMap[brgy] = items;
          });

          setWpActivitiesByBarangay(actMap);
          setWpItemsByBarangay(itemMap);
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
          subGroups?: SubGroupScheduleConfig[];
          mergedSchedules?: MergedGroupScheduleConfig[];
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
        ...cfg.groups.map((g) => {
          const customOverride = customForBrgy.find((cg) => cg.groupName === g.groupName);
          return {
            groupName: g.groupName,
            groupLabel: customOverride?.groupLabel || g.groupLabel,
            designatedMainArea: customOverride?.designatedMainArea || g.designatedMainArea,
            specificActivity: customOverride?.specificActivity || (g as any).specificActivity || "",
            coveredPuroks: customOverride?.purokSitios || g.purokSitios,
            isCustom: false,
            subGroups: customOverride?.subGroups || (g as any).subGroups || [],
            mergedSchedules: customOverride?.mergedSchedules || (g as any).mergedSchedules || [],
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
        }),
        ...customForBrgy.filter((cg) => !cfg.groups.some((g) => g.groupName === cg.groupName)).map((cg) => ({
          groupName: cg.groupName,
          groupLabel: cg.groupLabel,
          designatedMainArea: cg.designatedMainArea,
          specificActivity: (cg as any).specificActivity || "",
          coveredPuroks: cg.purokSitios,
          isCustom: true,
          subGroups: cg.subGroups || [],
          mergedSchedules: cg.mergedSchedules || [],
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

  // Available puroks in a given barangay strictly based on uploaded masterlist beneficiaries data
  const getPuroksInBarangay = (brgyName: string) => {
    const stdBrgy = getStandardBarangayName(brgyName);
    const purokSet = new Set<string>();
    beneficiaries.forEach((pb) => {
      const b = pb.beneficiary || pb;
      if (getStandardBarangayName(b.barangay || "") === stdBrgy && b.sitio && b.sitio.trim()) {
        purokSet.add(b.sitio.trim());
      }
    });

    // Fallback to canonical configuration list only if no beneficiaries are uploaded yet for this barangay
    if (purokSet.size === 0) {
      const bKey = getBarangayKey(brgyName);
      const defaultCfg = DINGALAN_BARANGAY_GROUPINGS[bKey]?.groups || [];
      defaultCfg.forEach((g) => {
        g.purokSitios.forEach((p) => {
          if (p && p.trim()) purokSet.add(p.trim());
        });
      });
    }

    return Array.from(purokSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
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

  // Helper to determine which group a beneficiary is assigned to in a barangay
  const getAssignedGroupNameForBeneficiary = (pb: any, stdBrgy: string) => {
    const b = pb.beneficiary || pb;
    const explicit =
      beneficiaryGroupAssignments[pb.id] ||
      beneficiaryGroupAssignments[b.id] ||
      (b.designatedNumber ? beneficiaryGroupAssignments[String(b.designatedNumber)] : null);
    if (explicit) return explicit;

    const brgyEntry = groupedData[stdBrgy];
    if (brgyEntry) {
      for (const g of brgyEntry.groups) {
        if (
          g.beneficiaries.some(
            (item: any) =>
              item.id === pb.id ||
              item.beneficiary?.id === b.id ||
              (item.beneficiary?.designatedNumber && item.beneficiary?.designatedNumber === b.designatedNumber)
          )
        ) {
          return g.groupName;
        }
      }
    }
    return null;
  };

  // Available candidate beneficiaries for the modal:
  // If creating a new group: Exclude any beneficiary already in any group in this barangay.
  // If editing an existing group: Include current members of this group + unassigned beneficiaries, but exclude those in other groups.
  const modalCandidateBeneficiaries = useMemo(() => {
    const stdBrgy = getStandardBarangayName(modalBarangay);
    return modalBarangayBeneficiaries.filter((pb) => {
      const assignedGroup = getAssignedGroupNameForBeneficiary(pb, stdBrgy);
      if (!assignedGroup) return true; // Unassigned -> available
      if (editingGroup) {
        // When editing, show members of the current group or if currently selected
        if (assignedGroup === editingGroup.groupName || modalSelectedPbIds.includes(pb.id)) {
          return true;
        }
      }
      // If creating a new group or assigned to a different group -> DO NOT SHOW
      return false;
    });
  }, [modalBarangayBeneficiaries, modalBarangay, editingGroup, modalSelectedPbIds, beneficiaryGroupAssignments, groupedData]);

  // Demographic stats of available candidate beneficiaries
  const availableCandidatesDemographics = useMemo(() => {
    return computeGroupDemographics(modalCandidateBeneficiaries);
  }, [modalCandidateBeneficiaries]);

  const assignedInOtherGroupsCount = modalBarangayBeneficiaries.length - modalCandidateBeneficiaries.length;

  // Filtered beneficiaries inside the modal selection table
  const filteredModalBeneficiaries = useMemo(() => {
    return modalCandidateBeneficiaries.filter((pb) => {
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
  }, [modalCandidateBeneficiaries, modalBeneSearch, modalBeneGenderFilter, modalBeneCategoryFilter, modalBenePurokFilter]);

  // Computed demographics of the currently checked beneficiaries in modal
  const modalSelectionDemographics = useMemo(() => {
    const selectedObjects = modalBarangayBeneficiaries.filter((pb) =>
      modalSelectedPbIds.includes(pb.id) || modalSelectedPbIds.includes(pb.beneficiary?.id)
    );
    return computeGroupDemographics(selectedObjects);
  }, [modalBarangayBeneficiaries, modalSelectedPbIds]);

  // Sub-Group A & B Demographics
  const subGroupADemographics = useMemo(() => {
    const list = modalBarangayBeneficiaries.filter((pb) => subGroupA.pbIds.includes(pb.id) || subGroupA.pbIds.includes(pb.beneficiary?.id));
    return computeGroupDemographics(list);
  }, [modalBarangayBeneficiaries, subGroupA.pbIds]);

  const subGroupBDemographics = useMemo(() => {
    const list = modalBarangayBeneficiaries.filter((pb) => subGroupB.pbIds.includes(pb.id) || subGroupB.pbIds.includes(pb.beneficiary?.id));
    return computeGroupDemographics(list);
  }, [modalBarangayBeneficiaries, subGroupB.pbIds]);

  // Merged Group Demographics
  const mergedGroupDemographics = useMemo(() => {
    const stdBrgy = getStandardBarangayName(modalBarangay);
    const partnerGroupObj = groupedData[stdBrgy]?.groups.find((g) => g.groupName === mergeTargetGroup);
    const partnerBenes = partnerGroupObj?.beneficiaries || [];
    const currentSelectedBenes = modalBarangayBeneficiaries.filter((pb) =>
      modalSelectedPbIds.includes(pb.id) || modalSelectedPbIds.includes(pb.beneficiary?.id)
    );
    const combinedBenes = Array.from(new Set([...currentSelectedBenes, ...partnerBenes]));
    return computeGroupDemographics(combinedBenes);
  }, [modalBarangay, mergeTargetGroup, groupedData, modalBarangayBeneficiaries, modalSelectedPbIds]);

  // Helper to get available Work Program items for a barangay
  const getAvailableWpItems = (brgy: string) => {
    const std = getStandardBarangayName(brgy || "Aplaya");
    const apiItems = wpItemsByBarangay[std] || wpItemsByBarangay[brgy] || [];

    const defaultGroupItems: Array<{ workArea: string; specificActivities: string }> = [];
    const cfg = DINGALAN_BARANGAY_GROUPINGS[getBarangayKey(std)];
    if (cfg && cfg.groups) {
      cfg.groups.forEach((g) => {
        defaultGroupItems.push({
          workArea: g.designatedMainArea,
          specificActivities: (g as any).specificActivity || "Roadside maintenance, canal declogging, and community sanitation",
        });
      });
    }

    const fallbackTemplates = [
      {
        workArea: `${std} Line Canals & Drainage Network`,
        specificActivities: "Declogging, desilting and clearing of drainage canals, road gutters, and public waterways",
      },
      {
        workArea: `${std} Shoreline Buffer & Mangrove Corridor`,
        specificActivities: "Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",
      },
      {
        workArea: `${std} Main Arterial Roads & Barangay Streets`,
        specificActivities: "Roadside brushing, vegetation trimming, sweeping, and removal of road obstructions",
      },
      {
        workArea: `${std} Barangay Hall, Health Center & Public Plaza`,
        specificActivities: "Community sanitation, disinfection, solid waste segregation, and public facility maintenance",
      },
    ];

    const combined: Array<{ workArea: string; specificActivities: string }> = [];
    const seen = new Set<string>();

    [...apiItems, ...defaultGroupItems, ...fallbackTemplates].forEach((it) => {
      const area = (it.workArea || "").trim();
      const act = (it.specificActivities || "").trim();
      const key = `${area}|${act}`;
      if (!seen.has(key) && (area || act)) {
        seen.add(key);
        combined.push({ workArea: area, specificActivities: act });
      }
    });

    return combined;
  };

  const availableWpItems = useMemo(() => getAvailableWpItems(modalBarangay), [modalBarangay, wpItemsByBarangay]);
  const availableWpItemsForAssign = useMemo(
    () => getAvailableWpItems(assigningGroup?.barangay || ""),
    [assigningGroup, wpItemsByBarangay]
  );

  // Auto-Split Helpers for Sub-Groups
  const handleSplitSubGroups5050 = () => {
    const pool = modalSelectedPbIds.length > 0 ? modalSelectedPbIds : modalCandidateBeneficiaries.map((pb) => pb.id);
    const mid = Math.ceil(pool.length / 2);
    setSubGroupA((prev) => ({ ...prev, pbIds: pool.slice(0, mid) }));
    setSubGroupB((prev) => ({ ...prev, pbIds: pool.slice(mid) }));
  };

  const handleSplitSubGroupsByGender = () => {
    const pool = modalSelectedPbIds.length > 0 ? modalSelectedPbIds : modalCandidateBeneficiaries.map((pb) => pb.id);
    const objs = modalBarangayBeneficiaries.filter((pb) => pool.includes(pb.id) || pool.includes(pb.beneficiary?.id));
    const maleIds = objs
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        const s = (b.sex || b.gender || "").toUpperCase();
        return s === "MALE" || s === "M";
      })
      .map((pb) => pb.id);
    const femaleIds = objs
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        const s = (b.sex || b.gender || "").toUpperCase();
        return s === "FEMALE" || s === "F";
      })
      .map((pb) => pb.id);

    setSubGroupA((prev) => ({ ...prev, pbIds: maleIds }));
    setSubGroupB((prev) => ({ ...prev, pbIds: femaleIds }));
  };

  const handleSplitSubGroupsByVulnerable = () => {
    const pool = modalSelectedPbIds.length > 0 ? modalSelectedPbIds : modalCandidateBeneficiaries.map((pb) => pb.id);
    const objs = modalBarangayBeneficiaries.filter((pb) => pool.includes(pb.id) || pool.includes(pb.beneficiary?.id));
    const vulnIds = objs.filter((pb) => (pb.beneficiary || pb).isSenior || (pb.beneficiary || pb).isPwd).map((pb) => pb.id);
    const ableIds = objs.filter((pb) => !(pb.beneficiary || pb).isSenior && !(pb.beneficiary || pb).isPwd).map((pb) => pb.id);

    setSubGroupA((prev) => ({ ...prev, pbIds: ableIds }));
    setSubGroupB((prev) => ({ ...prev, pbIds: vulnIds }));
  };

  // Toggle Sub-Group assignment for individual beneficiary
  const setBeneficiarySubGroup = (pbId: string, team: "A" | "B") => {
    if (team === "A") {
      setSubGroupA((prev) => ({ ...prev, pbIds: Array.from(new Set([...prev.pbIds, pbId])) }));
      setSubGroupB((prev) => ({ ...prev, pbIds: prev.pbIds.filter((id) => id !== pbId) }));
    } else {
      setSubGroupB((prev) => ({ ...prev, pbIds: Array.from(new Set([...prev.pbIds, pbId])) }));
      setSubGroupA((prev) => ({ ...prev, pbIds: prev.pbIds.filter((id) => id !== pbId) }));
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = (brgy: string) => {
    const stdBrgy = getStandardBarangayName(brgy);
    const existingGroups = groupedData[stdBrgy]?.groups || [];
    const nextGroupIndex = existingGroups.length + 1;
    const defaultGroupName = `${stdBrgy.toUpperCase()} GROUP ${nextGroupIndex}`;
    const defaultLabel = `${stdBrgy} Group ${nextGroupIndex}`;

    setEditingGroup(null);
    setModalMode("STANDARD");
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

    // Default sub-groups & merge
    setSubGroupTargetDays([1, 2, 3, 4, 5]);
    setSubGroupA({
      name: `${defaultLabel} - Sub-Team A`,
      area: `${stdBrgy} Primary Work Zone`,
      activity: "Canal desiltation and debris clearance",
      pbIds: [],
    });
    setSubGroupB({
      name: `${defaultLabel} - Sub-Team B`,
      area: `${stdBrgy} Secondary Work Zone`,
      activity: "Vegetation trimming, sweeping and tree planting",
      pbIds: [],
    });

    const partner = existingGroups[0];
    setMergeTargetGroup(partner ? partner.groupName : "");
    setMergeTargetDays([6, 7, 8, 9, 10]);
    setMergedGroupLabel(partner ? `${defaultLabel} & ${partner.groupLabel} Joint Taskforce` : `${defaultLabel} Joint Taskforce`);
    setMergedDesignatedArea(partner ? `${stdBrgy} Unified Sector` : `${stdBrgy} Designated Sector`);
    setMergedSpecificActivity(`Joint comprehensive community clean-up and tree planting in Barangay ${stdBrgy}`);

    setIsGroupModalOpen(true);
  };

  // Open Edit Modal for an existing group
  const handleOpenEditModal = (
    brgy: string,
    group: any,
    initialMode: "STANDARD" | "SUB_DIVIDE" | "MERGE_GROUP" = "STANDARD"
  ) => {
    const stdBrgy = getStandardBarangayName(brgy);
    setEditingGroup(group);
    setModalMode(initialMode);
    setModalBarangay(stdBrgy);
    setModalGroupName(group.groupName);
    setModalGroupLabel(group.groupLabel);

    // Initial activity puroks strictly from assigned beneficiaries' actual uploaded sitios or clean covered puroks
    const memberPuroks = Array.from(
      new Set(
        group.beneficiaries
          .map((pb: any) => {
            const b = pb.beneficiary || pb;
            return (b.sitio || "").trim();
          })
          .filter(Boolean)
      )
    );
    const initialActivityPuroks =
      memberPuroks.length > 0
        ? memberPuroks
        : (group.coveredPuroks || []).filter(
            (p: string) =>
              p &&
              !p.toLowerCase().startsWith("group") &&
              !p.toLowerCase().startsWith("grupo") &&
              !p.includes(",") &&
              p.length < 35
          );

    setModalActivityPuroks(initialActivityPuroks as string[]);
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

    // Initialize Sub-Groups
    const mid = Math.ceil(currentMemberIds.length / 2);
    const existingSubA = group.subGroups?.[0];
    const existingSubB = group.subGroups?.[1];

    setSubGroupTargetDays(existingSubA?.targetDays || [1, 2, 3, 4, 5]);
    setSubGroupA({
      name: existingSubA?.subGroupLabel || `${group.groupLabel} - Sub-Team A`,
      area: existingSubA?.designatedArea || `${group.designatedMainArea} (Team A Zone)`,
      activity: existingSubA?.specificActivity || group.specificActivity || "Canal de-clogging and drainage clearance",
      pbIds: existingSubA?.beneficiaryIds?.length ? existingSubA.beneficiaryIds : currentMemberIds.slice(0, mid),
    });
    setSubGroupB({
      name: existingSubB?.subGroupLabel || `${group.groupLabel} - Sub-Team B`,
      area: existingSubB?.designatedArea || `${group.designatedMainArea} (Team B Zone)`,
      activity: existingSubB?.specificActivity || "Roadside brushing, vegetation trimming and sweeping",
      pbIds: existingSubB?.beneficiaryIds?.length ? existingSubB.beneficiaryIds : currentMemberIds.slice(mid),
    });

    // Initialize Merged Group
    const otherGroupsInBrgy = (groupedData[stdBrgy]?.groups || []).filter((g) => g.groupName !== group.groupName);
    const partner = otherGroupsInBrgy[0];
    const existingMerge = group.mergedSchedules?.[0];

    setMergeTargetGroup(existingMerge?.partnerGroupNames?.find((n: string) => n !== group.groupName) || (partner ? partner.groupName : ""));
    setMergeTargetDays(existingMerge?.targetDays || [6, 7, 8, 9, 10]);
    setMergedGroupLabel(
      existingMerge?.mergedGroupLabel ||
        (partner ? `${group.groupLabel} & ${partner.groupLabel} Joint Taskforce` : `${group.groupLabel} Joint Taskforce`)
    );
    setMergedDesignatedArea(
      existingMerge?.designatedArea ||
        (partner ? `${group.designatedMainArea} & ${partner.designatedMainArea}` : group.designatedMainArea)
    );
    setMergedSpecificActivity(
      existingMerge?.specificActivity ||
        `Joint comprehensive community clean-up, massive tree-planting, and environmental rehabilitation in Barangay ${stdBrgy}`
    );

    setIsGroupModalOpen(true);
  };

  // Toggle beneficiary selection in modal
  const toggleSelectBeneficiaryInModal = (pbId: string) => {
    setModalSelectedPbIds((prev) =>
      prev.includes(pbId) ? prev.filter((id) => id !== pbId) : [...prev, pbId]
    );
  };

  // Strategic Quick Allocation Helpers (operating ONLY on available candidate beneficiaries)
  const handleSelectAllInModal = () => {
    const ids = modalCandidateBeneficiaries.map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...ids])));
  };

  const handleSelectMalesOnly = () => {
    const maleIds = modalCandidateBeneficiaries
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        const sex = (b.sex || b.gender || "").toUpperCase();
        return sex === "MALE" || sex === "M";
      })
      .map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...maleIds])));
  };

  const handleSelectFemalesOnly = () => {
    const femaleIds = modalCandidateBeneficiaries
      .filter((pb) => {
        const b = pb.beneficiary || pb;
        const sex = (b.sex || b.gender || "").toUpperCase();
        return sex === "FEMALE" || sex === "F";
      })
      .map((pb) => pb.id);
    setModalSelectedPbIds(Array.from(new Set([...modalSelectedPbIds, ...femaleIds])));
  };

  const handleSelectSeniorsAndPwds = () => {
    const vulnerableIds = modalCandidateBeneficiaries
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
    const purokIds = modalCandidateBeneficiaries
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
      // 1. Compile Purok list strictly from selected puroks or selected beneficiaries' uploaded sitios
      let combinedPuroks = [...modalActivityPuroks];
      if (modalCustomPurokInput.trim()) {
        const extra = modalCustomPurokInput.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
        combinedPuroks = Array.from(new Set([...combinedPuroks, ...extra]));
      }
      if (combinedPuroks.length === 0) {
        // Derive from the selected beneficiaries' actual uploaded sitios
        const selectedObjects = modalBarangayBeneficiaries.filter((pb) =>
          modalSelectedPbIds.includes(pb.id) || modalSelectedPbIds.includes(pb.beneficiary?.id)
        );
        const derivedFromBene = Array.from(
          new Set(
            selectedObjects
              .map((pb) => {
                const b = pb.beneficiary || pb;
                return (b.sitio || "").trim();
              })
              .filter(Boolean)
          )
        );
        if (derivedFromBene.length > 0) {
          combinedPuroks = derivedFromBene;
        } else {
          combinedPuroks = getPuroksInBarangay(stdBrgy);
        }
      }

      // 2. Save Custom Group Definition with Sub-Groups & Merged Schedules
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

      // Handle Sub-Group Configurations
      if (modalMode === "SUB_DIVIDE") {
        const subConfigs: SubGroupScheduleConfig[] = [
          {
            subGroupName: (subGroupA.name.trim() || `${groupDef.groupLabel} - Sub-Team A`).toUpperCase(),
            subGroupLabel: subGroupA.name.trim() || `${groupDef.groupLabel} - Sub-Team A`,
            designatedArea: subGroupA.area.trim() || groupDef.designatedMainArea,
            specificActivity: subGroupA.activity.trim() || modalSpecificActivity.trim(),
            targetDays: subGroupTargetDays,
            beneficiaryIds: subGroupA.pbIds,
            demographics: subGroupADemographics,
          },
          {
            subGroupName: (subGroupB.name.trim() || `${groupDef.groupLabel} - Sub-Team B`).toUpperCase(),
            subGroupLabel: subGroupB.name.trim() || `${groupDef.groupLabel} - Sub-Team B`,
            designatedArea: subGroupB.area.trim() || groupDef.designatedMainArea,
            specificActivity: subGroupB.activity.trim() || modalSpecificActivity.trim(),
            targetDays: subGroupTargetDays,
            beneficiaryIds: subGroupB.pbIds,
            demographics: subGroupBDemographics,
          },
        ];
        groupDef.subGroups = subConfigs;
      } else if (editingGroup?.subGroups) {
        groupDef.subGroups = editingGroup.subGroups;
      }

      // Handle Merged Schedule Configuration
      if (modalMode === "MERGE_GROUP" && mergeTargetGroup) {
        const mergeConfig: MergedGroupScheduleConfig = {
          mergedGroupName: (mergedGroupLabel.trim() || `${groupDef.groupLabel} Joint Taskforce`).toUpperCase(),
          mergedGroupLabel: mergedGroupLabel.trim() || `${groupDef.groupLabel} Joint Taskforce`,
          partnerGroupNames: [groupDef.groupName, mergeTargetGroup],
          designatedArea: mergedDesignatedArea.trim() || groupDef.designatedMainArea,
          specificActivity: mergedSpecificActivity.trim() || modalSpecificActivity.trim(),
          targetDays: mergeTargetDays,
          demographics: mergedGroupDemographics,
        };
        groupDef.mergedSchedules = [mergeConfig];
      } else if (editingGroup?.mergedSchedules) {
        groupDef.mergedSchedules = editingGroup.mergedSchedules;
      }

      const currentForBrgy = customGroups[stdBrgy] || [];
      let updatedCustomForBrgy: PurokSitioGroupDefinition[];

      if (editingGroup && editingGroup.isCustom) {
        updatedCustomForBrgy = currentForBrgy.map((g) =>
          g.groupName === editingGroup.groupName ? groupDef : g
        );
      } else if (!isExistingDefault) {
        updatedCustomForBrgy = [...currentForBrgy.filter((g) => g.groupName !== groupDef.groupName), groupDef];
      } else {
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

      // 4. Auto-Sync to 10-Day TUPAD Work Program Database
      if (modalAutoSyncToWorkProgram && programId) {
        if (modalMode === "SUB_DIVIDE" && groupDef.subGroups) {
          // Sync Sub-Group A
          await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              barangay: stdBrgy,
              groupName: groupDef.subGroups[0].subGroupName,
              groupLabel: groupDef.subGroups[0].subGroupLabel,
              designatedArea: groupDef.subGroups[0].designatedArea,
              specificActivities: groupDef.subGroups[0].specificActivity,
              targetDays: subGroupTargetDays,
              demographics: subGroupADemographics,
            }),
          });

          // Sync Sub-Group B
          await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              barangay: stdBrgy,
              groupName: groupDef.subGroups[1].subGroupName,
              groupLabel: groupDef.subGroups[1].subGroupLabel,
              designatedArea: groupDef.subGroups[1].designatedArea,
              specificActivities: groupDef.subGroups[1].specificActivity,
              targetDays: subGroupTargetDays,
              demographics: subGroupBDemographics,
            }),
          });

          // Sync Main Group for other non-subdivided days
          const remainingDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((d) => !subGroupTargetDays.includes(d));
          if (remainingDays.length > 0) {
            await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                barangay: stdBrgy,
                groupName: groupDef.groupName,
                groupLabel: groupDef.groupLabel,
                designatedArea: groupDef.designatedMainArea,
                specificActivities: groupDef.specificActivity,
                targetDays: remainingDays,
                demographics: modalSelectionDemographics,
              }),
            });
          }
        } else if (modalMode === "MERGE_GROUP" && groupDef.mergedSchedules?.[0]) {
          const m = groupDef.mergedSchedules[0];
          await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              barangay: stdBrgy,
              groupName: m.mergedGroupName,
              groupLabel: m.mergedGroupLabel,
              designatedArea: m.designatedArea,
              specificActivities: m.specificActivity,
              targetDays: mergeTargetDays,
              demographics: mergedGroupDemographics,
            }),
          });

          // Sync individual main group for days outside merge
          const nonMergedDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((d) => !mergeTargetDays.includes(d));
          if (nonMergedDays.length > 0) {
            await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                barangay: stdBrgy,
                groupName: groupDef.groupName,
                groupLabel: groupDef.groupLabel,
                designatedArea: groupDef.designatedMainArea,
                specificActivities: groupDef.specificActivity,
                targetDays: nonMergedDays,
                demographics: modalSelectionDemographics,
              }),
            });
          }
        } else {
          // STANDARD mode
          await fetch(`/api/v1/programs/${programId}/work-program/sync-group`, {
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
        }
      }

      setGlobalBannerMsg(
        `✓ Matagumpay na na-save at nai-sync ang "${groupDef.groupLabel}" (${modalMode === "SUB_DIVIDE" ? "Nahati sa Sub-Teams" : modalMode === "MERGE_GROUP" ? "Nai-merge sa Joint Taskforce" : "Buong Grupo"}) sa TUPAD Work Program!`
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

                        {/* Compute clean actual uploaded Puroks & Sitios */}
                        {(() => {
                          const groupActualPuroks = Array.from(
                            new Set(
                              g.beneficiaries
                                .map((pb: any) => {
                                  const b = pb.beneficiary || pb;
                                  return (b.sitio || "").trim();
                                })
                                .filter(Boolean)
                            )
                          ).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));

                          let displayPuroks: string[] = [];
                          if (groupActualPuroks.length > 0) {
                            displayPuroks = groupActualPuroks;
                          } else if (!g.isCustom) {
                            const bKey = getBarangayKey(brgy.barangay);
                            const defG = DINGALAN_BARANGAY_GROUPINGS[bKey]?.groups.find(
                              (dg) => dg.groupName === g.groupName
                            );
                            displayPuroks = defG ? defG.purokSitios : g.coveredPuroks;
                          } else {
                            displayPuroks = (g.coveredPuroks || []).filter(
                              (p: string) =>
                                p &&
                                !p.toLowerCase().startsWith("group") &&
                                !p.toLowerCase().startsWith("grupo") &&
                                !p.includes(",") &&
                                p.length < 35
                            );
                          }

                          return (
                            <p className="text-xs text-slate-600 font-medium">
                              <span className="font-bold text-slate-800">Sakop na Puroks &amp; Sitios:</span>{" "}
                              {displayPuroks.length > 0 ? (
                                <span>{displayPuroks.join(", ")}</span>
                              ) : (
                                <span className="italic text-slate-400">Direktang Itinalagang mga Benepisyaryo</span>
                              )}
                            </p>
                          );
                        })()}
                        {/* Sub-Group / Merged Badges */}
                        {g.subGroups && g.subGroups.length > 0 && (
                          <div className="flex items-center space-x-1.5 text-[11px] text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 w-fit">
                            <Split className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="font-semibold">
                              Hahatiin sa {g.subGroups.length} Sub-Teams sa Days {g.subGroups[0].targetDays.join(", ")}
                            </span>
                          </div>
                        )}

                        {g.mergedSchedules && g.mergedSchedules.length > 0 && (
                          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
                            <GitMerge className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="font-semibold">
                              Naka-merge bilang &ldquo;{g.mergedSchedules[0].mergedGroupLabel}&rdquo; sa Days {g.mergedSchedules[0].targetDays.join(", ")}
                            </span>
                          </div>
                        )}
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
                              className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                              title="Italaga sa Work Area & Sync sa Work Program"
                            >
                              <MapPin className="w-3.5 h-3.5 text-amber-300" />
                              <span>Italaga</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(brgy.barangay, g, "STANDARD")}
                              className="p-2 text-slate-600 hover:text-blue-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200 cursor-pointer"
                              title="I-edit ang Grupo, Gawain at Roster Allocation"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(brgy.barangay, g, "SUB_DIVIDE")}
                              className="px-2.5 py-2 text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-xl transition border border-indigo-200 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                              title="Hatiin ang grupong ito sa mga Sub-Teams para sa partikular na araw at gawain"
                            >
                              <Split className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hatiin</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(brgy.barangay, g, "MERGE_GROUP")}
                              className="px-2.5 py-2 text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-xl transition border border-emerald-200 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                              title="I-merge o pagsamahin sa ibang grupo para sa pinagsamang joint activity"
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">I-merge</span>
                            </button>

                            {g.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomGroup(brgy.barangay, g.groupName)}
                                className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition border border-slate-200 cursor-pointer"
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

            {/* Modal Mode Navigation Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setModalMode("STANDARD")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  modalMode === "STANDARD"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-300"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Pangunahing Grupo (Standard)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode("SUB_DIVIDE")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  modalMode === "SUB_DIVIDE"
                    ? "bg-white text-indigo-950 shadow-xs border border-indigo-300"
                    : "text-slate-600 hover:text-indigo-900"
                }`}
              >
                <Split className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hatiin sa Sub-Groups (Sub-Divide)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode("MERGE_GROUP")}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  modalMode === "MERGE_GROUP"
                    ? "bg-white text-emerald-950 shadow-xs border border-emerald-300"
                    : "text-slate-600 hover:text-emerald-900"
                }`}
              >
                <GitMerge className="w-3.5 h-3.5 text-emerald-600" />
                <span>I-merge sa Ibang Grupo (Merge)</span>
              </button>
            </div>

            <form onSubmit={handleSaveGroupModal} className="space-y-6 text-xs">
              {/* MODE 1: STANDARD GROUP CONFIGURATION */}
              {modalMode === "STANDARD" && (
                <>
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
                        <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                          <FolderDown className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pumili mula sa Umiiral na TUPAD Work Program:</span>
                        </label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== "") {
                              const item = availableWpItems[parseInt(val, 10)];
                              if (item) {
                                if (item.workArea) setModalDesignatedArea(item.workArea);
                                if (item.specificActivities) setModalSpecificActivity(item.specificActivities);
                              }
                            }
                          }}
                          className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="">-- Piliin ang Aktibidad / Lugar mula sa Work Program --</option>
                          {availableWpItems.map((item, idx) => (
                            <option key={idx} value={idx}>
                              📍 {item.workArea || "Work Area"} — {item.specificActivities.length > 55 ? item.specificActivities.substring(0, 55) + "..." : item.specificActivities}
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
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-1.5">
                          <Users className="w-4 h-4 text-blue-900" />
                          <span>2. Pagtatalaga ng mga Benepisyaryo (Strength, Capacity &amp; Location Strategy)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ang mga nakatalaga na sa ibang grupo ay awtomatikong itinago upang maiwasan ang duplicate allocation.
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Available: <strong>{modalCandidateBeneficiaries.length}</strong> sa {modalBarangayBeneficiaries.length} Tao
                        </span>
                        {assignedInOtherGroupsCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {assignedInOtherGroupsCount} nakatalaga na sa ibang grupo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Strategic Allocation Preset Buttons */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        ⚡ Mabilisang Estratehiya sa Paglalaan ng Manggagawa (Mula sa {modalCandidateBeneficiaries.length} Available):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectMalesOnly}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg border border-blue-200 transition"
                          title="Mabibigat na trabaho gaya ng paghuhukay at de-clogging ng mga kanal"
                        >
                          💪 Heavy Labor (Available na Lalaki: {availableCandidatesDemographics.maleCount})
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectSeniorsAndPwds}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200 transition"
                          title="Magagaang gawain gaya ng community gardening, tree planting, o street sweeping"
                        >
                          🌱 Light Tasks (Available na Seniors &amp; PWDs: {availableCandidatesDemographics.isSeniorCount + availableCandidatesDemographics.isPwdCount})
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectFemalesOnly}
                          className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-900 font-bold rounded-lg border border-pink-200 transition"
                        >
                          👩 Maintenance &amp; Sweeping (Available na Kababaihan: {availableCandidatesDemographics.femaleCount})
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
                          Piliin Lahat ng Available ({modalCandidateBeneficiaries.length})
                        </button>
                        {modalSelectedPbIds.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearBeneficiarySelection}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition"
                          >
                            I-clear ang Napili ({modalSelectedPbIds.length})
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
                              className="font-bold text-amber-900 hover:underline cursor-pointer"
                            >
                              Lahat (10 Araw)
                            </button>
                            <span className="text-amber-300">|</span>
                            <button
                              type="button"
                              onClick={() => setModalTargetDays([1, 2, 3, 4, 5])}
                              className="font-bold text-amber-900 hover:underline cursor-pointer"
                            >
                              Days 1–5
                            </button>
                            <span className="text-amber-300">|</span>
                            <button
                              type="button"
                              onClick={() => setModalTargetDays([6, 7, 8, 9, 10])}
                              className="font-bold text-amber-900 hover:underline cursor-pointer"
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
                </>
              )}

              {/* MODE 2: SUB-GROUP DIVISION (HATIIN SA SUB-GROUPS) */}
              {modalMode === "SUB_DIVIDE" && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Days Selector for Sub-Division */}
                  <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center space-x-1.5">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>1. Piliin ang mga Araw kung Kailan Hahatiin sa Sub-Groups</span>
                        </h4>
                        <p className="text-[11px] text-indigo-800/80 mt-0.5">
                          Sa mga araw na ito, ang {modalGroupLabel || modalGroupName} ay magtatrabaho bilang dalawang magkahiwalay na sub-teams sa magkaibang lugar o gawain.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSubGroupTargetDays([1, 2, 3, 4, 5])}
                          className="font-bold text-indigo-900 hover:underline cursor-pointer"
                        >
                          Days 1–5
                        </button>
                        <span className="text-indigo-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSubGroupTargetDays([6, 7, 8, 9, 10])}
                          className="font-bold text-indigo-900 hover:underline cursor-pointer"
                        >
                          Days 6–10
                        </button>
                        <span className="text-indigo-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSubGroupTargetDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
                          className="font-bold text-indigo-900 hover:underline cursor-pointer"
                        >
                          Lahat (10 Araw)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => {
                        const isSelected = subGroupTargetDays.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setSubGroupTargetDays((prev) =>
                                prev.includes(d) ? prev.filter((day) => day !== d) : [...prev, d].sort((a, b) => a - b)
                              );
                            }}
                            className={`py-1.5 rounded-xl text-center text-xs font-mono font-black transition border cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs scale-105"
                                : "bg-white text-indigo-900 hover:bg-indigo-100 border-indigo-200"
                            }`}
                          >
                            Day {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-Team Quick Split Helpers */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      ⚡ Mabilisang Paghahati ng Manggagawa sa Sub-Team A at Sub-Team B:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={handleSplitSubGroups5050}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold rounded-lg border border-indigo-200 transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Split className="w-3.5 h-3.5 text-indigo-600" />
                        <span>50/50 Pantay na Hatian ({subGroupA.pbIds.length} vs {subGroupB.pbIds.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSplitSubGroupsByGender}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold rounded-lg border border-blue-200 transition cursor-pointer"
                      >
                        💪 Lalaki sa Team A ({subGroupADemographics.maleCount}) vs 👩 Babae sa Team B ({subGroupBDemographics.femaleCount})
                      </button>
                      <button
                        type="button"
                        onClick={handleSplitSubGroupsByVulnerable}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold rounded-lg border border-amber-200 transition cursor-pointer"
                      >
                        🌱 Light Tasks (Seniors/PWDs sa Team B)
                      </button>
                    </div>
                  </div>

                  {/* Side-by-side Sub-Team Configuration Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SUB-TEAM A */}
                    <div className="p-4 bg-white rounded-2xl border-2 border-indigo-300 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-black text-indigo-950 text-xs flex items-center space-x-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">A</span>
                          <span>SUB-TEAM A (UNANG PANGKAT)</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                          {subGroupADemographics.totalCount} Tao
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pangalan ng Sub-Team A</label>
                        <input
                          type="text"
                          required
                          value={subGroupA.name}
                          onChange={(e) => setSubGroupA({ ...subGroupA, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-slate-50"
                        />
                      </div>

                      {/* Dropdown Button for Choosing Work Area or Activity from Existing Work Program */}
                      <div className="bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200 space-y-1">
                        <label className="block text-[10px] font-black text-indigo-950 uppercase flex items-center space-x-1">
                          <FolderDown className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Pumili mula sa Umiiral na TUPAD Work Program:</span>
                        </label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== "") {
                              const item = availableWpItems[parseInt(val, 10)];
                              if (item) {
                                setSubGroupA({
                                  ...subGroupA,
                                  area: item.workArea ? `${item.workArea} (Team A Zone)` : subGroupA.area,
                                  activity: item.specificActivities || subGroupA.activity,
                                });
                              }
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-indigo-300 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                        >
                          <option value="">-- Piliin ang Lugar / Gawain para sa Sub-Team A --</option>
                          {availableWpItems.map((item, idx) => (
                            <option key={idx} value={idx}>
                              📍 {item.workArea || "Work Area"} — {item.specificActivities.length > 50 ? item.specificActivities.substring(0, 50) + "..." : item.specificActivities}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Itinalagang Lugar ng Sub-Team A</label>
                        <input
                          type="text"
                          required
                          value={subGroupA.area}
                          onChange={(e) => setSubGroupA({ ...subGroupA, area: e.target.value })}
                          placeholder="Hal. Line Canals and General Public Area (Team A Zone)"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Partikular na Gawain ng Sub-Team A</label>
                        <textarea
                          rows={2}
                          required
                          value={subGroupA.activity}
                          onChange={(e) => setSubGroupA({ ...subGroupA, activity: e.target.value })}
                          placeholder="Isulat ang aktibidad ng Sub-Team A..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                        />
                      </div>

                      {/* Live Demographic Counters for Sub-Team A */}
                      <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                        <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-200">
                          <span className="block text-blue-700">♂ {subGroupADemographics.maleCount}</span>
                        </div>
                        <div className="bg-pink-50 p-1.5 rounded-lg border border-pink-200">
                          <span className="block text-pink-700">♀ {subGroupADemographics.femaleCount}</span>
                        </div>
                        <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                          <span className="block text-amber-700">SC {subGroupADemographics.isSeniorCount}</span>
                        </div>
                        <div className="bg-purple-50 p-1.5 rounded-lg border border-purple-200">
                          <span className="block text-purple-700">PWD {subGroupADemographics.isPwdCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* SUB-TEAM B */}
                    <div className="p-4 bg-white rounded-2xl border-2 border-teal-300 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-black text-teal-950 text-xs flex items-center space-x-1.5">
                          <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">B</span>
                          <span>SUB-TEAM B (IKALAWANG PANGKAT)</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-100 text-teal-900 border border-teal-200">
                          {subGroupBDemographics.totalCount} Tao
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pangalan ng Sub-Team B</label>
                        <input
                          type="text"
                          required
                          value={subGroupB.name}
                          onChange={(e) => setSubGroupB({ ...subGroupB, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-slate-50"
                        />
                      </div>

                      {/* Dropdown Button for Choosing Work Area or Activity from Existing Work Program */}
                      <div className="bg-teal-50/80 p-2.5 rounded-xl border border-teal-200 space-y-1">
                        <label className="block text-[10px] font-black text-teal-950 uppercase flex items-center space-x-1">
                          <FolderDown className="w-3.5 h-3.5 text-teal-600" />
                          <span>Pumili mula sa Umiiral na TUPAD Work Program:</span>
                        </label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== "") {
                              const item = availableWpItems[parseInt(val, 10)];
                              if (item) {
                                setSubGroupB({
                                  ...subGroupB,
                                  area: item.workArea ? `${item.workArea} (Team B Zone)` : subGroupB.area,
                                  activity: item.specificActivities || subGroupB.activity,
                                });
                              }
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-teal-300 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
                        >
                          <option value="">-- Piliin ang Lugar / Gawain para sa Sub-Team B --</option>
                          {availableWpItems.map((item, idx) => (
                            <option key={idx} value={idx}>
                              📍 {item.workArea || "Work Area"} — {item.specificActivities.length > 50 ? item.specificActivities.substring(0, 50) + "..." : item.specificActivities}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Itinalagang Lugar ng Sub-Team B</label>
                        <input
                          type="text"
                          required
                          value={subGroupB.area}
                          onChange={(e) => setSubGroupB({ ...subGroupB, area: e.target.value })}
                          placeholder="Hal. Line Canals and General Public Area (Team B Zone)"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Partikular na Gawain ng Sub-Team B</label>
                        <textarea
                          rows={2}
                          required
                          value={subGroupB.activity}
                          onChange={(e) => setSubGroupB({ ...subGroupB, activity: e.target.value })}
                          placeholder="Isulat ang aktibidad ng Sub-Team B..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                        />
                      </div>

                      {/* Live Demographic Counters for Sub-Team B */}
                      <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                        <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-200">
                          <span className="block text-blue-700">♂ {subGroupBDemographics.maleCount}</span>
                        </div>
                        <div className="bg-pink-50 p-1.5 rounded-lg border border-pink-200">
                          <span className="block text-pink-700">♀ {subGroupBDemographics.femaleCount}</span>
                        </div>
                        <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                          <span className="block text-amber-700">SC {subGroupBDemographics.isSeniorCount}</span>
                        </div>
                        <div className="bg-purple-50 p-1.5 rounded-lg border border-purple-200">
                          <span className="block text-purple-700">PWD {subGroupBDemographics.isPwdCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Beneficiary Team Assignment Table */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 uppercase text-xs">
                        Indibidwal na Pagtatalaga ng mga Manggagawa sa Sub-Team A o B:
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Nai-assign: {subGroupA.pbIds.length + subGroupB.pbIds.length} sa {modalSelectedPbIds.length} Tao
                      </span>
                    </div>

                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b">
                          <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Pangalan</th>
                            <th className="px-3 py-2">Purok</th>
                            <th className="px-3 py-2 text-center">Kasarian</th>
                            <th className="px-3 py-2 text-center">Itinalagang Sub-Team</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {modalBarangayBeneficiaries
                            .filter((pb) => modalSelectedPbIds.includes(pb.id) || modalSelectedPbIds.includes(pb.beneficiary?.id))
                            .map((pb, idx) => {
                              const b = pb.beneficiary || pb;
                              const isTeamA = subGroupA.pbIds.includes(pb.id);
                              const isTeamB = subGroupB.pbIds.includes(pb.id);

                              return (
                                <tr key={pb.id || idx} className="hover:bg-slate-50">
                                  <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500">{idx + 1}</td>
                                  <td className="px-3 py-1.5 font-bold text-slate-900">{b.fullName || `${b.lastName}, ${b.firstName}`}</td>
                                  <td className="px-3 py-1.5 text-slate-600">{b.sitio || "-"}</td>
                                  <td className="px-3 py-1.5 text-center font-mono font-bold text-[11px]">
                                    {(b.sex || b.gender || "-").toUpperCase()}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => setBeneficiarySubGroup(pb.id, "A")}
                                        className={`px-3 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                          isTeamA ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                                        }`}
                                      >
                                        Team A
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setBeneficiarySubGroup(pb.id, "B")}
                                        className={`px-3 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                          isTeamB ? "bg-teal-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                                        }`}
                                      >
                                        Team B
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 3: MERGE TO OTHER GROUP (PAGSAMAHIN SA IBANG GRUPO) */}
              {modalMode === "MERGE_GROUP" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-300 space-y-4">
                    <h4 className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center space-x-1.5">
                      <GitMerge className="w-4 h-4 text-emerald-700" />
                      <span>1. Pagsamahin (Merge) sa Ibang Umiiral na Grupo sa Barangay {modalBarangay}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">
                          Pumili ng Grupong Pagsasamahan (Partner Group) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={mergeTargetGroup}
                          onChange={(e) => {
                            const pName = e.target.value;
                            setMergeTargetGroup(pName);
                            const pObj = groupedData[getStandardBarangayName(modalBarangay)]?.groups.find((g) => g.groupName === pName);
                            if (pObj) {
                              setMergedGroupLabel(`${modalGroupLabel || modalGroupName} & ${pObj.groupLabel} Joint Taskforce`);
                              setMergedDesignatedArea(`${modalDesignatedArea} & ${pObj.designatedMainArea}`);
                            }
                          }}
                          className="w-full px-3.5 py-2.5 font-bold border border-emerald-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                        >
                          <option value="">-- Pumili ng Partner Group --</option>
                          {(groupedData[getStandardBarangayName(modalBarangay)]?.groups || [])
                            .filter((g) => g.groupName !== modalGroupName)
                            .map((g) => (
                              <option key={g.groupName} value={g.groupName}>
                                {g.groupLabel} ({g.demographics.totalCount} Pax) - {g.designatedMainArea}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">
                          Pangalan ng Pinagsamang Joint Taskforce <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={mergedGroupLabel}
                          onChange={(e) => setMergedGroupLabel(e.target.value)}
                          placeholder="Hal. Uno &amp; DOS Combined Mega Taskforce"
                          className="w-full px-3.5 py-2.5 font-bold border border-emerald-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Target Days for the Merged Joint Taskforce */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-950 uppercase">
                          I-apply ang Pinagsamang Grupo sa mga Sumusunod na Araw:
                        </span>
                        <div className="space-x-2">
                          <button
                            type="button"
                            onClick={() => setMergeTargetDays([6, 7, 8, 9, 10])}
                            className="font-bold text-emerald-900 hover:underline cursor-pointer"
                          >
                            Days 6–10 (Joint Phase)
                          </button>
                          <span className="text-emerald-300">|</span>
                          <button
                            type="button"
                            onClick={() => setMergeTargetDays([1, 2, 3, 4, 5])}
                            className="font-bold text-emerald-900 hover:underline cursor-pointer"
                          >
                            Days 1–5
                          </button>
                          <span className="text-emerald-300">|</span>
                          <button
                            type="button"
                            onClick={() => setMergeTargetDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
                            className="font-bold text-emerald-900 hover:underline cursor-pointer"
                          >
                            Lahat (10 Araw)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => {
                          const isSelected = mergeTargetDays.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                setMergeTargetDays((prev) =>
                                  prev.includes(d) ? prev.filter((day) => day !== d) : [...prev, d].sort((a, b) => a - b)
                                );
                              }}
                              className={`py-1.5 rounded-xl text-center text-xs font-mono font-black transition border cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs scale-105"
                                  : "bg-white text-emerald-900 hover:bg-emerald-100 border-emerald-200"
                              }`}
                            >
                              Day {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dropdown for Choosing Work Area or Activity from Existing Work Program */}
                    <div className="bg-emerald-100/70 p-3 rounded-xl border border-emerald-300 space-y-1.5">
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
                              if (item.workArea) setMergedDesignatedArea(item.workArea);
                              if (item.specificActivities) setMergedSpecificActivity(item.specificActivities);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                      >
                        <option value="">-- Piliin ang Lugar / Gawain mula sa Work Program --</option>
                        {availableWpItems.map((item, idx) => (
                          <option key={idx} value={idx}>
                            📍 {item.workArea || "Work Area"} — {item.specificActivities.length > 60 ? item.specificActivities.substring(0, 60) + "..." : item.specificActivities}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        Pinagsamang Lugar ng Paggawa (Joint Work Area) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={mergedDesignatedArea}
                        onChange={(e) => setMergedDesignatedArea(e.target.value)}
                        placeholder="Hal. Barangay Aplaya Shoreline Buffer &amp; Tree Planting Corridor"
                        className="w-full px-3.5 py-2.5 font-bold border border-emerald-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        Pinagsamang Partikular na Gawain (Joint Specific Activity) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={mergedSpecificActivity}
                        onChange={(e) => setMergedSpecificActivity(e.target.value)}
                        placeholder="Hal. Massive coastal clean-up, mangrove tree planting, and flood mitigation canal clearance..."
                        className="w-full px-3.5 py-2.5 font-medium border border-emerald-300 rounded-xl bg-white text-xs leading-relaxed"
                      />
                    </div>

                    {/* Combined Demographic Summary Box */}
                    <div className="p-3.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-2xl shadow-sm space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-800 pb-2">
                        <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <Combine className="w-4 h-4 text-emerald-400" />
                          <span>Pinagsamang Lakas-Paggawa (Combined Demographic Quota):</span>
                        </span>
                        <span className="px-3 py-0.5 rounded-full font-mono font-black text-xs bg-emerald-400 text-slate-950">
                          Total: {mergedGroupDemographics.totalCount} Benepisyaryo
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
                        <div className="bg-white/10 p-2 rounded-xl">
                          <span className="text-slate-400 text-[10px] block uppercase">♂ Lalaki</span>
                          <strong className="text-blue-300 text-sm">{mergedGroupDemographics.maleCount}</strong>
                        </div>
                        <div className="bg-white/10 p-2 rounded-xl">
                          <span className="text-slate-400 text-[10px] block uppercase">♀ Babae</span>
                          <strong className="text-pink-300 text-sm">{mergedGroupDemographics.femaleCount}</strong>
                        </div>
                        <div className="bg-white/10 p-2 rounded-xl">
                          <span className="text-slate-400 text-[10px] block uppercase">Senior</span>
                          <strong className="text-amber-300 text-sm">{mergedGroupDemographics.isSeniorCount}</strong>
                        </div>
                        <div className="bg-white/10 p-2 rounded-xl">
                          <span className="text-slate-400 text-[10px] block uppercase">PWD</span>
                          <strong className="text-purple-300 text-sm">{mergedGroupDemographics.isPwdCount}</strong>
                        </div>
                        <div className="bg-white/10 p-2 rounded-xl col-span-2 sm:col-span-1">
                          <span className="text-slate-400 text-[10px] block uppercase">IP Katutubo</span>
                          <strong className="text-emerald-300 text-sm">{mergedGroupDemographics.isIpCount}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition cursor-pointer"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup || (modalMode === "STANDARD" && modalSelectedPbIds.length === 0)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingGroup ? (
                    <span>Isinasaayos at Inia-update sa Database...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {modalMode === "SUB_DIVIDE"
                          ? "I-save ang Sub-Groups & I-sync sa Work Program"
                          : modalMode === "MERGE_GROUP"
                          ? "I-save ang Merged Taskforce & I-sync sa Work Program"
                          : editingGroup
                          ? "I-update ang Grupo at Work Program"
                          : "I-save ang Grupo at I-sync sa Work Program"}
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
              {/* Dropdown for existing TUPAD Work Program */}
              <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 space-y-1.5">
                <label className="block text-[10px] font-black text-blue-950 uppercase flex items-center space-x-1">
                  <FolderDown className="w-3.5 h-3.5 text-blue-700" />
                  <span>Pumili mula sa Umiiral na TUPAD Work Program:</span>
                </label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "") {
                      const item = availableWpItemsForAssign[parseInt(val, 10)];
                      if (item) {
                        if (item.workArea) setAssignAreaName(item.workArea);
                        if (item.specificActivities) setAssignSpecificActivity(item.specificActivities);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-900 cursor-pointer"
                >
                  <option value="">-- Piliin ang Umiiral na Lugar at Gawain --</option>
                  {availableWpItemsForAssign.map((item, idx) => (
                    <option key={idx} value={idx}>
                      📍 {item.workArea || "Work Area"} — {item.specificActivities.length > 60 ? item.specificActivities.substring(0, 60) + "..." : item.specificActivities}
                    </option>
                  ))}
                </select>
              </div>

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
