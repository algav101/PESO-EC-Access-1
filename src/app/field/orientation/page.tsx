"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  Users,
  UserPlus,
  RefreshCw,
  BarChart3,
  Compass,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, queueOfflineTransaction } from "@/lib/dexie";
import { OrientationMonitoringTable } from "@/components/orientation/OrientationMonitoringTable";
import { Day1DeploymentModal, Day1DeploymentData } from "@/components/orientation/Day1DeploymentModal";

type ActiveTab = "SCANNER" | "MONITORING" | "DAY1_DEPLOYMENT";

export default function OrientationPage() {
  const { isOnline } = useOffline();
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>("SCANNER");

  // Orientation Attendance Scan State
  const [attendanceScannerOpen, setAttendanceScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState("");

  // Day 1 Deployment State
  const [day1ScannerOpen, setDay1ScannerOpen] = useState(false);
  const [day1Loading, setDay1Loading] = useState(false);
  const [day1Error, setDay1Error] = useState<string | null>(null);
  const [day1DeploymentData, setDay1DeploymentData] = useState<Day1DeploymentData | null>(null);
  const [day1ManualInput, setDay1ManualInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handler for Orientation Attendance Scan
  const handleAttendanceScan = async (token: string) => {
    setAttendanceScannerOpen(false);
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      if (isOnline) {
        const res = await fetch("/api/v1/orientation/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrToken: token,
            deviceId: typeof window !== "undefined" ? localStorage.getItem("tupad_device_id") || "MOBILE_DEVICE" : "MOBILE_DEVICE",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Orientation scan failed");

        setScanResult({
          alreadyRecorded: data.alreadyRecorded,
          message: data.message,
          data: data.data,
          isOffline: false,
        });
      } else {
        // Offline check
        const bene = await offlineDb.cachedBeneficiaries.where("qrToken").equals(token).first();
        if (!bene) throw new Error("QR Token not found in offline database");

        await queueOfflineTransaction("ORIENTATION", "CREATE", {
          programId: bene.programId,
          programBeneficiaryId: bene.id,
          status: "PRESENT",
        });

        setScanResult({
          alreadyRecorded: false,
          message: "Orientation Attendance Saved Offline (Queued for Sync)",
          data: {
            designatedNumber: bene.designatedNumber,
            fullName: bene.fullName,
            barangay: bene.barangay,
            tableNumber: bene.tableNumber,
            status: "PRESENT",
            scannedAt: new Date().toISOString(),
          },
          isOffline: true,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Day 1 Deployment QR Scan / Search
  const handleDay1Scan = async (token: string) => {
    setDay1ScannerOpen(false);
    setDay1Loading(true);
    setDay1Error(null);

    try {
      const res = await fetch("/api/v1/orientation/day1-deployment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Day 1 deployment lookup failed");
      }

      setDay1DeploymentData(data);
    } catch (err: any) {
      setDay1Error(err.message);
    } finally {
      setDay1Loading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full max-w-7xl mx-auto p-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-gov-blue animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading Orientation Hub...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-gov-navy via-gov-blue to-teal-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gov-gold text-slate-950 shadow-sm">
              STEP 2 OF 4
            </span>
            <span className="text-xs text-blue-200 font-mono">DOLE Aurora & PESO Dingalan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2.5">
            <CalendarCheck className="w-7 h-7 text-gov-goldLight" />
            <span>Orientation Verification & Monitoring Scheme</span>
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
            Verify DOLE orientation attendance, monitor affirmed stubs & flagged replacements, and deploy validated beneficiaries to their Day 1 activity based on nearest Purok priority.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab("SCANNER")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === "SCANNER"
                ? "bg-white text-gov-navy shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Attendance Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab("MONITORING")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === "MONITORING"
                ? "bg-white text-gov-navy shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Monitoring Scheme</span>
          </button>

          <button
            onClick={() => setActiveTab("DAY1_DEPLOYMENT")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === "DAY1_DEPLOYMENT"
                ? "bg-white text-gov-navy shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Compass className="w-4 h-4 text-gov-gold" />
            <span>Day 1 Deployment</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ORIENTATION ATTENDANCE SCANNER */}
      {activeTab === "SCANNER" && (
        <div className="max-w-xl mx-auto space-y-6">
          {!scanResult && (
            <div className="gov-card p-6 sm:p-8 text-center space-y-6 shadow-xl border-t-4 border-t-gov-blue">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border-4 border-teal-100 shadow-inner">
                <CalendarCheck className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Scan Beneficiary Orientation QR
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Fast-scan the beneficiary's physical or digital QR token to record official DOLE TUPAD Program Orientation attendance.
                </p>
              </div>

              <button
                onClick={() => setAttendanceScannerOpen(true)}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-gov-navy to-gov-blue hover:from-gov-blue hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-2.5 transition transform active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-5 h-5 text-gov-goldLight animate-pulse" />
                <span>LAUNCH CAMERA SCANNER</span>
              </button>

              {/* Manual Input Alternative */}
              <div className="pt-2 border-t border-slate-100">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualTokenInput.trim()) {
                      handleAttendanceScan(manualTokenInput.trim());
                    }
                  }}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="text"
                    placeholder="Or enter Slot # (e.g. 10) or QR token"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gov-blue text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={!manualTokenInput.trim() || loading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition disabled:opacity-40"
                  >
                    Lookup
                  </button>
                </form>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-xs text-red-700 shadow-sm animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1">
                <strong className="block font-bold">Scanning Alert</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Result View */}
          {scanResult && (
            <div
              className={`gov-card p-6 text-center space-y-4 shadow-xl border-t-4 ${
                scanResult.alreadyRecorded ? "border-t-amber-500" : "border-t-emerald-600"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  scanResult.alreadyRecorded
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    scanResult.alreadyRecorded ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {scanResult.isOffline
                    ? "OFFLINE — SAVED LOCALLY"
                    : scanResult.alreadyRecorded
                    ? "! ALREADY RECORDED PRESENT"
                    : "✓ ORIENTATION ATTENDANCE VERIFIED"}
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {scanResult.data.fullName}
                </h2>
                <div className="flex items-center justify-center space-x-2 text-xs font-mono font-bold text-gov-blue">
                  <span>Designated #{scanResult.data.designatedNumber}</span>
                  <span>•</span>
                  <span>{scanResult.data.barangay || "Dingalan"}</span>
                  <span>•</span>
                  <span>{scanResult.data.tableNumber || "Table 1"}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{scanResult.message}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-3">
                <button
                  onClick={() => {
                    setScanResult(null);
                    setAttendanceScannerOpen(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Next Beneficiary</span>
                </button>

                <button
                  onClick={() => {
                    handleDay1Scan(String(scanResult.data.designatedNumber));
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Compass className="w-4 h-4 text-gov-goldLight" />
                  <span>View Day 1 Activity</span>
                </button>
              </div>
            </div>
          )}

          {/* Fast Navigation banner to Day 1 Scanner */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Compass className="w-4 h-4 text-gov-blue" />
                <span>Need to check Day 1 Deployment Itinerary?</span>
              </span>
              <p className="text-[11px] text-slate-500">
                Scan Format 2 e-TUPAD Card ID to see nearest Purok activity assignment.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("DAY1_DEPLOYMENT")}
              className="px-3 py-1.5 bg-gov-blue text-white rounded-xl text-xs font-bold hover:bg-gov-light transition flex items-center space-x-1"
            >
              <span>Go to Day 1</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MONITORING SCHEME */}
      {activeTab === "MONITORING" && (
        <div className="space-y-4">
          <OrientationMonitoringTable
            onSelectBeneficiaryForDay1={(bene) => {
              handleDay1Scan(bene.qrToken || bene.designatedNumber);
            }}
          />
        </div>
      )}

      {/* TAB 3: DAY 1 ACTIVITY DEPLOYMENT SCANNER */}
      {activeTab === "DAY1_DEPLOYMENT" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="gov-card p-6 sm:p-8 text-center space-y-6 shadow-xl border-t-4 border-t-teal-600">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border-4 border-teal-100 shadow-inner">
              <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-teal-600" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>Format 2 e-TUPAD Card QR Scanner</span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-slate-900">
                Scan Assigned QR Code ID for Day 1 Activity
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Validated & oriented beneficiaries (including onsite replacements) can scan their assigned <strong className="text-gov-navy">Format 2 e-TUPAD Card</strong> to view their Day 1 activity schedule, nearest Purok priority deployment, and team quotas.
              </p>
            </div>

            <button
              onClick={() => setDay1ScannerOpen(true)}
              disabled={day1Loading}
              className="w-full py-4 bg-gradient-to-r from-teal-700 via-gov-blue to-gov-navy hover:from-teal-800 hover:to-slate-900 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-2.5 transition transform active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-5 h-5 text-gov-goldLight animate-pulse" />
              <span>SCAN FORMAT 2 QR CODE ID</span>
            </button>

            {/* Manual Lookup Form */}
            <div className="pt-3 border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (day1ManualInput.trim()) {
                    handleDay1Scan(day1ManualInput.trim());
                  }
                }}
                className="flex items-center space-x-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter Designated Slot # (e.g. 1, 10, 522) or Beneficiary Name"
                    value={day1ManualInput}
                    onChange={(e) => setDay1ManualInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!day1ManualInput.trim() || day1Loading}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition shadow disabled:opacity-40"
                >
                  {day1Loading ? "Searching..." : "Lookup"}
                </button>
              </form>
            </div>
          </div>

          {day1Error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-xs text-red-700 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1">
                <strong className="block font-bold">Lookup Alert</strong>
                <span>{day1Error}</span>
              </div>
            </div>
          )}

          {/* Info Card explaining Nearest Purok Priority Logic */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-gov-navy text-white rounded-3xl space-y-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-gov-gold" />
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                Nearest Purok Priority Deployment Logic
              </h4>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              The system analyzes the beneficiary's registered <span className="text-gov-gold font-bold">Sitio / Purok</span> in their barangay and automatically computes a proximity affinity score against the Barangay Work Program items for Day 1.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="font-bold text-gov-goldLight block text-[11px]">1. Nearest Purok Match</span>
                <span className="text-[10px] text-slate-300">Direct or overlapping Sitio proximity prioritized for work sector assignment.</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="font-bold text-blue-200 block text-[11px]">2. Gender & Team Quota</span>
                <span className="text-[10px] text-slate-300">Factors in male vs. female slot quotas and SC/PWD assignments per activity.</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="font-bold text-emerald-300 block text-[11px]">3. DOLE Validation Gate</span>
                <span className="text-[10px] text-slate-300">Only beneficiaries with affirmed stubs & DOLE orientation are cleared for site deployment.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal for Attendance */}
      <QrScannerModal
        isOpen={attendanceScannerOpen}
        onScan={handleAttendanceScan}
        onClose={() => setAttendanceScannerOpen(false)}
        title="Orientation Attendance Scanner"
        subtitle="Align beneficiary QR code inside the viewfinder"
      />

      {/* Camera Scanner Modal for Day 1 Activity Deployment */}
      <QrScannerModal
        isOpen={day1ScannerOpen}
        onScan={handleDay1Scan}
        onClose={() => setDay1ScannerOpen(false)}
        title="Format 2 e-TUPAD Card Scanner"
        subtitle="Scan beneficiary assigned Format 2 QR ID for Day 1 Activity"
      />

      {/* Day 1 Deployment Itinerary & e-TUPAD Card Modal */}
      <Day1DeploymentModal
        isOpen={!!day1DeploymentData}
        data={day1DeploymentData}
        onClose={() => setDay1DeploymentData(null)}
        onScanAnother={() => setDay1ScannerOpen(true)}
      />
    </div>
  );
}
