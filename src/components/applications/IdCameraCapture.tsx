"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, Flashlight, RefreshCw, RotateCw, SwitchCamera, X } from "lucide-react";
import { getCameraGuideRect, getCameraSourceCrop, getIdCameraPreset, ID_CAMERA_GUIDES, type IdCameraPreset } from "@/lib/id-camera-guide";
import { captureBestIdPhoto, measureIdVideo, prepareIdCamera, setIdCameraLight } from "@/lib/id-camera-image";
import type { IdPhotoQuality } from "@/lib/id-photo-quality";

interface Props {
  idType: string;
  label: string;
  closeup?: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
  onChooseFile: () => void;
}

function cameraError(error: unknown) {
  const name = error instanceof Error || error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Hindi pinayagan ang camera. Maaari mong payagan ito sa browser o gumamit ng file upload.";
  if (name === "NotFoundError") return "Walang camera na nakita. Gumamit ng ibang device o pumili ng existing photo/file.";
  if (name === "NotReadableError" || name === "AbortError") return "Hindi mabuksan ang camera. Isara muna ang ibang app na gumagamit nito, saka subukan muli.";
  return "Hindi mabuksan ang camera sa browser na ito. Subukan muli o pumili ng photo/file.";
}

export function IdCameraCapture({ idType, label, closeup = false, onCapture, onClose, onChooseFile }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null), videoRef = useRef<HTMLVideoElement>(null), stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null), alive = useRef(true), closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [preset, setPreset] = useState<IdCameraPreset>(() => getIdCameraPreset(idType, closeup));
  const [rotated, setRotated] = useState(false), [size, setSize] = useState(1);
  const [view, setView] = useState({ width: 0, height: 0 });
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [restart, setRestart] = useState(0), [ready, setReady] = useState(false), [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [quality, setQuality] = useState<IdPhotoQuality | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false), [torchOn, setTorchOn] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string; quality: IdPhotoQuality; method: string } | null>(null);
  const hasPhoto = Boolean(photo);
  const displayIdType = idType === "VOTER'S CETIFICATE" ? "VOTER'S CERTIFICATE" : idType;
  const frame = useMemo(() => getCameraGuideRect(view.width, view.height, preset, rotated, size), [view, preset, rotated, size]);
  const minimumLongEdge = preset === "DOCUMENT" ? 1600 : preset === "NUMBER" ? 800 : 1200;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled])') || [])];
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    const visibility = () => { if (document.hidden) { stopCamera(); setReady(false); setPaused(true); } };
    document.addEventListener("keydown", keys);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive.current = false; stopCamera(); document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keys); document.removeEventListener("visibilitychange", visibility);
      if (previous?.isConnected) previous.focus();
    };
  }, [stopCamera]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => { const bounds = stage.getBoundingClientRect(); setView({ width: bounds.width, height: bounds.height }); };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(stage); window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  useEffect(() => {
    if (hasPhoto || paused) return;
    let disposed = false;
    setReady(false); setError(""); setQuality(null); setTorchAvailable(false); setTorchOn(false);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Kailangan ng HTTPS at supported browser para sa live camera. Puwede pa rin ang photo/file upload.");
      return;
    }
    const start = async () => {
      let stream: MediaStream | undefined;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 3840 }, height: { ideal: 2160 } } });
        if (disposed || !alive.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stopCamera(); return; }
        stream.getVideoTracks().forEach((track) => { track.onended = () => { if (!disposed) { setReady(false); setError("Natigil ang camera. Subukan itong buksan muli."); } }; });
        video.srcObject = stream;
        await video.play();
        if (!disposed && alive.current) setReady(video.videoWidth > 0 && video.videoHeight > 0);
        const track = stream.getVideoTracks()[0];
        if (track) {
          const controls = await prepareIdCamera(track);
          if (!disposed && alive.current) setTorchAvailable(controls.torch);
        }
      } catch (issue) {
        stream?.getTracks().forEach((track) => track.stop());
        if (!disposed && alive.current) { stopCamera(); setError(cameraError(issue)); }
      }
    };
    void start();
    return () => { disposed = true; stopCamera(); };
  }, [facing, restart, hasPhoto, paused, stopCamera]);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  useEffect(() => {
    if (!ready || hasPhoto || busy) return;
    const inspect = () => {
      const video = videoRef.current, stage = stageRef.current;
      if (!video?.videoWidth || !stage) return;
      const bounds = stage.getBoundingClientRect();
      const guide = getCameraGuideRect(bounds.width, bounds.height, preset, rotated, size);
      const crop = guide && getCameraSourceCrop(video.videoWidth, video.videoHeight, bounds.width, bounds.height, guide);
      if (crop) {
        try { setQuality(measureIdVideo(video, crop, minimumLongEdge)); }
        catch { /* A transient frame must not stop the camera. */ }
      }
    };
    inspect();
    const timer = setInterval(inspect, 900);
    return () => clearInterval(timer);
  }, [ready, hasPhoto, busy, preset, rotated, size, minimumLongEdge]);

  const capture = async () => {
    const video = videoRef.current, stage = stageRef.current;
    if (!video || !stage || !ready || busy) return;
    const bounds = stage.getBoundingClientRect();
    const guide = getCameraGuideRect(bounds.width, bounds.height, preset, rotated, size);
    const crop = guide && getCameraSourceCrop(video.videoWidth, video.videoHeight, bounds.width, bounds.height, guide);
    if (!crop) { setError("Hindi pa handa ang camera. Subukan muli."); return; }
    setBusy(true);
    let image: HTMLCanvasElement | undefined;
    try {
      const stream = streamRef.current, track = stream?.getVideoTracks()[0];
      if (!track) throw new Error("Camera stopped");
      const captured = await captureBestIdPhoto(video, track, crop, () => alive.current && streamRef.current === stream, minimumLongEdge);
      image = captured.image;
      const encode = (quality: number) => new Promise<Blob>((resolve, reject) => image!.toBlob(value => value ? resolve(value) : reject(new Error("Photo capture failed")), "image/jpeg", quality));
      let blob = await encode(.97);
      if (blob.size > 10 * 1024 * 1024) blob = await encode(.9);
      if (blob.size > 10 * 1024 * 1024) throw new Error("Photo too large");
      if (!alive.current || streamRef.current !== stream) return;
      const file = new File([blob], `id-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      stopCamera(); setReady(false); setPhoto({ file, url: URL.createObjectURL(file), quality: captured.quality, method: captured.method });
    } catch {
      if (alive.current) setError("Hindi nakuhanan ang photo. Subukan muli o gumamit ng file upload.");
    } finally { if (image) image.width = image.height = 1; if (alive.current) setBusy(false); }
  };

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-[100] flex h-screen w-full flex-col bg-slate-950 text-white" style={{ height: "100dvh" }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div className="min-w-0"><h2 id={titleId} className="text-sm font-black">{label} — camera</h2><p className="text-xs text-slate-300">{displayIdType} · {ID_CAMERA_GUIDES[preset].label}</p></div>
        <button type="button" aria-label="Isara ang camera" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="h-5 w-5" /></button>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] landscape:grid-cols-[minmax(0,1fr)_260px] landscape:grid-rows-1">
        <div ref={stageRef} data-testid="id-camera-stage" className="relative min-h-0 min-w-0 overflow-hidden bg-black">
          {photo ? <img src={photo.url} alt="Review ng nakuhang ID photo" className="absolute inset-0 h-full w-full object-contain" /> : <>
            <video ref={videoRef} aria-label="Live ID camera" autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" onLoadedData={() => { if (videoRef.current?.videoWidth && streamRef.current) setReady(true); }} />
            {frame && <div data-testid="id-camera-guide" data-preset={preset} aria-hidden="true" className="pointer-events-none absolute rounded-lg border-2 border-emerald-300" style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, boxShadow: "0 0 0 9999px rgba(2,6,23,0.62)" }}>
              {["-left-0.5 -top-0.5 border-l-4 border-t-4 rounded-tl-lg", "-right-0.5 -top-0.5 border-r-4 border-t-4 rounded-tr-lg", "-left-0.5 -bottom-0.5 border-l-4 border-b-4 rounded-bl-lg", "-right-0.5 -bottom-0.5 border-r-4 border-b-4 rounded-br-lg"].map((corner) => <span key={corner} className={`absolute h-6 w-6 border-emerald-300 ${corner}`} />)}
            </div>}
            {!ready && !error && !paused && <p role="status" className="absolute left-4 right-4 top-4 rounded-xl bg-slate-900/90 p-3 text-center text-sm">Binubuksan ang camera… Payagan ang camera kapag tinanong.</p>}
            {paused && !error && <p role="status" className="absolute left-4 right-4 top-4 rounded-xl bg-slate-900/90 p-3 text-center text-sm">Naka-pause ang camera matapos lumipat ng app o tab.</p>}
            {ready && quality && !busy && <p data-testid="id-camera-quality" role="status" className={`pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border px-3 py-2 text-center text-xs ${quality.warnings.length ? "border-amber-300/60 bg-amber-950/95 text-amber-100" : "border-emerald-300/40 bg-slate-950/90 text-emerald-100"}`}>{quality.warnings[0] || "I-steady ang phone. I-check na nababasa ang lahat ng sulat bago kumuha."}</p>}
          </>}
          {error && <p role="alert" className="absolute left-4 right-4 top-4 rounded-xl border border-rose-300 bg-rose-950/95 p-3 text-sm text-rose-100">{error}</p>}
        </div>
        <footer className="flex min-h-0 flex-col justify-center gap-3 overflow-y-auto border-t border-white/10 bg-slate-950 p-4 landscape:border-l landscape:border-t-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {photo ? <>
            <p data-testid="id-photo-capture-method" className="text-center text-[11px] text-emerald-200">{photo.method === "HIGH_RES_STILL" ? "High-resolution camera photo" : "Pinili ang pinakamalinaw sa 3 camera frames"} · {photo.file.size < 1024 * 1024 ? `${Math.round(photo.file.size / 1024)} KB` : `${(photo.file.size / 1024 / 1024).toFixed(1)} MB`}</p>
            {photo.quality.warnings.length > 0 && <div data-testid="id-photo-quality-warning" role="status" className="rounded-lg border border-amber-300/40 bg-amber-950/60 p-3 text-xs text-amber-100"><p className="mb-1 font-bold">Mas mabuting kunan muli:</p><ul className="list-disc space-y-1 pl-4">{photo.quality.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
            <p className="text-center text-xs text-slate-200">Malinaw ba ang buong ID at lahat ng sulat? Hindi pa ito ginagamit hangga't hindi kinukumpirma.</p>
            <button type="button" onClick={() => { onCapture(photo.file); onClose(); }} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950"><Check className="h-5 w-5" />Gamitin ang photo</button>
            <button type="button" onClick={() => { setPhoto(null); setError(""); setPaused(false); }} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />Kunan muli</button>
          </> : <>
            <p className="text-center text-xs text-slate-200">{closeup ? "Ilagay ang buong ID number at label nito sa loob ng border." : "Itapat ang buong ID sa loob ng border. Iwasan ang glare at huwag takpan ang mga detalye."}</p>
            <div className="flex items-center gap-2">
              {!closeup && <label className="min-w-0 flex-1"><span className="sr-only">Uri ng border</span><select aria-label="Uri ng border" disabled={busy} value={preset} onChange={(event) => { setPreset(event.target.value as IdCameraPreset); setRotated(false); setSize(1); }} className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-xs text-white">
                {(["CARD", "DOCUMENT", "PASSPORT"] as const).map((value) => <option key={value} value={value}>{ID_CAMERA_GUIDES[value].label}</option>)}
              </select></label>}
              <button type="button" aria-label="Paikutin ang border" title="Paikutin ang border" disabled={busy} onClick={() => setRotated((current) => !current)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-600"><RotateCw className="h-5 w-5" /></button>
              <button type="button" aria-label="Palit camera" title="Palit camera" disabled={busy || Boolean(error)} onClick={() => { setPaused(false); setFacing((current) => current === "environment" ? "user" : "environment"); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-600 disabled:opacity-40"><SwitchCamera className="h-5 w-5" /></button>
              {torchAvailable && <button type="button" aria-label="Ilaw ng camera" aria-pressed={torchOn} disabled={busy || !ready} onClick={async () => {
                const track = streamRef.current?.getVideoTracks()[0];
                if (!track) return;
                try { await setIdCameraLight(track, !torchOn); if (alive.current && streamRef.current?.getVideoTracks()[0] === track) setTorchOn(!torchOn); }
                catch { if (alive.current) setTorchAvailable(false); }
              }} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${torchOn ? "border-amber-300 bg-amber-300/20 text-amber-200" : "border-slate-600"}`}><Flashlight className="h-5 w-5" /></button>}
            </div>
            <label className="flex items-center gap-3 text-xs"><span className="shrink-0">Laki ng border</span><input aria-label="Laki ng border" disabled={busy} type="range" min="0.75" max="1.05" step="0.05" value={size} onChange={(event) => setSize(Number(event.target.value))} className="h-6 min-w-0 flex-1 accent-emerald-300" /></label>
            {error || paused ? <button type="button" onClick={() => { setPaused(false); setRestart((current) => current + 1); }} className="min-h-11 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950">Buksan muli ang camera</button> : <button type="button" disabled={!ready || busy} onClick={capture} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40"><Camera className="h-5 w-5" />{busy ? "Kinukuha ang photo…" : "Kunan ang ID"}</button>}
          </>}
          <button type="button" onClick={onChooseFile} className="min-h-10 rounded-lg px-2 py-2 text-xs font-bold text-slate-300 underline">Pumili na lang ng photo / file</button>
        </footer>
      </div>
    </div>, document.body,
  );
}
