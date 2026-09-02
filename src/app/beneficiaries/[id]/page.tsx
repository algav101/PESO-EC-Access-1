import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  User,
  MapPin,
  Calendar,
  Phone,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Banknote,
  FileText,
  History,
  ArrowLeft,
  Printer,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, formatTime } from "@/lib/utils";
import { generateQrDataUrl } from "@/lib/qr";

import { DeleteBeneficiaryModal } from "@/components/beneficiaries/DeleteBeneficiaryModal";
import { EditBeneficiaryButton } from "@/components/beneficiaries/EditBeneficiaryButton";

export const dynamic = "force-dynamic";

export default async function BeneficiaryProfilePage({ params }: { params: { id: string } }) {
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id: params.id },
    include: {
      programBeneficiaries: {
        include: {
          program: true,
          qrCodes: true,
          stubDistributions: true,
          orientationAttendance: true,
          attendanceRecords: {
            include: { workDay: true },
            orderBy: { workDay: { dayNumber: "asc" } },
          },
          payouts: true,
        },
        orderBy: { joinedAt: "desc" },
      },
      restrictions: { orderBy: { restrictionEnd: "desc" } },
      documents: true,
      dependents: true,
    },
  });

  if (!beneficiary) {
    notFound();
  }

  const latestProgramEnrollment = beneficiary.programBeneficiaries[0];
  const activeQr = latestProgramEnrollment?.qrCodes.find((q) => q.status === "ACTIVE");
  const qrDataUrl = activeQr ? await generateQrDataUrl(activeQr.publicToken) : null;
  const activeRestriction = beneficiary.restrictions.find((r) => r.status === "ACTIVE");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <a
          href="/beneficiaries"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-gov-blue"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Beneficiaries Masterlist</span>
        </a>

        <div className="flex items-center space-x-2">
          <EditBeneficiaryButton
            beneficiary={beneficiary}
            programBeneficiary={latestProgramEnrollment}
          />
          <DeleteBeneficiaryModal
            beneficiaryId={beneficiary.id}
            fullName={beneficiary.fullName}
            beneficiaryNumber={beneficiary.beneficiaryNumber}
            barangay={beneficiary.barangay || undefined}
          />
        </div>
      </div>

      {/* Profile Header */}
      <div className="gov-card p-6 bg-white border-l-4 border-l-gov-blue shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-full bg-gov-blue text-gov-goldLight font-bold text-xl flex items-center justify-center border-2 border-gov-gold shadow-md">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {beneficiary.beneficiaryNumber}
              </span>
              <StatusBadge status={beneficiary.status} />
              {activeRestriction && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  365-Day Locked
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {beneficiary.fullName}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Brgy. {beneficiary.barangay}, Dingalan</span>
              </span>
              <span className="flex items-center space-x-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Birthday: {beneficiary.birthday}</span>
              </span>
              {beneficiary.contactNumber && (
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{beneficiary.contactNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Preview Thumbnail */}
        {qrDataUrl && (
          <div className="flex flex-col items-center p-3 bg-slate-50 border rounded-xl space-y-1">
            <img src={qrDataUrl} alt="Beneficiary QR" className="w-20 h-20" />
            <span className="font-mono text-[9px] text-slate-400">Designated #{latestProgramEnrollment?.designatedNumber}</span>
          </div>
        )}
      </div>

      {/* Restriction Alert Banner if active */}
      {activeRestriction && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-xs text-rose-900 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-rose-800">Active 365-Day TUPAD Restriction Lock</p>
            <p className="text-[11px] text-rose-700">
              Reason: {activeRestriction.reason} • Active Until: <strong>{activeRestriction.restrictionEnd}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Program Enrollment & Table Assignment */}
        <div className="space-y-4">
          <div className="gov-card p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Program Enrollment
            </h2>
            {latestProgramEnrollment ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Program Title</span>
                  <p className="font-bold text-slate-900">{latestProgramEnrollment.program.programName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Designated #</span>
                    <p className="font-mono font-extrabold text-gov-blue text-base">
                      {latestProgramEnrollment.designatedNumber}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Table Assignment</span>
                    <p className="font-extrabold text-slate-800 text-sm">
                      {latestProgramEnrollment.tableNumber || "Table 1"}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Slot Allocation</span>
                  <p className="text-slate-700 font-semibold">{latestProgramEnrollment.slotGroup || "Main Regular"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No active program enrollment</p>
            )}
          </div>

          {/* Identification Documents */}
          <div className="gov-card p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Verification Documents ({beneficiary.documents.length})
            </h2>
            {beneficiary.documents.length === 0 ? (
              <p className="text-xs text-slate-400">No ID documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {beneficiary.documents.map((doc) => (
                  <div key={doc.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{doc.documentType.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-slate-400">{doc.fileName}</p>
                    </div>
                    <StatusBadge status={doc.verificationStatus} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 cols: 10-Day Attendance Matrix Log */}
        <div className="md:col-span-2 space-y-4">
          <div className="gov-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-gov-blue" />
                <span>10-Day Attendance Verification Record</span>
              </h2>
              <span className="text-xs font-bold text-gov-blue">
                {latestProgramEnrollment?.attendanceRecords.length || 0} / 10 Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                  <tr>
                    <th className="px-3 py-2">Day #</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-center">AM IN</th>
                    <th className="px-3 py-2 text-center">AM OUT</th>
                    <th className="px-3 py-2 text-center">PM IN</th>
                    <th className="px-3 py-2 text-center">PM OUT</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(latestProgramEnrollment?.attendanceRecords || []).map((att: any) => (
                    <tr key={att.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-gov-blue">Day {att.workDay.dayNumber}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{att.attendanceDate}</td>
                      <td className="px-3 py-2 text-center font-mono font-semibold text-slate-800">
                        {formatTime(att.morningTimeIn)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-semibold text-slate-800">
                        {formatTime(att.morningTimeOut)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-semibold text-slate-800">
                        {formatTime(att.afternoonTimeIn)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-semibold text-slate-800">
                        {formatTime(att.afternoonTimeOut)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge status={att.status} />
                      </td>
                    </tr>
                  ))}
                  {(!latestProgramEnrollment || latestProgramEnrollment.attendanceRecords.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                        No daily attendance records scanned yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payout & Restriction History */}
          <div className="gov-card p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Payout & 365-Day Restriction Timeline
            </h2>
            <div className="space-y-2">
              {beneficiary.restrictions.map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">{r.reason}</span>
                    <span className="text-[11px] text-slate-500">
                      Window: {r.restrictionStart} to {r.restrictionEnd}
                    </span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
              {beneficiary.restrictions.length === 0 && (
                <p className="text-xs text-slate-400">No past restrictions recorded for this beneficiary.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
