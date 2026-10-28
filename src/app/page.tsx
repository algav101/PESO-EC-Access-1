import React from "react";
import prisma from "@/lib/prisma";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { LandingNavDrawer } from "@/components/layout/LandingNavDrawer";
import { PublicStatusInquiryCard } from "@/components/public/PublicStatusInquiryCard";
import { PublicInquiryMessageForm } from "@/components/public/PublicInquiryMessageForm";
import { PublicWorkAssignmentLookupCard } from "@/components/public/PublicWorkAssignmentLookupCard";
import { PesoOrganizationalChart } from "@/components/public/PesoOrganizationalChart";
import { OngoingTupadDemographicsSection } from "@/components/public/OngoingTupadDemographicsSection";
import { MigrantsCornerLandingSection } from "@/components/public/MigrantsCornerLandingSection";
import {
  ShieldCheck,
  MapPin,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle,
  Search,
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
  Video,
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
    <div className="bg-slate-50 min-h-screen flex flex-col text-slate-800 selection:bg-blue-600 selection:text-white scroll-smooth font-sans relative">
      {/* Official PESO EC Access Emblem Logo Page Background Watermark */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
      >
        <img
          src="/images/peso-ec-access-emblem.gif"
          alt="PESO EC Access Official Emblem Watermark"
          className="w-[90vw] max-w-[850px] object-contain opacity-[0.045] select-none scale-110 filter blur-[0.2px]"
        />
      </div>

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
            <a
              href="/restrictions/checker"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded border border-slate-700 font-bold transition flex items-center space-x-1"
            >
              <Search className="w-3 h-3 text-amber-400" />
              <span>365-Day Checker</span>
            </a>
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
              src="/images/peso-ec-access-emblem.gif"
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

      {/* 4. EXACT Hero Section / Foreword of PESO EC Access */}
      <section id="hero" className="py-8 sm:py-12 bg-gradient-to-b from-slate-100/90 via-white/80 to-slate-50/90 border-b border-slate-200 scroll-mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto space-y-6 bg-white p-6 sm:p-10 lg:p-12 rounded-3xl border border-slate-200 shadow-sm">
            {/* Big Main Tagalog Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.12] tracking-tight">
              Pagpapalakas ng Serbisyo ng PESO upang mas maipa-DAMA sa bawat Pamilyang DINGALEÑO
            </h2>

            {/* Digital Announcement Subtitle */}
            <div className="text-base sm:text-lg font-black text-blue-950 flex items-center gap-2 flex-wrap">
              <span>🚀 DIGITAL NA ANG SERBISYO NG PESO DINGALAN!</span>
              <span className="text-xl">💻📱</span>
            </div>

            {/* Introduction Paragraph */}
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
              Ipinakikilala ang <strong className="text-slate-900 font-bold">PESO EC Access</strong> — ang bagong digital portal na magpapadali sa mga programa at serbisyo ng Public Employment Service Office para sa bawat mamamayan ng Dingalan!
            </p>

            {/* Warm Yellow/Amber Highlight Box */}
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-xl p-5 sm:p-6 text-sm sm:text-base text-amber-950 shadow-sm space-y-2">
              <div className="font-extrabold text-amber-900 flex items-center gap-1.5 tracking-wide uppercase text-sm sm:text-base">
                <span>🌟</span> KAHANGA-HANGA AT PROUDLY LOCAL:
              </div>
              <p className="text-amber-900 leading-relaxed">
                💡 Higit sa lahat, ang sistemang ito ay <strong className="font-black text-slate-950">LIBRENG</strong> nabuo at pinondohan ng sariling husay at talento ng <strong className="font-black text-slate-950">PESO Dingalan team</strong> upang mas mapalapit ang teknolohiya at serbisyo sa tao!
              </p>
            </div>

            {/* Checklist of Features in 2 Columns */}
            <div className="space-y-3 pt-2">
              <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                <span>🛠️</span> Mga Tampok na Serbisyo:
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                  <span className="text-purple-700 font-bold">✔</span>
                  <span>
                    <a href="/apply" className="hover:underline font-bold text-slate-900">
                      Mag-apply Online
                    </a>{" "}
                    para sa programang TUPAD kahit nasa bahay
                  </span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                  <span className="text-purple-700 font-bold">✔</span>
                  <span>
                    <a href="#inquiry" className="hover:underline font-bold text-slate-900">
                      I-check ang Status
                    </a>{" "}
                    ng aplikasyon anumang oras
                  </span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                  <span className="text-purple-700 font-bold">✔</span>
                  <span>
                    <a href="/restrictions/checker" className="hover:underline font-bold text-slate-900">
                      365-Day Checker
                    </a>{" "}
                    para sa patas at transparent na proseso
                  </span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                  <span className="text-purple-700 font-bold">✔</span>
                  <span>
                    <strong className="font-bold text-slate-900">Mabilis na QR Verification</strong> sa stubs, orientation, at attendance
                  </span>
                </li>
                <li className="flex items-start gap-2 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 hover:border-emerald-400 transition-colors sm:col-span-2">
                  <span className="text-emerald-700 font-bold">✔</span>
                  <span>
                    <a href="#work-assignment" className="hover:underline font-extrabold text-emerald-950">
                      Suriin ang Iyong TUPAD Work Area Assignment &amp; Iskedyul
                    </a>{" "}
                    gamit ang iyong Laminated QR ID
                  </span>
                </li>
                <li className="flex items-start gap-2 bg-blue-50/80 p-2.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors sm:col-span-2">
                  <span className="text-blue-700 font-bold">✔</span>
                  <span>
                    <a href="/migrants/family-circle" className="hover:underline font-extrabold text-blue-950">
                      Migrants&apos; Corner: OFW Family Circle Registration (OFW Info Sheet)
                    </a>
                    ,{" "}
                    <a href="/migrants/case-assistance" className="hover:underline font-bold text-rose-800">
                      OWWA/DMW Case Assistance
                    </a>{" "}
                    at{" "}
                    <a href="/migrants/balik-pinas" className="hover:underline font-bold text-emerald-900">
                      Balik Pinas! Balik Hanapbuhay! (ELPOR Portal)
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors sm:col-span-2">
                  <span className="text-purple-700 font-bold">✔</span>
                  <span>
                    <a href="#inquiry-form" className="hover:underline font-bold text-slate-900">
                      Direct Feedback Desk
                    </a>{" "}
                    para sa agarang sagot sa mga tanong
                  </span>
                </li>
              </ul>
            </div>

            {/* Hashtag Pill List */}
            <div className="flex flex-wrap gap-2 pt-2 text-xs font-semibold">
              <span className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1 rounded-full border border-sky-200 transition-colors">
                #PESOECAccess
              </span>
              <span className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1 rounded-full border border-sky-200 transition-colors">
                #SerbisyongDAMA
              </span>
              <span className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1 rounded-full border border-sky-200 transition-colors">
                #DigitalGovernance
              </span>
              <span className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1 rounded-full border border-sky-200 transition-colors">
                #Innovation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PESO Organizational Structure (DIRECTLY AFTER FOREWORD BEFORE VIDEO SHOWCASE) */}
      <PesoOrganizationalChart />

      {/* 6. Community Video Showcase Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-300/80 bg-slate-900 group">
          <video
            src="https://www.image2url.com/r2/default/videos/1788303848432-e7f6f01f-ef1c-4460-a6e4-99f8f2386145.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto max-h-[460px] object-cover block group-hover:scale-[1.01] transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-5 left-5 right-5 text-white space-y-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-sm shadow-xs">
              ● Community Employment in Action
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-100 drop-shadow">
              LGU Dingalan • DOLE Emergency Employment Program
            </p>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Direct government assistance providing temporary wage employment to displaced and marginalized workers.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Citizen Online Services Hub: Work Assignment, Status Inquiry & Feedback */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-900 text-[11px] font-bold border border-blue-200">
            <Globe className="w-3.5 h-3.5 text-blue-800" />
            <span>Citizen Online Services</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mabilis at Transparent na Serbisyong Publiko
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            I-click ang mga serbisyo sa ibaba upang suriin ang inyong work area assignment, i-check ang status ng aplikasyon, o magpadala ng direktang mensahe sa PESO Dingalan.
          </p>
        </div>

        {/* Feature 1: TUPAD Beneficiary Work Area Assignment & 10-Day Schedule Lookup (Dropdown Card) */}
        <div id="work-assignment" className="scroll-mt-28">
          <PublicWorkAssignmentLookupCard />
        </div>

        {/* Feature 2: Public Status Inquiry Card (Dropdown Card with DPA Compliance) */}
        <div id="inquiry" className="scroll-mt-28">
          <PublicStatusInquiryCard />
        </div>

        {/* Feature 3: Public Comments, Suggestions & Direct Feedback Form (Dropdown Card with DPA Compliance) */}
        <div id="inquiry-form" className="scroll-mt-28">
          <PublicInquiryMessageForm />
        </div>
      </section>

      {/* 7B. Module 5: Migrants' Corner (OFW & Seafarer Helpdesk, Balik Pinas ELPOR, & OFW Family Circle Registry) */}
      <MigrantsCornerLandingSection />

      {/* 8. Demographics of Ongoing TUPAD Program (Replicating Masterlist Summary Tabulation & Features) */}
      <OngoingTupadDemographicsSection beneficiaries={programBeneficiaries} />

      {/* 9. Community Impact Bento Grid & "TUPAD in Action" (#gallery) */}
      <section id="gallery" className="bg-slate-100/80 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Community Impact</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">TUPAD in Action</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Witnessing the tangible community impact of the Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers program across all 11 barangays of Dingalan.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[240px]">
            {/* Large Featured Photo */}
            <div className="md:col-span-8 md:row-span-2 relative rounded-3xl overflow-hidden group shadow-lg bg-slate-900">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_EnbyaoW-4YZlNS8tGeRXbD1jtVIsmX0GZR5ZoPa4jFq_yBPD9NPkkQy5ByeglES4jrLFpSmDO5YD2tSA_wLSijJIAMzBm8js85obCiwRjlXBWwsU0Q1QZOlA7C5tBhoKvK23U4JRQPUB0hDBfOfGw2GE7Ckazr1aEX79ceqDNWyhg0qMNtaTkNqOSjOsOVxjdQUxVnKDv9X19aYlSOGmjYrc1sI6TkGzfehQxl68n94NtEHy_FTr6jGTkABL4ICY"
                alt="Community Building in Dingalan"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <span className="inline-block px-2.5 py-0.5 bg-emerald-700 text-amber-200 font-bold text-xs rounded-lg mb-1">
                  Community Building
                </span>
                <h3 className="text-lg sm:text-xl font-black">Empowering Local Municipal Workforces</h3>
                <p className="text-xs text-slate-200 max-w-lg hidden sm:block">
                  Coordinated roadside clearing, public infrastructure maintenance, and coastal rehabilitation in partnership with DOLE.
                </p>
              </div>
            </div>

            {/* Top Right Card */}
            <div className="md:col-span-4 md:row-span-1 relative rounded-3xl overflow-hidden group shadow-md bg-slate-900">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBt43keY9O_wkuaRZgy1DjdkS85NghJZNyKv6TFIRJxERm4B2kdfPZ0eo8dPk97z_gf8Uo_4-J0C2VEl7VK8R1jhoG5HRstPtkc3iIeOWShYzQkFwsMxkoOPNEg0az6whN5CCZeMq2Ow4qYBC-9gGQQcjDlgIXRRJLHHGsy_QFh97a0E2H7DGBNF1bgZIirHOa9SW3eolQnuzXXrDbFQZDSjODBEOVtUNXHQVH16gKnROn_JAqeo57g6lmoY9IMBP1"
                alt="Environmental Initiatives"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-[10px] uppercase font-bold text-amber-300">Eco-Protection</span>
                <h3 className="text-sm font-bold">Environmental &amp; Coastal Cleanups</h3>
              </div>
            </div>

            {/* Bottom Right Highlight Card */}
            <div className="md:col-span-4 md:row-span-1 rounded-3xl bg-slate-900 text-white p-6 flex flex-col justify-between shadow-lg relative overflow-hidden border border-slate-800">
              <div className="space-y-1 relative z-10">
                <span className="text-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
                  Total Beneficiary Reach
                </span>
                <h3 className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">1,200+</h3>
                <p className="text-xs text-slate-300">
                  Beneficiaries deployed and supported across all 11 Dingalan barangays.
                </p>
              </div>

              <div className="relative z-10 pt-2 flex items-center justify-between border-t border-white/20 text-xs font-bold text-amber-300">
                <span>DOLE Standard Payout Verification Protocol</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>

              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 10. Official Philippine DICT Government Web Template (GWT) Footer */}
      <footer className="bg-slate-950 text-slate-300 text-xs border-t-4 border-emerald-500 mt-auto" data-purpose="dict-gwt-official-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Official Dingalan & Republic Seal */}
            <div className="md:col-span-4 flex items-start gap-4">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdLjXb3D00ozMiIultg70eDW8IauuGYYRWOfIb5L-EqF6vCKiUHEXbRyADxlNqcFxosVcZKBuRITgl6qNfgK73hRJFa1lD56DcD0AMmCKNgl9kKr5hv1rca3ZLtbRTHfhe_difkEaA-wprXoU5BUduSaxViw4jgsa3DG0O7DAl3bukd7cOm2Z6j6jCyuPDAPpIj-82IFEDwIOug8HM_U6QtI07NYPBnAJ9L3JXljMEXUd4oaxW9-NOww"
                alt="Official Seal of Dingalan, Aurora"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
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
                    <a href="#work-assignment" className="hover:text-white hover:underline transition font-bold text-emerald-400">TUPAD Work Assignment</a>
                  </li>
                  <li>
                    <a href="#inquiry" className="hover:text-white hover:underline transition">Status Inquiry</a>
                  </li>
                  <li>
                    <a href="#inquiry-form" className="hover:text-white hover:underline transition">Message &amp; Feedback</a>
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
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvYVCPFjIxa0fV6VbjMcRHswUa7xY-KmWk5PCUYL5SQxjeJ9DCXGALd1LQ_P1-xjUMOANrG7TP1PJWI4lJSk3yDUHFETxa31UNM6GjZlOmcT2QY54-h6y_hxY0iBMiQHKe-6ogYxQy98hgScijLTAF8Db6iUDfIQwBHjnHt76agYvvVY67Ya8L7TExPHIgcM3UHohFM0c_k6q7MALkRUhOn4AMDPoinFbSV2UrSPhiL71mYyVy29XoAg"
                  alt="PESO Logo"
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
