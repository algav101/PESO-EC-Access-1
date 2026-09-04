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
  TreePine,
  Layers,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Award,
  MessageSquare,
  FileCheck,
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
    <div className="bg-slate-50 min-h-screen flex flex-col selection:bg-gov-blue selection:text-white">
      {/* Secondary Sticky Navigation Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12 text-xs font-bold text-slate-700">
          <div className="flex items-center space-x-6 overflow-x-auto py-2 no-scrollbar">
            <a href="#hero" className="hover:text-gov-blue text-gov-blue border-b-2 border-gov-blue pb-0.5 whitespace-nowrap">
              Home
            </a>
            <a href="/apply" className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 transition whitespace-nowrap flex items-center space-x-1 font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Online TUPAD Application</span>
            </a>
            <a href="#inquiry" className="hover:text-gov-blue transition whitespace-nowrap flex items-center space-x-1">
              <FileCheck className="w-3.5 h-3.5 text-gov-gold" />
              <span>Application Status Inquiry</span>
            </a>
            <a href="#inquiry-form" className="hover:text-gov-blue transition whitespace-nowrap flex items-center space-x-1">
              <MessageSquare className="w-3.5 h-3.5 text-gov-blue" />
              <span>Message & Feedback</span>
            </a>
            <a href="#programs" className="hover:text-gov-blue transition whitespace-nowrap">
              Active Programs
            </a>
            <a href="#gallery" className="hover:text-gov-blue transition whitespace-nowrap">
              TUPAD in Action
            </a>
            <a href="#org-structure" className="hover:text-gov-blue transition whitespace-nowrap">
              PESO Org Chart
            </a>
            <a href="/restrictions/checker" className="text-gov-gold hover:text-amber-700 transition flex items-center space-x-1 whitespace-nowrap">
              <Search className="w-3.5 h-3.5" />
              <span>Check Eligibility</span>
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Left: Featured Video Player */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-300/80 bg-slate-900 group">
              <video
                src="https://www.image2url.com/r2/default/videos/1788303848432-e7f6f01f-ef1c-4460-a6e4-99f8f2386145.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-auto max-h-[460px] object-cover block group-hover:scale-[1.01] transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-sm">
                  ● Community Employment in Action
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-100 drop-shadow">
                  LGU Dingalan • DOLE Emergency Employment Program
                </p>
              </div>
            </div>
          </div>

          {/* Right: Hero Text & Call to Action */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-50 text-gov-blue text-xs font-extrabold border border-blue-200/80">
                <ShieldCheck className="w-4 h-4 text-gov-gold" />
                <span>Official PESO Dingalan Initiative</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Pagpapalakas ng Serbisyo ng PESO upang mas maipa-DAMA sa bawat Pamilyang DINGALEÑO
            </h1>

            <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              <p className="font-extrabold text-gov-blue flex items-center space-x-1.5 text-base sm:text-lg">
                <span>🚀 DIGITAL NA ANG SERBISYO NG PESO DINGALAN! 💻📱</span>
              </p>

              <p>
                Ipinakikilala ang <strong className="text-slate-900">PESO EC Access</strong> — ang bagong digital portal na magpapadali sa mga programa at serbisyo ng Public Employment Service Office para sa bawat mamamayan ng Dingalan!
              </p>

              <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 text-xs sm:text-sm text-slate-800">
                <span className="font-black text-amber-900 block mb-0.5">🌟 KAHANGA-HANGA AT PROUDLY LOCAL:</span>
                <span>💡 Higit sa lahat, ang sistemang ito ay <strong className="text-amber-950 font-black">LIBRENG</strong> nabuo at pinondohan ng sariling husay at talento ng <strong className="text-slate-900">PESO Dingalan team</strong> upang mas mapalapit ang teknolohiya at serbisyo sa tao!</span>
              </div>

              <div className="space-y-1.5 text-xs sm:text-sm pt-1">
                <p className="font-bold text-slate-900">🛠️ Mga Tampok na Serbisyo:</p>
                <ul className="grid grid-cols-1 gap-1 pl-1 text-slate-600">
                  <li className="flex items-start space-x-1.5">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">Mag-apply Online</strong> para sa programang TUPAD kahit nasa bahay</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">I-check ang Status</strong> ng aplikasyon anumang oras</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">365-Day Checker</strong> para sa patas at transparent na proseso</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">Mabilis na QR Verification</strong> sa stubs, orientation, at attendance</span>
                  </li>
                  <li className="flex items-start space-x-1.5">
                    <span className="text-emerald-600 font-bold">✔️</span>
                    <span><strong className="text-slate-800">Direct Feedback Desk</strong> para sa agarang sagot sa mga tanong</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-bold text-gov-blue">
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
                className="group p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl border border-emerald-500 shadow-md hover:shadow-lg transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-gov-goldLight group-hover:scale-110 transition" />
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
                className="group p-3 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-gov-blue/10 text-gov-blue flex items-center justify-center font-bold flex-shrink-0">
                    <FileCheck className="w-4 h-4 text-gov-blue group-hover:scale-110 transition" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 group-hover:text-gov-blue transition leading-tight">Status Inquiry</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Check Status</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-gov-blue group-hover:translate-x-0.5 transition" />
              </a>

              <a
                href="#inquiry-form"
                className="group p-3 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-gov-blue flex items-center justify-center font-bold flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-gov-blue group-hover:scale-110 transition" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 group-hover:text-gov-blue transition leading-tight">Direct Message</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Send Feedback</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-gov-blue group-hover:translate-x-0.5 transition" />
              </a>

              <a
                href="/restrictions/checker"
                className="group p-3 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
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

      {/* Program Statistics Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="gov-card p-5 bg-white flex items-center space-x-4 shadow-sm border-l-4 border-l-gov-blue">
            <div className="p-3 bg-blue-50 text-gov-blue rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Registered Beneficiaries</p>
              <p className="text-2xl font-black text-slate-900">{totalBeneficiaries.toLocaleString()}</p>
            </div>
          </div>

          <div className="gov-card p-5 bg-white flex items-center space-x-4 shadow-sm border-l-4 border-l-gov-gold">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Attendance Scans</p>
              <p className="text-2xl font-black text-slate-900">{totalAttendances.toLocaleString()}</p>
            </div>
          </div>

          <div className="gov-card p-5 bg-white flex items-center space-x-4 shadow-sm border-l-4 border-l-emerald-600">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Completed Payouts</p>
              <p className="text-2xl font-black text-slate-900">{totalPaid.toLocaleString()}</p>
            </div>
          </div>

          <div className="gov-card p-5 bg-white flex items-center space-x-4 shadow-sm border-l-4 border-l-indigo-600">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Participating Barangays</p>
              <p className="text-2xl font-black text-slate-900">11 Barangays</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 1: Public TUPAD Application Status Inquiry Section */}
      <section id="inquiry" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PublicStatusInquiryCard />
      </section>

      {/* FEATURE 2: Public Comments, Suggestions & Messages Form Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PublicInquiryMessageForm />
      </section>

      {/* Active Programs Section */}
      <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Active TUPAD Work Programs</h2>
            <p className="text-xs text-slate-500">Current emergency community employment projects deployed across Dingalan</p>
          </div>
          <a
            href="/login"
            className="text-xs font-bold text-gov-blue hover:text-gov-dark flex items-center space-x-1"
          >
            <span>View All Programs in Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activePrograms.map((prog) => (
            <div
              key={prog.id}
              className="gov-card p-6 space-y-4 gov-card-hover border-t-4 border-t-gov-blue bg-white flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-gov-blue border border-blue-200">
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
                  className="text-gov-blue hover:text-gov-dark font-bold flex items-center space-x-1"
                >
                  <span>Program Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Collage & "TUPAD in Action" Section */}
      <section id="gallery" className="bg-slate-100/80 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-100 text-gov-blue text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-gov-gold" />
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
                <span className="inline-block px-2.5 py-0.5 bg-gov-blue text-gov-goldLight font-bold text-xs rounded-lg mb-1">
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
                <span className="text-[10px] uppercase font-bold text-gov-goldLight">Eco-Protection</span>
                <h3 className="text-sm font-bold">Environmental & Coastal Cleanups</h3>
              </div>
            </div>

            {/* Bottom Right Highlight Card */}
            <div className="md:col-span-4 md:row-span-1 rounded-3xl bg-gov-blue text-white p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="space-y-1 relative z-10">
                <span className="text-gov-goldLight text-[10px] font-extrabold uppercase tracking-wider">
                  Total Beneficiary Reach
                </span>
                <h3 className="text-3xl sm:text-4xl font-black font-mono">1,200+</h3>
                <p className="text-xs text-blue-100">
                  Beneficiaries deployed and supported across all 11 Dingalan barangays.
                </p>
              </div>

              <div className="relative z-10 pt-2 flex items-center justify-between border-t border-white/20 text-xs font-bold text-gov-goldLight">
                <span>100% Cash Payout Compliance</span>
                <Award className="w-4 h-4 text-gov-gold" />
              </div>

              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Organizational Structure Section */}
      <section id="org-structure" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-gov-blue text-[11px] font-bold border border-blue-200">
            <Building2 className="w-3.5 h-3.5 text-gov-blue" />
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

      {/* Official Government Footer */}
      <footer className="gov-header-gradient text-white mt-auto pt-14 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Branding */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <PesoLogo className="h-12 w-12" size={48} />
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">PESO Dingalan</h3>
                  <p className="text-xs text-gov-goldLight font-medium">PESO EC Access</p>
                </div>
              </div>

              <p className="text-xs text-blue-100 max-w-md leading-relaxed">
                A dedicated electronic content and beneficiary management platform ensuring transparent, verified, and audited emergency employment across the Municipality of Dingalan, Aurora.
              </p>
            </div>

            {/* Column 2: System Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gov-goldLight uppercase tracking-wider">Quick Navigation</h4>
              <ul className="space-y-2 text-xs text-blue-100">
                <li>
                  <a href="#inquiry" className="hover:text-white hover:underline transition">TUPAD Application Status Inquiry</a>
                </li>
                <li>
                  <a href="#inquiry-form" className="hover:text-white hover:underline transition">Send Direct Message / Inquiry</a>
                </li>
                <li>
                  <a href="/login" className="hover:text-white hover:underline transition">Staff & Coordinator Portal</a>
                </li>
                <li>
                  <a href="/restrictions/checker" className="hover:text-white hover:underline transition">365-Day Eligibility Checker</a>
                </li>
                <li>
                  <a href="#programs" className="hover:text-white hover:underline transition">Active Work Programs</a>
                </li>
              </ul>
            </div>

            {/* Column 3: DOLE & LGU Resources */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gov-goldLight uppercase tracking-wider">External Portals</h4>
              <ul className="space-y-2 text-xs text-blue-100">
                <li>
                  <a href="https://dole.gov.ph" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition flex items-center space-x-1">
                    <span>DOLE Philippines</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </li>
                <li>
                  <a href="https://dingalan.gov.ph" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition flex items-center space-x-1">
                    <span>Municipality of Dingalan</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </li>
                <li>
                  <a href="/sync" className="hover:text-white hover:underline transition">Offline Sync Center</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-blue-200 gap-2">
            <p>© 2026 PESO Dingalan • PESO EC Access • Municipality of Dingalan, Aurora. All Rights Reserved.</p>
            <p className="font-mono text-gov-goldLight">DOLE Aurora Field Office Partner Portal</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
