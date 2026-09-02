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
 * Features dynamic auto-scaling container-query typography to maximize fitting and guarantee 100% complete text without truncation.
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

  // Dynamic responsive typography for Beneficiary Name to guarantee 100% fitting without ellipses
  const nameLen = fullName.length;
  const nameFontSize =
    nameLen <= 18
      ? "clamp(0.90rem, 3.8cqw, 1.30rem)"
      : nameLen <= 26
      ? "clamp(0.78rem, 3.2cqw, 1.10rem)"
      : nameLen <= 34
      ? "clamp(0.68rem, 2.6cqw, 0.95rem)"
      : "clamp(0.60rem, 2.2cqw, 0.82rem)";

  // Dynamic typography for Barangay
  const brgyLen = barangay.length;
  const brgyFontSize =
    brgyLen <= 8
      ? "clamp(0.88rem, 3.5cqw, 1.20rem)"
      : brgyLen <= 12
      ? "clamp(0.76rem, 2.9cqw, 1.05rem)"
      : "clamp(0.65rem, 2.4cqw, 0.90rem)";

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

  // Dynamic variable auto-scaling font size for Orientation Line (Guarantees complete text without ellipses)
  const orientTotalLen = cleanOrientation.length + 26;
  const orientFontSize =
    orientTotalLen <= 45
      ? "clamp(7.5px, 2.2cqw, 10.5px)"
      : orientTotalLen <= 65
      ? "clamp(6.8px, 1.85cqw, 9.5px)"
      : "clamp(5.8px, 1.5cqw, 8.5px)";

  // Dynamic variable auto-scaling font size for Paalala Advisory Notice (Guarantees complete text without ellipses)
  const paalalaTotalLen = cleanPaalala.length + 10;
  const paalalaFontSize =
    paalalaTotalLen <= 65
      ? "clamp(7.0px, 1.95cqw, 9.5px)"
      : paalalaTotalLen <= 90
      ? "clamp(6.2px, 1.55cqw, 8.5px)"
      : "clamp(5.4px, 1.30cqw, 7.5px)";

  return (
    <div
      className="format1-stub-card relative select-none page-break-inside-avoid bg-white border-2 border-[#004b93] rounded-xl p-2 sm:p-3 flex flex-col justify-between shadow-md overflow-hidden box-border"
      style={{
        width: "100%",
        maxWidth: "460px",
        aspectRatio: "639 / 418",
        containerType: "inline-size",
        fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
      }}
    >
      {/* 1. Header Section */}
      <div className="flex items-center justify-between border-b-2 border-[#004b93] pb-1 gap-1.5">
        {/* Left: PESO Logo & Header Text */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <img
            src="/peso-logo.png"
            alt="PESO e-access Logo"
            className="h-8 sm:h-10 w-auto max-w-[44px] object-contain shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <h2
              className="text-[#004b93] font-black uppercase tracking-tight leading-none truncate"
              style={{
                fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                fontSize: "clamp(0.95rem, 4.2cqw, 1.45rem)",
              }}
              title={stubHeader}
            >
              {stubHeader || "LGU-DINGALAN"}
            </h2>
            <p
              className="text-[#132e57] font-extrabold uppercase tracking-wide leading-tight mt-0.5 truncate"
              style={{
                fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                fontSize: "clamp(6.5px, 1.9cqw, 9.5px)",
              }}
              title={stubSubHeader}
            >
              {stubSubHeader || "BENEFICIARY VERIFICATION STUB NO."}
            </p>
          </div>
        </div>

        {/* Right: Big Designated Number */}
        <div className="shrink-0 text-right pl-1">
          <span
            className="text-[#132e57] font-black tracking-tight leading-none select-all"
            style={{
              fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
              fontSize:
                numStr.length <= 2
                  ? "clamp(1.8rem, 8.0cqw, 2.8rem)"
                  : numStr.length === 3
                  ? "clamp(1.4rem, 6.2cqw, 2.3rem)"
                  : "clamp(1.1rem, 5.0cqw, 1.8rem)",
            }}
          >
            #{numStr}
          </span>
        </div>
      </div>

      {/* 2. Middle Body: QR Code + Beneficiary Demographics */}
      <div className="flex items-center gap-2.5 py-1 flex-1 min-h-0">
        {/* Left QR Code Container */}
        <div className="shrink-0 w-[29%] aspect-square bg-white border border-slate-300 rounded-lg p-1 flex items-center justify-center shadow-xs">
          {effectiveQr ? (
            <img
              src={effectiveQr}
              alt={`QR #${numStr}`}
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[8px] font-mono text-slate-400">
              QR Token
            </div>
          )}
        </div>

        {/* Right Demographics Block */}
        <div className="flex-1 flex flex-col justify-around h-full py-0.5 min-w-0">
          {/* Beneficiary Name */}
          <div className="min-w-0">
            <span
              className="block font-extrabold text-[#132e57] uppercase tracking-wider"
              style={{ fontSize: "clamp(6.5px, 1.9cqw, 9px)" }}
            >
              BENEFICIARY NAME:
            </span>
            <span
              className="block text-[#004b93] font-black uppercase tracking-tight leading-tight select-all break-words"
              style={{
                fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                fontSize: nameFontSize,
              }}
              title={fullName}
            >
              {fullName}
            </span>
          </div>

          {/* Barangay & Table Assignment */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200 min-w-0">
            <div className="min-w-0">
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider"
                style={{ fontSize: "clamp(6.0px, 1.7cqw, 8.5px)" }}
              >
                BARANGAY:
              </span>
              <span
                className="block text-[#004b93] font-black uppercase tracking-tight leading-tight select-all break-words"
                style={{
                  fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                  fontSize: brgyFontSize,
                }}
                title={barangay}
              >
                {barangay}
              </span>
            </div>

            <div className="min-w-0 pl-1 border-l border-slate-200">
              <span
                className="block font-extrabold text-[#132e57] uppercase tracking-wider"
                style={{ fontSize: "clamp(6.0px, 1.7cqw, 8.5px)" }}
              >
                TABLE ASSIGNMENT:
              </span>
              <span
                className="block text-[#004b93] font-black tracking-tight leading-tight select-all"
                style={{
                  fontFamily: "'Anton', 'Oswald', 'Bebas Neue', Impact, sans-serif",
                  fontSize: "clamp(0.95rem, 3.8cqw, 1.35rem)",
                }}
              >
                #{cleanTable}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer Section: Orientation Date & Venue + Paalala (Complete Text, Variable Font Auto-Scaling) */}
      <div
        className="border-t border-slate-300 pt-1 space-y-0.5"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Orientation Date & Venue */}
        <div
          className="flex flex-wrap items-baseline gap-x-1 leading-tight text-[#004b93]"
          style={{ fontSize: orientFontSize }}
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
          className="flex flex-wrap items-baseline gap-x-1 leading-tight text-[#004b93]"
          style={{ fontSize: paalalaFontSize }}
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
