"use client";

import React, { useState, useRef } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  UserX,
  KeyRound,
  Camera,
  Upload,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  X,
  IdCard,
  Users,
  Trash2,
} from "lucide-react";
import { IdCameraCapture } from "@/components/applications/IdCameraCapture";
import { ID_TYPES, BARANGAYS, RELATIONSHIP_OPTIONS } from "@/lib/application-schema";

export interface StubReplacementTarget {
  programId: string;
  programBeneficiaryId: string;
  designatedNumber: number;
  fullName: string;
  barangay: string;
  sitio?: string | null;
  tableNumber?: string | null;
}

interface CapturedIdPayload {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface Props {
  isOpen: boolean;
  target: StubReplacementTarget | null;
  onClose: () => void;
  onSuccess: (resultData: any, summaryMessage: string) => void;
}

type CaptureSlotKey =
  | "applicantIdFront"
  | "applicantIdBack"
  | "dependentIdFront"
  | "dependentIdBack";

const REPLACEMENT_REASON_OPTIONS = [
  {
    value: "MEDICAL_CONDITION_OR_PREGNANCY",
    label: "Medically Unfit / Illness / Hospitalized / High-Risk Pregnancy",
  },
  {
    value: "EMPLOYED_OR_WORK_CONFLICT",
    label: "Found Regular Employment / Schedule Conflict",
  },
  {
    value: "FAMILY_EMERGENCY_OR_CAREGIVING",
    label: "Urgent Family Caregiving / Household Responsibility",
  },
  {
    value: "RELOCATED_OR_OUT_OF_TOWN",
    label: "Temporarily Out of Town / Relocated",
  },
  {
    value: "VOLUNTARY_WAIVER_TO_FAMILY_MEMBER",
    label: "Voluntarily Waived Slot in Favor of Qualified Family Member",
  },
  {
    value: "OTHER",
    label: "Other Specific Reason (Specify in Remarks)",
  },
] as const;

const ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS = [
  "SPOUSE / ASAWA",
  "SON / ANAK NA LALAKI",
  "DAUGHTER / ANAK NA BABAE",
  "MOTHER / INA",
  "FATHER / AMA",
  "SIBLING / KAPATID",
  "LIVE-IN PARTNER",
  "GRANDCHILD / APO",
  "PARENT-IN-LAW / BIYENAN",
  "SON/DAUGHTER-IN-LAW / MANUGANG",
  "SIBLING-IN-LAW / BAYAW O HIPAG",
  "NEPHEW / NIECE / PAMANGKIN",
  "COUSIN / PINSAN",
  "HOUSEHOLD MEMBER / KASAMA SA BAHAY",
  "RELATIVE / KAMAG-ANAK",
] as const;

function formatMmDdYyyyInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length > 2 && digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  if (digits.length > 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
  }
  return digits;
}

async function compressFileToPayload(file: File): Promise<CapturedIdPayload> {
  if (!file.type.startsWith("image/")) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
    return {
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      dataUrl,
    };
  }

  return new Promise<CapturedIdPayload>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 1024;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        URL.revokeObjectURL(objectUrl);
        resolve({
          name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
          size: approxBytes,
          type: "image/jpeg",
          dataUrl,
        });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load ID image for processing."));
    };
    img.src = objectUrl;
  });
}

export function StubReplacementWizardModal({
  isOpen,
  target,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Replacement Applicant & Dependent Info + Eligibility Check
  const [applicantFullName, setApplicantFullName] = useState("");
  const [applicantBirthday, setApplicantBirthday] = useState("");
  const [applicantSex, setApplicantSex] = useState<"MALE" | "FEMALE">("FEMALE");
  const [applicantContact, setApplicantContact] = useState("");
  const [applicantBarangay, setApplicantBarangay] = useState(
    target?.barangay?.toUpperCase() || "APLAYA"
  );
  const [applicantSitio, setApplicantSitio] = useState(target?.sitio || "");

  const [dependentFullName, setDependentFullName] = useState("");
  const [dependentRelationship, setDependentRelationship] = useState<string>("WIFE");
  const [dependentBirthday, setDependentBirthday] = useState("");
  const [dependentAge, setDependentAge] = useState<string>("");

  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{
    bothQualified: boolean;
    applicant: {
      eligible: boolean;
      status: string;
      reason: string;
      normalizedFullName: string;
    };
    dependent: {
      eligible: boolean;
      status: string;
      reason: string;
      normalizedFullName: string;
    };
  } | null>(null);

  // Step 2: Reason for Replacement & Original Beneficiary's Consent
  const [reason, setReason] = useState<string>(
    REPLACEMENT_REASON_OPTIONS[0].value
  );
  const [remarks, setRemarks] = useState("");
  const [originalBeneficiaryBirthdayPin, setOriginalBeneficiaryBirthdayPin] =
    useState("");
  const [relationshipWithReplacement, setRelationshipWithReplacement] =
    useState<string>(ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS[0]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  // Step 3: Front & Back ID Capture for Replacement Applicant AND Dependent
  const [applicantIdType, setApplicantIdType] = useState<string>("NATIONAL ID");
  const [applicantIdNumber, setApplicantIdNumber] = useState<string>("");
  const [dependentIdType, setDependentIdType] = useState<string>("NATIONAL ID");
  const [dependentIdNumber, setDependentIdNumber] = useState<string>("");

  const [idCaptures, setIdCaptures] = useState<
    Record<CaptureSlotKey, CapturedIdPayload | null>
  >({
    applicantIdFront: null,
    applicantIdBack: null,
    dependentIdFront: null,
    dependentIdBack: null,
  });

  const [activeCameraSlot, setActiveCameraSlot] = useState<{
    slot: CaptureSlotKey;
    label: string;
    idType: string;
  } | null>(null);

  const fileInputRefs = useRef<Record<CaptureSlotKey, HTMLInputElement | null>>({
    applicantIdFront: null,
    applicantIdBack: null,
    dependentIdFront: null,
    dependentIdBack: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && target) {
      setStep(1);
      setApplicantFullName("");
      setApplicantBirthday("");
      setApplicantSex("FEMALE");
      setApplicantContact("");
      setApplicantBarangay(target.barangay?.toUpperCase() || "APLAYA");
      setApplicantSitio(target.sitio || "");
      setDependentFullName("");
      setDependentRelationship("WIFE");
      setDependentBirthday("");
      setDependentAge("");
      setEligibilityResult(null);
      setReason(REPLACEMENT_REASON_OPTIONS[0].value);
      setRemarks("");
      setOriginalBeneficiaryBirthdayPin("");
      setRelationshipWithReplacement(ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS[0]);
      setConsentConfirmed(false);
      setApplicantIdType("NATIONAL ID");
      setApplicantIdNumber("");
      setDependentIdType("NATIONAL ID");
      setDependentIdNumber("");
      setIdCaptures({
        applicantIdFront: null,
        applicantIdBack: null,
        dependentIdFront: null,
        dependentIdBack: null,
      });
      setError(null);
    }
  }, [isOpen, target?.programBeneficiaryId]);

  if (!isOpen || !target) return null;

  const invalidateEligibility = () => {
    if (eligibilityResult) {
      setEligibilityResult(null);
    }
  };

  const handleCheckEligibility = async () => {
    setError(null);
    if (!applicantFullName.trim()) {
      setError(
        "Pakilagay ang buong pangalan ng Replacement Applicant (e.g. DELA CRUZ, JUAN SANTOS)."
      );
      return;
    }
    if (!applicantBirthday.trim() || applicantBirthday.trim().length < 8) {
      setError(
        "Pakilagay ang Birthday ng Replacement Applicant (MM-DD-YYYY)."
      );
      return;
    }
    if (!dependentFullName.trim()) {
      setError(
        "Pakilagay ang buong pangalan ng Dependent ng Replacement Applicant (e.g. DELA CRUZ, MARIA REYES)."
      );
      return;
    }

    setCheckingEligibility(true);
    try {
      const res = await fetch(
        "/api/v1/stub-distribution/check-replacement-eligibility",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId: target.programId,
            applicantFullName: applicantFullName.trim(),
            applicantBirthday: applicantBirthday.trim(),
            dependentFullName: dependentFullName.trim(),
            dependentBirthday: dependentBirthday.trim() || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to check TUPAD eligibility.");
      }
      setEligibilityResult({
        bothQualified: Boolean(data.bothQualified),
        applicant: data.applicant,
        dependent: data.dependent,
      });
    } catch (err: any) {
      setError(err.message || "Unable to verify eligibility.");
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleFileSelected = async (slot: CaptureSlotKey, file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const payload = await compressFileToPayload(file);
      setIdCaptures((prev) => ({ ...prev, [slot]: payload }));
    } catch (err: any) {
      setError(err.message || "Failed to process selected ID photo.");
    }
  };

  const handleProceedToStep3 = () => {
    setError(null);
    if (!reason) {
      setError("Pakipili ang Reason for Replacement.");
      return;
    }
    if (
      !originalBeneficiaryBirthdayPin.trim() ||
      originalBeneficiaryBirthdayPin.trim().length < 8
    ) {
      setError(
        `Pakilagay ang Birthday (${target.fullName}) bilang pagpapatunay ng kanyang pahintulot (consent) sa pagpapalit.`
      );
      return;
    }
    if (!relationshipWithReplacement.trim()) {
      setError(
        "Pakipili ang relasyon ng Original Beneficiary sa Replacement Applicant."
      );
      return;
    }
    if (!consentConfirmed) {
      setError(
        "Kailangang i-check ang confirmation box na pumapayag ang Original Beneficiary sa replacement."
      );
      return;
    }
    setStep(3);
  };

  const handleSubmitReplacement = async () => {
    setError(null);

    if (
      !idCaptures.applicantIdFront ||
      !idCaptures.applicantIdBack ||
      !idCaptures.dependentIdFront ||
      !idCaptures.dependentIdBack
    ) {
      setError(
        "Kailangang makuhanan o ma-upload ang Front at Back Side ID ng Replacement Applicant AT ng kanyang Dependent (4 ID photos total)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/stub-distribution/flag-replacement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: target.programId,
          programBeneficiaryId: target.programBeneficiaryId,
          // Step 1: Qualified Replacement Applicant & Dependent
          replacementApplicantFullName: applicantFullName.trim(),
          replacementApplicantBirthday: applicantBirthday.trim(),
          replacementApplicantSex: applicantSex,
          replacementApplicantContact: applicantContact.trim(),
          replacementApplicantBarangay: applicantBarangay,
          replacementApplicantSitio: applicantSitio.trim(),
          replacementApplicantIdType: applicantIdType,
          replacementApplicantIdNumber: applicantIdNumber.trim(),
          dependentFullName: dependentFullName.trim(),
          dependentRelationship,
          dependentBirthday: dependentBirthday.trim() || null,
          dependentAge: dependentAge ? Number(dependentAge) : null,
          dependentIdType,
          dependentIdNumber: dependentIdNumber.trim(),
          // Step 2: Reason & Original Beneficiary Consent
          reason,
          remarks: remarks.trim(),
          originalBeneficiaryBirthdayPin: originalBeneficiaryBirthdayPin.trim(),
          relationshipWithReplacement,
          consentConfirmed,
          // Step 3: 4 ID Captures (Front & Back for Applicant & Dependent)
          applicantIdFront: idCaptures.applicantIdFront,
          applicantIdBack: idCaptures.applicantIdBack,
          dependentIdFront: idCaptures.dependentIdFront,
          dependentIdBack: idCaptures.dependentIdBack,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Failed to complete replacement & consent verification."
        );
      }

      onSuccess(
        data.data,
        data.message ||
          `✓ Replacement Confirmed! Slot #${target.designatedNumber} is now assigned to ${data.data?.fullName}.`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to process replacement.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderIdCaptureBox = (
    slot: CaptureSlotKey,
    title: string,
    subtitle: string,
    idType: string
  ) => {
    const captured = idCaptures[slot];
    return (
      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-black text-slate-900 block">
              {title} *
            </span>
            <span className="text-[10px] text-slate-500 block">{subtitle}</span>
          </div>
          {captured ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              <span>CAPTURED</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              REQUIRED
            </span>
          )}
        </div>

        {captured ? (
          <div className="space-y-2">
            <div className="relative h-32 w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
              <img
                src={captured.dataUrl}
                alt={title}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveCameraSlot({ slot, label: title, idType })
                }
                className="flex-1 py-1.5 px-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-[11px] rounded-lg flex items-center justify-center space-x-1 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Retake Camera</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setIdCaptures((prev) => ({ ...prev, [slot]: null }))
                }
                className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg border border-rose-200 flex items-center justify-center"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                setActiveCameraSlot({ slot, label: title, idType })
              }
              className="py-2.5 px-3 bg-gov-blue hover:bg-gov-light text-white font-black text-[11px] rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition"
            >
              <Camera className="w-3.5 h-3.5 text-gov-goldLight" />
              <span>Capture ID</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRefs.current[slot]?.click()}
              className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-300 flex items-center justify-center space-x-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Photo</span>
            </button>
          </div>
        )}

        <input
          ref={(el) => {
            fileInputRefs.current[slot] = el;
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            void handleFileSelected(slot, file);
            e.target.value = "";
          }}
        />
      </div>
    );
  };

  const all4IdsCaptured = Boolean(
    idCaptures.applicantIdFront &&
      idCaptures.applicantIdBack &&
      idCaptures.dependentIdFront &&
      idCaptures.dependentIdBack
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
          {/* Top Modal Header */}
          <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <UserX className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-100 block">
                  DESIGNATED #{target.designatedNumber} •{" "}
                  {target.tableNumber || "Table 1"} • BRGY. {target.barangay}
                </span>
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  Beneficiary Replacement & Consent Verification
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              aria-label="Close replacement wizard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 3-Step Progress Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 shrink-0">
            <div className="grid grid-cols-3 gap-2 text-[11px] font-black">
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border ${
                  step === 1
                    ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                    : eligibilityResult?.bothQualified
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/15 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span className="truncate">1. Names & Eligibility</span>
              </div>

              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border ${
                  step === 2
                    ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                    : step > 2
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/15 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span className="truncate">2. Reason & Consent</span>
              </div>

              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border ${
                  step === 3
                    ? "bg-gov-blue text-white border-gov-blue shadow-xs"
                    : all4IdsCaptured
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/15 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span className="truncate">3. Front & Back IDs</span>
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* Original Beneficiary Banner */}
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Original Enrolled Beneficiary Being Replaced:
                </span>
                <strong className="text-sm font-black text-slate-900">
                  #{target.designatedNumber} — {target.fullName}
                </strong>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                Brgy. {target.barangay}
              </span>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black block">
                    Replacement Validation Notice
                  </strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* ==============================================================
                STEP 1: ENTER REPLACEMENT APPLICANT & DEPENDENT + CHECK ELIGIBILITY
               ============================================================== */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Replacement Applicant Section */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <UserCheck className="w-4 h-4 text-gov-blue" />
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">
                      A. Replacement Applicant Details (Full Name Required)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Replacement Applicant Full Name *{" "}
                        <span className="text-[10px] font-normal text-slate-500">
                          (Format: LAST NAME, FIRST NAME MIDDLE NAME)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={applicantFullName}
                        onChange={(e) => {
                          setApplicantFullName(e.target.value.toUpperCase());
                          invalidateEligibility();
                        }}
                        placeholder="e.g. DELA CRUZ, JUAN SANTOS"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold uppercase bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Applicant Birthday *</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          MM-DD-YYYY
                        </span>
                      </label>
                      <input
                        type="text"
                        value={applicantBirthday}
                        onChange={(e) => {
                          setApplicantBirthday(
                            formatMmDdYyyyInput(e.target.value)
                          );
                          invalidateEligibility();
                        }}
                        placeholder="MM-DD-YYYY (e.g. 05-14-1989)"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Sex *
                      </label>
                      <select
                        value={applicantSex}
                        onChange={(e) =>
                          setApplicantSex(e.target.value as "MALE" | "FEMALE")
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-slate-50"
                      >
                        <option value="FEMALE">FEMALE</option>
                        <option value="MALE">MALE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={applicantContact}
                        onChange={(e) => setApplicantContact(e.target.value)}
                        placeholder="09XX-XXX-XXXX"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Barangay *
                      </label>
                      <select
                        value={applicantBarangay}
                        onChange={(e) => setApplicantBarangay(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-slate-50"
                      >
                        {BARANGAYS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dependent Section */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <Users className="w-4 h-4 text-gov-blue" />
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">
                      B. Replacement&apos;s Dependent Details (Full Name Required)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Dependent Full Name *{" "}
                        <span className="text-[10px] font-normal text-slate-500">
                          (Format: LAST NAME, FIRST NAME MIDDLE NAME)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={dependentFullName}
                        onChange={(e) => {
                          setDependentFullName(e.target.value.toUpperCase());
                          invalidateEligibility();
                        }}
                        placeholder="e.g. DELA CRUZ, MARIA REYES"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold uppercase bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Relationship to Replacement Applicant *
                      </label>
                      <select
                        value={dependentRelationship}
                        onChange={(e) =>
                          setDependentRelationship(e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-slate-50"
                      >
                        {RELATIONSHIP_OPTIONS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Dependent Age / Birthday (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={dependentAge}
                          onChange={(e) => setDependentAge(e.target.value)}
                          placeholder="Age (e.g. 24)"
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-bold bg-slate-50"
                        />
                        <input
                          type="text"
                          value={dependentBirthday}
                          onChange={(e) => {
                            setDependentBirthday(
                              formatMmDdYyyyInput(e.target.value)
                            );
                            invalidateEligibility();
                          }}
                          placeholder="MM-DD-YYYY"
                          maxLength={10}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-mono bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check Eligibility Button */}
                <button
                  type="button"
                  onClick={handleCheckEligibility}
                  disabled={checkingEligibility}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  {checkingEligibility ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-gov-goldLight" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-gov-goldLight" />
                  )}
                  <span>
                    {checkingEligibility
                      ? "Checking TUPAD Eligibility & Restrictions..."
                      : "Check TUPAD Eligibility of Replacement Applicant & Dependent"}
                  </span>
                </button>

                {/* Eligibility Results Display */}
                {eligibilityResult && (
                  <div className="space-y-2.5 pt-1">
                    {/* Applicant Eligibility Card */}
                    <div
                      className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                        eligibilityResult.applicant.eligible
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-rose-50 border-rose-300 text-rose-900"
                      }`}
                    >
                      {eligibilityResult.applicant.eligible ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-black uppercase text-[11px]">
                            Replacement Applicant:{" "}
                            {eligibilityResult.applicant.normalizedFullName}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              eligibilityResult.applicant.eligible
                                ? "bg-emerald-200 text-emerald-900"
                                : "bg-rose-200 text-rose-900"
                            }`}
                          >
                            {eligibilityResult.applicant.eligible
                              ? "✓ QUALIFIED"
                              : "✗ NOT ELIGIBLE"}
                          </span>
                        </div>
                        <p className="text-[11px]">
                          {eligibilityResult.applicant.reason}
                        </p>
                      </div>
                    </div>

                    {/* Dependent Eligibility Card */}
                    <div
                      className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                        eligibilityResult.dependent.eligible
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-rose-50 border-rose-300 text-rose-900"
                      }`}
                    >
                      {eligibilityResult.dependent.eligible ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-black uppercase text-[11px]">
                            Dependent:{" "}
                            {eligibilityResult.dependent.normalizedFullName}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              eligibilityResult.dependent.eligible
                                ? "bg-emerald-200 text-emerald-900"
                                : "bg-rose-200 text-rose-900"
                            }`}
                          >
                            {eligibilityResult.dependent.eligible
                              ? "✓ QUALIFIED"
                              : "✗ NOT ELIGIBLE"}
                          </span>
                        </div>
                        <p className="text-[11px]">
                          {eligibilityResult.dependent.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                STEP 2: REASON FOR REPLACEMENT & ORIGINAL BENEFICIARY'S CONSENT
               ============================================================== */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">
                      ✓ Qualified Replacement & Dependent
                    </span>
                    <strong className="text-xs font-black text-emerald-950 block">
                      Applicant:{" "}
                      {eligibilityResult?.applicant.normalizedFullName ||
                        applicantFullName}
                    </strong>
                    <span className="text-[11px] font-bold text-emerald-800 block">
                      Dependent:{" "}
                      {eligibilityResult?.dependent.normalizedFullName ||
                        dependentFullName}{" "}
                      ({dependentRelationship})
                    </span>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                </div>

                {/* Reason for Replacement */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
                  <h4 className="font-black text-slate-900 uppercase tracking-tight">
                    A. Reason for Replacement *
                  </h4>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Select Official Reason for Replacement *
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-bold bg-slate-50"
                    >
                      {REPLACEMENT_REASON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Additional Coordinator Remarks / Explanation (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Specify additional context on why the original beneficiary is being replaced..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                    />
                  </div>
                </div>

                {/* Original Beneficiary Consent Verification */}
                <div className="p-4 border-2 border-amber-300 rounded-xl bg-amber-50/50 space-y-3.5">
                  <div className="flex items-start space-x-2.5">
                    <KeyRound className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight">
                        B. Original Beneficiary&apos;s Consent Confirmation *
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Confirm that{" "}
                        <strong className="text-slate-900">
                          {target.fullName} (#{target.designatedNumber})
                        </strong>{" "}
                        is allowing this replacement by verifying their{" "}
                        <strong>Birthday</strong> and{" "}
                        <strong>Relationship with the Replacement</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                        <span>Original Beneficiary&apos;s Birthday *</span>
                        <span className="text-[10px] font-mono text-amber-800">
                          MM-DD-YYYY
                        </span>
                      </label>
                      <input
                        type="text"
                        value={originalBeneficiaryBirthdayPin}
                        onChange={(e) =>
                          setOriginalBeneficiaryBirthdayPin(
                            formatMmDdYyyyInput(e.target.value)
                          )
                        }
                        placeholder="MM-DD-YYYY (e.g. 08-15-1987)"
                        maxLength={10}
                        className="w-full px-3 py-2.5 border border-amber-400 rounded-lg font-mono font-black text-sm bg-white focus:outline-none focus:border-gov-blue"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Relationship with the Replacement *
                      </label>
                      <select
                        value={relationshipWithReplacement}
                        onChange={(e) =>
                          setRelationshipWithReplacement(e.target.value)
                        }
                        className="w-full px-3 py-2.5 border border-amber-400 rounded-lg font-bold bg-white"
                      >
                        {ORIGINAL_TO_REPLACEMENT_RELATIONSHIPS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-start space-x-2.5 p-3 bg-white rounded-lg border border-amber-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={(e) => setConsentConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-gov-blue rounded"
                    />
                    <span className="text-[11px] font-bold text-slate-800 leading-snug">
                      I confirm that the original beneficiary (
                      <strong>{target.fullName}</strong>) has provided their
                      birthday and relationship (
                      <strong>{relationshipWithReplacement}</strong>) as proof
                      of voluntary consent allowing{" "}
                      <strong>
                        {eligibilityResult?.applicant.normalizedFullName ||
                          applicantFullName}
                      </strong>{" "}
                      to replace them in TUPAD Slot #{target.designatedNumber}.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ==============================================================
                STEP 3: CAPTURE FRONT & BACK SIDE ID OF REPLACEMENT & DEPENDENT
               ============================================================== */}
            {step === 3 && (
              <div className="space-y-5">
                {/* 1. Replacement Applicant IDs */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <IdCard className="w-4 h-4 text-gov-blue" />
                      <h4 className="font-black text-slate-900 uppercase tracking-tight">
                        A. Replacement Applicant Valid ID (Front & Back) *
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {eligibilityResult?.applicant.normalizedFullName ||
                        applicantFullName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Applicant ID Type *
                      </label>
                      <select
                        value={applicantIdType}
                        onChange={(e) => setApplicantIdType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-slate-50"
                      >
                        {ID_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Applicant ID Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={applicantIdNumber}
                        onChange={(e) =>
                          setApplicantIdNumber(e.target.value.toUpperCase())
                        }
                        placeholder="Enter ID Card Number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderIdCaptureBox(
                      "applicantIdFront",
                      "Replacement Applicant ID — FRONT Side",
                      "Front side showing photo, full name & ID number",
                      applicantIdType
                    )}
                    {renderIdCaptureBox(
                      "applicantIdBack",
                      "Replacement Applicant ID — BACK Side",
                      "Back side showing address, QR/barcode or signature",
                      applicantIdType
                    )}
                  </div>
                </div>

                {/* 2. Dependent IDs */}
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <IdCard className="w-4 h-4 text-gov-blue" />
                      <h4 className="font-black text-slate-900 uppercase tracking-tight">
                        B. Dependent Valid ID (Front & Back) *
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {eligibilityResult?.dependent.normalizedFullName ||
                        dependentFullName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Dependent ID Type *
                      </label>
                      <select
                        value={dependentIdType}
                        onChange={(e) => setDependentIdType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-slate-50"
                      >
                        {ID_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Dependent ID Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={dependentIdNumber}
                        onChange={(e) =>
                          setDependentIdNumber(e.target.value.toUpperCase())
                        }
                        placeholder="Enter Dependent ID Number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderIdCaptureBox(
                      "dependentIdFront",
                      "Dependent ID — FRONT Side",
                      "Front side of Dependent's Valid ID",
                      dependentIdType
                    )}
                    {renderIdCaptureBox(
                      "dependentIdBack",
                      "Dependent ID — BACK Side",
                      "Back side of Dependent's Valid ID",
                      dependentIdType
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-2 shrink-0">
            {step === 1 ? (
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl bg-white"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((prev) => (prev === 3 ? 2 : 1));
                }}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl bg-white flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {step === 1 && (
              <button
                type="button"
                disabled={!eligibilityResult?.bothQualified}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="px-5 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-black text-xs rounded-xl shadow flex items-center space-x-1.5 transition disabled:opacity-40"
              >
                <span>Proceed to Reason & Consent</span>
                <ArrowRight className="w-4 h-4 text-gov-goldLight" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="px-5 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-black text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
              >
                <span>Proceed to Capture Front & Back IDs</span>
                <ArrowRight className="w-4 h-4 text-gov-goldLight" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleSubmitReplacement}
                disabled={submitting || !all4IdsCaptured}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                )}
                <span>
                  {submitting
                    ? "Verifying Consent & Saving Replacement..."
                    : "Confirm Consent & Complete Replacement"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live ID Camera Capture Overlay */}
      {activeCameraSlot && (
        <IdCameraCapture
          idType={activeCameraSlot.idType}
          label={activeCameraSlot.label}
          onCapture={(file) => {
            const slot = activeCameraSlot.slot;
            setActiveCameraSlot(null);
            void handleFileSelected(slot, file);
          }}
          onClose={() => setActiveCameraSlot(null)}
          onChooseFile={() => {
            const slot = activeCameraSlot.slot;
            setActiveCameraSlot(null);
            fileInputRefs.current[slot]?.click();
          }}
        />
      )}
    </>
  );
}

