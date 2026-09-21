"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";
import {
  Camera,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  UploadCloud,
  AlertCircle,
  Eye,
  Sparkles,
  Trash2,
  HardDrive,
  Download,
  AlertTriangle,
  RefreshCw,
  X,
  QrCode,
  Filter,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FieldQrPassGeneratorModal } from "@/components/field/FieldQrPassGeneratorCard";
import { formatDate, normalizeBarangayName, DINGALAN_BARANGAYS } from "@/lib/utils";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, queueOfflineTransaction, pushSyncQueue } from "@/lib/dexie";

export default function PhotosPage() {
  const { user, can } = useAuth();
  const { isOnline, syncNow, isSyncing } = useOffline();

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedBarangayFilter, setSelectedBarangayFilter] = useState<string>("ALL");
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-select for storage cleanup & batch actions
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeType, setPurgeType] = useState<"SELECTED" | "ALL_APPROVED">("SELECTED");
  const [purging, setPurging] = useState(false);

  // Photo viewer modal
  const [viewingPhoto, setViewingPhoto] = useState<any | null>(null);
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false);

  // Camera & Capture Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadBarangay, setUploadBarangay] = useState("Paltic");
  const [uploadSitio, setUploadSitio] = useState("Centro");
  const [uploadWorkDayNumber, setUploadWorkDayNumber] = useState<number>(1);
  const [uploadWorkProgramItemId, setUploadWorkProgramItemId] = useState<string>("");
  const [uploadWorkArea, setUploadWorkArea] = useState<string>("");
  const [uploadSpecificActivity, setUploadSpecificActivity] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // System Unit Camera & Geotag Preview state
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({ lat: 15.3941, lng: 121.3965 });
  const [gpsStatus, setGpsStatus] = useState<string>("Locating GPS...");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [workPrograms, setWorkPrograms] = useState<any[]>([]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if ((user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) {
      setUploadBarangay(normalizeBarangayName(user.assignedBarangay));
    }
  }, [user]);

  useEffect(() => {
    if (selectedProgramId) {
      setSelectedPhotoIds([]);
      fetchPhotos(selectedProgramId);
      fetchWorkPrograms(selectedProgramId);
    }
  }, [selectedProgramId]);

  // Listen for sync completions to auto-update photo roster
  useEffect(() => {
    const handleSyncUpdate = () => {
      if (selectedProgramId) {
        fetchPhotos(selectedProgramId);
      }
    };
    window.addEventListener("tupad-offline-synced", handleSyncUpdate);
    window.addEventListener("tupad-photos-updated", handleSyncUpdate);
    return () => {
      window.removeEventListener("tupad-offline-synced", handleSyncUpdate);
      window.removeEventListener("tupad-photos-updated", handleSyncUpdate);
    };
  }, [selectedProgramId]);

  // Track GPS location continuously when modal is open
  useEffect(() => {
    if (isUploadOpen && navigator.geolocation) {
      setGpsStatus("Acquiring high-accuracy GPS fix...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsStatus(`GPS Fixed (±${Math.round(pos.coords.accuracy || 5)}m)`);
        },
        (err) => {
          console.warn("GPS Warning:", err.message);
          setGpsStatus("Using Municipal Dingalan Coordinates");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [isUploadOpen]);

  // Reset captured preview when modal closes
  useEffect(() => {
    if (!isUploadOpen) {
      setCapturedImagePreview(null);
    }
  }, [isUploadOpen]);

  const fetchPrograms = async () => {
    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const res = await fetch("/api/v1/programs");
        if (res.ok) {
          const data = await res.json();
          const progs = data.programs || [];
          if (progs.length > 0) {
            setPrograms(progs);
            setSelectedProgramId((prev) => prev || progs[0].id);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Online programs fetch failed, falling back to offline storage:", e);
    }

    // Offline fallback from IndexedDB on installed unit
    try {
      const cachedProgs = await offlineDb.cachedPrograms.toArray();
      const allCachedWorkDays = await offlineDb.cachedWorkDays.toArray();

      const progsWithDays = cachedProgs.map((p) => ({
        ...p,
        workDays: allCachedWorkDays
          .filter((w) => w.programId === p.id)
          .sort((a, b) => a.dayNumber - b.dayNumber),
      }));

      if (progsWithDays.length > 0) {
        setPrograms(progsWithDays);
        setSelectedProgramId((prev) => prev || progsWithDays[0].id);
      }
    } catch (err) {
      console.error("Failed to load offline programs from IndexedDB:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkPrograms = async (progId: string) => {
    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const res = await fetch(`/api/v1/programs/${progId}/work-program`);
        if (res.ok) {
          const data = await res.json();
          if (data.workPrograms && data.workPrograms.length > 0) {
            setWorkPrograms(data.workPrograms);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Online work programs fetch failed, falling back to offline cache:", e);
    }

    // Offline fallback from Dexie
    try {
      const cachedItems = await offlineDb.cachedWorkProgramItems.where("programId").equals(progId).toArray();
      if (cachedItems.length > 0) {
        const grouped: Record<string, any[]> = {};
        cachedItems.forEach((it) => {
          const b = normalizeBarangayName(it.barangay);
          if (!grouped[b]) grouped[b] = [];
          grouped[b].push(it);
        });

        const wpList = Object.entries(grouped).map(([brgy, items]) => ({
          id: `WP-${brgy}`,
          barangay: brgy,
          items,
        }));
        setWorkPrograms(wpList);
      }
    } catch (err) {
      console.error("Failed to load offline work programs:", err);
    }
  };

  const fetchPhotos = async (progId: string) => {
    let serverPhotos: any[] = [];
    try {
      const res = await fetch(`/api/v1/photos?programId=${progId}`);
      if (res.ok) {
        const data = await res.json();
        serverPhotos = data.photos || [];
      }
    } catch (e) {
      console.warn("Could not fetch remote photos:", e);
    }

    // Load any pending / failed offline queue photos from local Dexie IndexedDB
    let offlineQueuedPhotos: any[] = [];
    try {
      const queuedItems = await offlineDb.offlineQueue
        .where("entityType")
        .equals("PHOTO")
        .toArray();

      const filtered = queuedItems.filter((item) => {
        const p = item.payload;
        if (!p) return false;
        if (progId && p.programId && p.programId !== progId) return false;
        if (
          (user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") &&
          user.assignedBarangay
        ) {
          const userBrgy = normalizeBarangayName(user.assignedBarangay).toLowerCase();
          const itemBrgy = normalizeBarangayName(p.barangay).toLowerCase();
          if (userBrgy !== itemBrgy) return false;
        }
        return true;
      });

      offlineQueuedPhotos = filtered.map((item) => ({
        id: `offline-${item.id || item.clientTransactionId}`,
        clientTransactionId: item.clientTransactionId,
        programId: item.payload?.programId || progId,
        workDay: { dayNumber: item.payload?.workDayNumber || 1 },
        barangay: normalizeBarangayName(item.payload?.barangay || user?.assignedBarangay || "Paltic"),
        sitio: item.payload?.sitio,
        workArea: item.payload?.workArea || item.payload?.sitio,
        specificActivity: item.payload?.specificActivity,
        fileKey: item.payload?.photoData || item.payload?.fileKey,
        latitude: item.payload?.latitude || 15.3941,
        longitude: item.payload?.longitude || 121.3965,
        capturedAt: item.payload?.capturedAt || item.createdAt,
        uploadedAt: item.createdAt,
        status: "PENDING_SYNC",
        isOfflineQueue: true,
        offlineStatus: item.status,
        offlineError: item.lastError,
        uploadedBy: { fullName: user?.fullName || "Field Coordinator" },
      }));
    } catch (err) {
      console.warn("Could not load offline queued photos:", err);
    }

    setPhotos([...offlineQueuedPhotos, ...serverPhotos]);
  };

  // Trigger system unit camera directly
  const triggerSystemCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Burn Geotag Data Directly into Image Canvas with optimized dimensions
  const processAndBurnGeotag = (sourceElement: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    let width = sourceElement.naturalWidth || 1280;
    let height = sourceElement.naturalHeight || 720;

    // Scale to max 1280 to keep upload payloads and base64 strings lightweight (~200KB - 350KB) and smooth
    const maxDim = 1280;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw base captured photo
    ctx.drawImage(sourceElement, 0, 0, width, height);

    // Dynamic sizing based on canvas width
    const baseFontSize = Math.max(13, Math.round(width * 0.022));
    const smallFontSize = Math.max(10, Math.round(width * 0.016));
    const padding = Math.round(width * 0.02);

    const targetBrgy = normalizeBarangayName(
      (user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay
        ? user.assignedBarangay
        : uploadBarangay
    );

    // Helper to finish drawing banners and export dataUrl
    const renderBannersAndFinalize = (logoImage?: HTMLImageElement) => {
      // 1. Top Header Banner
      const topBannerHeight = Math.round(height * 0.09);
      ctx.fillStyle = "rgba(10, 25, 47, 0.90)";
      ctx.fillRect(0, 0, width, topBannerHeight);

      let textStartX = padding;

      // Draw PESO EC Access Emblem Logo if available
      if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
        const logoSize = Math.round(topBannerHeight * 0.72);
        const logoY = Math.round((topBannerHeight - logoSize) / 2);
        ctx.drawImage(logoImage, padding, logoY, logoSize, logoSize);
        textStartX = padding + logoSize + Math.round(width * 0.01);
      }

      ctx.fillStyle = "#F59E0B"; // Gold
      ctx.font = `bold ${baseFontSize}px sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText("PESO-Dingalan TUPAD EC Management", textStartX, topBannerHeight / 2);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${smallFontSize}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText(`DAY ${uploadWorkDayNumber} • BRGY. ${targetBrgy.toUpperCase()}`, width - padding, topBannerHeight / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // 2. Bottom Geotag & Activity Banner
      const bottomBannerHeight = Math.round(height * 0.22);
      const bottomY = height - bottomBannerHeight;

      ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
      ctx.fillRect(0, bottomY, width, bottomBannerHeight);

      // Top blue accent line
      ctx.fillStyle = "#3B82F6";
      ctx.fillRect(0, bottomY, width, 4);

      const lineSpacing = Math.round(bottomBannerHeight * 0.22);

      // Line 1: Work Area & Location
      ctx.fillStyle = "#93C5FD"; // Light Blue
      ctx.font = `bold ${smallFontSize}px monospace`;
      ctx.fillText("📍 LOCATION & WORK AREA:", padding, bottomY + lineSpacing * 1);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${baseFontSize}px sans-serif`;
      ctx.fillText(`${uploadWorkArea || uploadSitio || targetBrgy} (Barangay ${targetBrgy})`, padding + Math.round(width * 0.28), bottomY + lineSpacing * 1);

      // Line 2: Specific Activity
      ctx.fillStyle = "#FDE68A"; // Yellow
      ctx.font = `bold ${smallFontSize}px monospace`;
      ctx.fillText("🔨 SPECIFIC ACTIVITY:", padding, bottomY + lineSpacing * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${smallFontSize + 1}px sans-serif`;
      const activityText = uploadSpecificActivity || "Emergency Employment Community Work";
      const truncatedActivity = activityText.length > 70 ? activityText.slice(0, 67) + "..." : activityText;
      ctx.fillText(truncatedActivity, padding + Math.round(width * 0.28), bottomY + lineSpacing * 2);

      // Line 3: GPS Coordinates & Timestamp
      const now = new Date();
      const formattedDate = formatDate(now.toISOString(), "MM/dd/yyyy hh:mm:ss a");
      ctx.fillStyle = "#34D399"; // Emerald
      ctx.font = `bold ${smallFontSize}px monospace`;
      ctx.fillText("🌐 GPS / TIMESTAMP:", padding, bottomY + lineSpacing * 3);
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(`GPS: ${gpsCoords.lat.toFixed(5)}°N, ${gpsCoords.lng.toFixed(5)}°E  •  PST: ${formattedDate}`, padding + Math.round(width * 0.28), bottomY + lineSpacing * 3);

      // Line 4: Coordinator Sign
      ctx.fillStyle = "#CBD5E1";
      ctx.font = `italic ${smallFontSize - 1}px sans-serif`;
      ctx.fillText(`Documented by: ${user?.fullName || "Field Coordinator"} • PESO-Dingalan TUPAD EC Management`, padding, bottomY + lineSpacing * 3.9);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      setCapturedImagePreview(dataUrl);
    };

    // Load PESO EC Access Emblem logo
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.onload = () => {
      renderBannersAndFinalize(logoImg);
    };
    logoImg.onerror = () => {
      renderBannersAndFinalize();
    };
    logoImg.src = "/images/peso-ec-access-emblem.png";
  };

  // Handle native mobile file input capture
  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        processAndBurnGeotag(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Geotagged Photo
  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImagePreview) {
      alert("Please capture or snap a photo first!");
      return;
    }

    setSubmitting(true);
    const targetBarangay = normalizeBarangayName(
      (user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay
        ? user.assignedBarangay
        : uploadBarangay
    );

    const photoPayload = {
      programId: selectedProgramId || programs[0]?.id,
      workDayNumber: uploadWorkDayNumber,
      workProgramItemId: uploadWorkProgramItemId && !uploadWorkProgramItemId.startsWith("WP-") ? uploadWorkProgramItemId : undefined,
      barangay: targetBarangay,
      sitio: uploadSitio,
      workArea: uploadWorkArea || uploadSitio,
      specificActivity: uploadSpecificActivity,
      photoData: capturedImagePreview,
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lng,
      capturedAt: new Date().toISOString(),
    };

    try {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const res = await fetch("/api/v1/photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(photoPayload),
          });

          if (res.ok) {
            setIsUploadOpen(false);
            setCapturedImagePreview(null);
            setUploadWorkProgramItemId("");
            setUploadWorkArea("");
            setUploadSpecificActivity("");
            fetchPhotos(selectedProgramId);
            return;
          } else {
            const data = await res.json();
            throw new Error(data.error || "Failed to upload accomplishment photo");
          }
        } catch (onlineErr: any) {
          console.warn("Online photo upload failed, saving to local offline queue:", onlineErr);
        }
      }

      // Offline fallback: Queue to IndexedDB
      await queueOfflineTransaction("PHOTO", "CREATE", photoPayload);

      setIsUploadOpen(false);
      setCapturedImagePreview(null);
      setUploadWorkProgramItemId("");
      setUploadWorkArea("");
      setUploadSpecificActivity("");
      fetchPhotos(selectedProgramId);
      alert("✓ Accomplishment Photo Saved to Local Cache! Will automatically upload to central storage once online.");
    } catch (e: any) {
      alert(e.message || "Failed to save accomplishment photo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (photoId: string, newStatus: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/v1/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: photoId,
          status: newStatus,
          rejectionReason: newStatus === "REJECTED" ? "Insufficient GPS / activity clarity" : null,
        }),
      });
      if (res.ok) {
        fetchPhotos(selectedProgramId);
      }
    } catch (e) {
      alert("Failed to update photo status");
    }
  };

  const handlePurgePhotos = async () => {
    setPurging(true);
    try {
      let url = "/api/v1/photos";
      if (purgeType === "SELECTED") {
        if (selectedPhotoIds.length === 0) return;
        url += `?ids=${selectedPhotoIds.join(",")}`;
      } else {
        url += `?programId=${selectedProgramId}&status=APPROVED`;
      }

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        setIsPurgeModalOpen(false);
        setSelectedPhotoIds([]);
        fetchPhotos(selectedProgramId);
        alert(`Successfully deleted ${data.count || 0} photo file(s) from database storage.`);
      } else {
        alert(data.error || "Failed to purge photos");
      }
    } catch (e) {
      alert("Error purging photos");
    } finally {
      setPurging(false);
    }
  };

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPhotoIds.length === displayedPhotos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(displayedPhotos.map((p) => p.id));
    }
  };

  const currentProgram = programs.find((p) => p.id === selectedProgramId);
  const isDole = user?.role === "DOLE_COORDINATOR";
  const isAdmin = isAdminUser(user);

  // Filter activities for active upload modal Barangay + Day
  const activeWp = workPrograms.find(
    (w) => normalizeBarangayName(w.barangay).toUpperCase() === normalizeBarangayName(uploadBarangay).toUpperCase()
  );
  const availableActivitiesForModal = (activeWp?.items || []).filter(
    (it: any) => it.dayNumber === uploadWorkDayNumber
  );

  // Filter displayed photos by selected barangay if Admin selected a filter
  const displayedPhotos = photos.filter((photo) => {
    if (!isAdmin || selectedBarangayFilter === "ALL") return true;
    return normalizeBarangayName(photo.barangay).toUpperCase() === selectedBarangayFilter.toUpperCase();
  });

  const pendingOfflineCount = photos.filter((p) => p.status === "PENDING_SYNC" || p.isOfflineQueue).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Camera className="w-6 h-6 text-gov-blue" />
            <span>Accomplishment Photo Documentation</span>
          </h1>
          <p className="text-xs text-slate-500">
            Geotagged daily field proof with live camera capture & timestamp overlays
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick QR Generator Trigger Button */}
          <button
            type="button"
            onClick={() => setQrGeneratorOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-gov-gold/20 to-amber-100 hover:from-gov-gold/30 hover:to-amber-200 text-gov-dark border border-gov-gold/50 rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-xs"
            title="Generate and screenshot official QR code of any beneficiary"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>Generate / Screenshot QR</span>
          </button>

          {/* Admin Storage Optimization Button */}
          {isAdmin && (
            <button
              onClick={() => {
                setPurgeType("SELECTED");
                setIsPurgeModalOpen(true);
              }}
              disabled={photos.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs rounded-xl border border-slate-300 hover:border-rose-300 shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <HardDrive className="w-4 h-4 text-rose-600" />
              <span>Prune Photos ({selectedPhotoIds.length || "All"})</span>
            </button>
          )}

          {!isDole && can("photo.upload") && (
            <button
              onClick={() => {
                setIsUploadOpen(true);
                setCapturedImagePreview(null);
              }}
              className="px-4 py-2 bg-gov-blue hover:bg-gov-dark text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition"
            >
              <Camera className="w-4 h-4 text-gov-goldLight" />
              <span>Take Accomplishment Photo</span>
            </button>
          )}
        </div>
      </div>

      {/* Program Selector & Filter Controls */}
      <div className="gov-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-slate-700 uppercase">Program:</label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border rounded-lg bg-slate-50 min-w-[240px]"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.programCode} - {p.programName}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Barangay Filter */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Barangay:</span>
              </label>
              <select
                value={selectedBarangayFilter}
                onChange={(e) => setSelectedBarangayFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold border rounded-lg bg-slate-50"
              >
                <option value="ALL">All 11 Barangays</option>
                {DINGALAN_BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Storage Metrics & Multi-Select bar */}
        <div className="flex items-center space-x-3 text-xs">
          {isAdmin && displayedPhotos.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-gov-blue font-bold hover:underline"
            >
              {selectedPhotoIds.length === displayedPhotos.length ? "Deselect All" : "Select All"}
            </button>
          )}
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg">
            Total Photos: <strong>{displayedPhotos.length}</strong>
          </span>
          {selectedPhotoIds.length > 0 && (
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-lg">
              {selectedPhotoIds.length} Selected
            </span>
          )}
        </div>
      </div>

      {/* Pending Offline Photos Sync Banner */}
      {pendingOfflineCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center space-x-2.5">
            <UploadCloud className="w-5 h-5 text-amber-600 animate-bounce" />
            <div>
              <p className="font-extrabold text-amber-900">
                {pendingOfflineCount} Accomplishment Photo(s) Stored in Local Offline Cache
              </p>
              <p className="text-[11px] text-amber-700">
                Photos are stored on this device with full GPS proof and will transmit once online.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await syncNow();
              if (selectedProgramId) fetchPhotos(selectedProgramId);
            }}
            disabled={isSyncing}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Transmit Pending Photos Now"}</span>
          </button>
        </div>
      )}

      {/* Coordinator & Documentor Scoped Scope Banner */}
      {(user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>Assigned Scope: Showing photos for <strong>Barangay {normalizeBarangayName(user.assignedBarangay)}</strong> only.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-950 rounded uppercase tracking-wider">
            Barangay Restricted
          </span>
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedPhotos.map((photo) => {
          const isImageUri = photo.fileKey && photo.fileKey.startsWith("data:image");

          return (
            <div
              key={photo.id}
              className={`gov-card overflow-hidden shadow-sm group hover:shadow-md transition flex flex-col justify-between border border-slate-200 ${
                selectedPhotoIds.includes(photo.id) ? "ring-2 ring-rose-500 bg-rose-50/20" : ""
              }`}
            >
              {/* Image Box */}
              <div
                className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer"
                onClick={() => setViewingPhoto(photo)}
              >
                {/* Checkbox for Admin selection */}
                {isAdmin && (
                  <div
                    className="absolute top-2 left-2 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPhotoIds.includes(photo.id)}
                      onChange={() => toggleSelectPhoto(photo.id)}
                      className="w-4 h-4 text-rose-600 rounded bg-white/90 cursor-pointer shadow"
                    />
                  </div>
                )}

                {/* Status Badge Overlay */}
                <div className="absolute top-2 right-2 z-20">
                  <StatusBadge status={photo.status} />
                </div>

                {/* Real Geotagged Photo or Placeholder */}
                {isImageUri ? (
                  <img
                    src={photo.fileKey}
                    alt={photo.specificActivity || "Accomplishment Photo"}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-center">
                    <Camera className="w-8 h-8 text-slate-500 mb-1 opacity-70" />
                    <span className="text-[10px] font-mono text-slate-300 font-semibold line-clamp-1">
                      {photo.specificActivity || "Field Work Documentation"}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                      📍 {photo.workArea || photo.sitio || photo.barangay}
                    </span>
                  </div>
                )}

                {/* View Overlay on Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2 text-white text-xs font-bold pointer-events-none">
                  <Eye className="w-5 h-5" />
                  <span>View Full Photo</span>
                </div>
              </div>

              {/* Card Footer / Details */}
              <div className="p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span className="font-bold text-gov-blue">
                    Work Day {photo.workDay?.dayNumber || 1} • Barangay {photo.barangay}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate(photo.capturedAt || photo.uploadedAt, "MM/dd/yy hh:mm a")}
                  </span>
                </div>

                {photo.specificActivity && (
                  <p className="text-[11px] text-slate-800 font-semibold line-clamp-2">
                    {photo.specificActivity}
                  </p>
                )}

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                  <span>📍 {photo.workArea || photo.sitio || "Assigned Area"}</span>
                  <span className="font-mono text-slate-400">
                    {photo.latitude ? `${photo.latitude.toFixed(4)}°N, ${photo.longitude.toFixed(4)}°E` : ""}
                  </span>
                </div>

                {/* Approval Buttons for PESO ADMIN */}
                {!isDole && can("photo.approve") && photo.status === "FOR_REVIEW" && (
                  <div className="flex space-x-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleStatusChange(photo.id, "APPROVED")}
                      className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg shadow transition flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(photo.id, "REJECTED")}
                      className="flex-1 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] rounded-lg shadow transition flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {displayedPhotos.length === 0 && (
        <div className="gov-card p-12 text-center text-xs text-slate-400">
          No accomplishment photos found for this selection.
        </div>
      )}

      {/* Full Photo Viewer Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-white">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-gov-goldLight">
                  Accomplishment Photo Proof • Day {viewingPhoto.workDay?.dayNumber || 1} (Brgy. {viewingPhoto.barangay})
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  GPS: {viewingPhoto.latitude}°N, {viewingPhoto.longitude}°E • By {viewingPhoto.uploadedBy?.fullName || "Coordinator"}
                </p>
              </div>

              <button
                onClick={() => setViewingPhoto(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-2">
              {viewingPhoto.fileKey && viewingPhoto.fileKey.startsWith("data:image") ? (
                <img
                  src={viewingPhoto.fileKey}
                  alt={viewingPhoto.specificActivity || "Proof"}
                  className="max-h-[65vh] w-auto object-contain rounded"
                />
              ) : (
                <div className="p-12 text-center text-slate-500 font-mono text-xs">
                  Photo placeholder metadata recorded.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <p className="max-w-md truncate">
                <strong>Activity:</strong> {viewingPhoto.specificActivity || "General Field Work"}
              </p>
              {viewingPhoto.fileKey && viewingPhoto.fileKey.startsWith("data:image") && (
                <a
                  href={viewingPhoto.fileKey}
                  download={`TUPAD_Accomplishment_${viewingPhoto.barangay}_Day${viewingPhoto.workDay?.dayNumber || 1}.jpg`}
                  className="px-3 py-1.5 bg-gov-blue hover:bg-gov-dark text-white rounded-lg font-bold flex items-center space-x-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Geotagged Image</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* System Unit Camera & Geotag Photo Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-fadeIn flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden my-auto">
            {/* Fixed Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b bg-slate-50 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-gov-blue/10 text-gov-blue rounded-lg">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                    Take Geotagged Accomplishment Photo
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    System unit camera with automatic geotag & timestamp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="photo-upload-form"
              onSubmit={handleSavePhoto}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 text-xs"
            >
              {/* Step 1: Select Scope & Activity */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Work Day # *
                    </label>
                    <select
                      value={uploadWorkDayNumber}
                      onChange={(e) => {
                        setUploadWorkDayNumber(parseInt(e.target.value, 10));
                        setUploadWorkProgramItemId("");
                      }}
                      className="w-full px-2.5 py-1.5 sm:py-2 text-xs border rounded-lg bg-slate-50 font-bold focus:border-gov-blue"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                        <option key={d} value={d}>
                          Day {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Barangay *
                    </label>
                    <select
                      value={uploadBarangay}
                      disabled={
                        (user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") &&
                        !!user.assignedBarangay
                      }
                      onChange={(e) => {
                        setUploadBarangay(e.target.value);
                        setUploadWorkProgramItemId("");
                      }}
                      className="w-full px-2.5 py-1.5 sm:py-2 text-xs border rounded-lg bg-slate-50 font-bold disabled:bg-slate-100"
                    >
                      {[
                        "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
                        "Dikapanikian", "Ibona", "Matawe", "Paltic",
                        "Poblacion", "Tanawan", "Umiray"
                      ].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Activity Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gov-blue uppercase mb-1 flex items-center justify-between">
                    <span>Choose Scheduled Activity & Area *</span>
                    <span className="text-[10px] text-slate-500 font-normal">From 10-Day Work Plan</span>
                  </label>

                  {availableActivitiesForModal.length > 0 ? (
                    <select
                      value={uploadWorkProgramItemId}
                      onChange={(e) => {
                        const itemId = e.target.value;
                        setUploadWorkProgramItemId(itemId);
                        const selectedItem = availableActivitiesForModal.find((it: any) => it.id === itemId);
                        if (selectedItem) {
                          setUploadWorkArea(selectedItem.area);
                          setUploadSpecificActivity(selectedItem.specificActivities);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 sm:py-2 text-xs border border-blue-300 rounded-lg bg-blue-50/50 font-semibold focus:outline-none focus:border-gov-blue"
                    >
                      <option value="">-- Select Day {uploadWorkDayNumber} Activity --</option>
                      {availableActivitiesForModal.map((it: any) => (
                        <option key={it.id} value={it.id}>
                          📍 [{it.area}] {it.specificActivities}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter activity description (e.g. Declogging canals, clearing roads)"
                      value={uploadSpecificActivity}
                      onChange={(e) => setUploadSpecificActivity(e.target.value)}
                      className="w-full px-2.5 py-1.5 sm:py-2 text-xs border rounded-lg focus:border-gov-blue"
                    />
                  )}
                </div>

                {/* Area Customization */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Specific Work Area / Sitio / Purok
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Purok 1, Sitio Centro, Coastal shoreline"
                    value={uploadWorkArea}
                    onChange={(e) => setUploadWorkArea(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:py-2 text-xs border rounded-lg focus:border-gov-blue"
                  />
                </div>
              </div>

              {/* Step 2: System Camera Capture & Geotag Preview */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-gov-blue" />
                    <span>Unit Camera Geotag</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {gpsStatus}
                  </span>
                </div>

                {/* Viewfinder / Action Box */}
                <div
                  onClick={!capturedImagePreview ? triggerSystemCamera : undefined}
                  className={`relative aspect-[16/9] max-h-[220px] sm:max-h-[250px] w-full bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center transition ${
                    !capturedImagePreview ? "cursor-pointer hover:border-gov-blue/60 group" : ""
                  }`}
                >
                  {capturedImagePreview ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <img
                        src={capturedImagePreview}
                        alt="Geotagged Preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Geotag Applied</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5 text-center space-y-2">
                      <div className="w-11 h-11 rounded-full bg-gov-blue/20 text-gov-goldLight border border-gov-blue/30 flex items-center justify-center mx-auto group-hover:scale-110 transition duration-300 shadow-md">
                        <Camera className="w-5 h-5 text-gov-goldLight" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-100">
                          Take Accomplishment Photo
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">
                          Tap to open your device camera with automatic GPS burn-in
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerSystemCamera();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-gov-blue to-gov-dark hover:from-blue-700 hover:to-slate-900 text-white text-xs font-black rounded-xl shadow-lg border border-blue-400/30 flex items-center space-x-2 mx-auto transition active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5 text-gov-goldLight" />
                        <span>Open Unit Camera</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Hidden Native File Input with capture="environment" for unit camera */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeFileChange}
                  className="hidden"
                />
              </div>
            </form>

            {/* Fixed Modal Footer */}
            <div className="p-3 sm:p-4 border-t bg-slate-50 flex items-center justify-between gap-2 flex-shrink-0">
              {capturedImagePreview ? (
                <>
                  <button
                    type="button"
                    onClick={triggerSystemCamera}
                    className="py-2 px-3 sm:px-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>

                  <button
                    type="submit"
                    form="photo-upload-form"
                    disabled={submitting}
                    className="flex-1 py-2.5 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? "Uploading Proof..." : "CONFIRM & SUBMIT PHOTO"}</span>
                  </button>
                </>
              ) : (
                <div className="flex w-full justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Tap the camera box or button to snap photo
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-xl text-slate-700 hover:bg-white shadow-xs transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Storage Cleanup Modal (For PESO ADMIN) */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center space-x-2 text-rose-700">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Purge Accomplishment Photos (Storage Optimization)
              </h3>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <p className="font-bold">
                ⚠️ Warning: Permanently removes photo records from the system database.
              </p>
              <p className="text-[11px] leading-relaxed">
                Make sure you have already generated and exported your <strong>Accomplishment Report (.XLSX)</strong> before proceeding.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Select Purge Scope:</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 p-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="purgeScope"
                    checked={purgeType === "SELECTED"}
                    onChange={() => setPurgeType("SELECTED")}
                    disabled={selectedPhotoIds.length === 0}
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Delete Only Selected Photos ({selectedPhotoIds.length})
                  </span>
                </label>

                <label className="flex items-center space-x-2 p-2.5 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="purgeScope"
                    checked={purgeType === "ALL_APPROVED"}
                    onChange={() => setPurgeType("ALL_APPROVED")}
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Purge All Approved Photos for this Program ({photos.filter((p) => p.status === "APPROVED").length})
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold border rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgePhotos}
                disabled={purging || (purgeType === "SELECTED" && selectedPhotoIds.length === 0)}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{purging ? "Purging..." : "Confirm & Free Storage"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beneficiary QR Pass Generator & Screenshot Modal */}
      <FieldQrPassGeneratorModal
        isOpen={qrGeneratorOpen}
        onClose={() => setQrGeneratorOpen(false)}
      />
    </div>
  );
}
