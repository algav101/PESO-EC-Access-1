"use client";

import React, { useEffect, useState, useRef } from "react";
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
  SwitchCamera,
  X,
  Maximize2,
  FileImage,
  Info,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FieldQrPassGeneratorModal } from "@/components/field/FieldQrPassGeneratorCard";
import { formatDate } from "@/lib/utils";

export default function PhotosPage() {
  const { user, can } = useAuth();

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
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

  // Camera Viewfinder & Geotag Preview state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({ lat: 15.3941, lng: 121.3965 });
  const [gpsStatus, setGpsStatus] = useState<string>("Locating GPS...");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [workPrograms, setWorkPrograms] = useState<any[]>([]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay) {
      setUploadBarangay(user.assignedBarangay);
    }
  }, [user]);

  useEffect(() => {
    if (selectedProgramId) {
      setSelectedPhotoIds([]);
      fetchPhotos(selectedProgramId);
      fetchWorkPrograms(selectedProgramId);
    }
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

  // Clean up camera stream when modal closes
  useEffect(() => {
    if (!isUploadOpen) {
      stopCamera();
      setCapturedImagePreview(null);
      setCameraActive(false);
      setCameraError(null);
    }
  }, [isUploadOpen]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        setPrograms(progs);
        if (progs.length > 0) {
          setSelectedProgramId(progs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkPrograms = async (progId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${progId}/work-program`);
      if (res.ok) {
        const data = await res.json();
        setWorkPrograms(data.workPrograms || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPhotos = async (progId: string) => {
    try {
      const res = await fetch(`/api/v1/photos?programId=${progId}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Camera Management
  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera access unavailable. You can use the Native Device Camera button below.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Burn Geotag Data Directly into Image Canvas
  const processAndBurnGeotag = (sourceElement: HTMLVideoElement | HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const width = sourceElement instanceof HTMLVideoElement ? sourceElement.videoWidth || 1280 : sourceElement.naturalWidth || 1280;
    const height = sourceElement instanceof HTMLVideoElement ? sourceElement.videoHeight || 720 : sourceElement.naturalHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw base captured photo
    ctx.drawImage(sourceElement, 0, 0, width, height);

    // Dynamic sizing based on canvas width
    const baseFontSize = Math.max(12, Math.round(width * 0.022));
    const smallFontSize = Math.max(10, Math.round(width * 0.016));
    const padding = Math.round(width * 0.02);

    // 1. Top Header Banner
    const topBannerHeight = Math.round(height * 0.09);
    ctx.fillStyle = "rgba(10, 25, 47, 0.88)";
    ctx.fillRect(0, 0, width, topBannerHeight);

    ctx.fillStyle = "#F59E0B"; // Gold
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    ctx.fillText("🇵🇭 LGU DINGALAN • DOLE TUPAD ACCOMPLISHMENT PROOF", padding, topBannerHeight * 0.48);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${smallFontSize}px monospace`;
    ctx.textAlign = "right";
    ctx.fillText(`DAY ${uploadWorkDayNumber} • BRGY. ${uploadBarangay.toUpperCase()}`, width - padding, topBannerHeight * 0.48);
    ctx.textAlign = "left";

    // 2. Bottom Geotag & Activity Banner
    const bottomBannerHeight = Math.round(height * 0.22);
    const bottomY = height - bottomBannerHeight;

    ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
    ctx.fillRect(0, 0, width, bottomBannerHeight);
    ctx.fillRect(0, bottomY, width, bottomBannerHeight);

    // Top gold accent line
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(0, bottomY, width, 4);

    const lineSpacing = Math.round(bottomBannerHeight * 0.22);

    // Line 1: Work Area & Location
    ctx.fillStyle = "#93C5FD"; // Light Blue
    ctx.font = `bold ${smallFontSize}px monospace`;
    ctx.fillText("📍 LOCATION & WORK AREA:", padding, bottomY + lineSpacing * 1);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    ctx.fillText(`${uploadWorkArea || uploadSitio || uploadBarangay} (Barangay ${uploadBarangay})`, padding + Math.round(width * 0.28), bottomY + lineSpacing * 1);

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
    ctx.fillText(`Documented by: ${user?.fullName || "Field Coordinator"} • LGU Dingalan TUPAD Engine`, padding, bottomY + lineSpacing * 3.9);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImagePreview(dataUrl);
    stopCamera();
  };

  // Capture from live video feed
  const snapLivePhoto = () => {
    if (videoRef.current) {
      processAndBurnGeotag(videoRef.current);
    }
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
    try {
      const res = await fetch("/api/v1/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgramId,
          workDayNumber: uploadWorkDayNumber,
          workProgramItemId: uploadWorkProgramItemId || undefined,
          barangay: user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay ? user.assignedBarangay : uploadBarangay,
          sitio: uploadSitio,
          workArea: uploadWorkArea || uploadSitio,
          specificActivity: uploadSpecificActivity,
          photoData: capturedImagePreview,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lng,
          capturedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setIsUploadOpen(false);
        setCapturedImagePreview(null);
        setUploadWorkProgramItemId("");
        setUploadWorkArea("");
        setUploadSpecificActivity("");
        fetchPhotos(selectedProgramId);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload accomplishment photo");
      }
    } catch (e) {
      alert("Failed to upload accomplishment photo");
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
    if (selectedPhotoIds.length === photos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(photos.map((p) => p.id));
    }
  };

  const currentProgram = programs.find((p) => p.id === selectedProgramId);
  const isDole = user?.role === "DOLE_COORDINATOR";
  const isAdmin = isAdminUser(user);

  // Filter activities for active upload modal Barangay + Day
  const activeWp = workPrograms.find(
    (w) => w.barangay.toUpperCase() === uploadBarangay.toUpperCase()
  );
  const availableActivitiesForModal = (activeWp?.items || []).filter(
    (it: any) => it.dayNumber === uploadWorkDayNumber
  );

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

      {/* Program Selector & Stats Bar */}
      <div className="gov-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase">Select Program:</label>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold border rounded-lg bg-slate-50 min-w-[280px]"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} - {p.programName}
              </option>
            ))}
          </select>
        </div>

        {/* Storage Metrics & Multi-Select bar */}
        <div className="flex items-center space-x-3 text-xs">
          {isAdmin && photos.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-gov-blue font-bold hover:underline"
            >
              {selectedPhotoIds.length === photos.length ? "Deselect All" : "Select All"}
            </button>
          )}
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg">
            Total Photos: <strong>{photos.length}</strong>
          </span>
          {selectedPhotoIds.length > 0 && (
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-lg">
              {selectedPhotoIds.length} Selected
            </span>
          )}
        </div>
      </div>

      {/* Coordinator Scoped Scope Banner */}
      {user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>Assigned Coordinator Scope: Showing photos for <strong>Barangay {user.assignedBarangay}</strong> only.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-950 rounded uppercase tracking-wider">
            Barangay Restricted
          </span>
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => {
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

      {photos.length === 0 && (
        <div className="gov-card p-12 text-center text-xs text-slate-400">
          No accomplishment photos uploaded for this program yet.
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

      {/* Live Camera & Geotag Photo Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePhoto}
            className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-fadeIn my-auto max-h-[95vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-gov-blue" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Take Geotagged Accomplishment Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select Scope & Activity */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold focus:border-gov-blue"
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
                    disabled={user?.role === "TUPAD_COORDINATOR" && !!user.assignedBarangay}
                    onChange={(e) => {
                      setUploadBarangay(e.target.value);
                      setUploadWorkProgramItemId("");
                    }}
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold disabled:bg-slate-100"
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
                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-blue-50/50 font-semibold focus:outline-none focus:border-gov-blue"
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
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:border-gov-blue"
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
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:border-gov-blue"
                />
              </div>
            </div>

            {/* Step 2: Camera Viewfinder / Preview Section */}
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-gov-blue" />
                  <span>Camera Viewfinder & Geotag Preview</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {gpsStatus}
                </span>
              </div>

              {/* Viewfinder Box */}
              <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
                {/* 1. Captured Preview */}
                {capturedImagePreview ? (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedImagePreview}
                      alt="Geotagged Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      ✓ Geotag Applied
                    </div>
                  </div>
                ) : cameraActive ? (
                  /* 2. Live Video Feed */
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Live overlay guide */}
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white p-2 rounded text-[10px] font-mono flex justify-between">
                      <span>LGU DINGALAN • BRGY. {uploadBarangay.toUpperCase()}</span>
                      <span>GPS: {gpsCoords.lat.toFixed(4)}°N, {gpsCoords.lng.toFixed(4)}°E</span>
                    </div>
                  </div>
                ) : (
                  /* 3. Camera Start Prompt */
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6 text-gov-goldLight" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">Ready to Document Field Proof</p>
                      <p className="text-[11px] text-slate-400">
                        Launch the live camera or snap directly using your phone's camera
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera("environment")}
                        className="px-3.5 py-2 bg-gov-blue hover:bg-gov-dark text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition"
                      >
                        <Camera className="w-4 h-4 text-gov-goldLight" />
                        <span>Open Live Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-600 shadow flex items-center space-x-1.5 transition"
                      >
                        <FileImage className="w-4 h-4 text-emerald-400" />
                        <span>Phone Camera / Gallery</span>
                      </button>
                    </div>

                    {cameraError && (
                      <p className="text-[11px] text-rose-400 font-semibold">{cameraError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Hidden Native File Input for Mobile Capture */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativeFileChange}
                className="hidden"
              />

              {/* Action Controls when Camera / Preview is Active */}
              {cameraActive && !capturedImagePreview && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center space-x-1 transition"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span className="hidden sm:inline">Flip Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={snapLivePhoto}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition animate-pulse"
                  >
                    <Camera className="w-4 h-4" />
                    <span>SNAP GEOTAGGED PICTURE</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {capturedImagePreview && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImagePreview(null);
                      startCamera();
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? "Uploading Geotagged Proof..." : "CONFIRM & SUBMIT PHOTO"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            {!capturedImagePreview && !cameraActive && (
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-bold border rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            )}
          </form>
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
