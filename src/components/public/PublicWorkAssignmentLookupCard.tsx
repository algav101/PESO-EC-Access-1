"use client";

import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import {
  Camera,
  QrCode,
  Upload,
  Search,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  Compass,
  Printer,
  Layers,
  SwitchCamera,
  Check,
  AlertTriangle,
  FileText,
  User,
  X,
  Lock,
} from "lucide-react";

export function PublicWorkAssignmentLookupCard() {
  // Scanner & Input State
  const [scanMode, setScanMode] = useState<"camera" | "upload" | "manual">("camera");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [dpaConsent, setDpaConsent] = useState(true);

  // Verification & Display State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showFullTable, setShowFullTable] = useState(false);

  // Camera & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start/stop camera on mode change
  useEffect(() => {
    if (!data && scanMode === "camera" && cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanMode, cameraActive, facingMode, data]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or device.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError(
        "Hindi mabuksan ang camera o walang pahintulot. Maaaring gamitin ang 'Upload Larawan' o 'Manual Slot #' sa ibaba."
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data && code.data.trim().length > 0) {
          handleScannedToken(code.data.trim());
          return;
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleScannedToken = (token: string) => {
    stopCamera();
    setCameraActive(false);

    // Haptic vibration feedback if available
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100);
    }

    performLookup(token);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setError("Hindi ma-proseso ang larawan.");
          setLoading(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          performLookup(code.data.trim());
        } else {
          setError(
            "Walang nabasang TUPAD QR Code sa larawang pinili. Pakitiyak na malinaw at nakatapat sa QR code ang kuha."
          );
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const performLookup = async (tokenOrSlot: string) => {
    const cleaned = tokenOrSlot.trim();
    if (!cleaned) return;

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (/^\d+$/.test(cleaned) && cleaned.length <= 4) {
        queryParams.set("designatedNumber", cleaned);
      } else {
        queryParams.set("qrToken", cleaned);
      }
      queryParams.set("isQrScan", "true");

      const res = await fetch(`/api/v1/work-assignment/lookup?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
        setSelectedDay(json.workDay?.dayNumber || 1);
        setError(null);
      } else {
        setError(
          json.error ||
            "Walang nahanap na aktibong tala ng benepisyaryo sa QR code o Slot number na ito. Pakitiyak ang QR ID."
        );
        setData(null);
      }
    } catch (err: any) {
      setError("Nagkaroon ng problema sa koneksyon: " + err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    performLookup(manualToken.trim());
  };

  const handleDaySwitch = (dayNum: number) => {
    setSelectedDay(dayNum);
  };

  const handleResetScan = () => {
    stopCamera();
    setData(null);
    setError(null);
    setManualToken("");
    setScanMode("camera");
    setCameraActive(true);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const activeDayAssignment =
    data?.dailyAssignments && data.dailyAssignments[selectedDay]
      ? data.dailyAssignments[selectedDay]
      : data?.allDaysSchedule?.find((s: any) => s.dayNumber === selectedDay) || data?.assignment;

  return (
    <div className="gov-card border-2 border-emerald-600/30 overflow-hidden bg-white shadow-xl rounded-3xl transition-all">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-blue-950 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-xs font-black tracking-wide uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              DOLE - PESO TUPAD • Field Operations
            </span>
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-bold flex items-center gap-1">
              <QrCode className="w-3 h-3 text-amber-300" />
              Laminated QR ID Scanner
            </span>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full text-[11px] font-bold">
              RA 10173 DPA Compliant
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            I-scan ang Iyong TUPAD Laminated QR ID para sa Work Area &amp; Iskedyul
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Itapat ang iyong opisyal na <strong className="text-gov-goldLight">TUPAD laminated QR ID</strong> sa camera o mag-upload ng larawan upang agad na makita ang iyong 10-araw na itinalagang lugar ng paggawa, partikular na gawain, at gabay sa pagpasok.
          </p>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* IF NO VERIFIED DATA IS SHOWING YET: RENDER SCANNER INTERFACE */}
        {!data ? (
          <div className="space-y-6">
            {/* Scan Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setScanMode("camera");
                  setCameraActive(true);
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  scanMode === "camera"
                    ? "bg-slate-900 text-white shadow-md font-black"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Camera Live Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanMode("upload");
                  stopCamera();
                  setCameraActive(false);
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  scanMode === "upload"
                    ? "bg-slate-900 text-white shadow-md font-black"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Upload Larawan ng QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanMode("manual");
                  stopCamera();
                  setCameraActive(false);
                  setError(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  scanMode === "manual"
                    ? "bg-slate-900 text-white shadow-md font-black"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Search className="w-4 h-4 text-amber-400" />
                <span>Manual Slot # Entry</span>
              </button>
            </div>

            {/* MODE 1: LIVE CAMERA VIEWPORT */}
            {scanMode === "camera" && (
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center border border-slate-800 shadow-2xl relative overflow-hidden min-h-[380px]">
                {cameraActive ? (
                  <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black relative border-2 border-emerald-500 shadow-2xl flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Laser scanning visual overlay */}
                    <div className="absolute inset-5 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                      <div className="flex justify-between">
                        <div className="w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
                        <div className="w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
                      </div>
                      <div className="w-full h-1 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse"></div>
                      <div className="flex justify-between">
                        <div className="w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
                        <div className="w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>
                      </div>
                    </div>

                    <div className="absolute bottom-3 inset-x-3 bg-slate-950/80 backdrop-blur-sm py-1.5 px-3 rounded-xl text-center">
                      <p className="text-[11px] font-bold text-emerald-300">
                        Iposisyon ang QR code ng laminated ID sa gitna ng kahon
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4 max-w-sm py-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400/40 flex items-center justify-center mx-auto shadow-inner">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-black text-white">Handa nang I-scan ang Laminated QR ID</h4>
                      <p className="text-xs text-slate-300">
                        I-click ang pindutan sa ibaba upang buksan ang camera ng iyong smartphone o computer.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCameraActive(true);
                        startCamera();
                      }}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 mx-auto"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buksan ang Camera Scanner</span>
                    </button>
                  </div>
                )}

                {/* Camera control buttons */}
                {cameraActive && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-2">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                      title="Lumipat sa Harap/Likod na Camera"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 text-blue-400" />
                      <span>Palitan ang Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setCameraActive(false);
                      }}
                      className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Ihinto ang Camera</span>
                    </button>
                  </div>
                )}

                {cameraError && (
                  <div className="mt-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: UPLOAD IMAGE / PHOTO */}
            {scanMode === "upload" && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center space-y-4 hover:border-emerald-500 transition">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>

                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-sm font-black text-slate-900">
                    Pumili ng Larawan o Screenshot ng Laminated QR ID
                  </h4>
                  <p className="text-xs text-slate-500">
                    Maaari kang mag-upload ng malinaw na larawan ng iyong TUPAD ID o screenshot ng QR pass mula sa iyong gallery.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow transition flex items-center space-x-2 mx-auto disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{loading ? "Sinusuri ang Larawan..." : "Pumili ng Larawan mula sa Device"}</span>
                </button>
              </div>
            )}

            {/* MODE 3: MANUAL SLOT # OR TOKEN ENTRY */}
            {scanMode === "manual" && (
              <form
                onSubmit={handleManualSubmit}
                className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">
                    I-type ang Designated Slot # o QR Code Token
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ilagay ang iyong numero sa masterlist (halimbawa: <strong>1</strong> hanggang <strong>522</strong>) o ang buong QR token na nakalimbag sa stub.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Hal. 1, 25, o TUPAD-DGL-..."
                    className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={loading || !manualToken.trim()}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Suriin ang Assignment</span>
                  </button>
                </div>
              </form>
            )}

            {/* Error Message Alert */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Hindi Ma-verify ang QR Code / Talaan:</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Data Privacy Act Notice */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start space-x-3 text-xs text-slate-700">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block text-slate-900 font-bold uppercase text-[11px]">
                  Proteksyon sa Datos (Data Privacy Act of 2012 - R.A. 10173)
                </strong>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Ang pag-scan ng opisyal na Laminated QR ID ay ginagamit eksklusibo upang maipakita ang iyong itinalagang lugar ng paggawa at 10-araw na iskedyul para sa opisyal na implementasyon ng TUPAD sa Bayan ng Dingalan.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. VERIFIED 10-DAY WORK AREA ASSIGNMENT & SCHEDULE GUIDE DISPLAY CARD      */
          /* ========================================================================= */
          <div className="space-y-6 animate-fadeIn">
            {/* Top Verification Header Badge */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-300/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded-md text-[11px] font-black tracking-wider uppercase">
                      VERIFIED TUPAD BENEFICIARY
                    </span>
                    <span className="px-2 py-0.5 bg-slate-900 text-gov-gold font-mono font-black rounded-md text-xs">
                      SLOT #{data.beneficiary.designatedNumber}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-md text-xs">
                      {data.beneficiary.tableNumber || "Table 1"}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase">
                    {data.beneficiary.fullName}
                  </h3>

                  <p className="text-xs text-slate-600">
                    Tirahan: <strong className="text-slate-800">{data.beneficiary.sitio || "Centro"}, Brgy. {data.beneficiary.barangay}</strong> • Kasarian: <strong className="text-slate-800">{data.beneficiary.sex}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetScan}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mag-scan ng Ibang QR ID</span>
              </button>
            </div>

            {/* Program & Active Work Area Focus Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Assigned Work Area Details for Selected Day */}
              <div
                key={selectedDay}
                className="lg:col-span-2 space-y-4 bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Itinalagang Lugar ng Paggawa (Assigned Work Area)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeDayAssignment?.workDate && (
                      <span className="hidden sm:inline-block px-2.5 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded-md border border-slate-700">
                        {activeDayAssignment.workDate}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black tracking-wide">
                      Araw {selectedDay} ng {data.program.requiredWorkDays || 10}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {activeDayAssignment?.area || data.assignment?.area || `Brgy. ${data.beneficiary.barangay} Community Work Area`}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">
                    <strong className="text-emerald-400 font-bold">Partikular na Gawain: </strong>
                    {activeDayAssignment?.specificActivity || data.assignment?.specificActivity || "Community cleaning, roadside maintenance, and environmental protection."}
                  </p>
                </div>

                {/* Proximity Matching Rationale Tag */}
                <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start space-x-3 text-xs">
                  <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Dahilan ng Pagkakatalaga (Proximity Allocation):</span>
                    <p className="text-slate-300 mt-0.5">
                      {activeDayAssignment?.matchingRationale || data.assignment?.matchingRationale || "Itinalaga sa pinakamalapit na purok/sitio sa iyong rehistradong tirahan upang maging maginhawa ang pagpasok."}
                    </p>
                  </div>
                </div>

                {/* Working Hours & Program Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Oras ng Paggawa (Umaga &amp; Hapon)</span>
                      <span className="text-xs font-bold text-slate-100">
                        {data.program.morningHours} • {data.program.afternoonHours}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
                    <Building className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Programa</span>
                      <span className="text-xs font-bold text-slate-100 truncate block">
                        {data.program.programName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Important Guidelines & Attendance Notice */}
              <div className="space-y-4 bg-amber-50/90 border-2 border-amber-300/80 rounded-3xl p-6 text-amber-950 flex flex-col justify-between shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-sm uppercase tracking-wide">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Mahalagang Paalala sa Paggawa</span>
                  </div>

                  <ul className="space-y-2 text-xs text-amber-950 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 font-black" />
                      <span><strong>Suotin ang PPE:</strong> DOLE TUPAD Long Sleeve shirt at Cap sa bawat araw ng paggawa.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 font-black" />
                      <span><strong>Dalhin ang Laminated QR ID:</strong> Ipakita sa field coordinator tuwing AM at PM attendance scan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 font-black" />
                      <span><strong>Pumunta sa Tamang Oras:</strong> 8:00 AM sa itinalagang Work Area ng inyong Barangay.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-amber-300/80 text-[11px] text-amber-900 font-medium">
                  May katanungan? Makipag-ugnayan sa PESO Dingalan Field Coordinator sa inyong barangay.
                </div>
              </div>
            </div>

            {/* 10-Day Work Schedule Interactive Timeline Switcher */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    <span>Iskedyul sa Kabuuang 10 Araw ng Programa</span>
                  </h4>
                  <p className="text-xs text-slate-500">I-click ang bawat araw upang makita ang takdang lugar at gawain para sa araw na iyon.</p>
                </div>

                {data.allDaysSchedule?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFullTable(!showFullTable)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <span>{showFullTable ? "Itago ang Buong Talaan" : "Ipakita ang Lahat ng 10 Araw na Talaan"}</span>
                  </button>
                )}
              </div>

              {/* Day Buttons Grid with instant 0ms switching */}
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {Array.from({ length: data.program.requiredWorkDays || 10 }, (_, i) => i + 1).map((dayNum) => {
                  const isDaySelected = selectedDay === dayNum;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleDaySwitch(dayNum)}
                      className={`p-2.5 rounded-xl text-center border transition-all duration-75 flex flex-col items-center justify-center cursor-pointer active:scale-95 select-none ${
                        isDaySelected
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-lg scale-105 font-black ring-2 ring-emerald-400/50"
                          : "bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border-slate-200 font-bold"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">Araw</span>
                      <span className="text-base font-black font-mono leading-none mt-0.5">{dayNum}</span>
                    </button>
                  );
                })}
              </div>

              {/* Full 10-Day Table Breakdown for complete schedule overview */}
              {showFullTable && data.allDaysSchedule && data.allDaysSchedule.length > 0 && (
                <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-fadeIn">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-700">
                      Buong 10-Araw na Buod ng Assignment (I-click ang hilera upang piliin)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold">10 Araw Kabuuan</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b">
                        <tr>
                          <th className="px-3 py-2.5">Araw #</th>
                          <th className="px-3 py-2.5">Itinalagang Work Area</th>
                          <th className="px-3 py-2.5">Partikular na Gawain</th>
                          <th className="px-3 py-2.5">Dahilan ng Pagkakatalaga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.allDaysSchedule.map((sched: any) => {
                          const isRowActive = selectedDay === sched.dayNumber;
                          return (
                            <tr
                              key={sched.dayNumber}
                              onClick={() => handleDaySwitch(sched.dayNumber)}
                              className={`cursor-pointer transition-colors ${
                                isRowActive
                                  ? "bg-emerald-50 text-emerald-950 font-bold"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <td className="px-3 py-2 font-mono font-black text-emerald-700 whitespace-nowrap">
                                Araw {sched.dayNumber}
                              </td>
                              <td className="px-3 py-2 font-semibold">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{sched.area}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2 max-w-xs truncate" title={sched.specificActivity}>
                                {sched.specificActivity}
                              </td>
                              <td className="px-3 py-2 text-[11px] text-slate-500 max-w-xs truncate" title={sched.matchingRationale}>
                                {sched.matchingRationale}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
