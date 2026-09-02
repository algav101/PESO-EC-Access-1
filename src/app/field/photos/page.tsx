"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
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
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
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

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadBarangay, setUploadBarangay] = useState("Paltic");
  const [uploadSitio, setUploadSitio] = useState("Centro");
  const [uploadWorkDayId, setUploadWorkDayId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [workPrograms, setWorkPrograms] = useState<any[]>([]);
  const [uploadWorkDayNumber, setUploadWorkDayNumber] = useState<number>(1);
  const [uploadWorkProgramItemId, setUploadWorkProgramItemId] = useState<string>("");
  const [uploadWorkArea, setUploadWorkArea] = useState<string>("");
  const [uploadSpecificActivity, setUploadSpecificActivity] = useState<string>("");

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

  const handleCapturePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let lat = 15.3941;
      let lng = 121.3965;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          },
          () => {}
        );
      }

      const res = await fetch("/api/v1/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgramId,
          workDayId: uploadWorkDayId || undefined,
          workProgramItemId: uploadWorkProgramItemId || undefined,
          barangay: user?.role === "TUPAD_COORDINATOR" && user.assignedBarangay ? user.assignedBarangay : uploadBarangay,
          sitio: uploadSitio,
          workArea: uploadWorkArea || uploadSitio,
          specificActivity: uploadSpecificActivity,
          latitude: lat,
          longitude: lng,
          capturedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setIsUploadOpen(false);
        setUploadWorkProgramItemId("");
        setUploadWorkArea("");
        setUploadSpecificActivity("");
        fetchPhotos(selectedProgramId);
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

  // Delete / Purge Photo Storage Handler
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
  const isAdmin = user?.role === "PESO_ADMIN";

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
            Geotagged daily field proof with GPS timestamp overlays & storage optimization tools
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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
              <span>Prune / Delete Photos ({selectedPhotoIds.length || "All"})</span>
            </button>
          )}

          {!isDole && can("photo.upload") && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
            >
              <UploadCloud className="w-4 h-4 text-gov-goldLight" />
              <span>Upload Geotagged Photo</span>
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
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`gov-card overflow-hidden shadow group hover:shadow-lg transition flex flex-col justify-between ${
              selectedPhotoIds.includes(photo.id) ? "ring-2 ring-rose-500 bg-rose-50/20" : ""
            }`}
          >
            {/* Image Box */}
            <div className="relative aspect-video bg-slate-900 overflow-hidden">
              {/* Checkbox for Admin selection */}
              {isAdmin && (
                <div className="absolute top-2 left-2 z-20">
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

              {/* Mock Photo Display */}
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-gradient-to-br from-slate-800 to-slate-950">
                <Camera className="w-8 h-8 text-slate-500 mb-1 opacity-60" />
                <span className="text-[10px] font-mono text-slate-400">
                  {photo.specificActivity ? photo.specificActivity.slice(0, 30) + "..." : "Field Work Documentation"}
                </span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                  📍 {photo.workArea || photo.sitio || photo.barangay}
                </span>
              </div>

              {/* GPS Metadata Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-black/85 text-white p-2.5 text-[9px] font-mono leading-tight space-y-0.5">
                <div className="flex justify-between text-gov-goldLight font-bold">
                  <span>LGU DINGALAN • TUPAD</span>
                  <span>{photo.barangay}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>GPS: {photo.latitude.toFixed(5)}°N, {photo.longitude.toFixed(5)}°E</span>
                  <span>{formatDate(photo.capturedAt, "MM/dd/yy HH:mm")}</span>
                </div>
              </div>
            </div>

            {/* Admin Controls / Info */}
            <div className="p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span className="font-bold text-gov-blue">Work Day {photo.workDay?.dayNumber || 1}</span>
                <span>By: {photo.uploadedBy?.fullName || "Field Coordinator"}</span>
              </div>

              {photo.specificActivity && (
                <p className="text-[11px] text-slate-700 font-medium line-clamp-2">
                  <strong>Activity:</strong> {photo.specificActivity}
                </p>
              )}

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
        ))}
      </div>

      {photos.length === 0 && (
        <div className="gov-card p-12 text-center text-xs text-slate-400">
          No accomplishment photos uploaded for this program yet.
        </div>
      )}

      {/* Storage Cleanup & Purge Modal (For PESO ADMIN) */}
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

      {/* Upload Photo Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <form onSubmit={handleCapturePhoto} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Upload Geotagged Accomplishment Photo
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Work Day # *</label>
                <select
                  value={uploadWorkDayNumber}
                  onChange={(e) => setUploadWorkDayNumber(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                    <option key={d} value={d}>Day {d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Barangay (Project Location) *</label>
                <select
                  value={uploadBarangay}
                  disabled={user?.role === "TUPAD_COORDINATOR" && !!user.assignedBarangay}
                  onChange={(e) => setUploadBarangay(e.target.value)}
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

            {/* Dynamic Work Program Area / Activity selection */}
            {availableActivitiesForModal.length > 0 ? (
              <div>
                <label className="block text-xs font-bold text-gov-blue uppercase mb-1">
                  Select Work Program Activity & Area *
                </label>
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
                  className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-blue-50/60 font-semibold"
                >
                  <option value="">-- Choose scheduled activity for Day {uploadWorkDayNumber} --</option>
                  {availableActivitiesForModal.map((it: any) => (
                    <option key={it.id} value={it.id}>
                      [{it.area}] {it.specificActivities} ({it.totalCount || it.maleCount + it.femaleCount} Pax)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Work Area / Sitio</label>
                <input
                  type="text"
                  placeholder="e.g. Purok 1 or Barangay Covered Court"
                  value={uploadWorkArea}
                  onChange={(e) => setUploadWorkArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>
            )}

            {uploadSpecificActivity && (
              <div className="p-2.5 bg-slate-50 border rounded-lg text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Work Plan Activity:</span>
                <p className="text-slate-800 font-semibold">{uploadSpecificActivity}</p>
                <p className="text-gov-blue text-[11px] font-medium">📍 Area: {uploadWorkArea}</p>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-lg text-xs text-gov-blue">
              ✓ Device GPS coordinates & timestamp will be automatically embedded into the photo header.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 text-xs font-bold border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow"
              >
                {submitting ? "Uploading..." : "Save & Geotag Photo"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
