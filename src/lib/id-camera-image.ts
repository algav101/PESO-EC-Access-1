import type { CameraRect } from "./id-camera-guide";
import { analyzeIdPhoto, type IdPhotoQuality } from "./id-photo-quality";

type CameraCapabilities = MediaTrackCapabilities & { focusMode?: string[]; exposureMode?: string[]; whiteBalanceMode?: string[]; torch?: boolean };
type CameraControls = { focusMode?: string; exposureMode?: string; whiteBalanceMode?: string; torch?: boolean };
type StillCapture = { takePhoto(): Promise<Blob> };
type ImageCaptureConstructor = new (track: MediaStreamTrack) => StillCapture;

export async function prepareIdCamera(track: MediaStreamTrack): Promise<{ torch: boolean }> {
  let capabilities: CameraCapabilities = {};
  try { capabilities = track.getCapabilities?.() || {}; } catch { /* Unsupported browser. */ }
  for (const setting of ["focusMode", "exposureMode", "whiteBalanceMode"] as const) {
    if (!capabilities[setting]?.includes("continuous")) continue;
    try { await track.applyConstraints({ advanced: [{ [setting]: "continuous" } as MediaTrackConstraintSet] }); }
    catch { /* Optional controls must never prevent capture. */ }
  }
  return { torch: capabilities.torch === true };
}

export async function setIdCameraLight(track: MediaStreamTrack, enabled: boolean) {
  await track.applyConstraints({ advanced: [{ torch: enabled } as CameraControls as MediaTrackConstraintSet] });
}

export function measureIdCanvas(image: HTMLCanvasElement, nativeLongEdge = Math.max(image.width, image.height), minimumLongEdge = 1200): IdPhotoQuality {
  const sample = document.createElement("canvas");
  const scale = Math.min(1, 256 / Math.max(image.width, image.height));
  sample.width = Math.max(3, Math.round(image.width * scale)); sample.height = Math.max(3, Math.round(image.height * scale));
  try {
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0, sample.width, sample.height);
    return analyzeIdPhoto(context.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height, nativeLongEdge, minimumLongEdge);
  } finally { sample.width = sample.height = 1; }
}

function drawCrop(source: CanvasImageSource, crop: CameraRect, maximumEdge = 3600): HTMLCanvasElement {
  const image = document.createElement("canvas"), scale = Math.min(1, maximumEdge / Math.max(crop.width, crop.height));
  image.width = Math.max(1, Math.round(crop.width * scale)); image.height = Math.max(1, Math.round(crop.height * scale));
  const context = image.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, image.width, image.height);
  return image;
}

export function measureIdVideo(video: HTMLVideoElement, crop: CameraRect, minimumLongEdge = 1200): IdPhotoQuality {
  const image = drawCrop(video, crop, 256);
  try { return measureIdCanvas(image, Math.max(crop.width, crop.height), minimumLongEdge); }
  finally { image.width = image.height = 1; }
}

function captureActive(isActive: () => boolean) {
  if (!isActive()) throw new DOMException("Capture cancelled", "AbortError");
}

export async function captureBestIdPhoto(video: HTMLVideoElement, track: MediaStreamTrack, crop: CameraRect, isActive: () => boolean, minimumLongEdge = 1200) {
  captureActive(isActive);
  const Constructor = (window as unknown as { ImageCapture?: ImageCaptureConstructor }).ImageCapture;
  if (Constructor && track.readyState === "live") {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Some Android cameras can produce a higher-resolution still than their preview.
      // Bound the optional call: canvas fallback remains available when it is unsupported.
      const blob = await Promise.race([new Constructor(track).takePhoto(), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 2200); })]);
      captureActive(isActive);
      if (blob) {
        const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
        try {
          const sameView = Math.abs(bitmap.width / bitmap.height - video.videoWidth / video.videoHeight) < .015;
          // Do not apply preview coordinates to a different-aspect still (it could clip the ID).
          if (sameView && bitmap.width >= video.videoWidth && bitmap.height >= video.videoHeight) {
            const scaled = { x: crop.x * bitmap.width / video.videoWidth, y: crop.y * bitmap.height / video.videoHeight,
              width: crop.width * bitmap.width / video.videoWidth, height: crop.height * bitmap.height / video.videoHeight };
            const image = drawCrop(bitmap, scaled);
            try {
              captureActive(isActive);
              return { image, quality: measureIdCanvas(image, undefined, minimumLongEdge), method: "HIGH_RES_STILL" as const };
            } catch (error) { image.width = image.height = 1; throw error; }
          }
        } finally { bitmap.close(); }
      }
    } catch (error) {
      captureActive(isActive);
      // ImageCapture is optional even when the constructor exists.
    } finally { if (timer) clearTimeout(timer); }
  }
  let best: { image: HTMLCanvasElement; quality: IdPhotoQuality; method: "BEST_VIDEO_FRAME" } | undefined;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      captureActive(isActive);
      const image = drawCrop(video, crop), quality = measureIdCanvas(image, undefined, minimumLongEdge);
      if (!best || quality.score > best.quality.score) {
        if (best) best.image.width = best.image.height = 1;
        best = { image, quality, method: "BEST_VIDEO_FRAME" };
      } else image.width = image.height = 1;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 110));
    }
    captureActive(isActive);
    return best!;
  } catch (error) {
    if (best) best.image.width = best.image.height = 1;
    throw error;
  }
}
