import React from "react";
import prisma from "@/lib/prisma";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { LandingNavDrawer } from "@/components/layout/LandingNavDrawer";
import { PesoOrganizationalChart } from "@/components/public/PesoOrganizationalChart";
import { PesoSystemModulesFlipCards } from "@/components/public/PesoSystemModulesFlipCards";
import { OngoingTupadDemographicsSection } from "@/components/public/OngoingTupadDemographicsSection";
import { FacebookUpdatesSection } from "@/components/public/FacebookUpdatesSection";
import {
  ShieldCheck,
  MapPin,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Building2,
  ExternalLink,
  ChevronRight,
  Award,
  MessageSquare,
  FileCheck,
  Globe,
  CheckCircle2,
  Mail,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let programBeneficiaries: any[] = [];

  try {
    programBeneficiaries = await prisma.programBeneficiary.findMany({
      select: {
        id: true,
        beneficiary: {
          select: {
            barangay: true,
            sitio: true,
            sex: true,
            age: true,
            isSenior: true,
            isPwd: true,
            isIp: true,
            is4Ps: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Landing page demographics beneficiaries query fallback:", error);
  }

  return (
    <div id="hero" className="bg-slate-50 min-h-screen flex flex-col text-slate-800 selection:bg-blue-600 selection:text-white scroll-smooth font-sans relative">
      {/* 1. DICT GWT Top Utility Bar */}
      <section className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800 relative z-20" data-purpose="dict-gwt-utility-bar">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap text-[11px] sm:text-xs">
            <span className="font-semibold text-white">PESO Dingalan, Aurora</span>
            <span className="hidden sm:inline-block text-slate-600">|</span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <a className="hover:text-white transition-colors underline decoration-dotted" href="mailto:peso@dingalan.gov.ph">
                peso@dingalan.gov.ph
              </a>
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap ml-auto text-[11px] sm:text-xs">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Philippine Standard Time:</span>
              <span className="font-mono font-bold text-white">GMT+8 (PST)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Official Government Masthead with Dingalan & PESO Seals */}
      <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200 shadow-xs relative z-30" data-purpose="official-masthead">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            {/* Dingalan Municipal Seal */}
            <a href="#hero" className="shrink-0 transition-transform hover:scale-105" title="Official Seal of Dingalan, Aurora">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzJtsS2yijY8hMk7JlMmcqZzPXX7cMDa5QNrtlReRYohCUNOYCLchkJdB_tPnqplxiiBOjgOMSIYNudlOa2NXtmy42QQCqrxRZ_Pcvy-hRiPr_ADJyV7zIWwztW9OdXVbpJQN2vqDMQnXP487EV3u3rqTtgJIqqI1-KkYnYIPzfqxht9YFAFdjx5J30QVX3TQerELyu6MOtWcoT3MPEV6hXbrLzVdq8Bx7CqvR3js5SwMIKlVeM14Kgt4cZkOU7H8gaDw"
                alt="Official Seal of Dingalan, Aurora"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full shadow-xs border border-slate-200"
              />
            </a>

            {/* Department and Municipal Nomenclature */}
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-[11px] sm:text-xs tracking-wider uppercase text-slate-500 font-bold">
                  Republic of the Philippines • Province of Aurora
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-700 tracking-tight leading-snug mt-0.5 uppercase">
                MUNICIPALITY OF DINGALAN
              </h2>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                Public Employment Service Office (PESO)
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-1.5 mt-0.5">
                <span className="text-xs sm:text-sm text-emerald-700 font-extrabold uppercase tracking-wide">
                  PESO EC ACCESS
                </span>
              </div>
            </div>
          </div>

          {/* Authentic PESO Official Seal & Official PESO EC Access Emblem Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/images/peso-eccess-chrome-emblem.png"
              alt="Official PESO EC Access Emblem Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-2xl shadow-xs border border-slate-200 hover:scale-105 transition-transform"
            />
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtoUir3ZE52UnEYaw7AR9APtwPi3pEyJBFiuEUIbBsoGvXafd88xp6a33vjrxUZnUpw__3WElv2cDxVridP6KGVkxw4pCH5H73dbV9ZACrE_LxLpujsdC2YyxhXyLU6NoM26us_oh84MDWGwGKupSPueyvyDSFq_h_CBPp7KnSZHa0lU3LbmaZNQi-YTS7t-LeEFoUFFQtCMUJldN0DT-dRyjvhMqcBH6W4pv4DKMK5luQAc0nUsKvA5Vtq1gLHojM3qw"
              alt="PESO Public Employment Service Office Seal"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs border border-slate-200 hover:scale-105 transition-transform"
            />
          </div>
        </div>
      </header>

      {/* 3. Primary Navigation Bar with Sliding Drawer & MAEDUP! Login Button */}
      <LandingNavDrawer />

      {/* 4. 6-Module Integrated Digital Ecosystem Flipcards (Pinakataas na Portion ng Landing Page) */}
      <PesoSystemModulesFlipCards />

      {/* PESO Organizational Structure */}
      <PesoOrganizationalChart />


      {/* 8. Demographics of Ongoing TUPAD Program (Replicating Masterlist Summary Tabulation & Features) */}
      <OngoingTupadDemographicsSection beneficiaries={programBeneficiaries} />

      <FacebookUpdatesSection pageUrl="https://www.facebook.com/profile.php?id=100077407929199" accountType="PAGE" />

      {/* 10. Official Philippine DICT Government Web Template (GWT) Footer */}
      <footer className="bg-slate-950 text-slate-300 text-xs border-t-4 border-emerald-500 mt-auto" data-purpose="dict-gwt-official-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Bagong Pilipinas logo and Republic attribution */}
            <div className="md:col-span-4 flex items-start gap-4">
              <img
                src="/images/bagong-pilipinas-transparent.png"
                alt="Bagong Pilipinas Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0"
              />
              <div className="space-y-1">
                <h5 className="text-xs font-black uppercase text-white tracking-wider">
                  Republic of the Philippines
                </h5>
                <p className="text-[11px] text-slate-400">All content is in the public domain unless otherwise stated.</p>
                <p className="text-[11px] text-slate-400">Government Web Template (GWT) Compliant • DICT Standard</p>
                <div className="pt-1 text-slate-400 text-[10px]">
                  Copyright © 2026 Municipality of Dingalan • Public Employment Service Office.
                </div>
              </div>
            </div>

            {/* Center: System Links & Public Portals */}
            <div className="md:col-span-5 grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <h6 className="font-bold text-white uppercase tracking-wider mb-2 text-xs">Quick Navigation</h6>
                <ul className="space-y-1.5 text-slate-400">
                  <li>
                    <a href="/my-assignment/inquiry" className="hover:text-white hover:underline transition font-bold text-emerald-400">Work Area Assignment</a>
                  </li>
                  <li>
                    <a href="/apply/inquiry" className="hover:text-white hover:underline transition">Status Inquiry</a>
                  </li>
                  <li>
                    <a href="/apply/inquiry#message" className="hover:text-white hover:underline transition">Message &amp; Feedback</a>
                  </li>
                  <li>
                    <a href="/login" className="hover:text-white hover:underline transition">Staff &amp; Coordinator Portal</a>
                  </li>
                  <li>
                    <a href="/restrictions/checker" className="hover:text-white hover:underline transition">365-Day Eligibility</a>
                  </li>
                  <li>
                    <a href="#demographics" className="hover:text-white hover:underline transition">Program Demographics</a>
                  </li>
                </ul>
              </div>
              <div>
                <h6 className="font-bold text-white uppercase tracking-wider mb-2 text-xs">Data Privacy &amp; Portals</h6>
                <ul className="space-y-1.5 text-slate-400">
                  <li>
                    <a href="mailto:dpo@dingalan.gov.ph" className="hover:text-white hover:underline transition flex items-center space-x-1 text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>DPO Contact: dpo@dingalan.gov.ph</span>
                    </a>
                  </li>
                  <li>
                    <a href="https://dole.gov.ph" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition flex items-center space-x-1">
                      <span>DOLE Philippines</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </li>
                  <li>
                    <a href="https://dingalan.gov.ph" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition flex items-center space-x-1">
                      <span>Municipality of Dingalan</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </li>
                  <li>
                    <a href="/sync" className="hover:text-white hover:underline transition">Offline Sync Center</a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: PESO Dingalan GovTech Attribution */}
            <div className="md:col-span-3 flex flex-col items-start md:items-end text-left md:text-right space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/images/peso-eccess-chrome-emblem.png?v=ffeb0acf"
                  alt="PESO eCCESS Logo - PESO Dingalan GovTech"
                  className="w-12 h-12 object-contain"
                />
                <div className="text-left">
                  <span className="block text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                    Developed Locally By
                  </span>
                  <strong className="text-white text-xs block">PESO Dingalan GovTech</strong>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Pinondohan at binuo ng sariling talento ng mga kawani ng PESO Dingalan para sa bawat mamamayan.
              </p>
            </div>
          </div>

          {/* Privacy & Cookie Notice Banner in Footer */}
          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="leading-relaxed">
                🔒 <strong>Paunawa ukol sa Data Privacy &amp; Cookies:</strong> Ang PESO EC Access portal ay sumusunod sa <em>Data Privacy Act of 2012 (R.A. 10173)</em>. Gumagamit lamang ang sistemang ito ng <em>strictly functional cookies</em> at local browser storage (IndexedDB) para sa offline attendance scanning at session authentication. Para sa mga katanungan, makipag-ugnayan sa ating Data Protection Officer sa <a href="mailto:dpo@dingalan.gov.ph" className="text-emerald-400 underline">dpo@dingalan.gov.ph</a>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2 pt-1">
              <p>© 2026 PESO Dingalan • PESO EC Access • Municipality of Dingalan, Aurora. All Rights Reserved.</p>
              <p className="font-mono text-emerald-400 font-semibold">DOLE Aurora Field Office Partner Portal • NPC Compliant</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
