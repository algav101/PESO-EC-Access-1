import React from "react";
import prisma from "@/lib/prisma";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { PublicStatusInquiryCard } from "@/components/public/PublicStatusInquiryCard";
import { PublicInquiryMessageForm } from "@/components/public/PublicInquiryMessageForm";
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
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Award,
  MessageSquare,
  FileCheck,
  Globe,
  CheckCircle2,
  Lock,
  Clock,
  HelpCircle,
  Layers,
  Sparkle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let activePrograms: any[] = [];
  let totalBeneficiaries = 0;
  let totalAttendances = 0;
  let totalPaid = 0;

  try {
    activePrograms = await prisma.program.findMany({
      where: { status: "ACTIVE" },
      include: {
        _count: { select: { programBeneficiaries: true, workDays: true } },
        programBarangays: true,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    totalBeneficiaries = await prisma.programBeneficiary.count();
    totalAttendances = await prisma.attendanceRecord.count();
    totalPaid = await prisma.payout.count({ where: { status: "PAID" } });
  } catch (error) {
    console.error("Landing page queries fallback:", error);
  }

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col text-slate-800 selection:bg-blue-600 selection:text-white scroll-smooth font-sans">
      {/* 1. DICT GWT Top Utility Bar */}
      <section className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800" data-purpose="dict-gwt-utility-bar">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Contact Information */}
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

          {/* Philippine Standard Time & Accessibility */}
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

      {/* 2. Official Government Masthead with Authentic Dingalan & PESO Seals */}
      <header className="bg-white border-b border-slate-200 shadow-xs relative z-30" data-purpose="official-masthead">
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
                  PESO EC Access Portal
                </span>
              </div>
            </div>

            {/* Authentic PESO Official Seal & Transparent Logo Marks */}
            <div className="flex items-center gap-3 shrink-0">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtoUir3ZE52UnEYaw7AR9APtwPi3pEyJBFiuEUIbBsoGvXafd88xp6a33vjrxUZnUpw__3WElv2cDxVridP6KGVkxw4pCH5H73dbV9ZACrE_LxLpujsdC2YyxhXyLU6NoM26us_oh84MDWGwGKupSPueyvyDSFq_h_CBPp7KnSZHa0lU3LbmaZNQi-YTS7t-LeEFoUFFQtCMUJldN0DT-dRyjvhMqcBH6W4pv4DKMK5luQAc0nUsKvA5Vtq1gLHojM3qw"
                alt="PESO Public Employment Service Office Seal"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs border border-slate-200 hover:scale-105 transition-transform"
              />
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCItKj6QUue20tf4u2IqFvkQaalkEu69hmpiTtw3CZSSC-3h4zotuueIR2IUh1CQueexM-HvRtnavAPtigDgqsmzQ0drwmMCmjOWSIm2PLIHxowW15uzSuffJLpSmBqLNSFJ4sNZRYylydaqAQUjdiAtiHtrM2iZ742pQYg4VKQC7-NyxSlpIUdqpDbLDn46kxwyNliCAMwWcLj5JoLtDi0HuBvM_jWY9eUPZVChBIQFcfgy5p_K1HIQaNspZ6O35OuxhA"
                alt="PESO e-access Logo"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain hover:scale-105 transition-transform"
              />
            </div>
          </div>

          {/* Right MAEDUP! Staff & Coordinator Portal CTA */}
          <div className="flex items-center shrink-0">
            <a
              href="/login"
              className="group relative flex items-center gap-2 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-600 p-0.5 rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              title="MAEDUP! e PESO Access Login & Coordinator Terminal"
            >
              <div className="bg-slate-900 hover:bg-slate-800 text-white rounded-[14px] px-3.5 py-2 flex items-center gap-3 transition-colors">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAuFRrdS56G2DSbPoUVZz4HCox-4sYgn0iLcMXXnIy6XXQpXrJZC11lk8PhfZbUMkQLAuSEi9uN98FRwRJDzuefzCGGc_UgW5X9NaJlVUwvXe_hZHfbwuKjnUGVgJ74DjwombkIsngdU-OsZWW0rtI29btWxwK4uvz67PCxc3_E2Y4F6v-7EFYxvDrrLlKfwWmN7MCY9y2BCWKJ6Wbs9gOToCjss0c0fN8whfVE1uKHZjuLevN54R_Qx2kCZ3UuDm260U"
                  alt="MAEDUP! e PESO access Portal Login"
                  className="h-9 sm:h-11 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="text-left">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400 leading-none">
                    Staff & Coordinator
                  </span>
                  <span className="text-xs font-extrabold text-white flex items-center gap-1 mt-0.5">
                    Portal Log In <span className="text-xs text-emerald-400 group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </header>

      {/* 3. Sticky Sub-Navbar with Preserved Anchor Targets */}
      <nav aria-label="Quick Page Navigation" className="bg-slate-900 text-white border-b-2 border-emerald-500 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-13 text-xs font-bold">
          <div className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto py-2 no-scrollbar">
            <a
              href="#hero"
              className="text-emerald-400 border-b-2 border-emerald-400 pb-0.5 whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <span>Home</span>
            </a>
            <a
              href="/apply"
              className="text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-full border border-emerald-400 transition-all whitespace-nowrap flex items-center space-x-1.5 font-extrabold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Online TUPAD Application</span>
            </a>
            <a
              href="#inquiry"
              className="text-slate-200 hover:text-emerald-400 transition-colors whitespace-nowrap flex items-center space-x-1"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Application Status Inquiry</span>
            </a>
            <a
              href="#inquiry-form"
              className="text-slate-200 hover:text-emerald-400 transition-colors whitespace-nowrap flex items-center space-x-1"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Message & Feedback</span>
            </a>
            <a
              href="#programs"
              className="text-slate-200 hover:text-emerald-400 transition-colors whitespace-nowrap"
            >
              Active Programs
            </a>
            <a
              href="#gallery"
              className="text-slate-200 hover:text-emerald-400 transition-colors whitespace-nowrap"
            >
              TUPAD in Action
            </a>
            <a
              href="#org-structure"
              className="text-slate-200 hover:text-emerald-400 transition-colors whitespace-nowrap"
            >
              PESO Org Chart
            </a>
            <a
              href="/restrictions/checker"
              className="text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-full border border-amber-400/40 transition-colors flex items-center space-x-1 whitespace-nowrap font-bold"
            >
              <Search className="w-3.5 h-3.5 text-amber-300" />
              <span>Check Eligibility</span>
            </a>
          </div>

          <div className="hidden lg:flex items-center shrink-0 pl-2">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtqq1AnBWH-IzGl0TscldgxBJ_eyEGCS0nd9WZmSFUVAf4L7caXSH1ql5LKwwNGYrQxSDRH8ctQQlAJtTQhTf0YcatJbBY-2WCk4q-2-B7xqHWzGcNbALIlc8_2AjPiM6XNqJz1SKhth4ueruC9B4xKn_oypFD1xnFXZLL5fKWRPe4ra1UzHRCbkBmdowTklgFaPj6KVn3sY2Ch2nnAwbYsNAvjA4sYP5gfObxzMBHZJDJHGdtgOTN8yubzq8xruwNxGk"
              alt="e PESO access Logo"
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>
      </nav>

      {/* 4. Hero Section (#hero) */}
      <section id="hero" className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 scroll-mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Featured Video Showcase */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-300/80 bg-slate-900 group">
              <video
                src="https://www.image2url.com/r2/default/videos/1788303848432-e7f6f01f-ef1c-4460-a6e4-99f8f2386145.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-auto max-h-[480px] object-cover block group-hover:scale-[1.01] transition duration-500"
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
          </div>

          {/* Right Column: Hero Tagalog Headline, Announcement & Quick Action Grid */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-extrabold border border-blue-200/80 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Official PESO Dingalan Initiative</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Pagpapalakas ng Serbisyo ng PESO upang mas maipa-DAMA sa bawat Pamilyang DINGALEÑO
            </h1>

            <div className="space-y-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              <p className="font-extrabold text-blue-900 flex items-center space-x-1.5 text-base sm:text-lg">
                <span>🚀 DIGITAL NA ANG SERBISYO NG PESO DINGALAN! 💻📱</span>
              </p>

              <p>
                Ipinakikilala ang <strong className="text-slate-900 font-bold">PESO EC Access</strong> — ang bagong digital portal na magpapadali sa mga programa at serbisyo ng Public Employment Service Office para sa bawat mamamayan ng Dingalan!
              </p>

              <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-800 shadow-xs">
                <span className="font-black text-amber-900 block mb-0.5">🌟 KAHANGA-HANGA AT PROUDLY LOCAL:</span>
                <span>💡 Higit sa lahat, ang sistemang ito ay <strong className="text-amber-950 font-black">LIBRENG</strong> nabuo at pinondohan ng sariling husay at talento ng <strong className="text-slate-900 font-bold">PESO Dingalan team</strong> upang mas mapalapit ang teknolohiya at serbisyo sa tao!</span>
              </div>

              <div className="space-y-1.5 text-xs sm:text-sm pt-1">
                <p className="font-bold text-slate-900">🛠️ Mga Tampok na Serbisyo:</p>
                <ul className="grid grid-cols-1 gap-1.5 pl-1 text-slate-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">Mag-apply Online</strong> para sa programang TUPAD kahit nasa bahay</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">I-check ang Status</strong> ng aplikasyon anumang oras</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">365-Day Checker</strong> para sa patas at transparent na proseso</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">Mabilis na QR Verification</strong> sa stubs, orientation, at attendance</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">Direct Feedback Desk</strong> para sa agarang sagot sa mga tanong</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-bold text-blue-900">
                <span className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">#PESOECAccess</span>
                <span className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">#SerbisyongDAMA</span>
                <span className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">#DigitalGovernance</span>
                <span className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">#Innovation</span>
              </div>
            </div>

            {/* Quick Access Card Grid */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <a
                href="/apply"
                className="group p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl border border-emerald-500 shadow-md hover:shadow-lg transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-300 group-hover:scale-110 transition" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black leading-tight">Online Application</h2>
                    <p className="text-[10px] text-emerald-100 font-medium">Apply Online</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition" />
              </a>

              <a
                href="#inquiry"
                className="group p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold flex-shrink-0">
                    <FileCheck className="w-4 h-4 text-blue-800 group-hover:scale-110 transition" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 group-hover:text-blue-900 transition leading-tight">Status Inquiry</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Check Status</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-900 group-hover:translate-x-0.5 transition" />
              </a>

              <a
                href="#inquiry-form"
                className="group p-3.5 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-blue-800 group-hover:scale-110 transition" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 group-hover:text-blue-900 transition leading-tight">Direct Message</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Send Feedback</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-900 group-hover:translate-x-0.5 transition" />
              </a>

              <a
                href="/restrictions/checker"
                className="group p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                    <Search className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 group-hover:text-amber-700 transition leading-tight">365-Day Checker</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Check Eligibility</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Live Telemetry & Program Statistics Strip */}
      <section aria-label="Key Municipal Impact Metrics" className="bg-slate-900 text-white py-8 border-y border-slate-800 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                {totalBeneficiaries.toLocaleString()}
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-300 mt-1">
                Verified Beneficiaries
              </div>
              <div className="text-[10px] text-slate-400">Total Enrolled in System</div>
            </div>

            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-blue-300 font-mono">
                {totalAttendances.toLocaleString()}
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-300 mt-1">
                Attendance Scans Logged
              </div>
              <div className="text-[10px] text-slate-400">QR Verified Work Logs</div>
            </div>

            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                {totalPaid.toLocaleString()}
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-300 mt-1">
                Completed Payouts
              </div>
              <div className="text-[10px] text-slate-400">DOLE Standard Compensation</div>
            </div>

            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                11 / 11
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-300 mt-1">
                Barangays Covered
              </div>
              <div className="text-[10px] text-emerald-400">Full Dingalan Deployment</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Citizen Online Services Hub: Public Status Inquiry & Direct Feedback */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-900 text-[11px] font-bold border border-blue-200">
            <Globe className="w-3.5 h-3.5 text-blue-800" />
            <span>Citizen Online Services</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mabilis at Transparent na Serbisyong Publiko
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            I-check ang estado ng iyong aplikasyon o magpadala ng direktang mensahe at mungkahi sa Tanggapan ng PESO Dingalan.
          </p>
        </div>

        {/* Feature 1: Public Status Inquiry Card */}
        <div id="inquiry" className="scroll-mt-28">
          <PublicStatusInquiryCard />
        </div>

        {/* Feature 2: Public Comments, Suggestions & Direct Feedback Form */}
        <div id="inquiry-form" className="scroll-mt-28">
          <PublicInquiryMessageForm />
        </div>
      </section>

      {/* 7. Active TUPAD Work Programs Hub (#programs) */}
      <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>DOLE - PESO Partnership</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Active TUPAD Work Programs</h2>
            <p className="text-xs text-slate-500">Current emergency community employment projects deployed across Dingalan</p>
          </div>
          <a
            href="/login"
            className="text-xs font-bold text-blue-900 hover:text-blue-950 flex items-center space-x-1 transition-colors group"
          >
            <span>View All Programs in Hub</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activePrograms.map((prog) => (
            <div
              key={prog.id}
              className="gov-card p-6 space-y-4 gov-card-hover border-t-4 border-t-emerald-600 bg-white flex flex-col justify-between rounded-2xl shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      {prog.programCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{prog.programName}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {prog.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{prog.projectLocation || "Municipality of Dingalan"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{prog.requiredWorkDays} Working Days Schedule</span>
                  </div>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong className="text-slate-800">Nature of Work: </strong>
                    {prog.natureOfWork || "Community cleaning, environmental protection, and disaster risk reduction."}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">{prog._count.programBeneficiaries} Beneficiaries Enrolled</span>
                <a
                  href={`/programs/${prog.id}`}
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 group"
                >
                  <span>Program Details</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Community Impact Bento Grid & "TUPAD in Action" (#gallery) */}
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
                <h3 className="text-sm font-bold">Environmental & Coastal Cleanups</h3>
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
                <span>100% Cash Payout Compliance</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>

              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 9. PESO Dingalan Organizational Structure (#org-structure) */}
      <section id="org-structure" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 scroll-mt-20">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-900 text-[11px] font-bold border border-blue-200">
            <Building2 className="w-3.5 h-3.5 text-blue-800" />
            <span>Public Employment Service Office</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            PESO Dingalan Organizational Structure
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            The dedicated administrative leadership and field coordinators executing the TUPAD EC program in Dingalan.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDN8Ny5eh3j7XXuXv2Vc0-1mj7lYhtg1JC7WDBy-NLkzb-MsEy9tOxi0aw782zPcxbZTK1GZYK5FkuWlBO9gZET_ZBtBAqhClHq5oARWR_p3YeTY_imh9_K67eKuYDCMT4shXHh1My7Y168aoEuHLfpQY-PdnluhcbR5AHjPQQk7F4uHsuegMDVRIO2lRweiajb3AMwV7Rs8J5p9affuNwnEPyG5tsyYhg7PepIldtNMNEql-NHw4MkG2uxYUrYF4KM"
              alt="PESO Dingalan Organizational Structure Chart"
              className="w-full h-auto object-contain block"
            />
          </div>
        </div>
      </section>

      {/* 10. Official Philippine DICT Government Web Template (GWT) Footer */}
      <footer className="bg-slate-950 text-slate-300 text-xs border-t-4 border-emerald-500 mt-auto" data-purpose="dict-gwt-official-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
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
                    <a href="#inquiry" className="hover:text-white hover:underline transition">Status Inquiry</a>
                  </li>
                  <li>
                    <a href="#inquiry-form" className="hover:text-white hover:underline transition">Message & Feedback</a>
                  </li>
                  <li>
                    <a href="/login" className="hover:text-white hover:underline transition">Staff & Coordinator Portal</a>
                  </li>
                  <li>
                    <a href="/restrictions/checker" className="hover:text-white hover:underline transition">365-Day Eligibility</a>
                  </li>
                  <li>
                    <a href="#programs" className="hover:text-white hover:underline transition">Active Programs</a>
                  </li>
                </ul>
              </div>
              <div>
                <h6 className="font-bold text-white uppercase tracking-wider mb-2 text-xs">Government Portals</h6>
                <ul className="space-y-1.5 text-slate-400">
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

          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <p>© 2026 PESO Dingalan • PESO EC Access • Municipality of Dingalan, Aurora. All Rights Reserved.</p>
            <p className="font-mono text-emerald-400 font-semibold">DOLE Aurora Field Office Partner Portal</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
