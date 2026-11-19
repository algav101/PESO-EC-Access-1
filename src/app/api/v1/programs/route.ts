export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getPhilippineTime } from "@/lib/utils";
import { buildProgramWorkDays, ProgramScheduleError } from "@/lib/program-work-days";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const programs = await prisma.program.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        workDays: {
          orderBy: { dayNumber: "asc" },
        },
        _count: {
          select: {
            programBeneficiaries: { where: { participationStatus: { not: "REPLACED" } } },
            workDays: true,
            qrCodes: true,
            payouts: true,
          },
        },
      },
    });

    return NextResponse.json({ programs });
  } catch (error: any) {
    console.error("GET /programs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "program.create")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const data = await request.json();
    const {
      programCode,
      batchNumber,
      programName,
      municipality = "Dingalan",
      province = "Aurora",
      doleOffice = "DOLE Aurora Field Office",
      projectLocation,
      natureOfWork,
      beneficiaryCount = 0,
      requiredWorkDays = 10,
      dailyHours = 8.0,
      morningStart = "08:00",
      morningEnd = "12:00",
      afternoonStart = "13:00",
      afternoonEnd = "17:00",
      orientationDate,
      orientationTime,
      orientationVenue,
      payoutDate,
      payoutTime,
      payoutVenue,
      startDate,
      endDate,
      barangays = [],
    } = data;

    if (!programCode || !programName) {
      return NextResponse.json({ error: "Program code and name are required" }, { status: 400 });
    }

    // Add selected barangays or default 11 Dingalan barangays
    const defaultBarangays = [
      "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
      "Dikapanikian", "Ibona", "Matawe", "Paltic",
      "Poblacion", "Tanawan", "Umiray"
    ];
    const targetBarangays = Array.isArray(barangays) && barangays.length > 0 ? barangays : defaultBarangays;

    // Auto-generate Work Days (Day 1 to N)
    const daysCount = Number(requiredWorkDays);
    const effectiveStartDate = startDate || getPhilippineTime().dateStr;
    const workDaysData = buildProgramWorkDays(effectiveStartDate, daysCount);

    // Create program transactionally using nested relational write in a single atomic query
    const program = await prisma.$transaction(
      async (tx) => {
        const created = await tx.program.create({
          data: {
            programCode: programCode.trim().toUpperCase(),
            batchNumber,
            programName,
            municipality,
            province,
            doleOffice,
            projectLocation,
            natureOfWork,
            beneficiaryCount: Number(beneficiaryCount) || 0,
            requiredWorkDays: Number(requiredWorkDays) || 10,
            dailyHours: Number(dailyHours) || 8.0,
            morningStart,
            morningEnd,
            afternoonStart,
            afternoonEnd,
            orientationDate,
            orientationTime,
            orientationVenue,
            payoutDate,
            payoutTime,
            payoutVenue,
            startDate: effectiveStartDate,
            endDate,
            status: "DRAFT",
            createdById: user.id,
            photoConfig: {
              create: {
                showGps: true,
                showDate: true,
                showTime: true,
                showBarangay: true,
                showProgramName: true,
              },
            },
            programBarangays: {
              create: targetBarangays.map((brgy: string) => ({
                barangayName: brgy,
                projectLocation: `Barangay ${brgy}, Dingalan, Aurora`,
              })),
            },
            workDays: {
              create: workDaysData,
            },
          },
        });

        return created;
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    await logAudit({
      userId: user.id,
      action: "PROGRAM_CREATED",
      entityType: "PROGRAM",
      entityId: program.id,
      newData: { programCode: program.programCode, name: program.programName },
    });

    return NextResponse.json({ success: true, program }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ProgramScheduleError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("POST /programs error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A program with this code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
