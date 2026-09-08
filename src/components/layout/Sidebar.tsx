"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PesoLogo } from "./PesoLogo";
import { isAdminUser } from "@/lib/permissions";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  QrCode,
  Printer,
  CalendarCheck,
  UserPlus,
  Clock,
  Camera,
  Banknote,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  History,
  RefreshCw,
  Search,
  MessageSquare,
  Sparkles,
  X,
  LogOut,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Award,
  Compass,
  HeartHandshake,
  Cpu,
  Layers,
  Construction,
  Info,
} from "lucide-react";

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

interface DummyModule {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  description: string;
  subItems: { title: string; desc: string }[];
}

export function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();

  // Active route checking for TUPAD features
  const isTupadRoute =
    pathname.startsWith("/programs") ||
    pathname.startsWith("/beneficiaries") ||
    pathname.startsWith("/stubs") ||
    pathname.startsWith("/apply") ||
    pathname.startsWith("/field") ||
    pathname.startsWith("/replacements") ||
    pathname.startsWith("/restrictions");

  // State for toggling dropdown menus
  const [tupadDropdownOpen, setTupadDropdownOpen] = useState<boolean>(true);
  const [openDummyModules, setOpenDummyModules] = useState<Record<string, boolean>>({});
  const [selectedDevModule, setSelectedDevModule] = useState<{
    moduleName: string;
    featureName?: string;
    description?: string;
  } | null>(null);

  const toggleDummyModule = (id: string) => {
    setOpenDummyModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Module 1: EC TUPAD Management System Sub-Sections
  const tupadSections = [
    {
      title: "Core Operations",
      items: [
        { label: "Programs & Work Plans", href: "/programs", icon: FolderKanban, permission: "program.read" },
        { label: "Beneficiaries Masterlist", href: "/beneficiaries", icon: Users, permission: "beneficiary.read" },
        { label: "QR & Stub Designer", href: "/stubs", icon: Printer, permission: "stub.configure" },
        { label: "Online Application Portal", href: "/apply", icon: Sparkles, permission: "dashboard.view" },
      ],
    },
    {
      title: "Field Scanner Hub",
      items: [
        { label: "Field Hub & QR Pass Studio", href: "/field", icon: Sparkles, permission: "dashboard.view" },
        { label: "Stub Distribution & Affirmation", href: "/field/stub-distribution", icon: QrCode, permission: "stub.distribution.scan" },
        { label: "Orientation Verification", href: "/field/orientation", icon: CalendarCheck, permission: "orientation.scan" },
        { label: "Daily Attendance (AM/PM)", href: "/field/attendance", icon: Clock, permission: "attendance.scan" },
        { label: "Accomplishment Photos", href: "/field/photos", icon: Camera, permission: "photo.upload" },
        { label: "Payout Verification", href: "/field/payout", icon: Banknote, permission: "payout.scan" },
      ],
    },
    {
      title: "Integrity & Compliance",
      items: [
        { label: "Onsite Replacements", href: "/replacements", icon: UserPlus, permission: "replacement.read" },
        { label: "365-Day Restriction Hub", href: "/restrictions", icon: ShieldAlert, permission: "restriction.read" },
        { label: "Eligibility Checker", href: "/restrictions/checker", icon: Search, permission: "dashboard.view" },
      ],
    },
  ];

  // Additional Modules (Under Development)
  const dummyModules: DummyModule[] = [
    {
      id: "dama-trabaho",
      name: "2 - DAMA E-Trabaho Job Matching",
      icon: Briefcase,
      status: "under development",
      description: "Automated LGU job matching platform connecting Dingalan jobseekers with local, regional, and overseas employers.",
      subItems: [
        { title: "Job Vacancies & Employer Matching", desc: "Real-time registry of open job orders and automated candidate matching." },
        { title: "Skills Registry & Talent Pool", desc: "Barangay-level database of skilled laborers and professional jobseekers." },
        { title: "NSRP Integration & Referrals", desc: "DOLE National Skills Registration Program linkage and job referral slips." },
      ],
    },
    {
      id: "tech-skills",
      name: "3 - Technical Skills Accreditation",
      icon: Award,
      status: "under development",
      description: "TESDA and LGU technical-vocational skills training management, competency assessments, and certification tracking.",
      subItems: [
        { title: "TESDA Course & Training Registry", desc: "Active tech-voc courses, training centers, and batch schedules." },
        { title: "Assessment Center Schedules", desc: "Competency assessment bookings and candidate pre-qualification." },
        { title: "Certification & NCII Verification", desc: "Digital verification of National Certificates and PESO accreditations." },
      ],
    },
    {
      id: "spes-gip-dileep",
      name: "4 - SPES, GIP, DILEEP, Career Guidance",
      icon: Compass,
      status: "under development",
      description: "Youth employment facilitation, student assistance programs, government internships, and livelihood grants.",
      subItems: [
        { title: "SPES Student Payout & Monitoring", desc: "Special Program for Employment of Students records and stipend disbursement." },
        { title: "GIP Government Internship Roster", desc: "Government Internship Program placement, attendance, and evaluation." },
        { title: "DILEEP Livelihood Grant Tracking", desc: "DOLE Integrated Livelihood and Emergency Employment Program beneficiaries." },
        { title: "Youth Career Guidance & Profiling", desc: "High school and college labor market counseling modules." },
      ],
    },
    {
      id: "migrants-corner",
      name: "5 - Migrants' Corner (OFW Helpdesk)",
      icon: HeartHandshake,
      status: "under development",
      description: "Dedicated assistance hub for Dingaleño Overseas Filipino Workers (OFWs), seafarers, and their families.",
      subItems: [
        { title: "OFW & Seafarer Case Assistance", desc: "Welfare case intake, grievance tracking, and DMW coordination." },
        { title: "Balik Pinas Balik Hanapbuhay Portal", desc: "Reintegration assistance and livelihood startup capital for returning OFWs." },
        { title: "OFW Family Circle Registry", desc: "Community support groups and financial literacy program schedules." },
      ],
    },
    {
      id: "peso-govtech",
      name: "6 - Public Services Digitalization (PESO GovTech)",
      icon: Cpu,
      status: "under development",
      description: "Cross-departmental data interoperability, smart citizen kiosks, and automated public service delivery systems.",
      subItems: [
        { title: "LGU Multi-Agency Data Interoperability", desc: "Unified citizen records linking PESO, MSWDO, and Barangay databases." },
        { title: "Automated SMS / Push Dispatcher", desc: "Broadcast alerts for payout schedules, job fairs, and urgent advisories." },
        { title: "Smart Citizen Barangay Kiosk Network", desc: "Self-service touchscreen terminals deployed across all 11 Dingalan barangays." },
      ],
    },
  ];

  // General System Utility Sections (Reports & Auditing, System Administration)
  const systemUtilitySections = [
    {
      title: "Reports & Auditing",
      items: [
        { label: "Report Center", href: "/reports", icon: FileSpreadsheet, permission: "report.generate" },
        { label: "Audit Trail Explorer", href: "/admin/audit", icon: History, permission: "audit.read" },
        { label: "Offline Sync Center", href: "/sync", icon: RefreshCw, permission: "sync.read" },
      ],
    },
    ...(can("user.read") || can("settings.read") || can("application.read") || can("inquiry.read") || isAdminUser(user)
      ? [
          {
            title: "System Administration",
            items: [
              ...(isAdminUser(user) || can("application.read")
                ? [
                    { label: "Applicant Status Roster", href: "/admin/applications", icon: FileSpreadsheet, permission: "application.read" },
                  ]
                : []),
              ...(isAdminUser(user) || can("inquiry.read")
                ? [
                    { label: "Public Inquiries Inbox", href: "/admin/inquiries", icon: MessageSquare, permission: "inquiry.read" },
                  ]
                : []),
              ...(can("user.read")
                ? [{ label: "User Management", href: "/admin/users", icon: Users, permission: "user.read" }]
                : []),
              ...(can("settings.read")
                ? [{ label: "System Settings", href: "/admin/settings", icon: Settings, permission: "settings.read" }]
                : []),
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      <aside
        className={`bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col ${
          isMobile
            ? "w-full h-full min-h-screen overflow-y-auto"
            : "w-64 hidden lg:flex min-h-[calc(100vh-4rem)] border-r border-slate-800"
        }`}
      >
        {/* Mobile Drawer Top Header */}
        {isMobile && (
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <PesoLogo className="h-8 w-8" size={32} />
              <div>
                <h2 className="text-xs font-black text-white tracking-tight leading-tight">PESO DINGALAN</h2>
                <p className="text-[10px] text-gov-goldLight font-bold uppercase">Navigation Menu</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition focus:outline-none"
              aria-label="Close mobile sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* User Info Badge in Mobile Drawer */}
        {isMobile && user && (
          <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-gov-blue text-gov-goldLight flex items-center justify-center font-bold text-xs">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user.fullName || user.username}</p>
                <p className="text-[10px] text-gov-gold font-mono uppercase">{user.role?.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Content */}
        <div className="p-3 sm:p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Top Level: Main Dashboard */}
          <div className="space-y-1">
            <a
              href="/dashboard"
              onClick={() => {
                if (isMobile && onClose) onClose();
              }}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                pathname === "/dashboard"
                  ? "bg-gov-blue text-white shadow-md border border-blue-400/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${pathname === "/dashboard" ? "text-gov-goldLight" : "text-slate-400"}`} />
              <span className="truncate">System Dashboard</span>
            </a>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 pb-2">
              PESO Service Modules
            </p>

            {/* MODULE 1: EC TUPAD MANAGEMENT SYSTEM DROPDOWN BUTTON */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden mb-2.5 transition-all shadow-sm">
              <button
                type="button"
                onClick={() => setTupadDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition ${
                  tupadDropdownOpen
                    ? "bg-slate-800/90 text-white border-b border-slate-800"
                    : isTupadRoute
                    ? "bg-gov-blue/20 text-blue-200 hover:bg-slate-800/60"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
                aria-expanded={tupadDropdownOpen}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 font-black text-[11px]">
                    1
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate text-white leading-tight">
                      1 - EC TUPAD Management System
                    </p>
                    <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded mt-0.5">
                      Operational
                    </span>
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0 pl-1 text-slate-400">
                  {tupadDropdownOpen ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                  )}
                </div>
              </button>

              {/* TUPAD Collapsible Content: Core Operations, Field Scanner Hub, Integrity & Compliance */}
              {tupadDropdownOpen && (
                <div className="p-2 space-y-3.5 bg-slate-950/30 animate-fadeIn">
                  {tupadSections.map((section, idx) => {
                    const visibleItems = section.items.filter((item) => !item.permission || can(item.permission));
                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={idx} className="space-y-1">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 pt-1 flex items-center space-x-1.5">
                          <span className="text-gov-goldLight font-black">•</span>
                          <span>{section.title}</span>
                        </h4>
                        <div className="space-y-0.5 pl-2 border-l border-slate-700/60 ml-2.5">
                          {visibleItems.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                              pathname === item.href ||
                              (item.href !== "/dashboard" && pathname.startsWith(item.href));

                            return (
                              <a
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  if (isMobile && onClose) {
                                    onClose();
                                  }
                                }}
                                className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${
                                  isActive
                                    ? "bg-gov-blue text-white shadow-sm font-bold border border-blue-400/40"
                                    : "text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800"
                                }`}
                              >
                                <Icon
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                                    isActive ? "text-gov-goldLight" : "text-slate-400"
                                  }`}
                                />
                                <span className="truncate">{item.label}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MODULES 2-6: DUMMY DROPDOWN BUTTONS (UNDER DEVELOPMENT) */}
            <div className="space-y-2">
              {dummyModules.map((module) => {
                const Icon = module.icon;
                const isOpen = !!openDummyModules[module.id];

                return (
                  <div
                    key={module.id}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/30 overflow-hidden transition-all hover:border-slate-700/80"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDummyModule(module.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition ${
                        isOpen ? "bg-slate-800/70 text-white" : "text-slate-300 hover:bg-slate-800/40"
                      }`}
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-slate-200 leading-snug">
                            {module.name}
                          </p>
                          <span className="inline-flex items-center space-x-1 text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            <span className="capitalize">{module.status}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center flex-shrink-0 pl-1 text-slate-500">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-amber-400 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                        )}
                      </div>
                    </button>

                    {/* Collapsible Under Development Sub-items */}
                    {isOpen && (
                      <div className="p-2.5 bg-slate-950/60 border-t border-slate-800/70 space-y-2 animate-fadeIn text-xs">
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {module.description}
                        </p>

                        <div className="space-y-1.5 pt-1">
                          {module.subItems.map((sub, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() =>
                                setSelectedDevModule({
                                  moduleName: module.name,
                                  featureName: sub.title,
                                  description: sub.desc,
                                })
                              }
                              className="w-full text-left p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800/60 hover:border-amber-500/30 transition group flex flex-col space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-semibold text-slate-300 group-hover:text-amber-300 text-[11px] truncate">
                                  {sub.title}
                                </span>
                                <span className="text-[8.5px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/50 px-1 py-0.2 rounded shrink-0">
                                  Under Dev
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1 group-hover:text-slate-400">
                                {sub.desc}
                              </p>
                            </button>
                          ))}
                        </div>

                        <div className="pt-1 flex items-center justify-between text-[10px] text-amber-400/80 bg-amber-950/30 p-2 rounded-lg border border-amber-900/30">
                          <div className="flex items-center space-x-1.5">
                            <Construction className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Scheduled for Phase 2 Rollout</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* GENERAL SYSTEM UTILITIES: REPORTS & AUDITING, SYSTEM ADMINISTRATION */}
          <div className="pt-2 border-t border-slate-800/60 space-y-3.5">
            {systemUtilitySections.map((section, idx) => {
              const visibleItems = section.items.filter((item) => !item.permission || can(item.permission));
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-1">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 pt-1 flex items-center space-x-1.5">
                    <span className="text-slate-500 font-black">•</span>
                    <span>{section.title}</span>
                  </h4>
                  <div className="space-y-0.5 pl-2 border-l border-slate-700/60 ml-2.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (isMobile && onClose) {
                              onClose();
                            }
                          }}
                          className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${
                            isActive
                              ? "bg-gov-blue text-white shadow-sm font-bold border border-blue-400/40"
                              : "text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800"
                          }`}
                        >
                          <Icon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isActive ? "text-gov-goldLight" : "text-slate-400"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Info & Mobile Logout */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-3 bg-slate-950/50">
          {isMobile && user && (
            <button
              onClick={() => {
                if (onClose) onClose();
                logout();
              }}
              className="w-full py-2 px-3 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
          <div className="text-center sm:text-left">
            <p className="font-semibold text-slate-400">PESO Dingalan • DOLE Aurora</p>
            <p className="text-[10px]">PESO Multi-Services Portal v2.0</p>
          </div>
        </div>
      </aside>

      {/* Interactive Modal for Under Development Features */}
      {selectedDevModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200 transform animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Construction className="w-5 h-5 animate-pulse" />
              </div>
              <button
                onClick={() => setSelectedDevModule(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <span>🚧 Module Under Active Development</span>
              </div>
              <h3 className="text-base font-bold text-white leading-tight">
                {selectedDevModule.featureName || selectedDevModule.moduleName}
              </h3>
              <p className="text-xs text-slate-400">
                Part of: <strong className="text-slate-300">{selectedDevModule.moduleName}</strong>
              </p>
            </div>

            {selectedDevModule.description && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-gov-goldLight">Feature Scope:</p>
                <p>{selectedDevModule.description}</p>
              </div>
            )}

            <div className="p-3 bg-blue-950/30 border border-blue-900/40 rounded-xl flex items-start space-x-2.5 text-xs text-blue-200">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                This system module is part of the <strong>PESO Dingalan Digitalization Roadmap</strong>. Engineering and database integrations are currently in progress.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDevModule(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
