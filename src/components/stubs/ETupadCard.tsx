import React, { memo } from "react";
import { ETUPAD_BASE_IMAGE } from "./etupad-base-b64";
import { getCachedQrSync } from "@/lib/qr-client-cache";

interface ETupadCardProps {
  designatedNumber: string | number;
  qrDataUrl?: string;
  token?: string;
  tableNumber?: string;
  beneficiaryName?: string;
  barangay?: string;
  programCode?: string;
}

/**
 * Pixel-Perfect Recreation of the Official "e-TUPAD CARD"
 * Based directly on the user reference card image:
 * - 3 Top Seals: PESO, Dingalan 1956, DOLE Aurora Field Office
 * - Left: High-Contrast Dynamic QR Code
 * - Right: e-TUPAD CARD logo, Variable #NUMBER, and e-PESO access logo
 */
export const ETupadCard = memo(function ETupadCard({
  designatedNumber,
  qrDataUrl,
  token,
  tableNumber,
  beneficiaryName,
  barangay,
  programCode,
}: ETupadCardProps) {
  const numStr = String(designatedNumber).replace(/^#/, "");
  const effectiveQr = qrDataUrl || (token ? getCachedQrSync(token) : undefined);

  return (
    <div
      className="etupad-card-wrapper relative select-none page-break-inside-avoid shadow-sm overflow-hidden"
      style={{
        width: "100%",
        maxWidth: "480px",
        aspectRatio: "640 / 404",
      }}
    >
      {/* 1. Official Base Template Image (Contains all 3 top seals, e-TUPAD CARD logo, e-PESO access logo, and outer borders) */}
      <img
        src={ETUPAD_BASE_IMAGE}
        alt="e-TUPAD Card Base"
        className="w-full h-full object-contain pointer-events-none block"
      />

      {/* 2. Dynamic Unique QR Code Positioned in the Left Box */}
      <div
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          top: "35.5%",
          left: "9.2%",
          width: "37.0%",
          height: "58.5%",
          borderRadius: "14px",
        }}
      >
        {effectiveQr ? (
          <img
            src={effectiveQr}
            alt={`QR #${numStr}`}
            className="w-full h-full object-contain"
            style={{
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <div className="w-full h-full bg-white flex items-center justify-center text-[10px] font-mono text-slate-400">
            QR Token
          </div>
        )}
      </div>

      {/* 3. Dynamic Variable Designated Number (#1, #2, #10, #100, #522) */}
      <div
        className="absolute flex items-center justify-center text-center leading-none"
        style={{
          top: "56.5%",
          left: "56%",
          width: "38%",
          height: "25%",
        }}
      >
        <span
          className="text-[#192759] tracking-tight leading-none select-all"
          style={{
            fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
            fontSize:
              numStr.length <= 2
                ? "clamp(2.7rem, 6.5vw, 4.0rem)"
                : numStr.length === 3
                ? "clamp(2.2rem, 5.2vw, 3.4rem)"
                : "clamp(1.8rem, 4.2vw, 2.7rem)",
            letterSpacing: "-0.5px",
          }}
        >
          #{numStr}
        </span>
      </div>
    </div>
  );
});
