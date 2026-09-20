import React from "react";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  FolderKanban,
  Users,
  QrCode,
  Printer,
  CalendarCheck,
  Clock,
  Banknote,
  ShieldAlert,
  PlusCircle,
  FileSpreadsheet,
  Camera,
  ArrowRight,
  TrendingUp,
  History,
  Phone,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface DashboardData {
  totalBeneficiariesCount: number;
  stubsConfirmedCount: number;
  flaggedReplacementCount: number;
  pendingUninformedCount: number;
  orientationPresentCount: number;
  activeProgramsCount: number;
  todayAttendanceCount: number;
  payoutPaidCount: number;
  restrictedCount: number;
  recentPrograms: any[];
  recentAudits: any[];
}

let cachedDashboardData: DashboardData | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache

async function getDashboardMetrics(isPesoAdmin: boolean): Promise<DashboardData> {
  const now = Date.now();
  if (cachedDashboardData && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedDashboardData;
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [
    totalBeneficiariesCount,
    stubsConfirmedCount,
    flaggedReplacementCount,
    orientationPresentCount,
    activeProgramsCount,
    todayAttendanceCount,
    payoutPaidCount,
    restrictedCount,
    recentPrograms,
    recentAudits,
  ] = await Promise.all([
    // Active Program Beneficiaries
    prisma.programBeneficiary.count({
      where: { participationStatus: { not: "REPLACED" } },
    }),
    // Stubs Confirmed (Distributed)
    prisma.stubDistribution.count({
      where: {
        status: "DISTRIBUTED",
        programBeneficiary: { participationStatus: { not: "REPLACED" } },
      },
    }),
    // Flagged for Replacement
    prisma.programBeneficiary.count({
      where: { participationStatus: "FLAGGED_FOR_REPLACEMENT" },
    }),
    // Orientation Present
    prisma.orientationAttendance.count({
      where: {
        status: "PRESENT",
        programBeneficiary: { participationStatus: { not: "REPLACED" } },
      },
    }),
    // Active Programs Count
    prisma.program.count({ where: { status: "ACTIVE" } }),
    // Today's Attendance
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: todayStr,
        programBeneficiary: { participationStatus: { not: "REPLACED" } },
      },
    }),
    // Payout Completed
    prisma.payout.count({
      where: {
        status: "PAID",
        programBeneficiary: { participationStatus: { not: "REPLACED" } },
      },
    }),
    // 365-Day Restricted Count
    prisma.beneficiaryRestriction.count({ where: { status: "ACTIVE" } }),
    // Recent Programs
    prisma.program.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        _count: {
          select: {
            programBeneficiaries: { where: { participationStatus: { not: "REPLACED" } } },
            attendanceRecords: { where: { programBeneficiary: { participationStatus: { not: "REPLACED" } } } },
            payouts: { where: { programBeneficiary: { participationStatus: { not: "REPLACED" } } } },
          },
        },
      },
    }),
    // Recent Audits
    isPesoAdmin
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const pendingUninformedCount = Math.max(
    0,
    totalBeneficiariesCount - (stubsConfirmedCount + flaggedReplacementCount)
  );

  const data: DashboardData = {
    totalBeneficiariesCount,
    stubsConfirmedCount,
    flaggedReplacementCount,
    pendingUninformedCount,
    orientationPresentCount,
    activeProgramsCount,
    todayAttendanceCount,
    payoutPaidCount,
    restrictedCount,
    recentPrograms,
    recentAudits,
  };

  cachedDashboardData = data;
  lastCacheTime = now;
  return data;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") {
    redirect("/field");
  }

  const isPesoAdmin = isAdminUser(user);
  const {
    totalBeneficiariesCount,
    stubsConfirmedCount,
    flaggedReplacementCount,
    pendingUninformedCount,
    orientationPresentCount,
    activeProgramsCount,
    todayAttendanceCount,
    payoutPaidCount,
    restrictedCount,
    recentPrograms,
    recentAudits,
  } = await getDashboardMetrics(isPesoAdmin);

  const metricCards = [
    {
      label: "Active Programs",
      value: activeProgramsCount,
      sublabel: "Ongoing TUPAD Batches",
      icon: FolderKanban,
      color: "text-blue-700",
      bg: "bg-blue-50",
      href: "/programs",
    },
    {
      label: "Target Beneficiaries",
      value: totalBeneficiariesCount,
      sublabel: "Final Masterlist for Implementation",
      icon: Users,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      href: "/beneficiaries",
    },
    {
      label: "Stubs Confirmed",
      value: stubsConfirmedCount,
      sublabel: totalBeneficiariesCount > 0 ? `${((stubsConfirmedCount / totalBeneficiariesCount) * 100).toFixed(1)}% Affirmed` : "Affirmed & Distributed",
      icon: QrCode,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      href: "/field/stub-distribution?tab=monitoring",
    },
    {
      label: "Pending (Uninformed)",
      value: pendingUninformedCount,
      sublabel: "Awaiting Field Distribution",
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50",
      href: "/field/stub-distribution?tab=monitoring",
    },
    {
      label: "Flagged for Replacement",
      value: flaggedReplacementCount,
      sublabel: "Awaiting Onsite Substitute",
      icon: AlertTriangle,
      color: "text-rose-700",
      bg: "bg-rose-50",
      href: "/replacements",
    },
    {
      label: "Orientation Present",
      value: orientationPresentCount,
      sublabel: totalBeneficiariesCount > 0 ? `${((orientationPresentCount / totalBeneficiariesCount) * 100).toFixed(1)}% Verified` : "Attendance Verified",
      icon: CalendarCheck,
      color: "text-teal-700",
      bg: "bg-teal-50",
      href: "/field/orientation",
    },
    {
      label: "Today's Attendance",
      value: todayAttendanceCount,
      sublabel: "Scanned Today",
      icon: Clock,
      color: "text-blue-800",
      bg: "bg-sky-50",
      href: "/field/attendance",
    },
    {
      label: "Payout Completed",
      value: payoutPaidCount,
      sublabel: "Verified Claims",
      icon: Banknote,
      color: "text-green-700",
      bg: "bg-green-50",
      href: "/field/payout",
    },
    {
      label: "365-Day Restricted",
      value: restrictedCount.toLocaleString(),
      sublabel: "Lockout Database",
      icon: ShieldCheck,
      color: "text-red-700",
      bg: "bg-red-50",
      href: "/restrictions",
    },
  ];

  const activeProgramId = recentPrograms[0]?.id || "";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="gov-card p-6 bg-white border border-slate-300 text-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm rounded-2xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-white uppercase tracking-wider bg-slate-950 px-3 py-1 rounded-md border border-slate-900 inline-block">
              PESO EC ACCESS-EC TUPAD MANAGEMENT
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            DOLE-TUPAD Beneficiary &amp; Attendance Monitoring
          </h1>
          <p className="text-sm text-slate-700 max-w-2xl font-semibold leading-relaxed">
            Digital Tool para sa mas pinabilis at pinadaling Accessible na Serbisyo ng PESO Dingalan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPesoAdmin && (
            <a
              href="/programs/new"
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow flex items-center space-x-1.5 border border-slate-900"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>New Program</span>
            </a>
          )}
          <a
            href="/field/attendance"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4 text-slate-700" />
            <span>Daily Scanner</span>
          </a>
        </div>
      </div>

      {/* 9 Reconciled Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <a
              key={idx}
              href={card.href}
              className="gov-card p-4 sm:p-5 gov-card-hover flex items-center space-x-4 border border-slate-300 bg-white shadow-xs"
            >
              <div className={`p-3 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider truncate">
                  {card.label}
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
                  {card.value}
                </p>
                {card.sublabel && (
                  <p className="text-[11px] text-slate-600 truncate mt-0.5 font-semibold">
                    {card.sublabel}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>

      {/* Feature Section: Beneficiaries, Barangay PESO, Work Program, Attendance and Accomplishments Analytics */}
      <div className="gov-card p-6 bg-white text-slate-950 shadow-sm rounded-2xl border border-slate-300 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 flex items-center space-x-2">
              <Users className="w-5 h-5 text-slate-900" />
              <span>Beneficiaries&apos; , Barangay PESO, Work Program, Attendance and Accomplishments Analytics</span>
            </h2>
            <p className="text-xs text-slate-700 max-w-3xl leading-relaxed font-semibold">
              Comprehensive operational analytics, masterlist allocation, demographic profiling, and field accomplishments monitoring across all 11 Dingalan Barangays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <a
              href="/api/v1/beneficiaries/template"
              download="tupad_final_beneficiaries_template.csv"
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-900 transition flex items-center space-x-1.5 shadow-sm"
              title="Download standard CSV template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-200" />
              <span>Template CSV</span>
            </a>

            <a
              href="/beneficiaries"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Open Masterlist &amp; Upload</span>
            </a>

            {activeProgramId && (
              <a
                href={`/programs/${activeProgramId}/work-program`}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-900 shadow-md transition flex items-center space-x-1.5"
              >
                <span>Work Program Deployment</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-200" />
              </a>
            )}
          </div>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-1 shadow-xs">
            <span className="font-bold text-white flex items-center space-x-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-slate-200" />
              <span>Purok / Sitio Grouping</span>
            </span>
            <p className="text-xs text-slate-300 font-medium leading-snug">
              Groups beneficiaries by official barangay clusters (e.g. Umiray Group 1: Singawan, Pinamaypayan &amp; Dugyan).
            </p>
          </div>
          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-1 shadow-xs">
            <span className="font-bold text-white flex items-center space-x-1.5 text-xs">
              <Users className="w-4 h-4 text-slate-200" />
              <span>Demographic Ratios</span>
            </span>
            <p className="text-xs text-slate-300 font-medium leading-snug">
              Auto-calculates Gender (M/F), Senior Citizen (Age &ge; 60), PWD, and IP counts per designated work area.
            </p>
          </div>
          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-1 shadow-xs">
            <span className="font-bold text-white flex items-center space-x-1.5 text-xs">
              <QrCode className="w-4 h-4 text-slate-200" />
              <span>Biometric QR &amp; Editing</span>
            </span>
            <p className="text-xs text-slate-300 font-medium leading-snug">
              Live editing of beneficiary profiles, duplicate prevention, 365-day lockout enforcement, and deletion options.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Programs Hub */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <FolderKanban className="w-4 h-4 text-slate-800" />
              <span>Active TUPAD Programs</span>
            </h2>
            <a href="/programs" className="text-xs font-bold text-gov-blue hover:underline">
              View All Programs
            </a>
          </div>

          <div className="space-y-3">
            {recentPrograms.map((prog) => (
              <div key={prog.id} className="gov-card p-5 space-y-3 gov-card-hover border border-slate-300 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                      {prog.programCode}
                    </span>
                    <h3 className="text-sm font-black text-slate-950 mt-1.5">{prog.programName}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    {prog.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Beneficiaries</span>
                    <p className="font-black text-slate-950 text-sm mt-0.5">{prog._count.programBeneficiaries}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Attendance Scans</span>
                    <p className="font-black text-slate-950 text-sm mt-0.5">{prog._count.attendanceRecords}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Paid Payouts</span>
                    <p className="font-black text-slate-950 text-sm mt-0.5">{prog._count.payouts}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-600 font-semibold text-[11px]">
                    Schedule: <strong className="text-slate-900">{prog.requiredWorkDays} Work Days</strong>
                  </span>
                  <div className="flex space-x-2">
                    {isPesoAdmin && (
                      <a
                        href={`/programs/${prog.id}/import`}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition border border-slate-300 shadow-xs"
                      >
                        Import Excel
                      </a>
                    )}
                    <a
                      href={`/programs/${prog.id}`}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition flex items-center space-x-1 shadow-xs"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Role-Gated Feed */}
        <div className="space-y-6">
          {/* Quick Operations Grid */}
          <div className="gov-card p-5 space-y-3 border border-slate-300 bg-white">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Field Operations Hub
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/field/stub-distribution"
                className="p-3 rounded-xl border border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-center transition flex flex-col items-center space-y-1.5 shadow-xs"
              >
                <QrCode className="w-5 h-5 text-slate-800" />
                <span className="text-xs font-bold text-slate-900">Distribute Stubs</span>
              </a>
              <a
                href="/field/orientation"
                className="p-3 rounded-xl border border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-center transition flex flex-col items-center space-y-1.5 shadow-xs"
              >
                <CalendarCheck className="w-5 h-5 text-teal-700" />
                <span className="text-xs font-bold text-slate-900">Orientation</span>
              </a>
              <a
                href="/field/attendance"
                className="p-3 rounded-xl border border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-center transition flex flex-col items-center space-y-1.5 shadow-xs"
              >
                <Clock className="w-5 h-5 text-amber-700" />
                <span className="text-xs font-bold text-slate-900">Daily QR Scan</span>
              </a>
              <a
                href="/field/photos"
                className="p-3 rounded-xl border border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-center transition flex flex-col items-center space-y-1.5 shadow-xs"
              >
                <Camera className="w-5 h-5 text-indigo-700" />
                <span className="text-xs font-bold text-slate-900">Accomplishment</span>
              </a>
              <a
                href="/field/payout"
                className="p-3 rounded-xl border border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-center transition flex flex-col items-center space-y-1.5 shadow-xs"
              >
                <Banknote className="w-5 h-5 text-green-700" />
                <span className="text-xs font-bold text-slate-900">Payout</span>
              </a>
              <a
                href="/reports"
                className="p-3 rounded-xl border border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-center transition flex flex-col items-center space-y-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-5 h-5 text-purple-700" />
                <span className="text-xs font-bold text-slate-900">Reports Engine</span>
              </a>
            </div>
          </div>

          {/* Audit Activity Feed: EXCLUSIVE TO PESO_ADMIN */}
          {isPesoAdmin ? (
            <div className="gov-card p-5 space-y-3 border border-slate-300 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-slate-700" />
                  <span>Audit Activity</span>
                </h2>
                <a href="/admin/audit" className="text-xs font-bold text-slate-700 hover:text-slate-950 hover:underline">
                  View All
                </a>
              </div>

              <div className="space-y-2.5 text-xs">
                {recentAudits.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center font-medium">No recent audit logs recorded.</p>
                ) : (
                  recentAudits.map((a) => (
                    <div key={a.id} className="pb-2 border-b border-slate-200 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{a.action.replace(/_/g, " ")}</span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {format(new Date(a.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        By {a.user?.fullName || "System"} • {a.entityType || "GENERAL"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Non-Admin Coordinator Guidance & Support Box */
            <div className="gov-card p-5 space-y-3 bg-slate-50 border border-slate-300">
              <div className="flex items-center space-x-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <span>Field Coordinator Assistance</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                For QR scanning discrepancies, offline synchronization support, or emergency onsite worker replacements, contact the PESO Dingalan Admin Helpdesk.
              </p>
              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-xs font-bold text-slate-600">LGU Dingalan Hotline</span>
                <span className="font-mono font-black text-slate-950">0917-PESO-DNG</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
