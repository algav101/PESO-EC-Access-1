import React, { memo } from "react";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { MapPin, Calendar, Navigation, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { getCachedQrSync } from "@/lib/qr-client-cache";

export interface Format4SchedulePassProps {
  designatedNumber: string | number;
  qrDataUrl?: string;
  token?: string;
  qrPayloadUrl?: string;
  fullName: string;
  barangay: string;
  sitio?: string;
  sex?: string;
  tableNumber?: string;
  programName?: string;
  programCode?: string;
  allDaysSchedule?: Array<{
    dayNumber: number;
    workDate?: string;
    area: string;
    specificActivity: string;
    matchingRationale?: string;
    allocationMethod?: string;
  }>;
  // Typography & Layout Controls
  desigNumFontSize?: number;
  nameFontSizeScale?: number;
  qrSizePercent?: number;
}

/**
 * Format 4: Designated Work Area & Day-to-Day Schedule QR Pass / Card
 * Specially tailored for direct mobile camera scanning and instant work program schedule lookup.
 */
export const Format4SchedulePass = memo(function Format4SchedulePass({
  designatedNumber,
  qrDataUrl,
  token,
  qrPayloadUrl,
  fullName,
  barangay,
  sitio = "Centro",
  sex = "BENEFICIARY",
  tableNumber = "Table 1",
  programName = "TUPAD Community Project",
  allDaysSchedule = [],
  desigNumFontSize = 8.8,
  nameFontSizeScale = 1.0,
  qrSizePercent = 28,
}: Format4SchedulePassProps) {
  const numStr = String(designatedNumber).replace(/^#/, "");
  const effectiveQr = qrDataUrl || (token ? getCachedQrSync(token) : undefined);

  return (
    <div
      className="format4-schedule-pass relative select-none page-break-inside-avoid bg-slate-950 text-white border-2 border-gov-gold/60 rounded-3xl p-5 shadow-2xl flex flex-col justify-between overflow-hidden space-y-4 print:border-slate-800 print:text-black print:bg-white print:shadow-none"
      style={{
        width: "100%",
        minHeight: "420px",
      }}
    >
      {/* Ambient background glow for digital view */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-gov-gold/15 rounded-full blur-2xl pointer-events-none print:hidden" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none print:hidden" />

      {/* 1. Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-3 relative z-10">
        <div className="flex items-center space-x-2.5">
          <PesoLogo className="w-8 h-8 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-gov-goldLight font-mono">
                LGU DINGALAN
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 print:border-slate-400 print:text-slate-800">
                DOLE TUPAD
              </span>
            </div>
            <h4 className="text-xs font-black text-white print:text-black tracking-tight leading-tight">
              Designated Work Area &amp; Schedule Pass
            </h4>
          </div>
        </div>

        <div className="text-right">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold print:text-emerald-800 print:border-emerald-600">
            OFFICIAL PASS
          </span>
        </div>
      </div>

      {/* 2. Top Info Row: Beneficiary & High-Contrast QR Code */}
      <div className="grid grid-cols-12 gap-3 relative z-10 items-center">
        {/* Beneficiary Details */}
        <div className="col-span-7 space-y-1.5 bg-slate-900/90 print:bg-slate-100 p-3 rounded-2xl border border-slate-800 print:border-slate-300">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 bg-gov-gold text-gov-dark font-mono font-black rounded text-xs shadow-2xs">
              SLOT #{numStr}
            </span>
            <span className="px-1.5 py-0.5 bg-blue-600/30 text-blue-200 print:text-blue-900 font-bold rounded text-[10px]">
              {tableNumber}
            </span>
            <span className="px-1.5 py-0.5 bg-slate-800 print:bg-slate-300 text-slate-300 print:text-slate-900 font-bold rounded text-[10px]">
              {sex}
            </span>
          </div>

          <h3
            className="font-black text-white print:text-black uppercase leading-tight tracking-tight"
            style={{
              fontSize: `clamp(0.85rem, ${1.0 * nameFontSizeScale}rem, 1.25rem)`,
            }}
          >
            {fullName}
          </h3>

          <p className="text-[11px] text-slate-400 print:text-slate-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400 shrink-0 print:text-emerald-700" />
            <span className="truncate">
              {sitio}, Brgy. {barangay}
            </span>
          </p>
        </div>

        {/* Center Scannable QR Code */}
        <div className="col-span-5 flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border-2 border-emerald-500/60 shadow-md">
          {effectiveQr ? (
            <img
              src={effectiveQr}
              alt={`QR Code for Slot #${numStr}`}
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-mono">
              Loading QR...
            </div>
          )}
          <span className="text-[9px] font-black text-slate-900 font-mono tracking-wider mt-1 truncate max-w-full">
            {token ? String(token).slice(0, 16) : `#${numStr}`}
          </span>
          <span className="text-[8px] font-extrabold text-emerald-800 uppercase text-center mt-0.5">
            📷 Direct Cellphone Scan
          </span>
        </div>
      </div>

      {/* 3. Designated 10-Day Work Assignment Schedule Table */}
      <div className="bg-slate-900/90 print:bg-slate-50 rounded-2xl p-3 border border-slate-800 print:border-slate-300 space-y-2 relative z-10">
        <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-200 pb-1.5">
          <div className="flex items-center space-x-1.5 text-emerald-400 print:text-emerald-700 font-bold text-[11px]">
            <Navigation className="w-3.5 h-3.5" />
            <span>TALAHANAYAN NG ITINALAGANG WORK AREA (10 ARAW)</span>
          </div>
          <span className="text-[9px] font-mono text-gov-goldLight print:text-slate-600 font-bold">
            Nearest Purok Scheme
          </span>
        </div>

        {allDaysSchedule && allDaysSchedule.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {allDaysSchedule.slice(0, 10).map((day) => (
              <div
                key={day.dayNumber}
                className="bg-slate-950/80 print:bg-white p-1.5 rounded-lg border border-slate-800/80 print:border-slate-200 text-[10px] space-y-0.5"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-gov-gold print:text-blue-900 font-mono">Day {day.dayNumber}:</span>
                  <span className="text-slate-400 print:text-slate-600 text-[9px]">{day.workDate || ""}</span>
                </div>
                <p className="text-white print:text-black font-semibold truncate">
                  📍 {day.area || `Brgy. ${barangay} Work Sector`}
                </p>
                <p className="text-slate-400 print:text-slate-600 text-[9px] truncate">
                  ⚙️ {day.specificActivity || "Roadside cleaning & clearing"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-slate-400 print:text-slate-600">
            Itinalagang Work Sector: Brgy. {barangay} Community Projects
          </div>
        )}
      </div>

      {/* 4. Footer & Privacy Notice */}
      <div className="pt-1 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-[9px] text-slate-400 print:text-slate-600 relative z-10">
        <div className="flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-amber-400 print:text-amber-700 shrink-0" />
          <span>I-scan gamit ang cellphone camera • Protektado ng Data Privacy Act (R.A. 10173)</span>
        </div>
        <span className="font-mono text-[8px] text-slate-500">PESO Dingalan Direct Routing</span>
      </div>
    </div>
  );
});
