"use client";

import React, { useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { type PhotoStage } from "@/lib/geotag-canvas";

export interface PreviewDayRow {
  dayNumber: number;
  label: string;
  text: string;
}

export interface PreviewBarangayDoc {
  barangayHeader?: string;
  doleOffice: string;
  projectLocation: string;
  beneficiaryCount: string;
  periodOfWork: string;
  issuedLine: string;
  signatoryName: string;
  signatoryTitle: string;
  days: PreviewDayRow[];
}

export interface PreviewLayoutConfig {
  colCWidth: number;
  textAlign: "left" | "center" | "justify";
  photoLayout: "1-col" | "2-col" | "3-col";
  photoSize: "compact" | "medium" | "large";
  photoFitMode: "fill" | "contain";
  includeEmptyDays: boolean;
}

export interface PreviewPhotoItem {
  id: string;
  programId: string;
  barangay: string | null;
  workArea: string | null;
  specificActivity: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
  uploadedAt: string;
  status: string;
  imageUrl: string;
  program?: { programCode: string; programName: string } | null;
  workDay?: { dayNumber: number; workDate: string } | null;
}

export interface PreviewSelectedSlot {
  photoId: string;
  targetBarangay: string;
  targetDayNumber: number;
  stage: PhotoStage;
  customCaption?: string;
}

interface Props {
  activeBarangay: string;
  doc: PreviewBarangayDoc | null;
  loading: boolean;
  layout: PreviewLayoutConfig;
  onChangeLayout: (patch: Partial<PreviewLayoutConfig>) => void;
  onChangeDoc: (updater: (prev: PreviewBarangayDoc) => PreviewBarangayDoc) => void;
  onResetDoc: () => void;
  onApplyHeaderToAll: () => void;
  onCleanAndFormatCurrent: () => void;
  onCleanAndFormatAll: () => void;
  selectedEntries: PreviewSelectedSlot[];
  photoMap: Map<string, PreviewPhotoItem>;
  workDayDates: Map<number, string>;
  requiredWorkDays: number;
  includeGeotagInCaption: boolean;
  onUpdateSlot: (photoId: string, patch: Partial<PreviewSelectedSlot>) => void;
  onReorderSlots: (fromIndex: number, toIndex: number) => void;
  onRemoveSlot: (photoId: string) => void;
  onSortSlotsAuto: () => void;
  onEditPhotoPermanent: (photoId: string) => void;
  onZoomPhoto: (photoId: string) => void;
  onGoToPhotoPicker: () => void;
}

/**
 * Cleans multi-activity day text into a concise, single-line / clean readable summary
 * suitable for the POBLACION landscape template's Row 3 activity line.
 */
export function cleanAccomplishmentDayText(rawText: string): string {
  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return "";

  const nonGeneric = lines.filter(
    (l) => !/^emergency employment (community|field) work(\s*\(area:\s*centro\))?\.?$/i.test(l)
  );
  const kept = nonGeneric.length > 0 ? nonGeneric : lines;

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of kept) {
    const cleaned = item.replace(/\s+/g, " ");
    const k = cleaned.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(cleaned);
    }
  }

  return unique.join("; ");
}

interface PagePreviewModel {
  dayIndex: number;
  dayNumber: number;
  pageNumberInDay: number;
  totalPagesInDay: number;
  globalPageNumber: number;
  dayLabel: string;
  activityText: string;
  grid: {
    BEFORE: [PreviewSelectedSlot | null, PreviewSelectedSlot | null];
    DURING: [PreviewSelectedSlot | null, PreviewSelectedSlot | null];
    AFTER: [PreviewSelectedSlot | null, PreviewSelectedSlot | null];
  };
}

export function AccomplishmentExcelPreviewEditor({
  activeBarangay,
  doc,
  loading,
  layout,
  onChangeLayout,
  onChangeDoc,
  onResetDoc,
  onCleanAndFormatCurrent,
  onCleanAndFormatAll,
  selectedEntries,
  photoMap,
  onUpdateSlot,
  onReorderSlots,
  onRemoveSlot,
  onSortSlotsAuto,
  onEditPhotoPermanent,
  onZoomPhoto,
  onGoToPhotoPicker,
}: Props) {
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [dropHoverKey, setDropHoverKey] = useState<string | null>(null);
  const [activeDayFilter, setActiveDayFilter] = useState<number | "ALL">("ALL");

  // Build exact POBLACION landscape pages (10 rows / 6 photo slots per page)
  const pages = useMemo<PagePreviewModel[]>(() => {
    if (!doc) return [];

    const byDay = new Map<
      number,
      { BEFORE: PreviewSelectedSlot[]; DURING: PreviewSelectedSlot[]; AFTER: PreviewSelectedSlot[] }
    >();

    for (const slot of selectedEntries) {
      const dNum = slot.targetDayNumber > 0 ? slot.targetDayNumber : 1;
      let b = byDay.get(dNum);
      if (!b) {
        b = { BEFORE: [], DURING: [], AFTER: [] };
        byDay.set(dNum, b);
      }
      if (slot.stage === "BEFORE") b.BEFORE.push(slot);
      else if (slot.stage === "AFTER") b.AFTER.push(slot);
      else b.DURING.push(slot);
    }

    const result: PagePreviewModel[] = [];
    let globalPage = 0;

    doc.days.forEach((dayRow, dayIndex) => {
      const dNum = dayRow.dayNumber || dayIndex + 1;
      const buckets = byDay.get(dNum) || { BEFORE: [], DURING: [], AFTER: [] };
      const totalDayPhotos =
        buckets.BEFORE.length + buckets.DURING.length + buckets.AFTER.length;

      if (!layout.includeEmptyDays && totalDayPhotos === 0 && !dayRow.text.trim()) {
        return;
      }

      const pageCount = Math.max(
        1,
        Math.ceil(Math.max(buckets.BEFORE.length, buckets.DURING.length, buckets.AFTER.length) / 2)
      );

      for (let pIdx = 0; pIdx < pageCount; pIdx++) {
        globalPage += 1;
        result.push({
          dayIndex,
          dayNumber: dNum,
          pageNumberInDay: pIdx + 1,
          totalPagesInDay: pageCount,
          globalPageNumber: globalPage,
          dayLabel:
            pageCount > 1 && pIdx > 0 ? `${dayRow.label} (PAGE ${pIdx + 1})` : dayRow.label,
          activityText: dayRow.text,
          grid: {
            BEFORE: [buckets.BEFORE[pIdx * 2] || null, buckets.BEFORE[pIdx * 2 + 1] || null],
            DURING: [buckets.DURING[pIdx * 2] || null, buckets.DURING[pIdx * 2 + 1] || null],
            AFTER: [buckets.AFTER[pIdx * 2] || null, buckets.AFTER[pIdx * 2 + 1] || null],
          },
        });
      }
    });

    return result;
  }, [doc, selectedEntries, layout.includeEmptyDays]);

  const visiblePages = useMemo(
    () => (activeDayFilter === "ALL" ? pages : pages.filter((p) => p.dayNumber === activeDayFilter)),
    [pages, activeDayFilter]
  );

  const dayPhotoCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const s of selectedEntries) {
      counts.set(s.targetDayNumber, (counts.get(s.targetDayNumber) || 0) + 1);
    }
    return counts;
  }, [selectedEntries]);

  if (loading || !doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 gap-2 bg-slate-100">
        <RefreshCw className="w-6 h-6 animate-spin text-gov-blue" />
        <p className="text-xs font-bold">
          Loading landscape accomplishment sheet preview for Barangay {activeBarangay}...
        </p>
      </div>
    );
  }

  const barangayHeaderValue =
    doc.barangayHeader || `BRGY. ${activeBarangay.toUpperCase()}, DINGALAN, AURORA.`;

  const updateDayRow = (dayIndex: number, patch: Partial<PreviewDayRow>) => {
    onChangeDoc((prev) => ({
      ...prev,
      days: prev.days.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)),
    }));
  };

  // Swap or move a dragged photo onto any Day + Stage + Slot (top/bottom)
  const handleDropOnSlot = (
    targetDayNumber: number,
    targetStage: PhotoStage,
    existingTargetSlot: PreviewSelectedSlot | null
  ) => {
    if (!draggingPhotoId) return;
    if (existingTargetSlot && existingTargetSlot.photoId === draggingPhotoId) {
      setDraggingPhotoId(null);
      setDropHoverKey(null);
      return;
    }

    const fromIdx = selectedEntries.findIndex((s) => s.photoId === draggingPhotoId);
    if (fromIdx < 0) return;

    const draggedSlot = selectedEntries[fromIdx];

    if (existingTargetSlot) {
      const toIdx = selectedEntries.findIndex((s) => s.photoId === existingTargetSlot.photoId);
      // If same day & same stage, reorder them in place (e.g., swap Top Row A7 <-> Bottom Row A9)
      if (
        draggedSlot.targetDayNumber === targetDayNumber &&
        draggedSlot.stage === targetStage &&
        toIdx >= 0
      ) {
        onReorderSlots(fromIdx, toIdx);
      } else {
        // Move dragged photo to target day & stage AND move existing photo to dragged photo's old slot
        onUpdateSlot(draggedSlot.photoId, { targetDayNumber, stage: targetStage });
        onUpdateSlot(existingTargetSlot.photoId, {
          targetDayNumber: draggedSlot.targetDayNumber,
          stage: draggedSlot.stage,
        });
      }
    } else {
      // Dropped onto an empty slot -> reassign Day & Stage directly!
      onUpdateSlot(draggedSlot.photoId, { targetDayNumber, stage: targetStage });
    }

    setDraggingPhotoId(null);
    setDropHoverKey(null);
  };

  const handleSwapVerticalInStage = (
    topSlot: PreviewSelectedSlot | null,
    bottomSlot: PreviewSelectedSlot | null
  ) => {
    if (!topSlot || !bottomSlot) return;
    const idxA = selectedEntries.findIndex((s) => s.photoId === topSlot.photoId);
    const idxB = selectedEntries.findIndex((s) => s.photoId === bottomSlot.photoId);
    if (idxA >= 0 && idxB >= 0) {
      onReorderSlots(idxA, idxB);
    }
  };

  const stageCols: Array<{ stage: PhotoStage; colLetter: string; badgeClass: string }> = [
    { stage: "BEFORE", colLetter: "A", badgeClass: "bg-amber-400 text-slate-950" },
    { stage: "DURING", colLetter: "C", badgeClass: "bg-blue-600 text-white" },
    { stage: "AFTER", colLetter: "E", badgeClass: "bg-emerald-600 text-white" },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-200/90 overflow-hidden">
      {/* Top POBLACION Template Formatting & Arrangement Toolbar */}
      <div className="bg-white border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-black">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>POBLACION Template · Landscape Folio (8.5&quot;×13&quot;) · 6 Photos/Page</span>
          </span>

          {/* Photo Sizing Mode */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500">Photo Fit:</span>
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden bg-slate-50">
              <button
                type="button"
                onClick={() => onChangeLayout({ photoFitMode: "fill" })}
                className={`px-2 py-1 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  layout.photoFitMode === "fill"
                    ? "bg-gov-blue text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
                title="Exact POBLACION sizing: stretches image to fill A7/C7/E7/A9/C9/E9 slot without cropping"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fill Slot (POBLACION)</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeLayout({ photoFitMode: "contain" })}
                className={`px-2 py-1 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  layout.photoFitMode === "contain"
                    ? "bg-gov-blue text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
                title="Keep original image aspect ratio centered inside the 3.88 x 2.94 in slot"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Keep Aspect</span>
              </button>
            </div>
          </div>

          {/* Include Empty Days Toggle */}
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={layout.includeEmptyDays}
              onChange={(e) => onChangeLayout({ includeEmptyDays: e.target.checked })}
              className="rounded accent-gov-blue"
            />
            <span>Include All 10 Days</span>
          </label>
        </div>

        {/* Text & Sort Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onCleanAndFormatCurrent}
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Clean {activeBarangay} Text</span>
          </button>
          <button
            type="button"
            onClick={onCleanAndFormatAll}
            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Clean All</span>
          </button>
          <button
            type="button"
            onClick={onSortSlotsAuto}
            disabled={selectedEntries.length < 2}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
          >
            Sort Photos
          </button>
          <button
            type="button"
            onClick={onResetDoc}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Day Jump Bar */}
      <div className="bg-slate-100 border-b border-slate-300 px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveDayFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer shrink-0 ${
              activeDayFilter === "ALL"
                ? "bg-gov-blue text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-200"
            }`}
          >
            All Pages ({pages.length})
          </button>
          {doc.days.map((d, idx) => {
            const dNum = d.dayNumber || idx + 1;
            const cnt = dayPhotoCounts.get(dNum) || 0;
            const isActive = activeDayFilter === dNum;
            return (
              <button
                key={dNum}
                type="button"
                onClick={() => setActiveDayFilter(dNum)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  isActive
                    ? "bg-gov-blue text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>Day {dNum}</span>
                <span
                  className={`text-[9px] font-mono px-1 rounded-full ${
                    isActive
                      ? "bg-white/20 text-white"
                      : cnt > 0
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onGoToPhotoPicker}
          className="px-2.5 py-1 rounded-lg bg-gov-blue hover:bg-gov-dark text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Photos</span>
        </button>
      </div>

      {/* Scrollable Landscape Folio Page Cards (Exact POBLACION Layout + BG TUPAD Watermark) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {visiblePages.length === 0 ? (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center space-y-2">
            <ImageIcon className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No pages shown with current filter.</p>
            <p className="text-xs text-slate-500">
              Enable &ldquo;Include All 10 Days&rdquo; or add photos in Step 1.
            </p>
          </div>
        ) : (
          visiblePages.map((page) => {
            const baseRow = (page.globalPageNumber - 1) * 10 + 1;
            const topRowNum = baseRow + 6;
            const bottomRowNum = baseRow + 8;

            return (
              <div
                key={`${page.dayNumber}-${page.pageNumberInDay}`}
                className="max-w-[1160px] mx-auto space-y-1.5"
              >
                {/* Print Page Indicator Strip */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
                  <span>
                    Print Page {page.globalPageNumber} of {pages.length} —{" "}
                    <strong className="text-slate-900">
                      {activeBarangay.toUpperCase()} · {page.dayLabel}
                    </strong>{" "}
                    <span className="font-mono text-slate-500">
                      (Excel Rows {baseRow}–{baseRow + 9} · Landscape Folio 8.5&quot;×13&quot;)
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Drag &amp; drop any photo across BEFORE / DURING / AFTER slots or Days
                  </span>
                </div>

                {/* Landscape Folio Page Canvas with Official DOLE BG TUPAD Watermark */}
                <div
                  className="relative bg-white border-2 border-slate-400 rounded-md shadow-xl overflow-hidden"
                  style={{
                    backgroundImage: `url('/images/bg-tupad-watermark.jpeg')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center top",
                  }}
                >
                  {/* Soft light veil so inputs remain super crisp while keeping BG TUPAD logos clearly visible */}
                  <div className="relative z-10 p-4 sm:p-6 space-y-2 bg-white/15">
                    {/* Rows 1-3: Exact POBLACION Header Text Block (Editable) */}
                    <div className="pr-36 sm:pr-52 space-y-0.5">
                      {/* Row 1: BRGY. {NAME}, DINGALAN, AURORA. */}
                      <input
                        type="text"
                        value={barangayHeaderValue}
                        onChange={(e) =>
                          onChangeDoc((prev) => ({ ...prev, barangayHeader: e.target.value }))
                        }
                        className="w-full text-base sm:text-xl font-black text-slate-950 tracking-tight bg-white/55 hover:bg-white/90 focus:bg-white rounded px-2 py-0.5 border border-transparent hover:border-slate-300 focus:border-gov-blue focus:outline-none uppercase"
                        title="Row 1: Barangay Title (applies across all pages of this barangay sheet)"
                      />

                      {/* Row 2: DAY X - MONTH DD, YYYY */}
                      <input
                        type="text"
                        value={doc.days[page.dayIndex]?.label || page.dayLabel}
                        onChange={(e) => updateDayRow(page.dayIndex, { label: e.target.value })}
                        className="w-full text-sm sm:text-base font-bold text-slate-900 bg-white/55 hover:bg-white/90 focus:bg-white rounded px-2 py-0.5 border border-transparent hover:border-slate-300 focus:border-gov-blue focus:outline-none uppercase"
                        title="Row 2: Day & Date Heading"
                      />

                      {/* Row 3: Specific Activity Line */}
                      <input
                        type="text"
                        value={doc.days[page.dayIndex]?.text || ""}
                        onChange={(e) => updateDayRow(page.dayIndex, { text: e.target.value })}
                        placeholder="Enter specific daily accomplishment / work program activity..."
                        className="w-full text-xs sm:text-sm font-medium text-slate-800 bg-white/55 hover:bg-white/90 focus:bg-white rounded px-2 py-0.5 border border-transparent hover:border-slate-300 focus:border-gov-blue focus:outline-none"
                        title="Row 3: Daily Accomplishment / Work Activity Description"
                      />
                    </div>

                    {/* Row 5: BEFORE | DURING | AFTER Column Headers */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {stageCols.map(({ stage }) => {
                        const topS = page.grid[stage][0];
                        const botS = page.grid[stage][1];
                        return (
                          <div key={stage} className="flex items-center justify-center gap-2">
                            <span className="text-xs sm:text-sm font-black tracking-wide text-slate-950">
                              {stage}
                            </span>
                            {topS && botS && (
                              <button
                                type="button"
                                onClick={() => handleSwapVerticalInStage(topS, botS)}
                                className="p-0.5 rounded bg-white/80 hover:bg-gov-blue hover:text-white text-slate-600 border border-slate-300 transition cursor-pointer"
                                title={`Swap top & bottom ${stage} photos`}
                              >
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Rows 7 & 9: Exact 2-Row x 3-Column Photo Grid (6 Slots = A7, C7, E7, A9, C9, E9) */}
                    {[0, 1].map((rowSlotIdx) => {
                      const excelRowNumber = rowSlotIdx === 0 ? topRowNum : bottomRowNum;
                      return (
                        <div key={rowSlotIdx} className="grid grid-cols-3 gap-3 pt-1">
                          {stageCols.map(({ stage, colLetter, badgeClass }) => {
                            const slot = page.grid[stage][rowSlotIdx];
                            const photo = slot ? photoMap.get(slot.photoId) : undefined;
                            const cellAddr = `${colLetter}${excelRowNumber}`;
                            const dropKey = `${page.dayNumber}-${page.pageNumberInDay}-${stage}-${rowSlotIdx}`;
                            const isHover = dropHoverKey === dropKey;

                            return (
                              <div
                                key={cellAddr}
                                draggable={Boolean(slot)}
                                onDragStart={() => slot && setDraggingPhotoId(slot.photoId)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (dropHoverKey !== dropKey) setDropHoverKey(dropKey);
                                }}
                                onDragLeave={() => {
                                  if (dropHoverKey === dropKey) setDropHoverKey(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleDropOnSlot(page.dayNumber, stage, slot);
                                }}
                                onDragEnd={() => {
                                  setDraggingPhotoId(null);
                                  setDropHoverKey(null);
                                }}
                                className={`relative aspect-[3543/2686] rounded-md overflow-hidden border-2 transition ${
                                  isHover
                                    ? "border-emerald-500 ring-2 ring-emerald-400/50 scale-[1.01] bg-emerald-50/70"
                                    : slot
                                      ? "border-slate-700/80 bg-slate-950 shadow-md group cursor-grab active:cursor-grabbing"
                                      : "border-dashed border-slate-400/80 bg-white/55 hover:border-gov-blue hover:bg-blue-50/60"
                                }`}
                              >
                                {slot && photo ? (
                                  <>
                                    <img
                                      src={photo.imageUrl}
                                      alt={`${stage} ${cellAddr}`}
                                      className={`w-full h-full ${
                                        layout.photoFitMode === "fill" ? "object-fill" : "object-contain"
                                      }`}
                                    />

                                    {/* Floating Top Bar Controls */}
                                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 opacity-95 group-hover:opacity-100">
                                      <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-black shadow ${badgeClass}`}
                                      >
                                        <GripVertical className="w-3 h-3" />
                                        <span>{cellAddr}</span>
                                      </span>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onZoomPhoto(slot.photoId);
                                          }}
                                          className="p-1 rounded bg-slate-950/80 hover:bg-slate-900 text-white border border-white/20 cursor-pointer"
                                          title="Zoom photo"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditPhotoPermanent(slot.photoId);
                                          }}
                                          className="p-1 rounded bg-slate-950/80 hover:bg-gov-blue text-white border border-white/20 cursor-pointer"
                                          title="Edit photo geotagging & status permanently in DB"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveSlot(slot.photoId);
                                          }}
                                          className="p-1 rounded bg-slate-950/80 hover:bg-rose-600 text-white border border-white/20 cursor-pointer"
                                          title="Remove photo from this slot"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={onGoToPhotoPicker}
                                    className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-gov-blue p-3 text-center gap-1 cursor-pointer"
                                  >
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-200/90 text-slate-700">
                                      Slot {cellAddr} · {stage} #{rowSlotIdx + 1}
                                    </span>
                                    <span className="text-[11px] font-semibold">
                                      Drop photo here or click to pick
                                    </span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
