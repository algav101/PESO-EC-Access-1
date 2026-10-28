"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ShieldAlert,
  FileCheck,
  Send,
  Search,
  PhoneCall,
  Globe,
  Anchor,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Sparkles,
  Upload,
  FileText,
  UserCheck,
  Building2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, hasPermission } from "@/lib/permissions";

const DINGALAN_BARANGAYS = [
  "Aplaya",
  "Butas na Bato",
  "Caragsacan",
  "Davildavilan",
  "Dikapanikian",
  "Ibona",
  "Matawe",
  "Paltic",
  "Poblacion",
  "Tanawan",
  "Umiray",
];

const CASE_CATEGORIES = [
  {
    value: "CONTRACT_VIOLATION_UNPAID_WAGES",
    label: "Contract Violation / Unpaid or Delayed Salary (Hindi Nababayarang Sahod)",
    agency: "DMW Legal Assistance / MWO / NLRC",
  },
  {
    value: "MALTREATMENT_ABUSE",
    label: "Distressed OFW: Maltreatment, Abuse, or Harassment (Pang-aabuso o Karahasan)",
    agency: "OWWA Repatriation & Welfare / DMW AKSYON Fund",
  },
  {
    value: "EMERGENCY_REPATRIATION",
    label: "Emergency Evacuation & Repatriation / Assist-WELL Request (Agarang Pagpapauwi)",
    agency: "OWWA Repatriation & Assist-WELL / DMW",
  },
  {
    value: "SEA_BASED_MARITIME_DISPUTE",
    label: "Seafarer Abandonment, Ship Arrest, Piracy, or Manning Dispute (Kaso ng Marino)",
    agency: "DMW Maritime Welfare / OWWA / MARINA",
  },
  {
    value: "MEDICAL_EMERGENCY_DISABILITY",
    label: "Medical Emergency, Hospitalization, Illness, or Disability Claim (Tulong Medikal)",
    agency: "OWWA MEDplus / WAP / DMW AKSYON Fund",
  },
  {
    value: "LEGAL_DETENTION_ASSISTANCE",
    label: "Legal Assistance / Detention Abroad (Tulong Legal / Nakakulong sa Ibang Bansa)",
    agency: "DMW AKSYON Fund / DFA Embassy",
  },
  {
    value: "DEATH_REMAINS_REPATRIATION",
    label: "Death Abroad / Repatriation of Remains & Bereavement Claim (Pagpapauwi ng Labi)",
    agency: "OWWA Death & Burial Benefit / DMW",
  },
  {
    value: "WELFARE_FINANCIAL_RELIEF",
    label: "OWWA Welfare Assistance Program (WAP) / Calamity / Financial Relief",
    agency: "OWWA Regional Welfare Office III",
  },
];

interface RequirementItem {
  id: string;
  title: string;
  description: string;
  authority: "OWWA & DMW" | "DMW Maritime" | "OWWA Welfare" | "DMW Legal";
  mandatoryFor: "ALL" | "SEA_BASED" | "CASE_SPECIFIC";
}

const OWWA_DMW_REQUIREMENTS: RequirementItem[] = [
  {
    id: "PASSPORT_BIO_PAGE",
    title: "Valid Passport Bio Page (Pages 2–3) or Travel Document",
    description: "Clear copy of OFW/Seafarer's Philippine Passport showing bio data and latest immigration stamps.",
    authority: "OWWA & DMW",
    mandatoryFor: "ALL",
  },
  {
    id: "SEAMANS_BOOK_SIRB",
    title: "Seafarer's Identification and Record Book (SIRB / Seaman's Book)",
    description: "Required for Sea-Based workers / Mariners showing vessel embarkation and disembarkation pages.",
    authority: "DMW Maritime",
    mandatoryFor: "SEA_BASED",
  },
  {
    id: "EMPLOYMENT_CONTRACT_OEC",
    title: "DMW/POEA-Approved Standard Employment Contract (SEC), OEC, or CBA",
    description: "Copy of Employment Contract, Overseas Employment Certificate (OEC), or Seafarer Collective Bargaining Agreement.",
    authority: "OWWA & DMW",
    mandatoryFor: "ALL",
  },
  {
    id: "OWWA_MEMBERSHIP_PROOF",
    title: "Proof of OWWA Membership (Official Receipt, OWWA e-Card, or Verification)",
    description: "OWWA Official Receipt or Membership Record (Note: Emergency repatriation & AKSYON legal aid cover even non-active/undocumented OFWs).",
    authority: "OWWA Welfare",
    mandatoryFor: "ALL",
  },
  {
    id: "GOVT_ID_AND_RELATIONSHIP",
    title: "Valid Government ID of Claimant / Next-of-Kin & PSA Proof of Relationship",
    description: "Valid ID of the OFW or reporting family member in Dingalan (plus PSA Birth/Marriage Certificate if filed by family).",
    authority: "OWWA & DMW",
    mandatoryFor: "ALL",
  },
  {
    id: "CASE_SPECIFIC_EVIDENCE",
    title: "Case-Specific Supporting Evidence (Payslips, Medical Abstract, Distress GPS, or Death Cert)",
    description: "Salary disputes: Payslips/Allotment logs; Medical: Hospital Abstract/Master's Report; Repatriation: Exact address/GPS & Salaysay; Death: Mortuary/Death Certificate.",
    authority: "DMW Legal",
    mandatoryFor: "CASE_SPECIFIC",
  },
];

export default function OfwSeafarerCaseAssistancePage() {
  const { user } = useAuth();
  const isStaff = Boolean(
    user && (isAdminUser(user) || hasPermission(user.role, "migrants.read") || hasPermission(user.role, "migrants.manage"))
  );

  const [activeTab, setActiveTab] = useState<"file" | "messenger" | "staff">("file");

  // Form State
  const [workerCategory, setWorkerCategory] = useState<"LAND_BASED" | "SEA_BASED">("LAND_BASED");
  const [caseCategory, setCaseCategory] = useState("CONTRACT_VIOLATION_UNPAID_WAGES");
  const [urgencyLevel, setUrgencyLevel] = useState("HIGH");

  const [ofwLastName, setOfwLastName] = useState("");
  const [ofwFirstName, setOfwFirstName] = useState("");
  const [ofwMiddleName, setOfwMiddleName] = useState("");
  const [ofwSuffix, setOfwSuffix] = useState("");
  const [ofwBirthday, setOfwBirthday] = useState("");
  const [ofwSex, setOfwSex] = useState("FEMALE");
  const [ofwCivilStatus, setOfwCivilStatus] = useState("MARRIED");
  const [ofwContactAbroad, setOfwContactAbroad] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [sirbNumber, setSirbNumber] = useState("");
  const [owwaStatus, setOwwaStatus] = useState("ACTIVE");

  const [countryOrVessel, setCountryOrVessel] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [foreignEmployer, setForeignEmployer] = useState("");
  const [localAgency, setLocalAgency] = useState("");

  const [isFiledByFamily, setIsFiledByFamily] = useState(true);
  const [reporterName, setReporterName] = useState("");
  const [reporterRelationship, setReporterRelationship] = useState("SPOUSE");
  const [reporterBarangay, setReporterBarangay] = useState("Paltic");
  const [reporterContact, setReporterContact] = useState("");

  const [caseSummary, setCaseSummary] = useState("");

  // Requirements Checklist & Attached File Names
  const [checkedReqs, setCheckedReqs] = useState<Record<string, boolean>>({
    PASSPORT_BIO_PAGE: true,
    EMPLOYMENT_CONTRACT_OEC: true,
    OWWA_MEMBERSHIP_PROOF: true,
    GOVT_ID_AND_RELATIONSHIP: true,
    CASE_SPECIFIC_EVIDENCE: true,
  });
  const [attachedFileNames, setAttachedFileNames] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedCase, setSubmittedCase] = useState<any | null>(null);

  // Case Messenger / Tracking State
  const [trackingInput, setTrackingInput] = useState("");
  const [activeCase, setActiveCase] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Staff Console State
  const [staffCases, setStaffCases] = useState<any[]>([]);
  const [staffStats, setStaffStats] = useState<any | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState("ALL");
  const [staffWorkerFilter, setStaffWorkerFilter] = useState("ALL");
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (isStaff && activeTab === "staff") {
      fetchStaffCases();
    }
  }, [isStaff, activeTab, staffSearch, staffStatusFilter, staffWorkerFilter]);

  const fetchStaffCases = async () => {
    setStaffLoading(true);
    try {
      const q = new URLSearchParams({
        search: staffSearch,
        status: staffStatusFilter,
        workerCategory: staffWorkerFilter,
      }).toString();
      const res = await fetch(`/api/v1/migrants/cases?${q}`);
      if (res.ok) {
        const data = await res.json();
        setStaffCases(data.cases || []);
        setStaffStats(data.stats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStaffLoading(false);
    }
  };

  const loadPreset = (type: "LAND_DISTRESSED" | "SEAFARER_DISPUTE") => {
    setError(null);
    if (type === "LAND_DISTRESSED") {
      setWorkerCategory("LAND_BASED");
      setCaseCategory("EMERGENCY_REPATRIATION");
      setUrgencyLevel("CRITICAL_SOS");
      setOfwLastName("RAMOS");
      setOfwFirstName("LORENA");
      setOfwMiddleName("GARCIA");
      setOfwSuffix("");
      setOfwBirthday("1991-04-12");
      setOfwSex("FEMALE");
      setOfwCivilStatus("MARRIED");
      setOfwContactAbroad("+966 55 987 6543 (WhatsApp / IMO)");
      setPassportNumber("P8492011B");
      setSirbNumber("");
      setOwwaStatus("ACTIVE");
      setCountryOrVessel("RIYADH, KINGDOM OF SAUDI ARABIA");
      setJobPosition("HOUSEHOLD SERVICE WORKER (DOMESTIC HELPER)");
      setForeignEmployer("AL-FARIS HOUSEHOLD");
      setLocalAgency("GLOBAL STAR OVERSEAS PLACEMENT CORP.");
      setIsFiledByFamily(true);
      setReporterName("DANILO M. RAMOS");
      setReporterRelationship("SPOUSE");
      setReporterBarangay("Aplaya");
      setReporterContact("0918-444-7722");
      setCaseSummary(
        "Tatlong buwan nang hindi pinapasweldo at kinumpiska ang pasaporte ng kanyang amo sa Riyadh. Humihingi ng agarang tulong sa PESO Dingalan, OWWA RWO-III, at DMW MWO-Riyadh para sa emergency repatriation at unpaid salary claim."
      );
      setCheckedReqs({
        PASSPORT_BIO_PAGE: true,
        EMPLOYMENT_CONTRACT_OEC: true,
        OWWA_MEMBERSHIP_PROOF: true,
        GOVT_ID_AND_RELATIONSHIP: true,
        CASE_SPECIFIC_EVIDENCE: true,
      });
    } else {
      setWorkerCategory("SEA_BASED");
      setCaseCategory("SEA_BASED_MARITIME_DISPUTE");
      setUrgencyLevel("HIGH");
      setOfwLastName("MENDOZA");
      setOfwFirstName("CARLO");
      setOfwMiddleName("VILLANUEVA");
      setOfwSuffix("JR.");
      setOfwBirthday("1986-11-08");
      setOfwSex("MALE");
      setOfwCivilStatus("MARRIED");
      setOfwContactAbroad("+63 917 882 3311 / Viber Maritime");
      setPassportNumber("P5123988C");
      setSirbNumber("SIRB-2023-0098412");
      setOwwaStatus("ACTIVE");
      setCountryOrVessel("M/V PACIFIC HORIZON (PANAMA FLAG) - PORT OF SINGAPORE");
      setJobPosition("ABLE SEAMAN (AB) / DECK RATING");
      setForeignEmployer("OCEANIC SHIPPING LINES LTD.");
      setLocalAgency("MANILA MARITIME MANNING SERVICES INC.");
      setIsFiledByFamily(false);
      setReporterName("MENDOZA, CARLO VILLANUEVA JR.");
      setReporterRelationship("SELF");
      setReporterBarangay("Paltic");
      setReporterContact("0917-882-3311");
      setCaseSummary(
        "Nagkaroon ng injury habang nasa barko (M/V Pacific Horizon) at hindi pa naibibigay ang 2 buwang allotment at medical disability benefits ayon sa POEA-SEC / CBA. Nais makipag-ugnayan sa DMW Maritime Welfare at OWWA."
      );
      setCheckedReqs({
        PASSPORT_BIO_PAGE: true,
        SEAMANS_BOOK_SIRB: true,
        EMPLOYMENT_CONTRACT_OEC: true,
        OWWA_MEMBERSHIP_PROOF: true,
        GOVT_ID_AND_RELATIONSHIP: true,
        CASE_SPECIFIC_EVIDENCE: true,
      });
    }
  };

  const handleFileAttach = (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFileNames((prev) => ({
      ...prev,
      [reqId]: `${file.name} (${Math.round(file.size / 1024)} KB)`,
    }));
    setCheckedReqs((prev) => ({
      ...prev,
      [reqId]: true,
    }));
  };

  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const submittedRequirements = OWWA_DMW_REQUIREMENTS.map((r) => ({
        id: r.id,
        title: r.title,
        checked: Boolean(checkedReqs[r.id]),
        fileName: attachedFileNames[r.id] || null,
      }));

      const res = await fetch("/api/v1/migrants/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerCategory,
          caseCategory,
          urgencyLevel,
          ofwLastName,
          ofwFirstName,
          ofwMiddleName,
          ofwSuffix,
          ofwBirthday,
          ofwSex,
          ofwCivilStatus,
          ofwContactAbroad,
          passportNumber,
          sirbNumber: workerCategory === "SEA_BASED" ? sirbNumber : null,
          owwaStatus,
          countryOrVessel,
          jobPosition,
          foreignEmployer,
          localAgency,
          isFiledByFamily,
          reporterName: isFiledByFamily ? reporterName : `${ofwLastName}, ${ofwFirstName}`,
          reporterRelationship: isFiledByFamily ? reporterRelationship : "SELF",
          reporterBarangay,
          reporterContact,
          caseSummary,
          submittedRequirements,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nabigong isumite ang Case Report.");
      } else {
        setSubmittedCase(data.caseReport);
        setActiveCase(data.caseReport);
        setTrackingInput(data.trackingCode);
      }
    } catch (err) {
      setError("Network error habang nagsusumite ng Case Report.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupCase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingInput.trim()) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(
        `/api/v1/migrants/cases?trackingCode=${encodeURIComponent(trackingInput.trim().toUpperCase())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Case Tracking Code not found.");
        setActiveCase(null);
      } else {
        setActiveCase(data.caseReport);
      }
    } catch (err) {
      setLookupError("Failed to look up case report.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch("/api/v1/migrants/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeCase.id,
          trackingCode: activeCase.trackingCode,
          message: newMessage.trim(),
          senderType: isStaff ? "PESO_STAFF" : "REPORTER",
          senderName: isStaff ? user?.fullName || "PESO Migrant Desk" : activeCase.reporterName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.caseReport) {
        setActiveCase(data.caseReport);
        setNewMessage("");
        if (isStaff && activeTab === "staff") {
          fetchStaffCases();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleStaffStatusUpdate = async (caseId: string, updates: any) => {
    try {
      const res = await fetch("/api/v1/migrants/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: caseId, ...updates }),
      });
      const data = await res.json();
      if (res.ok) {
        if (activeCase?.id === caseId) {
          setActiveCase(data.caseReport);
        }
        fetchStaffCases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-rose-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/migrants"
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-amber-300 px-3 py-1 rounded-full border border-white/15 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Migrants&apos; Corner Hub</span>
              </Link>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] font-extrabold uppercase tracking-wider">
                OWWA Hotline 1348 • DMW AKSYON Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              OFW &amp; Seafarer Case Assistance &amp; Welfare Messenger
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Opisyal na sumbungan, legal/welfare intake, at two-way case messaging system para sa mga Dingaleño <strong>Land-Based OFWs</strong> at <strong>Sea-Based Seafarers (Marino)</strong> alinsunod sa mga dokumentaryong kinakailangan ng <strong>OWWA</strong> at <strong>Department of Migrant Workers (DMW)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                activeTab === "file"
                  ? "bg-rose-600 text-white shadow-lg"
                  : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Mag-ulat ng Kaso (File Case)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("messenger")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                activeTab === "messenger"
                  ? "bg-amber-400 text-slate-950 shadow-lg"
                  : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Case Messenger &amp; Status</span>
            </button>
            {isStaff && (
              <button
                type="button"
                onClick={() => setActiveTab("staff")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                  activeTab === "staff"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Staff Case Console ({staffStats?.total ?? "..."})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: FILE AN OFW / SEAFARER CASE REPORT + OWWA/DMW REQUIREMENTS
          ===================================================================== */}
      {activeTab === "file" && (
        <div className="space-y-6">
          {submittedCase && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                      Naitala na ang Inyong Case Report sa PESO Migrant Desk!
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      Case Tracking Code:{" "}
                      <span className="font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {submittedCase.trackingCode}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      OFW/Seafarer: <strong>{submittedCase.ofwFullName}</strong> ({submittedCase.countryOrVessel})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("messenger")}
                  className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Buksan ang Case Messaging Thread</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitCase} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
            {/* Quick Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  OWWA &amp; DMW Case Intake &amp; Assistance Request Form
                </h2>
                <p className="text-xs text-slate-500">
                  Punan ang detalye ng OFW o Seafarer at i-check ang mga nakahandang dokumento para sa mabilis na aksyon.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadPreset("LAND_DISTRESSED")}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                >
                  <Plane className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sample: Distressed Land-Based OFW</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset("SEAFARER_DISPUTE")}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                >
                  <Anchor className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sample: Seafarer Maritime Case</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Worker Category, Case Type & Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
                  1. Kategorya ng Manggagawa (Worker Category) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkerCategory("LAND_BASED")}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                      workerCategory === "LAND_BASED"
                        ? "bg-blue-900 text-white border-blue-900 shadow"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    <Plane className="w-4 h-4" />
                    <span>Land-Based OFW</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkerCategory("SEA_BASED")}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition ${
                      workerCategory === "SEA_BASED"
                        ? "bg-cyan-900 text-white border-cyan-900 shadow"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    <Anchor className="w-4 h-4" />
                    <span>Sea-Based (Seafarer)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
                  2. Uri ng Kaso / Tulong na Kailangan (Case Category) *
                </label>
                <select
                  value={caseCategory}
                  onChange={(e) => setCaseCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                >
                  {CASE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
                  3. Antas ng Pangangailangan (Urgency Level) *
                </label>
                <select
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                >
                  <option value="NORMAL">NORMAL — Welfare / Financial / Document Inquiry</option>
                  <option value="HIGH">HIGH — Unpaid Salary / Contract Breach / Medical Claim</option>
                  <option value="CRITICAL_SOS">
                    🚨 CRITICAL SOS — Distressed / Maltreated / Emergency Repatriation
                  </option>
                </select>
              </div>
            </div>

            {/* 2. OFW / Seafarer Profile & Deployment Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 border-b border-slate-200 pb-2">
                I. Impormasyon ng OFW o Seafarer (Worker &amp; Deployment Profile)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Apelyido (Last Name) *</label>
                  <input
                    type="text"
                    required
                    value={ofwLastName}
                    onChange={(e) => setOfwLastName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pangalan (First Name) *</label>
                  <input
                    type="text"
                    required
                    value={ofwFirstName}
                    onChange={(e) => setOfwFirstName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Gitnang Pangalan</label>
                  <input
                    type="text"
                    value={ofwMiddleName}
                    onChange={(e) => setOfwMiddleName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Suffix (Jr./III)</label>
                  <input
                    type="text"
                    value={ofwSuffix}
                    onChange={(e) => setOfwSuffix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Petsa ng Kapanganakan</label>
                  <input
                    type="date"
                    value={ofwBirthday}
                    onChange={(e) => setOfwBirthday(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Passport Number</label>
                  <input
                    type="text"
                    placeholder="e.g. P8492011B"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                {workerCategory === "SEA_BASED" && (
                  <div>
                    <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                      Seaman&apos;s Book / SIRB No. *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="SIRB Number"
                      value={sirbNumber}
                      onChange={(e) => setSirbNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-bold border border-cyan-400 bg-cyan-50/40 rounded-lg uppercase"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">OWWA Membership Status</label>
                  <select
                    value={owwaStatus}
                    onChange={(e) => setOwwaStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  >
                    <option value="ACTIVE">ACTIVE OWWA MEMBER</option>
                    <option value="INACTIVE">INACTIVE / EXPIRED OWWA</option>
                    <option value="UNDOCUMENTED">UNDOCUMENTED / NON-MEMBER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {workerCategory === "SEA_BASED"
                      ? "Pangalan ng Barko, Flag & Port (Vessel Name) *"
                      : "Bansa at Lungsod na Pinagtatrabahuhan (Country) *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      workerCategory === "SEA_BASED"
                        ? "Hal. M/V PACIFIC HORIZON (Panama Flag)"
                        : "Hal. RIYADH, SAUDI ARABIA"
                    }
                    value={countryOrVessel}
                    onChange={(e) => setCountryOrVessel(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Trabaho / Posisyon (Job Position) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Hal. Domestic Helper / Able Seaman / Nurse"
                    value={jobPosition}
                    onChange={(e) => setJobPosition(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contact ng OFW Abroad (WhatsApp / IMO / Messenger) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Phone o FB Messenger Link"
                    value={ofwContactAbroad}
                    onChange={(e) => setOfwContactAbroad(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Foreign Employer / Principal / Shipowner
                  </label>
                  <input
                    type="text"
                    placeholder="Pangalan ng Employer o Kumpanya sa Ibang Bansa"
                    value={foreignEmployer}
                    onChange={(e) => setForeignEmployer(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Local Philippine Recruitment / Manning Agency (DMW Licensed)
                  </label>
                  <input
                    type="text"
                    placeholder="Pangalan ng Agency sa Pilipinas"
                    value={localAgency}
                    onChange={(e) => setLocalAgency(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
              </div>
            </div>

            {/* 3. Reporter / Next-of-Kin in Dingalan */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  II. Impormasyon ng Nag-uulat / Pamilya sa Dingalan (Reporter / Next-of-Kin)
                </h3>
                <label className="inline-flex items-center space-x-2 text-xs font-bold text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFiledByFamily}
                    onChange={(e) => setIsFiledByFamily(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Iniuulat ng Kapamilya / Kamag-anak sa Dingalan</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {isFiledByFamily && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Pangalan ng Nag-uulat na Kapamilya *
                      </label>
                      <input
                        type="text"
                        required
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Relasyon sa OFW / Seafarer *
                      </label>
                      <select
                        value={reporterRelationship}
                        onChange={(e) => setReporterRelationship(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="SPOUSE">ASAWA (SPOUSE)</option>
                        <option value="PARENT">MAGULANG (PARENT)</option>
                        <option value="CHILD">ANAK (CHILD)</option>
                        <option value="SIBLING">KAPATID (SIBLING)</option>
                        <option value="RELATIVE">KAMAG-ANAK / KINATAWAN</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Barangay sa Dingalan *
                  </label>
                  <select
                    value={reporterBarangay}
                    onChange={(e) => setReporterBarangay(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                  >
                    {DINGALAN_BARANGAYS.map((b) => (
                      <option key={b} value={b}>
                        Barangay {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contact Number sa Pilipinas *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0917-XXX-XXXX"
                    value={reporterContact}
                    onChange={(e) => setReporterContact(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  Salaysay ng Kaso / Detalyadong Ulat (Detailed Case Narrative &amp; Exact Location Abroad) *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Isalaysay ang buong pangyayari, kailan nagsimula ang problema, eksaktong lokasyon o pangalan ng barko/amo, at anong tulong ang kinakailangan mula sa PESO Dingalan, OWWA, at DMW..."
                  value={caseSummary}
                  onChange={(e) => setCaseSummary(e.target.value)}
                  className="w-full p-3 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Official OWWA & DMW Documentary Requirements Checklist */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-950">
                    III. Opisyal na Dokumentaryong Kinakailangan ng OWWA at DMW (Documentary Requirements)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lagyan ng check ang mga dokumentong mayroon kayo at i-attach ang digital photo/PDF copy kung handa na.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  OWWA / DMW Standard Intake Checklist
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {OWWA_DMW_REQUIREMENTS.filter(
                  (r) => r.mandatoryFor !== "SEA_BASED" || workerCategory === "SEA_BASED"
                ).map((req) => (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      checkedReqs[req.id]
                        ? "bg-emerald-50/50 border-emerald-300"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={Boolean(checkedReqs[req.id])}
                        onChange={(e) =>
                          setCheckedReqs((prev) => ({ ...prev, [req.id]: e.target.checked }))
                        }
                        className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">{req.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                            {req.authority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{req.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pl-7 pt-1 border-t border-slate-200/70">
                      <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[200px]">
                        {attachedFileNames[req.id] ? (
                          <span className="text-emerald-700 font-bold">
                            📎 {attachedFileNames[req.id]}
                          </span>
                        ) : (
                          "Walang naka-attach na file (Maaaring isunod)"
                        )}
                      </span>
                      <label className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center space-x-1 shrink-0">
                        <Upload className="w-3 h-3" />
                        <span>Attach Copy</span>
                        <input
                          type="file"
                          onChange={(e) => handleFileAttach(req.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center space-x-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting
                    ? "Isinusumite ang Case Report..."
                    : "Isumite ang Case Report sa PESO & OWWA/DMW Desk"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 2: CASE TRACKING & TWO-WAY MESSAGING THREAD
          ===================================================================== */}
      {activeTab === "messenger" && (
        <div className="space-y-6">
          <form
            onSubmit={handleLookupCase}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center"
          >
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Ilagay ang Case Tracking Code (hal. CASE-2026-XXXXXX)
              </label>
              <input
                type="text"
                placeholder="CASE-2026-XXXXXX"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full sm:w-auto sm:mt-4 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1.5"
            >
              <Search className="w-4 h-4" />
              <span>{lookupLoading ? "Hinahanap..." : "Buksan ang Kaso"}</span>
            </button>
          </form>

          {lookupError && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800">
              {lookupError}
            </div>
          )}

          {activeCase && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Case Metadata & Submitted OWWA/DMW Requirements */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {activeCase.trackingCode}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {activeCase.ofwFullName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activeCase.workerCategory === "SEA_BASED" ? "⚓ Sea-Based Seafarer" : "✈️ Land-Based OFW"} •{" "}
                      {activeCase.countryOrVessel}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      activeCase.status === "RESOLVED"
                        ? "bg-emerald-100 text-emerald-900"
                        : activeCase.status === "ENDORSED_TO_DMW_OWWA"
                        ? "bg-blue-100 text-blue-900"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {activeCase.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-500">Uri ng Kaso:</span>{" "}
                    <span className="font-black text-slate-900">
                      {activeCase.caseCategory.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">OWWA Membership:</span>{" "}
                    <span className="font-bold text-slate-800">{activeCase.owwaStatus}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Passport / SIRB:</span>{" "}
                    <span className="font-mono font-bold text-slate-800">
                      {activeCase.passportNumber || "N/A"}
                      {activeCase.sirbNumber ? ` / ${activeCase.sirbNumber}` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Endorsed Agency:</span>{" "}
                    <span className="font-bold text-emerald-800">
                      {activeCase.endorsedAgency || "PESO Dingalan Migrant Desk (Initial Intake)"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                    <span className="block font-black text-slate-900 mb-1">Salaysay Summary:</span>
                    {activeCase.caseSummary}
                  </div>
                </div>
              </div>

              {/* Right: Two-Way Case Messaging Thread */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black">
                      Two-Way Case Assistance Thread ({activeCase.trackingCode})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Direct Link with PESO Migrant Desk
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 max-h-[420px] overflow-y-auto bg-slate-50">
                  {(activeCase.messages || []).map((msg: any) => {
                    const isDesk = msg.senderType !== "REPORTER";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isDesk ? "items-start" : "items-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs space-y-1 shadow-xs ${
                            isDesk
                              ? "bg-white border border-blue-200 text-slate-800"
                              : "bg-blue-900 text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] font-black opacity-80">
                            <span>{msg.senderName}</span>
                            <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Magpadala ng follow-up message o update sa kaso..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !newMessage.trim()}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Ipadala</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: STAFF CASE CONSOLE & DMW/OWWA ENDORSEMENT
          ===================================================================== */}
      {isStaff && activeTab === "staff" && (
        <div className="space-y-6">
          {staffStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500">Total Cases</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{staffStats.total}</p>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-700">Critical SOS</span>
                <p className="text-2xl font-black text-rose-900 mt-1">{staffStats.criticalSos}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800">Open / Intake</span>
                <p className="text-2xl font-black text-amber-900 mt-1">{staffStats.open}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                <span className="text-[10px] font-bold uppercase text-blue-800">Endorsed to DMW/OWWA</span>
                <p className="text-2xl font-black text-blue-900 mt-1">{staffStats.endorsed}</p>
              </div>
              <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-200">
                <span className="text-[10px] font-bold uppercase text-cyan-800">Seafarer Cases</span>
                <p className="text-2xl font-black text-cyan-900 mt-1">{staffStats.seaBased}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Resolved</span>
                <p className="text-2xl font-black text-emerald-900 mt-1">{staffStats.resolved}</p>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Search Tracking Code, OFW Name, Country/Vessel..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
            />
            <select
              value={staffStatusFilter}
              onChange={(e) => setStaffStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
            >
              <option value="ALL">All Case Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
              <option value="ENDORSED_TO_DMW_OWWA">ENDORSED TO DMW / OWWA</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
            <select
              value={staffWorkerFilter}
              onChange={(e) => setStaffWorkerFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
            >
              <option value="ALL">All Worker Categories</option>
              <option value="LAND_BASED">Land-Based OFWs</option>
              <option value="SEA_BASED">Sea-Based Seafarers</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                    <th className="p-3">Tracking Code</th>
                    <th className="p-3">OFW / Seafarer</th>
                    <th className="p-3">Case Category &amp; Urgency</th>
                    <th className="p-3">Endorsed Agency</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {staffLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Loading OFW &amp; Seafarer cases...
                      </td>
                    </tr>
                  ) : staffCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No case reports found.
                      </td>
                    </tr>
                  ) : (
                    staffCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-rose-700">{c.trackingCode}</td>
                        <td className="p-3">
                          <div className="font-black text-slate-900">{c.ofwFullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.workerCategory} • {c.countryOrVessel}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">
                            {c.caseCategory.replace(/_/g, " ")}
                          </div>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black ${
                              c.urgencyLevel === "CRITICAL_SOS"
                                ? "bg-rose-100 text-rose-900"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {c.urgencyLevel}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={c.endorsedAgency || ""}
                            onChange={(e) =>
                              handleStaffStatusUpdate(c.id, {
                                endorsedAgency: e.target.value,
                                status: "ENDORSED_TO_DMW_OWWA",
                              })
                            }
                            className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] font-semibold bg-white"
                          >
                            <option value="">-- Select Endorsement --</option>
                            <option value="DMW Regional Office III (Pampanga)">
                              DMW Regional Office III
                            </option>
                            <option value="OWWA Regional Welfare Office III (Hotline 1348)">
                              OWWA RWO-III (Hotline 1348)
                            </option>
                            <option value="DMW Maritime Welfare & MARINA">
                              DMW Maritime Welfare &amp; MARINA
                            </option>
                            <option value="Philippine Embassy / MWO Abroad">
                              Philippine Embassy / MWO Abroad
                            </option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={c.status}
                            onChange={(e) =>
                              handleStaffStatusUpdate(c.id, { status: e.target.value })
                            }
                            className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] font-black bg-slate-50"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                            <option value="ENDORSED_TO_DMW_OWWA">ENDORSED TO DMW/OWWA</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCase(c);
                              setTrackingInput(c.trackingCode);
                              setActiveTab("messenger");
                            }}
                            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Open Thread ({c.messages?.length || 0})</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

