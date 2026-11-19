"use client";

import type { DetectedQrIdentity } from "@/lib/program-qr-slot";

export function DetectedQrPanel({ identity, displayedProgramId }: { identity: DetectedQrIdentity | null; displayedProgramId?: string }) {
  if (!identity) return null;
  return (
    <section data-testid="detected-qr-identity" aria-live="polite" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-slate-800 space-y-2">
      <h2 className="font-black text-emerald-900">QR CODE SUCCESSFULLY DETECTED</h2>
      <p className="font-bold">{identity.programCode} — {identity.programName}</p>
      <p className="break-all">Work Program ID: <span className="font-mono">{identity.programId}</span></p>
      <p>Beneficiary #{identity.designatedNumber}: <strong>{identity.fullName}</strong></p>
      <p>Verification: {identity.verificationStatus === "CACHED" ? "Verified from device cache (offline)" : "Verified registered identity"}</p>
      <p>Scanned: {new Date(identity.verifiedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</p>
      {displayedProgramId !== identity.programId && (
        <p className="font-semibold text-emerald-900">Ibang program ang naka-display. Ang scan at susunod na confirmation ay para lamang sa detected program na ito.</p>
      )}
    </section>
  );
}
