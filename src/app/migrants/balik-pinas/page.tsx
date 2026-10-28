"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Briefcase,
  CheckCircle2,
  Printer,
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  Camera,
  AlertTriangle,
  Building2,
  Layers,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser, hasPermission, isPesoPersonnel } from "@/lib/permissions";

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

interface SupplyItem {
  category: "PRODUKTO" | "KAGAMITAN";
  supplierName: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
}

export default function BalikPinasElporPortalPage() {
  const { user } = useAuth();
  const isStaff = Boolean(
    user && (isPesoPersonnel(user) || isAdminUser(user) || hasPermission(user.role, "migrants.read") || hasPermission(user.role, "migrants.manage"))
  );

  const [activeTab, setActiveTab] = useState<"apply" | "print" | "staff">("apply");

  // ELPOR FORM A State
  const [programComponent, setProgramComponent] = useState<"EBPBH" | "ELDAP">("EBPBH");
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");

  // I. Datos Tungkol sa OFW
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("Paltic");
  const [birthdate, setBirthdate] = useState("");
  const [age, setAge] = useState("35");
  const [sex, setSex] = useState("FEMALE");
  const [civilStatus, setCivilStatus] = useState("MARRIED");
  const [otherData, setOtherData] = useState({
    isPwd: false,
    isSenior: false,
    isSoloParent: false,
    isIp: false,
    isLgbtqia: false,
  });
  const [cellphone1, setCellphone1] = useState("");
  const [cellphone2, setCellphone2] = useState("");
  const [emailOrFb, setEmailOrFb] = useState("");
  const [workerCategory, setWorkerCategory] = useState<"LAND_BASED" | "SEA_BASED">("LAND_BASED");

  // II. Datos Tungkol sa OFW Employment
  const [jobsiteCountry, setJobsiteCountry] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [latestDepartureDate, setLatestDepartureDate] = useState("");
  const [latestContractDuration, setLatestContractDuration] = useState("2 Years");
  const [latestArrivalDate, setLatestArrivalDate] = useState("");
  const [passportNumber, setPassportNumber] = useState("");

  // III. Datos Tungkol sa Negosyo
  const [proposedBusinessType, setProposedBusinessType] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [hasExistingBusiness, setHasExistingBusiness] = useState(false);
  const [existingBusinessDetails, setExistingBusinessDetails] = useState("");

  // IV. Mga Pagsasanay sa Negosyo
  const [trainingKind, setTrainingKind] = useState("FAS-SBMT (Financial Awareness Seminar - Small Business Management Training)");
  const [trainingVenue, setTrainingVenue] = useState("PESO Dingalan / DMW Regional Office III");
  const [trainingIssuedBy, setTrainingIssuedBy] = useState("Department of Migrant Workers (DMW RO-III)");
  const [trainingDate, setTrainingDate] = useState("");

  // ELPOR FORM A2: OFW Statement Form
  const [reasonForReturn, setReasonForReturn] = useState("Distressed / Displaced / Finished Contract Returning for Reintegration");
  const [briefStatement, setBriefStatement] = useState("");

  // ELPOR FORM B1: Listahan ng Panimulang Kagamitan at Produkto
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([
    { category: "PRODUKTO", supplierName: "DINGALAN PUBLIC MARKET WHOLESALE", itemName: "ASSORTED GROCERY & RICE SACKS (25KG)", unitPrice: 1250, quantity: 8 },
    { category: "PRODUKTO", supplierName: "AURORA TRADING SUPPLY", itemName: "CANNED GOODS, COOKING OIL & CONDIMENTS", unitPrice: 5000, quantity: 1 },
    { category: "KAGAMITAN", supplierName: "BALER APPLIANCE & HARDWARE", itemName: "HEAVY DUTY DISPLAY RACK & WEIGHING SCALE", unitPrice: 5000, quantity: 1 },
  ]);

  // ELPOR FORM B: Business Model Canvas
  const [businessCanvas, setBusinessCanvas] = useState({
    businessIdea: "Sari-Sari Store at Bigasan sa Barangay",
    customer: "Mga residente, mangingisda, at kapitbahay sa Purok at Barangay",
    location: "Harap ng bahay sa Centro ng Barangay, Dingalan, Aurora",
    promotions: "Abot-kayang presyo, libreng hatid sa kalapit na kabahayan, at FB Page posting",
    price: "Competitive retail price na may 15% hanggang 20% mark-up",
    process: "Pamimili ng bultuhan sa wholesale supplier -> Pag-aayos sa tindahan -> Araw-araw na pagbebenta at imbentaryo",
    resources: "Tindahan space, timbangan, estante, at panimulang paninda mula sa DMW ELPOR Grant",
    keyPartners: "Wholesale Rice & Grocery Suppliers sa Dingalan at DMW/PESO Mentoring",
    startUpCost: "PHP 20,000.00",
    fundingSource: "DMW ELPOR (Enhanced Balik Pinay! Balik Hanapbuhay! Program Grant)",
    budget: "PHP 15,000 Produkto/Paninda + PHP 5,000 Kagamitan = PHP 20,000.00",
    projectedIncome: "PHP 8,000.00 - PHP 12,000.00 Net Kita bawat buwan",
  });

  // Documents Checklist & Undertakings (Form C & Kasulatan)
  const [docsChecklist, setDocsChecklist] = useState({
    formA: true,
    formA2: true,
    formB: true,
    formB1: true,
    formC: true,
    passportBio: true,
    travelDoc: false,
    arrivalStamp: true,
    airlineTicket: true,
    boardingPass: false,
    fasSbmt: true,
    skillsEdt: true,
  });
  const [agreedToCommitment, setAgreedToCommitment] = useState(true);
  const [agreedToKasulatan, setAgreedToKasulatan] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<any | null>(null);

  // Lookup & Print Packet State
  const [lookupControlNo, setLookupControlNo] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<any | null>(null);

  // Staff Roster State
  const [staffApps, setStaffApps] = useState<any[]>([]);
  const [staffStats, setStaffStats] = useState<any | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState("ALL");
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (isStaff && activeTab === "staff") {
      fetchStaffApps();
    }
  }, [isStaff, activeTab, staffSearch, staffStatusFilter]);

  const fetchStaffApps = async () => {
    setStaffLoading(true);
    try {
      const q = new URLSearchParams({
        search: staffSearch,
        status: staffStatusFilter,
      }).toString();
      const res = await fetch(`/api/v1/migrants/balik-pinas?${q}`);
      if (res.ok) {
        const data = await res.json();
        setStaffApps(data.applications || []);
        setStaffStats(data.stats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStaffLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadSampleElpor = () => {
    setError(null);
    setProgramComponent("EBPBH");
    setLastName("VILLANUEVA");
    setFirstName("MARITES");
    setMiddleName("REYES");
    setSuffix("");
    setHouseNumber("#42");
    setStreet("Purok 2, Mabini St.");
    setBarangay("Paltic");
    setBirthdate("1989-05-19");
    setAge("37");
    setSex("FEMALE");
    setCivilStatus("MARRIED");
    setOtherData({ isPwd: false, isSenior: false, isSoloParent: true, isIp: false, isLgbtqia: false });
    setCellphone1("0917-334-9921");
    setCellphone2("0928-112-4455");
    setEmailOrFb("marites.villanueva.ofw@gmail.com / FB: Marites Villanueva");
    setWorkerCategory("LAND_BASED");
    setJobsiteCountry("KUWAIT");
    setJobPosition("DOMESTIC WORKER / HOUSEHOLD STAFF");
    setLatestDepartureDate("2023-02-10");
    setLatestContractDuration("2 Years");
    setLatestArrivalDate("2025-11-18");
    setPassportNumber("P7381920A");
    setProposedBusinessType("SARI-SARI STORE AT BIGASAN RETAILING");
    setBusinessLocation("Purok 2, Barangay Paltic, Dingalan, Aurora");
    setHasExistingBusiness(false);
    setExistingBusinessDetails("");
    setTrainingKind("FAS-SBMT & Entrepreneurship Development Training (EDT)");
    setTrainingVenue("PESO Dingalan Multi-Purpose Hall");
    setTrainingIssuedBy("DMW RO-III / OWWA RWO-III & PESO Dingalan");
    setTrainingDate("2026-02-14");
    setReasonForReturn("Non-renewal of contract / Permanent return to care for children in Dingalan");
    setBriefStatement(
      "Ako po ay nagtrabaho sa Kuwait bilang Household Service Worker at bumalik na nang tuluyan sa Dingalan, Aurora upang makasama ang aking mga anak. Nais ko pong magtayo ng Sari-Sari Store at Bigasan sa aming barangay gamit ang tulong-pangkabuhayan mula sa Enhanced Balik Pinay! Balik Hanapbuhay! (EBPBH) Program ng DMW Regional Office III."
    );
  };

  const totalProposedAmount = supplyItems.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToCommitment || !agreedToKasulatan) {
      setError("Kinakailangang sumang-ayon sa ELPOR Form C (Commitment) at Kasulatan bago isumite ang aplikasyon.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/migrants/balik-pinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programComponent,
          photoDataUrl: photoDataUrl || null,
          lastName,
          firstName,
          middleName,
          suffix,
          houseNumber,
          street,
          barangay,
          birthdate,
          age: Number(age) || null,
          sex,
          civilStatus,
          otherData,
          cellphone1,
          cellphone2,
          emailOrFb,
          workerCategory,
          jobsiteCountry,
          jobPosition,
          latestDepartureDate,
          latestContractDuration,
          latestArrivalDate,
          passportNumber,
          proposedBusinessType,
          businessLocation,
          hasExistingBusiness,
          existingBusinessDetails,
          trainingKind,
          trainingVenue,
          trainingIssuedBy,
          trainingDate,
          reasonForReturn,
          briefStatement,
          suppliesAndEquipment: supplyItems,
          totalProposedAmount,
          businessCanvas,
          documentsChecklist: docsChecklist,
          agreedToCommitment,
          agreedToKasulatan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nabigong isumite ang ELPOR Application.");
      } else {
        setSubmittedApp(data.application);
        setActiveApp(data.application);
        setLookupControlNo(data.controlNo);
      }
    } catch (err) {
      setError("Network error habang nagsusumite ng aplikasyon.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupControlNo.trim()) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(
        `/api/v1/migrants/balik-pinas?controlNo=${encodeURIComponent(lookupControlNo.trim().toUpperCase())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Application Control No. not found.");
        setActiveApp(null);
      } else {
        setActiveApp(data.application);
      }
    } catch (err) {
      setLookupError("Failed to look up application.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleStaffUpdate = async (id: string, updates: any) => {
    try {
      const res = await fetch("/api/v1/migrants/balik-pinas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        fetchStaffApps();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 print:hidden">
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
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider">
                DMW Regional Office III • ELPOR Forms A, A2, B, B1, C &amp; Kasulatan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Balik Pinas! Balik Hanapbuhay! &amp; ELPOR Livelihood Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Online Application at Printable 6-Page Official Form Generator para sa <strong>Enhanced Balik Pinay! Balik Hanapbuhay! Program (EBPBH)</strong> at <strong>Expanded Livelihood Development Assistance Program (ELDAP)</strong> ng Department of Migrant Workers (DMW RO-III).
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("apply")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                activeTab === "apply"
                  ? "bg-amber-400 text-slate-950 shadow-lg"
                  : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Fill Up ELPOR Forms</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("print")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                activeTab === "print"
                  ? "bg-emerald-500 text-slate-950 shadow-lg"
                  : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>6-Page Printable Packet</span>
            </button>
            {isStaff && (
              <button
                type="button"
                onClick={() => setActiveTab("staff")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition ${
                  activeTab === "staff"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Staff Evaluation ({staffStats?.total ?? "..."})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: ONLINE DMW ELPOR APPLICATION (FORMS A, A2, B1, B, C & KASULATAN)
          ===================================================================== */}
      {activeTab === "apply" && (
        <div className="space-y-6 print:hidden">
          {submittedApp && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    Naisumite na ang Inyong DMW ELPOR Application!
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    Control No.:{" "}
                    <span className="font-mono text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                      {submittedApp.controlNo}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    Applicant: <strong>{submittedApp.fullName}</strong> • Negosyo:{" "}
                    <strong>{submittedApp.proposedBusinessType}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("print")}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Buksan at I-Print ang 6-Page DMW ELPOR Forms</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-300 shadow-sm p-6 sm:p-8 space-y-8">
            {/* Top Form Header with 2x2 Photo Box & Preset */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b-2 border-slate-900">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-900">
                  Republic of the Philippines • Department of Migrant Workers Regional Office III
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-950 uppercase">
                  ENHANCED LIVELIHOOD PROGRAM FOR OFW REINTEGRATION (ELPOR)
                </h2>
                <p className="text-xs text-slate-600">
                  Kumpletuhing sagutan ang lahat ng hinihinging impormasyon (DMW ELPOR Form A, A2, B, B1, C at Kasulatan).
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <label
                    className={`px-3.5 py-2 rounded-xl border text-xs font-black cursor-pointer flex items-center space-x-2 ${
                      programComponent === "EBPBH"
                        ? "bg-blue-900 text-white border-blue-900"
                        : "bg-slate-50 text-slate-800 border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="programComponent"
                      checked={programComponent === "EBPBH"}
                      onChange={() => setProgramComponent("EBPBH")}
                      className="hidden"
                    />
                    <span>☑ Enhanced Balik Pinay! Balik Hanapbuhay! Program (EBPBH)</span>
                  </label>
                  <label
                    className={`px-3.5 py-2 rounded-xl border text-xs font-black cursor-pointer flex items-center space-x-2 ${
                      programComponent === "ELDAP"
                        ? "bg-blue-900 text-white border-blue-900"
                        : "bg-slate-50 text-slate-800 border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="programComponent"
                      checked={programComponent === "ELDAP"}
                      onChange={() => setProgramComponent("ELDAP")}
                      className="hidden"
                    />
                    <span>☑ Expanded Livelihood Development Assistance Program (ELDAP)</span>
                  </label>
                </div>
              </div>

              {/* Right: 2x2 Picture Box + Sample Loader */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-28 h-28 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center p-2 text-center bg-slate-50 relative overflow-hidden">
                  {photoDataUrl ? (
                    <img src={photoDataUrl} alt="2x2 ID" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-[10px] font-black uppercase text-slate-900">PICTURE (2X2)</span>
                      <span className="text-[8px] text-slate-500 leading-tight mt-0.5">
                        ID picture with white background taken within last 6 months
                      </span>
                    </>
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer transition">
                    <span>Upload 2x2</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={loadSampleElpor}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Load Sample ELPOR Data</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION I: DATOS TUNGKOL SA OFW (ELPOR FORM A) */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
                I. DATOS TUNGKOL SA OFW (DMW ELPOR FORM A)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Surname / Apelyido *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Name / Pangalan *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">House Number</label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Street / Purok / Sitio</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Barangay (Dingalan) *</label>
                  <select
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  >
                    {DINGALAN_BARANGAYS.map((b) => (
                      <option key={b} value={b}>
                        Barangay {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">City/Municipality &amp; Province</label>
                  <input
                    type="text"
                    disabled
                    value="DINGALAN, AURORA"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-slate-100 text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Birthdate *</label>
                  <input
                    type="date"
                    required
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Edad (Age)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kasarian (Sex)</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  >
                    <option value="FEMALE">FEMALE</option>
                    <option value="MALE">MALE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Civil Status</label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  >
                    <option value="SINGLE">SINGLE</option>
                    <option value="MARRIED">MARRIED</option>
                    <option value="SEPARATED">SEPARATED</option>
                    <option value="WIDOWED">WIDOWED</option>
                  </select>
                </div>
              </div>

              {/* Other Data & Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-2">
                  <span className="block text-[11px] font-black uppercase text-slate-700">
                    Other Data (Sectoral Classification):
                  </span>
                  <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-800">
                    {[
                      { key: "isPwd", label: "Person with Disability" },
                      { key: "isSenior", label: "Senior Citizen" },
                      { key: "isSoloParent", label: "Solo Parent" },
                      { key: "isIp", label: "Indigenous People" },
                      { key: "isLgbtqia", label: "LGBTQIA+" },
                    ].map((item) => (
                      <label key={item.key} className="inline-flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(otherData as any)[item.key]}
                          onChange={(e) =>
                            setOtherData((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className="rounded text-blue-600"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Cellphone Number 1 *
                    </label>
                    <input
                      type="text"
                      required
                      value={cellphone1}
                      onChange={(e) => setCellphone1(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Category (Sea-based / Land-based)
                    </label>
                    <select
                      value={workerCategory}
                      onChange={(e) => setWorkerCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white"
                    >
                      <option value="LAND_BASED">Land-based OFW</option>
                      <option value="SEA_BASED">Sea-based (Seafarer)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Email Address / Active FB Account / Messenger
                    </label>
                    <input
                      type="text"
                      value={emailOrFb}
                      onChange={(e) => setEmailOrFb(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION II: DATOS TUNGKOL SA OFW EMPLOYMENT */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
                II. DATOS TUNGKOL SA OFW EMPLOYMENT (FORM A &amp; FORM A2)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jobsite / Bansang Pinagtatrabahuhan *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobsiteCountry}
                    onChange={(e) => setJobsiteCountry(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Position / Uri ng Trabaho *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobPosition}
                    onChange={(e) => setJobPosition(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Passport Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Latest Date of Departure in the Philippines
                  </label>
                  <input
                    type="date"
                    value={latestDepartureDate}
                    onChange={(e) => setLatestDepartureDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Latest Date of Arrival in the Philippines
                  </label>
                  <input
                    type="date"
                    value={latestArrivalDate}
                    onChange={(e) => setLatestArrivalDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Latest Contract Duration
                  </label>
                  <input
                    type="text"
                    value={latestContractDuration}
                    onChange={(e) => setLatestContractDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* SECTION III & IV: DATOS TUNGKOL SA NEGOSYO AT PAGSASANAY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
                  III. DATOS TUNGKOL SA NEGOSYO
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Type of Business o Uri ng Negosyo na Nais Umpisahan *
                  </label>
                  <input
                    type="text"
                    required
                    value={proposedBusinessType}
                    onChange={(e) => setProposedBusinessType(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Business Site o Kumpletong Lokasyon ng Negosyo *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
                  IV. MGA PAGSASANAY SA NEGOSYO
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kind of Training / Uri ng Pagsasanay (FAS-SBMT / EDT)
                    </label>
                    <input
                      type="text"
                      value={trainingKind}
                      onChange={(e) => setTrainingKind(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Venue o Lugar</label>
                    <input
                      type="text"
                      value={trainingVenue}
                      onChange={(e) => setTrainingVenue(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Date / Petsa</label>
                    <input
                      type="date"
                      value={trainingDate}
                      onChange={(e) => setTrainingDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ELPOR FORM A2: OFW STATEMENT FORM */}
            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-950">
                  DMW ELPOR FORM A2 — OFW STATEMENT FORM (Salaysay ng Pagbalik sa Pilipinas)
                </h3>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reason for Return to the Philippines (Dahilan ng Huling Pagbalik sa Pilipinas) *
                </label>
                <input
                  type="text"
                  required
                  value={reasonForReturn}
                  onChange={(e) => setReasonForReturn(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  BRIEF STATEMENT (Salaysay o Detalye kung ano ang dahilan ng balik sa Pilipinas) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={briefStatement}
                  onChange={(e) => setBriefStatement(e.target.value)}
                  className="w-full p-3 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>

            {/* ELPOR FORM B1: LISTAHAN NG PANIMULANG KAGAMITAN AT PRODUKTO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2 rounded-lg">
                <span className="text-xs font-black uppercase tracking-wider">
                  DMW ELPOR FORM B1 — LISTAHAN NG PANIMULANG KAGAMITAN AT PRODUKTO
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSupplyItems((prev) => [
                      ...prev,
                      { category: "PRODUKTO", supplierName: "", itemName: "", unitPrice: 0, quantity: 1 },
                    ])
                  }
                  className="px-2.5 py-1 bg-emerald-500 text-slate-950 rounded text-[11px] font-black flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-black uppercase text-slate-800">
                      <th className="p-2 text-left">Uri</th>
                      <th className="p-2 text-left">Pangalan ng Supplier</th>
                      <th className="p-2 text-left">Item / Produktong Bibilhin</th>
                      <th className="p-2 text-right">Magkano Bawat Item</th>
                      <th className="p-2 text-center">Bilang</th>
                      <th className="p-2 text-right">Kabuuang Halaga</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {supplyItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5">
                          <select
                            value={it.category}
                            onChange={(e) => {
                              const copy = [...supplyItems];
                              copy[idx].category = e.target.value as any;
                              setSupplyItems(copy);
                            }}
                            className="px-2 py-1 border border-slate-300 rounded font-bold text-[11px]"
                          >
                            <option value="PRODUKTO">PRODUKTO</option>
                            <option value="KAGAMITAN">KAGAMITAN</option>
                          </select>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={it.supplierName}
                            onChange={(e) => {
                              const copy = [...supplyItems];
                              copy[idx].supplierName = e.target.value.toUpperCase();
                              setSupplyItems(copy);
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded uppercase"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={it.itemName}
                            onChange={(e) => {
                              const copy = [...supplyItems];
                              copy[idx].itemName = e.target.value.toUpperCase();
                              setSupplyItems(copy);
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded uppercase"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={it.unitPrice}
                            onChange={(e) => {
                              const copy = [...supplyItems];
                              copy[idx].unitPrice = Number(e.target.value);
                              setSupplyItems(copy);
                            }}
                            className="w-28 px-2 py-1 border border-slate-300 rounded text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={it.quantity}
                            onChange={(e) => {
                              const copy = [...supplyItems];
                              copy[idx].quantity = Number(e.target.value);
                              setSupplyItems(copy);
                            }}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-mono"
                          />
                        </td>
                        <td className="p-1.5 text-right font-mono font-black text-slate-900">
                          ₱{((it.unitPrice || 0) * (it.quantity || 0)).toLocaleString()}
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSupplyItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50 border-t-2 border-slate-900 font-black">
                      <td colSpan={5} className="p-2.5 text-right uppercase">
                        KABUUANG HALAGA (Total Proposed Budget):
                      </td>
                      <td className="p-2.5 text-right font-mono text-sm text-emerald-900">
                        ₱{totalProposedAmount.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ELPOR FORM B: BUSINESS MODEL CANVAS */}
            <div className="space-y-3">
              <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
                DMW ELPOR FORM B — BUSINESS MODEL CANVAS (1. Business Idea • 2. Marketing • 3. Operations • 4. Finance)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: "businessIdea", label: "1. BUSINESS IDEA" },
                  { key: "customer", label: "2.1 CUSTOMER (Sino ang mamimili?)" },
                  { key: "location", label: "2.2 PWESTO O LUGAR" },
                  { key: "promotions", label: "2.3 PROMOTIONS" },
                  { key: "price", label: "2.4 PRESYO" },
                  { key: "process", label: "3.1 PROSESO (Business Operations)" },
                  { key: "resources", label: "3.2 RESOURCES" },
                  { key: "keyPartners", label: "3.3 KEY PARTNERS" },
                  { key: "startUpCost", label: "4.1 START UP COST" },
                  { key: "fundingSource", label: "4.2 PAGKUKUHANAN NG PUHUNAN" },
                  { key: "budget", label: "4.3 BUDGET ALLOCATION" },
                  { key: "projectedIncome", label: "4.4 KITA (Projected Monthly Profit)" },
                ].map((field) => (
                  <div key={field.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-[10px] font-black uppercase text-blue-950 mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={(businessCanvas as any)[field.key]}
                      onChange={(e) =>
                        setBusinessCanvas((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ELPOR FORM C (COMMITMENT) & KASULATAN CONSENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/70 p-5 rounded-2xl border border-blue-200">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToCommitment}
                  onChange={(e) => setAgreedToCommitment(e.target.checked)}
                  className="mt-1 rounded text-blue-600"
                />
                <span className="text-xs text-slate-800 leading-relaxed">
                  <strong>DMW ELPOR FORM C (Commitment):</strong> Pinatutunayan ko na ang tulong-pangkabuhayan mula sa DMW ay gagamitin lamang sa pagtatayo ng negosyo at magsusumite ako ng monthly progress report at larawan sa <strong>DMW Regional Office No. III (dmwro3.wrsd@dmw.gov.ph)</strong>.
                </span>
              </label>
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToKasulatan}
                  onChange={(e) => setAgreedToKasulatan(e.target.checked)}
                  className="mt-1 rounded text-blue-600"
                />
                <span className="text-xs text-slate-800 leading-relaxed">
                  <strong>KASULATAN (DMW Region 3):</strong> Lubos kong nauunawaan ang lahat ng patakaran at alituntunin ng DMW Region 3 hinggil sa paghihintay ng pondo at pagproseso ng aking aplikasyon sa ilalim ng LDAP / BPBH Program.
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {submitting
                    ? "Isinusumite ang ELPOR Application..."
                    : "Isumite ang Aplikasyon at Buuin ang 6-Page DMW ELPOR Forms"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 2: 6-PAGE PRINTABLE OFFICIAL DMW ELPOR PACKET (REPLICA OF PDF)
          ===================================================================== */}
      {activeTab === "print" && (
        <div className="space-y-6">
          <form
            onSubmit={handleLookup}
            className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden"
          >
            <div className="flex-1 flex items-center gap-2 w-full">
              <input
                type="text"
                placeholder="Enter Control No. (e.g. ELPOR-2026-XXXXXX)"
                value={lookupControlNo}
                onChange={(e) => setLookupControlNo(e.target.value.toUpperCase())}
                className="flex-1 px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl uppercase"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Load Packet</span>
              </button>
            </div>
            {activeApp && (
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print 6-Page Official DMW ELPOR Packet</span>
              </button>
            )}
          </form>

          {lookupError && (
            <p className="text-xs font-bold text-rose-600 print:hidden">{lookupError}</p>
          )}

          {activeApp && (
            <div className="space-y-8 max-w-4xl mx-auto text-slate-950 print:space-y-6">
              {/* PAGE 1: DMW ELPOR FORM A */}
              <div className="bg-white p-6 sm:p-8 border-2 border-slate-900 rounded-xl shadow print:shadow-none print:rounded-none">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div className="text-xs space-y-1">
                    <div className="font-bold">Program Component:</div>
                    <div>
                      [{activeApp.programComponent === "EBPBH" ? "X" : " "}] Enhanced Balik Pinay Balik Hanapbuhay Program (EBPBH)
                    </div>
                    <div>
                      [{activeApp.programComponent === "ELDAP" ? "X" : " "}] Expanded Livelihood Development Assistance Program (ELDAP)
                    </div>
                    <div className="pt-1 font-mono font-bold">
                      Control No.: <span className="underline">{activeApp.controlNo}</span> | Date Filed:{" "}
                      <span className="underline">{activeApp.dateFiled}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold">Republic of the Philippines</p>
                    <h3 className="text-sm font-black uppercase">DEPARTMENT OF MIGRANT WORKERS</h3>
                    <p className="text-[11px] font-bold">Regional Office - III</p>
                    <h4 className="text-xs font-black uppercase mt-1">
                      ENHANCED LIVELIHOOD PROGRAM FOR OFW REINTEGRATION (ELPOR)
                    </h4>
                    <p className="text-xs font-black">APPLICATION FORM</p>
                  </div>
                  <div className="w-24 h-24 border-2 border-slate-900 text-center flex flex-col items-center justify-center p-1 text-[9px] font-bold shrink-0">
                    <span className="text-[8px] font-mono">DMW ELPOR FORM A</span>
                    {activeApp.photoDataUrl ? (
                      <img src={activeApp.photoDataUrl} alt="2x2" className="w-full h-full object-cover" />
                    ) : (
                      <span>PICTURE (2X2)</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="bg-slate-200 px-2 py-1 font-black border border-slate-900">
                    I. DATOS TUNGKOL SA OFW
                  </div>
                  <div className="grid grid-cols-2 gap-2 border border-slate-900 p-2">
                    <div>
                      <strong>PANGALAN:</strong> {activeApp.fullName}
                    </div>
                    <div>
                      <strong>ADDRESS:</strong> {activeApp.houseNumber} {activeApp.street}, Brgy.{" "}
                      {activeApp.barangay}, {activeApp.municipality}, {activeApp.province}
                    </div>
                    <div>
                      <strong>BIRTHDATE:</strong> {activeApp.birthdate} | <strong>EDAD:</strong>{" "}
                      {activeApp.age || "-"} | <strong>KASARIAN:</strong> {activeApp.sex}
                    </div>
                    <div>
                      <strong>CIVIL STATUS:</strong> {activeApp.civilStatus} | <strong>CATEGORY:</strong>{" "}
                      {activeApp.workerCategory}
                    </div>
                    <div>
                      <strong>CELLPHONE:</strong> {activeApp.cellphone1}{" "}
                      {activeApp.cellphone2 ? `/ ${activeApp.cellphone2}` : ""}
                    </div>
                    <div>
                      <strong>EMAIL/FB:</strong> {activeApp.emailOrFb || "N/A"}
                    </div>
                  </div>

                  <div className="bg-slate-200 px-2 py-1 font-black border border-slate-900">
                    II. DATOS TUNGKOL SA OFW EMPLOYMENT
                  </div>
                  <div className="grid grid-cols-2 gap-2 border border-slate-900 p-2">
                    <div>
                      <strong>JOBSITE / BANSA:</strong> {activeApp.jobsiteCountry}
                    </div>
                    <div>
                      <strong>POSITION / URI NG TRABAHO:</strong> {activeApp.jobPosition}
                    </div>
                    <div>
                      <strong>LATEST DEPARTURE:</strong> {activeApp.latestDepartureDate || "-"} |{" "}
                      <strong>ARRIVAL:</strong> {activeApp.latestArrivalDate || "-"}
                    </div>
                    <div>
                      <strong>CONTRACT DURATION:</strong> {activeApp.latestContractDuration || "-"} |{" "}
                      <strong>PASSPORT NO.:</strong> {activeApp.passportNumber || "-"}
                    </div>
                  </div>

                  <div className="bg-slate-200 px-2 py-1 font-black border border-slate-900">
                    III. DATOS TUNGKOL SA NEGOSYO &amp; IV. MGA PAGSASANAY SA NEGOSYO
                  </div>
                  <div className="grid grid-cols-2 gap-2 border border-slate-900 p-2">
                    <div>
                      <strong>TYPE OF BUSINESS:</strong> {activeApp.proposedBusinessType}
                    </div>
                    <div>
                      <strong>BUSINESS SITE:</strong> {activeApp.businessLocation}
                    </div>
                    <div>
                      <strong>KIND OF TRAINING:</strong> {activeApp.trainingKind || "FAS-SBMT / EDT"}
                    </div>
                    <div>
                      <strong>ISSUED BY &amp; DATE:</strong> {activeApp.trainingIssuedBy || "DMW RO-III"} (
                      {activeApp.trainingDate || "-"})
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between items-end text-center">
                    <div className="w-64 border-t border-slate-900 pt-1 font-bold">
                      {activeApp.fullName}
                      <div className="text-[9px] font-normal">
                        KUMPLETONG PANGALAN AT LAGDA NG APLIKANTE
                      </div>
                    </div>
                    <div className="w-64 border-t border-slate-900 pt-1 font-bold">
                      ATTY. MARION S. SEVILLA
                      <div className="text-[9px] font-normal">
                        Regional Director — DMW Regional Office III
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 2: DMW ELPOR FORM A2 (OFW STATEMENT FORM) */}
              <div className="bg-white p-6 sm:p-8 border-2 border-slate-900 rounded-xl shadow print:shadow-none print:rounded-none">
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                  <span className="text-xs font-black">DEPARTMENT OF MIGRANT WORKERS — RO III</span>
                  <span className="text-xs font-mono font-bold border border-slate-900 px-2 py-0.5">
                    DMW ELPOR FORM A2
                  </span>
                </div>
                <h4 className="text-center font-black text-sm uppercase my-2">OFW STATEMENT FORM</h4>
                <div className="border border-slate-900 p-3 text-xs space-y-2">
                  <div>
                    <strong>PANGALAN:</strong> {activeApp.fullName}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <strong>JOBSITE/BANSA:</strong> {activeApp.jobsiteCountry}
                    </div>
                    <div>
                      <strong>JOB POSITION:</strong> {activeApp.jobPosition}
                    </div>
                    <div>
                      <strong>DEPARTURE / ARRIVAL:</strong> {activeApp.latestDepartureDate || "-"} /{" "}
                      {activeApp.latestArrivalDate || "-"}
                    </div>
                    <div>
                      <strong>REASON FOR RETURN:</strong> {activeApp.reasonForReturn}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-900">
                    <strong>
                      BRIEF STATEMENT (Salaysay o Detalye kung ano ang dahilan ng balik sa Pilipinas):
                    </strong>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{activeApp.briefStatement}</p>
                  </div>
                </div>
              </div>

              {/* PAGE 3 & 6: DMW ELPOR FORM C (COMMITMENT) & KASULATAN */}
              <div className="bg-white p-6 sm:p-8 border-2 border-slate-900 rounded-xl shadow print:shadow-none print:rounded-none space-y-4 text-xs">
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                  <span className="font-black">DMW ELPOR FORM C — COMMITMENT &amp; KASULATAN</span>
                  <span className="font-mono font-bold">Passport No.: {activeApp.passportNumber || "N/A"}</span>
                </div>
                <p className="leading-relaxed">
                  I, <strong>{activeApp.fullName}</strong>, of legal age, with principal address at{" "}
                  <strong>
                    Brgy. {activeApp.barangay}, {activeApp.municipality}, {activeApp.province}
                  </strong>
                  , do hereby state and undertake: (1) That I am an eligible beneficiary under ELPOR funded by DMW; (2) That the livelihood assistance will be used solely for putting up my small business (<strong>{activeApp.proposedBusinessType}</strong>); (3) That I will abide with the program guidelines; and (4) That I will allow monitoring and evaluation and submit monthly progress reports and pictures to <strong>DMW Regional Office No. III (dmwro3.wrsd@dmw.gov.ph)</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: STAFF EVALUATION ROSTER
          ===================================================================== */}
      {isStaff && activeTab === "staff" && (
        <div className="space-y-6 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                    <th className="p-3">Control No.</th>
                    <th className="p-3">Applicant OFW</th>
                    <th className="p-3">Program &amp; Business</th>
                    <th className="p-3">Proposed Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {staffApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-900">{app.controlNo}</td>
                      <td className="p-3">
                        <div className="font-black text-slate-900">{app.fullName}</div>
                        <div className="text-[11px] text-slate-500">
                          Brgy. {app.barangay} • {app.jobsiteCountry} ({app.jobPosition})
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-[10px]">
                          {app.programComponent}
                        </span>
                        <div className="font-bold text-slate-800 mt-0.5">{app.proposedBusinessType}</div>
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-800">
                        ₱{(app.totalProposedAmount || 20000).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <select
                          value={app.status}
                          onChange={(e) => handleStaffUpdate(app.id, { status: e.target.value })}
                          className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] font-black bg-slate-50"
                        >
                          <option value="SUBMITTED">SUBMITTED</option>
                          <option value="UNDER_EVALUATION">UNDER EVALUATION</option>
                          <option value="ENDORSED_TO_DMW_RO3">ENDORSED TO DMW RO-III</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="RELEASED">GRANT RELEASED</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveApp(app);
                            setLookupControlNo(app.controlNo);
                            setActiveTab("print");
                          }}
                          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View Forms</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

