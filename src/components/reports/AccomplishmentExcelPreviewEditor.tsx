"use client";

import React, { useState } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Columns,
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
  CheckCheck,
} from "lucide-react";
import { stripStagePrefix, type PhotoStage } from "@/lib/geotag-canvas";
import { formatDate } from "@/lib/utils";

export interface PreviewDayRow {
  dayNumber: number;
  label: string;
  text: string;
}

export interface PreviewBarangayDoc {
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

export function buildDefaultSlotCaption(
  slot: PreviewSelectedSlot,
  photo: PreviewPhotoItem | undefined,
  workDayDates: Map<number, string>,
  includeGeotagInCaption: boolean
): string {
  if (!photo) return "";
  const workDate = workDayDates.get(slot.targetDayNumber) || photo.workDay?.workDate || "";
  const activity = stripStagePrefix(photo.specificActivity);
  const gpsText =
    includeGeotagInCaption &&
    typeof photo.latitude === "number" &&
    typeof photo.longitude === "number" &&
    Number.isFinite(photo.latitude) &&
    Number.isFinite(photo.longitude)
      ? `GPS: ${photo.latitude.toFixed(5)}°N, ${photo.longitude.toFixed(5)}°E`
      : "";
  const capturedText =
    includeGeotagInCaption && photo.capturedAt
      ? `Captured: ${formatDate(photo.capturedAt, "MMM dd, yyyy hh:mm a")}`
      : "";
  return [
    slot.targetDayNumber ? `Day ${slot.targetDayNumber}${workDate ? ` (${workDate})` : ""}` : "Work day not assigned",
    slot.stage,
    photo.status === "FOR_REVIEW" ? "For review" : "",
    activity,
    photo.workArea || "",
    gpsText,
    capturedText,
  ]
    .filter(Boolean)
    .join(" — ");
}

/**
 * Cleans multi-activity day text by removing generic fallback boilerplate when real
 * work-program items exist and formatting each distinct activity cleanly with bullets.
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

  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of kept) {
    const k = item.replace(/\s+/g, " ").toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(item.replace(/\s+/g, " "));
    }
  }

  if (unique.length === 1) return unique[0];
  return unique.map((item) => `• ${item}`).join("\n\n");
}

export function AccomplishmentExcelPreviewEditor({
  activeBarangay,
  doc,
  loading,
  layout,
  onChangeLayout,
  onChangeDoc,
  onResetDoc,
  onApplyHeaderToAll,
  onCleanAndFormatCurrent,
  onCleanAndFormatAll,
  selectedEntries,
  photoMap,
  workDayDates,
  requiredWorkDays,
  includeGeotagInCaption,
  onUpdateSlot,
  onReorderSlots,
  onRemoveSlot,
  onSortSlotsAuto,
  onEditPhotoPermanent,
  onZoomPhoto,
  onGoToPhotoPicker,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (loading || !doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 gap-2 bg-slate-100">
        <RefreshCw className="w-6 h-6 animate-spin text-gov-blue" />
        <p className="text-xs font-bold">Loading editable Excel preview for Barangay {activeBarangay}...</p>
      </div>
    );
  }

  const updateDayRow = (index: number, patch: Partial<PreviewDayRow>) => {
    onChangeDoc((prev) => ({
      ...prev,
      days: prev.days.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  };

  const moveDayRow = (index: number, dir: -1 | 1) => {
    onChangeDoc((prev) => {
      const next = [...prev.days];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, days: next };
    });
  };

  const insertDayRowAfter = (index: number) => {
    onChangeDoc((prev) => {
      const next = [...prev.days];
      const current = next[index];
      next.splice(index + 1, 0, {
        dayNumber: current?.dayNumber || next.length + 1,
        label: current?.label ? `${current.label} (continued)` : `Day ${next.length + 1}`,
        text: "",
      });
      return { ...prev, days: next };
    });
  };

  const removeDayRow = (index: number) => {
    onChangeDoc((prev) => {
      if (prev.days.length <= 1) return prev;
      return { ...prev, days: prev.days.filter((_, i) => i !== index) };
    });
  };

  const previewGridCols =
    layout.photoLayout === "3-col"
      ? "grid-cols-1 md:grid-cols-3"
      : layout.photoLayout === "2-col"
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 max-w-2xl mx-auto";

  const previewImgHeightClass =
    layout.photoSize === "compact"
      ? layout.photoLayout === "1-col"
        ? "h-48"
        : "h-40"
      : layout.photoSize === "large"
        ? layout.photoLayout === "1-col"
          ? "h-80"
          : "h-64"
        : layout.photoLayout === "1-col"
          ? "h-64"
          : "h-52";

  const alignClass =
    layout.textAlign === "center"
      ? "text-center"
      : layout.textAlign === "justify"
        ? "text-justify"
        : "text-left";

  const paperWidthClass =
    layout.colCWidth >= 82
      ? "max-w-[1160px]"
      : layout.colCWidth >= 60
        ? "max-w-[980px]"
        : "max-w-[800px]";

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-200/80 overflow-hidden">
      {/* Formatting & Layout Controls Toolbar */}
      <div className="bg-white border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Column C Width */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500">Text Width:</span>
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden bg-slate-50">
              {[
                { label: "Compact", width: 48 },
                { label: "Wide", width: 68 },
                { label: "Extra Wide", width: 88 },
              ].map((opt) => (
                <button
                  key={opt.width}
                  type="button"
                  onClick={() => onChangeLayout({ colCWidth: opt.width })}
                  className={`px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                    layout.colCWidth === opt.width
                      ? "bg-gov-blue text-white"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500">Text Align:</span>
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden bg-slate-50">
              {(
                [
                  { id: "left", icon: AlignLeft, label: "Left" },
                  { id: "center", icon: AlignCenter, label: "Center" },
                  { id: "justify", icon: AlignJustify, label: "Justify" },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeLayout({ textAlign: opt.id })}
                    className={`px-2 py-1 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                      layout.textAlign === opt.id
                        ? "bg-gov-blue text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                    title={`Align accomplishment text: ${opt.label}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Columns Layout */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
              <Columns className="w-3 h-3" />
              Photos:
            </span>
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden bg-slate-50">
              {(
                [
                  { id: "1-col", label: "1-Col" },
                  { id: "2-col", label: "2-Col Grid" },
                  { id: "3-col", label: "3-Col Strip" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeLayout({ photoLayout: opt.id })}
                  className={`px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                    layout.photoLayout === opt.id
                      ? "bg-emerald-600 text-white"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Size */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500">Photo Size:</span>
            <select
              value={layout.photoSize}
              onChange={(e) => onChangeLayout({ photoSize: e.target.value as PreviewLayoutConfig["photoSize"] })}
              className="px-2 py-1 text-[11px] font-bold border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
            >
              <option value="compact">Compact</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        {/* Text Formatting & Reset Quick Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onCleanAndFormatCurrent}
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            title="Remove duplicate/generic boilerplate and add clean bullet spacing for this barangay"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Clean {activeBarangay} Text</span>
          </button>
          <button
            type="button"
            onClick={onCleanAndFormatAll}
            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            title="Apply clean bullet formatting across all 11 barangays"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Clean All Barangays</span>
          </button>
          <button
            type="button"
            onClick={onResetDoc}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            title="Reset this barangay's text back to auto-generated defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Scrollable WYSIWYG Printable Excel Sheet Preview */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div
          className={`${paperWidthClass} mx-auto bg-white border border-slate-300 rounded-xl shadow-lg p-6 sm:p-8 space-y-6 transition-all`}
        >
          {/* Sheet Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <h3 className="text-lg font-black text-slate-950 tracking-tight">
                TUPAD Completion Report — <span className="text-gov-blue">Barangay {activeBarangay}</span>
              </h3>
              <button
                type="button"
                onClick={onApplyHeaderToAll}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-gov-blue text-[11px] font-bold border border-blue-200 flex items-center gap-1 transition cursor-pointer"
                title="Copy DOLE Office, Period of Work, Issued Date, and Signatory to all barangays"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Apply Office, Dates &amp; Signatory to All Barangays</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center gap-2">
                <span className="font-black text-slate-900 w-36 shrink-0">DOLE-Regional Office:</span>
                <input
                  type="text"
                  value={doc.doleOffice}
                  onChange={(e) => onChangeDoc((p) => ({ ...p, doleOffice: e.target.value }))}
                  className="flex-1 px-2.5 py-1 border-b border-slate-400 bg-slate-50/70 focus:bg-blue-50/40 focus:border-gov-blue focus:outline-none font-semibold text-slate-900 rounded-t"
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="font-black text-slate-900 w-36 shrink-0">Project Location:</span>
                <input
                  type="text"
                  value={doc.projectLocation}
                  onChange={(e) => onChangeDoc((p) => ({ ...p, projectLocation: e.target.value }))}
                  className="flex-1 px-2.5 py-1 border-b border-slate-400 bg-slate-50/70 focus:bg-blue-50/40 focus:border-gov-blue focus:outline-none font-semibold text-slate-900 rounded-t"
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="font-black text-slate-900 w-36 shrink-0">No. of Beneficiaries:</span>
                <input
                  type="text"
                  value={doc.beneficiaryCount}
                  onChange={(e) => onChangeDoc((p) => ({ ...p, beneficiaryCount: e.target.value }))}
                  className="flex-1 px-2.5 py-1 border-b border-slate-400 bg-slate-50/70 focus:bg-blue-50/40 focus:border-gov-blue focus:outline-none font-semibold text-slate-900 rounded-t"
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="font-black text-slate-900 w-36 shrink-0">Period of Work:</span>
                <input
                  type="text"
                  value={doc.periodOfWork}
                  onChange={(e) => onChangeDoc((p) => ({ ...p, periodOfWork: e.target.value }))}
                  className="flex-1 px-2.5 py-1 border-b border-slate-400 bg-slate-50/70 focus:bg-blue-50/40 focus:border-gov-blue focus:outline-none font-semibold text-slate-900 rounded-t"
                />
              </label>
            </div>
          </div>

          {/* Section A: Editable Accomplishment Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">A. Accomplishment</h4>
              <span className="text-[11px] text-slate-500">
                Click any cell below to directly edit, format, or rearrange daily accomplishment texts before export.
              </span>
            </div>

            <div className="border-2 border-slate-900 rounded-sm overflow-hidden">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 text-xs font-black text-slate-900">
                    <th className="w-[26%] border-r-2 border-slate-900 py-2 px-3 text-center">
                      Period of Work
                    </th>
                    <th className="w-[66%] border-r border-slate-300 py-2 px-3 text-center">
                      Actual Accomplishment
                    </th>
                    <th className="w-[8%] py-2 px-1 text-center text-[10px] font-bold text-slate-500 bg-slate-50">
                      Row
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {doc.days.map((row, idx) => {
                    const lineCount = Math.max(
                      3,
                      row.text.split("\n").reduce((acc, l) => acc + Math.max(1, Math.ceil(l.length / 65)), 0) + 1
                    );
                    return (
                      <tr key={idx} className="border-b border-slate-900 last:border-b-0 align-top group">
                        <td className="border-r-2 border-slate-900 p-2 bg-white align-middle">
                          <textarea
                            rows={2}
                            value={row.label}
                            onChange={(e) => updateDayRow(idx, { label: e.target.value })}
                            className="w-full text-xs font-bold text-slate-900 text-center bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/70 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-gov-blue resize-none"
                          />
                        </td>
                        <td className="border-r border-slate-200 p-2 bg-white">
                          <textarea
                            rows={Math.min(12, lineCount)}
                            value={row.text}
                            onChange={(e) => updateDayRow(idx, { text: e.target.value })}
                            placeholder="Enter actual accomplishment for this day..."
                            className={`w-full text-xs leading-relaxed text-slate-900 bg-transparent hover:bg-blue-50/40 focus:bg-blue-50/70 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-gov-blue resize-y ${alignClass}`}
                          />
                        </td>
                        <td className="p-1.5 bg-slate-50 align-middle">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveDayRow(idx, -1)}
                              className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 border border-slate-200 text-slate-600 cursor-pointer"
                              title="Move row up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === doc.days.length - 1}
                              onClick={() => moveDayRow(idx, 1)}
                              className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 border border-slate-200 text-slate-600 cursor-pointer"
                              title="Move row down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertDayRowAfter(idx)}
                              className="p-1 rounded bg-white hover:bg-blue-100 border border-slate-200 text-gov-blue cursor-pointer"
                              title="Insert continuation row below"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {doc.days.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDayRow(idx)}
                                className="p-1 rounded bg-white hover:bg-rose-100 border border-slate-200 text-rose-600 cursor-pointer"
                                title="Remove this row"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Certification & Signatory Block */}
          <div className="pt-2 space-y-4 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 shrink-0">Certification Date Line:</span>
              <input
                type="text"
                value={doc.issuedLine}
                onChange={(e) => onChangeDoc((p) => ({ ...p, issuedLine: e.target.value }))}
                className="flex-1 max-w-md px-2.5 py-1 border-b border-slate-300 bg-slate-50/70 focus:bg-blue-50/50 focus:border-gov-blue focus:outline-none text-slate-900 font-medium"
              />
            </div>

            <div className="flex justify-end">
              <div className="w-72 text-center space-y-1">
                <input
                  type="text"
                  value={doc.signatoryName}
                  onChange={(e) => onChangeDoc((p) => ({ ...p, signatoryName: e.target.value }))}
                  className="w-full text-center font-black text-xs text-slate-900 border-b border-slate-400 py-1 bg-slate-50/60 focus:bg-blue-50/40 focus:outline-none"
                />
                <input
                  type="text"
                  value={doc.signatoryTitle}
                  onChange={(e) => onChangeDoc((p) => ({ ...p, signatoryTitle: e.target.value }))}
                  className="w-full text-center text-[11px] font-semibold text-slate-700 py-0.5 bg-slate-50/60 focus:bg-blue-50/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section B: Editable & Drag-and-Drop Photo Documentation */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  B. Photo Documentation ({selectedEntries.length} Photo{selectedEntries.length === 1 ? "" : "s"})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Drag cards to rearrange photo order, edit any caption directly, or switch between 1-Col / 2-Col / 3-Col
                  layout above.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onSortSlotsAuto}
                  disabled={selectedEntries.length < 2}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                >
                  Auto-Sort (Day → Before/During/After)
                </button>
                <button
                  type="button"
                  onClick={onGoToPhotoPicker}
                  className="px-2.5 py-1 rounded-lg bg-gov-blue hover:bg-gov-dark text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add / Pick More Photos</span>
                </button>
              </div>
            </div>

            {selectedEntries.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-2 bg-slate-50">
                <ImageIcon className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">
                  No photos selected yet for Barangay {activeBarangay}.
                </p>
                <button
                  type="button"
                  onClick={onGoToPhotoPicker}
                  className="px-3.5 py-1.5 rounded-lg bg-gov-blue text-white text-xs font-bold cursor-pointer"
                >
                  Go to Step 1 to Pick Photos
                </button>
              </div>
            ) : (
              <div className={`grid ${previewGridCols} gap-4`}>
                {selectedEntries.map((slot, idx) => {
                  const photo = photoMap.get(slot.photoId);
                  if (!photo) return null;
                  const defaultCaption = buildDefaultSlotCaption(slot, photo, workDayDates, includeGeotagInCaption);
                  const captionValue = slot.customCaption !== undefined ? slot.customCaption : defaultCaption;
                  const isBeingDragged = dragIndex === idx;
                  const isDropTarget = dragOverIndex === idx && dragIndex !== null && dragIndex !== idx;

                  return (
                    <div
                      key={`${slot.photoId}-${idx}`}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverIndex !== idx) setDragOverIndex(idx);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null && dragIndex !== idx) {
                          onReorderSlots(dragIndex, idx);
                        }
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`rounded-xl border-2 bg-white overflow-hidden flex flex-col transition ${
                        isDropTarget
                          ? "border-emerald-500 ring-2 ring-emerald-400/40 scale-[1.01]"
                          : isBeingDragged
                            ? "opacity-50 border-gov-blue"
                            : "border-slate-300 hover:border-gov-blue/60"
                      }`}
                    >
                      {/* Drag Header & Arrange Controls */}
                      <div className="px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10px] font-mono font-black text-slate-700">
                            Photo #{idx + 1}
                          </span>
                          <select
                            value={slot.targetDayNumber}
                            onChange={(e) =>
                              onUpdateSlot(slot.photoId, { targetDayNumber: Number(e.target.value) })
                            }
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-slate-300 bg-white text-slate-800"
                          >
                            {Array.from({ length: requiredWorkDays || 10 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                Day {d}
                              </option>
                            ))}
                          </select>
                          <select
                            value={slot.stage}
                            onChange={(e) =>
                              onUpdateSlot(slot.photoId, { stage: e.target.value as PhotoStage })
                            }
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-slate-300 bg-white text-slate-800"
                          >
                            <option value="BEFORE">BEFORE</option>
                            <option value="DURING">DURING</option>
                            <option value="AFTER">AFTER</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onReorderSlots(idx, idx - 1)}
                            className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 border border-slate-200 text-slate-600 cursor-pointer"
                            title="Move earlier"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === selectedEntries.length - 1}
                            onClick={() => onReorderSlots(idx, idx + 1)}
                            className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-30 border border-slate-200 text-slate-600 cursor-pointer"
                            title="Move later"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditPhotoPermanent(slot.photoId)}
                            className="p-1 rounded bg-white hover:bg-gov-blue hover:text-white border border-slate-200 text-slate-700 cursor-pointer"
                            title="Edit photo geotagging & status permanently in DB"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveSlot(slot.photoId)}
                            className="p-1 rounded bg-white hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 cursor-pointer"
                            title="Remove photo from Excel sheet"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Editable Excel Caption Above Image */}
                      <div className="p-2 border-b border-slate-200 bg-amber-50/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-slate-500">
                            Excel Photo Caption:
                          </span>
                          {slot.customCaption !== undefined && (
                            <button
                              type="button"
                              onClick={() => onUpdateSlot(slot.photoId, { customCaption: undefined })}
                              className="text-[10px] font-bold text-gov-blue hover:underline cursor-pointer"
                            >
                              Reset Auto-Caption
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={captionValue}
                          onChange={(e) => onUpdateSlot(slot.photoId, { customCaption: e.target.value })}
                          className="w-full text-[11px] leading-snug text-slate-800 bg-white border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:border-gov-blue resize-y"
                        />
                      </div>

                      {/* Image Box Preview */}
                      <div
                        className={`relative ${previewImgHeightClass} bg-slate-950 flex items-center justify-center p-1.5 group cursor-pointer`}
                        onClick={() => onZoomPhoto(slot.photoId)}
                      >
                        <img
                          src={photo.imageUrl}
                          alt={captionValue}
                          className="max-w-full max-h-full object-contain"
                        />
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>Zoom</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
