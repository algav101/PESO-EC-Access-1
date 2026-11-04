export type IdCameraPreset = "CARD" | "DOCUMENT" | "PASSPORT" | "NUMBER";
export interface CameraRect { x: number; y: number; width: number; height: number }

export const ID_CAMERA_GUIDES: Record<IdCameraPreset, { label: string; ratio: number; widthFraction: number; heightFraction: number }> = {
  CARD: { label: "ID card", ratio: 1.586, widthFraction: 0.86, heightFraction: 0.84 },
  DOCUMENT: { label: "Certificate / malaking dokumento", ratio: 1 / Math.SQRT2, widthFraction: 0.94, heightFraction: 0.94 },
  PASSPORT: { label: "Passport bio-data page", ratio: 1.42, widthFraction: 0.9, heightFraction: 0.9 },
  NUMBER: { label: "Close-up ng ID number", ratio: 4.4, widthFraction: 0.9, heightFraction: 0.65 },
};

export function getIdCameraPreset(idType: string, closeup = false): IdCameraPreset {
  if (closeup) return "NUMBER";
  const type = idType.trim().toUpperCase();
  // Keep compatibility with the existing ID option's legacy spelling.
  if (["VOTER'S CETIFICATE", "VOTER'S CERTIFICATE", "POLICE CLEARANCE", "NBI CLEARANCE"].includes(type)) return "DOCUMENT";
  return type === "PASSPORT" ? "PASSPORT" : "CARD";
}

export function getCameraGuideRect(width: number, height: number, preset: IdCameraPreset, rotated = false, size = 1): CameraRect | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const guide = ID_CAMERA_GUIDES[preset];
  const ratio = rotated ? 1 / guide.ratio : guide.ratio;
  const scale = Number.isFinite(size) ? Math.min(1.05, Math.max(0.75, size)) : 1;
  const maxWidth = width * Math.min(0.96, guide.widthFraction * scale);
  const maxHeight = height * Math.min(0.96, guide.heightFraction * scale);
  const frameWidth = Math.min(maxWidth, maxHeight * ratio);
  const frameHeight = frameWidth / ratio;
  return { x: (width - frameWidth) / 2, y: (height - frameHeight) / 2, width: frameWidth, height: frameHeight };
}

/** Map the visible guide through object-fit: cover back to native video pixels. */
export function getCameraSourceCrop(videoWidth: number, videoHeight: number, viewWidth: number, viewHeight: number, frame: CameraRect): CameraRect | null {
  if (![videoWidth, videoHeight, viewWidth, viewHeight, frame.width, frame.height].every((n) => Number.isFinite(n) && n > 0) || ![frame.x, frame.y].every(Number.isFinite)) return null;
  const scale = Math.max(viewWidth / videoWidth, viewHeight / videoHeight);
  const offsetX = (videoWidth * scale - viewWidth) / 2;
  const offsetY = (videoHeight * scale - viewHeight) / 2;
  // A small safety margin keeps ID edges from being clipped at the guide border.
  const padding = 0.02;
  const x = Math.max(0, (frame.x + offsetX - frame.width * padding) / scale);
  const y = Math.max(0, (frame.y + offsetY - frame.height * padding) / scale);
  const right = Math.min(videoWidth, (frame.x + offsetX + frame.width * (1 + padding)) / scale);
  const bottom = Math.min(videoHeight, (frame.y + offsetY + frame.height * (1 + padding)) / scale);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}
