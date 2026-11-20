"use client";

import { formatDate, normalizeBarangayName } from "@/lib/utils";

export type PhotoStage = "BEFORE" | "DURING" | "AFTER";

export interface GeotagStampOptions {
  stage: PhotoStage;
  dayNumber?: number | null;
  barangay: string;
  workArea?: string | null;
  specificActivity?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string | Date | null;
  documentedBy?: string | null;
}

/**
 * Reference coordinates for Dingalan, Aurora barangays for quick geotag presets.
 */
export const DINGALAN_BARANGAY_COORDS: Record<string, { lat: number; lng: number }> = {
  Aplaya: { lat: 15.3886, lng: 121.3968 },
  "Butas na Bato": { lat: 15.3492, lng: 121.3854 },
  Caragsacan: { lat: 15.3831, lng: 121.3941 },
  Davildavilan: { lat: 15.3245, lng: 121.3792 },
  Dikapanikian: { lat: 15.4682, lng: 121.4345 },
  Ibona: { lat: 15.2918, lng: 121.3912 },
  Matawe: { lat: 15.2634, lng: 121.4126 },
  Paltic: { lat: 15.4125, lng: 121.4048 },
  Poblacion: { lat: 15.3941, lng: 121.3965 },
  Tanawan: { lat: 15.4356, lng: 121.3728 },
  Umiray: { lat: 15.2065, lng: 121.4178 },
};

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load photo image for geotagging."));
    img.src = src;
  });
}

export function stripStagePrefix(text?: string | null): string {
  return (text || "")
    .replace(/^\s*(?:\[(?:BEFORE|DURING|AFTER)\]\s*[:\-–]?|(?:BEFORE|DURING|AFTER)\s*[:\-–])\s*/i, "")
    .trim();
}

export function detectPhotoStage(specificActivity?: string | null): PhotoStage {
  const act = (specificActivity || "").toUpperCase();
  if (/^\s*(?:\[BEFORE\]|BEFORE\s*[:\-–])/i.test(act) || act.includes("[BEFORE]")) return "BEFORE";
  if (/^\s*(?:\[AFTER\]|AFTER\s*[:\-–])/i.test(act) || act.includes("[AFTER]")) return "AFTER";
  return "DURING";
}

/**
 * Draws the official PESO-Dingalan top & bottom geotag banners onto an image
 * using the exact proportions used during field capture (9% top, 22% bottom),
 * allowing clean re-stamping when geotagging or work program metadata is edited.
 */
export async function renderGeotaggedPhotoDataUrl(
  imageSrc: string,
  options: GeotagStampOptions
): Promise<string> {
  const sourceElement = await loadHtmlImage(imageSrc);

  let logoImage: HTMLImageElement | undefined;
  try {
    logoImage = await loadHtmlImage("/images/peso-ec-access-emblem.png");
  } catch {
    logoImage = undefined;
  }

  const canvas = document.createElement("canvas");
  let width = sourceElement.naturalWidth || 1280;
  let height = sourceElement.naturalHeight || 720;

  const maxDim = 1280;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available.");

  ctx.drawImage(sourceElement, 0, 0, width, height);

  const baseFontSize = Math.max(13, Math.round(width * 0.022));
  const smallFontSize = Math.max(10, Math.round(width * 0.016));
  const padding = Math.round(width * 0.02);
  const activeStage: PhotoStage = options.stage || "DURING";
  const targetBrgy = normalizeBarangayName(options.barangay || "Poblacion");

  // 1. Top Header Banner (opaque dark navy to cleanly cover any prior top banner)
  const topBannerHeight = Math.round(height * 0.095);
  ctx.fillStyle = "rgba(10, 25, 47, 0.96)";
  ctx.fillRect(0, 0, width, topBannerHeight);

  let textStartX = padding;
  if (logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    const logoSize = Math.round(topBannerHeight * 0.72);
    const logoY = Math.round((topBannerHeight - logoSize) / 2);
    ctx.drawImage(logoImage, padding, logoY, logoSize, logoSize);
    textStartX = padding + logoSize + Math.round(width * 0.01);
  }

  ctx.fillStyle = "#F59E0B";
  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("PESO-Dingalan TUPAD EC Management", textStartX, topBannerHeight / 2);

  const dayLabel = options.dayNumber ? `DAY ${options.dayNumber} • ` : "";
  const rightText = `${dayLabel}BRGY. ${targetBrgy.toUpperCase()}`;
  ctx.font = `bold ${smallFontSize}px monospace`;
  const rightTextWidth = ctx.measureText(rightText).width;

  const stagePillText = activeStage;
  ctx.font = `bold ${Math.max(10, Math.round(smallFontSize * 0.95))}px sans-serif`;
  const stagePillMetrics = ctx.measureText(stagePillText);
  const pillPadX = Math.max(7, Math.round(width * 0.008));
  const pillW = stagePillMetrics.width + pillPadX * 2;
  const pillH = Math.round(topBannerHeight * 0.52);
  const pillX = width - padding - rightTextWidth - pillW - Math.round(width * 0.014);
  const pillY = Math.round((topBannerHeight - pillH) / 2);

  let stageBgColor = "#3B82F6";
  let stageTextColor = "#FFFFFF";
  if (activeStage === "BEFORE") {
    stageBgColor = "#F59E0B";
    stageTextColor = "#0F172A";
  } else if (activeStage === "AFTER") {
    stageBgColor = "#10B981";
    stageTextColor = "#FFFFFF";
  }

  if (pillX > textStartX + Math.round(width * 0.28)) {
    ctx.fillStyle = stageBgColor;
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillW - r, pillY);
    ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
    ctx.lineTo(pillX + pillW, pillY + pillH - r);
    ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
    ctx.lineTo(pillX + r, pillY + pillH);
    ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r);
    ctx.lineTo(pillX, pillY + r);
    ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = stageTextColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stagePillText, pillX + pillW / 2, topBannerHeight / 2);
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${smallFontSize}px monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(rightText, width - padding, topBannerHeight / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // 2. Bottom Geotag & Activity Banner (opaque dark backdrop to cleanly replace prior stamp)
  const bottomBannerHeight = Math.round(height * 0.225);
  const bottomY = height - bottomBannerHeight;

  ctx.fillStyle = "rgba(3, 7, 18, 0.96)";
  ctx.fillRect(0, bottomY, width, bottomBannerHeight);

  ctx.fillStyle = "#3B82F6";
  ctx.fillRect(0, bottomY, width, 4);

  const lineSpacing = Math.round(bottomBannerHeight * 0.22);
  const valueX = padding + Math.round(width * 0.28);

  // Line 1: Work Area & Location
  ctx.fillStyle = "#93C5FD";
  ctx.font = `bold ${smallFontSize}px monospace`;
  ctx.fillText("LOCATION & WORK AREA:", padding, bottomY + lineSpacing * 1);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${baseFontSize}px sans-serif`;
  const areaDisplay = `${(options.workArea || targetBrgy).trim()} (Barangay ${targetBrgy})`;
  ctx.fillText(areaDisplay.length > 62 ? areaDisplay.slice(0, 59) + "..." : areaDisplay, valueX, bottomY + lineSpacing * 1);

  // Line 2: Specific Activity with Stage
  ctx.fillStyle = "#FDE68A";
  ctx.font = `bold ${smallFontSize}px monospace`;
  ctx.fillText(`ACTIVITY [${activeStage}]:`, padding, bottomY + lineSpacing * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${smallFontSize + 1}px sans-serif`;
  const cleanAct = stripStagePrefix(options.specificActivity) || "Emergency Employment Community Work";
  const activityText = `[${activeStage}] ${cleanAct}`;
  ctx.fillText(activityText.length > 72 ? activityText.slice(0, 69) + "..." : activityText, valueX, bottomY + lineSpacing * 2);

  // Line 3: GPS Coordinates & Timestamp
  const lat = Number.isFinite(Number(options.latitude)) ? Number(options.latitude) : 15.3941;
  const lng = Number.isFinite(Number(options.longitude)) ? Number(options.longitude) : 121.3965;
  const captureDateObj = options.capturedAt ? new Date(options.capturedAt) : new Date();
  const safeDate = Number.isNaN(captureDateObj.getTime()) ? new Date() : captureDateObj;
  const formattedDate = formatDate(safeDate, "MM/dd/yyyy hh:mm:ss a");

  ctx.fillStyle = "#34D399";
  ctx.font = `bold ${smallFontSize}px monospace`;
  ctx.fillText("GPS / TIMESTAMP:", padding, bottomY + lineSpacing * 3);
  ctx.fillStyle = "#E2E8F0";
  ctx.fillText(
    `GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E  •  PST: ${formattedDate}`,
    valueX,
    bottomY + lineSpacing * 3
  );

  // Line 4: Documenter Sign
  const docName = (options.documentedBy || "Field Coordinator").trim();
  ctx.fillStyle = "#CBD5E1";
  ctx.font = `italic ${Math.max(9, smallFontSize - 1)}px sans-serif`;
  ctx.fillText(
    `Documented by: ${docName} • PESO-Dingalan TUPAD EC Management`,
    padding,
    bottomY + lineSpacing * 3.9
  );

  return canvas.toDataURL("image/jpeg", 0.8);
}
