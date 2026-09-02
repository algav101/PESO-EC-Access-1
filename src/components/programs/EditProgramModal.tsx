"use client";

import React, { useState, useEffect } from "react";
import {
  FolderEdit,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Calendar,
  Clock,
  Building2,
  Briefcase,
  Layers,
} from "lucide-react";

interface EditProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: any;
  onProgramUpdated: () => void;
}

const DINGALAN_BARANGAYS = [
  "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
  "Dikapanikian", "Ibona", "Matawe", "Paltic",
  "Poblacion", "Tanawan", "Umiray"
];

export function EditProgramModal({
  isOpen,
  onClose,
  program,
  onProgramUpdated,
}: EditProgramModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (program) {
      setFormData({
        programCode: program.programCode || "",
        batchNumber: program.batchNumber || "",
        programName: program.programName || "",
        status: program.status || "DRAFT",
        municipality: program.municipality || "Dingalan",
        province: program.province || "Aurora",
        doleOffice: program.doleOffice || "DOLE Regional Office III - Aurora Field Office",
        projectLocation: program.projectLocation || "Municipality of Dingalan",
        natureOfWork: program.natureOfWork || "Community clean-up and social infrastructure support",
        requiredWorkDays: program.requiredWorkDays || 10,
        dailyHours: program.dailyHours || 8.0,
        morningStart: program.morningStart || "08:00",
        morningEnd: program.morningEnd || "12:00",
        afternoonStart: program.afternoonStart || "13:00",
        afternoonEnd: program.afternoonEnd || "17:00",
        startDate: program.startDate || "",
        endDate: program.endDate || "",
        orientationDate: program.orientationDate || "",
        orientationTime: program.orientationTime || "08:30",
        orientationVenue: program.orientationVenue || "Dingalan Municipal Gymnasium, Poblacion",
        payoutDate: program.payoutDate || "",
        payoutTime: program.payoutTime || "09:00",
        payoutVenue: program.payoutVenue || "Dingalan Municipal Gymnasium",
      });

      const currentBrgys = (program.programBarangays || []).map((b: any) => b.barangayName);
      setSelectedBarangays(currentBrgys.length > 0 ? currentBrgys : DINGALAN_BARANGAYS);
    }
  }, [program]);

  if (!isOpen || !program) return null;

  const handleBarangayToggle = (brgy: string) => {
    if (selectedBarangays.includes(brgy)) {
      setSelectedBarangays(selectedBarangays.filter((b) => b !== brgy));
    } else {
      setSelectedBarangays([...selectedBarangays, brgy]);
    }
  };

  const handleSelectAllBarangays = () => {
    setSelectedBarangays(DINGALAN_BARANGAYS);
  };

  const handleClearAllBarangays = () => {
    setSelectedBarangays([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    if (!formData.programCode?.trim() || !formData.programName?.trim()) {
      setError("Program Code and Program Name are required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          participatingBarangays: selectedBarangays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update program");

      setSuccessMsg("Program details successfully updated!");
      onProgramUpdated();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gov-blue text-gov-goldLight">
              <FolderEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center space-x-2">
                <span>Edit Work Program Parameters</span>
              </h3>
              <p className="text-[11px] text-slate-300">
                {program.programCode} • {program.programName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: General Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-gov-blue" />
              <span>1. General Program Identification</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Program Code *</label>
                <input
                  type="text"
                  value={formData.programCode || ""}
                  onChange={(e) => setFormData({ ...formData, programCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch / Sub-Code</label>
                <input
                  type="text"
                  value={formData.batchNumber || ""}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="e.g. Batch 1"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lifecycle Status *</label>
                <select
                  value={formData.status || "DRAFT"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                >
                  <option value="DRAFT">DRAFT (Roster Preparation)</option>
                  <option value="ACTIVE">ACTIVE (Ongoing Operations)</option>
                  <option value="COMPLETED">COMPLETED (Pending Final Payout)</option>
                  <option value="CLOSED">CLOSED (Archived & Locked)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Program Title / Name *</label>
                <input
                  type="text"
                  value={formData.programName || ""}
                  onChange={(e) => setFormData({ ...formData, programName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Partner DOLE Office</label>
                <input
                  type="text"
                  value={formData.doleOffice || ""}
                  onChange={(e) => setFormData({ ...formData, doleOffice: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Work Scope & Hours */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gov-blue" />
              <span>2. Work Location, Schedule & Shifts</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Project Location</label>
                <input
                  type="text"
                  value={formData.projectLocation || ""}
                  onChange={(e) => setFormData({ ...formData, projectLocation: e.target.value })}
                  placeholder="e.g. Municipality of Dingalan (11 Barangays)"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Required Work Days</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.requiredWorkDays || 10}
                  onChange={(e) => setFormData({ ...formData, requiredWorkDays: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 border rounded-lg font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">Scope / Nature of Work</label>
                <textarea
                  rows={2}
                  value={formData.natureOfWork || ""}
                  onChange={(e) => setFormData({ ...formData, natureOfWork: e.target.value })}
                  placeholder="e.g. Community clean-up, coastal rehabilitation, drainage declogging..."
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Daily Hours (Hours/Day)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.dailyHours || 8.0}
                  onChange={(e) => setFormData({ ...formData, dailyHours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Morning Shift (In - Out)</label>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="time"
                    value={formData.morningStart || "08:00"}
                    onChange={(e) => setFormData({ ...formData, morningStart: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                  <input
                    type="time"
                    value={formData.morningEnd || "12:00"}
                    onChange={(e) => setFormData({ ...formData, morningEnd: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Afternoon Shift (In - Out)</label>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="time"
                    value={formData.afternoonStart || "13:00"}
                    onChange={(e) => setFormData({ ...formData, afternoonStart: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                  <input
                    type="time"
                    value={formData.afternoonEnd || "17:00"}
                    onChange={(e) => setFormData({ ...formData, afternoonEnd: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Key Milestone Dates & Venues */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-gov-blue" />
              <span>3. Milestones, Orientation & Payout Schedule</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Start Date</label>
                <input
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Work End Date</label>
                <input
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Orientation Date & Time</label>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="date"
                    value={formData.orientationDate || ""}
                    onChange={(e) => setFormData({ ...formData, orientationDate: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                  <input
                    type="time"
                    value={formData.orientationTime || "08:30"}
                    onChange={(e) => setFormData({ ...formData, orientationTime: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Orientation Venue</label>
                <input
                  type="text"
                  value={formData.orientationVenue || ""}
                  onChange={(e) => setFormData({ ...formData, orientationVenue: e.target.value })}
                  placeholder="e.g. Dingalan Municipal Gymnasium, Poblacion"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payout Date & Time</label>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="date"
                    value={formData.payoutDate || ""}
                    onChange={(e) => setFormData({ ...formData, payoutDate: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                  <input
                    type="time"
                    value={formData.payoutTime || "09:00"}
                    onChange={(e) => setFormData({ ...formData, payoutTime: e.target.value })}
                    className="w-full p-1.5 border rounded bg-slate-50"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">Payout Venue</label>
                <input
                  type="text"
                  value={formData.payoutVenue || ""}
                  onChange={(e) => setFormData({ ...formData, payoutVenue: e.target.value })}
                  placeholder="e.g. Dingalan Municipal Gymnasium"
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Participating Barangays */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-gov-blue" />
                <span>4. Participating Barangays ({selectedBarangays.length} Selected)</span>
              </h4>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllBarangays}
                  className="text-[11px] font-bold text-gov-blue hover:underline"
                >
                  Select All 11
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleClearAllBarangays}
                  className="text-[11px] font-bold text-slate-500 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {DINGALAN_BARANGAYS.map((brgy) => {
                const isChecked = selectedBarangays.includes(brgy);
                return (
                  <label
                    key={brgy}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      isChecked
                        ? "bg-blue-50/80 border-gov-blue text-gov-blue font-bold shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleBarangayToggle(brgy)}
                      className="rounded text-gov-blue focus:ring-gov-blue h-3.5 w-3.5"
                    />
                    <span className="text-xs">{brgy}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-2 pt-4 border-t flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gov-blue hover:bg-gov-light text-white font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-gov-gold" />}
              <span>{saving ? "Saving Changes..." : "Save Program Updates"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
