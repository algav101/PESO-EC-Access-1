"use client";

import React, { useState } from "react";
import {
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";
import { useOffline } from "@/context/OfflineContext";
import { offlineDb, queueOfflineTransaction } from "@/lib/dexie";
import { format } from "date-fns";

export default function PayoutScannerPage() {
  const { isOnline } = useOffline();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedBeneficiary, setScannedBeneficiary] = useState<any | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<"PAID" | "PRESENT_NOT_PAID" | "ABSENT">("PAID");
  const [remarks, setRemarks] = useState("");
  const [payoutResult, setPayoutResult] = useState<any | null>(null);

  const handleScan = async (token: string) => {
    setScannerOpen(false);
    setLoading(true);
    setError(null);
    setPayoutResult(null);

    try {
      if (isOnline) {
        // Look up beneficiary details
        const res = await fetch("/api/v1/stub-distribution/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: token }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid QR Code");

        setScannedBeneficiary({
          ...data.data,
          qrToken: token,
        });
      } else {
        // Offline lookup
        const bene = await offlineDb.cachedBeneficiaries.where("qrToken").equals(token).first();
        if (!bene) throw new Error("QR Token not found in offline database");

        setScannedBeneficiary({
          programBeneficiaryId: bene.id,
          designatedNumber: bene.designatedNumber,
          fullName: bene.fullName,
          barangay: bene.barangay,
          tableNumber: bene.tableNumber,
          qrToken: token,
          programId: bene.programId,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBeneficiary) return;

    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        const res = await fetch("/api/v1/payout/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrToken: scannedBeneficiary.qrToken,
            status: payoutStatus,
            remarks,
            payoutDate: format(new Date(), "yyyy-MM-dd"),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Payout processing failed");

        setPayoutResult({
          message: data.message,
          data: data.data,
          isOffline: false,
        });
      } else {
        // Offline Payout Queue
        await queueOfflineTransaction("PAYOUT", "CREATE", {
          programId: scannedBeneficiary.programId,
          programBeneficiaryId: scannedBeneficiary.programBeneficiaryId,
          status: payoutStatus,
          payoutDate: format(new Date(), "yyyy-MM-dd"),
          remarks,
        });

        setPayoutResult({
          message: `Payout (${payoutStatus}) Recorded & Saved Offline (Queued for Sync)`,
          data: scannedBeneficiary,
          isOffline: true,
        });
      }

      setScannedBeneficiary(null);
      setRemarks("");
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
          <Banknote className="w-6 h-6 text-gov-blue" />
          <span>Payout Verification Scanner</span>
        </h1>
        <p className="text-xs text-slate-500">
          Verify wages payout & trigger automatic 365-day program restriction lockout
        </p>
      </div>

      {/* Main Scan Trigger */}
      {!scannedBeneficiary && !payoutResult && (
        <div className="gov-card p-8 text-center space-y-6 shadow-xl border-t-4 border-t-emerald-600">
          <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border-4 border-emerald-100 shadow-inner">
            <Banknote className="w-12 h-12" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">Scan QR for Payout</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Scan the beneficiary's QR code to record wage release and automatically initialize the 365-day eligibility lock.
            </p>
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="w-full py-3.5 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95"
          >
            <Camera className="w-5 h-5 text-gov-goldLight" />
            <span>SCAN PAYOUT QR</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-xs text-red-700 shadow">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <strong className="block font-bold">Payout Error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Payout Confirmation Modal */}
      {scannedBeneficiary && (
        <form onSubmit={handleConfirmPayout} className="gov-card p-6 space-y-5 shadow-xl border-t-4 border-t-emerald-600">
          <div className="text-center space-y-1 pb-3 border-b border-slate-100">
            <span className="text-[10px] font-bold font-mono text-gov-blue uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Designated #{scannedBeneficiary.designatedNumber} • {scannedBeneficiary.tableNumber || "Table 1"}
            </span>
            <h2 className="text-lg font-black text-slate-900">{scannedBeneficiary.fullName}</h2>
            <p className="text-xs text-slate-500">Barangay {scannedBeneficiary.barangay}, Dingalan</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Payout Status *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayoutStatus("PAID")}
                className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                  payoutStatus === "PAID"
                    ? "bg-emerald-700 text-white border-emerald-800 shadow"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                PAID
              </button>
              <button
                type="button"
                onClick={() => setPayoutStatus("PRESENT_NOT_PAID")}
                className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                  payoutStatus === "PRESENT_NOT_PAID"
                    ? "bg-amber-600 text-white border-amber-700 shadow"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Not Paid
              </button>
              <button
                type="button"
                onClick={() => setPayoutStatus("ABSENT")}
                className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                  payoutStatus === "ABSENT"
                    ? "bg-rose-700 text-white border-rose-800 shadow"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ABSENT
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Remarks (Optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Claimed with Valid Postal ID"
              className="w-full px-3 py-2 text-xs border rounded-lg"
            />
          </div>

          {payoutStatus === "PAID" && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>Selecting PAID will automatically lock this beneficiary for 365 days.</span>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setScannedBeneficiary(null)}
              className="flex-1 py-2.5 text-xs font-bold text-slate-600 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow transition disabled:opacity-50"
            >
              {loading ? "Recording Payout..." : "Confirm Payout"}
            </button>
          </div>
        </form>
      )}

      {/* Payout Success Feedback */}
      {payoutResult && (
        <div className="gov-card p-6 text-center space-y-4 shadow-xl border-t-4 border-t-emerald-600">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {payoutResult.isOffline ? "OFFLINE — SAVED LOCALLY" : "✓ PAYOUT TRANSACTION RECORDED"}
            </span>
            <h2 className="text-base font-black text-slate-900">
              {payoutResult.data.fullName} (#{payoutResult.data.designatedNumber})
            </h2>
            <p className="text-xs text-slate-500">{payoutResult.message}</p>
          </div>

          <button
            onClick={() => {
              setPayoutResult(null);
              setScannerOpen(true);
            }}
            className="w-full py-3 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
          >
            Scan Next Payout
          </button>
        </div>
      )}

      {/* Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        title="Payout QR Scanner"
        subtitle="Align beneficiary QR code inside viewfinder"
      />
    </div>
  );
}
