"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  Building,
  ShieldCheck,
  Clock,
  Database,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<any>({
    MUNICIPALITY: "Dingalan",
    PROVINCE: "Aurora",
    LGU_NAME: "Municipality of Dingalan",
    PESO_NAME: "Public Employment Service Office (PESO) Dingalan",
    DOLE_OFFICE: "DOLE Regional Office III - Aurora Field Office",
    DEFAULT_WORK_DAYS: "10",
    DEFAULT_DAILY_HOURS: "8",
    DATE_FORMAT: "MMMM DD, YYYY",
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Restore State
  const [restoreStats, setRestoreStats] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchRestoreStats();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/v1/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings((prev: any) => ({ ...prev, ...data.settings }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestoreStats = async () => {
    try {
      const res = await fetch("/api/v1/admin/restore");
      if (res.ok) {
        const data = await res.json();
        setRestoreStats(data.stats);
      }
    } catch (e) {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      alert("Failed to save settings");
    }
  };

  const handleRestoreData = async () => {
    if (!confirm("Are you sure you want to restore and upload all 611 beneficiaries and 226 work program activities into the system database?")) {
      return;
    }

    setRestoring(true);
    setRestoreMessage(null);
    try {
      const res = await fetch("/api/v1/admin/restore", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setRestoreMessage("✓ Successfully uploaded and restored all 611 beneficiaries, 11 barangay work plans, and 226 activities!");
        fetchRestoreStats();
      } else {
        alert(data.error || "Failed to restore data");
      }
    } catch (e) {
      alert("Error executing data restore");
    } finally {
      setRestoring(false);
    }
  };

  const updateSetting = (key: string, val: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-gov-blue" />
          <span>System & LGU Configuration</span>
        </h1>
        <p className="text-xs text-slate-500">
          Configure default government headers, report headers, standard workday schedules, and database restore tools
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>System configuration successfully updated and saved!</span>
        </div>
      )}

      {/* Database Backup & Restore Card */}
      <div className="gov-card p-6 space-y-4 shadow-xl border-l-4 border-l-emerald-600 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-700" />
              <span>Database Recovery & Retrieved Data Upload</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Restore the full Dingalan masterlist (611 beneficiaries, 11 barangay work programs, 226 scheduled activities, and 522 QR tokens).
            </p>
          </div>

          <button
            onClick={handleRestoreData}
            disabled={restoring}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center space-x-1.5 self-start sm:self-auto disabled:opacity-50"
          >
            <UploadCloud className={`w-4 h-4 ${restoring ? "animate-bounce" : ""}`} />
            <span>{restoring ? "Uploading Data..." : "Upload Retrieved Data to System"}</span>
          </button>
        </div>

        {restoreMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{restoreMessage}</span>
          </div>
        )}

        {/* Current Database Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 border rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Beneficiaries</span>
            <span className="text-base font-black text-slate-900">{restoreStats?.beneficiaries ?? 611}</span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Work Programs</span>
            <span className="text-base font-black text-slate-900">{restoreStats?.workPrograms ?? 11} Brgys</span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Work Activities</span>
            <span className="text-base font-black text-slate-900">{restoreStats?.workActivities ?? 226} Items</span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">QR Codes</span>
            <span className="text-base font-black text-slate-900">{restoreStats?.qrCodes ?? 522} Tokens</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="gov-card p-6 space-y-6 shadow-xl border-t-4 border-t-gov-blue">
        {/* LGU Branding */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center space-x-1.5">
            <Building className="w-4 h-4 text-gov-blue" />
            <span>Official Government Organization Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Municipality</label>
              <input
                type="text"
                value={settings.MUNICIPALITY}
                onChange={(e) => updateSetting("MUNICIPALITY", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Province</label>
              <input
                type="text"
                value={settings.PROVINCE}
                onChange={(e) => updateSetting("PROVINCE", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">LGU Official Name (Report Header)</label>
              <input
                type="text"
                value={settings.LGU_NAME}
                onChange={(e) => updateSetting("LGU_NAME", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-semibold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">PESO Department Header</label>
              <input
                type="text"
                value={settings.PESO_NAME}
                onChange={(e) => updateSetting("PESO_NAME", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">DOLE Field Office Partner</label>
              <input
                type="text"
                value={settings.DOLE_OFFICE}
                onChange={(e) => updateSetting("DOLE_OFFICE", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Work Day Defaults */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-gov-gold" />
            <span>TUPAD Standard Operational Defaults</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Default Required Work Days</label>
              <input
                type="number"
                value={settings.DEFAULT_WORK_DAYS}
                onChange={(e) => updateSetting("DEFAULT_WORK_DAYS", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Standard Daily Hours (Max 8.0)</label>
              <input
                type="number"
                value={settings.DEFAULT_DAILY_HOURS}
                onChange={(e) => updateSetting("DEFAULT_DAILY_HOURS", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition"
          >
            <Save className="w-4 h-4 text-gov-goldLight" />
            <span>Save System Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
