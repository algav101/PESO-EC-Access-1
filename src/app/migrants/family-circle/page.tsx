"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Globe,
  Camera,
  CheckCircle2,
  Printer,
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  FileText,
  MapPin,
  Phone,
  Briefcase,
  Building2,
  Eye,
  Check,
  AlertTriangle,
  Download,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, hasPermission } from "@/lib/permissions";

interface FamilyMemberRow {
  fullName: string;
  relationship: string;
  birthdate: string;
  sex: string;
  education: string;
  skills: string;
}

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

const EMPTY_FAMILY_ROWS: FamilyMemberRow[] = Array.from({ length: 8 }, () => ({
  fullName: "",
  relationship: "",
  birthdate: "",
  sex: "",
  education: "",
  skills: "",
}));

export default function OfwFamilyCirclePage() {
  const { user } = useAuth();
  const isStaff = Boolean(
    user && (isAdminUser(user) || hasPermission(user.role, "migrants.read") || hasPermission(user.role, "migrants.manage"))
  );

  const [activeTab, setActiveTab] = useState<"register" | "lookup" | "inventory">("register");

  // Form State (Matching OFW INFORMATION SHEET image)
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [ofwLastName, setOfwLastName] = useState("");
  const [ofwFirstName, setOfwFirstName] = useState("");
  const [ofwMiddleName, setOfwMiddleName] = useState("");
  const [ofwSuffix, setOfwSuffix] = useState("");
  const [ofwSex, setOfwSex] = useState("FEMALE");
  const [ofwBirthdate, setOfwBirthdate] = useState("");
  const [ofwContactInfo, setOfwContactInfo] = useState("");
  const [abroadResidencyStatus, setAbroadResidencyStatus] = useState("PERMANENTE");

  const [occupationAbroad, setOccupationAbroad] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [countryOfWork, setCountryOfWork] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("CONTRACTUAL");
  const [contractDuration, setContractDuration] = useState("2 Years");

  const [dingalanBarangay, setDingalanBarangay] = useState("Poblacion");
  const [dingalanPurokSitio, setDingalanPurokSitio] = useState("");
  const [familyContactInfo, setFamilyContactInfo] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRow[]>(
    EMPTY_FAMILY_ROWS.map((r) => ({ ...r }))
  );
  const [representativeName, setRepresentativeName] = useState("");
  const [agreedDpa, setAgreedDpa] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<any | null>(null);

  // Lookup & Print State
  const [lookupCode, setLookupCode] = useState("");
  const [lookupLastName, setLookupLastName] = useState("");
  const [lookupFirstName, setLookupFirstName] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [printRecord, setPrintRecord] = useState<any | null>(null);

  // Staff Inventory State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any | null>(null);
  const [invSearch, setInvSearch] = useState("");
  const [invBarangay, setInvBarangay] = useState("ALL");
  const [invStatus, setInvStatus] = useState("ALL");
  const [invResidency, setInvResidency] = useState("ALL");
  const [invLoading, setInvLoading] = useState(false);

  useEffect(() => {
    if (isStaff && activeTab === "inventory") {
      fetchInventory();
    }
  }, [isStaff, activeTab, invSearch, invBarangay, invStatus, invResidency]);

  const fetchInventory = async () => {
    setInvLoading(true);
    try {
      const q = new URLSearchParams({
        search: invSearch,
        barangay: invBarangay,
        status: invStatus,
        residency: invResidency,
      }).toString();
      const res = await fetch(`/api/v1/migrants/family-circle?${q}`);
      if (res.ok) {
        const data = await res.json();
        setInventoryList(data.members || []);
        setInventoryStats(data.stats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInvLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Ang larawan ay dapat mas mababa sa 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateFamilyRow = (index: number, field: keyof FamilyMemberRow, value: string) => {
    setFamilyMembers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addFamilyRow = () => {
    setFamilyMembers((prev) => [
      ...prev,
      { fullName: "", relationship: "", birthdate: "", sex: "", education: "", skills: "" },
    ]);
  };

  const applySamplePreset = () => {
    setError(null);
    setOfwLastName("DELA CRUZ");
    setOfwFirstName("MARIA ELENA");
    setOfwMiddleName("SANTOS");
    setOfwSuffix("");
    setOfwSex("FEMALE");
    setOfwBirthdate("1989-08-15");
    setOfwContactInfo("+971 50 123 4567 / maria.delacruz@email.com");
    setAbroadResidencyStatus("CONTRACTUAL");
    setOccupationAbroad("STAFF NURSE / HEALTHCARE WORKER");
    setMonthlyIncome("PHP 55,000.00");
    setCountryOfWork("UNITED ARAB EMIRATES (DUBAI)");
    setAgencyName("POEA/DMW LICENSED MEDICAL PLACEMENT INC.");
    setEmploymentStatus("CONTRACTUAL");
    setContractDuration("2 Years (2025-2027)");
    setDingalanBarangay("Paltic");
    setDingalanPurokSitio("Purok 3, Centro");
    setFamilyContactInfo("0917-555-8899");
    setRepresentativeName("ROBERTO S. DELA CRUZ");
    setAgreedDpa(true);

    const rows = EMPTY_FAMILY_ROWS.map((r) => ({ ...r }));
    rows[0] = {
      fullName: "DELA CRUZ, ROBERTO SANTOS",
      relationship: "ASAWA (SPOUSE)",
      birthdate: "1987-03-10",
      sex: "MALE",
      education: "COLLEGE GRADUATE",
      skills: "DRIVING, CARPENTRY, ELECTRICAL",
    };
    rows[1] = {
      fullName: "DELA CRUZ, SOFIA MARIE",
      relationship: "ANAK (CHILD)",
      birthdate: "2012-06-21",
      sex: "FEMALE",
      education: "GRADE 8 HIGH SCHOOL",
      skills: "COMPUTER LITERACY",
    };
    rows[2] = {
      fullName: "DELA CRUZ, LUCIA SANTOS",
      relationship: "MAGULANG (MOTHER)",
      birthdate: "1960-12-05",
      sex: "FEMALE",
      education: "HIGH SCHOOL GRADUATE",
      skills: "FOOD PROCESSING, DRESSMAKING",
    };
    setFamilyMembers(rows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedDpa) {
      setError("Kinakailangang sumang-ayon sa Data Privacy Act of 2012 bago isumite ang OFW Information Sheet.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/migrants/family-circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoDataUrl: photoDataUrl || null,
          ofwLastName,
          ofwFirstName,
          ofwMiddleName,
          ofwSuffix,
          ofwSex,
          ofwBirthdate,
          ofwContactInfo,
          abroadResidencyStatus,
          occupationAbroad,
          monthlyIncome,
          countryOfWork,
          agencyName,
          employmentStatus,
          contractDuration: employmentStatus === "CONTRACTUAL" ? contractDuration : null,
          dingalanBarangay,
          dingalanPurokSitio,
          familyContactInfo,
          familyMembers,
          representativeName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nabigong irehistro ang OFW Information Sheet.");
      } else {
        setSubmittedRecord(data.member);
        setPrintRecord(data.member);
      }
    } catch (err: any) {
      setError("Network error habang nagsusumite ng rehistro.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupLoading(true);
    try {
      const params = new URLSearchParams();
      if (lookupCode.trim()) params.set("memberCode", lookupCode.trim());
      if (lookupLastName.trim()) params.set("lastName", lookupLastName.trim());
      if (lookupFirstName.trim()) params.set("firstName", lookupFirstName.trim());

      const res = await fetch(`/api/v1/migrants/family-circle?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Hindi natagpuan ang OFW Family Circle record.");
        setPrintRecord(null);
      } else {
        setPrintRecord(data.member);
      }
    } catch (e) {
      setLookupError("Nabigong hanapin ang record.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, membershipStatus: string) => {
    try {
      const res = await fetch("/api/v1/migrants/family-circle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, membershipStatus }),
      });
      if (res.ok) {
        fetchInventory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Sigurado ka bang nais mong burahin ang OFW Family Circle record na ito?")) return;
    try {
      const res = await fetch(`/api/v1/migrants/family-circle?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchInventory();
        if (printRecord?.id === id) setPrintRecord(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const parseFamilyRows = (jsonStr?: string): FamilyMemberRow[] => {
    let parsed: FamilyMemberRow[] = [];
    try {
      parsed = JSON.parse(jsonStr || "[]");
    } catch (e) {
      parsed = [];
    }
    const minRows = Math.max(8, parsed.length);
    const result: FamilyMemberRow[] = [];
    for (let i = 0; i < minRows; i++) {
      result.push(
        parsed[i] || {
          fullName: "",
          relationship: "",
          birthdate: "",
          sex: "",
          education: "",
          skills: "",
        }
      );
    }
    return result;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Navigation Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden print:hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/migrants"
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-300 px-3 py-1 rounded-full border border-white/15 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Migrants&apos; Corner Hub</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-white/5 hover:bg-white/15 text-slate-300 px-3 py-1 rounded-full border border-white/10 transition"
              >
                <span>Public Landing Page</span>
              </Link>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider">
                OFW Family Circle Federation • Dingalan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              OFW Family Circle Membership &amp; Household Registry
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Opisyal na <strong>OFW Information Sheet</strong> at Resource Database para sa mga Overseas Filipino Workers (OFWs), Seafarers, at kanilang mga pamilyang naninirahan sa Bayan ng Dingalan, Aurora para sa mabilis na pagsubaybay, koordinasyon, at tulong-pangkabuhayan.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                activeTab === "register"
                  ? "bg-emerald-500 text-slate-950 shadow-lg"
                  : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Mag-rehistro (OFW Info Sheet)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lookup")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                activeTab === "lookup"
                  ? "bg-amber-400 text-slate-950 shadow-lg"
                  : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>I-Print ang OFW Sheet</span>
            </button>
            {isStaff && (
              <button
                type="button"
                onClick={() => setActiveTab("inventory")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                  activeTab === "inventory"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff Resource Database ({inventoryStats?.totalOfws ?? "..."})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: OFW INFORMATION SHEET REGISTRATION FORM
          ===================================================================== */}
      {activeTab === "register" && (
        <div className="space-y-6 print:hidden">
          {submittedRecord && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                      Matagumpay na Naitala sa OFW Family Circle Database!
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      {submittedRecord.ofwFullName} —{" "}
                      <span className="font-mono text-emerald-700">{submittedRecord.memberCode}</span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Barangay {submittedRecord.dingalanBarangay}, Dingalan, Aurora • Kinatawan:{" "}
                      <strong>{submittedRecord.representativeName}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintRecord(submittedRecord);
                      setActiveTab("lookup");
                    }}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Buksan at I-Print ang Opisyal na OFW Information Sheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedRecord(null)}
                    className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    Mag-rehistro Muli
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Official Form Card Container */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border-2 border-slate-300 shadow-lg overflow-hidden">
            {/* Official 3-Logo Header Replica of Uploaded Image */}
            <div className="p-6 sm:p-8 border-b-2 border-dashed border-slate-400 bg-gradient-to-b from-slate-50 to-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* 3 Official Logos Centerpiece */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 mx-auto">
                  {/* 1. PESO Official Seal */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtoUir3ZE52UnEYaw7AR9APtwPi3pEyJBFiuEUIbBsoGvXafd88xp6a33vjrxUZnUpw__3WElv2cDxVridP6KGVkxw4pCH5H73dbV9ZACrE_LxLpujsdC2YyxhXyLU6NoM26us_oh84MDWGwGKupSPueyvyDSFq_h_CBPp7KnSZHa0lU3LbmaZNQi-YTS7t-LeEFoUFFQtCMUJldN0DT-dRyjvhMqcBH6W4pv4DKMK5luQAc0nUsKvA5Vtq1gLHojM3qw"
                    alt="PESO Official Seal"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full border border-slate-200 shadow-xs"
                  />
                  {/* 2. Municipality of Dingalan, Aurora (1956) Official Seal */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzJtsS2yijY8hMk7JlMmcqZzPXX7cMDa5QNrtlReRYohCUNOYCLchkJdB_tPnqplxiiBOjgOMSIYNudlOa2NXtmy42QQCqrxRZ_Pcvy-hRiPr_ADJyV7zIWwztW9OdXVbpJQN2vqDMQnXP487EV3u3rqTtgJIqqI1-KkYnYIPzfqxht9YFAFdjx5J30QVX3TQerELyu6MOtWcoT3MPEV6hXbrLzVdq8Bx7CqvR3js5SwMIKlVeM14Kgt4cZkOU7H8gaDw"
                    alt="Dingalan Aurora 1956 Official Seal"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full border border-slate-200 shadow-xs"
                  />
                  {/* 3. OFW Family Circle Federation Dingalan Emblem */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-sky-500 via-emerald-500 to-blue-800 p-1 shadow-md flex items-center justify-center border-2 border-emerald-300">
                    <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center text-center p-1">
                      <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                      <span className="text-[7px] sm:text-[8px] font-black uppercase leading-none text-blue-950 tracking-tighter mt-0.5">
                        OFW FAMILY CIRCLE
                      </span>
                      <span className="text-[6px] sm:text-[7px] font-extrabold text-emerald-700 leading-none">
                        DINGALAN
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-4 space-y-1">
                <h2 className="text-xl sm:text-2xl font-black tracking-wide text-slate-950 uppercase">
                  OFW INFORMATION SHEET
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  Lahat ng impormasyon na inyong ibibigay ay gagamitin ng tama at nasa ayos alinsunod sa Data Privacy Act of 2012
                </p>
              </div>

              {/* Helper Preset & Photo Upload Bar */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {photoDataUrl ? (
                      <img src={photoDataUrl} alt="Uploaded OFW Photo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer transition">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Mag-upload ng Larawan (2x2 / ID Photo)</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Opsyonal na larawan ng OFW o Kinatawan ng Pamilya para sa OFW Family Circle ID Database
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applySamplePreset}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Load Sample OFW Household Data</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-center space-x-2.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-8">
              {/* TWO-COLUMN BOX REPLICA OF THE UPLOADED OFW INFORMATION SHEET */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT BOX: PERSONAL DETAILS & RESIDENCY ABROAD */}
                <div className="border-2 border-slate-800 rounded-xl overflow-hidden divide-y-2 divide-slate-800 bg-white">
                  {/* PANGALAN NG OFW */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-slate-900">
                        PANGALAN NG OFW : <span className="text-rose-600">*</span>
                      </label>
                      <span className="text-[10px] italic font-semibold text-slate-600">
                        (Apelyido, Pangalan, Gitnang Pangalan)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="APELYIDO (Last Name)"
                        value={ofwLastName}
                        onChange={(e) => setOfwLastName(e.target.value.toUpperCase())}
                        className="sm:col-span-1 px-2.5 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 uppercase focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="PANGALAN (First Name)"
                        value={ofwFirstName}
                        onChange={(e) => setOfwFirstName(e.target.value.toUpperCase())}
                        className="sm:col-span-1 px-2.5 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 uppercase focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="GITNANG PANGALAN"
                        value={ofwMiddleName}
                        onChange={(e) => setOfwMiddleName(e.target.value.toUpperCase())}
                        className="sm:col-span-1 px-2.5 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 uppercase focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="SUFFIX (Jr/III)"
                        value={ofwSuffix}
                        onChange={(e) => setOfwSuffix(e.target.value.toUpperCase())}
                        className="sm:col-span-1 px-2.5 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 uppercase focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* KASARIAN */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-black uppercase text-slate-900">
                      KASARIAN : <span className="text-rose-600">*</span>
                    </label>
                    <div className="flex items-center gap-4">
                      {["FEMALE", "MALE"].map((g) => (
                        <label key={g} className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="ofwSex"
                            checked={ofwSex === g}
                            onChange={() => setOfwSex(g)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>{g === "FEMALE" ? "BABAE (FEMALE)" : "LALAKI (MALE)"}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* PETSA NG KAPANGANAKAN */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-black uppercase text-slate-900">
                      PETSA NG KAPANGANAKAN : <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={ofwBirthdate}
                      onChange={(e) => setOfwBirthdate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* CONTACT INFORMATION */}
                  <div className="p-3.5 space-y-1.5">
                    <label className="block text-xs font-black uppercase text-slate-900">
                      CONTACT INFORMATION (Phone / WhatsApp / Email / FB) : <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. +971 50 123 4567 / 0917-123-4567 / FB Messenger"
                      value={ofwContactInfo}
                      onChange={(e) => setOfwContactInfo(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* ESTADO NG PANINIRAHAN SA IBANG BANSA */}
                  <div className="p-3.5 space-y-2 bg-slate-50/60">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-900">
                        ESTADO NG PANINIRAHAN SA IBANG BANSA :
                      </label>
                      <span className="text-[10px] italic font-semibold text-slate-600">
                        (Permanente, Petitioner, Undocumented)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1">
                      {[
                        { value: "PERMANENTE", label: "Permanente (Permanent Resident / Working Visa)" },
                        { value: "PETITIONER", label: "Petitioner / Dependent" },
                        { value: "UNDOCUMENTED", label: "Undocumented / Irregular" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer flex items-center space-x-1.5 transition ${
                            abroadResidencyStatus === opt.value
                              ? "bg-blue-900 text-white border-blue-900"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name="abroadResidencyStatus"
                            checked={abroadResidencyStatus === opt.value}
                            onChange={() => setAbroadResidencyStatus(opt.value)}
                            className="hidden"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT BOX: EMPLOYMENT, INCOME, COUNTRY, AGENCY & CONTRACT STATUS */}
                <div className="border-2 border-slate-800 rounded-xl overflow-hidden divide-y-2 divide-slate-800 bg-white">
                  {/* TRABAHO */}
                  <div className="p-3.5 space-y-1.5">
                    <label className="block text-xs font-black uppercase text-slate-900">
                      TRABAHO (Occupation / Position Abroad) : <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. Domestic Helper, Seafarer / Able Seaman, Nurse, Engineer, Caregiver"
                      value={occupationAbroad}
                      onChange={(e) => setOccupationAbroad(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 uppercase focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* BUWANANG KITA */}
                  <div className="p-3.5 space-y-1.5">
                    <label className="block text-xs font-black uppercase text-slate-900">
                      BUWANANG KITA (Estimated Monthly Income) :
                    </label>
                    <input
                      type="text"
                      placeholder="Hal. PHP 35,000.00 / USD 800"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* BANSANG PINAGTATRABAHUHAN */}
                  <div className="p-3.5 space-y-1.5">
                    <label className="block text-xs font-black uppercase text-slate-900">
                      BANSANG PINAGTATRABAHUHAN (Host Country / Vessel) : <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. SAUDI ARABIA, HONG KONG, SINGAPORE, UAE, TAIWAN, JAPAN, INTERNATIONAL VESSEL"
                      value={countryOfWork}
                      onChange={(e) => setCountryOfWork(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 uppercase focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* AGENCY */}
                  <div className="p-3.5 space-y-1.5">
                    <label className="block text-xs font-black uppercase text-slate-900">
                      AGENCY (Recruitment / Manning Agency) :
                    </label>
                    <input
                      type="text"
                      placeholder="Pangalan ng DMW/POEA Recruitment o Manning Agency (o Direct Hire)"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded bg-slate-50 uppercase focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* ESTADO NG PAGTATRABAHO */}
                  <div className="p-3.5 space-y-2.5 bg-slate-50/60">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-900">
                        ESTADO NG PAGTATRABAHO :
                      </label>
                      <span className="text-[10px] italic font-semibold text-slate-600">
                        (Permanente, Contractual - ilagay ang tagal ng kontrata, Undocumented)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "PERMANENTE", label: "Permanente" },
                        { value: "CONTRACTUAL", label: "Contractual" },
                        { value: "UNDOCUMENTED", label: "Undocumented" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                            employmentStatus === opt.value
                              ? "bg-emerald-800 text-white border-emerald-800"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name="employmentStatus"
                            checked={employmentStatus === opt.value}
                            onChange={() => setEmploymentStatus(opt.value)}
                            className="hidden"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    {employmentStatus === "CONTRACTUAL" && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                          Tagal ng Kontrata (Contract Duration):
                        </label>
                        <input
                          type="text"
                          placeholder="Hal. 2 Taon (2025 - 2027) / 9 Months Seafarer Contract"
                          value={contractDuration}
                          onChange={(e) => setContractDuration(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: DETALYE NG PAMILYA NA SA DINGALAN NANINIRAHAN */}
              <div className="space-y-4">
                <div className="border-b-2 border-slate-900 pb-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-950">
                    Detalye ng pamilya na sa Dingalan naninirahan:
                  </h3>
                </div>

                {/* Barangay, Purok/Sitio, Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-300">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      Barangay: <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={dingalanBarangay}
                      onChange={(e) => setDingalanBarangay(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-blue-600 focus:outline-none"
                    >
                      {DINGALAN_BARANGAYS.map((b) => (
                        <option key={b} value={b}>
                          Barangay {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      Purok/Sitio:
                    </label>
                    <input
                      type="text"
                      placeholder="Hal. Purok 2 / Sitio Maligaya"
                      value={dingalanPurokSitio}
                      onChange={(e) => setDingalanPurokSitio(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      Contact Information (Pamilya sa Dingalan): <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. 0917-555-8899"
                      value={familyContactInfo}
                      onChange={(e) => setFamilyContactInfo(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 8-Row Family Table Matching the Uploaded OFW Information Sheet */}
                <div className="overflow-x-auto border-2 border-slate-900 rounded-xl">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-950 font-black uppercase text-center">
                        <th className="border-r border-slate-900 px-2 py-2.5 w-10">#</th>
                        <th className="border-r border-slate-900 px-3 py-2.5 min-w-[200px]">
                          MIYEMBRO NG PAMILYA
                        </th>
                        <th className="border-r border-slate-900 px-3 py-2.5 min-w-[130px]">
                          RELASYON
                        </th>
                        <th className="border-r border-slate-900 px-3 py-2.5 min-w-[140px]">
                          PETSA NG KAPANGANAKAN
                        </th>
                        <th className="border-r border-slate-900 px-3 py-2.5 min-w-[110px]">
                          KASARIAN
                        </th>
                        <th className="border-r border-slate-900 px-3 py-2.5 min-w-[150px]">
                          EDUKASYON
                        </th>
                        <th className="px-3 py-2.5 min-w-[180px]">
                          MGA KASANAYAN SA TRABAHO <span className="italic font-semibold">(Skills)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {familyMembers.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30">
                          <td className="border-r border-slate-900 px-2 py-1.5 text-center font-black text-slate-800">
                            {idx + 1}.
                          </td>
                          <td className="border-r border-slate-900 p-1">
                            <input
                              type="text"
                              placeholder="Buong Pangalan"
                              value={row.fullName}
                              onChange={(e) => updateFamilyRow(idx, "fullName", e.target.value.toUpperCase())}
                              className="w-full px-2 py-1.5 text-xs font-semibold uppercase bg-transparent focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1">
                            <input
                              type="text"
                              placeholder="Asawa / Anak / Magulang"
                              value={row.relationship}
                              onChange={(e) => updateFamilyRow(idx, "relationship", e.target.value.toUpperCase())}
                              className="w-full px-2 py-1.5 text-xs font-semibold uppercase bg-transparent focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1">
                            <input
                              type="date"
                              value={row.birthdate}
                              onChange={(e) => updateFamilyRow(idx, "birthdate", e.target.value)}
                              className="w-full px-2 py-1.5 text-xs font-semibold bg-transparent focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="border-r border-slate-900 p-1">
                            <select
                              value={row.sex}
                              onChange={(e) => updateFamilyRow(idx, "sex", e.target.value)}
                              className="w-full px-2 py-1.5 text-xs font-semibold bg-transparent focus:bg-white focus:outline-none"
                            >
                              <option value="">--</option>
                              <option value="MALE">MALE</option>
                              <option value="FEMALE">FEMALE</option>
                            </select>
                          </td>
                          <td className="border-r border-slate-900 p-1">
                            <input
                              type="text"
                              placeholder="Antas ng Edukasyon"
                              value={row.education}
                              onChange={(e) => updateFamilyRow(idx, "education", e.target.value.toUpperCase())}
                              className="w-full px-2 py-1.5 text-xs font-semibold uppercase bg-transparent focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              placeholder="Hal. Driving, Cooking, Sewing"
                              value={row.skills}
                              onChange={(e) => updateFamilyRow(idx, "skills", e.target.value.toUpperCase())}
                              className="w-full px-2 py-1.5 text-xs font-semibold uppercase bg-transparent focus:bg-white focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addFamilyRow}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Magdagdag ng Row sa Talahanayan ng Pamilya</span>
                  </button>
                </div>

                {/* Representative Name & Signature Block + DPA Consent */}
                <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedDpa}
                        onChange={(e) => setAgreedDpa(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-800 leading-relaxed">
                        <strong>Data Privacy Act of 2012 Consent:</strong> Pinatutunayan ko na tama at totoo ang lahat ng impormasyong nakasaad dito at pinahihintulutan ko ang <strong>PESO Dingalan</strong> at <strong>OFW Family Circle Federation Dingalan</strong> na gamitin ito para sa opisyal na monitoring, inventory, at programa para sa mga migrante.
                      </span>
                    </label>
                  </div>

                  <div className="text-center space-y-1.5">
                    <input
                      type="text"
                      required
                      placeholder="ILAGAY ANG BUONG PANGALAN NG KINATAWAN NG OFW"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value.toUpperCase())}
                      className="w-full max-w-md mx-auto block text-center px-3 py-2 text-xs font-black uppercase border-b-2 border-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                    <p className="text-xs font-bold text-slate-800">
                      Pangalan at Lagda ng Kinatawan ng OFW <span className="text-rose-600">*</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center space-x-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {submitting
                        ? "Isinusumite ang OFW Information Sheet..."
                        : "Isumite at I-Rehistro sa OFW Family Circle Database"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 2: LOOKUP & PRINT EXACT REPLICA OF UPLOADED OFW INFORMATION SHEET
          ===================================================================== */}
      {activeTab === "lookup" && (
        <div className="space-y-6">
          {/* Search Bar (Hidden when printing) */}
          <form
            onSubmit={handleLookup}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Hanapin at I-Print ang Opisyal na OFW Information Sheet
                </h3>
                <p className="text-xs text-slate-500">
                  Ilagay ang Member Code (hal. <code className="font-mono font-bold">OFC-DGL-2026-XXXX</code>) o kaya ang Apelyido at Pangalan ng OFW.
                </p>
              </div>
              {printRecord && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official OFW Information Sheet</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Member Code (OFC-DGL-...)"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
              />
              <input
                type="text"
                placeholder="Apelyido ng OFW (Last Name)"
                value={lookupLastName}
                onChange={(e) => setLookupLastName(e.target.value.toUpperCase())}
                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
              />
              <input
                type="text"
                placeholder="Pangalan ng OFW (First Name)"
                value={lookupFirstName}
                onChange={(e) => setLookupFirstName(e.target.value.toUpperCase())}
                className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black flex items-center justify-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span>{lookupLoading ? "Hinahanap..." : "Hanapin ang Record"}</span>
              </button>
            </div>

            {lookupError && (
              <p className="text-xs font-bold text-rose-600">{lookupError}</p>
            )}
          </form>

          {/* PRINTABLE EXACT REPLICA OF THE UPLOADED IMAGE */}
          {printRecord ? (
            <div className="bg-white p-6 sm:p-10 rounded-none sm:rounded-2xl border-2 border-slate-900 shadow-xl max-w-5xl mx-auto text-slate-950 print:shadow-none print:border-0 print:p-0">
              {/* Top Logos & Photo Row */}
              <div className="relative flex flex-col items-center justify-center pb-3 border-b-2 border-dashed border-slate-800">
                <div className="flex items-center justify-center gap-5">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtoUir3ZE52UnEYaw7AR9APtwPi3pEyJBFiuEUIbBsoGvXafd88xp6a33vjrxUZnUpw__3WElv2cDxVridP6KGVkxw4pCH5H73dbV9ZACrE_LxLpujsdC2YyxhXyLU6NoM26us_oh84MDWGwGKupSPueyvyDSFq_h_CBPp7KnSZHa0lU3LbmaZNQi-YTS7t-LeEFoUFFQtCMUJldN0DT-dRyjvhMqcBH6W4pv4DKMK5luQAc0nUsKvA5Vtq1gLHojM3qw"
                    alt="PESO Logo"
                    className="w-16 h-16 object-contain"
                  />
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzJtsS2yijY8hMk7JlMmcqZzPXX7cMDa5QNrtlReRYohCUNOYCLchkJdB_tPnqplxiiBOjgOMSIYNudlOa2NXtmy42QQCqrxRZ_Pcvy-hRiPr_ADJyV7zIWwztW9OdXVbpJQN2vqDMQnXP487EV3u3rqTtgJIqqI1-KkYnYIPzfqxht9YFAFdjx5J30QVX3TQerELyu6MOtWcoT3MPEV6hXbrLzVdq8Bx7CqvR3js5SwMIKlVeM14Kgt4cZkOU7H8gaDw"
                    alt="Dingalan Seal"
                    className="w-16 h-16 object-contain"
                  />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 via-emerald-500 to-blue-800 p-1 flex items-center justify-center border border-slate-400">
                    <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center text-center p-1">
                      <Globe className="w-6 h-6 text-emerald-600" />
                      <span className="text-[6.5px] font-black uppercase leading-none text-blue-950">
                        OFW FAMILY CIRCLE
                      </span>
                      <span className="text-[6px] font-extrabold text-emerald-700 leading-none">
                        DINGALAN
                      </span>
                    </div>
                  </div>
                </div>

                {/* Uploaded Member Photo on Right Corner if present */}
                {printRecord.photoDataUrl && (
                  <div className=" sm:absolute sm:right-2 sm:top-0 mt-3 sm:mt-0 w-20 h-20 border-2 border-slate-900 overflow-hidden bg-slate-50">
                    <img
                      src={printRecord.photoDataUrl}
                      alt="OFW Member"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <h2 className="text-xl font-black uppercase tracking-wide mt-2">
                  OFW INFORMATION SHEET
                </h2>
                <p className="text-[11px] font-bold text-slate-800 text-center mt-0.5">
                  Lahat ng impormasyon na inyong ibibigay ay gagamitin ng tama at nasa ayos alinsunod sa Data Privacy Act of 2012
                </p>
                <span className="text-[10px] font-mono font-bold text-slate-600 mt-0.5">
                  Control / Member ID: {printRecord.memberCode}
                </span>
              </div>

              {/* Two-Column OFW Info Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Left Box */}
                <div className="border-2 border-slate-900 divide-y border-collapse divide-slate-900 text-xs">
                  <div className="p-2">
                    <div className="font-black">
                      PANGALAN NG OFW :{" "}
                      <span className="font-bold underline ml-1">{printRecord.ofwFullName}</span>
                    </div>
                    <div className="text-[10px] italic text-center text-slate-700">
                      (Apelyido, Pangalan, Gitnang Pangalan)
                    </div>
                  </div>
                  <div className="p-2 font-black">
                    KASARIAN : <span className="font-bold ml-2">{printRecord.ofwSex}</span>
                  </div>
                  <div className="p-2 font-black">
                    PETSA NG KAPANGANAKAN :{" "}
                    <span className="font-bold ml-2">{printRecord.ofwBirthdate}</span>
                  </div>
                  <div className="p-2 font-black">
                    CONTACT INFORMATION :{" "}
                    <span className="font-bold ml-2">{printRecord.ofwContactInfo}</span>
                  </div>
                  <div className="p-2">
                    <div className="font-black">
                      ESTADO NG PANINIRAHAN SA IBANG BANSA:{" "}
                      <span className="font-bold underline ml-1">
                        {printRecord.abroadResidencyStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Box */}
                <div className="border-2 border-slate-900 divide-y divide-slate-900 text-xs">
                  <div className="p-2 font-black">
                    TRABAHO: <span className="font-bold ml-2">{printRecord.occupationAbroad}</span>
                  </div>
                  <div className="p-2 font-black">
                    BUWANANG KITA:{" "}
                    <span className="font-bold ml-2">{printRecord.monthlyIncome || "N/A"}</span>
                  </div>
                  <div className="p-2 font-black">
                    BANSANG PINAGTATRABAHUHAN:{" "}
                    <span className="font-bold ml-2">{printRecord.countryOfWork}</span>
                  </div>
                  <div className="p-2 font-black">
                    AGENCY: <span className="font-bold ml-2">{printRecord.agencyName || "N/A"}</span>
                  </div>
                  <div className="p-2">
                    <div className="font-black">
                      ESTADO NG PAGTATRABAHO:{" "}
                      <span className="font-bold underline ml-1">
                        {printRecord.employmentStatus}
                        {printRecord.contractDuration ? ` (${printRecord.contractDuration})` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] italic text-center text-slate-700 mt-0.5">
                <div>( Permanente, Petitioner, Undocumented )</div>
                <div>( Permanente, Contractual-ilagay ang tagal ng kontrata, undocumented )</div>
              </div>

              {/* Family Details Section */}
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-black">
                  Detalye ng pamilya na sa Dingalan naninirahan:
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  <div>
                    Barangay: <span className="underline">{printRecord.dingalanBarangay}</span>
                  </div>
                  <div>
                    Purok/Sitio:{" "}
                    <span className="underline">{printRecord.dingalanPurokSitio || "N/A"}</span>
                  </div>
                  <div>
                    Contact Information:{" "}
                    <span className="underline">{printRecord.familyContactInfo}</span>
                  </div>
                </div>

                <table className="w-full border-2 border-slate-900 border-collapse text-[11px] mt-2">
                  <thead>
                    <tr className="border-b-2 border-slate-900 font-black text-center bg-slate-50">
                      <th className="border-r border-slate-900 px-2 py-1.5 text-left w-1/4">
                        MIYEMBRO NG PAMILYA
                      </th>
                      <th className="border-r border-slate-900 px-2 py-1.5">RELASYON</th>
                      <th className="border-r border-slate-900 px-2 py-1.5">
                        PETSA NG KAPANGANAKAN
                      </th>
                      <th className="border-r border-slate-900 px-2 py-1.5">KASARIAN</th>
                      <th className="border-r border-slate-900 px-2 py-1.5">EDUKASYON</th>
                      <th className="px-2 py-1.5">
                        MGA KASANAYAN SA TRABAHO <span className="italic font-normal">(Skills)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {parseFamilyRows(printRecord.familyMembersJson).map((r, i) => (
                      <tr key={i} className="h-7">
                        <td className="border-r border-slate-900 px-2 py-1 font-semibold">
                          {i + 1}. {r.fullName}
                        </td>
                        <td className="border-r border-slate-900 px-2 py-1 text-center">
                          {r.relationship}
                        </td>
                        <td className="border-r border-slate-900 px-2 py-1 text-center">
                          {r.birthdate}
                        </td>
                        <td className="border-r border-slate-900 px-2 py-1 text-center">
                          {r.sex}
                        </td>
                        <td className="border-r border-slate-900 px-2 py-1 text-center">
                          {r.education}
                        </td>
                        <td className="px-2 py-1 text-center">{r.skills}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pt-10 text-center">
                  <div className="inline-block min-w-[320px] border-b border-slate-900 pb-1 font-black text-xs uppercase">
                    {printRecord.representativeName}
                  </div>
                  <p className="text-xs font-semibold mt-1">
                    Pangalan at Lagda ng Kinatawan ng OFW
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2 print:hidden">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Walang nakabukas na OFW Information Sheet
              </p>
              <p className="text-xs text-slate-500">
                Mag-search gamit ang Member Code o Pangalan sa itaas, o kaya ay mag-rehistro sa unang tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: STAFF INVENTORY & RESOURCE DATABASE
          ===================================================================== */}
      {isStaff && activeTab === "inventory" && (
        <div className="space-y-6 print:hidden">
          {/* Summary KPI Cards */}
          {inventoryStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="gov-card p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase text-slate-500">Total OFW Households</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{inventoryStats.totalOfws}</p>
              </div>
              <div className="gov-card p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase text-emerald-700">Verified Circle Members</span>
                <p className="text-2xl font-black text-emerald-900 mt-1">{inventoryStats.verified}</p>
              </div>
              <div className="gov-card p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase text-blue-700">Contractual OFWs</span>
                <p className="text-2xl font-black text-blue-900 mt-1">{inventoryStats.contractual}</p>
              </div>
              <div className="gov-card p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase text-indigo-700">Permanent Abroad</span>
                <p className="text-2xl font-black text-indigo-900 mt-1">{inventoryStats.permanent}</p>
              </div>
              <div className="gov-card p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase text-amber-800">Undocumented (For Aid)</span>
                <p className="text-2xl font-black text-amber-900 mt-1">{inventoryStats.undocumented}</p>
              </div>
              <div className="gov-card p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase text-purple-800">Dingalan Family Members</span>
                <p className="text-2xl font-black text-purple-900 mt-1">{inventoryStats.totalHouseholdDependents}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Search OFW Name, Country, Member Code..."
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
            />
            <select
              value={invBarangay}
              onChange={(e) => setInvBarangay(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
            >
              <option value="ALL">All 11 Dingalan Barangays</option>
              {DINGALAN_BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  Barangay {b}
                </option>
              ))}
            </select>
            <select
              value={invResidency}
              onChange={(e) => setInvResidency(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
            >
              <option value="ALL">All Residency Statuses</option>
              <option value="PERMANENTE">Permanente</option>
              <option value="PETITIONER">Petitioner</option>
              <option value="CONTRACTUAL">Contractual</option>
              <option value="UNDOCUMENTED">Undocumented</option>
            </select>
            <select
              value={invStatus}
              onChange={(e) => setInvStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl"
            >
              <option value="ALL">All Membership Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="RETURNING_OFW">RETURNING OFW</option>
            </select>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                    <th className="p-3">Member ID</th>
                    <th className="p-3">OFW Name &amp; Photo</th>
                    <th className="p-3">Country &amp; Job</th>
                    <th className="p-3">Employment / Residency</th>
                    <th className="p-3">Dingalan Family &amp; Barangay</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Loading OFW Family Circle inventory...
                      </td>
                    </tr>
                  ) : inventoryList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No OFW Family Circle records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    inventoryList.map((item) => {
                      let famCount = 0;
                      try {
                        famCount = JSON.parse(item.familyMembersJson || "[]").filter(
                          (f: any) => f.fullName?.trim()
                        ).length;
                      } catch (e) {}

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-900">
                            {item.memberCode}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              {item.photoDataUrl ? (
                                <img
                                  src={item.photoDataUrl}
                                  alt={item.ofwFullName}
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-300"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500">
                                  {item.ofwLastName?.[0] || "O"}
                                </div>
                              )}
                              <div>
                                <div className="font-black text-slate-900">{item.ofwFullName}</div>
                                <div className="text-[11px] text-slate-500">
                                  {item.ofwSex} • Born {item.ofwBirthdate}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{item.countryOfWork}</div>
                            <div className="text-[11px] text-slate-600">{item.occupationAbroad}</div>
                          </td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                              {item.employmentStatus}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Residency: {item.abroadResidencyStatus}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">
                              Brgy. {item.dingalanBarangay} ({famCount} members)
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Rep: {item.representativeName} • {item.familyContactInfo}
                            </div>
                          </td>
                          <td className="p-3">
                            <select
                              value={item.membershipStatus}
                              onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black border ${
                                item.membershipStatus === "VERIFIED"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-blue-50 text-blue-800 border-blue-300"
                              }`}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="VERIFIED">VERIFIED</option>
                              <option value="RETURNING_OFW">RETURNING OFW</option>
                              <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPrintRecord(item);
                                setActiveTab("lookup");
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Sheet</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(item.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
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

