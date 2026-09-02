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
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/utils";

export default function PhotosPage() {
  const { user, can } = useAuth();

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (selectedProgramId) {
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

  // Filter activities for active upload modal Barangay + Day
  const activeWp = workPrograms.find(
    (w) => w.barangay.toUpperCase() === uploadBarangay.toUpperCase()
  );
  const availableActivitiesForModal = (activeWp?.items || []).filter(
    (it: any) => it.dayNumber === uploadWorkDayNumber
  );

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
          barangay: uploadBarangay,
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

  const currentProgram = programs.find((p) => p.id === selectedProgramId);
  const isDole = user?.role === "DOLE_COORDINATOR";

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
            {isDole
              ? "DOLE View: Verified & approved accomplishment photo gallery"
              : "Geotagged field photo capture, GPS timestamp overlay, and TUPAD Work Program activity tagging"}
          </p>
        </div>

        {!isDole && can("photo.upload") && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
          >
            <Camera className="w-4 h-4 text-gov-goldLight" />
            <span>Capture / Upload Photo</span>
          </button>
        )}
      </div>

      {/* Program Selector */}
      <div className="gov-card p-4 flex items-center space-x-3">
        <span className="text-xs font-bold text-slate-700">Program:</span>
        <select
          value={selectedProgramId}
          onChange={(e) => setSelectedProgramId(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue"
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.programCode} - {p.programName}
            </option>
          ))}
        </select>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => (
          <div key={photo.id} className="gov-card overflow-hidden flex flex-col justify-between space-y-3 shadow-md">
            {/* Simulated Rendered Geotagged Photo Frame */}
            <div className="h-60 bg-slate-950 relative flex flex-col justify-between p-3 text-white border-b">
              {/* Top Tag */}
              <div className="flex justify-between items-start">
                <span className="bg-black/60 backdrop-blur-sm text-gov-goldLight px-2 py-0.5 rounded text-[9px] font-bold border border-white/20">
                  DOLE-TUPAD Dingalan
                </span>
                <StatusBadge status={photo.status} />
              </div>

              <div className="flex items-center justify-center">
                <Camera className="w-10 h-10 text-slate-600" />
              </div>

              {/* Bottom Geotag Overlay */}
              <div className="bg-black/85 backdrop-blur-md p-2.5 rounded-lg border border-white/20 text-[10px] space-y-0.5">
                <div className="flex items-center space-x-1 text-gov-goldLight font-bold">
                  <MapPin className="w-3 h-3 text-gov-gold flex-shrink-0" />
                  <span className="truncate">Brgy. {photo.barangay}{photo.workArea ? ` • ${photo.workArea}` : ""}</span>
                </div>
                {photo.specificActivity && (
                  <p className="text-slate-200 text-[9px] line-clamp-1 italic">
                    "{photo.specificActivity}"
                  </p>
                )}
                <div className="flex justify-between text-slate-300 font-mono text-[9px] pt-0.5">
                  <span>GPS: {photo.latitude?.toFixed(5)}°N, {photo.longitude?.toFixed(5)}°E</span>
                  <span>{formatDate(photo.capturedAt, "yyyy-MM-dd HH:mm")}</span>
                </div>
              </div>
            </div>

            {/* Admin Controls / Info */}
            <div className="p-4 pt-0 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span className="font-bold text-gov-blue">Work Day {photo.workDay?.dayNumber || 1}</span>
                <span>Uploaded by {photo.uploadedBy?.fullName || "Field Coordinator"}</span>
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
        ))}
      </div>

      {photos.length === 0 && (
        <div className="gov-card p-12 text-center text-xs text-slate-400">
          No accomplishment photos uploaded for this program yet.
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
                  onChange={(e) => setUploadBarangay(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 font-bold"
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
