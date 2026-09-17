"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Search,
  Download,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  Camera,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Building,
  Layers,
  Compass,
  ArrowRight,
  Maximize2,
  Navigation,
} from "lucide-react";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { offlineDb, extractCleanQrToken } from "@/lib/dexie";
import { formatBeneficiaryQrPayload } from "@/lib/qr";

const DINGALAN_BARANGAYS = [
  "ALL",
  "Aplaya",
  "Butas Na Bato",
  "Cabischasan",
  "Caragsacan",
  "Davil-davilan",
  "Dikapanikian",
  "Ibona",
  "Paltic",
  "Poblacion",
  "Tanawan",
  "Umiray",
];

interface FieldQrPassGeneratorCardProps {
  initialSlot?: string;
  initialBarangay?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function FieldQrPassGeneratorCard({
  initialSlot = "",
  initialBarangay = "ALL",
  onClose,
  isModal = false,
}: FieldQrPassGeneratorCardProps) {
  const [searchTerm, setSearchTerm] = useState(initialSlot || "");
  const [selectedBarangay, setSelectedBarangay] = useState(initialBarangay || "ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beneficiariesList, setBeneficiariesList] = useState<any[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const passCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQrPasses(initialSlot || "", selectedBarangay);
  }, []);

  const fetchQrPasses = async (query: string, brgy: string) => {
    setLoading(true);
    setError(null);
    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const params = new URLSearchParams();
        if (query && query.trim()) params.set("query", query.trim());
        if (brgy && brgy !== "ALL") params.set("barangay", brgy);

        const res = await fetch(`/api/v1/field/qr-pass?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.beneficiaries) && json.beneficiaries.length > 0) {
            setBeneficiariesList(json.beneficiaries);
            setSelectedBeneficiary(json.beneficiaries[0]);
            setSelectedDay(1);
            return;
          }
        }
      }
    } catch (err: any) {
      console.warn("Online QR pass fetch failed, falling back to offline cache:", err);
    }

    // Offline QR Pass Fallback from IndexedDB
    try {
      let cached = await offlineDb.cachedBeneficiaries.toArray();
      if (brgy && brgy !== "ALL") {
        cached = cached.filter((b) => b.barangay?.toUpperCase() === brgy.toUpperCase());
      }
      if (query && query.trim()) {
        const clean = extractCleanQrToken(query).toUpperCase();
        cached = cached.filter(
          (b) =>
            b.designatedNumber === clean ||
            (parseInt(clean, 10) > 0 && parseInt(b.designatedNumber, 10) === parseInt(clean, 10)) ||
            b.fullName?.toUpperCase().includes(clean) ||
            b.qrToken?.toUpperCase().includes(clean)
        );
      }

      if (cached.length === 0) {
        setError("Walang nahanap na benepisyaryo sa offline database cache.");
        setBeneficiariesList([]);
        setSelectedBeneficiary(null);
        return;
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const formatted = await Promise.all(
        cached.map(async (b) => {
          const qrPayload = b.qrToken
            ? formatBeneficiaryQrPayload(b.qrToken, origin)
            : `${origin}/my-assignment?token=${b.designatedNumber}`;
          let qrDataUrl = "";
          try {
            qrDataUrl = await QRCode.toDataURL(qrPayload, {
              width: 250,
              margin: 1,
              color: { dark: "#0c3b6d", light: "#ffffff" },
              errorCorrectionLevel: "H",
            });
          } catch {}

          return {
            id: b.id,
            designatedNumber: b.designatedNumber,
            tableNumber: b.tableNumber || "Table 1",
            beneficiary: {
              fullName: b.fullName,
              barangay: b.barangay,
              sitio: b.sitio || "Centro",
              birthday: b.birthday,
            },
            qr: {
              publicToken: b.qrToken || `TUPAD-DGL-OFFLINE-${b.designatedNumber}`,
              qrDataUrl,
              qrPayloadUrl: qrPayload,
            },
            currentAssignment: {
              area: `Brgy. ${b.barangay || "Dingalan"} Work Area`,
              specificActivity: "Community Clearing & Environmental Protection",
              workDate: "Day 1",
            },
          };
        })
      );

      setBeneficiariesList(formatted);
      setSelectedBeneficiary(formatted[0]);
      setSelectedDay(1);
    } catch (err: any) {
      setError("Nabigong ikarga ang offline QR pass: " + err.message);
      setBeneficiariesList([]);
      setSelectedBeneficiary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQrPasses(searchTerm, selectedBarangay);
  };

  const handleCopyLink = () => {
    if (!selectedBeneficiary?.qr?.qrPayloadUrl) return;
    try {
      navigator.clipboard.writeText(selectedBeneficiary.qr.qrPayloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }
  };

  const handleDownloadImage = async () => {
    if (!passCardRef.current || !selectedBeneficiary) return;
    setDownloading(true);

    try {
      // Dynamically load html2canvas
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(passCardRef.current, {
        scale: 3, // High DPI for crisp QR scanning
        useCORS: true,
        backgroundColor: "#020617",
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      const sanitizedName = (selectedBeneficiary?.beneficiary?.fullName || "BENEFICIARY").replace(/[^a-zA-Z0-9]/g, "_");
      a.href = dataUrl;
      a.download = `TUPAD_QR_PASS_Slot${selectedBeneficiary?.designatedNumber || ""}_${sanitizedName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Screenshot export error:", err);
      alert("Error saving image: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Safe active assignment for currently selected day
  const activeDay =
    selectedBeneficiary?.dailyAssignments?.[selectedDay] ||
    selectedBeneficiary?.allDaysSchedule?.find((s: any) => s.dayNumber === selectedDay) ||
    selectedBeneficiary?.currentAssignment || {
      area: `Brgy. ${selectedBeneficiary?.beneficiary?.barangay || "Dingalan"} Work Area`,
      specificActivity: "Community Clearing & Environmental Protection",
      workDate: `Day ${selectedDay}`,
    };

  return (
    <div className="space-y-6">
      {/* 1. Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gov-gold/20 text-gov-goldLight rounded-xl border border-gov-gold/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Designated Beneficiary QR Code Generator &amp; Screenshot Pass
              </h3>
              <p className="text-[11px] text-slate-400">
                Pumili ng benepisyaryo upang ma-generate ang opisyal na QR Code na maaaring i-screenshot o i-download.
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Direct Camera Scannable</span>
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Barangay Filter */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Barangay
            </label>
            <select
              value={selectedBarangay}
              onChange={(e) => {
                setSelectedBarangay(e.target.value);
                fetchQrPasses(searchTerm, e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-gov-goldLight"
            >
              {DINGALAN_BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  {b === "ALL" ? "Lahat ng Barangay (ALL)" : `Brgy. ${b}`}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-6">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              I-search ang Slot # o Pangalan ng Benepisyaryo
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hal. 1, 25, ASTORGA, o DELA CRUZ"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold placeholder:font-normal placeholder-slate-500 focus:outline-none focus:border-gov-goldLight uppercase placeholder:normal-case"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5 border border-blue-400/30 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Hanapin</span>
            </button>
          </div>
        </form>

        {/* Quick Result Selector Pills */}
        {beneficiariesList.length > 1 && (
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Mga Nahanap na Benepisyaryo ({beneficiariesList.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {beneficiariesList.map((pb) => {
                const isSelected = selectedBeneficiary?.id === pb.id;
                return (
                  <button
                    key={pb.id}
                    type="button"
                    onClick={() => {
                      setSelectedBeneficiary(pb);
                      setSelectedDay(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-gov-gold text-gov-dark font-black shadow scale-105"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-80">#{pb.designatedNumber || ""}</span>
                    <span className="truncate max-w-[140px]">{pb.beneficiary?.fullName || "Benepisyaryo"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
          <div className="w-8 h-8 border-3 border-gov-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Ikinakarga ang QR pass at work assignments...</p>
        </div>
      )}

      {/* Error Notice */}
      {error && !loading && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-start space-x-3 text-rose-200 text-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Paunawa sa Paghahanap:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 2. Main Digital QR Work Pass & Screenshot Studio */}
      {selectedBeneficiary && !loading && (
        <div className="space-y-4 animate-fadeIn">
          {/* Action Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">Maaari nang i-screenshot o i-download ang QR Pass:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Download Image Button */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={downloading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md active:scale-95 disabled:opacity-50"
                title="I-save bilang PNG image para madaling ma-send sa beneficiary"
              >
                {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloading ? "Sine-save..." : "I-download Larawan (PNG)"}</span>
              </button>

              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Nakopya na!" : "Kopyahin ang Link"}</span>
              </button>

              {/* Direct Open Assignment View */}
              {selectedBeneficiary?.qr?.qrPayloadUrl && (
                <a
                  href={selectedBeneficiary.qr.qrPayloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md active:scale-95"
                  title="Subukan at buksan ang assignment display kung paano ito makikita sa cellphone"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Subukan ang View</span>
                </a>
              )}

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                title="Print Pass"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SCREENSHOT-READY PASS CARD (Captured by html2canvas) */}
          <div className="flex justify-center">
            <div
              ref={passCardRef}
              className="w-full max-w-md bg-slate-950 text-white border-2 border-gov-gold/60 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5 print:border-slate-800 print:text-black print:bg-white"
            >
              {/* Top Ambient Glow */}
              <div className="absolute -right-12 -top-12 w-36 h-36 bg-gov-gold/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 w-36 h-36 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* 1. Header with Official Branding */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 relative z-10">
                <div className="flex items-center space-x-2.5">
                  <PesoLogo className="w-9 h-9 shrink-0" />
                  <div>
                    <h4 className="text-[11px] font-black tracking-wider uppercase text-white leading-tight">
                      PESO DINGALAN • DOLE REGION III
                    </h4>
                    <p className="text-[10px] text-gov-gold font-bold">
                      TUPAD Official Digital QR Work Pass
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    ACTIVE PASS
                  </span>
                </div>
              </div>

              {/* 2. Beneficiary Info & Slot Badge */}
              <div className="flex items-start justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-gov-gold text-gov-dark font-mono font-black rounded-md text-xs shadow-xs">
                      SLOT #{selectedBeneficiary.designatedNumber || "—"}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold rounded-md text-[10px] border border-blue-400/30">
                      {selectedBeneficiary.tableNumber || "Table 1"}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded-md text-[10px]">
                      {selectedBeneficiary.beneficiary?.sex || "BENEFICIARY"}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white leading-snug uppercase tracking-tight">
                    {selectedBeneficiary.beneficiary?.fullName || "TUPAD BENEFICIARY"}
                  </h3>

                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>
                      {selectedBeneficiary.beneficiary?.sitio || "Centro"}, Brgy. {selectedBeneficiary.beneficiary?.barangay || "Dingalan"}
                    </span>
                  </p>
                </div>
              </div>

              {/* 3. CENTERPIECE: High-Resolution Scannable QR Code */}
              <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner border-2 border-emerald-500/50 relative z-10 space-y-2.5">
                <div className="p-2 bg-white rounded-xl shadow-xs">
                  {selectedBeneficiary.qr?.qrDataUrl ? (
                    <img
                      src={selectedBeneficiary.qr.qrDataUrl}
                      alt={`TUPAD QR Code for Slot ${selectedBeneficiary.designatedNumber || ""}`}
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400 font-mono">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="text-center space-y-0.5">
                  <span className="text-[11px] font-black text-slate-900 font-mono tracking-wider block">
                    {selectedBeneficiary.qr?.publicToken || "ACTIVE TOKEN"}
                  </span>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide flex items-center justify-center gap-1">
                    <span>📷 I-scan gamit ang Cellphone Camera</span>
                  </p>
                </div>
              </div>

              {/* 4. Active Work Area Assignment Preview for Selected Day */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2 relative z-10">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>ITINALAGANG WORK AREA (DAY {selectedDay})</span>
                  </div>
                  <span className="text-[10px] font-mono text-gov-goldLight font-bold">
                    {activeDay?.workDate || `Day ${selectedDay}`}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white leading-tight">
                    {activeDay?.area || `Brgy. ${selectedBeneficiary.beneficiary?.barangay || "Dingalan"} Community Work Area`}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    <strong className="text-emerald-400 font-semibold">Gawain: </strong>
                    {activeDay?.specificActivity || "De-clogging of canals, roadside maintenance, and environmental protection."}
                  </p>
                </div>

                {/* Day Switcher Inside Card */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span>Pumili ng Araw (1–10):</span>
                    <span className="font-mono text-gov-gold">Araw {selectedDay} ng 10</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDay(d)}
                        className={`py-1 rounded text-[10px] font-black transition text-center cursor-pointer ${
                          selectedDay === d
                            ? "bg-gov-gold text-gov-dark font-extrabold scale-105 shadow-xs"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Clear Guidance & Authentication Reminder */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-[10px] space-y-1 relative z-10 leading-relaxed">
                <div className="flex items-center space-x-1 font-bold text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>PAUNAWA SA BENEFICIARY &amp; DATA PRIVACY:</span>
                </div>
                <p>
                  Pagka-scan ng QR code gamit ang camera ng cellphone, i-enter lamang ang iyong <strong>Gitnang Pangalan (Middle Name)</strong> upang mabuksan ang buong talaan ng iyong work area at 10-araw na iskedyul.
                </p>
              </div>

              {/* 6. Footer Signature Stamp */}
              <div className="text-center text-[9px] text-slate-500 font-medium pt-1 relative z-10">
                <p>DOLE TUPAD Emergency Employment • PESO LGU Dingalan, Aurora</p>
                <p className="text-slate-600 font-mono mt-0.5">Direct Routing System • R.A. 10173 DPA Protected</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fullscreen or Modal Wrapper
export function FieldQrPassGeneratorModal({
  isOpen,
  onClose,
  initialSlot = "",
  initialBarangay = "ALL",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: string;
  initialBarangay?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[95vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-gov-gold" />
            <span className="text-sm font-black text-white">Generate Beneficiary QR Pass</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition font-bold text-xs"
          >
            ✕ Isara
          </button>
        </div>

        <FieldQrPassGeneratorCard
          initialSlot={initialSlot}
          initialBarangay={initialBarangay}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
}
