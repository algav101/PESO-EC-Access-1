"use client";

import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X, RefreshCw, KeyRound, AlertCircle } from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onScan: (token: string) => void;
  onClose: () => void;
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [tab, setTab] = useState<"camera" | "manual">("camera");
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (tab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, tab]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Camera unavailable or permission denied. Please enter token manually.");
      setTab("manual");
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const tick = () => {
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
  };

  const handleSuccess = (data: string) => {
    stopCamera();
    // Audio / vibration feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100);
    }
    onScan(data.trim());
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    onScan(manualToken.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gov-blue text-gov-goldLight">
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
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setTab("camera")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              tab === "camera"
                ? "bg-gov-blue text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Camera Scanner
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              tab === "manual"
                ? "bg-gov-blue text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Manual Token Entry
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
          {tab === "camera" ? (
            <div className="relative w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center border-2 border-gov-gold/60 shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {/* Target Scan Frame */}
              <div className="absolute inset-4 border-2 border-dashed border-gov-gold/80 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-gov-gold"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-gov-gold"></div>
                </div>
                {/* Laser animation */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-gov-gold"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-gov-gold"></div>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-xs text-slate-300">{cameraError}</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <div className="text-center space-y-1">
                <KeyRound className="w-8 h-8 text-gov-goldLight mx-auto" />
                <h4 className="text-xs font-bold text-white uppercase">Direct QR Token Input</h4>
                <p className="text-[11px] text-slate-400">
                  Enter the unique public token printed on the beneficiary's physical stub
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. TUPAD-DGL-ABC123-1-XYZ"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-gov-gold"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg transition shadow"
              >
                Submit Token
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Powered by PESO Dingalan Offline QR Engine
          </p>
        </div>
      </div>
    </div>
  );
}
