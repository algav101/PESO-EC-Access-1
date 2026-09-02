import React, { memo } from "react";
import { getCachedQrSync } from "@/lib/qr-client-cache";

export interface Format1StubProps {
  designatedNumber: string | number;
  qrDataUrl?: string;
  token?: string;
  fullName: string;
  barangay: string;
  tableNumber?: string;
  stubHeader?: string;
  stubSubHeader?: string;
  orientationDetails?: string;
  paalalaText?: string;
  // Manual Design, Typography & Positioning Customizer Props
  headerFontSize?: number;
  subHeaderFontSize?: number;
  desigNumFontSize?: number;
  nameFontSizeScale?: number;
  brgyFontSizeScale?: number;
  tableFontSize?: number;
  orientationFontSize?: number;
  paalalaFontSize?: number;
  labelsFontSize?: number;
  qrSizePercent?: number;
  cardPadding?: number;
  nameAlignment?: "left" | "center";
}

/**
 * 100% Vector Proportional "Format 1: TUPAD Beneficiary Verification Stub"
 * Supports real-time manual adjustments for font sizes, scaling, positioning, and alignment.
 */
export const Format1Stub = memo(function Format1Stub({
  designatedNumber,
  qrDataUrl,
  token,
  fullName,
  barangay,
  tableNumber = "1",
  stubHeader = "LGU-DINGALAN",
  stubSubHeader = "BENEFICIARY VERIFICATION STUB NO.",
  orientationDetails = "Sep 04, 2026 • 08:00 (Municipal Gymnasium)",
  paalalaText = "DALHIN ANG STUB NA ITO AT VALID ID NA GINAMIT SA APPLICATION SA ORIENTATION",
  headerFontSize = 6.0,
  subHeaderFontSize = 2.5,
  desigNumFontSize = 8.8,
  nameFontSizeScale = 1.0,
  brgyFontSizeScale = 1.0,
  tableFontSize = 4.8,
  orientationFontSize = 2.3,
  paalalaFontSize = 2.0,
  labelsFontSize = 2.0,
  qrSizePercent = 28,
  cardPadding = 2.4,
  nameAlignment = "left",
}: Format1StubProps) {
  const numStr = String(designatedNumber).replace(/^#/, "");
  const cleanTable = String(tableNumber).replace(/^Table\s*/i, "").replace(/^#/, "");
  const effectiveQr = qrDataUrl || (token ? getCachedQrSync(token) : undefined);

  // Scaled-up Beneficiary Name Base Typography
  const nameLen = fullName.length;
  const baseNameSize =
    nameLen <= 18
      ? 6.0
      : nameLen <= 26
      ? 5.2
      : nameLen <= 34
      ? 4.5
      : 3.8;
  const effectiveNameFontSize = `${(baseNameSize * nameFontSizeScale).toFixed(2)}cqw`;

  // Scaled-up Barangay Base Typography
  const brgyLen = barangay.length;
  const baseBrgySize =
    brgyLen <= 8
      ? 4.6
      : brgyLen <= 14
      ? 4.0
      : 3.4;
  const effectiveBrgyFontSize = `${(baseBrgySize * brgyFontSizeScale).toFixed(2)}cqw`;

  // Clean orientation details text
  const cleanOrientation = orientationDetails
    .replace(/^Orientation:\s*/i, "")
    .replace(/^ORIENTATION DATE & VENUE:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Clean paalala text
  const cleanPaalala = paalalaText
    .replace(/^PAALALA:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Dynamic calculated designated number size
  const effectiveNumFontSize =
    numStr.length <= 2
      ? `${desigNumFontSize}cqw`
      : numStr.length === 3
      ? `${(desigNumFontSize * 0.85).toFixed(2)}cqw`
      : `${(desigNumFontSize * 0.70).toFixed(2)}cqw`;

  return (
    <div
      className="format1-stub-card relative select-none page-break-inside-avoid bg-white flex flex-col justify-between shadow-xs box-border overflow-hidden"
      style={{
        width: "100%",
        maxWidth: "480px",
        aspectRatio: "1.52 / 1",
        containerType: "inline-size",
        padding: `${cardPadding}cqw ${(cardPadding * 1.15).toFixed(2)}cqw`,
        borderRadius: "2.2cqw",
        border: "0.4cqw solid #004b93",
        fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
      }}
    >
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION (Adjustable font size & stretch)                        */}
      {/* ========================================================================= */}
      <div
        className="flex items-center justify-between min-w-0 shrink-0"
        style={{
          borderBottom: "0.4cqw solid #004b93",
          paddingBottom: "1.2cqw",
        }}
      >
        {/* Left: PESO Logo & Stretched Header Titles */}
        <div className="flex items-center min-w-0 flex-1" style={{ gap: "2.4cqw" }}>
          <img
            src="/peso-logo.png"
            alt="PESO Logo"
            style={{
              height: `${(headerFontSize * 1.5).toFixed(2)}cqw`,
              width: "auto",
              maxHeight: "9.6cqw",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <h2
              className="text-[#004b93] font-black uppercase tracking-wide leading-none truncate"
              style={{
                fontSize: `${headerFontSize}cqw`,
                letterSpacing: "0.04em",
              }}
              title={stubHeader}
            >
              {stubHeader || "LGU-DINGALAN"}
            </h2>
            <p
              className="text-[#132e57] font-extrabold uppercase tracking-widest leading-tight truncate"
              style={{
                fontSize: `${subHeaderFontSize}cqw`,
                marginTop: "0.4cqw",
                letterSpacing: "0.04em",
              }}
              title={stubSubHeader}
            >
              {stubSubHeader || "BENEFICIARY VERIFICATION STUB NO."}
            </p>
          </div>
        </div>

        {/* Right: Big Designated Number */}
        <div className="shrink-0 text-right" style={{ paddingLeft: "1.8cqw" }}>
          <span
            className="text-[#132e57] font-black tracking-tight leading-none select-all"
            style={{
              fontSize: effectiveNumFontSize,
            }}
          >
            #{numStr}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CORE DEMOGRAPHICS (Adjustable font size, QR box size & positioning)     */}
      {/* ========================================================================= */}
      <div
        className="flex items-center flex-1 min-h-0"
        style={{
          paddingTop: "1.2cqw",
          paddingBottom: "1.2cqw",
          gap: "2.6cqw",
        }}
      >
        {/* Left: QR Code Container (Adjustable Size) */}
        <div
          className="shrink-0 bg-white flex items-center justify-center"
          style={{
            width: `${qrSizePercent}cqw`,
            height: `${qrSizePercent}cqw`,
            borderRadius: "1.6cqw",
            border: "0.25cqw solid #94a3b8",
            padding: "0.8cqw",
          }}
        >
          {effectiveQr ? (
            <img
              src={effectiveQr}
              alt={`QR #${numStr}`}
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div
              className="w-full h-full bg-slate-100 flex items-center justify-center font-mono text-slate-400"
              style={{ fontSize: "2.0cqw" }}
            >
              QR
            </div>
          )}
        </div>

        {/* Right: Maximized Demographics Block */}
        <div className="flex-1 flex flex-col justify-between h-full min-w-0 py-0.5">
          {/* Beneficiary Name */}
          <div className={`min-w-0 ${nameAlignment === "center" ? "text-center" : "text-left"}`}>
            <span
              className="block font-extrabold text-[#132e57] uppercase tracking-wider"
              style={{ fontSize: `${labelsFontSize}cqw`, marginBottom: "0.2cqw", lineHeight: "1" }}
            >
              BENEFICIARY NAME:
            </span>
            <span
              className="block text-[#004b93] font-black uppercase tracking-tight select-all break-words"
              style={{
                fontSize: effectiveNameFontSize,
                lineHeight: "1.04",
                letterSpacing: "0.015em",
              }}
              title={fullName}
            >
              {fullName}
            </span>
          </div>

          {/* Barangay & Table Assignment */}
          <div
            className="grid grid-cols-2 min-w-0"
            style={{
              borderTop: "0.22cqw solid #cbd5e1",
              paddingTop: "1.0cqw",
              marginTop: "0.4cqw",
              gap: "1.5cqw",
            }}
          >
            {/* Barangay */}
            <div className="min-w-0">
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider"
                style={{ fontSize: `${labelsFontSize}cqw`, marginBottom: "0.15cqw", lineHeight: "1" }}
              >
                BARANGAY:
              </span>
              <span
                className="block text-[#004b93] font-black uppercase tracking-tight select-all break-words"
                style={{
                  fontSize: effectiveBrgyFontSize,
                  lineHeight: "1.05",
                }}
                title={barangay}
              >
                {barangay}
              </span>
            </div>

            {/* Table Assignment */}
            <div
              className="min-w-0"
              style={{
                borderLeft: "0.22cqw solid #cbd5e1",
                paddingLeft: "1.5cqw",
              }}
            >
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider"
                style={{ fontSize: `${labelsFontSize}cqw`, marginBottom: "0.15cqw", lineHeight: "1" }}
              >
                TABLE ASSIGNMENT:
              </span>
              <span
                className="block text-[#004b93] font-black tracking-tight select-all"
                style={{
                  fontSize: `${tableFontSize}cqw`,
                  lineHeight: "1.0",
                }}
              >
                #{cleanTable}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FOOTER SECTION (Adjustable font size & schedule text)                   */}
      {/* ========================================================================= */}
      <div
        className="flex flex-col min-w-0 shrink-0"
        style={{
          borderTop: "0.25cqw solid #cbd5e1",
          paddingTop: "1.0cqw",
          gap: "0.5cqw",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Orientation Date & Venue */}
        <div
          className="flex flex-wrap items-baseline text-[#004b93] leading-tight"
          style={{
            fontSize: `${orientationFontSize}cqw`,
            gap: "0.8cqw",
          }}
        >
          <span className="font-extrabold uppercase shrink-0 tracking-tight text-[#004b93]">
            ORIENTATION DATE & VENUE:
          </span>
          <span className="font-normal underline underline-offset-1 text-[#004b93] break-words">
            {cleanOrientation || "Sep 04, 2026 • 08:00 (Municipal Gymnasium)"}
          </span>
        </div>

        {/* Paalala Notice */}
        <div
          className="flex flex-wrap items-baseline text-[#004b93]"
          style={{
            fontSize: `${paalalaFontSize}cqw`,
            lineHeight: "1.18",
            gap: "0.8cqw",
          }}
        >
          <span className="font-extrabold uppercase shrink-0 tracking-tight text-[#004b93]">
            PAALALA:
          </span>
          <span className="font-normal underline underline-offset-1 text-[#004b93] break-words">
            {cleanPaalala || "DALHIN ANG STUB NA ITO AT VALID ID NA GINAMIT SA APPLICATION SA ORIENTATION"}
          </span>
        </div>
      </div>
    </div>
  );
});
