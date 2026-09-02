import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { addDays, format, parseISO } from "date-fns";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const programs = await prisma.program.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            programBeneficiaries: true,
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

    // Create program transactionally
    const program = await prisma.$transaction(async (tx) => {
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
          startDate,
          endDate,
          status: "DRAFT",
          createdById: user.id,
        },
      });

      // Initialize Photo Configuration
      await tx.photoConfiguration.create({
        data: {
          programId: created.id,
          showGps: true,
          showDate: true,
          showTime: true,
          showBarangay: true,
          showProgramName: true,
        },
      });

      // Add selected barangays or default 11 Dingalan barangays
      const defaultBarangays = [
        "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
        "Dikapanikian", "Ibona", "Matawe", "Paltic",
        "Poblacion", "Tanawan", "Umiray"
      ];
      const targetBarangays = barangays.length > 0 ? barangays : defaultBarangays;

      for (const brgy of targetBarangays) {
        await tx.programBarangay.create({
          data: {
            programId: created.id,
            barangayName: brgy,
            projectLocation: `Barangay ${brgy}, Dingalan, Aurora`,
          },
        });
      }

      // Auto-generate Work Days (Day 1 to N)
      const daysCount = Number(requiredWorkDays) || 10;
      let startD = startDate ? parseISO(startDate) : new Date();

      let currentD = startD;
      let scheduledDays = 0;
      while (scheduledDays < daysCount) {
        // Skip Sundays if standard 6-day work week
        const dayOfWeek = currentD.getDay();
        if (dayOfWeek !== 0) { // 0 is Sunday
          scheduledDays++;
          await tx.workDay.create({
            data: {
              programId: created.id,
              dayNumber: scheduledDays,
              workDate: format(currentD, "yyyy-MM-dd"),
              description: `Day ${scheduledDays} Community Work Activities`,
              status: "SCHEDULED",
            },
          });
        }
        currentD = addDays(currentD, 1);
      }

      return created;
    });

    await logAudit({
      userId: user.id,
      action: "PROGRAM_CREATED",
      entityType: "PROGRAM",
      entityId: program.id,
      newData: { programCode: program.programCode, name: program.programName },
    });

    return NextResponse.json({ success: true, program }, { status: 201 });
  } catch (error: any) {
    console.error("POST /programs error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A program with this code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
