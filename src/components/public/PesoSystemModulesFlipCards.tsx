"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Briefcase,
  Award,
  Compass,
  Globe,
  Cpu,
  RotateCw,
  ArrowRight,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  MapPin,
  FileCheck,
  Users,
  MessageSquare,
  FileText,
  Lock,
  RefreshCw,
  Layers,
  Maximize2,
  X,
  Eye,
} from "lucide-react";

interface ModuleActionLink {
  label: string;
  href: string;
  primary?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

interface PesoModuleCardData {
  id: string;
  number: string;
  title: string;
  tagalogSubtitle: string;
  statusLabel: string;
  isLive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accentGradient: string;
  badgeClasses: string;
  frontBorderHover: string;
  backBgGradient: string;
  customGraphic?: string;
  description: string;
  highlights: string[];
  subFeatures: {
    title: string;
    detail: string;
  }[];
  links: ModuleActionLink[];
}

const PESO_MODULES: PesoModuleCardData[] = [
  {
    id: "module-1-tupad",
    number: "MODULE 01",
    title: "EC TUPAD Management System",
    tagalogSubtitle: "Emergency Community Employment & QR Field Verification",
    statusLabel: "ACTIVE • LIVE PORTAL",
    isLive: true,
    icon: QrCode,
    accentGradient: "from-emerald-500 via-teal-500 to-blue-600",
    badgeClasses: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
    frontBorderHover: "hover:border-emerald-400/70",
    backBgGradient: "from-slate-950 via-emerald-950/95 to-slate-900",
    customGraphic: "/images/modules/tupad/module-01-ec-tupad-official-graphic.jpg",
    description:
      "End-to-end digital management ng DOLE TUPAD program mula online application, 365-day eligibility check, laminated QR ID stub distribution, orientation, daily attendance, hanggang payout verification.",
    highlights: [
      "Online & Walk-In TUPAD Registration",
      "Laminated QR ID & Work Area Lookup",
      "365-Day Cooldown Eligibility Checker",
    ],
    subFeatures: [
      {
        title: "Online Application & Status Tracker",
        detail: "Mag-apply kahit nasa bahay at i-check ang status gamit ang Reference Code.",
      },
      {
        title: "QR Stub, Orientation & Attendance",
        detail: "Mabilis na field scanning na may Birthday PIN affirmation at accomplishment photos.",
      },
      {
        title: "365-Day Integrity & Replacement Hub",
        detail: "Patas na screening at opisyal na proseso para sa onsite beneficiary replacement.",
      },
    ],
    links: [
      { label: "Mag-apply Online", href: "/apply", primary: true, icon: Sparkles },
      { label: "Status Inquiry", href: "/apply/inquiry", icon: FileCheck },
      { label: "Work Area Assignment", href: "/my-assignment/inquiry", icon: MapPin },
      { label: "365-Day Checker", href: "/restrictions/checker", icon: ShieldCheck },
    ],
  },
  {
    id: "module-2-dama-etrabaho",
    number: "MODULE 02",
    title: "DAMA E-Trabaho Job Matching",
    tagalogSubtitle: "Local, Regional & Overseas Employment Facilitation",
    statusLabel: "PHASE 2 • UNDER DEV",
    isLive: false,
    icon: Briefcase,
    accentGradient: "from-blue-500 via-indigo-500 to-cyan-500",
    badgeClasses: "bg-blue-500/15 text-blue-300 border-blue-400/40",
    frontBorderHover: "hover:border-blue-400/70",
    backBgGradient: "from-slate-950 via-blue-950/95 to-slate-900",
    description:
      "Automated LGU job matching platform na nag-uugnay sa mga jobseekers ng Dingalan sa mga lokal, rehiyonal, at overseas employers katuwang ang DOLE NSRP.",
    highlights: [
      "Job Vacancies & Employer Matching",
      "Barangay Skills Registry & Talent Pool",
      "DOLE NSRP Integration & Referrals",
    ],
    subFeatures: [
      {
        title: "Job Vacancies & Employer Matching",
        detail: "Real-time na talaan ng mga bukas na trabaho at automated candidate matching.",
      },
      {
        title: "Skills Registry & Talent Pool",
        detail: "Barangay-level database ng mga skilled workers at propesyonal sa Dingalan.",
      },
      {
        title: "NSRP Integration & Referral Slips",
        detail: "National Skills Registration Program linkage at digital PESO referral issuance.",
      },
    ],
    links: [
      { label: "Magtanong sa Job Placement Desk", href: "/apply/inquiry#message", primary: true, icon: MessageSquare },
      { label: "Tingnan ang PESO Org Structure", href: "#org-structure", icon: Users },
    ],
  },
  {
    id: "module-3-tech-skills",
    number: "MODULE 03",
    title: "Technical Skills Accreditation",
    tagalogSubtitle: "TESDA & LGU Tech-Voc Training at NCII Certification",
    statusLabel: "PHASE 2 • UNDER DEV",
    isLive: false,
    icon: Award,
    accentGradient: "from-amber-400 via-orange-500 to-rose-500",
    badgeClasses: "bg-amber-500/15 text-amber-300 border-amber-400/40",
    frontBorderHover: "hover:border-amber-400/70",
    backBgGradient: "from-slate-950 via-amber-950/90 to-slate-900",
    description:
      "Komprehensibong sistema para sa TESDA at LGU technical-vocational skills training, competency assessment schedules, at digital verification ng NCII certificates.",
    highlights: [
      "TESDA Course & Training Registry",
      "Competency Assessment Schedules",
      "NCII & PESO Accreditation Verification",
    ],
    subFeatures: [
      {
        title: "TESDA Course & Training Registry",
        detail: "Listahan ng mga aktibong tech-voc courses, training centers, at batch schedules.",
      },
      {
        title: "Assessment Center Schedules",
        detail: "Online pre-qualification at booking para sa competency assessment.",
      },
      {
        title: "Certification & NCII Verification",
        detail: "Digital tracking ng National Certificates ng mga graduates sa Dingalan.",
      },
    ],
    links: [
      { label: "Magpa-lista sa Skills Training", href: "/apply/inquiry#message", primary: true, icon: MessageSquare },
      { label: "Tingnan ang Demographics", href: "#demographics", icon: Users },
    ],
  },
  {
    id: "module-4-spes-gip-dileep",
    number: "MODULE 04",
    title: "SPES, GIP, DILEEP & Career Guidance",
    tagalogSubtitle: "Youth Employment, Government Internship & Livelihood",
    statusLabel: "PHASE 2 • UNDER DEV",
    isLive: false,
    icon: Compass,
    accentGradient: "from-purple-500 via-violet-500 to-fuchsia-500",
    badgeClasses: "bg-purple-500/15 text-purple-300 border-purple-400/40",
    frontBorderHover: "hover:border-purple-400/70",
    backBgGradient: "from-slate-950 via-purple-950/90 to-slate-900",
    description:
      "Pinagsama-samang programa para sa kabataan, estudyante, fresh graduates, at livelihood beneficiaries sa ilalim ng SPES, GIP, DILEEP, at Career Guidance.",
    highlights: [
      "SPES Student Payout & Monitoring",
      "GIP Government Internship Roster",
      "DILEEP Livelihood & Career Guidance",
    ],
    subFeatures: [
      {
        title: "SPES & GIP Placement Monitoring",
        detail: "Special Program for Employment of Students at Government Internship records.",
      },
      {
        title: "DILEEP Livelihood Grant Tracking",
        detail: "Pagsubaybay sa DOLE Integrated Livelihood beneficiaries at kabuhayan kits.",
      },
      {
        title: "Youth Career Guidance & Profiling",
        detail: "Labor market coaching para sa mga high school at college students.",
      },
    ],
    links: [
      { label: "Mag-inquire sa SPES / GIP / DILEEP", href: "/apply/inquiry#message", primary: true, icon: MessageSquare },
      { label: "Check 365-Day Eligibility", href: "/restrictions/checker", icon: ShieldCheck },
    ],
  },
  {
    id: "module-5-migrants-corner",
    number: "MODULE 05",
    title: "Migrants' Corner (OFW & Seafarer Hub)",
    tagalogSubtitle: "OFW Family Circle, OWWA/DMW Helpdesk & Balik Pinas",
    statusLabel: "ACTIVE • LIVE PORTAL",
    isLive: true,
    icon: Globe,
    accentGradient: "from-cyan-400 via-emerald-500 to-rose-500",
    badgeClasses: "bg-cyan-500/15 text-cyan-300 border-cyan-400/40",
    frontBorderHover: "hover:border-cyan-400/70",
    backBgGradient: "from-slate-950 via-cyan-950/95 to-slate-900",
    description:
      "Opisyal na digital helpdesk at registry para sa mga Land-Based OFWs, Sea-Based Seafarers (Marino), at kanilang pamilya sa Bayan ng Dingalan.",
    highlights: [
      "OFW Family Circle Info Sheet Registry",
      "OWWA / DMW Case Assistance Messenger",
      "Balik Pinas! Balik Hanapbuhay! (ELPOR)",
    ],
    subFeatures: [
      {
        title: "OFW Family Circle Registration",
        detail: "Online membership registration na may printable OFW Information Sheet.",
      },
      {
        title: "OFW & Seafarer Case Messenger",
        detail: "Two-way welfare reporting at real-time Case Tracking Code.",
      },
      {
        title: "Balik Pinas! (DMW RO-III ELPOR)",
        detail: "Livelihood application na may printable 6-Page DMW ELPOR Forms.",
      },
    ],
    links: [
      { label: "Buksan ang Migrants' Portal", href: "/migrants", primary: true, icon: Globe },
      { label: "OFW Family Circle", href: "/migrants/family-circle", icon: Users },
      { label: "Case Assistance", href: "/migrants/case-assistance", icon: MessageSquare },
      { label: "Balik Pinas ELPOR", href: "/migrants/balik-pinas", icon: FileText },
    ],
  },
  {
    id: "module-6-peso-govtech",
    number: "MODULE 06",
    title: "Public Services Digitalization (GovTech)",
    tagalogSubtitle: "Offline-First QR Engine, Sync Center & Smart Kiosks",
    statusLabel: "ACTIVE • GOVTECH CORE",
    isLive: true,
    icon: Cpu,
    accentGradient: "from-teal-400 via-cyan-500 to-blue-600",
    badgeClasses: "bg-teal-500/15 text-teal-300 border-teal-400/40",
    frontBorderHover: "hover:border-teal-400/70",
    backBgGradient: "from-slate-950 via-teal-950/95 to-slate-900",
    description:
      "In-house GovTech architecture ng PESO Dingalan na may Offline-First IndexedDB scanning engine, multi-device sync, at Data Privacy Act (R.A. 10173) compliance.",
    highlights: [
      "Offline-First Field QR Scanner Engine",
      "Multi-Agency Data Interoperability",
      "Smart Barangay Kiosk & Push Advisories",
    ],
    subFeatures: [
      {
        title: "Offline-First PWA & Sync Center",
        detail: "Tuloy-tuloy na QR scanning sa 11 barangays kahit walang mobile signal.",
      },
      {
        title: "Role-Based Staff & Coordinator Terminal",
        detail: "Secure MAEDUP! portal para sa PESO Admin at Barangay Coordinators.",
      },
      {
        title: "NPC & DICT GWT Standard Compliance",
        detail: "Strict audit logging, consent PIN verification, at encrypted records.",
      },
    ],
    links: [
      { label: "Staff & Coordinator Login", href: "/login", primary: true, icon: Lock },
      { label: "Offline Sync Center", href: "/sync", icon: RefreshCw },
      { label: "Citizen Online Services", href: "/apply/inquiry", icon: QrCode },
    ],
  },
];

export function PesoSystemModulesFlipCards() {
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [enlargedGraphic, setEnlargedGraphic] = useState<{
    url: string;
    title: string;
    number: string;
  } | null>(null);

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const flipAll = (flipState: boolean) => {
    const next: Record<string, boolean> = {};
    for (const mod of PESO_MODULES) {
      next[mod.id] = flipState;
    }
    setFlippedIds(next);
  };

  const anyFlipped = Object.values(flippedIds).some(Boolean);

  return (
    <section
      id="programs"
      className="relative py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-[#071426] to-slate-950 text-white border-y border-slate-800/80 scroll-mt-16 overflow-hidden"
    >
      {/* Subtle Ambient Tech Grid & Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(56, 189, 248, 0.22) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[260px] bg-emerald-500/15 blur-3xl rounded-full"
      />

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800/90 pb-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>PESO EC Access • 6 Core System Modules</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              6-Module Integrated Digital Ecosystem ng{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400">
                PESO Dingalan
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              I-hover o i-click ang bawat <strong>Interactive 3D Flipcard</strong> upang makita ang detalyadong serbisyo, sub-modules, at direktang links para sa mga mamamayan, OFWs, kabataan, at manggagawang Dingaleño.
            </p>
          </div>

          {/* Flip All Toggle Control */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => flipAll(!anyFlipped)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-500 ${anyFlipped ? "rotate-180" : ""}`} />
              <span>{anyFlipped ? "Iharap Lahat (Front View)" : "Baligtarin Lahat (Back Details)"}</span>
            </button>
          </div>
        </div>

        {/* 6-Module 3D Flipcard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PESO_MODULES.map((mod) => {
            const IconComponent = mod.icon;
            const isFlipped = !!flippedIds[mod.id];

            return (
              <div
                key={mod.id}
                className="group h-[590px] sm:h-[610px] perspective-1200"
              >
                <div
                  onClick={() => toggleFlip(mod.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${mod.number}: ${mod.title} - Click or press Enter to flip card`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleFlip(mod.id);
                    }
                  }}
                  className={`relative w-full h-full rounded-3xl transition-transform duration-700 preserve-3d cursor-pointer select-none ${
                    isFlipped
                      ? "rotate-y-180"
                      : "lg:group-hover:rotate-y-180"
                  }`}
                >
                  {/* ================= FRONT FACE ================= */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-3xl bg-slate-900/95 border border-slate-800 ${mod.frontBorderHover} p-4 sm:p-5 flex flex-col justify-between shadow-2xl backface-hidden overflow-hidden transition-colors ${isFlipped ? "pointer-events-none" : "lg:group-hover:pointer-events-none"}`}
                  >
                    {/* Top Gradient Accent Bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${mod.accentGradient}`}
                    />

                    {/* Ambient Corner Glow */}
                    <div
                      className={`pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-gradient-to-br ${mod.accentGradient} opacity-15 blur-2xl`}
                    />

                    {/* Content Section */}
                    <div className="space-y-3 relative z-10">
                      {/* Top Row: Module Badge & Status Chip */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-black tracking-widest uppercase text-slate-400">
                          {mod.number}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${mod.badgeClasses}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              mod.isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                            }`}
                          />
                          {mod.statusLabel}
                        </span>
                      </div>

                      {/* Custom Module Graphic Showcase Banner - Maximized 16:9 Display */}
                      {mod.customGraphic ? (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-xl bg-slate-950 group/img">
                          <img
                            src={mod.customGraphic}
                            alt={mod.title}
                            className="w-full h-full object-contain sm:object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent pointer-events-none" />

                          {/* Quick Enlarge / Maximize Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnlargedGraphic({
                                url: mod.customGraphic!,
                                title: mod.title,
                                number: mod.number,
                              });
                            }}
                            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-950/85 hover:bg-emerald-600 text-[10px] font-bold text-white border border-emerald-400/40 flex items-center gap-1.5 transition-all shadow-md backdrop-blur-xs cursor-pointer z-20 hover:scale-105"
                            title="Palakihin / View Full Screen"
                          >
                            <Maximize2 className="w-3 h-3 text-emerald-300" />
                            <span>Palakihin</span>
                          </button>
                        </div>
                      ) : (
                        /* Visual Banner Placeholder while awaiting custom graphic */
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 flex flex-col justify-between shadow-inner group-hover:border-slate-700 transition">
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.accentGradient} p-0.5 shadow-lg`}
                            >
                              <div className="w-full h-full bg-slate-950/90 rounded-[10px] flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60">
                              Ready for Custom Graphic
                            </span>
                          </div>
                          <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-200 truncate">
                              PESO Dingalan Module Showcase
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Mag-upload ng natatanging 3D graphic para sa modyul na ito
                            </p>
                          </div>
                          <div
                            className={`pointer-events-none absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${mod.accentGradient} opacity-15 blur-xl`}
                          />
                        </div>
                      )}

                      {/* Title & Subtitle */}
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                          {mod.title}
                        </h3>
                        <p className="text-xs font-semibold text-emerald-300/90 mt-0.5">
                          {mod.tagalogSubtitle}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {mod.description}
                      </p>

                      {/* Key Highlights Checklist */}
                      <div className="pt-2 space-y-1.5 border-t border-slate-800/80">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Pangunahing Kakayahan:
                        </div>
                        <ul className="space-y-1">
                          {mod.highlights.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-[11px] font-medium text-slate-200"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Footer Prompt to Flip */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-300 relative z-10">
                      <span>Tingnan ang Sub-Modules at Links</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/90 text-[11px] text-white border border-slate-700 hover:border-emerald-400/50 transition">
                        <RotateCw className="w-3 h-3 text-emerald-400" />
                        <span>I-flip</span>
                      </span>
                    </div>
                  </div>

                  {/* ================= BACK FACE ================= */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br ${mod.backBgGradient} border-2 border-cyan-400/40 p-5 sm:p-6 flex flex-col justify-between shadow-2xl backface-hidden rotate-y-180 overflow-hidden ${isFlipped ? "pointer-events-auto" : "pointer-events-none lg:group-hover:pointer-events-auto"}`}
                  >
                    {/* Top Gradient Accent Bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${mod.accentGradient}`}
                    />

                    <div className="space-y-3.5 relative z-10">
                      {/* Header on Back */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                        <div>
                          <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-300">
                            {mod.number} • DETALYE AT LINKS
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-white leading-tight">
                            {mod.title}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFlip(mod.id);
                          }}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Ibalik sa harap"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Sub-Features List */}
                      <div className="space-y-2">
                        {mod.subFeatures.map((sf, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5"
                          >
                            <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span>{sf.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug pl-3">
                              {sf.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Direct Action Links (Preserving All System Routes) */}
                    <div
                      className="pt-3 border-t border-white/15 space-y-2 relative z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                        Direktang Aksyon at Portals:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {mod.links.map((lnk, idx) => {
                          const LinkIcon = lnk.icon;
                          const isSingle = mod.links.length === 1;
                          return (
                            <Link
                              key={idx}
                              href={lnk.href}
                              className={`px-3 py-2 rounded-xl text-[11px] font-extrabold flex items-center justify-between gap-1.5 transition shadow-xs ${
                                isSingle ? "col-span-2" : ""
                              } ${
                                lnk.primary
                                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{lnk.label}</span>
                              </span>
                              <ArrowRight className="w-3 h-3 shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* High-Resolution Graphic Lightbox Modal */}
      {enlargedGraphic && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md"
          onClick={() => setEnlargedGraphic(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-slate-900 border border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                  {enlargedGraphic.number} • BUONG RESOLUSYON NA GRAPHIC
                </span>
                <h3 className="text-base sm:text-xl font-black text-white">
                  {enlargedGraphic.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedGraphic(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Isara ang modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Full Image in Native 16:9 - 100% Uncropped */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-emerald-500/20 bg-slate-950 shadow-2xl">
              <img
                src={enlargedGraphic.url}
                alt={enlargedGraphic.title}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-1">
              <span>Opisyal na 3D Visual Art para sa PESO Dingalan EC Access Portal</span>
              <button
                type="button"
                onClick={() => setEnlargedGraphic(null)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer shadow-md"
              >
                Isara (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

