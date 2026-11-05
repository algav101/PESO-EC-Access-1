"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  User,
  Calendar,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Zap,
  Clock,
  Printer,
  FileSpreadsheet,
  Eye,
  IdCard,
  Users,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableScrollWrapper } from "@/components/common/TableScrollWrapper";
import { useAuth } from "@/context/AuthContext";
import { isFieldCoordinator, isAdminUser } from "@/lib/permissions";
import {
  StubReplacementWizardModal,
  StubReplacementTarget,
} from "@/components/field/StubReplacementWizardModal";
import {
  ReplacementApprovalModal,
  PendingReplacementAssessmentItem,
} from "@/components/field/ReplacementApprovalModal";
import { PrintableReplacementMasterlistModal } from "@/components/reports/PrintableReplacementMasterlistModal";

function ReplacementsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const isPesoAdmin = isAdminUser(user);

  const urlProgramId = searchParams.get("programId");
  const urlOriginalPbId = searchParams.get("originalPbId");

  useEffect(() => {
    if (isFieldCoordinator(user)) {
      router.replace("/field");
    }
  }, [user, router]);

  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(urlProgramId || "");
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [existingReplacements, setExistingReplacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Wizard & Assessment Modal States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardTarget, setWizardTarget] = useState<StubReplacementTarget | null>(null);
  const [assessmentItem, setAssessmentItem] = useState<PendingReplacementAssessmentItem | null>(null);
  const [isPrintableMasterlistOpen, setIsPrintableMasterlistOpen] = useState(false);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [manualSelectedPbId, setManualSelectedPbId] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

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
        const progs = data.programs || [];
        setPrograms(progs);
        if (!selectedProgramId && progs.length > 0) {
          setSelectedProgramId(progs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBeneficiariesAndReplacements = async (programId: string) => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/v1/programs/${programId}/beneficiaries`),
        fetch(`/api/v1/replacements?programId=${programId}`),
      ]);

      if (bRes.ok) {
        const data = await bRes.json();
        setBeneficiaries(data.beneficiaries || []);
      }
      if (rRes.ok) {
        const data = await rRes.json();
        setExistingReplacements(data.replacements || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Flagged queue: All beneficiaries marked for replacement during stub distribution or field verification
  const flaggedQueue = beneficiaries.filter(
    (b) =>
      b.participationStatus !== "REPLACED" &&
      (b.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
        b.stubDistributions?.some((d: any) => d.status === "FLAGGED_REPLACEMENT"))
  );

  // Active unflagged beneficiaries (excluding already replaced and flagged)
  const activeBeneficiaries = beneficiaries.filter(
    (b) =>
      b.participationStatus !== "REPLACED" &&
      b.participationStatus !== "FLAGGED_FOR_REPLACEMENT" &&
      !b.stubDistributions?.some((d: any) => d.status === "FLAGGED_REPLACEMENT")
  );

  // Helper to open wizard for a specific beneficiary
  const handleLaunchWizard = (pb: any) => {
    setWizardTarget({
      programId: selectedProgramId,
      programBeneficiaryId: pb.id,
      designatedNumber: pb.designatedNumber,
      fullName: pb.beneficiary?.fullName || "BENEFICIARY",
      barangay: pb.beneficiary?.barangay || "Dingalan",
      sitio: pb.beneficiary?.sitio || "",
      tableNumber: pb.tableNumber || "Table 1",
    });
    setIsWizardOpen(true);
    setIsSelectModalOpen(false);
  };

  // Auto-trigger if URL contains originalPbId
  useEffect(() => {
    if (urlOriginalPbId && beneficiaries.length > 0) {
      const target = beneficiaries.find((b) => b.id === urlOriginalPbId);
      if (target) {
        handleLaunchWizard(target);
      }
    }
  }, [urlOriginalPbId, beneficiaries]);

  // Find candidate replacement record for a given original PB if already submitted
  const getPendingReplacementForPb = (pbId: string) => {
    return existingReplacements.find(
      (r) => r.originalProgramBeneficiaryId === pbId && r.status === "PENDING"
    );
  };

  // Convert a replacement record to PendingReplacementAssessmentItem
  const openAssessmentForReplacement = (rep: any) => {
    const origPb = rep.originalProgramBeneficiary;
    const candPb = rep.replacementProgramBeneficiary;
    const candBene = candPb?.beneficiary;
    const dep = candBene?.dependents?.[0];

    const assessmentPayload: PendingReplacementAssessmentItem = {
      id: rep.id,
      reason: rep.reason,
      initiatedAt: rep.initiatedAt,
      initiatedBy: rep.initiatedBy?.fullName,
      originalBeneficiary: {
        designatedNumber: origPb?.designatedNumber || "N/A",
        fullName: origPb?.beneficiary?.fullName || "Original Beneficiary",
        birthday: origPb?.beneficiary?.birthday,
        barangay: origPb?.beneficiary?.barangay,
        sitio: origPb?.beneficiary?.sitio,
      },
      candidateBeneficiary: candBene
        ? {
            fullName: candBene.fullName,
            birthday: candBene.birthday,
            sex: candBene.sex,
            barangay: candBene.barangay,
            sitio: candBene.sitio,
            contactNumber: candBene.contactNumber,
            idType: candBene.idType,
            idNumber: candBene.idNumber,
            dependentFullName: dep?.fullName,
            dependentRelationship: dep?.relationship,
            dependentBirthday: dep?.birthday,
            dependentAge: dep?.age,
            documents: (candBene.documents || []).map((d: any) => ({
              id: d.id,
              documentType: d.documentType,
              fileKey: d.fileKey,
              fileName: d.fileName,
            })),
          }
        : null,
    };

    setAssessmentItem(assessmentPayload);
  };

  const filteredHistory = existingReplacements.filter((r) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const origName = (r.originalProgramBeneficiary?.beneficiary?.fullName || "").toLowerCase();
    const repName = (r.replacementProgramBeneficiary?.beneficiary?.fullName || "").toLowerCase();
    const reason = (r.reason || "").toLowerCase();
    const num = String(r.originalProgramBeneficiary?.designatedNumber || "");
    return origName.includes(q) || repName.includes(q) || reason.includes(q) || num.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <UserPlus className="w-6 h-6 text-gov-blue" />
            <span>Onsite Beneficiary Replacement Hub</span>
          </h1>
          <p className="text-xs text-slate-500">
            Field replacement workflow with 365-day lockout guarantee, declared dependents, original beneficiary consent, and ID document verification.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={() => setIsPrintableMasterlistOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition"
            title="Open printable masterlist of flagged beneficiaries"
          >
            <Printer className="w-3.5 h-3.5 text-gov-goldLight" />
            <span>Print Masterlist</span>
          </button>

          <a
            href={`/api/v1/reports/export?type=FLAGGED_REPLACEMENTS&programId=${selectedProgramId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition"
            title="Download Excel Workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </a>

          <button
            onClick={() => setIsSelectModalOpen(true)}
            className="px-4 py-2 bg-gov-blue hover:bg-gov-dark text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition"
          >
            <UserPlus className="w-4 h-4 text-gov-goldLight" />
            <span>New Replacement Wizard</span>
          </button>
        </div>
      </div>

      {/* Program Selector Bar */}
      <div className="gov-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Active Program:</span>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-gov-blue w-full sm:w-96"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.programCode} — {p.programName}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => selectedProgramId && fetchBeneficiariesAndReplacements(selectedProgramId)}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 border rounded-lg bg-white flex items-center space-x-1.5 self-end sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: FLAGGED FOR REPLACEMENT CONFIRMATION QUEUE
          ========================================================================= */}
      <div className="gov-card overflow-hidden border-t-4 border-t-rose-600 shadow-md">
        <div className="p-4 bg-rose-50/70 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              {flaggedQueue.length}
            </div>
            <div>
              <h3 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Flagged for Replacement Queue ({flaggedQueue.length})</span>
              </h3>
              <p className="text-[11px] text-rose-700">
                Beneficiaries flagged during stub distribution or field verification awaiting substitute entry or Admin/PESO assessment
              </p>
            </div>
          </div>
        </div>

        {flaggedQueue.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700">No Pending Flagged Beneficiaries</p>
            <p className="text-[11px] text-slate-400">
              All enrolled beneficiaries are confirmed distributed or already approved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-3.5 py-2.5">Slot #</th>
                  <th className="px-3.5 py-2.5">Flagged Beneficiary</th>
                  <th className="px-3.5 py-2.5">Barangay / Sitio</th>
                  <th className="px-3.5 py-2.5">Candidate / Field Remarks</th>
                  <th className="px-3.5 py-2.5 text-center">Status</th>
                  <th className="px-3.5 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {flaggedQueue.map((b) => {
                  const pendingRep = getPendingReplacementForPb(b.id);
                  const candBene = pendingRep?.replacementProgramBeneficiary?.beneficiary;
                  const dep = candBene?.dependents?.[0];
                  const docs = candBene?.documents || [];
                  const flaggedDist = b.stubDistributions?.find(
                    (d: any) => d.status === "FLAGGED_REPLACEMENT"
                  );

                  return (
                    <tr key={b.id} className="hover:bg-rose-50/40 transition">
                      <td className="px-3.5 py-3 font-mono font-black text-rose-800">
                        #{b.designatedNumber}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {b.tableNumber}
                        </span>
                      </td>

                      <td className="px-3.5 py-3">
                        <span className="font-bold text-slate-900 block">
                          {b.beneficiary?.fullName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Born: {b.beneficiary?.birthday || "N/A"}
                        </span>
                      </td>

                      <td className="px-3.5 py-3">
                        <span className="font-semibold text-slate-700 block">
                          {b.beneficiary?.barangay}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {b.beneficiary?.sitio || "—"}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 max-w-sm">
                        {pendingRep && candBene ? (
                          <div className="space-y-1">
                            <div className="text-[11px] font-bold text-slate-900">
                              Candidate:{" "}
                              <strong className="text-emerald-800">{candBene.fullName}</strong>
                            </div>
                            {dep && (
                              <div className="text-[10px] text-slate-600">
                                Dep: {dep.fullName} ({dep.relationship})
                              </div>
                            )}
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="px-2 py-0.5 bg-blue-100 text-gov-blue text-[9.5px] font-black rounded border border-blue-200">
                                📷 {docs.length || 4} IDs Attached
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium text-rose-900 bg-rose-50 p-1.5 rounded border border-rose-200">
                            {flaggedDist?.remarks || "Flagged for onsite replacement"}
                          </div>
                        )}
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        {pendingRep ? (
                          <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full border border-amber-300">
                            ⏳ Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-rose-100 text-rose-900 text-[10px] font-bold rounded-full border border-rose-300">
                            🚩 Awaiting Substitute
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        {pendingRep ? (
                          <button
                            onClick={() => openAssessmentForReplacement(pendingRep)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gov-blue hover:bg-gov-dark text-white font-bold text-xs rounded-lg shadow-sm transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-gov-goldLight" />
                            <span>Assess &amp; View IDs</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLaunchWizard(b)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>Enter Substitute &amp; Upload IDs</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: RECORDED REPLACEMENTS HISTORY & AUDIT MASTERLIST
          ========================================================================= */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recorded Replacements &amp; Substitutions ({existingReplacements.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-gov-blue"
            />
          </div>
        </div>

        {existingReplacements.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No replacements recorded yet for this program.
          </div>
        ) : (
          <TableScrollWrapper>
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                <tr>
                  <th className="px-3.5 py-3"># Slot</th>
                  <th className="px-3.5 py-3">Original Beneficiary</th>
                  <th className="px-3.5 py-3">Replacement Beneficiary</th>
                  <th className="px-3.5 py-3">Declared Dependent</th>
                  <th className="px-3.5 py-3">Official Reason</th>
                  <th className="px-3.5 py-3 text-center">Status</th>
                  <th className="px-3.5 py-3 text-center">Uploaded IDs &amp; Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((r) => {
                  const origBene = r.originalProgramBeneficiary?.beneficiary;
                  const candBene = r.replacementProgramBeneficiary?.beneficiary;
                  const dep = candBene?.dependents?.[0];
                  const docs = candBene?.documents || [];
                  const isApproved = r.status === "APPROVED";
                  const isOrigAsDep =
                    Boolean(origBene?.fullName) &&
                    Boolean(dep?.fullName) &&
                    dep!.fullName.trim().toUpperCase() === origBene!.fullName.trim().toUpperCase();

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-3.5 py-3 font-mono font-bold text-gov-blue">
                        #{r.originalProgramBeneficiary?.designatedNumber}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {r.originalProgramBeneficiary?.tableNumber}
                        </span>
                      </td>

                      <td className="px-3.5 py-3">
                        <span
                          className={`font-bold block ${
                            isApproved ? "text-slate-500 line-through" : "text-slate-900"
                          }`}
                        >
                          {origBene?.fullName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {origBene?.barangay} {origBene?.sitio ? `(${origBene.sitio})` : ""}
                        </span>
                      </td>

                      <td className="px-3.5 py-3">
                        <span className="font-bold text-emerald-800 block">
                          {candBene?.fullName || "Pending Candidate"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {candBene?.barangay} • Born: {candBene?.birthday || "N/A"}
                        </span>
                      </td>

                      <td className="px-3.5 py-3">
                        {dep ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">{dep.fullName}</span>
                            <span className="text-[10px] text-slate-500">
                              {dep.relationship} {dep.age ? `(${dep.age} y/o)` : ""}
                            </span>
                            {isOrigAsDep && (
                              <span className="inline-block mt-0.5 px-1 py-0.2 bg-purple-100 text-purple-900 text-[9px] font-black rounded border border-purple-200">
                                ★ Original Beneficiary as Dependent
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3.5 py-3 max-w-xs text-slate-600 text-[11px]">
                        <div>{r.reason}</div>
                        {isApproved && (
                          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                            Remarks: Replaced - {origBene?.fullName}
                          </div>
                        )}
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-3.5 py-3 text-center">
                        <button
                          onClick={() => openAssessmentForReplacement(r)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-gov-blue text-[11px] font-bold rounded-lg border border-blue-200 transition inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{docs.length > 0 ? `${docs.length} IDs Attached` : "View Details"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScrollWrapper>
        )}
      </div>

      {/* Manual Beneficiary Selection Modal */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-gov-blue" />
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  Select Beneficiary to Replace
                </h3>
              </div>
              <button
                onClick={() => setIsSelectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Choose an enrolled beneficiary to flag for replacement. The 3-step wizard will capture the replacement applicant, declared dependent, consent PIN, and Front/Back IDs.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Beneficiary Slot *
              </label>
              <select
                value={manualSelectedPbId}
                onChange={(e) => setManualSelectedPbId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:border-gov-blue"
              >
                <option value="">-- Select Beneficiary Slot --</option>
                {flaggedQueue.length > 0 && (
                  <optgroup label="🚩 Flagged for Replacement (Field Queue)">
                    {flaggedQueue.map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.designatedNumber} — {b.beneficiary?.fullName} ({b.beneficiary?.barangay}) [FLAGGED]
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Active Beneficiaries">
                  {activeBeneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.designatedNumber} — {b.beneficiary?.fullName} ({b.beneficiary?.barangay})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 border rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!manualSelectedPbId}
                onClick={() => {
                  const target = beneficiaries.find((b) => b.id === manualSelectedPbId);
                  if (target) handleLaunchWizard(target);
                }}
                className="px-5 py-2 bg-gov-blue text-white font-bold text-xs rounded-lg shadow disabled:opacity-50 flex items-center space-x-1"
              >
                <span>Launch Replacement Wizard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Step Stub Replacement Wizard Modal (Applicant, Dependent, Consent, 4 IDs) */}
      <StubReplacementWizardModal
        isOpen={isWizardOpen}
        target={wizardTarget}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardTarget(null);
        }}
        onSuccess={(resultData, summaryMessage) => {
          setIsWizardOpen(false);
          setWizardTarget(null);
          setSuccessMessage(summaryMessage || "Replacement successfully submitted and details saved!");
          if (selectedProgramId) {
            fetchBeneficiariesAndReplacements(selectedProgramId);
          }
        }}
      />

      {/* Replacement Assessment & ID Inspection Modal (Zoom lightbox + Admin approval) */}
      <ReplacementApprovalModal
        isOpen={Boolean(assessmentItem)}
        item={assessmentItem}
        onClose={() => setAssessmentItem(null)}
        onProcessed={(status, message) => {
          setAssessmentItem(null);
          setSuccessMessage(message);
          if (selectedProgramId) {
            fetchBeneficiariesAndReplacements(selectedProgramId);
          }
        }}
      />

      {/* Printable Masterlist of Flagged Beneficiaries Modal */}
      <PrintableReplacementMasterlistModal
        isOpen={isPrintableMasterlistOpen}
        programId={selectedProgramId}
        onClose={() => setIsPrintableMasterlistOpen(false)}
        onOpenApprovalModal={(item) => {
          setAssessmentItem({
            id: item.id,
            reason: item.reason,
            initiatedAt: item.initiatedAt,
            initiatedBy: item.initiatedBy,
            originalBeneficiary: item.originalBeneficiary,
            candidateBeneficiary: item.candidateBeneficiary,
          });
        }}
      />
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
