"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  X,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Layers,
  Search,
  Check,
  Edit3,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Compass,
  FolderKanban,
  Building2,
} from "lucide-react";
import { DINGALAN_BARANGAYS, normalizeBarangayName, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";
import {
  DINGALAN_BARANGAY_COORDS,
  detectPhotoStage,
  renderGeotaggedPhotoDataUrl,
  stripStagePrefix,
  type PhotoStage,
} from "@/lib/geotag-canvas";
import {
  AccomplishmentExcelPreviewEditor,
  cleanAccomplishmentDayText,
  type PreviewBarangayDoc,
  type PreviewLayoutConfig,
} from "@/components/reports/AccomplishmentExcelPreviewEditor";

interface ProgramSummary {
  id: string;
  programCode: string;
  programName: string;
  batchNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  requiredWorkDays?: number;
  status?: string;
}

interface WorkProgramItemData {
  id: string;
  dayNumber: number;
  specificActivities: string;
  area: string;
}

interface WorkProgramData {
  id: string;
  barangay: string;
  items: WorkProgramItemData[];
}

interface PhotoRecord {
  id: string;
  programId: string;
  workDayId: string | null;
  workProgramItemId: string | null;
  barangay: string | null;
  sitio: string | null;
  workArea: string | null;
  specificActivity: string | null;
  fileName: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
  uploadedAt: string;
  status: string;
  isPurged: boolean;
  rejectionReason?: string | null;
  imageUrl: string;
  program?: {
    id: string;
    programCode: string;
    programName: string;
    batchNumber?: string | null;
  } | null;
  workDay?: {
    id: string;
    dayNumber: number;
    workDate: string;
  } | null;
  workProgramItem?: {
    id: string;
    dayNumber: number;
    specificActivities: string;
    area: string;
  } | null;
  uploadedBy?: { fullName: string } | null;
}

interface SelectedSlotEntry {
  photoId: string;
  targetBarangay: string;
  targetDayNumber: number;
  stage: PhotoStage;
  customCaption?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  programs: ProgramSummary[];
  initialProgramId: string;
}

function toLocalDatetimeInput(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AccomplishmentReportBuilderModal({
  isOpen,
  onClose,
  programs,
  initialProgramId,
}: Props) {
  const { user, can } = useAuth();
  const canEditStatus = isAdminUser(user) || can("photo.approve");

  // 1. Target TUPAD Work Program, Step Switcher & Barangay Scope State
  const [builderStep, setBuilderStep] = useState<"photos" | "preview">("photos");
  const [targetProgramId, setTargetProgramId] = useState<string>(initialProgramId || programs[0]?.id || "");
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>([...DINGALAN_BARANGAYS]);
  const [activeBarangay, setActiveBarangay] = useState<string>(DINGALAN_BARANGAYS[0]);
  const [includeGeotagInCaption, setIncludeGeotagInCaption] = useState<boolean>(true);

  // Editable Excel Document Preview State (Texts & Layout per Barangay)
  const [previewDocs, setPreviewDocs] = useState<Record<string, PreviewBarangayDoc>>({});
  const [defaultPreviewDocs, setDefaultPreviewDocs] = useState<Record<string, PreviewBarangayDoc>>({});
  const [workDayDates, setWorkDayDates] = useState<Map<number, string>>(new Map());
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [layoutConfig, setLayoutConfig] = useState<PreviewLayoutConfig>({
    colCWidth: 68,
    textAlign: "left",
    photoLayout: "3-col",
    photoSize: "medium",
    photoFitMode: "fill",
    includeEmptyDays: true,
  });

  // 2. Loaded Data
  const [allPhotos, setAllPhotos] = useState<PhotoRecord[]>([]);
  const [photosLoading, setPhotosLoading] = useState<boolean>(false);
  const [targetWorkPrograms, setTargetWorkPrograms] = useState<WorkProgramData[]>([]);
  const [workProgramLoading, setWorkProgramLoading] = useState<boolean>(false);

  // 3. Curated Selection Map: Record<CanonicalBarangay, SelectedSlotEntry[]>
  const [selectedByBarangay, setSelectedByBarangay] = useState<Record<string, SelectedSlotEntry[]>>({});

  // 4. Cross-Program Photo Browser Filters
  const [sourceProgramFilter, setSourceProgramFilter] = useState<string>("ALL");
  const [sourceBarangayFilter, setSourceBarangayFilter] = useState<string>("ACTIVE"); // "ACTIVE" | "ALL" | barangay name
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleLimit, setVisibleLimit] = useState<number>(36);

  // 5. Permanent Photo Geotag & Status Editor State
  const [editingPhoto, setEditingPhoto] = useState<PhotoRecord | null>(null);
  const [editStatus, setEditStatus] = useState<string>("APPROVED");
  const [editRejectionReason, setEditRejectionReason] = useState<string>("");
  const [editStage, setEditStage] = useState<PhotoStage>("DURING");
  const [editBarangay, setEditBarangay] = useState<string>("Aplaya");
  const [editSitio, setEditSitio] = useState<string>("");
  const [editWorkDayNumber, setEditWorkDayNumber] = useState<number>(1);
  const [editWorkProgramItemId, setEditWorkProgramItemId] = useState<string>("");
  const [editWorkArea, setEditWorkArea] = useState<string>("");
  const [editSpecificActivity, setEditSpecificActivity] = useState<string>("");
  const [editLatitude, setEditLatitude] = useState<string>("15.3941");
  const [editLongitude, setEditLongitude] = useState<string>("121.3965");
  const [editCapturedAt, setEditCapturedAt] = useState<string>("");
  const [editDocumentedBy, setEditDocumentedBy] = useState<string>("");
  const [editReassignProgram, setEditReassignProgram] = useState<boolean>(false);
  const [editRestampImage, setEditRestampImage] = useState<boolean>(true);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [editRenderingPreview, setEditRenderingPreview] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Lightbox preview & Export state
  const [zoomPhoto, setZoomPhoto] = useState<PhotoRecord | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 5000);
  };

  useEffect(() => {
    if (isOpen && initialProgramId) {
      setTargetProgramId(initialProgramId);
    }
  }, [isOpen, initialProgramId]);

  const photoMap = useMemo(() => {
    const map = new Map<string, PhotoRecord>();
    for (const p of allPhotos) map.set(p.id, p);
    return map;
  }, [allPhotos]);

  const targetProgram = useMemo(
    () => programs.find((p) => p.id === targetProgramId) || null,
    [programs, targetProgramId]
  );

  // Build default selection from photos belonging to targetProgramId
  const buildDefaultSelection = useCallback(
    (photos: PhotoRecord[], progId: string): Record<string, SelectedSlotEntry[]> => {
      const stageOrder: Record<PhotoStage, number> = { BEFORE: 0, DURING: 1, AFTER: 2 };
      const byBrgy: Record<string, SelectedSlotEntry[]> = {};
      for (const b of DINGALAN_BARANGAYS) byBrgy[b] = [];

      const matching = photos
        .filter((p) => {
          if (p.programId !== progId) return false;
          return p.status !== "REJECTED";
        })
        .sort((a, b) => {
          const dayA = a.workDay?.dayNumber ?? a.workProgramItem?.dayNumber ?? 99;
          const dayB = b.workDay?.dayNumber ?? b.workProgramItem?.dayNumber ?? 99;
          if (dayA !== dayB) return dayA - dayB;
          const stA = stageOrder[detectPhotoStage(a.specificActivity)];
          const stB = stageOrder[detectPhotoStage(b.specificActivity)];
          if (stA !== stB) return stA - stB;
          return new Date(a.capturedAt || a.uploadedAt).getTime() - new Date(b.capturedAt || b.uploadedAt).getTime();
        });

      for (const p of matching) {
        const brgy = normalizeBarangayName(p.barangay || "Paltic");
        if (!byBrgy[brgy]) byBrgy[brgy] = [];
        byBrgy[brgy].push({
          photoId: p.id,
          targetBarangay: brgy,
          targetDayNumber: p.workDay?.dayNumber ?? p.workProgramItem?.dayNumber ?? 1,
          stage: detectPhotoStage(p.specificActivity),
        });
      }
      return byBrgy;
    },
    []
  );

  // Fetch ALL cross-program photos when modal opens
  const fetchAllPhotos = useCallback(async (seedTargetProgramId?: string) => {
    setPhotosLoading(true);
    try {
      const res = await fetch("/api/v1/photos?programId=ALL", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load uploaded accomplishment photos.");
      const data = await res.json();
      const fetched: PhotoRecord[] = data.photos || [];
      setAllPhotos(fetched);
      if (seedTargetProgramId) {
        setSelectedByBarangay(buildDefaultSelection(fetched, seedTargetProgramId));
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to load photos.");
    } finally {
      setPhotosLoading(false);
    }
  }, [buildDefaultSelection]);

  // Fetch target program's 11-barangay TUPAD work plans
  const fetchTargetWorkPrograms = useCallback(async (progId: string) => {
    if (!progId) return;
    setWorkProgramLoading(true);
    try {
      const res = await fetch(`/api/v1/programs/${encodeURIComponent(progId)}/work-program`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setTargetWorkPrograms(data.workPrograms || []);
      } else {
        setTargetWorkPrograms([]);
      }
    } catch {
      setTargetWorkPrograms([]);
    } finally {
      setWorkProgramLoading(false);
    }
  }, []);

  // Fetch editable Excel preview data (headers, beneficiary counts, Day 1-10 accomplishment texts)
  const fetchAccomplishmentPreview = useCallback(async (progId: string) => {
    if (!progId) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/v1/reports/accomplishment-preview?programId=${encodeURIComponent(progId)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const docs: Record<string, PreviewBarangayDoc> = data.barangays || {};
        setDefaultPreviewDocs(docs);
        setPreviewDocs(JSON.parse(JSON.stringify(docs)));
        const wdMap = new Map<number, string>();
        for (const wd of data.program?.workDays || []) {
          wdMap.set(wd.dayNumber, wd.workDate);
        }
        setWorkDayDates(wdMap);
      }
    } catch (err) {
      console.error("Failed to fetch accomplishment preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchAllPhotos(targetProgramId);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen || !targetProgramId) return;
    fetchTargetWorkPrograms(targetProgramId);
    fetchAccomplishmentPreview(targetProgramId);
    if (allPhotos.length > 0) {
      setSelectedByBarangay(buildDefaultSelection(allPhotos, targetProgramId));
    }
  }, [targetProgramId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active barangay's TUPAD Work Program items (Day 1–10)
  const activeBarangayWorkItems = useMemo(() => {
    const plan = targetWorkPrograms.find(
      (wp) => normalizeBarangayName(wp.barangay) === normalizeBarangayName(activeBarangay)
    );
    return plan?.items || [];
  }, [targetWorkPrograms, activeBarangay]);

  // Edit modal's selected barangay work items (from target program)
  const editBarangayWorkItems = useMemo(() => {
    const plan = targetWorkPrograms.find(
      (wp) => normalizeBarangayName(wp.barangay) === normalizeBarangayName(editBarangay)
    );
    return plan?.items || [];
  }, [targetWorkPrograms, editBarangay]);

  // Selected IDs lookup for active barangay
  const activeSelectedEntries = useMemo(
    () => selectedByBarangay[activeBarangay] || [],
    [selectedByBarangay, activeBarangay]
  );

  const activeSelectedIdSet = useMemo(
    () => new Set(activeSelectedEntries.map((e) => e.photoId)),
    [activeSelectedEntries]
  );

  // Total selected across selected barangays
  const totalSelectedForExport = useMemo(() => {
    return selectedBarangays.reduce((sum, b) => sum + (selectedByBarangay[b]?.length || 0), 0);
  }, [selectedBarangays, selectedByBarangay]);

  // Filtered cross-program photos for the browser grid
  const filteredPhotos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPhotos.filter((p) => {
      if (sourceProgramFilter === "TARGET" && p.programId !== targetProgramId) return false;
      if (sourceProgramFilter !== "ALL" && sourceProgramFilter !== "TARGET" && p.programId !== sourceProgramFilter) {
        return false;
      }

      const normBrgy = normalizeBarangayName(p.barangay || "");
      if (sourceBarangayFilter === "ACTIVE" && normBrgy !== activeBarangay) return false;
      if (sourceBarangayFilter !== "ALL" && sourceBarangayFilter !== "ACTIVE" && normBrgy !== sourceBarangayFilter) {
        return false;
      }

      if (dayFilter !== "ALL") {
        const dNum = p.workDay?.dayNumber ?? p.workProgramItem?.dayNumber ?? 0;
        if (String(dNum) !== dayFilter) return false;
      }

      if (stageFilter !== "ALL") {
        if (detectPhotoStage(p.specificActivity) !== stageFilter) return false;
      }

      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

      if (q) {
        const hay = [
          p.specificActivity,
          p.workArea,
          p.sitio,
          p.barangay,
          p.program?.programCode,
          p.program?.programName,
          p.uploadedBy?.fullName,
          p.fileName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    allPhotos,
    sourceProgramFilter,
    targetProgramId,
    sourceBarangayFilter,
    activeBarangay,
    dayFilter,
    stageFilter,
    statusFilter,
    searchQuery,
  ]);

  useEffect(() => {
    setVisibleLimit(36);
  }, [sourceProgramFilter, sourceBarangayFilter, activeBarangay, dayFilter, stageFilter, statusFilter, searchQuery]);

  // Toggle barangay inclusion in Excel workbook
  const toggleBarangayIncluded = (brgy: string) => {
    setSelectedBarangays((prev) =>
      prev.includes(brgy) ? prev.filter((b) => b !== brgy) : [...prev, brgy]
    );
  };

  // Toggle photo inclusion in active barangay's Excel sheet
  const togglePhotoForActiveBarangay = (photo: PhotoRecord) => {
    setSelectedByBarangay((prev) => {
      const current = prev[activeBarangay] || [];
      const exists = current.some((e) => e.photoId === photo.id);
      if (exists) {
        return { ...prev, [activeBarangay]: current.filter((e) => e.photoId !== photo.id) };
      }
      const nextEntry: SelectedSlotEntry = {
        photoId: photo.id,
        targetBarangay: activeBarangay,
        targetDayNumber:
          dayFilter !== "ALL"
            ? Number(dayFilter)
            : photo.workDay?.dayNumber ?? photo.workProgramItem?.dayNumber ?? 1,
        stage: detectPhotoStage(photo.specificActivity),
      };
      return { ...prev, [activeBarangay]: [...current, nextEntry] };
    });

    // Ensure active barangay is checked for export when user adds a photo to it
    if (!selectedBarangays.includes(activeBarangay)) {
      setSelectedBarangays((prev) => [...prev, activeBarangay]);
    }
  };

  const updateQueueSlot = (
    photoId: string,
    patch: Partial<Pick<SelectedSlotEntry, "targetDayNumber" | "stage" | "customCaption">>
  ) => {
    setSelectedByBarangay((prev) => ({
      ...prev,
      [activeBarangay]: (prev[activeBarangay] || []).map((entry) =>
        entry.photoId === photoId ? { ...entry, ...patch } : entry
      ),
    }));
  };

  const reorderQueueSlots = (fromIndex: number, toIndex: number) => {
    setSelectedByBarangay((prev) => {
      const list = [...(prev[activeBarangay] || [])];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return prev;
      }
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, [activeBarangay]: list };
    });
  };

  const moveQueueItem = (index: number, direction: -1 | 1) => {
    reorderQueueSlots(index, index + direction);
  };

  const sortActiveSlotsAuto = () => {
    const stageOrder: Record<PhotoStage, number> = { BEFORE: 0, DURING: 1, AFTER: 2 };
    setSelectedByBarangay((prev) => {
      const sorted = [...(prev[activeBarangay] || [])].sort((a, b) => {
        if (a.targetDayNumber !== b.targetDayNumber) return a.targetDayNumber - b.targetDayNumber;
        return stageOrder[a.stage] - stageOrder[b.stage];
      });
      return { ...prev, [activeBarangay]: sorted };
    });
    showFeedback("success", `Sorted ${activeBarangay} photos by Day → Before / During / After.`);
  };

  const removeQueueItem = (photoId: string) => {
    setSelectedByBarangay((prev) => ({
      ...prev,
      [activeBarangay]: (prev[activeBarangay] || []).filter((e) => e.photoId !== photoId),
    }));
  };

  // Quick 1-click Approve / Reject directly from card
  const handleQuickStatusChange = async (photo: PhotoRecord, newStatus: "APPROVED" | "FOR_REVIEW" | "REJECTED") => {
    if (!canEditStatus) return;
    try {
      const res = await fetch("/api/v1/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update photo status.");
      setAllPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, ...data.photo } : p)));
      showFeedback("success", `Photo status permanently updated to ${newStatus}.`);
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to update status.");
    }
  };

  // Open Permanent Geotag & Status Editor
  const openPhotoEditor = (photo: PhotoRecord) => {
    const detectedStage = detectPhotoStage(photo.specificActivity);
    const normBrgy = normalizeBarangayName(photo.barangay || activeBarangay);
    const detectedDay = photo.workDay?.dayNumber ?? photo.workProgramItem?.dayNumber ?? 1;

    setEditingPhoto(photo);
    setEditStatus(photo.status || "FOR_REVIEW");
    setEditRejectionReason(photo.rejectionReason || "");
    setEditStage(detectedStage);
    setEditBarangay(normBrgy);
    setEditSitio(photo.sitio || "");
    setEditWorkDayNumber(detectedDay);
    setEditWorkProgramItemId(photo.workProgramItemId || "");
    setEditWorkArea(photo.workArea || "");
    setEditSpecificActivity(stripStagePrefix(photo.specificActivity));
    setEditLatitude(
      typeof photo.latitude === "number" && Number.isFinite(photo.latitude)
        ? photo.latitude.toFixed(5)
        : String(DINGALAN_BARANGAY_COORDS[normBrgy]?.lat ?? 15.3941)
    );
    setEditLongitude(
      typeof photo.longitude === "number" && Number.isFinite(photo.longitude)
        ? photo.longitude.toFixed(5)
        : String(DINGALAN_BARANGAY_COORDS[normBrgy]?.lng ?? 121.3965)
    );
    setEditCapturedAt(toLocalDatetimeInput(photo.capturedAt || photo.uploadedAt));
    setEditDocumentedBy(photo.uploadedBy?.fullName || user?.fullName || "Field Coordinator");
    setEditReassignProgram(false);
    setEditRestampImage(true);
    setEditPreviewUrl(null);
  };

  const handleSelectWorkProgramItemInEditor = (itemId: string) => {
    setEditWorkProgramItemId(itemId);
    const matched = editBarangayWorkItems.find((i) => i.id === itemId);
    if (matched) {
      setEditWorkDayNumber(matched.dayNumber);
      setEditWorkArea(matched.area);
      setEditSpecificActivity(matched.specificActivities);
    }
  };

  const handleGenerateStampPreview = async () => {
    if (!editingPhoto) return;
    setEditRenderingPreview(true);
    try {
      const rendered = await renderGeotaggedPhotoDataUrl(editingPhoto.imageUrl, {
        stage: editStage,
        dayNumber: editWorkDayNumber,
        barangay: editBarangay,
        workArea: editWorkArea || editSitio || editBarangay,
        specificActivity: editSpecificActivity,
        latitude: Number(editLatitude),
        longitude: Number(editLongitude),
        capturedAt: editCapturedAt ? new Date(editCapturedAt) : new Date(),
        documentedBy: editDocumentedBy,
      });
      setEditPreviewUrl(rendered);
    } catch (err: any) {
      showFeedback("error", err?.message || "Could not render geotag preview.");
    } finally {
      setEditRenderingPreview(false);
    }
  };

  // Save permanent geotagging, status, work program item, and optional re-stamped image to DB
  const handleSavePermanentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    const lat = Number(editLatitude);
    const lng = Number(editLongitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      showFeedback("error", "Latitude must be a valid number between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      showFeedback("error", "Longitude must be a valid number between -180 and 180.");
      return;
    }

    setSavingEdit(true);
    try {
      let restampedDataUrl: string | undefined;
      if (editRestampImage) {
        restampedDataUrl = await renderGeotaggedPhotoDataUrl(editingPhoto.imageUrl, {
          stage: editStage,
          dayNumber: editWorkDayNumber,
          barangay: editBarangay,
          workArea: editWorkArea || editSitio || editBarangay,
          specificActivity: editSpecificActivity,
          latitude: lat,
          longitude: lng,
          capturedAt: editCapturedAt ? new Date(editCapturedAt) : new Date(),
          documentedBy: editDocumentedBy,
        });
      }

      const payload: Record<string, any> = {
        id: editingPhoto.id,
        photoStage: editStage,
        specificActivity: editSpecificActivity,
        barangay: editBarangay,
        sitio: editSitio,
        workArea: editWorkArea,
        workDayNumber: editWorkDayNumber,
        workProgramItemId: editWorkProgramItemId || null,
        latitude: lat,
        longitude: lng,
        capturedAt: editCapturedAt ? new Date(editCapturedAt).toISOString() : null,
      };

      if (canEditStatus) {
        payload.status = editStatus;
        payload.rejectionReason = editStatus === "REJECTED" ? editRejectionReason : null;
      }
      if (editReassignProgram && targetProgramId) {
        payload.programId = targetProgramId;
      }
      if (restampedDataUrl) {
        payload.photoData = restampedDataUrl;
      }

      const res = await fetch("/api/v1/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save photo edits.");

      const updated: PhotoRecord = data.photo;
      setAllPhotos((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));

      // Also sync stage & day number in any selected queue entries referencing this photo
      setSelectedByBarangay((prev) => {
        const next: Record<string, SelectedSlotEntry[]> = {};
        for (const [brgy, entries] of Object.entries(prev)) {
          next[brgy] = entries.map((entry) =>
            entry.photoId === updated.id
              ? { ...entry, stage: editStage, targetDayNumber: editWorkDayNumber }
              : entry
          );
        }
        return next;
      });

      setEditingPhoto(null);
      setEditPreviewUrl(null);
      showFeedback(
        "success",
        editRestampImage
          ? "Photo geotagging, status, and visual stamp permanently saved to database."
          : "Photo geotagging and status permanently saved to database."
      );
    } catch (err: any) {
      showFeedback("error", err?.message || "Error saving photo changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Export customized Accomplishment Report (.XLSX) via POST /api/v1/reports/export
  const handleExportExcel = async () => {
    if (!targetProgramId) {
      showFeedback("error", "Please select a target TUPAD Work Program.");
      return;
    }
    if (selectedBarangays.length === 0) {
      showFeedback("error", "Please select at least one barangay to include in the Excel report.");
      return;
    }

    setExporting(true);
    try {
      const selectedPhotosPayload = selectedBarangays.flatMap((brgy) =>
        (selectedByBarangay[brgy] || []).map((slot) => {
          const p = photoMap.get(slot.photoId);
          return {
            photoId: slot.photoId,
            targetBarangay: brgy,
            targetDayNumber: slot.targetDayNumber,
            stage: slot.stage,
            workArea: p?.workArea ?? null,
            specificActivity: p?.specificActivity ?? null,
            latitude: p?.latitude ?? null,
            longitude: p?.longitude ?? null,
            capturedAt: p?.capturedAt ?? null,
            includeGeotagInCaption,
            customCaption: slot.customCaption,
          };
        })
      );

      const barangayEditsPayload: Record<string, any> = {};
      for (const brgy of selectedBarangays) {
        const doc = previewDocs[brgy];
        if (doc) {
          barangayEditsPayload[brgy] = {
            barangayHeader: doc.barangayHeader,
            doleOffice: doc.doleOffice,
            projectLocation: doc.projectLocation,
            beneficiaryCount: doc.beneficiaryCount,
            periodOfWork: doc.periodOfWork,
            issuedLine: doc.issuedLine,
            signatoryName: doc.signatoryName,
            signatoryTitle: doc.signatoryTitle,
            days: doc.days.map((d) => ({ dayNumber: d.dayNumber, label: d.label, text: d.text })),
          };
        }
      }

      const res = await fetch("/api/v1/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ACCOMPLISHMENT",
          programId: targetProgramId,
          selectedBarangays,
          selectedPhotos: selectedPhotosPayload,
          barangayEdits: barangayEditsPayload,
          layout: layoutConfig,
        }),
      });

      if (!res.ok) {
        let errText = `Export failed (HTTP ${res.status})`;
        try {
          const json = await res.json();
          if (json?.error) errText = json.error;
        } catch {}
        throw new Error(errText);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const nameMatch = disposition.match(/filename="([^"]+)"/i);
      const fileName =
        nameMatch?.[1] ||
        `TUPAD_Accomplishment_Report_${(targetProgram?.programCode || "Dingalan").replace(/[^A-Za-z0-9_-]/g, "_")}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);

      showFeedback(
        "success",
        `Exported ${fileName} (${selectedBarangays.length} barangay sheet${selectedBarangays.length === 1 ? "" : "s"}, ${selectedPhotosPayload.length} photo${selectedPhotosPayload.length === 1 ? "" : "s"}).`
      );
    } catch (err: any) {
      showFeedback("error", err?.message || "Failed to generate Excel workbook.");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-slate-50 border border-slate-300 rounded-2xl w-full max-w-[1440px] h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 1. Dark High-Contrast Header with Target Work Program Selection */}
        <div className="bg-gradient-to-r from-gov-dark via-slate-900 to-blue-950 text-white px-5 py-4 border-b border-gov-gold/40 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gov-gold/20 border border-gov-gold/40 text-gov-gold flex items-center justify-center shrink-0">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gov-gold text-gov-dark font-mono">
                    ACCOMPLISHMENT REPORT STUDIO
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Cross-Program Photo Selection
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                  Configure Accomplishment Report, Barangays &amp; Geotagged Photos (.XLSX)
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Target Work Program Selector */}
              <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gov-goldLight whitespace-nowrap">
                  Target Work Program:
                </span>
                <select
                  value={targetProgramId}
                  onChange={(e) => setTargetProgramId(e.target.value)}
                  className="bg-slate-900 text-white text-xs font-bold border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-gov-gold max-w-[260px]"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.programCode} — {p.programName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || selectedBarangays.length === 0 || !targetProgramId}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                {exporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  {exporting
                    ? "Generating Excel..."
                    : `Export Excel (${selectedBarangays.length} Brgy · ${totalSelectedForExport} Photos)`}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Step Switcher Bar: Step 1 (Select Photos & Barangays) vs Step 2 (Edit Texts & Arrange Photos Preview) */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex bg-slate-950/70 p-1 rounded-xl border border-slate-700/80 gap-1">
              <button
                type="button"
                onClick={() => setBuilderStep("photos")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  builderStep === "photos"
                    ? "bg-gov-gold text-gov-dark shadow"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>1. Choose Photos &amp; Geotags</span>
              </button>
              <button
                type="button"
                onClick={() => setBuilderStep("preview")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  builderStep === "preview"
                    ? "bg-gov-gold text-gov-dark shadow"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>2. Preview &amp; Arrange Excel (Texts &amp; Photos)</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-300 hidden md:block">
              {builderStep === "photos"
                ? "Pick photos across any work program, then open Step 2 to edit texts, captions, and photo arrangement before downloading."
                : "Edit accomplishment texts, header details, captions, column width, and drag-and-drop photo order — your exact arrangement downloads to Excel."}
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-3 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200"
                  : "bg-rose-500/20 border border-rose-400/40 text-rose-200"
              }`}
            >
              <span className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                {feedback.text}
              </span>
              <button type="button" onClick={() => setFeedback(null)} className="opacity-75 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 2. Barangay Scope Bar (Select Which Barangay Sheets to Export + Switch Active Sheet) */}
        <div className="bg-white border-b border-slate-200 px-5 py-3 shrink-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
              <Building2 className="w-4 h-4 text-gov-blue" />
              <span>Barangays Included in Excel Output ({selectedBarangays.length} / 11):</span>
              <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                Check/uncheck barangays to export; click a barangay name to choose its photos.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGeotagInCaption}
                  onChange={(e) => setIncludeGeotagInCaption(e.target.checked)}
                  className="rounded border-slate-300 text-gov-blue focus:ring-gov-blue"
                />
                <span>Include GPS &amp; Date in Excel Captions</span>
              </label>
              <button
                type="button"
                onClick={() => setSelectedBarangays([...DINGALAN_BARANGAYS])}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                Select All 11
              </button>
              <button
                type="button"
                onClick={() => {
                  const withPhotos = DINGALAN_BARANGAYS.filter((b) => (selectedByBarangay[b]?.length || 0) > 0);
                  setSelectedBarangays(withPhotos.length > 0 ? [...withPhotos] : [activeBarangay]);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-gov-blue border border-blue-200 transition"
              >
                Only With Photos
              </button>
              <button
                type="button"
                onClick={() => setSelectedBarangays([activeBarangay])}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
              >
                Only {activeBarangay}
              </button>
              <button
                type="button"
                onClick={() => setSelectedBarangays([])}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DINGALAN_BARANGAYS.map((brgy) => {
              const isIncluded = selectedBarangays.includes(brgy);
              const isActive = activeBarangay === brgy;
              const count = selectedByBarangay[brgy]?.length || 0;
              return (
                <div
                  key={brgy}
                  className={`inline-flex items-center rounded-xl border text-xs transition overflow-hidden ${
                    isActive
                      ? "border-gov-blue bg-gov-blue text-white shadow-sm ring-2 ring-gov-blue/25"
                      : isIncluded
                        ? "border-emerald-300 bg-emerald-50/70 text-slate-800 hover:border-gov-blue"
                        : "border-slate-200 bg-slate-100 text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <label
                    className={`pl-2 pr-1 py-1.5 flex items-center cursor-pointer ${
                      isActive ? "hover:bg-white/10" : "hover:bg-black/5"
                    }`}
                    title={isIncluded ? `Exclude ${brgy} from Excel` : `Include ${brgy} in Excel`}
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() => toggleBarangayIncluded(brgy)}
                      className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveBarangay(brgy)}
                    className="pr-2.5 pl-1 py-1.5 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{brgy}</span>
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : count > 0
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Active Barangay Work Program Reference Strip (Step 1 only) */}
        {builderStep === "photos" && (
          <div className="bg-blue-50/70 border-b border-blue-200/80 px-5 py-2 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-gov-blue whitespace-nowrap flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>{targetProgram?.programCode} · {activeBarangay} Work Plan:</span>
            </span>
            {workProgramLoading ? (
              <span className="text-[11px] text-slate-500">Loading schedule...</span>
            ) : activeBarangayWorkItems.length === 0 ? (
              <span className="text-[11px] text-slate-500">
                No specific 10-day work program items uploaded yet for Barangay {activeBarangay} in this program.
              </span>
            ) : (
              activeBarangayWorkItems.map((item) => {
                const isDayActive = dayFilter === String(item.dayNumber);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDayFilter((curr) => (curr === String(item.dayNumber) ? "ALL" : String(item.dayNumber)))
                    }
                    className={`shrink-0 text-left px-2.5 py-1 rounded-lg border text-[11px] transition cursor-pointer ${
                      isDayActive
                        ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                        : "bg-white text-slate-700 border-blue-200 hover:border-gov-blue"
                    }`}
                    title={`${item.specificActivities} — Area: ${item.area}`}
                  >
                    <span className="font-black">D{item.dayNumber}:</span>{" "}
                    <span className="font-semibold">
                      {item.specificActivities.length > 34
                        ? item.specificActivities.slice(0, 31) + "..."
                        : item.specificActivities}
                    </span>{" "}
                    <span className={isDayActive ? "text-blue-200" : "text-slate-400"}>
                      ({item.area.length > 22 ? item.area.slice(0, 19) + "..." : item.area})
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        )}

        {/* 4. Main Workspace: Step 1 (Cross-Program Photo Picker) OR Step 2 (Editable Excel Preview & Arranger) */}
        {builderStep === "preview" ? (
          <AccomplishmentExcelPreviewEditor
            activeBarangay={activeBarangay}
            doc={previewDocs[activeBarangay] || null}
            loading={previewLoading}
            layout={layoutConfig}
            onChangeLayout={(patch) => setLayoutConfig((prev) => ({ ...prev, ...patch }))}
            onChangeDoc={(updater) =>
              setPreviewDocs((prev) => {
                const curr = prev[activeBarangay];
                if (!curr) return prev;
                return { ...prev, [activeBarangay]: updater(curr) };
              })
            }
            onResetDoc={() => {
              const def = defaultPreviewDocs[activeBarangay];
              if (!def) return;
              setPreviewDocs((prev) => ({
                ...prev,
                [activeBarangay]: JSON.parse(JSON.stringify(def)),
              }));
              showFeedback("success", `Reset Barangay ${activeBarangay} accomplishment texts to defaults.`);
            }}
            onApplyHeaderToAll={() => {
              const curr = previewDocs[activeBarangay];
              if (!curr) return;
              setPreviewDocs((prev) => {
                const next: Record<string, PreviewBarangayDoc> = {};
                for (const [brgy, doc] of Object.entries(prev)) {
                  next[brgy] = {
                    ...doc,
                    doleOffice: curr.doleOffice,
                    periodOfWork: curr.periodOfWork,
                    issuedLine: curr.issuedLine,
                    signatoryName: curr.signatoryName,
                    signatoryTitle: curr.signatoryTitle,
                  };
                }
                return next;
              });
              showFeedback("success", "Applied DOLE Office, Period of Work, Issued Date, and Signatory to all 11 barangays.");
            }}
            onCleanAndFormatCurrent={() => {
              setPreviewDocs((prev) => {
                const curr = prev[activeBarangay];
                if (!curr) return prev;
                return {
                  ...prev,
                  [activeBarangay]: {
                    ...curr,
                    days: curr.days.map((d) => ({ ...d, text: cleanAccomplishmentDayText(d.text) })),
                  },
                };
              });
              showFeedback("success", `Auto-cleaned and formatted Barangay ${activeBarangay} daily accomplishments.`);
            }}
            onCleanAndFormatAll={() => {
              setPreviewDocs((prev) => {
                const next: Record<string, PreviewBarangayDoc> = {};
                for (const [brgy, doc] of Object.entries(prev)) {
                  next[brgy] = {
                    ...doc,
                    days: doc.days.map((d) => ({ ...d, text: cleanAccomplishmentDayText(d.text) })),
                  };
                }
                return next;
              });
              showFeedback("success", "Auto-cleaned and formatted daily accomplishment texts across all 11 barangays.");
            }}
            selectedEntries={activeSelectedEntries}
            photoMap={photoMap}
            workDayDates={workDayDates}
            requiredWorkDays={targetProgram?.requiredWorkDays || 10}
            includeGeotagInCaption={includeGeotagInCaption}
            onUpdateSlot={updateQueueSlot}
            onReorderSlots={reorderQueueSlots}
            onRemoveSlot={removeQueueItem}
            onSortSlotsAuto={sortActiveSlotsAuto}
            onEditPhotoPermanent={(photoId) => {
              const p = photoMap.get(photoId);
              if (p) openPhotoEditor(p);
            }}
            onZoomPhoto={(photoId) => {
              const p = photoMap.get(photoId);
              if (p) setZoomPhoto(p);
            }}
            onGoToPhotoPicker={() => setBuilderStep("photos")}
          />
        ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT: Cross-Program Photo Library (8 cols) */}
          <div className="lg:col-span-8 flex flex-col min-h-0 border-r border-slate-200 bg-slate-50">
            {/* Filters Bar */}
            <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                {/* Cross-Program Source Filter */}
                <select
                  value={sourceProgramFilter}
                  onChange={(e) => setSourceProgramFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-gov-blue"
                  title="Filter photos by source work program"
                >
                  <option value="ALL">All Work Programs ({allPhotos.length})</option>
                  <option value="TARGET">Target Program Only</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.programCode} — {p.programName}
                    </option>
                  ))}
                </select>

                {/* Source Barangay Filter */}
                <select
                  value={sourceBarangayFilter}
                  onChange={(e) => setSourceBarangayFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-gov-blue"
                  title="Filter photos by uploaded barangay"
                >
                  <option value="ACTIVE">Brgy. {activeBarangay} Only</option>
                  <option value="ALL">All 11 Barangays</option>
                  {DINGALAN_BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      Brgy. {b}
                    </option>
                  ))}
                </select>

                {/* Day Filter */}
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-gov-blue"
                >
                  <option value="ALL">All Days (1–10)</option>
                  {Array.from({ length: targetProgram?.requiredWorkDays || 10 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>
                      Day {d}
                    </option>
                  ))}
                </select>

                {/* Stage Filter */}
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-gov-blue"
                >
                  <option value="ALL">All Stages</option>
                  <option value="BEFORE">BEFORE</option>
                  <option value="DURING">DURING</option>
                  <option value="AFTER">AFTER</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:border-gov-blue"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="FOR_REVIEW">FOR REVIEW</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search activity/area..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-gov-blue"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                <span>
                  Showing <strong>{Math.min(visibleLimit, filteredPhotos.length)}</strong> of{" "}
                  <strong>{filteredPhotos.length}</strong> matching photos (adding to{" "}
                  <strong className="text-gov-blue">Brgy. {activeBarangay}</strong> sheet)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchAllPhotos()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${photosLoading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const eligible = filteredPhotos.filter((p) => p.status !== "REJECTED");
                      setSelectedByBarangay((prev) => {
                        const existing = prev[activeBarangay] || [];
                        const existingIds = new Set(existing.map((e) => e.photoId));
                        const toAdd: SelectedSlotEntry[] = eligible
                          .filter((p) => !existingIds.has(p.id))
                          .map((p) => ({
                            photoId: p.id,
                            targetBarangay: activeBarangay,
                            targetDayNumber: p.workDay?.dayNumber ?? p.workProgramItem?.dayNumber ?? 1,
                            stage: detectPhotoStage(p.specificActivity),
                          }));
                        return { ...prev, [activeBarangay]: [...existing, ...toAdd] };
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Select All Visible</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Grid */}
            <div className="flex-1 overflow-y-auto p-3.5">
              {photosLoading ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-gov-blue" />
                  <span className="text-xs font-bold">Loading photos across all TUPAD work programs...</span>
                </div>
              ) : filteredPhotos.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-slate-500 gap-2 border-2 border-dashed border-slate-300 rounded-2xl bg-white p-6 text-center">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No photos match your current filters</p>
                  <p className="text-xs text-slate-500 max-w-md">
                    Try switching <strong>Source Program</strong> to &ldquo;All Work Programs&rdquo; or{" "}
                    <strong>Barangay</strong> to &ldquo;All 11 Barangays&rdquo; to browse photos uploaded under other
                    programs.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredPhotos.slice(0, visibleLimit).map((photo) => {
                      const isSelected = activeSelectedIdSet.has(photo.id);
                      const isCrossProgram = photo.programId !== targetProgramId;
                      const stage = detectPhotoStage(photo.specificActivity);
                      const dayNum = photo.workDay?.dayNumber ?? photo.workProgramItem?.dayNumber;

                      return (
                        <div
                          key={photo.id}
                          className={`rounded-2xl border-2 bg-white overflow-hidden flex flex-col justify-between transition shadow-xs ${
                            isSelected
                              ? "border-emerald-500 ring-2 ring-emerald-500/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {/* Image Thumbnail */}
                          <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                            <img
                              src={photo.imageUrl}
                              alt={photo.specificActivity || "Accomplishment photo"}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />

                            {/* Top Left: Select Checkbox */}
                            <button
                              type="button"
                              onClick={() => togglePhotoForActiveBarangay(photo)}
                              className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-500 text-slate-950"
                                  : "bg-slate-950/80 hover:bg-gov-blue text-white border border-white/20"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Included</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-3.5 h-3.5 rounded border border-white/70 inline-block" />
                                  <span>Include</span>
                                </>
                              )}
                            </button>

                            {/* Top Right: Zoom Button */}
                            <button
                              type="button"
                              onClick={() => setZoomPhoto(photo)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/75 hover:bg-slate-950 text-white border border-white/20 opacity-90 hover:opacity-100 transition cursor-pointer"
                              title="Inspect full image"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Bottom Overlay Badges */}
                            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1 pointer-events-none">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md shadow ${
                                  isCrossProgram
                                    ? "bg-purple-600 text-white"
                                    : "bg-slate-950/85 text-gov-goldLight"
                                }`}
                              >
                                {isCrossProgram ? "Cross-Program: " : ""}
                                {photo.program?.programCode || "Program"}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                    stage === "BEFORE"
                                      ? "bg-amber-400 text-slate-950"
                                      : stage === "AFTER"
                                        ? "bg-emerald-500 text-white"
                                        : "bg-blue-600 text-white"
                                  }`}
                                >
                                  {stage}
                                </span>
                                {dayNum && (
                                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-950/85 text-white">
                                    Day {dayNum}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Photo Metadata & Actions */}
                          <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-extrabold text-slate-800 truncate">
                                  Brgy. {normalizeBarangayName(photo.barangay || "")}
                                  {photo.workArea ? ` • ${photo.workArea}` : ""}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border shrink-0 ${
                                    photo.status === "APPROVED"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : photo.status === "REJECTED"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {photo.status === "FOR_REVIEW" ? "FOR REVIEW" : photo.status}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                                {stripStagePrefix(photo.specificActivity) || "No activity specified"}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 font-mono pt-0.5">
                                <span className="inline-flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  {typeof photo.latitude === "number" && typeof photo.longitude === "number"
                                    ? `${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}`
                                    : "No GPS"}
                                </span>
                                <span className="inline-flex items-center gap-0.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {formatDate(photo.capturedAt || photo.uploadedAt, "MMM dd, hh:mm a")}
                                </span>
                              </div>
                            </div>

                            {/* Action Row */}
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openPhotoEditor(photo)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-gov-blue hover:text-white text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit Geotag &amp; Status</span>
                              </button>

                              {canEditStatus && photo.status !== "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(photo, "APPROVED")}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition cursor-pointer"
                                  title="Quick Approve permanently in DB"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredPhotos.length > visibleLimit && (
                    <div className="pt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleLimit((v) => v + 36)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer"
                      >
                        Load More Photos ({filteredPhotos.length - visibleLimit} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Selected Photos Queue for Active Barangay (4 cols) */}
          <div className="lg:col-span-4 flex flex-col min-h-0 bg-white">
            <div className="p-3.5 border-b border-slate-200 space-y-2 shrink-0 bg-slate-50/70">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel Queue: Brgy. {activeBarangay}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeSelectedEntries.length} photo{activeSelectedEntries.length === 1 ? "" : "s"} will be
                    embedded in this sheet
                  </p>
                </div>

                {!selectedBarangays.includes(activeBarangay) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    Sheet Unchecked
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const defaults = buildDefaultSelection(allPhotos, targetProgramId);
                    setSelectedByBarangay((prev) => ({
                      ...prev,
                      [activeBarangay]: defaults[activeBarangay] || [],
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-gov-blue text-[11px] font-bold border border-blue-200 transition cursor-pointer"
                >
                  Auto-Fill ({targetProgram?.programCode})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedByBarangay((prev) => ({ ...prev, [activeBarangay]: [] }))
                  }
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition cursor-pointer"
                >
                  Clear Sheet
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeSelectedEntries.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-xs text-slate-500 space-y-1.5">
                  <Sparkles className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No photos selected for Brgy. {activeBarangay}</p>
                  <p className="text-[11px]">
                    Click <strong>Include</strong> on any photo on the left (even from other work programs) to add it to
                    this barangay&apos;s Excel sheet.
                  </p>
                </div>
              ) : (
                activeSelectedEntries.map((entry, idx) => {
                  const photo = photoMap.get(entry.photoId);
                  if (!photo) return null;
                  const isCross = photo.programId !== targetProgramId;

                  return (
                    <div
                      key={`${entry.photoId}-${idx}`}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-gov-blue/40 transition space-y-2"
                    >
                      <div className="flex gap-2.5">
                        <img
                          src={photo.imageUrl}
                          alt="Selected thumbnail"
                          onClick={() => setZoomPhoto(photo)}
                          className="w-20 h-14 rounded-lg object-cover bg-slate-900 shrink-0 cursor-pointer border border-slate-200"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-black text-slate-500">
                              #{idx + 1} · {photo.program?.programCode || "Program"}
                              {isCross && (
                                <span className="ml-1 px-1 py-0.2 rounded bg-purple-100 text-purple-700">
                                  Cross
                                </span>
                              )}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                                photo.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : photo.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {photo.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-800 truncate">
                            {stripStagePrefix(photo.specificActivity) || "No activity"}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {photo.workArea || normalizeBarangayName(photo.barangay || "")}
                          </p>
                        </div>
                      </div>

                      {/* Slot Controls: Day, Stage, Reorder, Edit, Remove */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-200/80">
                        <div className="flex items-center gap-1">
                          <select
                            value={entry.targetDayNumber}
                            onChange={(e) =>
                              updateQueueSlot(entry.photoId, { targetDayNumber: Number(e.target.value) })
                            }
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-slate-300 bg-white text-slate-800"
                            title="Day label in Excel"
                          >
                            {Array.from({ length: targetProgram?.requiredWorkDays || 10 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                Day {d}
                              </option>
                            ))}
                          </select>

                          <select
                            value={entry.stage}
                            onChange={(e) =>
                              updateQueueSlot(entry.photoId, { stage: e.target.value as PhotoStage })
                            }
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-slate-300 bg-white text-slate-800"
                            title="Stage label in Excel"
                          >
                            <option value="BEFORE">BEFORE</option>
                            <option value="DURING">DURING</option>
                            <option value="AFTER">AFTER</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openPhotoEditor(photo)}
                            className="p-1 rounded bg-white hover:bg-gov-blue hover:text-white text-slate-600 border border-slate-200 transition cursor-pointer"
                            title="Edit geotagging & status permanently"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveQueueItem(idx, -1)}
                            className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 text-slate-600 border border-slate-200 transition cursor-pointer"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeSelectedEntries.length - 1}
                            onClick={() => moveQueueItem(idx, 1)}
                            className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 text-slate-600 border border-slate-200 transition cursor-pointer"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQueueItem(entry.photoId)}
                            className="p-1 rounded bg-white hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 transition cursor-pointer"
                            title="Remove from Excel report"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* PERMANENT PHOTO GEOTAGGING & STATUS EDITOR MODAL */}
      {editingPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6"
          onClick={() => !savingEdit && setEditingPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-300 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-gov-dark via-slate-900 to-blue-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-5 h-5 text-gov-gold" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Edit Photo Geotagging, Status &amp; Work Program Details
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Changes are saved permanently to the database and reflected in the exported Excel report.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => setEditingPhoto(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePermanentEdit} className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Photo Preview & Re-stamp Controls */}
              <div className="lg:col-span-5 space-y-3">
                <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-950 aspect-video flex items-center justify-center">
                  <img
                    src={editPreviewUrl || editingPhoto.imageUrl}
                    alt="Photo edit preview"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRestampImage}
                      onChange={(e) => setEditRestampImage(e.target.checked)}
                      className="mt-0.5 rounded accent-gov-blue"
                    />
                    <span>
                      <strong className="text-slate-900 block">
                        Re-stamp Geotag Banner onto Photo Image
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Updates the visible PESO-Dingalan Day, Stage, Work Area, Activity, GPS, and Timestamp banner
                        directly on the saved photo image.
                      </span>
                    </span>
                  </label>

                  {editRestampImage && (
                    <button
                      type="button"
                      onClick={handleGenerateStampPreview}
                      disabled={editRenderingPreview}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-gov-blue text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {editRenderingPreview ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-gov-gold" />
                      )}
                      <span>Preview Updated Geotag Stamp</span>
                    </button>
                  )}

                  {editingPhoto.programId !== targetProgramId && canEditStatus && (
                    <label className="flex items-start gap-2 pt-2 border-t border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editReassignProgram}
                        onChange={(e) => setEditReassignProgram(e.target.checked)}
                        className="mt-0.5 rounded accent-purple-600"
                      />
                      <span className="text-[11px] text-slate-700">
                        Also reassign photo&apos;s owning program from{" "}
                        <strong>{editingPhoto.program?.programCode}</strong> to{" "}
                        <strong>{targetProgram?.programCode}</strong>
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Right: Permanent Metadata Form */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Status & Stage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                      Approval Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      disabled={!canEditStatus}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-gov-blue disabled:bg-slate-100"
                    >
                      <option value="APPROVED">APPROVED (Included in DOLE Exports)</option>
                      <option value="FOR_REVIEW">FOR REVIEW</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                      Documentation Stage
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["BEFORE", "DURING", "AFTER"] as PhotoStage[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEditStage(st)}
                          className={`py-2 rounded-lg text-[11px] font-black border transition cursor-pointer ${
                            editStage === st
                              ? st === "BEFORE"
                                ? "bg-amber-400 text-slate-950 border-amber-500"
                                : st === "AFTER"
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : "bg-gov-blue text-white border-gov-blue"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {editStatus === "REJECTED" && canEditStatus && (
                  <div>
                    <label className="block text-[11px] font-extrabold text-rose-700 uppercase mb-1">
                      Rejection Reason
                    </label>
                    <input
                      type="text"
                      value={editRejectionReason}
                      onChange={(e) => setEditRejectionReason(e.target.value)}
                      placeholder="Optional reason for rejection..."
                      className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg bg-rose-50/40 text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                {/* Barangay, Day & Target Work Program Activity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                      Barangay
                    </label>
                    <select
                      value={editBarangay}
                      onChange={(e) => setEditBarangay(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-gov-blue"
                    >
                      {DINGALAN_BARANGAYS.map((b) => (
                        <option key={b} value={b}>
                          Barangay {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                      Work Day (Day 1–{targetProgram?.requiredWorkDays || 10})
                    </label>
                    <select
                      value={editWorkDayNumber}
                      onChange={(e) => setEditWorkDayNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-gov-blue"
                    >
                      {Array.from({ length: targetProgram?.requiredWorkDays || 10 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Day {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Match to Specific TUPAD Work Program Item */}
                <div>
                  <label className="block text-[11px] font-extrabold text-gov-blue uppercase mb-1">
                    Link to Specific TUPAD Work Program Activity ({targetProgram?.programCode} · {editBarangay})
                  </label>
                  <select
                    value={editWorkProgramItemId}
                    onChange={(e) => handleSelectWorkProgramItemInEditor(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-blue-300 rounded-lg bg-blue-50/50 text-slate-900 focus:outline-none focus:border-gov-blue"
                  >
                    <option value="">-- Custom / Keep Manual Activity &amp; Area --</option>
                    {editBarangayWorkItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        Day {item.dayNumber} — {item.specificActivities} (Area: {item.area})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                      Work Area / Location
                    </label>
                    <input
                      type="text"
                      value={editWorkArea}
                      onChange={(e) => setEditWorkArea(e.target.value)}
                      placeholder="e.g. Purok 1 Coastal Road"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-gov-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                      Sitio / Purok
                    </label>
                    <input
                      type="text"
                      value={editSitio}
                      onChange={(e) => setEditSitio(e.target.value)}
                      placeholder="e.g. Purok 1"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-gov-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Specific Activity Description
                  </label>
                  <input
                    type="text"
                    value={editSpecificActivity}
                    onChange={(e) => setEditSpecificActivity(e.target.value)}
                    placeholder="e.g. Declogging of drainage canals and coastal cleanup"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-gov-blue"
                  />
                </div>

                {/* Geotagging Coordinates & Capture Timestamp */}
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase text-emerald-900 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Geotagging Coordinates &amp; Timestamp</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const preset = DINGALAN_BARANGAY_COORDS[editBarangay] || { lat: 15.3941, lng: 121.3965 };
                        setEditLatitude(preset.lat.toFixed(5));
                        setEditLongitude(preset.lng.toFixed(5));
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                    >
                      Use Brgy. {editBarangay} GPS
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Latitude (°N)
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={editLatitude}
                        onChange={(e) => setEditLatitude(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Longitude (°E)
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={editLongitude}
                        onChange={(e) => setEditLongitude(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Captured Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editCapturedAt}
                        onChange={(e) => setEditCapturedAt(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Documented By (Banner Attribution)
                    </label>
                    <input
                      type="text"
                      value={editDocumentedBy}
                      onChange={(e) => setEditDocumentedBy(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setEditingPhoto(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 rounded-xl bg-gov-blue hover:bg-gov-dark disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-md transition cursor-pointer"
                  >
                    {savingEdit ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-gov-goldLight" />
                    )}
                    <span>{savingEdit ? "Saving Permanently..." : "Save Permanently to Database"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SCREEN PHOTO INSPECTOR LIGHTBOX */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="max-w-4xl w-full bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="text-xs">
                <span className="font-mono font-bold text-gov-goldLight">
                  {zoomPhoto.program?.programCode} · Brgy. {normalizeBarangayName(zoomPhoto.barangay || "")}
                </span>
                <p className="font-bold text-sm">{zoomPhoto.specificActivity || "Accomplishment Photo"}</p>
              </div>
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={zoomPhoto.imageUrl}
                alt={zoomPhoto.specificActivity || "Zoomed photo"}
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
