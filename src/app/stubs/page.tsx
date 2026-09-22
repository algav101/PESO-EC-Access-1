"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isFieldCoordinator } from "@/lib/permissions";
import {
  Printer,
  QrCode,
  Settings2,
  Eye,
  Sliders,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileText,
  Table as TableIcon,
  Layers,
  Sparkles,
  Grid,
  CreditCard,
  Tag,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Edit3,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  MapPin,
  Type,
  Maximize2,
  AlignLeft,
  AlignCenter,
  Move,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  normalizeBarangayName,
  normalizeSitioName,
  getStandardBarangayName,
  CANONICAL_SITIOS_BY_BARANGAY,
  CANONICAL_BARANGAYS,
} from "@/lib/dingalan-groupings";
import { MultiSelectFilter } from "@/components/common/MultiSelectFilter";
import { TableAssignmentModal } from "@/components/tables/TableAssignmentModal";
import { ETupadCard } from "@/components/stubs/ETupadCard";
import { Format1Stub } from "@/components/stubs/Format1Stub";
import { Format4SchedulePass } from "@/components/stubs/Format4SchedulePass";
import {
  getQrDataUrl,
  getCachedQrSync,
  batchPreloadQrCodes,
} from "@/lib/qr-client-cache";

type PrintTemplateMode = "FULL_STUB" | "QR_CARD_ONLY" | "STICKER_LABEL" | "SCHEDULE_PASS";

function StubsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const urlProgramId = searchParams.get("programId");

  // Redirect coordinators to field hub
  useEffect(() => {
    if (isFieldCoordinator(user)) {
      router.replace("/field");
    }
  }, [user, router]);

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(urlProgramId || "");
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [qrProgress, setQrProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Print Mode
  const [templateMode, setTemplateMode] = useState<PrintTemplateMode>("FULL_STUB");

  // Designated Batch QR Generation Modal State
  const [isDesignatedGenModalOpen, setIsDesignatedGenModalOpen] = useState(false);
  const [isGeneratingDesignated, setIsGeneratingDesignated] = useState(false);
  const [designatedGenProgress, setDesignatedGenProgress] = useState<string | null>(null);
  const [designatedSuccessMsg, setDesignatedSuccessMsg] = useState<string | null>(null);
  const [forceRegenerateQrs, setForceRegenerateQrs] = useState(false);
  const [designatedFilterBrgy, setDesignatedFilterBrgy] = useState("ALL");

  // Designer layout controls (Manual Row and Column Input Support)
  const [paperSize, setPaperSize] = useState("A4");
  const [columnsPerPage, setColumnsPerPage] = useState(2);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [reminderText, setReminderText] = useState(
    "IMPORTANT: Bring this original QR stub and 1 Valid Government ID to Orientation and all 10 Daily Attendance sessions."
  );

  // =========================================================================
  // Editable Stub Text Customizer (Header, Orientation Date & Venue, Paalala)
  // =========================================================================
  const [stubHeader, setStubHeader] = useState("LGU-DINGALAN");
  const [stubSubHeader, setStubSubHeader] = useState("BENEFICIARY VERIFICATION STUB NO.");
  const [customOrientation, setCustomOrientation] = useState("Sep 04, 2026 • 08:00 (Municipal Gymnasium)");
  const [customPaalala, setCustomPaalala] = useState(
    "DALHIN ANG STUB NA ITO AT VALID ID NA GINAMIT SA APPLICATION SA ORIENTATION"
  );
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(true);
  const [designTab, setDesignTab] = useState<"TEXT" | "FONTS" | "POSITIONING">("FONTS");

  // =========================================================================
  // Manual Font Sizing & Typography Controls (Live Sliders & Steppers)
  // =========================================================================
  const [headerFontSize, setHeaderFontSize] = useState<number>(6.0);
  const [subHeaderFontSize, setSubHeaderFontSize] = useState<number>(2.5);
  const [desigNumFontSize, setDesigNumFontSize] = useState<number>(8.8);
  const [nameFontSizeScale, setNameFontSizeScale] = useState<number>(1.0);
  const [brgyFontSizeScale, setBrgyFontSizeScale] = useState<number>(1.0);
  const [tableFontSize, setTableFontSize] = useState<number>(4.8);
  const [orientationFontSize, setOrientationFontSize] = useState<number>(2.3);
  const [paalalaFontSize, setPaalalaFontSize] = useState<number>(2.0);
  const [labelsFontSize, setLabelsFontSize] = useState<number>(2.0);

  // =========================================================================
  // Manual Positioning & Dimensions Controls
  // =========================================================================
  const [qrSizePercent, setQrSizePercent] = useState<number>(28);
  const [cardPadding, setCardPadding] = useState<number>(2.4);
  const [nameAlignment, setNameAlignment] = useState<"left" | "center">("left");

  // Filters & Ranges (with Multi-Select Purok / Sitio filtering and sorting)
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>(["ALL"]);
  const [selectedSitios, setSelectedSitios] = useState<string[]>(["ALL"]);
  const [filterTable, setFilterTable] = useState("ALL");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [sortField, setSortField] = useState<"NUMERIC" | "SITIO" | "NAME" | "BARANGAY" | "TABLE">("NUMERIC");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  // High-Performance Screen Virtualization / Sheet Pagination
  const [previewSheetPage, setPreviewSheetPage] = useState<number>(1);
  const [viewAllInPreview, setViewAllInPreview] = useState<boolean>(false);

  // Reprint modal state
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [reprintReason, setReprintReason] = useState("");
  const [printType, setPrintType] = useState<"INITIAL" | "REPRINT">("INITIAL");

  // Table Assignment Modal state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      fetchBeneficiaries(selectedProgramId);
    }
  }, [selectedProgramId]);

  // Adjust default grid layout based on template mode
  useEffect(() => {
    if (templateMode === "QR_CARD_ONLY") {
      setColumnsPerPage(2);
      setRowsPerPage(4);
    } else if (templateMode === "STICKER_LABEL") {
      setColumnsPerPage(3);
      setRowsPerPage(6);
    } else if (templateMode === "SCHEDULE_PASS") {
      setColumnsPerPage(2);
      setRowsPerPage(2);
    } else {
      setColumnsPerPage(2);
      setRowsPerPage(5);
    }
    setPreviewSheetPage(1);
  }, [templateMode]);

  const handleBatchGenerateDesignated = async () => {
    if (!selectedProgramId) return;
    setIsGeneratingDesignated(true);
    setDesignatedGenProgress("Nagsisimulang mag-generate ng designated QR codes...");
    setDesignatedSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/programs/${selectedProgramId}/qr/generate-designated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forceRegenerate: forceRegenerateQrs,
          barangay: designatedFilterBrgy !== "ALL" ? designatedFilterBrgy : undefined,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDesignatedSuccessMsg(
          data.message || `Matagumpay na nai-generate ang Designated QR Codes para sa ${data.stats?.totalCount || "lahat ng"} benepisyaryo.`
        );
        await fetchBeneficiaries(selectedProgramId);
      } else {
        alert("Nabigo ang pag-generate ng QR codes: " + (data.error || "May naganap na error."));
      }
    } catch (err: any) {
      alert("Network Error: " + err.message);
    } finally {
      setIsGeneratingDesignated(false);
      setDesignatedGenProgress(null);
    }
  };

  const currentProgram = programs.find((p) => p.id === selectedProgramId);

  // Update default orientation text when program loads
  useEffect(() => {
    if (currentProgram) {
      const venueShort = currentProgram.orientationVenue
        ? currentProgram.orientationVenue.replace(/Dingalan Municipal Gym/i, "Municipal Gymnasium")
        : "Municipal Gymnasium";
      const dateStr = currentProgram.orientationDate
        ? formatDate(currentProgram.orientationDate, "MMM dd, yyyy")
        : "Sep 04, 2026";
      const timeStr = currentProgram.orientationTime || "08:00";
      setCustomOrientation(`${dateStr} • ${timeStr} (${venueShort})`);
    }
  }, [currentProgram]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/v1/programs");
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
        if (!selectedProgramId && data.programs?.length > 0) {
          setSelectedProgramId(data.programs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBeneficiaries = async (programId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/programs/${programId}/beneficiaries?withSchedule=true`);
      if (res.ok) {
        const data = await res.json();
        const benelist = data.beneficiaries || [];

        // Natural numeric sort by designatedNumber
        benelist.sort((a: any, b: any) => {
          const numA = parseInt(a.designatedNumber, 10);
          const numB = parseInt(b.designatedNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, { numeric: true });
        });

        setBeneficiaries(benelist);
        setLoading(false);

        // Preload visible page QRs immediately
        const firstSheetItems = benelist.slice(0, 20);
        const fastMap: Record<string, string> = {};
        for (const pb of firstSheetItems) {
          const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE");
          if (activeQr) {
            fastMap[pb.id] = await getQrDataUrl(activeQr.publicToken);
          }
        }
        setQrImages((prev) => ({ ...prev, ...fastMap }));

        // Asynchronously preload all remaining QRs in background microtasks without freezing UI
        const allTokens = benelist
          .map((pb: any) => pb.qrCodes?.find((q: any) => q.status === "ACTIVE")?.publicToken)
          .filter(Boolean);

        batchPreloadQrCodes(allTokens, "#0c3b6d", (done, total) => {
          setQrProgress({ done, total });
        }).then((fullMap) => {
          const idToUrlMap: Record<string, string> = {};
          for (const pb of benelist) {
            const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE");
            if (activeQr && fullMap[activeQr.publicToken]) {
              idToUrlMap[pb.id] = fullMap[activeQr.publicToken];
            }
          }
          setQrImages((prev) => ({ ...prev, ...idToUrlMap }));
        });
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Collect unique table numbers
  const uniqueTables = useMemo(() => {
    return Array.from(new Set(beneficiaries.map((b) => b.tableNumber).filter(Boolean))).sort(
      (a: any, b: any) => a.localeCompare(b, undefined, { numeric: true })
    );
  }, [beneficiaries]);

  // Barangay Multi-Select Options with counts
  const barangayOptions = useMemo(() => {
    return CANONICAL_BARANGAYS.map((b) => {
      const stdB = normalizeBarangayName(b);
      const count = beneficiaries.filter(
        (pb) => normalizeBarangayName(pb.beneficiary?.barangay) === stdB
      ).length;
      return {
        value: b,
        label: `Brgy. ${b}`,
        count,
      };
    });
  }, [beneficiaries]);

  // Collect unique Puroks / Sitios dynamically (Canonical & Normalized)
  const uniqueSitios = useMemo(() => {
    const list: string[] = [];
    const isAllBrgy = selectedBarangays.length === 0 || selectedBarangays.includes("ALL");

    beneficiaries.forEach((pb) => {
      const bBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
      if (isAllBrgy || selectedBarangays.some((sb) => normalizeBarangayName(sb) === bBrgy)) {
        const s = normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay);
        if (s && s !== "None" && s !== "N/A" && s !== "Centro") {
          list.push(s);
        }
      }
    });

    if (!isAllBrgy) {
      selectedBarangays.forEach((sb) => {
        const stdBrgy = getStandardBarangayName(sb);
        const canon = CANONICAL_SITIOS_BY_BARANGAY[stdBrgy] || [];
        canon.forEach((c) => list.push(c));
      });
    } else {
      Object.values(CANONICAL_SITIOS_BY_BARANGAY).forEach((sitios) => {
        sitios.forEach((c) => list.push(c));
      });
    }

    return Array.from(new Set(list)).sort((a: any, b: any) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [beneficiaries, selectedBarangays]);

  // Sitio Multi-Select Options with counts
  const sitioOptions = useMemo(() => {
    return uniqueSitios.map((s) => {
      const count = beneficiaries.filter((pb) => {
        const bBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
        const isBrgyMatch =
          selectedBarangays.length === 0 ||
          selectedBarangays.includes("ALL") ||
          selectedBarangays.some((sb) => normalizeBarangayName(sb) === bBrgy);
        if (!isBrgyMatch) return false;
        const bSitio = normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay);
        return bSitio === s;
      }).length;
      return {
        value: s,
        label: s,
        count,
      };
    });
  }, [uniqueSitios, beneficiaries, selectedBarangays]);

  // Filter and sort beneficiaries (Supports Multi-Select Purok/Sitio sorting!)
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries
      .filter((pb) => {
        const bBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
        const bSitio = normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay);

        const isAllBrgy = selectedBarangays.length === 0 || selectedBarangays.includes("ALL");
        const matchesBrgy =
          isAllBrgy ||
          selectedBarangays.some((sb) => normalizeBarangayName(sb) === bBrgy);

        const isAllSitio = selectedSitios.length === 0 || selectedSitios.includes("ALL");
        const matchesSitio =
          isAllSitio ||
          selectedSitios.some(
            (st) => normalizeSitioName(st, pb.beneficiary?.barangay) === bSitio || st === bSitio
          );

        const matchesTable = filterTable === "ALL" || pb.tableNumber === filterTable;

        const num = parseInt(pb.designatedNumber, 10);
        const startNum = rangeStart ? parseInt(rangeStart, 10) : null;
        const endNum = rangeEnd ? parseInt(rangeEnd, 10) : null;

        const matchesStart = startNum === null || isNaN(num) || num >= startNum;
        const matchesEnd = endNum === null || isNaN(num) || num <= endNum;

        return matchesBrgy && matchesSitio && matchesTable && matchesStart && matchesEnd;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === "SITIO") {
          const sitioA = normalizeSitioName(a.beneficiary?.sitio, a.beneficiary?.barangay);
          const sitioB = normalizeSitioName(b.beneficiary?.sitio, b.beneficiary?.barangay);
          comp = sitioA.localeCompare(sitioB, undefined, { numeric: true });
          if (comp === 0) {
            const numA = parseInt(a.designatedNumber, 10);
            const numB = parseInt(b.designatedNumber, 10);
            comp = !isNaN(numA) && !isNaN(numB) ? numA - numB : 0;
          }
        } else if (sortField === "NAME") {
          comp = (a.beneficiary?.fullName || "").localeCompare(b.beneficiary?.fullName || "");
        } else if (sortField === "BARANGAY") {
          const brgyA = normalizeBarangayName(a.beneficiary?.barangay);
          const brgyB = normalizeBarangayName(b.beneficiary?.barangay);
          comp = brgyA.localeCompare(brgyB, undefined, { numeric: true });
          if (comp === 0) {
            const sitioA = normalizeSitioName(a.beneficiary?.sitio, a.beneficiary?.barangay);
            const sitioB = normalizeSitioName(b.beneficiary?.sitio, b.beneficiary?.barangay);
            comp = sitioA.localeCompare(sitioB, undefined, { numeric: true });
          }
        } else if (sortField === "TABLE") {
          comp = String(a.tableNumber || "").localeCompare(String(b.tableNumber || ""), undefined, { numeric: true });
        } else {
          // NUMERIC (default #)
          const numA = parseInt(a.designatedNumber, 10);
          const numB = parseInt(b.designatedNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            comp = numA - numB;
          } else {
            comp = String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, { numeric: true });
          }
        }
        return sortOrder === "ASC" ? comp : -comp;
      });
  }, [beneficiaries, selectedBarangays, selectedSitios, filterTable, rangeStart, rangeEnd, sortField, sortOrder]);

  // Virtual Sheet Pagination calculations
  const sheetCapacity = Math.max(1, columnsPerPage * rowsPerPage);
  const totalSheets = Math.max(1, Math.ceil(filteredBeneficiaries.length / sheetCapacity));
  const safeCurrentSheet = Math.min(Math.max(1, previewSheetPage), totalSheets);

  // Items to display on screen (either single active sheet for 0ms lag, or all if toggled)
  const screenBeneficiaries = useMemo(() => {
    if (viewAllInPreview) return filteredBeneficiaries;
    const startIndex = (safeCurrentSheet - 1) * sheetCapacity;
    return filteredBeneficiaries.slice(startIndex, startIndex + sheetCapacity);
  }, [filteredBeneficiaries, viewAllInPreview, safeCurrentSheet, sheetCapacity]);

  // Ensure visible items have their QRs generated immediately on sheet flip
  useEffect(() => {
    if (screenBeneficiaries.length > 0) {
      const missing = screenBeneficiaries.filter(
        (pb) => !qrImages[pb.id] && pb.qrCodes?.some((q: any) => q.status === "ACTIVE")
      );
      if (missing.length > 0) {
        Promise.all(
          missing.map(async (pb) => {
            const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE");
            if (activeQr) {
              const url = await getQrDataUrl(activeQr.publicToken);
              return { id: pb.id, url };
            }
            return null;
          })
        ).then((results) => {
          const newMap: Record<string, string> = {};
          for (const item of results) {
            if (item) newMap[item.id] = item.url;
          }
          setQrImages((prev) => ({ ...prev, ...newMap }));
        });
      }
    }
  }, [screenBeneficiaries, qrImages]);

  const handlePrint = async () => {
    if (printType === "REPRINT" && !reprintReason.trim()) {
      alert("Please specify the mandatory reprint reason for auditing.");
      return;
    }

    try {
      // Record print batch in background
      fetch(`/api/v1/programs/${selectedProgramId}/stubs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchName: `Batch Print [${templateMode}] - ${paperSize} (${filteredBeneficiaries.length} Cards)`,
          paperSize,
          rowsPerPage,
          columnsPerPage,
          reminderText: customPaalala || reminderText,
          beneficiaryIds: filteredBeneficiaries.map((b) => b.id),
          printType,
          reason: reprintReason,
        }),
      }).catch(console.error);

      setIsReprintModalOpen(false);
      window.print();
    } catch (e) {
      console.error("Print log error:", e);
      window.print();
    }
  };

  const handleClearRange = () => {
    setRangeStart("");
    setRangeEnd("");
    setFilterTable("ALL");
    setSelectedBarangays(["ALL"]);
    setSelectedSitios(["ALL"]);
    setSortField("NUMERIC");
    setPreviewSheetPage(1);
  };

  const handleResetStubTexts = () => {
    setStubHeader("LGU-DINGALAN");
    setStubSubHeader("BENEFICIARY VERIFICATION STUB NO.");
    if (currentProgram) {
      const venueShort = currentProgram.orientationVenue
        ? currentProgram.orientationVenue.replace(/Dingalan Municipal Gym/i, "Municipal Gymnasium")
        : "Municipal Gymnasium";
      const dateStr = currentProgram.orientationDate
        ? formatDate(currentProgram.orientationDate, "MMM dd, yyyy")
        : "Sep 04, 2026";
      const timeStr = currentProgram.orientationTime || "08:00";
      setCustomOrientation(`${dateStr} • ${timeStr} (${venueShort})`);
    } else {
      setCustomOrientation("Sep 04, 2026 • 08:00 (Municipal Gymnasium)");
    }
    setCustomPaalala("DALHIN ANG STUB NA ITO AT VALID ID NA GINAMIT SA APPLICATION SA ORIENTATION");

    // Reset Font Sizing & Dimensions
    setHeaderFontSize(6.0);
    setSubHeaderFontSize(2.5);
    setDesigNumFontSize(8.8);
    setNameFontSizeScale(1.0);
    setBrgyFontSizeScale(1.0);
    setTableFontSize(4.8);
    setOrientationFontSize(2.3);
    setPaalalaFontSize(2.0);
    setLabelsFontSize(2.0);
    setQrSizePercent(28);
    setCardPadding(2.4);
    setNameAlignment("left");
  };

  return (
    <div className="space-y-6">
      {/* Control Panel (Hidden during physical browser printing) */}
      <div className="no-print space-y-5">
        {/* Header Title & Top Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Printer className="w-6 h-6 text-gov-blue" />
              <span>QR Stub & Dedicated Unique QR Card Printing Engine</span>
            </h1>
            <p className="text-xs text-slate-500">
              Numerically arranged or Purok/Sitio sorted printing, manual font sizing, spacing customizer, and ultra-fast sheet navigation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDesignatedGenModalOpen(true);
                setDesignatedSuccessMsg(null);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition border border-emerald-400/40 active:scale-95"
              title="Mag-generate ng bagong scannable QR pass na direct nagdidirekta sa designated schedule"
            >
              <Sparkles className="w-4 h-4 text-gov-goldLight" />
              <span>Generate Designated QR for All</span>
            </button>

            <button
              onClick={() => setIsTableModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-gov-goldLight font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition border border-gov-gold/30"
            >
              <TableIcon className="w-4 h-4 text-gov-gold" />
              <span>Configure Table Ranges</span>
            </button>

            <button
              onClick={() => {
                setPrintType("INITIAL");
                handlePrint();
              }}
              className="px-5 py-2 bg-gov-blue hover:bg-gov-light text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition"
            >
              <Printer className="w-4 h-4 text-gov-goldLight" />
              <span>Print All {filteredBeneficiaries.length} Cards</span>
            </button>

            <button
              onClick={() => {
                setPrintType("REPRINT");
                setIsReprintModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reprint Log</span>
            </button>
          </div>
        </div>

        {/* Designated QR Generation Notification Alert */}
        {designatedSuccessMsg && (
          <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500/80 rounded-2xl flex items-start space-x-3 text-emerald-200 text-xs shadow-lg animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <span>🌟 Designated QR Codes Active &amp; Synchronized!</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                  CANONICAL SOURCE ESTABLISHED
                </span>
              </p>
              <p className="leading-relaxed">{designatedSuccessMsg}</p>
              <p className="text-[11px] text-emerald-300/80">
                Ang na-generate na QR code dito ang opisyal na magsisilbing reference para sa cellphone camera scanning at para sa <strong>Field Scanner Hub (Designated Beneficiary QR Pass &amp; Screenshot Studio)</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Template Format Selector Tabs (Instant 0ms Switching) */}
        <div className="p-1.5 bg-slate-100 rounded-2xl flex flex-wrap gap-2 border border-slate-200 shadow-inner">
          <button
            onClick={() => setTemplateMode("FULL_STUB")}
            className={`flex-1 min-w-[180px] py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
              templateMode === "FULL_STUB"
                ? "bg-gov-blue text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <FileText className={`w-4 h-4 ${templateMode === "FULL_STUB" ? "text-gov-goldLight" : "text-slate-400"}`} />
            <span>Format 1: Full Verification Stub</span>
          </button>

          <button
            onClick={() => setTemplateMode("QR_CARD_ONLY")}
            className={`flex-1 min-w-[180px] py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
              templateMode === "QR_CARD_ONLY"
                ? "bg-gov-blue text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <CreditCard className={`w-4 h-4 ${templateMode === "QR_CARD_ONLY" ? "text-gov-goldLight" : "text-slate-400"}`} />
            <span>Format 2: e-TUPAD Badge Card</span>
          </button>

          <button
            onClick={() => setTemplateMode("STICKER_LABEL")}
            className={`flex-1 min-w-[180px] py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
              templateMode === "STICKER_LABEL"
                ? "bg-gov-blue text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <Tag className={`w-4 h-4 ${templateMode === "STICKER_LABEL" ? "text-gov-goldLight" : "text-slate-400"}`} />
            <span>Format 3: QR Sticker Labels</span>
          </button>

          <button
            onClick={() => setTemplateMode("SCHEDULE_PASS")}
            className={`flex-1 min-w-[220px] py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 ${
              templateMode === "SCHEDULE_PASS"
                ? "bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md border border-emerald-400/40"
                : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${templateMode === "SCHEDULE_PASS" ? "text-gov-gold" : "text-emerald-600"}`} />
            <span>Format 4: Designated Work Area &amp; Schedule Pass</span>
          </button>
        </div>

        {/* Feature: Multi-Tab Stub Text, Font Sizing & Positioning Customizer Panel */}
        <div className="gov-card border-2 border-gov-blue/30 overflow-hidden bg-white shadow-md">
          <div
            onClick={() => setIsTextEditorOpen(!isTextEditorOpen)}
            className="p-4 bg-gradient-to-r from-blue-50/90 via-slate-50 to-white flex items-center justify-between cursor-pointer hover:bg-blue-50 transition select-none"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-gov-blue text-gov-goldLight rounded-lg">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>Custom Stub Text, Font Sizes & Positioning Studio</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-gov-blue border border-blue-200">
                    Live Real-Time Tuning
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Manually adjust text content, live font sizes (Header, Name, Barangay, Table), QR size, and card spacing.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetStubTexts();
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-gov-blue hover:bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center space-x-1"
                title="Reset all design settings to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
              <div className="text-slate-400">
                {isTextEditorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {isTextEditorOpen && (
            <div className="border-t border-slate-200/80 bg-white">
              {/* Studio Sub-Navigation Tabs */}
              <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDesignTab("FONTS")}
                  className={`py-2 px-3 font-extrabold flex items-center space-x-1.5 border-b-2 transition ${
                    designTab === "FONTS"
                      ? "border-gov-blue text-gov-blue bg-white rounded-t-lg shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>1. Font Sizes & Scales</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDesignTab("POSITIONING")}
                  className={`py-2 px-3 font-extrabold flex items-center space-x-1.5 border-b-2 transition ${
                    designTab === "POSITIONING"
                      ? "border-gov-blue text-gov-blue bg-white rounded-t-lg shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>2. Positioning & QR Scale</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDesignTab("TEXT")}
                  className={`py-2 px-3 font-extrabold flex items-center space-x-1.5 border-b-2 transition ${
                    designTab === "TEXT"
                      ? "border-gov-blue text-gov-blue bg-white rounded-t-lg shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>3. Text Content & Wording</span>
                </button>
              </div>

              {/* TAB 1: FONT SIZES & SCALES */}
              {designTab === "FONTS" && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Header Title Size */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Header Title Size</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {headerFontSize.toFixed(1)} cqw
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4.0"
                        max="8.5"
                        step="0.1"
                        value={headerFontSize}
                        onChange={(e) => setHeaderFontSize(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Compact (4.0)</span>
                        <span>Stretched (8.5)</span>
                      </div>
                    </div>

                    {/* Beneficiary Name Font Scale */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Beneficiary Name Size</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {(nameFontSizeScale * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.45"
                        step="0.05"
                        value={nameFontSizeScale}
                        onChange={(e) => setNameFontSizeScale(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Standard (75%)</span>
                        <span>Extra Large (145%)</span>
                      </div>
                    </div>

                    {/* Barangay Font Scale */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Barangay Font Size</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {(brgyFontSizeScale * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.40"
                        step="0.05"
                        value={brgyFontSizeScale}
                        onChange={(e) => setBrgyFontSizeScale(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Compact (75%)</span>
                        <span>Bold (140%)</span>
                      </div>
                    </div>

                    {/* Table Assignment Size */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Table Number Size</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {tableFontSize.toFixed(1)} cqw
                        </span>
                      </div>
                      <input
                        type="range"
                        min="3.0"
                        max="7.0"
                        step="0.2"
                        value={tableFontSize}
                        onChange={(e) => setTableFontSize(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Small (3.0)</span>
                        <span>Large (7.0)</span>
                      </div>
                    </div>

                    {/* Designated Number (#1) Size */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700"># Designated Number Size</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {desigNumFontSize.toFixed(1)} cqw
                        </span>
                      </div>
                      <input
                        type="range"
                        min="6.0"
                        max="12.0"
                        step="0.2"
                        value={desigNumFontSize}
                        onChange={(e) => setDesigNumFontSize(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Standard (6.0)</span>
                        <span>Huge (12.0)</span>
                      </div>
                    </div>

                    {/* Footer Schedule & Paalala Size */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Orientation & Paalala Size</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {orientationFontSize.toFixed(1)} / {paalalaFontSize.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.6"
                        max="3.2"
                        step="0.1"
                        value={orientationFontSize}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setOrientationFontSize(v);
                          setPaalalaFontSize(Math.max(1.4, v - 0.3));
                        }}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Compact (1.6)</span>
                        <span>Large (3.2)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: POSITIONING & QR SCALE */}
              {designTab === "POSITIONING" && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* QR Box Size */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">QR Code Box Size</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {qrSizePercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="22"
                        max="36"
                        step="1"
                        value={qrSizePercent}
                        onChange={(e) => setQrSizePercent(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Compact (22%)</span>
                        <span>Large (36%)</span>
                      </div>
                    </div>

                    {/* Card Outer Margin / Padding */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Card Outer Padding</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                          {cardPadding.toFixed(1)} cqw
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.4"
                        max="3.6"
                        step="0.2"
                        value={cardPadding}
                        onChange={(e) => setCardPadding(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-blue"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Tight Border (1.4)</span>
                        <span>Spacious (3.6)</span>
                      </div>
                    </div>

                    {/* Beneficiary Name Alignment */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-700">Name Text Alignment</span>
                        <span className="font-mono font-bold text-gov-blue bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                          {nameAlignment}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setNameAlignment("left")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold border transition flex items-center justify-center space-x-1.5 ${
                            nameAlignment === "left"
                              ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                              : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span>Left Aligned</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNameAlignment("center")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold border transition flex items-center justify-center space-x-1.5 ${
                            nameAlignment === "center"
                              ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                              : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                          <span>Center Aligned</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TEXT CONTENT & WORDING */}
              {designTab === "TEXT" && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* 1. Stub Header Main Title */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase">
                        1. Stub Header Title
                      </label>
                      <input
                        type="text"
                        value={stubHeader}
                        onChange={(e) => setStubHeader(e.target.value)}
                        placeholder="e.g. LGU-DINGALAN"
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
                      />
                      <span className="text-[10px] text-slate-400">Top blue header title</span>
                    </div>

                    {/* 2. Stub Sub-Header */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase">
                        2. Stub Sub-Header
                      </label>
                      <input
                        type="text"
                        value={stubSubHeader}
                        onChange={(e) => setStubSubHeader(e.target.value)}
                        placeholder="e.g. BENEFICIARY VERIFICATION STUB NO."
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
                      />
                      <span className="text-[10px] text-slate-400">Subtitle below header</span>
                    </div>

                    {/* 3. Orientation Date & Venue */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase">
                        3. Orientation Date & Venue
                      </label>
                      <input
                        type="text"
                        value={customOrientation}
                        onChange={(e) => setCustomOrientation(e.target.value)}
                        placeholder="e.g. Sep 04, 2026 • 08:00 (Municipal Gymnasium)"
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
                      />
                      <span className="text-[10px] text-slate-400">Sitting above footer underline</span>
                    </div>

                    {/* 4. Paalala / Advisory Notice */}
                    <div className="md:col-span-12 space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase">
                        4. Paalala / Advisory Notice Text
                      </label>
                      <textarea
                        rows={2}
                        value={customPaalala}
                        onChange={(e) => setCustomPaalala(e.target.value)}
                        placeholder="e.g. DALHIN ANG STUB NA ITO AT VALID ID NA GINAMIT SA APPLICATION SA ORIENTATION"
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                        <span className="text-slate-400">
                          Bottom advisory line rendered on all printed verification stubs.
                        </span>

                        {/* Quick Preset Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Quick Presets:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomOrientation("Sep 04, 2026 • 08:00 (Municipal Gymnasium)")
                            }
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200"
                          >
                            Municipal Gym • 8:00 AM
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomOrientation("Sep 05, 2026 • 09:00 (Barangay Multi-Purpose Hall)")
                            }
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200"
                          >
                            Barangay Hall • 9:00 AM
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomPaalala(
                                "DALHIN ANG STUB NA ITO AT VALID ID NA GINAMIT SA APPLICATION SA ORIENTATION"
                              )
                            }
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200"
                          >
                            Standard DOLE Paalala
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuration Bar */}
        <div className="gov-card p-5 space-y-4">
          {/* Row 1: Program, Barangay, Purok/Sitio, Table, Paper Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Target Program */}
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Program</label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue truncate"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.programCode} - {p.programName}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Barangay (Multi-Select) */}
            <MultiSelectFilter
              label="Filter Barangay"
              options={barangayOptions}
              selectedValues={selectedBarangays}
              onChange={(vals) => {
                setSelectedBarangays(vals);
                setSelectedSitios(["ALL"]);
                setPreviewSheetPage(1);
              }}
              allLabel="All Barangays (11)"
            />

            {/* Filter Purok / Sitio (Multi-Select) */}
            <MultiSelectFilter
              label="Filter Purok / Sitio"
              icon={<MapPin className="w-3 h-3 text-gov-blue" />}
              options={sitioOptions}
              selectedValues={selectedSitios}
              onChange={(vals) => {
                setSelectedSitios(vals);
                setPreviewSheetPage(1);
              }}
              allLabel={`All Puroks & Sitios (${uniqueSitios.length})`}
            />

            {/* Filter Table */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Table</label>
              <select
                value={filterTable}
                onChange={(e) => {
                  setFilterTable(e.target.value);
                  setPreviewSheetPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue"
              >
                <option value="ALL">All Tables ({uniqueTables.length})</option>
                {uniqueTables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Paper Size */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold focus:outline-none focus:border-gov-blue"
              >
                <option value="A4">A4 (210 x 297 mm)</option>
                <option value="Letter">Letter (8.5 x 11 in)</option>
                <option value="Legal">Legal (8.5 x 14 in)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Manual Row & Column Inputs + Grid Geometry Presets */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Manual Columns Input */}
              <div className="flex items-center space-x-2">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase flex items-center space-x-1">
                  <Grid className="w-3.5 h-3.5 text-gov-blue" />
                  <span>Columns (Cols):</span>
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={columnsPerPage}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(6, Number(e.target.value) || 1));
                      setColumnsPerPage(val);
                      setPreviewSheetPage(1);
                    }}
                    className="w-16 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded-lg text-center bg-white focus:outline-none focus:border-gov-blue shadow-2xs"
                  />
                  <div className="flex items-center space-x-0.5">
                    {[1, 2, 3].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColumnsPerPage(c);
                          setPreviewSheetPage(1);
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md border transition ${
                          columnsPerPage === c
                            ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        {c} Col
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Manual Rows Input */}
              <div className="flex items-center space-x-2">
                <label className="text-[11px] font-extrabold text-slate-700 uppercase flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-gov-blue" />
                  <span>Rows per Sheet:</span>
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={rowsPerPage}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(12, Number(e.target.value) || 1));
                      setRowsPerPage(val);
                      setPreviewSheetPage(1);
                    }}
                    className="w-16 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded-lg text-center bg-white focus:outline-none focus:border-gov-blue shadow-2xs"
                  />
                  <div className="flex items-center space-x-0.5">
                    {[3, 4, 5, 6].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setRowsPerPage(r);
                          setPreviewSheetPage(1);
                        }}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md border transition ${
                          rowsPerPage === r
                            ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        {r} Rows
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Layout Presets */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Standard Presets:</span>
              {[
                { name: "2 × 5 (10 Cards)", c: 2, r: 5 },
                { name: "2 × 4 (8 Cards)", c: 2, r: 4 },
                { name: "3 × 6 (18 Cards)", c: 3, r: 6 },
              ].map(({ name, c, r }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setColumnsPerPage(c);
                    setRowsPerPage(r);
                    setPreviewSheetPage(1);
                  }}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                    columnsPerPage === c && rowsPerPage === r
                      ? "bg-slate-900 text-gov-goldLight border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-200 border-slate-200"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Range & Sorting Toolbar */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Designated Number Range:</span>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  placeholder="FROM #"
                  value={rangeStart}
                  onChange={(e) => {
                    setRangeStart(e.target.value);
                    setPreviewSheetPage(1);
                  }}
                  className="w-20 px-2 py-1 border border-slate-300 rounded text-center font-mono font-bold text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="number"
                  placeholder="TO #100"
                  value={rangeEnd}
                  onChange={(e) => {
                    setRangeEnd(e.target.value);
                    setPreviewSheetPage(1);
                  }}
                  className="w-20 px-2 py-1 border border-slate-300 rounded text-center font-mono font-bold text-xs"
                />
              </div>

              {(rangeStart || rangeEnd || (selectedBarangays.length > 0 && !selectedBarangays.includes("ALL")) || (selectedSitios.length > 0 && !selectedSitios.includes("ALL")) || filterTable !== "ALL" || sortField !== "NUMERIC") && (
                <button
                  onClick={handleClearRange}
                  className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Sort Order Selector (Purok/Sitio Sorting Feature) */}
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-600 text-[11px] uppercase flex items-center space-x-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-gov-blue" />
                <span>Sort Stubs By:</span>
              </span>
              <div className="flex items-center space-x-1">
                {[
                  { label: "Purok / Sitio", field: "SITIO" as const },
                  { label: "# Desig", field: "NUMERIC" as const },
                  { label: "Name", field: "NAME" as const },
                  { label: "Barangay", field: "BARANGAY" as const },
                  { label: "Table", field: "TABLE" as const },
                ].map(({ label, field }) => (
                  <button
                    key={field}
                    onClick={() => {
                      if (sortField === field) {
                        setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                      } else {
                        setSortField(field);
                        setSortOrder("ASC");
                      }
                      setPreviewSheetPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                      sortField === field
                        ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                    }`}
                  >
                    <span>{label}</span>
                    {sortField === field && (
                      <span className="ml-1">{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Print Summary Banner & Sheet Pagination Controls */}
        <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-3 text-gov-blue shadow-sm">
          <div className="flex items-center space-x-2 font-bold">
            <span className="uppercase text-slate-500">PRINT SUMMARY:</span>
            <span className="text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200 font-mono">
              {filteredBeneficiaries.length} Cards
            </span>
            <span>•</span>
            <span className="text-slate-800">
              {totalSheets} Total Sheets
            </span>
            <span>•</span>
            <span className="text-slate-800">{paperSize} Layout ({columnsPerPage} cols $\times$ {rowsPerPage} rows = {sheetCapacity} cards/sheet)</span>
            {sortField === "SITIO" && (
              <>
                <span>•</span>
                <span className="text-gov-blue bg-blue-100 px-2 py-0.5 rounded font-bold">
                  Grouped by Purok/Sitio
                </span>
              </>
            )}
          </div>

          {/* High-Speed Sheet Navigator Controls */}
          <div className="flex items-center space-x-2">
            {!viewAllInPreview && totalSheets > 1 && (
              <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-xl border border-blue-200 shadow-xs">
                <button
                  onClick={() => setPreviewSheetPage(1)}
                  disabled={safeCurrentSheet === 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="First Sheet"
                >
                  <ChevronsLeft className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={() => setPreviewSheetPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentSheet === 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="Previous Sheet"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>

                <div className="flex items-center space-x-1 px-2 font-mono font-bold text-slate-800 text-xs">
                  <span>Sheet</span>
                  <select
                    value={safeCurrentSheet}
                    onChange={(e) => setPreviewSheetPage(Number(e.target.value))}
                    className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-gov-blue text-xs focus:outline-none"
                  >
                    {Array.from({ length: totalSheets }, (_, i) => i + 1).map((sheetNum) => (
                      <option key={sheetNum} value={sheetNum}>
                        {sheetNum}
                      </option>
                    ))}
                  </select>
                  <span>of {totalSheets}</span>
                </div>

                <button
                  onClick={() => setPreviewSheetPage((p) => Math.min(totalSheets, p + 1))}
                  disabled={safeCurrentSheet === totalSheets}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="Next Sheet"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={() => setPreviewSheetPage(totalSheets)}
                  disabled={safeCurrentSheet === totalSheets}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  title="Last Sheet"
                >
                  <ChevronsRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            )}

            {/* Toggle Full Preview vs Virtual Sheet */}
            <button
              onClick={() => setViewAllInPreview(!viewAllInPreview)}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition flex items-center space-x-1 ${
                viewAllInPreview
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>{viewAllInPreview ? "Paged Preview (Fast)" : `Show All (${filteredBeneficiaries.length})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screen Preview Container (Ultra-Fast 0ms Response with Live Custom Texts & Custom Styles) */}
      <div className="no-print bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-200">
        {!viewAllInPreview && totalSheets > 1 && (
          <div className="pb-4 mb-4 border-b flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>
                Displaying <strong>Sheet {safeCurrentSheet} of {totalSheets}</strong> (Cards #
                {screenBeneficiaries[0]?.designatedNumber || "-"} – #
                {screenBeneficiaries[screenBeneficiaries.length - 1]?.designatedNumber || "-"})
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              💡 Printing will automatically print <strong>all {filteredBeneficiaries.length} cards</strong> across {totalSheets} sheets.
            </span>
          </div>
        )}

        <div
          className="grid gap-2.5 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${columnsPerPage}, minmax(0, 1fr))`,
          }}
        >
          {screenBeneficiaries.map((pb) => {
            const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE");
            const qrImg = qrImages[pb.id];

            if (templateMode === "FULL_STUB") {
              return (
                <div key={pb.id} className="flex items-center justify-center p-0.5">
                  <Format1Stub
                    designatedNumber={pb.designatedNumber}
                    qrDataUrl={qrImg}
                    token={activeQr?.publicToken}
                    fullName={pb.beneficiary?.fullName || ""}
                    barangay={pb.beneficiary?.barangay || ""}
                    tableNumber={pb.tableNumber || "1"}
                    stubHeader={stubHeader}
                    stubSubHeader={stubSubHeader}
                    orientationDetails={customOrientation}
                    paalalaText={customPaalala}
                    headerFontSize={headerFontSize}
                    subHeaderFontSize={subHeaderFontSize}
                    desigNumFontSize={desigNumFontSize}
                    nameFontSizeScale={nameFontSizeScale}
                    brgyFontSizeScale={brgyFontSizeScale}
                    tableFontSize={tableFontSize}
                    orientationFontSize={orientationFontSize}
                    paalalaFontSize={paalalaFontSize}
                    labelsFontSize={labelsFontSize}
                    qrSizePercent={qrSizePercent}
                    cardPadding={cardPadding}
                    nameAlignment={nameAlignment}
                  />
                </div>
              );
            }

            if (templateMode === "QR_CARD_ONLY") {
              return (
                <div key={pb.id} className="flex items-center justify-center p-1">
                  <ETupadCard
                    designatedNumber={pb.designatedNumber}
                    qrDataUrl={qrImg}
                    token={activeQr?.publicToken}
                    tableNumber={pb.tableNumber}
                    beneficiaryName={pb.beneficiary?.fullName}
                    barangay={pb.beneficiary?.barangay}
                    programCode={currentProgram?.programCode}
                  />
                </div>
              );
            }

            if (templateMode === "SCHEDULE_PASS") {
              return (
                <div key={pb.id} className="flex items-center justify-center p-1">
                  <Format4SchedulePass
                    designatedNumber={pb.designatedNumber}
                    qrDataUrl={qrImg}
                    token={activeQr?.publicToken}
                    fullName={pb.beneficiary?.fullName || ""}
                    barangay={normalizeBarangayName(pb.beneficiary?.barangay) || ""}
                    sitio={normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay) || "Centro"}
                    sex={pb.beneficiary?.sex || "BENEFICIARY"}
                    tableNumber={pb.tableNumber || "Table 1"}
                    programName={currentProgram?.programName}
                    programCode={currentProgram?.programCode}
                    allDaysSchedule={pb.allDaysSchedule}
                    desigNumFontSize={desigNumFontSize}
                    nameFontSizeScale={nameFontSizeScale}
                    qrSizePercent={qrSizePercent}
                  />
                </div>
              );
            }

            return (
              <div
                key={pb.id}
                className="stub-card border border-slate-400 rounded-xl p-2 bg-white text-slate-900 flex items-center space-x-2.5 shadow-none page-break-inside-avoid"
                style={{ minHeight: "110px" }}
              >
                <div className="w-20 h-20 flex-shrink-0 bg-white border border-slate-300 rounded p-1 flex items-center justify-center">
                  {qrImg ? (
                    <img src={qrImg} alt="QR Token" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[8px] text-slate-400">QR</span>
                  )}
                </div>

                <div className="flex-1 space-y-0.5 text-xs overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gov-blue">{stubHeader || "PESO DINGALAN"}</span>
                    <span className="text-[10px] font-black font-mono bg-slate-900 text-gov-gold px-1.5 py-0.5 rounded">
                      #{pb.designatedNumber}
                    </span>
                  </div>
                  <p className="font-extrabold text-[11px] text-slate-900 truncate leading-tight">
                    {pb.beneficiary?.fullName}
                  </p>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>{pb.tableNumber || "Table 1"}</span>
                    <span>
                      {normalizeBarangayName(pb.beneficiary?.barangay)} - {normalizeSitioName(pb.beneficiary?.sitio, pb.beneficiary?.barangay) || "Centro"}
                    </span>
                  </div>
                  <p className="text-[7px] font-mono text-slate-400 truncate">
                    {activeQr?.publicToken}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dedicated Print Container (Hidden on Screen, Visible only in @media print) */}
      <div className="print-only hidden">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${columnsPerPage}, minmax(0, 1fr))`,
          }}
        >
          {filteredBeneficiaries.map((pb) => {
            const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE");
            const qrImg = qrImages[pb.id];

            if (templateMode === "FULL_STUB") {
              return (
                <div key={pb.id} className="flex items-center justify-center p-0.5 page-break-inside-avoid">
                  <Format1Stub
                    designatedNumber={pb.designatedNumber}
                    qrDataUrl={qrImg}
                    token={activeQr?.publicToken}
                    fullName={pb.beneficiary?.fullName || ""}
                    barangay={pb.beneficiary?.barangay || ""}
                    tableNumber={pb.tableNumber || "1"}
                    stubHeader={stubHeader}
                    stubSubHeader={stubSubHeader}
                    orientationDetails={customOrientation}
                    paalalaText={customPaalala}
                    headerFontSize={headerFontSize}
                    subHeaderFontSize={subHeaderFontSize}
                    desigNumFontSize={desigNumFontSize}
                    nameFontSizeScale={nameFontSizeScale}
                    brgyFontSizeScale={brgyFontSizeScale}
                    tableFontSize={tableFontSize}
                    orientationFontSize={orientationFontSize}
                    paalalaFontSize={paalalaFontSize}
                    labelsFontSize={labelsFontSize}
                    qrSizePercent={qrSizePercent}
                    cardPadding={cardPadding}
                    nameAlignment={nameAlignment}
                  />
                </div>
              );
            }

            if (templateMode === "QR_CARD_ONLY") {
              return (
                <div key={pb.id} className="flex items-center justify-center p-1 page-break-inside-avoid">
                  <ETupadCard
                    designatedNumber={pb.designatedNumber}
                    qrDataUrl={qrImg}
                    token={activeQr?.publicToken}
                    tableNumber={pb.tableNumber}
                    beneficiaryName={pb.beneficiary?.fullName}
                    barangay={pb.beneficiary?.barangay}
                    programCode={currentProgram?.programCode}
                  />
                </div>
              );
            }

            if (templateMode === "SCHEDULE_PASS") {
              return (
                <div key={pb.id} className="flex items-center justify-center p-1 page-break-inside-avoid">
                  <Format4SchedulePass
                    designatedNumber={pb.designatedNumber}
                    qrDataUrl={qrImg}
                    token={activeQr?.publicToken}
                    fullName={pb.beneficiary?.fullName || ""}
                    barangay={pb.beneficiary?.barangay || ""}
                    sitio={pb.beneficiary?.sitio || "Centro"}
                    sex={pb.beneficiary?.sex || "BENEFICIARY"}
                    tableNumber={pb.tableNumber || "Table 1"}
                    programName={currentProgram?.programName}
                    programCode={currentProgram?.programCode}
                    allDaysSchedule={pb.allDaysSchedule}
                    desigNumFontSize={desigNumFontSize}
                    nameFontSizeScale={nameFontSizeScale}
                    qrSizePercent={qrSizePercent}
                  />
                </div>
              );
            }

            return (
              <div
                key={pb.id}
                className="stub-card border border-slate-400 rounded-xl p-2 bg-white text-slate-900 flex items-center space-x-2.5 shadow-none page-break-inside-avoid"
                style={{ minHeight: "110px" }}
              >
                <div className="w-20 h-20 flex-shrink-0 bg-white border border-slate-300 rounded p-1 flex items-center justify-center">
                  {qrImg ? (
                    <img src={qrImg} alt="QR Token" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[8px] text-slate-400">QR</span>
                  )}
                </div>

                <div className="flex-1 space-y-0.5 text-xs overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gov-blue">{stubHeader || "PESO DINGALAN"}</span>
                    <span className="text-[10px] font-black font-mono bg-slate-900 text-gov-gold px-1.5 py-0.5 rounded">
                      #{pb.designatedNumber}
                    </span>
                  </div>
                  <p className="font-extrabold text-[11px] text-slate-900 truncate leading-tight">
                    {pb.beneficiary?.fullName}
                  </p>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>{pb.tableNumber || "Table 1"}</span>
                    <span>{pb.beneficiary?.barangay}</span>
                  </div>
                  <p className="text-[7px] font-mono text-slate-400 truncate">
                    {activeQr?.publicToken}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Designated QR Generator Modal */}
      {isDesignatedGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-950 text-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border-2 border-emerald-500/50 relative overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Generate Designated Work Area QR Codes
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mag-generate ng active scannable QR pass para sa lahat ng benepisyaryo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDesignatedGenModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Program:</span>
                  <span className="text-gov-gold font-mono">{currentProgram?.programName || "Active TUPAD Program"}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Kabuuang Benepisyaryo:</span>
                  <span className="text-white font-mono font-black">{beneficiaries.length} Enrolled</span>
                </div>
              </div>

              {/* Barangay Filter Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Target Barangay (Opsyonal)
                </label>
                <select
                  value={designatedFilterBrgy}
                  onChange={(e) => setDesignatedFilterBrgy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-400"
                >
                  <option value="ALL">Lahat ng Barangay (All Beneficiaries)</option>
                  {Array.from(new Set(beneficiaries.map((b) => b.beneficiary?.barangay).filter(Boolean))).map((brgy) => (
                    <option key={brgy} value={brgy}>
                      Brgy. {brgy}
                    </option>
                  ))}
                </select>
              </div>

              {/* Force Regenerate Checkbox */}
              <label className="flex items-start space-x-2.5 p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceRegenerateQrs}
                  onChange={(e) => setForceRegenerateQrs(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Mag-generate ng Bagong Tokens (Force Refresh)</span>
                  <span className="text-[10px] text-slate-400 block">
                    Kung naka-check, papalitan ang umiiral na QR tokens ng bagong cryptographic tokens at ia-update ang active reference sa database.
                  </span>
                </div>
              </label>

              {/* Informative Guidance */}
              <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-blue-200 text-[11px] space-y-1">
                <span className="font-bold flex items-center gap-1 text-blue-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Canonical QR Source:</span>
                </span>
                <p>
                  Ang mga QR codes na ito ang magsisilbing reference para sa cellphone built-in camera scanning, direct work assignment routing, at magiging source sa <strong>Field Scanner Hub</strong>.
                </p>
              </div>

              {designatedGenProgress && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-emerald-300 font-bold text-center flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>{designatedGenProgress}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDesignatedGenModalOpen(false)}
                disabled={isGeneratingDesignated}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50"
              >
                Kanselahin
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleBatchGenerateDesignated();
                  setIsDesignatedGenModalOpen(false);
                }}
                disabled={isGeneratingDesignated}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
              >
                {isGeneratingDesignated ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Nagsasagawa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>I-generate Ngayon</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Reprint Modal */}
      {isReprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Mandatory Reprint Reason (Audit Requirement)
              </h3>
              <p className="text-xs text-slate-500">
                Government auditing standards require logging every QR stub reprint transaction.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select or Describe Reason *
              </label>
              <select
                value={reprintReason}
                onChange={(e) => setReprintReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold"
              >
                <option value="">-- Choose reason --</option>
                <option value="Damaged paper stub during orientation">Damaged paper stub during orientation</option>
                <option value="Lost physical QR stub by beneficiary">Lost physical QR stub by beneficiary</option>
                <option value="Unreadable / smudged QR code printer defect">Unreadable / smudged QR code printer defect</option>
                <option value="Replacement beneficiary issued new designated number">
                  Replacement beneficiary issued new designated number
                </option>
                <option value="Table reallocation / administrative correction">
                  Table reallocation / administrative correction
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Custom Remarks (Optional)
              </label>
              <textarea
                placeholder="Enter additional audit notes..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsReprintModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow"
              >
                Confirm & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Assignment Modal */}
      {currentProgram && (
        <TableAssignmentModal
          isOpen={isTableModalOpen}
          onClose={() => setIsTableModalOpen(false)}
          programId={currentProgram.id}
          programName={currentProgram.programName}
          totalBeneficiaryCount={beneficiaries.length}
          onRulesUpdated={() => {
            fetchBeneficiaries(selectedProgramId);
          }}
        />
      )}
    </div>
  );
}

export default function StubsDesignerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-bold">Loading QR Designer Engine...</div>}>
      <StubsContent />
    </Suspense>
  );
}
