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
}

/**
 * 100% Vector Proportional "Format 1: TUPAD Beneficiary Verification Stub"
 * Uses pure container query units (cqw) so every text element, padding, and logo
 * scales in exact mathematical lockstep with the card size, completely eliminating
 * overlapping, text collisions, or cutoffs on any printer grid or paper size.
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
}: Format1StubProps) {
  const numStr = String(designatedNumber).replace(/^#/, "");
  const cleanTable = String(tableNumber).replace(/^Table\s*/i, "").replace(/^#/, "");
  const effectiveQr = qrDataUrl || (token ? getCachedQrSync(token) : undefined);

  // Proportional typography based on name length
  const nameLen = fullName.length;
  const nameFontSize =
    nameLen <= 18
      ? "4.5cqw"
      : nameLen <= 26
      ? "3.8cqw"
      : nameLen <= 34
      ? "3.2cqw"
      : "2.7cqw";

  // Proportional typography based on barangay length
  const brgyLen = barangay.length;
  const brgyFontSize =
    brgyLen <= 8
      ? "4.0cqw"
      : brgyLen <= 14
      ? "3.4cqw"
      : "2.8cqw";

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

  // Proportional designated number size
  const numFontSize =
    numStr.length <= 2
      ? "7.5cqw"
      : numStr.length === 3
      ? "6.2cqw"
      : "5.2cqw";

  return (
    <div
      className="format1-stub-card relative select-none page-break-inside-avoid bg-white flex flex-col justify-between shadow-sm box-border"
      style={{
        width: "100%",
        maxWidth: "480px",
        aspectRatio: "639 / 418",
        containerType: "inline-size",
        padding: "2.8cqw",
        borderRadius: "2.2cqw",
        border: "0.45cqw solid #004b93",
        fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
      }}
    >
      {/* 1. Header Section */}
      <div
        className="flex items-center justify-between min-w-0"
        style={{
          borderBottom: "0.35cqw solid #004b93",
          paddingBottom: "1.4cqw",
        }}
      >
        {/* Left: PESO Logo & Header Titles */}
        <div className="flex items-center min-w-0 flex-1" style={{ gap: "2cqw" }}>
          <img
            src="/peso-logo.png"
            alt="PESO Logo"
            style={{
              height: "7.8cqw",
              width: "auto",
              maxHeight: "7.8cqw",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <h2
              className="text-[#004b93] font-black uppercase tracking-tight leading-none truncate"
              style={{
                fontSize: "4.8cqw",
                letterSpacing: "0.02em",
              }}
              title={stubHeader}
            >
              {stubHeader || "LGU-DINGALAN"}
            </h2>
            <p
              className="text-[#132e57] font-extrabold uppercase tracking-wide leading-tight truncate"
              style={{
                fontSize: "2.2cqw",
                marginTop: "0.4cqw",
                letterSpacing: "0.01em",
              }}
              title={stubSubHeader}
            >
              {stubSubHeader || "BENEFICIARY VERIFICATION STUB NO."}
            </p>
          </div>
        </div>

        {/* Right: Big Designated Number */}
        <div className="shrink-0 text-right" style={{ paddingLeft: "1.5cqw" }}>
          <span
            className="text-[#132e57] font-black tracking-tight leading-none select-all"
            style={{
              fontSize: numFontSize,
            }}
          >
            #{numStr}
          </span>
        </div>
      </div>

      {/* 2. Middle Body: QR Code + Beneficiary Demographics */}
      <div
        className="flex items-center flex-1 min-h-0"
        style={{
          paddingTop: "1.5cqw",
          paddingBottom: "1.5cqw",
          gap: "2.8cqw",
        }}
      >
        {/* Left QR Code Container */}
        <div
          className="shrink-0 bg-white flex items-center justify-center"
          style={{
            width: "29cqw",
            height: "29cqw",
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

        {/* Right Demographics Block */}
        <div className="flex-1 flex flex-col justify-around h-full min-w-0">
          {/* Beneficiary Name */}
          <div className="min-w-0">
            <span
              className="block font-extrabold text-[#132e57] uppercase tracking-wider"
              style={{ fontSize: "2.1cqw", marginBottom: "0.3cqw" }}
            >
              BENEFICIARY NAME:
            </span>
            <span
              className="block text-[#004b93] font-black uppercase tracking-tight select-all break-words"
              style={{
                fontSize: nameFontSize,
                lineHeight: "1.08",
                letterSpacing: "0.01em",
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
              borderTop: "0.2cqw solid #cbd5e1",
              paddingTop: "1.2cqw",
              marginTop: "0.8cqw",
              gap: "1.5cqw",
            }}
          >
            {/* Barangay */}
            <div className="min-w-0">
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider"
                style={{ fontSize: "1.9cqw", marginBottom: "0.2cqw" }}
              >
                BARANGAY:
              </span>
              <span
                className="block text-[#004b93] font-black uppercase tracking-tight select-all break-words"
                style={{
                  fontSize: brgyFontSize,
                  lineHeight: "1.08",
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
                borderLeft: "0.2cqw solid #cbd5e1",
                paddingLeft: "1.5cqw",
              }}
            >
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider"
                style={{ fontSize: "1.9cqw", marginBottom: "0.2cqw" }}
              >
                TABLE ASSIGNMENT:
              </span>
              <span
                className="block text-[#004b93] font-black tracking-tight select-all"
                style={{
                  fontSize: "4.2cqw",
                  lineHeight: "1.0",
                }}
              >
                #{cleanTable}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer Section: Orientation Date & Venue + Paalala */}
      <div
        className="flex flex-col min-w-0"
        style={{
          borderTop: "0.25cqw solid #cbd5e1",
          paddingTop: "1.2cqw",
          gap: "0.6cqw",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Orientation Date & Venue */}
        <div
          className="flex flex-wrap items-baseline text-[#004b93] leading-tight"
          style={{
            fontSize: "2.1cqw",
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
          className="flex flex-wrap items-baseline text-[#004b93] leading-tight"
          style={{
            fontSize: "1.9cqw",
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
