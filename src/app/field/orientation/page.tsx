"use client";

import React, { useState } from "react";
import {
  CalendarCheck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  Users,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, queueOfflineTransaction } from "@/lib/dexie";

export default function OrientationPage() {
  const { isOnline } = useOffline();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const handleScan = async (token: string) => {
    setScannerOpen(false);
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
            deviceId: localStorage.getItem("tupad_device_id") || "MOBILE_DEVICE",
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

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center justify-center space-x-2">
          <CalendarCheck className="w-6 h-6 text-gov-blue" />
          <span>Orientation QR Scanner</span>
        </h1>
        <p className="text-xs text-slate-500">
          Fast-scan beneficiaries attending the official TUPAD Program Orientation
        </p>
      </div>

      {/* Main Scan Trigger */}
      {!scanResult && (
        <div className="gov-card p-8 text-center space-y-6 shadow-xl border-t-4 border-t-gov-blue">
          <div className="w-24 h-24 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border-4 border-teal-100 shadow-inner">
            <CalendarCheck className="w-12 h-12" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">Scan Beneficiary QR</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Aim camera at beneficiary's physical or digital QR token to verify orientation presence.
            </p>
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="w-full py-3.5 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95"
          >
            <Camera className="w-5 h-5 text-gov-goldLight" />
            <span>SCAN ORIENTATION QR</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-xs text-red-700 shadow">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <strong className="block font-bold">Scanning Alert</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Result Modal View */}
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
              className={`text-[10px] font-bold uppercase tracking-wider ${
                scanResult.alreadyRecorded ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {scanResult.isOffline
                ? "OFFLINE — SAVED LOCALLY"
                : scanResult.alreadyRecorded
                ? "! ALREADY RECORDED"
                : "✓ VERIFIED PRESENT"}
            </span>
            <h2 className="text-base font-black text-slate-900">
              {scanResult.data.fullName}
            </h2>
            <div className="flex items-center justify-center space-x-2 text-xs font-mono font-bold text-gov-blue">
              <span>Designated #{scanResult.data.designatedNumber}</span>
              <span>•</span>
              <span>{scanResult.data.tableNumber || "Table 1"}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{scanResult.message}</p>
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            <button
              onClick={() => {
                setScanResult(null);
                setScannerOpen(true);
              }}
              className="w-full py-3 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
            >
              Scan Next Beneficiary
            </button>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        title="Orientation QR Scanner"
        subtitle="Align beneficiary QR code inside viewfinder"
      />
    </div>
  );
}
