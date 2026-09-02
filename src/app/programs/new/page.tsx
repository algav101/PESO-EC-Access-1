"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  Briefcase,
  AlertCircle,
} from "lucide-react";

export default function NewProgramWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    programCode: `TUPAD-DGL-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    batchNumber: `Batch ${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    programName: "10-Day TUPAD Emergency Community Employment Program",
    municipality: "Dingalan",
    province: "Aurora",
    doleOffice: "DOLE Regional Office III - Aurora Field Office",

    // Step 2: Work Program
    projectLocation: "Municipality of Dingalan (11 Barangays)",
    natureOfWork: "Community clean-up, coastal rehabilitation, drainage declogging, and public facilities greening.",
    beneficiaryCount: 50,
    requiredWorkDays: 10,
    dailyHours: 8.0,
    morningStart: "08:00",
    morningEnd: "12:00",
    afternoonStart: "13:00",
    afternoonEnd: "17:00",

    // Step 3: Schedule
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    orientationDate: new Date().toISOString().split("T")[0],
    orientationTime: "08:30",
    orientationVenue: "Dingalan Municipal Gymnasium, Poblacion",
    payoutDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    payoutTime: "09:00",
    payoutVenue: "Dingalan Municipal Gymnasium",

    // Step 4: Barangays
    selectedBarangays: [
      "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
      "Dikapanikian", "Ibona", "Matawe", "Paltic",
      "Poblacion", "Tanawan", "Umiray"
    ],
  });

  const allBarangays = [
    "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
    "Dikapanikian", "Ibona", "Matawe", "Paltic",
    "Poblacion", "Tanawan", "Umiray"
  ];

  const updateField = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const toggleBarangay = (name: string) => {
    setFormData((prev) => {
      const exists = prev.selectedBarangays.includes(name);
      return {
        ...prev,
        selectedBarangays: exists
          ? prev.selectedBarangays.filter((b) => b !== name)
          : [...prev.selectedBarangays, name],
      };
    });
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          barangays: formData.selectedBarangays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create program");

      router.push(`/programs/${data.program.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <FolderKanban className="w-6 h-6 text-gov-blue" />
          <span>New TUPAD Work Program Wizard</span>
        </h1>
        <p className="text-xs text-slate-500">
          Configure project parameters, automatic 10-day workday generation, orientation and payout venues
        </p>
      </div>

      {/* Stepper */}
      <div className="gov-card p-4 grid grid-cols-5 gap-2 text-center text-xs font-bold">
        {[
          { num: 1, label: "Basic Info" },
          { num: 2, label: "Work Plan" },
          { num: 3, label: "Schedule" },
          { num: 4, label: "Barangays" },
          { num: 5, label: "Review" },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-2 rounded-lg transition ${
              step === s.num
                ? "bg-gov-blue text-white shadow"
                : step > s.num
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-50 text-slate-400"
            }`}
          >
            <span className="block text-[10px] uppercase font-mono">Step {s.num}</span>
            <span className="truncate">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="gov-card p-6 space-y-6">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Step 1: Program Identity & Offices
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Program Code *
                </label>
                <input
                  type="text"
                  value={formData.programCode}
                  onChange={(e) => updateField("programCode", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-gov-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => updateField("batchNumber", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Official Program Title *
                </label>
                <input
                  type="text"
                  value={formData.programName}
                  onChange={(e) => updateField("programName", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Municipality
                </label>
                <input
                  type="text"
                  value={formData.municipality}
                  onChange={(e) => updateField("municipality", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                  readOnly
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  DOLE Partner Field Office
                </label>
                <input
                  type="text"
                  value={formData.doleOffice}
                  onChange={(e) => updateField("doleOffice", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Step 2: Work Plan Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Project Location Scope
                </label>
                <input
                  type="text"
                  value={formData.projectLocation}
                  onChange={(e) => updateField("projectLocation", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nature / Scope of Work (TUPAD Activities)
                </label>
                <textarea
                  rows={2}
                  value={formData.natureOfWork}
                  onChange={(e) => updateField("natureOfWork", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Beneficiary Slots
                </label>
                <input
                  type="number"
                  value={formData.beneficiaryCount}
                  onChange={(e) => updateField("beneficiaryCount", parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Required Work Days (Default 10 Days)
                </label>
                <input
                  type="number"
                  value={formData.requiredWorkDays}
                  onChange={(e) => updateField("requiredWorkDays", parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-gov-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Morning Hours
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={formData.morningStart}
                    onChange={(e) => updateField("morningStart", e.target.value)}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="time"
                    value={formData.morningEnd}
                    onChange={(e) => updateField("morningEnd", e.target.value)}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Afternoon Hours
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={formData.afternoonStart}
                    onChange={(e) => updateField("afternoonStart", e.target.value)}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="time"
                    value={formData.afternoonEnd}
                    onChange={(e) => updateField("afternoonEnd", e.target.value)}
                    className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Step 3: Schedule, Orientation & Payout Venues
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Work Program Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Work Program End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 sm:col-span-2 space-y-3">
                <h3 className="text-xs font-bold text-gov-blue uppercase">Orientation Session</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.orientationDate}
                      onChange={(e) => updateField("orientationDate", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.orientationTime}
                      onChange={(e) => updateField("orientationTime", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Venue</label>
                    <input
                      type="text"
                      value={formData.orientationVenue}
                      onChange={(e) => updateField("orientationVenue", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 sm:col-span-2 space-y-3">
                <h3 className="text-xs font-bold text-emerald-800 uppercase">Payout Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.payoutDate}
                      onChange={(e) => updateField("payoutDate", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.payoutTime}
                      onChange={(e) => updateField("payoutTime", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Venue</label>
                    <input
                      type="text"
                      value={formData.payoutVenue}
                      onChange={(e) => updateField("payoutVenue", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Step 4: Target Barangays Selection (Dingalan, Aurora)
            </h2>
            <p className="text-xs text-slate-500">
              Select which barangays are participating in this TUPAD program batch:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {allBarangays.map((brgy) => {
                const checked = formData.selectedBarangays.includes(brgy);
                return (
                  <button
                    type="button"
                    key={brgy}
                    onClick={() => toggleBarangay(brgy)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      checked
                        ? "bg-blue-50 border-gov-blue text-gov-blue font-bold shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs">{brgy}</span>
                    <CheckCircle2 className={`w-4 h-4 ${checked ? "text-gov-blue" : "text-slate-300"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Step 5: Review & Initialize Program
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="gov-card p-4 bg-slate-50 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Program Overview</span>
                <p><strong className="text-slate-700">Code:</strong> {formData.programCode}</p>
                <p><strong className="text-slate-700">Title:</strong> {formData.programName}</p>
                <p><strong className="text-slate-700">Location:</strong> {formData.projectLocation}</p>
                <p><strong className="text-slate-700">Barangays:</strong> {formData.selectedBarangays.join(", ")}</p>
              </div>

              <div className="gov-card p-4 bg-slate-50 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Work Schedule</span>
                <p><strong className="text-slate-700">Work Days:</strong> {formData.requiredWorkDays} Days ({formData.dailyHours}h/day)</p>
                <p><strong className="text-slate-700">Orientation:</strong> {formData.orientationDate} at {formData.orientationVenue}</p>
                <p><strong className="text-slate-700">Payout:</strong> {formData.payoutDate} at {formData.payoutVenue}</p>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  ✓ Day 1 to Day {formData.requiredWorkDays} will be generated automatically upon creation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg flex items-center space-x-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 text-xs font-bold bg-gov-blue hover:bg-gov-light text-white rounded-lg shadow flex items-center space-x-1.5 transition"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="px-6 py-2.5 text-xs font-extrabold bg-gov-gold hover:bg-gov-goldLight text-gov-dark rounded-lg shadow-lg flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Generating Program & Work Days..." : "Confirm & Create Program"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
