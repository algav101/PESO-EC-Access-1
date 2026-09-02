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
 * Pixel-Perfect Pure HTML/CSS Vector Recreation of "Format 1: TUPAD Beneficiary Verification Stub"
 * Features large-scale high-contrast typography optimized for maximum readability on printed stubs.
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

  // Large-scale responsive typography for Beneficiary Name to fill available space
  const nameLen = fullName.length;
  const nameFontSize =
    nameLen <= 18
      ? "clamp(1.30rem, 5.8cqw, 1.90rem)"
      : nameLen <= 26
      ? "clamp(1.15rem, 5.0cqw, 1.65rem)"
      : nameLen <= 34
      ? "clamp(1.00rem, 4.3cqw, 1.45rem)"
      : "clamp(0.88rem, 3.6cqw, 1.25rem)";

  // Large-scale typography for Barangay
  const brgyLen = barangay.length;
  const brgyFontSize =
    brgyLen <= 8
      ? "clamp(1.25rem, 5.5cqw, 1.80rem)"
      : brgyLen <= 14
      ? "clamp(1.10rem, 4.7cqw, 1.55rem)"
      : "clamp(0.95rem, 4.0cqw, 1.35rem)";

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

  // Dynamic variable auto-scaling font size for Orientation Line (Large scale for print clarity)
  const orientTotalLen = cleanOrientation.length + 26;
  const orientFontSize =
    orientTotalLen <= 45
      ? "clamp(9.5px, 2.9cqw, 13.5px)"
      : orientTotalLen <= 65
      ? "clamp(8.8px, 2.5cqw, 12.0px)"
      : "clamp(8.0px, 2.1cqw, 10.5px)";

  // Dynamic variable auto-scaling font size for Paalala Advisory Notice (Large scale for print clarity)
  const paalalaTotalLen = cleanPaalala.length + 10;
  const paalalaFontSize =
    paalalaTotalLen <= 65
      ? "clamp(9.0px, 2.7cqw, 13.0px)"
      : paalalaTotalLen <= 110
      ? "clamp(8.2px, 2.3cqw, 11.5px)"
      : "clamp(7.4px, 1.9cqw, 10.0px)";

  return (
    <div
      className="format1-stub-card relative select-none page-break-inside-avoid bg-white border-2 border-[#004b93] rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-md overflow-hidden box-border"
      style={{
        width: "100%",
        maxWidth: "480px",
        aspectRatio: "639 / 418",
        containerType: "inline-size",
        fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
      }}
    >
      {/* 1. Header Section */}
      <div className="flex items-center justify-between border-b-2 border-[#004b93] pb-1.5 gap-2">
        {/* Left: PESO Logo & Header Text */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <img
            src="/peso-logo.png"
            alt="PESO e-access Logo"
            className="h-10 sm:h-12 w-auto max-w-[52px] object-contain shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <h2
              className="text-[#004b93] font-black uppercase tracking-tight leading-none truncate"
              style={{
                fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                fontSize: "clamp(1.30rem, 5.8cqw, 1.95rem)",
                letterSpacing: "0.5px",
              }}
              title={stubHeader}
            >
              {stubHeader || "LGU-DINGALAN"}
            </h2>
            <p
              className="text-[#132e57] font-extrabold uppercase tracking-wide leading-tight mt-0.5 truncate"
              style={{
                fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                fontSize: "clamp(9.5px, 2.7cqw, 13.5px)",
                letterSpacing: "0.3px",
              }}
              title={stubSubHeader}
            >
              {stubSubHeader || "BENEFICIARY VERIFICATION STUB NO."}
            </p>
          </div>
        </div>

        {/* Right: Big Designated Number */}
        <div className="shrink-0 text-right pl-2">
          <span
            className="text-[#132e57] font-black tracking-tight leading-none select-all"
            style={{
              fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
              fontSize:
                numStr.length <= 2
                  ? "clamp(2.4rem, 10.5cqw, 3.8rem)"
                  : numStr.length === 3
                  ? "clamp(1.9rem, 8.5cqw, 3.0rem)"
                  : "clamp(1.5rem, 6.8cqw, 2.4rem)",
            }}
          >
            #{numStr}
          </span>
        </div>
      </div>

      {/* 2. Middle Body: QR Code + Beneficiary Demographics */}
      <div className="flex items-center gap-3.5 py-1.5 flex-1 min-h-0">
        {/* Left QR Code Container */}
        <div className="shrink-0 w-[30%] aspect-square bg-white border-2 border-slate-300 rounded-xl p-1.5 flex items-center justify-center shadow-xs">
          {effectiveQr ? (
            <img
              src={effectiveQr}
              alt={`QR #${numStr}`}
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[9px] font-mono text-slate-400">
              QR Token
            </div>
          )}
        </div>

        {/* Right Demographics Block (Large-scale text fitting) */}
        <div className="flex-1 flex flex-col justify-around h-full py-0.5 min-w-0">
          {/* Beneficiary Name */}
          <div className="min-w-0">
            <span
              className="block font-extrabold text-[#132e57] uppercase tracking-wider mb-0.5"
              style={{ fontSize: "clamp(9.5px, 2.8cqw, 13.0px)" }}
            >
              BENEFICIARY NAME:
            </span>
            <span
              className="block text-[#004b93] font-black uppercase tracking-tight leading-tight select-all break-words"
              style={{
                fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                fontSize: nameFontSize,
                letterSpacing: "0.4px",
              }}
              title={fullName}
            >
              {fullName}
            </span>
          </div>

          {/* Barangay & Table Assignment */}
          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200 min-w-0">
            <div className="min-w-0">
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider mb-0.5"
                style={{ fontSize: "clamp(8.5px, 2.5cqw, 12.0px)" }}
              >
                BARANGAY:
              </span>
              <span
                className="block text-[#004b93] font-black uppercase tracking-tight leading-tight select-all break-words"
                style={{
                  fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                  fontSize: brgyFontSize,
                  letterSpacing: "0.3px",
                }}
                title={barangay}
              >
                {barangay}
              </span>
            </div>

            <div className="min-w-0 pl-2 border-l border-slate-200">
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider mb-0.5"
                style={{ fontSize: "clamp(8.5px, 2.5cqw, 12.0px)" }}
              >
                TABLE ASSIGNMENT:
              </span>
              <span
                className="block text-[#004b93] font-black tracking-tight leading-tight select-all"
                style={{
                  fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                  fontSize: "clamp(1.35rem, 5.8cqw, 2.00rem)",
                }}
              >
                #{cleanTable}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer Section: Orientation Date & Venue + Paalala (Maximized Text Fitting) */}
      <div
        className="border-t border-slate-300 pt-1.5 space-y-1"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Orientation Date & Venue */}
        <div
          className="flex flex-wrap items-baseline gap-x-1.5 leading-tight text-[#004b93]"
          style={{ fontSize: orientFontSize }}
        >
          <span className="font-extrabold uppercase shrink-0 tracking-tight text-[#004b93]">
            ORIENTATION DATE & VENUE:
          </span>
          <span className="font-normal underline underline-offset-2 text-[#004b93] break-words">
            {cleanOrientation || "Sep 04, 2026 • 08:00 (Municipal Gymnasium)"}
          </span>
        </div>

        {/* Paalala Notice */}
        <div
          className="flex flex-wrap items-baseline gap-x-1.5 leading-tight text-[#004b93]"
          style={{ fontSize: paalalaFontSize }}
        >
          <span className="font-extrabold uppercase shrink-0 tracking-tight text-[#004b93]">
            PAALALA:
          </span>
          <span className="font-normal underline underline-offset-2 text-[#004b93] break-words">
            {cleanPaalala || "DALHIN ANG STUB NA ITO AT VALID ID NA GINAMIT SA APPLICATION SA ORIENTATION"}
          </span>
        </div>
      </div>
    </div>
  );
});
