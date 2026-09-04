import React from "react";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isPesoAdmin = isAdminUser(user);

  // Fetch all active, non-replaced program beneficiaries for exact arithmetic reconciliation
  const activeProgramBeneficiaries = await prisma.programBeneficiary.findMany({
    where: {
      participationStatus: { not: "REPLACED" },
    },
    include: {
      stubDistributions: {
        orderBy: { distributedAt: "desc" },
      },
      orientationAttendance: {
        where: { status: "PRESENT" },
      },
    },
  });

  const totalBeneficiariesCount = activeProgramBeneficiaries.length;

  let stubsConfirmedCount = 0;
  let flaggedReplacementCount = 0;

  for (const pb of activeProgramBeneficiaries) {
    const isFlagged =
      pb.participationStatus === "FLAGGED_FOR_REPLACEMENT" ||
      pb.stubDistributions?.some((d: any) => d.status === "FLAGGED_REPLACEMENT");
    const isDist = Boolean(pb.stubDistributions?.some((d: any) => d.status === "DISTRIBUTED"));

    if (isFlagged) {
      flaggedReplacementCount++;
    } else if (isDist) {
      stubsConfirmedCount++;
    }
  }

  // Exact Arithmetic: Pending (Uninformed) = Target - (Confirmed + Flagged for Replacement)
  const pendingUninformedCount = Math.max(
    0,
    totalBeneficiariesCount - (stubsConfirmedCount + flaggedReplacementCount)
  );

  const orientationPresentCount = activeProgramBeneficiaries.filter(
    (pb) => pb.orientationAttendance && pb.orientationAttendance.length > 0
  ).length;

  const [
    activeProgramsCount,
    qrGeneratedCount,
    todayAttendanceCount,
    payoutPaidCount,
    restrictedCount,
  ] = await Promise.all([
    prisma.program.count({ where: { status: "ACTIVE" } }),
    prisma.qrCode.count({
      where: {
        status: "ACTIVE",
        programBeneficiary: { participationStatus: { not: "REPLACED" } },
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        attendanceDate: format(new Date(), "yyyy-MM-dd"),
        programBeneficiary: { participationStatus: { not: "REPLACED" } },
      },
    }),
    prisma.payout.count({
      where: {
        status: "PAID",
        programBeneficiary: { participationStatus: { not: "REPLACED" } },
      },
    }),
    prisma.beneficiaryRestriction.count({ where: { status: "ACTIVE" } }),
  ]);

  const recentPrograms = await prisma.program.findMany({
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
  });

  // Strict: Only fetch audit records if the user is a PESO Admin
  const recentAudits = isPesoAdmin
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { fullName: true } },
        },
      })
    : [];

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
      sublabel: "Active Enrolled Roster",
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

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="gov-card p-6 bg-gradient-to-r from-slate-900 via-gov-dark to-gov-blue text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg border-l-4 border-l-gov-gold">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-gov-goldLight text-xs font-bold uppercase tracking-wider">
            <span>PESO Dingalan Operations Command Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            DOLE-TUPAD Beneficiary & Attendance Monitoring
          </h1>
          <p className="text-xs text-blue-100 max-w-xl">
            Real-time biometric & cryptographic QR verification across all 11 Dingalan barangays.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPesoAdmin && (
            <a
              href="/programs/new"
              className="px-4 py-2 bg-gov-gold hover:bg-gov-goldLight text-gov-dark font-bold text-xs rounded-lg transition shadow flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Program</span>
            </a>
          )}
          <a
            href="/field/attendance"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg border border-white/20 transition flex items-center space-x-1.5"
          >
            <Clock className="w-4 h-4 text-gov-goldLight" />
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
              className="gov-card p-4 sm:p-5 gov-card-hover flex items-center space-x-4 border border-slate-200"
            >
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  {card.label}
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {card.value}
                </p>
                {card.sublabel && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                    {card.sublabel}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Programs Hub */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <FolderKanban className="w-4 h-4 text-gov-blue" />
              <span>Active TUPAD Programs</span>
            </h2>
            <a href="/programs" className="text-xs font-bold text-gov-blue hover:underline">
              View All Programs
            </a>
          </div>

          <div className="space-y-3">
            {recentPrograms.map((prog) => (
              <div key={prog.id} className="gov-card p-5 space-y-3 gov-card-hover border-l-4 border-l-gov-blue">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-gov-blue border border-blue-200">
                      {prog.programCode}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{prog.programName}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {prog.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Beneficiaries</span>
                    <p className="font-extrabold text-slate-800">{prog._count.programBeneficiaries}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Attendance Scans</span>
                    <p className="font-extrabold text-slate-800">{prog._count.attendanceRecords}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Paid Payouts</span>
                    <p className="font-extrabold text-slate-800">{prog._count.payouts}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Schedule: {prog.requiredWorkDays} Work Days
                  </span>
                  <div className="flex space-x-2">
                    {isPesoAdmin && (
                      <a
                        href={`/programs/${prog.id}/import`}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                      >
                        Import Excel
                      </a>
                    )}
                    <a
                      href={`/programs/${prog.id}`}
                      className="px-2.5 py-1 text-[11px] font-bold bg-gov-blue hover:bg-gov-light text-white rounded transition flex items-center space-x-1"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3 h-3" />
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
          <div className="gov-card p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Field Operations Hub
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/field/stub-distribution"
                className="p-3 rounded-lg border border-slate-200 hover:border-gov-blue hover:bg-blue-50/50 text-center transition flex flex-col items-center space-y-1"
              >
                <QrCode className="w-5 h-5 text-gov-blue" />
                <span className="text-[11px] font-bold text-slate-800">Distribute Stubs</span>
              </a>
              <a
                href="/field/orientation"
                className="p-3 rounded-lg border border-slate-200 hover:border-gov-blue hover:bg-blue-50/50 text-center transition flex flex-col items-center space-y-1"
              >
                <CalendarCheck className="w-5 h-5 text-teal-600" />
                <span className="text-[11px] font-bold text-slate-800">Orientation</span>
              </a>
              <a
                href="/field/attendance"
                className="p-3 rounded-lg border border-slate-200 hover:border-gov-blue hover:bg-blue-50/50 text-center transition flex flex-col items-center space-y-1"
              >
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-[11px] font-bold text-slate-800">Daily QR Scan</span>
              </a>
              <a
                href="/field/photos"
                className="p-3 rounded-lg border border-slate-200 hover:border-gov-blue hover:bg-blue-50/50 text-center transition flex flex-col items-center space-y-1"
              >
                <Camera className="w-5 h-5 text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-800">Accomplishment</span>
              </a>
              <a
                href="/field/payout"
                className="p-3 rounded-lg border border-slate-200 hover:border-gov-blue hover:bg-blue-50/50 text-center transition flex flex-col items-center space-y-1"
              >
                <Banknote className="w-5 h-5 text-green-600" />
                <span className="text-[11px] font-bold text-slate-800">Payout</span>
              </a>
              <a
                href="/reports"
                className="p-3 rounded-lg border border-slate-200 hover:border-gov-blue hover:bg-blue-50/50 text-center transition flex flex-col items-center space-y-1"
              >
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                <span className="text-[11px] font-bold text-slate-800">Reports Engine</span>
              </a>
            </div>
          </div>

          {/* Audit Activity Feed: EXCLUSIVE TO PESO_ADMIN */}
          {isPesoAdmin ? (
            <div className="gov-card p-5 space-y-3 border-t-4 border-t-gov-blue">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-gov-blue" />
                  <span>Audit Activity</span>
                </h2>
                <a href="/admin/audit" className="text-[11px] font-bold text-gov-blue hover:underline">
                  View All
                </a>
              </div>

              <div className="space-y-2.5 text-xs">
                {recentAudits.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2 text-center">No recent audit logs recorded.</p>
                ) : (
                  recentAudits.map((a) => (
                    <div key={a.id} className="pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">{a.action.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(a.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        By {a.user?.fullName || "System"} • {a.entityType || "GENERAL"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Non-Admin Coordinator Guidance & Support Box */
            <div className="gov-card p-5 space-y-3 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-100">
              <div className="flex items-center space-x-2 text-gov-blue font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-gov-gold" />
                <span>Field Coordinator Assistance</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                For QR scanning discrepancies, offline synchronization support, or emergency onsite worker replacements, contact the PESO Dingalan Admin Helpdesk.
              </p>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-500">LGU Dingalan Hotline</span>
                <span className="font-mono font-bold text-gov-blue">0917-PESO-DNG</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
