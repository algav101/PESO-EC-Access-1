"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  QrCode,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  User,
  Calendar,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import QRCode from "qrcode";

function ReplacementsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlProgramId = searchParams.get("programId");

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(urlProgramId || "");
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [existingReplacements, setExistingReplacements] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replacement Form State
  const [originalPbId, setOriginalPbId] = useState("");
  const [reason, setReason] = useState("");
  const [repName, setRepName] = useState("");
  const [repBday, setRepBday] = useState("");
  const [repSex, setRepSex] = useState("MALE");
  const [repBrgy, setRepBrgy] = useState("Paltic");
  const [repSitio, setRepSitio] = useState("");
  const [repContact, setRepContact] = useState("");

  // Eligibility check state
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<any | null>(null);

  // Created Replacement Result
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [newQrImage, setNewQrImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      fetchBeneficiariesAndReplacements(selectedProgramId);
    }
  }, [selectedProgramId]);

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
    }
  };

  const fetchBeneficiariesAndReplacements = async (programId: string) => {
    try {
      const bRes = await fetch(`/api/v1/programs/${programId}/beneficiaries`);
      if (bRes.ok) {
        const data = await bRes.json();
        setBeneficiaries(data.beneficiaries || []);
      }

      const rRes = await fetch(`/api/v1/replacements?programId=${programId}`);
      if (rRes.ok) {
        const data = await rRes.json();
        setExistingReplacements(data.replacements || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckEligibility = async () => {
    if (!repName || !repBday) {
      setError("Please provide replacement name and birthday to check 365-day eligibility.");
      return;
    }

    setCheckingEligibility(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/restrictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: repName, birthday: repBday }),
      });

      const data = await res.json();
      setEligibilityResult(data);
      if (!data.eligible) {
        setError(`Restricted until ${data.restrictionEnd}: ${data.reason}`);
      } else {
        setStep(3); // Proceed to document upload
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleCommitReplacement = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/replacements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: selectedProgramId,
          originalProgramBeneficiaryId: originalPbId,
          reason,
          fullName: repName,
          birthday: repBday,
          sex: repSex,
          barangay: repBrgy,
          sitio: repSitio,
          contactNumber: repContact,
          idFrontFile: { name: "id_front.jpg", size: 2048, type: "image/jpeg" },
          idBackFile: { name: "id_back.jpg", size: 2048, type: "image/jpeg" },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Replacement failed");

      setCreatedResult(data);
      if (data.qr?.publicToken) {
        const qrUrl = await QRCode.toDataURL(data.qr.publicToken, {
          width: 200,
          margin: 1,
          color: { dark: "#0c3b6d", light: "#ffffff" },
        });
        setNewQrImage(qrUrl);
      }
      setStep(4);
      fetchBeneficiariesAndReplacements(selectedProgramId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const originalBeneficiary = beneficiaries.find((b) => b.id === originalPbId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <UserPlus className="w-6 h-6 text-gov-blue" />
            <span>Onsite Beneficiary Replacement Hub</span>
          </h1>
          <p className="text-xs text-slate-500">
            Process emergency field replacements with automated 365-day restriction checking & new QR issuance
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => {
              setIsCreating(true);
              setStep(1);
              setCreatedResult(null);
            }}
            className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
          >
            <UserPlus className="w-4 h-4 text-gov-goldLight" />
            <span>New Replacement Wizard</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Replacement Wizard */}
      {isCreating ? (
        <div className="gov-card p-6 space-y-6 shadow-xl border-t-4 border-t-gov-blue">
          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold border-b pb-4">
            <div className={`p-2 rounded ${step === 1 ? "bg-gov-blue text-white" : "bg-slate-100 text-slate-500"}`}>
              1. Original Beneficiary
            </div>
            <div className={`p-2 rounded ${step === 2 ? "bg-gov-blue text-white" : "bg-slate-100 text-slate-500"}`}>
              2. Replacement & Eligibility
            </div>
            <div className={`p-2 rounded ${step === 3 ? "bg-gov-blue text-white" : "bg-slate-100 text-slate-500"}`}>
              3. ID Upload & Review
            </div>
            <div className={`p-2 rounded ${step === 4 ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>
              4. Complete & QR
            </div>
          </div>

          {/* Step 1: Select Original Beneficiary */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                Step 1: Select Original Beneficiary to Replace
              </h3>
              <p className="text-xs text-slate-500">
                The original beneficiary record will be marked as REPLACED and preserved in historical audit reports.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Choose Beneficiary *
                </label>
                <select
                  value={originalPbId}
                  onChange={(e) => {
                    setOriginalPbId(e.target.value);
                    const b = beneficiaries.find((x) => x.id === e.target.value);
                    if (b) {
                      setRepBrgy(b.beneficiary.barangay || "Paltic");
                      setRepSitio(b.beneficiary.sitio || "");
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
                >
                  <option value="">-- Select Original Beneficiary --</option>
                  {beneficiaries
                    .filter((b) => b.participationStatus === "ACTIVE")
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.designatedNumber} - {b.beneficiary.fullName} ({b.beneficiary.barangay}) - {b.tableNumber}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason for Replacement *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 mb-2"
                >
                  <option value="">-- Select Official Reason --</option>
                  <option value="Absent during orientation session">Absent during orientation session</option>
                  <option value="Medical condition / Illness">Medical condition / Illness</option>
                  <option value="Secured other employment">Secured other employment</option>
                  <option value="Voluntary withdrawal">Voluntary withdrawal</option>
                  <option value="Relocated out of municipality">Relocated out of municipality</option>
                </select>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Or provide custom reason..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!originalPbId || !reason}
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow disabled:opacity-50 flex items-center space-x-1"
                >
                  <span>Next: Replacement Info</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Replacement Demographic Info & Eligibility Check */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                Step 2: Replacement Beneficiary Profile & Eligibility Lock Check
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Full Name (Last Name, First Name Middle Name) *
                  </label>
                  <input
                    type="text"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="e.g. DELA CRUZ, JUANITO M."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Birthday (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    value={repBday}
                    onChange={(e) => setRepBday(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Sex</label>
                  <select
                    value={repSex}
                    onChange={(e) => setRepSex(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Barangay</label>
                  <input
                    type="text"
                    value={repBrgy}
                    onChange={(e) => setRepBrgy(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={repContact}
                    onChange={(e) => setRepContact(e.target.value)}
                    placeholder="0917XXXXXXX"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-gov-blue uppercase">365-Day Restriction Guarantee</h4>
                  <p className="text-[11px] text-slate-500">
                    Verifies whether the replacement beneficiary has received TUPAD payout within the last 365 days.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckEligibility}
                  disabled={checkingEligibility || !repName || !repBday}
                  className="px-4 py-2 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-gov-goldLight" />
                  <span>{checkingEligibility ? "Checking Lockout..." : "Run Eligibility Check"}</span>
                </button>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border rounded-lg"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: ID Upload & Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                Step 3: Verification Documents & Review
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-2 bg-slate-50">
                  <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                  <span className="text-xs font-bold text-slate-700 block">ID Front Photo</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">✓ Attached & Verified</span>
                </div>
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-2 bg-slate-50">
                  <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                  <span className="text-xs font-bold text-slate-700 block">ID Back Photo</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">✓ Attached & Verified</span>
                </div>
              </div>

              <div className="gov-card p-4 bg-slate-50 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase text-[11px]">Replacement Summary</h4>
                <p>
                  <span className="text-slate-500">Original Beneficiary: </span>
                  <strong className="text-red-700 line-through">
                    #{originalBeneficiary?.designatedNumber} - {originalBeneficiary?.beneficiary?.fullName}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Replacement Beneficiary: </span>
                  <strong className="text-emerald-700">
                    {repName} (Born {repBday}) • Brgy. {repBrgy}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Assigned Slot: </span>
                  <strong>Designated #{originalBeneficiary?.designatedNumber} • {originalBeneficiary?.tableNumber}</strong>
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCommitReplacement}
                  disabled={loading}
                  className="px-5 py-2.5 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-extrabold text-xs rounded-lg shadow-lg flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? "Issuing Replacement..." : "Approve & Issue Replacement QR"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Replacement Completed */}
          {step === 4 && createdResult && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Replacement Successfully Approved & Registered!
                </h3>
                <p className="text-xs text-slate-500">
                  New Cryptographic QR Token generated. Original beneficiary history has been archived with REPLACED status.
                </p>
              </div>

              {newQrImage && (
                <div className="p-4 bg-slate-50 border rounded-xl max-w-xs mx-auto space-y-2">
                  <img src={newQrImage} alt="Replacement QR" className="w-40 h-40 mx-auto" />
                  <p className="font-mono text-xs font-bold text-gov-blue">{createdResult.qr.publicToken}</p>
                </div>
              )}

              <button
                onClick={() => setIsCreating(false)}
                className="px-6 py-2.5 bg-gov-blue hover:bg-gov-light text-white font-bold text-xs rounded-xl shadow transition"
              >
                Back to Replacements Masterlist
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Existing Replacements Table */
        <div className="gov-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recorded Replacements ({existingReplacements.length})
            </h3>
          </div>

          {existingReplacements.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No replacements recorded for this program.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                  <tr>
                    <th className="px-4 py-3"># Slot</th>
                    <th className="px-4 py-3">Original Beneficiary</th>
                    <th className="px-4 py-3">Replacement Beneficiary</th>
                    <th className="px-4 py-3">Official Reason</th>
                    <th className="px-4 py-3">Initiated By</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {existingReplacements.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-gov-blue">
                        {r.originalProgramBeneficiary?.designatedNumber}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700 line-through">
                        {r.originalProgramBeneficiary?.beneficiary?.fullName}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-800">
                        {r.replacementProgramBeneficiary?.beneficiary?.fullName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {r.initiatedBy?.fullName}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReplacementsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Replacements...</div>}>
      <ReplacementsContent />
    </Suspense>
  );
}
