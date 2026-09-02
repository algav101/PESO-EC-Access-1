"use client";

import React, { useEffect, useState } from "react";
import { Settings, Save, CheckCircle2, Building, ShieldCheck, Clock } from "lucide-react";

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

  useEffect(() => {
    fetchSettings();
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
          Configure default government headers, report headers, standard workday schedules, and audit parameters
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>System configuration successfully updated and saved!</span>
        </div>
      )}

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
