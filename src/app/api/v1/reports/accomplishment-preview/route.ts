export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { DINGALAN_BARANGAYS } from "@/lib/utils";
import { buildBarangayCompletionDays, completionBarangay } from "@/lib/accomplishment-work-schedule";

function displayDate(raw?: string | null): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return "";
  const date = new Date(raw.slice(0, 10) + "T00:00:00Z");
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user.role, "report.export")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        programBeneficiaries: {
          where: { participationStatus: { not: "REPLACED" } },
          select: { id: true, beneficiary: { select: { barangay: true } } },
        },
        workDays: { orderBy: { dayNumber: "asc" } },
        accomplishmentPhotos: {
          where: { status: { not: "REJECTED" } },
          select: {
            workDayId: true,
            workProgramItemId: true,
            barangay: true,
            specificActivity: true,
            workArea: true,
            status: true,
          },
        },
        attendanceRecords: {
          where: { activityName: { not: null } },
          select: {
            workDayId: true,
            workProgramItemId: true,
            programBeneficiaryId: true,
            activityName: true,
            workArea: true,
          },
        },
        tupadWorkPrograms: {
          include: { items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] } },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const scheduledDates = program.workDays.map((d) => d.workDate).filter(Boolean).sort();
    const start = displayDate(program.startDate || scheduledDates[0]);
    const end = displayDate(program.endDate || scheduledDates[scheduledDates.length - 1]);
    const defaultPeriod = [start, end].filter(Boolean).join(" to ");

    const issueParts = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    }).formatToParts(new Date());
    const issuePart = (type: string) => issueParts.find((p) => p.type === type)?.value || "";
    const issueDay = Number(issuePart("day"));
    const ordinal =
      issueDay % 100 >= 11 && issueDay % 100 <= 13
        ? "th"
        : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[issueDay % 10] || "th";
    const defaultIssuedLine = `Issued this ${issueDay}${ordinal} day of ${issuePart("month")} ${issuePart("year")}.`;

    const barangays: Record<
      string,
      {
        barangayHeader: string;
        doleOffice: string;
        projectLocation: string;
        beneficiaryCount: string;
        periodOfWork: string;
        issuedLine: string;
        signatoryName: string;
        signatoryTitle: string;
        days: Array<{ dayNumber: number; label: string; text: string }>;
      }
    > = {};

    for (const brgy of DINGALAN_BARANGAYS) {
      const targetKey = completionBarangay(brgy);
      const peopleCount = program.programBeneficiaries.filter(
        (pb) => completionBarangay(pb.beneficiary.barangay) === targetKey
      ).length;
      const computedDays = buildBarangayCompletionDays(program, brgy);

      barangays[brgy] = {
        barangayHeader: `BRGY. ${brgy.toUpperCase()}, ${(program.municipality || "DINGALAN").toUpperCase()}, ${(program.province || "AURORA").toUpperCase()}.`,
        doleOffice: program.doleOffice?.trim() || "DOLE Aurora Field Office",
        projectLocation: `Brgy. ${brgy}, ${program.municipality || "Dingalan"}, ${program.province || "Aurora"}`,
        beneficiaryCount: String(peopleCount),
        periodOfWork: defaultPeriod,
        issuedLine: defaultIssuedLine,
        signatoryName: "ALBERT D. GAVIOLA",
        signatoryTitle: "PESO Manager - LGU Dingalan, Aurora",
        days: computedDays.map((day) => {
          const upperDate = displayDate(day.workDate).toUpperCase();
          return {
            dayNumber: day.dayNumber,
            label: upperDate ? `DAY ${day.dayNumber} - ${upperDate}` : `DAY ${day.dayNumber}`,
            text: day.accomplishment,
          };
        }),
      };
    }

    return NextResponse.json({
      program: {
        id: program.id,
        programCode: program.programCode,
        programName: program.programName,
        requiredWorkDays: program.requiredWorkDays,
        workDays: program.workDays,
      },
      barangays,
    });
  } catch (error: any) {
    console.error("GET accomplishment-preview error:", error);
    return NextResponse.json({ error: error.message || "Failed to load accomplishment preview" }, { status: 500 });
  }
}
