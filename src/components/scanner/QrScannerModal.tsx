"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  X,
  RefreshCw,
  KeyRound,
  AlertCircle,
  SwitchCamera,
  Zap,
  Upload,
  ImageIcon,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onScan: (token: string) => void;
  onClose: () => void;
}

/**
 * Multi-scale QR code decoder for captured photos (camera snap or gallery upload)
 * Runs fast analysis at multiple resolutions and center crops with inversion support
 */
async function decodeQrFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        // 0. Try native hardware-accelerated BarcodeDetector first if supported by mobile browser
        try {
          const BarcodeDetectorCtor =
            typeof window !== "undefined" ? (window as any).BarcodeDetector : undefined;
          if (BarcodeDetectorCtor) {
            const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
            const detected = await detector.detect(img);
            if (Array.isArray(detected) && detected.length > 0 && detected[0]?.rawValue) {
              resolve(String(detected[0].rawValue).trim());
              return;
            }
          }
        } catch {
          // Fallback to jsQR canvas multi-scale scanning
        }

        const targetSizes = [1024, 1600, 800, Math.max(img.width, img.height)];
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        for (const maxSize of targetSizes) {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // 1. Full frame scan with normal & inverted checks
          const imgData = ctx.getImageData(0, 0, width, height);
          let code = jsQR(imgData.data, width, height, {
            inversionAttempts: "attemptBoth",
          });
          if (code && code.data) {
            resolve(code.data.trim());
            return;
          }

          // 2. Focused center crop scans (75% and 55% crops where QR code is usually centered)
          for (const ratio of [0.75, 0.55]) {
            const cropSize = Math.round(Math.min(width, height) * ratio);
            const startX = Math.round((width - cropSize) / 2);
            const startY = Math.round((height - cropSize) / 2);
            const cropData = ctx.getImageData(startX, startY, cropSize, cropSize);
            code = jsQR(cropData.data, cropSize, cropSize, {
              inversionAttempts: "attemptBoth",
            });
            if (code && code.data) {
              resolve(code.data.trim());
              return;
            }
          }
        }

        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function QrScannerModal({
  isOpen,
  title = "Scan TUPAD Beneficiary QR Code",
  subtitle = "Align the QR code on the beneficiary stub within the frame",
  onScan,
  onClose,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // Hidden inputs for device camera snap and gallery upload
  const snapCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [tab, setTab] = useState<"camera" | "manual">("camera");

  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  const handleSuccess = useCallback(
    (data: string) => {
      stopCamera();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(120);
      }
      onScanRef.current(data.trim());
    },
    [stopCamera]
  );

  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

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

        if (code && code.data) {
          handleSuccess(code.data);
          return;
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  }, [handleSuccess]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    const isSecure = typeof window !== "undefined" && window.isSecureContext;
    const hasMediaDevices = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

    if (!isSecure && !hasMediaDevices) {
      setCameraError(
        "Live camera streaming requires HTTPS or localhost. Tap 'Snap QR Photo' below to use your native phone camera (same as Accomplishment photos)!"
      );
      return;
    }

    if (!hasMediaDevices) {
      setCameraError(
        "WebRTC live stream is not supported in this browser. Please tap 'Snap QR Photo' below."
      );
      return;
    }

    try {
      let mediaStream: MediaStream | null = null;

      // Tier 1: Ideal facingMode with 720p/1080p resolution
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn("Camera constraint tier 1 failed, trying tier 2:", err1);
      }

      // Tier 2: Simple facingMode
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false,
          });
        } catch (err2) {
          console.warn("Camera constraint tier 2 failed, trying fallback:", err2);
        }
      }

      // Tier 3: Any available video camera
      if (!mediaStream) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Check for torch capability on track
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("muted", "true");
        videoRef.current.muted = true;
        await videoRef.current.play();
        animationFrameId.current = requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn("Live camera access failed:", err);
      const errName = err?.name || "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied in browser settings. You can still tap 'Snap QR Photo' below or enter token manually."
        );
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setCameraError(
          "No video camera device was found on this unit. Tap 'Snap QR Photo' or 'Pick from Gallery'."
        );
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setCameraError(
          "Camera hardware is currently in use by another app or browser tab. Tap 'Snap QR Photo' below to use native camera."
        );
      } else {
        setCameraError(
          "Live stream could not be started. Tap 'Snap QR Photo' below to use your native camera (same as Accomplishment photos)!"
        );
      }
    }
  }, [facingMode, stopCamera, tick]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setFileError(null);
    if (tab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, tab, facingMode, startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleSuccess(manualToken.trim());
  };

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    setFacingMode((curr) => (curr === "environment" ? "user" : "environment"));
  };

  // Toggle torch / flashlight
  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0] as any;
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn("Failed to toggle flashlight:", e);
      }
    }
  };

  // Handle photo snapped via native device camera or picked from gallery
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setFileError(null);

    try {
      const decodedToken = await decodeQrFromFile(file);
      if (decodedToken) {
        handleSuccess(decodedToken);
      } else {
        setFileError(
          "QR code was not detected in the photo. Please make sure the QR is clear, well-lit, and in focus, then try again."
        );
      }
    } catch (err: any) {
      console.error("QR decode error from file:", err);
      setFileError("Error processing photo: " + (err?.message || "Invalid image format"));
    } finally {
      setIsProcessingFile(false);
      // Reset input value so same photo can be re-selected if needed
      e.target.value = "";
    }
  };

  // Quick clipboard paste for manual token
  const handlePasteClipboard = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          setManualToken(text.trim());
        }
      } catch (err) {
        console.warn("Clipboard read failed:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gov-blue text-gov-goldLight shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 flex-shrink-0">
          <button
            onClick={() => setTab("camera")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
              tab === "camera"
                ? "bg-gov-blue text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scanner</span>
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
              tab === "manual"
                ? "bg-gov-blue text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Manual Token Entry</span>
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center overflow-y-auto space-y-3">
          {tab === "camera" ? (
            <div className="w-full flex flex-col items-center space-y-3">
              {/* Camera Stream Viewport */}
              <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-gov-gold/60 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraError ? "opacity-20" : "opacity-100"}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Scan Frame (shown when stream is active) */}
                {!cameraError && (
                  <div className="absolute inset-4 border-2 border-dashed border-gov-gold/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-t-2 border-l-2 border-gov-gold"></div>
                      <div className="w-5 h-5 border-t-2 border-r-2 border-gov-gold"></div>
                    </div>
                    {/* Pulsing Scan Laser */}
                    <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse"></div>
                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-b-2 border-l-2 border-gov-gold"></div>
                      <div className="w-5 h-5 border-b-2 border-r-2 border-gov-gold"></div>
                    </div>
                  </div>
                )}

                {/* Overlay Controls (Camera switch & Flashlight) */}
                {!cameraError && stream && (
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 z-10">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={handleToggleTorch}
                        className={`p-2 rounded-full text-xs font-bold transition ${
                          torchOn
                            ? "bg-amber-400 text-slate-900 shadow-md"
                            : "bg-black/60 text-white hover:bg-black/80"
                        }`}
                        title="Toggle Flashlight / Torch"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      title="Switch Camera (Front / Back)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Processing Spinner Overlay */}
                {isProcessingFile && (
                  <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center space-y-2 p-4 text-center z-20">
                    <Loader2 className="w-8 h-8 text-gov-gold animate-spin" />
                    <p className="text-xs font-bold text-white">Analyzing Photo for QR Code...</p>
                    <p className="text-[10px] text-slate-400">Multi-scale decoding in progress</p>
                  </div>
                )}

                {/* Camera Fallback / Error State inside viewport */}
                {cameraError && !isProcessingFile && (
                  <div className="absolute inset-0 bg-slate-900/95 p-5 flex flex-col items-center justify-center text-center space-y-2.5 z-10">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Device Camera Available</p>
                      <p className="text-[11px] text-slate-300 leading-snug mt-1">
                        {cameraError}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => snapCameraInputRef.current?.click()}
                      className="px-4 py-2 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition transform active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo of QR Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 pt-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Live Video Stream</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Decode Error Notice */}
              {fileError && (
                <div className="w-full max-w-xs p-2.5 bg-red-950/70 border border-red-700/60 rounded-xl text-[11px] text-red-200 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Dual Action Buttons: Native Camera Snap (Accomplishment mechanism) & Gallery Upload */}
              <div className="w-full max-w-xs space-y-2">
                <button
                  type="button"
                  onClick={() => snapCameraInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-gov-blue to-blue-700 hover:from-blue-700 hover:to-gov-blue text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition transform active:scale-98 disabled:opacity-50 border border-blue-500/30"
                >
                  <Camera className="w-4 h-4 text-gov-goldLight" />
                  <span>Snap QR Photo (Device Camera)</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-lg transition flex items-center justify-center space-x-1 border border-slate-700 disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload QR Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab("manual")}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-lg transition border border-slate-700"
                  >
                    Type Token
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center leading-tight pt-0.5">
                  Uses the same high-compatibility device camera as Accomplishment Photos. Works on all smartphones &amp; browsers!
                </p>
              </div>

              {/* Hidden native camera capture input (identical to Accomplishment Photos) */}
              <input
                ref={snapCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {/* Hidden gallery / file picker input */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Tab 2: Manual Token Entry */
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <div className="text-center space-y-1">
                <KeyRound className="w-8 h-8 text-gov-goldLight mx-auto" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Direct QR Token Input
                </h4>
                <p className="text-[11px] text-slate-400">
                  Enter the unique public token printed on the beneficiary's physical stub
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                    placeholder="e.g. TUPAD-DGL-ABC123-1-XYZ"
                    className="w-full pl-3 pr-20 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-gov-gold uppercase font-bold"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded-lg flex items-center space-x-1"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!manualToken.trim()}
                className="w-full py-2.5 bg-gov-blue hover:bg-gov-dark text-white font-bold text-xs rounded-xl transition shadow disabled:opacity-50"
              >
                Submit Token
              </button>

              <button
                type="button"
                onClick={() => setTab("camera")}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 border border-slate-700"
              >
                <Camera className="w-3.5 h-3.5 text-gov-goldLight" />
                <span>Back to Camera Scanner</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center flex-shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
            <span>Powered by PESO Dingalan Dual-Engine (Live WebRTC + Native Camera Capture)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
