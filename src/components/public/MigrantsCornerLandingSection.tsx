"use client";

import React from "react";
import Link from "next/link";
import {
  Globe,
  Users,
  ShieldAlert,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Printer,
  MessageSquare,
  FileText,
  PhoneCall,
} from "lucide-react";

export function MigrantsCornerLandingSection() {
  return (
    <section
      id="migrants-corner"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24"
    >
      <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 rounded-3xl p-6 sm:p-10 text-white shadow-2xl border border-slate-800 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/15 pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                <span>Module 5 • Migrants&apos; Corner (OFW &amp; Seafarer Helpdesk)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[11px] font-bold">
                OFW Family Circle Federation Dingalan
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Serbisyo at Rehistrasyon para sa mga OFW, Marino (Seafarers), at Pamilyang Dingaleño
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Maaari nang mag-rehistro online sa <strong>OFW Family Circle Information Sheet</strong>, mag-ulat ng kaso sa <strong>OWWA / DMW Case Assistance Messenger</strong>, o mag-apply sa <strong>Balik Pinas! Balik Hanapbuhay! (ELPOR Livelihood Portal)</strong>.
            </p>
          </div>

          <Link
            href="/migrants"
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center space-x-2 shadow-lg shrink-0 transition"
          >
            <span>Buksan ang Migrants&apos; Corner Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3 Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: OFW Family Circle Registration */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 hover:border-emerald-400/60 rounded-2xl p-5 flex flex-col justify-between space-y-5 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                  OFW Information Sheet
                </span>
                <Users className="w-5 h-5 text-emerald-300" />
              </div>
              <h3 className="text-base font-black text-white">
                OFW Family Circle Membership Registration
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Opisyal na rehistrasyon at imbentaryo para sa mga OFW at kanilang pamilyang naninirahan sa Dingalan. May kasamang photo upload at printable <strong>OFW Information Sheet</strong>.
              </p>
              <ul className="space-y-1 text-[11px] text-emerald-200">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Estado ng Paninirahan at Pagtatrabaho Abroad</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Talaan ng Pamilya sa Dingalan at Skills Inventory</span>
                </li>
              </ul>
            </div>

            <Link
              href="/migrants/family-circle"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Mag-rehistro sa OFW Family Circle</span>
            </Link>
          </div>

          {/* Card 2: OFW & Seafarer Case Assistance */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 hover:border-rose-400/60 rounded-2xl p-5 flex flex-col justify-between space-y-5 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black uppercase">
                  OWWA &amp; DMW Helpdesk
                </span>
                <ShieldAlert className="w-5 h-5 text-rose-300" />
              </div>
              <h3 className="text-base font-black text-white">
                OFW &amp; Seafarer Case Assistance Messenger
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Two-way case reporting at welfare assistance para sa mga Land-Based OFWs at Sea-Based Seafarers na may problema sa kontrata, sahod, medikal, o repatriation.
              </p>
              <ul className="space-y-1 text-[11px] text-rose-200">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>OWWA &amp; DMW Documentary Checklist (Passport, SIRB, OEC)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Real-time Case Tracking Code &amp; Chat Thread</span>
                </li>
              </ul>
            </div>

            <Link
              href="/migrants/case-assistance"
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 shadow transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Mag-ulat ng Kaso / Case Messenger</span>
            </Link>
          </div>

          {/* Card 3: Balik Pinas! Balik Hanapbuhay! Portal */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 hover:border-amber-400/60 rounded-2xl p-5 flex flex-col justify-between space-y-5 transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  DMW RO-III ELPOR
                </span>
                <Briefcase className="w-5 h-5 text-amber-300" />
              </div>
              <h3 className="text-base font-black text-white">
                Balik Pinas! Balik Hanapbuhay! (ELPOR Portal)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Online livelihood application para sa mga nagbalik na OFW sa ilalim ng <strong>EBPBH</strong> at <strong>ELDAP</strong>, kumpleto sa printable 6-Page DMW ELPOR Forms.
              </p>
              <ul className="space-y-1 text-[11px] text-amber-200">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>ELPOR Form A, Form A2 (Salaysay) &amp; Form C (Commitment)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Form B (Business Model Canvas) &amp; Form B1 (Supplies)</span>
                </li>
              </ul>
            </div>

            <Link
              href="/migrants/balik-pinas"
              className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 shadow transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Mag-apply sa Balik Pinas Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

