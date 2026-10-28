"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  ShieldAlert,
  Briefcase,
  Users,
  Globe,
  Anchor,
  Plane,
  PhoneCall,
  ArrowRight,
  FileText,
  Printer,
  MessageSquare,
  CheckCircle2,
  Building2,
  ArrowLeft,
} from "lucide-react";

export default function MigrantsCornerHubPage() {
  const [summary, setSummary] = useState<{
    totalFamilyCircleMembers: number;
    totalCaseReports: number;
    totalBalikPinasApps: number;
  }>({
    totalFamilyCircleMembers: 0,
    totalCaseReports: 0,
    totalBalikPinasApps: 0,
  });

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

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-300 px-3 py-1 rounded-full border border-white/15 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Public Landing Page</span>
              </Link>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                Module 5 • Operational
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-bold">
                DMW RO-III • OWWA RWO-III • OFW Family Circle Dingalan
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Migrants&apos; Corner — OFW &amp; Seafarer Helpdesk
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pinagsamang digital portal ng <strong>PESO Dingalan</strong> at <strong>OFW Family Circle Federation</strong> para sa mabilis na sumbungan at koordinasyon sa <strong>OWWA / DMW</strong>, tulong-pangkabuhayan sa ilalim ng <strong>Balik Pinas! Balik Hanapbuhay! (ELPOR)</strong>, at opisyal na <strong>OFW Information Sheet &amp; Family Circle Registry</strong>.
            </p>
          </div>

          {/* Live Stats Box */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
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
              <span className="text-[10px] text-slate-300">Active Cases</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-300 block">
                ELPOR / BPBH
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
                {summary.totalBalikPinasApps}
              </p>
              <span className="text-[10px] text-slate-300">Applications</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Module Pillars */}
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

