"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  ShieldAlert,
  Briefcase,
  Users,
  Globe,
  PhoneCall,
  ArrowRight,
  FileText,
  Printer,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Search,
  ShieldCheck,
  Eye,
  RefreshCw,
  MapPin,
  Anchor,
  Plane,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isPesoPersonnel, isAdminUser, hasPermission } from "@/lib/permissions";

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

export default function MigrantsCornerHubPage() {
  const { user } = useAuth();
  const canViewPersonnelRecords = Boolean(
    user &&
      (isPesoPersonnel(user) ||
        isAdminUser(user) ||
        hasPermission(user.role, "migrants.read") ||
        hasPermission(user.role, "migrants.manage"))
  );

  const [summary, setSummary] = useState<{
    totalFamilyCircleMembers: number;
    totalCaseReports: number;
    totalBalikPinasApps: number;
  }>({
    totalFamilyCircleMembers: 0,
    totalCaseReports: 0,
    totalBalikPinasApps: 0,
  });

  // Staff / Admin / PESO Personnel Registry Viewer State
  const [activeRegistryTab, setActiveRegistryTab] = useState<
    "registered_users" | "cases_filed" | "balik_pinas" | "family_circle"
  >("registered_users");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("ALL");
  const [loadingRegistries, setLoadingRegistries] = useState(false);

  const [familyCircleList, setFamilyCircleList] = useState<any[]>([]);
  const [casesList, setCasesList] = useState<any[]>([]);
  const [balikPinasList, setBalikPinasList] = useState<any[]>([]);

  // Modal Inspector for viewing full household / case / application details inside the Hub
  const [inspectedRecord, setInspectedRecord] = useState<{
    type: "USER" | "CASE" | "BALIK_PINAS" | "FAMILY_CIRCLE";
    data: any;
  } | null>(null);

  useEffect(() => {
    fetch("/api/v1/migrants/family-circle?summary=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.summary) {
          setSummary(data.summary);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (canViewPersonnelRecords) {
      fetchAllMigrantRegistries();
    }
  }, [canViewPersonnelRecords]);

  const fetchAllMigrantRegistries = async () => {
    setLoadingRegistries(true);
    try {
      const [fcRes, casesRes, bpRes] = await Promise.all([
        fetch("/api/v1/migrants/family-circle"),
        fetch("/api/v1/migrants/cases"),
        fetch("/api/v1/migrants/balik-pinas"),
      ]);

      if (fcRes.ok) {
        const fcData = await fcRes.json();
        setFamilyCircleList(fcData.members || []);
      }
      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setCasesList(casesData.cases || []);
      }
      if (bpRes.ok) {
        const bpData = await bpRes.json();
        setBalikPinasList(bpData.applications || []);
      }
    } catch (e) {
      console.error("Failed to load Migrants' Hub staff registries:", e);
    } finally {
      setLoadingRegistries(false);
    }
  };

  // Consolidate all users who registered in the Migrants' Hub across the 3 registries
  const registeredMigrantsUsers = useMemo(() => {
    const map = new Map<string, any>();

    // 1. From OFW Family Circle Registry
    for (const m of familyCircleList) {
      const key = (m.ofwFullName || "").trim().toUpperCase();
      if (!key) continue;
      map.set(key, {
        key,
        fullName: m.ofwFullName,
        sex: m.ofwSex,
        birthdate: m.ofwBirthdate,
        photoDataUrl: m.photoDataUrl || null,
        barangay: m.dingalanBarangay || "Dingalan",
        countryOrVessel: m.countryOfWork,
        occupation: m.occupationAbroad,
        contactInfo: m.ofwContactInfo || m.familyContactInfo,
        representativeName: m.representativeName,
        programs: ["OFW Family Circle"],
        refCodes: [m.memberCode],
        latestAt: m.createdAt,
        rawFamilyCircle: m,
      });
    }

    // 2. From Balik Pinas! Balik Hanapbuhay! (ELPOR)
    for (const bp of balikPinasList) {
      const key = (bp.fullName || "").trim().toUpperCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        if (!existing.programs.includes(`Balik Pinas (${bp.programComponent})`)) {
          existing.programs.push(`Balik Pinas (${bp.programComponent})`);
        }
        existing.refCodes.push(bp.controlNo);
        if (!existing.photoDataUrl && bp.photoDataUrl) existing.photoDataUrl = bp.photoDataUrl;
        existing.rawBalikPinas = bp;
      } else {
        map.set(key, {
          key,
          fullName: bp.fullName,
          sex: bp.sex,
          birthdate: bp.birthdate,
          photoDataUrl: bp.photoDataUrl || null,
          barangay: bp.barangay || "Dingalan",
          countryOrVessel: bp.jobsiteCountry,
          occupation: bp.jobPosition,
          contactInfo: bp.cellphone1 || bp.emailOrFb,
          representativeName: "SELF (Returning OFW)",
          programs: [`Balik Pinas (${bp.programComponent})`],
          refCodes: [bp.controlNo],
          latestAt: bp.createdAt,
          rawBalikPinas: bp,
        });
      }
    }

    // 3. From OFW & Seafarer Case Assistance
    for (const c of casesList) {
      const key = (c.ofwFullName || "").trim().toUpperCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        if (!existing.programs.includes("Case Assistance")) {
          existing.programs.push("Case Assistance");
        }
        existing.refCodes.push(c.trackingCode);
        existing.rawCase = c;
      } else {
        map.set(key, {
          key,
          fullName: c.ofwFullName,
          sex: c.ofwSex || "N/A",
          birthdate: c.ofwBirthday || "N/A",
          photoDataUrl: null,
          barangay: c.reporterBarangay || "Dingalan",
          countryOrVessel: c.countryOrVessel,
          occupation: `${c.jobPosition} (${c.workerCategory})`,
          contactInfo: c.ofwContactAbroad || c.reporterContact,
          representativeName: c.reporterName,
          programs: ["Case Assistance"],
          refCodes: [c.trackingCode],
          latestAt: c.createdAt,
          rawCase: c,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    );
  }, [familyCircleList, balikPinasList, casesList]);

  // Filtered datasets for the 4 tabs
  const filteredRegisteredUsers = useMemo(() => {
    return registeredMigrantsUsers.filter((u) => {
      if (selectedBarangay !== "ALL" && u.barangay !== selectedBarangay) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.countryOrVessel?.toLowerCase().includes(q) ||
        u.occupation?.toLowerCase().includes(q) ||
        u.refCodes.some((r: string) => r?.toLowerCase().includes(q))
      );
    });
  }, [registeredMigrantsUsers, selectedBarangay, searchQuery]);

  const filteredCases = useMemo(() => {
    return casesList.filter((c) => {
      if (selectedBarangay !== "ALL" && c.reporterBarangay !== selectedBarangay) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.trackingCode?.toLowerCase().includes(q) ||
        c.ofwFullName?.toLowerCase().includes(q) ||
        c.countryOrVessel?.toLowerCase().includes(q) ||
        c.caseCategory?.toLowerCase().includes(q)
      );
    });
  }, [casesList, selectedBarangay, searchQuery]);

  const filteredBalikPinas = useMemo(() => {
    return balikPinasList.filter((bp) => {
      if (selectedBarangay !== "ALL" && bp.barangay !== selectedBarangay) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        bp.controlNo?.toLowerCase().includes(q) ||
        bp.fullName?.toLowerCase().includes(q) ||
        bp.proposedBusinessType?.toLowerCase().includes(q) ||
        bp.jobsiteCountry?.toLowerCase().includes(q)
      );
    });
  }, [balikPinasList, selectedBarangay, searchQuery]);

  const filteredFamilyCircle = useMemo(() => {
    return familyCircleList.filter((m) => {
      if (selectedBarangay !== "ALL" && m.dingalanBarangay !== selectedBarangay) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.memberCode?.toLowerCase().includes(q) ||
        m.ofwFullName?.toLowerCase().includes(q) ||
        m.countryOfWork?.toLowerCase().includes(q) ||
        m.representativeName?.toLowerCase().includes(q)
      );
    });
  }, [familyCircleList, selectedBarangay, searchQuery]);

  const handleUpdateCaseStatus = async (id: string, status: string) => {
    const res = await fetch("/api/v1/migrants/cases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) fetchAllMigrantRegistries();
  };

  const handleUpdateBalikPinasStatus = async (id: string, status: string) => {
    const res = await fetch("/api/v1/migrants/balik-pinas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) fetchAllMigrantRegistries();
  };

  const handleUpdateFamilyCircleStatus = async (id: string, membershipStatus: string) => {
    const res = await fetch("/api/v1/migrants/family-circle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, membershipStatus }),
    });
    if (res.ok) fetchAllMigrantRegistries();
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner (Accessible from the Landing Page) */}
      <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-300 px-3 py-1 rounded-full border border-white/15 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Balik sa Public Landing Page</span>
              </Link>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                Module 5 • Public Migrants&apos; Corner Hub
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-bold">
                DMW RO-III • OWWA RWO-III • OFW Family Circle Dingalan
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Migrants&apos; Corner — OFW &amp; Seafarer Helpdesk Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pinagsamang digital portal ng <strong>PESO Dingalan</strong> at <strong>OFW Family Circle Federation</strong> para sa mabilis na sumbungan at koordinasyon sa <strong>OWWA / DMW</strong>, tulong-pangkabuhayan sa ilalim ng <strong>Balik Pinas! Balik Hanapbuhay! (ELPOR)</strong>, at opisyal na <strong>OFW Information Sheet &amp; Family Circle Registry</strong>.
            </p>
          </div>

          {/* Live Stats Box with Official OFW Family Circle Seal */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto shrink-0">
            <a
              href="https://imgbb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 hidden sm:block"
              title="OFW Family Circle Federation Dingalan"
            >
              <img
                src="https://i.ibb.co/pjJmZRNT/dingalan-1.png"
                alt="OFW Family Circle Dingalan"
                className="w-20 h-20 object-contain rounded-full bg-white p-1 shadow-lg border-2 border-emerald-400"
              />
            </a>
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                  Family Circle
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
                  {summary.totalFamilyCircleMembers}
                </p>
                <span className="text-[10px] text-slate-300">OFW Households</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold uppercase text-rose-300 block">
                  Case Desk
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
                  {summary.totalCaseReports}
                </p>
                <span className="text-[10px] text-slate-300">Cases Filed</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold uppercase text-amber-300 block">
                  ELPOR / BPBH
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
                  {summary.totalBalikPinasApps}
                </p>
                <span className="text-[10px] text-slate-300">Applicants</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Public Service Portals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillar 1: OFW & Seafarer Case Assistance */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 hover:border-rose-400 shadow-sm hover:shadow-xl transition p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black uppercase">
                OWWA &amp; DMW Mandated
              </span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                1. OFW &amp; Seafarer Case Assistance
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Two-way Case Messaging at Welfare Assistance Desk para sa mga Land-Based OFWs at Sea-Based Seafarers na nangangailangan ng emergency repatriation, unpaid salary claims, medical/disability claims, o legal aid.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>OWWA &amp; DMW Documentary Checklist (Passport, SIRB, SEC/OEC)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Real-time Case Tracking Code &amp; Direct Chat Thread</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Endorsement to DMW RO-III, OWWA RWO-III &amp; MARINA</span>
              </li>
            </ul>
          </div>

          <Link
            href="/migrants/case-assistance"
            className="w-full py-3 px-4 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Buksan ang Case Assistance &amp; Messenger</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Pillar 2: Balik Pinas! Balik Hanapbuhay! (ELPOR Portal) */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-black uppercase">
                DMW RO-III ELPOR Forms
              </span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                2. Balik Pinas! Balik Hanapbuhay! Portal
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Livelihood Reintegration Application para sa mga nagbalik na OFW sa ilalim ng <strong>Enhanced Balik Pinay! Balik Hanapbuhay! (EBPBH)</strong> at <strong>Expanded Livelihood Development Assistance Program (ELDAP)</strong>.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>DMW ELPOR Form A (Application) &amp; Form A2 (OFW Statement)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Form B (Business Model Canvas) &amp; Form B1 (Supplies/Equipment)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Form C (Commitment), Kasulatan &amp; 6-Page Printable Packet</span>
              </li>
            </ul>
          </div>

          <Link
            href="/migrants/balik-pinas"
            className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow transition"
          >
            <FileText className="w-4 h-4" />
            <span>Mag-apply sa Balik Pinas / ELPOR Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Pillar 3: OFW Family Circle Membership Registration */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-xl transition p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-black uppercase">
                Official Dingalan Registry
              </span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                3. OFW Family Circle Membership Registry
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Opisyal na <strong>OFW Information Sheet</strong> at Resource Database para sa mga OFW at kanilang pamilyang naninirahan sa 11 barangay ng Dingalan para sa mabilis na monitoring, tracking, at inventory.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Official Dingalan OFW Information Sheet with Photo Upload</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>8-Row Household Family Dependents &amp; Skills Inventory</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Printable Official OFW Information Sheet &amp; Member Code</span>
              </li>
            </ul>
          </div>

          <Link
            href="/migrants/family-circle"
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>Mag-rehistro sa OFW Family Circle</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* =====================================================================
          PESO STAFF, ADMIN & PESO PERSONNEL RECORDS & REGISTRY VIEWING HUB
          (Strictly accessible ONLY to PESO Staff, Admin & PESO Personnel)
          ===================================================================== */}
      {canViewPersonnelRecords ? (
        <div className="bg-white rounded-3xl border-2 border-blue-900/20 shadow-xl overflow-hidden">
          {/* Staff Hub Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 border-b border-slate-800 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorized PESO Staff, Admin &amp; Personnel Access Active</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Migrants&apos; Corner Hub — Master Registries &amp; Records Viewer
                </h2>
                <p className="text-xs text-slate-300">
                  Logged in as <strong>{user?.fullName}</strong> ({user?.role?.replace(/_/g, " ")}) • View and manage all registered users in the Migrants&apos; Hub, cases filed, Balik Pinas applicants, and the OFW Family Circle registry.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchAllMigrantRegistries}
                disabled={loadingRegistries}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 flex items-center space-x-1.5 self-start lg:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRegistries ? "animate-spin" : ""}`} />
                <span>Refresh Records</span>
              </button>
            </div>

            {/* 4 Registry Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveRegistryTab("registered_users")}
                className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between ${
                  activeRegistryTab === "registered_users"
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow-lg font-black"
                    : "bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-extrabold block opacity-80">
                    1. Migrants&apos; Hub Directory
                  </span>
                  <span className="text-xs sm:text-sm font-black">
                    Registered Users in Hub
                  </span>
                </div>
                <span className="text-lg font-mono font-black px-2.5 py-0.5 rounded-xl bg-black/15">
                  {registeredMigrantsUsers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRegistryTab("cases_filed")}
                className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between ${
                  activeRegistryTab === "cases_filed"
                    ? "bg-rose-600 text-white border-rose-400 shadow-lg font-black"
                    : "bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-extrabold block opacity-80">
                    2. OWWA &amp; DMW Helpdesk
                  </span>
                  <span className="text-xs sm:text-sm font-black">
                    Cases Filed (OFW &amp; Seafarer)
                  </span>
                </div>
                <span className="text-lg font-mono font-black px-2.5 py-0.5 rounded-xl bg-black/20">
                  {casesList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRegistryTab("balik_pinas")}
                className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between ${
                  activeRegistryTab === "balik_pinas"
                    ? "bg-blue-600 text-white border-blue-400 shadow-lg font-black"
                    : "bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-extrabold block opacity-80">
                    3. DMW RO-III Reintegration
                  </span>
                  <span className="text-xs sm:text-sm font-black">
                    Applicants for Balik Pinas
                  </span>
                </div>
                <span className="text-lg font-mono font-black px-2.5 py-0.5 rounded-xl bg-black/20">
                  {balikPinasList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRegistryTab("family_circle")}
                className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between ${
                  activeRegistryTab === "family_circle"
                    ? "bg-emerald-600 text-white border-emerald-400 shadow-lg font-black"
                    : "bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-extrabold block opacity-80">
                    4. Dingalan Migrants Sector
                  </span>
                  <span className="text-xs sm:text-sm font-black">
                    OFW Family Circle Registry
                  </span>
                </div>
                <span className="text-lg font-mono font-black px-2.5 py-0.5 rounded-xl bg-black/20">
                  {familyCircleList.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search & Barangay Filter Bar */}
          <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Migrant / OFW Name, Reference/Control Code, Country/Vessel, or Business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="ALL">All 11 Dingalan Barangays</option>
                {DINGALAN_BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    Barangay {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TAB 1 CONTENT: REGISTERED USERS IN MIGRANTS' HUB */}
          {activeRegistryTab === "registered_users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                    <th className="p-3.5">Migrant / OFW Profile</th>
                    <th className="p-3.5">Barangay in Dingalan</th>
                    <th className="p-3.5">Country / Vessel &amp; Work</th>
                    <th className="p-3.5">Contact &amp; Representative</th>
                    <th className="p-3.5">Registered Hub Programs</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loadingRegistries ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Loading registered migrants directory...
                      </td>
                    </tr>
                  ) : filteredRegisteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No registered migrants found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRegisteredUsers.map((u) => (
                      <tr key={u.key} className="hover:bg-slate-50">
                        <td className="p-3.5">
                          <div className="flex items-center space-x-3">
                            {u.photoDataUrl ? (
                              <img
                                src={u.photoDataUrl}
                                alt={u.fullName}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-300 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 font-black flex items-center justify-center shrink-0">
                                {u.fullName?.[0] || "M"}
                              </div>
                            )}
                            <div>
                              <div className="font-black text-slate-900">{u.fullName}</div>
                              <div className="text-[11px] text-slate-500">
                                {u.sex} • Born: {u.birthdate || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          Brgy. {u.barangay}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{u.countryOrVessel}</div>
                          <div className="text-[11px] text-slate-600">{u.occupation}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{u.contactInfo}</div>
                          <div className="text-[11px] text-slate-500">Rep: {u.representativeName}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {u.programs.map((p: string, i: number) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  p.includes("Family")
                                    ? "bg-emerald-100 text-emerald-900"
                                    : p.includes("Case")
                                    ? "bg-rose-100 text-rose-900"
                                    : "bg-blue-100 text-blue-900"
                                }`}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">
                            {u.refCodes.join(" • ")}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectedRecord({ type: "USER", data: u })}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Profile</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2 CONTENT: CASES FILED (OFW & SEAFARER CASE ASSISTANCE) */}
          {activeRegistryTab === "cases_filed" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                    <th className="p-3.5">Tracking Code</th>
                    <th className="p-3.5">OFW / Seafarer</th>
                    <th className="p-3.5">Case Category &amp; Urgency</th>
                    <th className="p-3.5">Reporter in Dingalan</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No OFW / Seafarer case reports found.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-black text-rose-700">{c.trackingCode}</td>
                        <td className="p-3.5">
                          <div className="font-black text-slate-900">{c.ofwFullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.workerCategory === "SEA_BASED" ? "⚓ Sea-Based" : "✈️ Land-Based"} • {c.countryOrVessel}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">
                            {c.caseCategory?.replace(/_/g, " ")}
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
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">{c.reporterName}</div>
                          <div className="text-[11px] text-slate-500">
                            Brgy. {c.reporterBarangay || "Dingalan"} • {c.reporterContact}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={c.status}
                            onChange={(e) => handleUpdateCaseStatus(c.id, e.target.value)}
                            className="px-2.5 py-1 border border-slate-300 rounded-lg text-[11px] font-black bg-white"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option>
                            <option value="ENDORSED_TO_DMW_OWWA">ENDORSED TO DMW/OWWA</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedRecord({ type: "CASE", data: c })}
                            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Case ({c.messages?.length || 0})</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3 CONTENT: APPLICANTS FOR BALIK PINAS! BALIK HANAPBUHAY! (ELPOR) */}
          {activeRegistryTab === "balik_pinas" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                    <th className="p-3.5">Control No.</th>
                    <th className="p-3.5">Applicant OFW</th>
                    <th className="p-3.5">Program &amp; Proposed Business</th>
                    <th className="p-3.5">Proposed Budget</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBalikPinas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No Balik Pinas / ELPOR applications found.
                      </td>
                    </tr>
                  ) : (
                    filteredBalikPinas.map((bp) => (
                      <tr key={bp.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-black text-blue-900">{bp.controlNo}</td>
                        <td className="p-3.5">
                          <div className="font-black text-slate-900">{bp.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            Brgy. {bp.barangay} • {bp.jobsiteCountry} ({bp.jobPosition})
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-[10px]">
                            {bp.programComponent}
                          </span>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {bp.proposedBusinessType}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-black text-emerald-800">
                          ₱{(bp.totalProposedAmount || 20000).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <select
                            value={bp.status}
                            onChange={(e) => handleUpdateBalikPinasStatus(bp.id, e.target.value)}
                            className="px-2.5 py-1 border border-slate-300 rounded-lg text-[11px] font-black bg-white"
                          >
                            <option value="SUBMITTED">SUBMITTED</option>
                            <option value="UNDER_EVALUATION">UNDER EVALUATION</option>
                            <option value="ENDORSED_TO_DMW_RO3">ENDORSED TO DMW RO-III</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="RELEASED">GRANT RELEASED</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectedRecord({ type: "BALIK_PINAS", data: bp })}
                            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Application</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4 CONTENT: OFW FAMILY CIRCLE REGISTRY */}
          {activeRegistryTab === "family_circle" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                    <th className="p-3.5">Member Code</th>
                    <th className="p-3.5">OFW Name &amp; Photo</th>
                    <th className="p-3.5">Country &amp; Occupation</th>
                    <th className="p-3.5">Residency / Contract</th>
                    <th className="p-3.5">Dingalan Family &amp; Barangay</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredFamilyCircle.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No OFW Family Circle registrations found.
                      </td>
                    </tr>
                  ) : (
                    filteredFamilyCircle.map((m) => {
                      let famCount = 0;
                      try {
                        famCount = JSON.parse(m.familyMembersJson || "[]").filter(
                          (f: any) => f.fullName?.trim()
                        ).length;
                      } catch (e) {}

                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-3.5 font-mono font-black text-emerald-900">
                            {m.memberCode}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center space-x-2.5">
                              {m.photoDataUrl ? (
                                <img
                                  src={m.photoDataUrl}
                                  alt={m.ofwFullName}
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-300"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 font-black flex items-center justify-center">
                                  {m.ofwLastName?.[0] || "O"}
                                </div>
                              )}
                              <div>
                                <div className="font-black text-slate-900">{m.ofwFullName}</div>
                                <div className="text-[11px] text-slate-500">
                                  {m.ofwSex} • Born {m.ofwBirthdate}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{m.countryOfWork}</div>
                            <div className="text-[11px] text-slate-600">{m.occupationAbroad}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                              {m.employmentStatus}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Residency: {m.abroadResidencyStatus}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">
                              Brgy. {m.dingalanBarangay} ({famCount} dependents)
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Rep: {m.representativeName} • {m.familyContactInfo}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={m.membershipStatus}
                              onChange={(e) =>
                                handleUpdateFamilyCircleStatus(m.id, e.target.value)
                              }
                              className="px-2.5 py-1 border border-slate-300 rounded-lg text-[11px] font-black bg-white"
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="VERIFIED">VERIFIED</option>
                              <option value="RETURNING_OFW">RETURNING OFW</option>
                              <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setInspectedRecord({ type: "FAMILY_CIRCLE", data: m })
                              }
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Household</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Locked Notice for Public Users (Only PESO Staff, Admin & Personnel can view registries) */
        <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                Migrants&apos; Hub Master Registries (PESO Staff, Admin &amp; Personnel Only)
              </h4>
              <p className="text-[11px] text-slate-600">
                Alinsunod sa Data Privacy Act of 2012, tanging mga awtorisadong PESO Staff, Admin, at PESO Personnel lamang ang maaaring tumingin sa masterlist ng mga nag-rehistro, nag-file ng kaso, at nag-apply sa Balik Pinas.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0"
          >
            PESO Staff Log In →
          </Link>
        </div>
      )}

      {/* Inspector Modal for Staff / Admin / Personnel */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {inspectedRecord.type.replace(/_/g, " ")} RECORD
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {inspectedRecord.data.fullName || inspectedRecord.data.ofwFullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRecord(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>

            {inspectedRecord.type === "USER" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <strong>Full Name:</strong> {inspectedRecord.data.fullName}
                  </div>
                  <div>
                    <strong>Barangay in Dingalan:</strong> {inspectedRecord.data.barangay}
                  </div>
                  <div>
                    <strong>Country / Vessel:</strong> {inspectedRecord.data.countryOrVessel}
                  </div>
                  <div>
                    <strong>Occupation:</strong> {inspectedRecord.data.occupation}
                  </div>
                  <div>
                    <strong>Contact Info:</strong> {inspectedRecord.data.contactInfo}
                  </div>
                  <div>
                    <strong>Representative:</strong> {inspectedRecord.data.representativeName}
                  </div>
                  <div className="col-span-2">
                    <strong>Reference Codes:</strong>{" "}
                    <span className="font-mono font-bold">
                      {inspectedRecord.data.refCodes.join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {inspectedRecord.type === "CASE" && (
              <div className="space-y-3 text-xs">
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-1.5">
                  <div>
                    <strong>Case Tracking Code:</strong>{" "}
                    <span className="font-mono font-bold">{inspectedRecord.data.trackingCode}</span>
                  </div>
                  <div>
                    <strong>Category &amp; Urgency:</strong>{" "}
                    {inspectedRecord.data.caseCategory?.replace(/_/g, " ")} (
                    {inspectedRecord.data.urgencyLevel})
                  </div>
                  <div>
                    <strong>Deployment / Vessel:</strong> {inspectedRecord.data.countryOrVessel} •{" "}
                    {inspectedRecord.data.jobPosition}
                  </div>
                  <div>
                    <strong>Reporter in Dingalan:</strong> {inspectedRecord.data.reporterName} (Brgy.{" "}
                    {inspectedRecord.data.reporterBarangay}) • {inspectedRecord.data.reporterContact}
                  </div>
                  <div className="pt-2 border-t border-rose-200">
                    <strong>Salaysay / Case Summary:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{inspectedRecord.data.caseSummary}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link
                    href="/migrants/case-assistance"
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold"
                  >
                    Open Full Case Messenger &amp; Endorsement Console →
                  </Link>
                </div>
              </div>
            )}

            {inspectedRecord.type === "BALIK_PINAS" && (
              <div className="space-y-3 text-xs">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-1.5">
                  <div>
                    <strong>Control No.:</strong>{" "}
                    <span className="font-mono font-bold">{inspectedRecord.data.controlNo}</span> (
                    {inspectedRecord.data.programComponent})
                  </div>
                  <div>
                    <strong>Proposed Business:</strong> {inspectedRecord.data.proposedBusinessType} (
                    {inspectedRecord.data.businessLocation})
                  </div>
                  <div>
                    <strong>Jobsite Abroad:</strong> {inspectedRecord.data.jobsiteCountry} •{" "}
                    {inspectedRecord.data.jobPosition}
                  </div>
                  <div>
                    <strong>Reason for Return:</strong> {inspectedRecord.data.reasonForReturn}
                  </div>
                  <div>
                    <strong>Salaysay (Form A2):</strong> {inspectedRecord.data.briefStatement}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link
                    href="/migrants/balik-pinas"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold"
                  >
                    Open Printable 6-Page DMW ELPOR Forms →
                  </Link>
                </div>
              </div>
            )}

            {inspectedRecord.type === "FAMILY_CIRCLE" && (
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-1.5">
                  <div>
                    <strong>Member Code:</strong>{" "}
                    <span className="font-mono font-bold">{inspectedRecord.data.memberCode}</span>
                  </div>
                  <div>
                    <strong>Country &amp; Occupation:</strong> {inspectedRecord.data.countryOfWork} •{" "}
                    {inspectedRecord.data.occupationAbroad}
                  </div>
                  <div>
                    <strong>Residency &amp; Employment Status:</strong>{" "}
                    {inspectedRecord.data.abroadResidencyStatus} /{" "}
                    {inspectedRecord.data.employmentStatus}
                  </div>
                  <div>
                    <strong>Dingalan Address &amp; Representative:</strong> Brgy.{" "}
                    {inspectedRecord.data.dingalanBarangay} ({inspectedRecord.data.dingalanPurokSitio || "N/A"}) • Rep:{" "}
                    {inspectedRecord.data.representativeName}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link
                    href="/migrants/family-circle"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                  >
                    Open &amp; Print Official OFW Information Sheet →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Hotlines & DMW / OWWA Coordination Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              OWWA &amp; DMW 24/7 Emergency Hotlines &amp; Regional Office III Directory
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Domestic Hotline: <strong className="text-amber-300 font-mono">1348</strong> • International / Overseas Calls:{" "}
              <strong className="text-amber-300 font-mono">(+632) 1348</strong> • DMW RO-III Reintegration Email:{" "}
              <strong className="text-emerald-300 font-mono">dmwro3.wrsd@dmw.gov.ph</strong>
            </p>
          </div>
        </div>
        <Link
          href="/migrants/case-assistance"
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shrink-0"
        >
          🚨 Report Emergency Distress Case
        </Link>
      </div>
    </div>
  );
}
