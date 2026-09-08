import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { assignBeneficiaryWorkArea, WorkProgramItemAllocation } from "@/lib/work-assignment";
import { getCurrentUser } from "@/lib/auth";

/**
 * Normalizes and verifies the entered middle name against the beneficiary's record (case-insensitive).
 */
function verifyMiddleName(
  entered: string = "",
  beneficiary: {
    middleName?: string | null;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }
): boolean {
  const cleanEntered = (entered || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Direct match with beneficiary.middleName
  const dbMiddle = (beneficiary.middleName || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (dbMiddle) {
    if (cleanEntered === dbMiddle) return true;
  }

  // 2. If beneficiary has no middle name in DB, accept standard empty / N/A tokens
  const noMiddleTokens = new Set(["", "na", "none", "wala", "no", "notapplicable"]);
  if (!dbMiddle && noMiddleTokens.has(cleanEntered)) {
    return true;
  }

  // 3. Fallback: Parse from fullName if middleName was embedded in fullName string
  if (beneficiary.fullName) {
    const rawName = beneficiary.fullName.trim();
    // Format A: "LAST, FIRST MIDDLE EXT"
    if (rawName.includes(",")) {
      const parts = rawName.split(",")[1]?.trim().split(/\s+/) || [];
      if (parts.length >= 2) {
        const candidateMiddle = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanEntered === candidateMiddle) return true;
      }
    } else {
      // Format B: "FIRST MIDDLE LAST"
      const parts = rawName.split(/\s+/);
      if (parts.length >= 3) {
        const candidateMiddle = parts[parts.length - 2].toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanEntered === candidateMiddle) return true;
      }
    }
  }

  return false;
}

/**
 * Masks a full name for unauthenticated privacy preview.
 * Example: "JUAN SANTOS DELA CRUZ" -> "J*** S***** D*** C***"
 */
function maskFullName(fullName: string = ""): string {
  if (!fullName) return "***";
  return fullName
    .split(/\s+/)
    .map((word) => (word.length > 1 ? word[0] + "*".repeat(Math.min(word.length - 1, 4)) : word))
    .join(" ");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return await handleLookup(body);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to parse lookup request: " + err.message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return await handleLookup(params);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to parse lookup request: " + err.message }, { status: 400 });
  }
}

async function handleLookup(params: any) {
  const rawQrToken = (params.qrToken || params.token || params.code || "").toString().trim();
  const designatedNumber = params.designatedNumber ? String(params.designatedNumber).trim() : null;
  const enteredMiddleName = (params.middleName || params.authKey || "").toString();
  const programIdParam = params.programId || null;
  const explicitDayNumber = params.dayNumber ? parseInt(params.dayNumber, 10) : null;
  const targetDate = params.targetDate || format(new Date(), "yyyy-MM-dd");

  if (!rawQrToken && !designatedNumber) {
    return NextResponse.json(
      { error: "Please provide a valid QR Token, QR Code string, or Designated Slot Number." },
      { status: 400 }
    );
  }

  // Check if staff/admin is authenticated in current session (bypasses middle-name prompt for official scanners)
  const sessionUser = await getCurrentUser();
  const isStaffSession = Boolean(sessionUser);

  // Clean token if URL
  let cleanToken = rawQrToken;
  try {
    if (rawQrToken.startsWith("http://") || rawQrToken.startsWith("https://")) {
      const parsedUrl = new URL(rawQrToken);
      cleanToken =
        parsedUrl.searchParams.get("token") ||
        parsedUrl.searchParams.get("qrToken") ||
        parsedUrl.pathname.split("/").pop() ||
        rawQrToken;
    }
  } catch {}
  cleanToken = cleanToken.trim();

  const pbIncludes = {
    beneficiary: true,
    program: {
      include: {
        workDays: { orderBy: { dayNumber: "asc" as const } },
        tupadWorkPrograms: {
          include: {
            items: { orderBy: [{ dayNumber: "asc" as const }, { orderIndex: "asc" as const }] },
          },
        },
      },
    },
    qrCodes: true,
    attendanceRecords: {
      where: {
        attendanceDate: targetDate,
      },
    },
  };

  let qr = null;
  let pb: any = null;

  // Search by exact QR token
  if (cleanToken) {
    qr = await prisma.qrCode.findFirst({
      where: {
        OR: [{ publicToken: cleanToken }, { publicToken: cleanToken.toUpperCase() }],
      },
      include: {
        programBeneficiary: {
          include: pbIncludes,
        },
      },
    });

    if (qr && qr.programBeneficiary) {
      pb = qr.programBeneficiary;
    }

    // Substring fallback
    if (!pb) {
      qr = await prisma.qrCode.findFirst({
        where: { publicToken: { contains: cleanToken, mode: "insensitive" } },
        include: {
          programBeneficiary: {
            include: pbIncludes,
          },
        },
      });
      if (qr && qr.programBeneficiary) {
        pb = qr.programBeneficiary;
      }
    }
  }

  // Search by designated slot number
  if (!pb && (designatedNumber || /^\d+$/.test(cleanToken))) {
    const slotNum = designatedNumber || String(parseInt(cleanToken, 10));
    const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
    if (programIdParam) whereClause.programId = programIdParam;

    pb = await prisma.programBeneficiary.findFirst({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: pbIncludes,
    });

    if (pb) {
      qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
    }
  }

  // Search by beneficiary name or number
  if (!pb && cleanToken) {
    const whereClause: any = {
      OR: [
        { beneficiary: { beneficiaryNumber: cleanToken } },
        { beneficiary: { fullName: { equals: cleanToken, mode: "insensitive" } } },
      ],
    };
    if (programIdParam) whereClause.programId = programIdParam;

    pb = await prisma.programBeneficiary.findFirst({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: pbIncludes,
    });

    if (pb) {
      qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
    }
  }

  if (!pb) {
    return NextResponse.json(
      { error: "Beneficiary or QR Token was not recognized in any active TUPAD program." },
      { status: 404 }
    );
  }

  // Handle replaced beneficiary
  if (pb.participationStatus === "REPLACED") {
    const activeReplacement = await prisma.programBeneficiary.findFirst({
      where: {
        programId: pb.programId,
        designatedNumber: pb.designatedNumber,
        participationStatus: "ACTIVE",
      },
      include: pbIncludes,
    });

    if (activeReplacement) {
      pb = activeReplacement;
      qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
    }
  }

  const program = pb.program;
  const beneficiary = pb.beneficiary;

  // =========================================================================
  // MIDDLE NAME AUTHENTICATION (DATA PRIVACY PROTECTION)
  // =========================================================================
  const isAuthProvided = params.hasOwnProperty("middleName") || params.hasOwnProperty("authKey");

  if (!isStaffSession) {
    if (!isAuthProvided) {
      // Return challenge response requiring Middle Name authentication
      return NextResponse.json({
        requiresAuth: true,
        authenticated: false,
        challenge: {
          designatedNumber: pb.designatedNumber,
          maskedName: maskFullName(beneficiary.fullName),
          barangay: beneficiary.barangay || "Dingalan",
          programName: program.programName,
          prompt: "Please enter your registered Middle Name to verify your identity and view your assigned work area.",
        },
      });
    }

    // Verify entered middle name (case-insensitive)
    const isMiddleNameValid = verifyMiddleName(enteredMiddleName, beneficiary);
    if (!isMiddleNameValid) {
      return NextResponse.json(
        {
          error: "Middle name verification failed. Please enter your registered middle name (or 'N/A' if none on record).",
          authFailed: true,
          designatedNumber: pb.designatedNumber,
          maskedName: maskFullName(beneficiary.fullName),
        },
        { status: 403 }
      );
    }
  }

  // Resolve active WorkDay
  let activeWorkDay = null;
  if (explicitDayNumber) {
    activeWorkDay = program.workDays.find((w: any) => w.dayNumber === explicitDayNumber);
  } else {
    activeWorkDay =
      program.workDays.find((w: any) => w.workDate === targetDate) ||
      program.workDays.find((w: any) => w.status === "ACTIVE") ||
      program.workDays[0] || {
        dayNumber: 1,
        workDate: targetDate,
      };
  }

  const dayNumber = activeWorkDay?.dayNumber || 1;
  const workDate = activeWorkDay?.workDate || targetDate;

  // Get matching Work Program for the beneficiary's barangay
  const beneBrgy = (beneficiary.barangay || "").toUpperCase();
  const matchingWp = program.tupadWorkPrograms.find(
    (wp: any) =>
      wp.barangay.toUpperCase() === beneBrgy || (wp.projectLocation || "").toUpperCase() === beneBrgy
  );

  const dayItems: WorkProgramItemAllocation[] = (matchingWp?.items || [])
    .filter((it: any) => it.dayNumber === dayNumber)
    .map((it: any) => ({
      id: it.id,
      dayNumber: it.dayNumber,
      specificActivities: it.specificActivities,
      area: it.area,
      maleCount: it.maleCount,
      femaleCount: it.femaleCount,
      scPwdMaleCount: it.scPwdMaleCount,
      scPwdFemaleCount: it.scPwdFemaleCount,
      totalCount: it.totalCount,
    }));

  // Perform smart proximity and gender area assignment
  const assignment = assignBeneficiaryWorkArea(
    {
      id: beneficiary.id,
      designatedNumber: pb.designatedNumber,
      fullName: beneficiary.fullName,
      sex: beneficiary.sex,
      sitio: beneficiary.sitio,
      barangay: beneficiary.barangay,
      isSenior: beneficiary.isSenior,
      isPwd: beneficiary.isPwd,
    },
    dayItems,
    dayNumber
  );

  // Check today's attendance record
  const todayAttendance = pb.attendanceRecords?.[0] || null;

  return NextResponse.json({
    success: true,
    authenticated: true,
    beneficiary: {
      id: beneficiary.id,
      designatedNumber: pb.designatedNumber,
      fullName: beneficiary.fullName,
      middleName: beneficiary.middleName || "",
      sex: beneficiary.sex || "UNSPECIFIED",
      birthday: beneficiary.birthday,
      age: beneficiary.age,
      sitio: beneficiary.sitio || "Central / Poblacion",
      barangay: beneficiary.barangay || "Dingalan",
      contactNumber: beneficiary.contactNumber,
      isSenior: beneficiary.isSenior,
      isPwd: beneficiary.isPwd,
      is4Ps: beneficiary.is4Ps,
      participationStatus: pb.participationStatus,
      tableNumber: pb.tableNumber,
      originalBeneficiary: pb.originalBeneficiary,
    },
    program: {
      id: program.id,
      programCode: program.programCode,
      programName: program.programName,
      requiredWorkDays: program.requiredWorkDays,
      morningHours: `${program.morningStart || "08:00"} – ${program.morningEnd || "12:00"}`,
      afternoonHours: `${program.afternoonStart || "13:00"} – ${program.afternoonEnd || "17:00"}`,
      natureOfWork: matchingWp?.natureOfWork || program.natureOfWork || "Environmental Cleaning & Maintenance",
    },
    workDay: {
      dayNumber,
      workDate,
      status: activeWorkDay?.status || "SCHEDULED",
    },
    assignment: {
      area: assignment.area,
      specificActivity: assignment.specificActivity,
      proximityScore: assignment.proximityScore,
      matchingRationale: assignment.matchingRationale,
      allocationMethod: assignment.allocationMethod,
      itemId: assignment.assignedItem?.id || null,
      dayNumber: assignment.dayNumber,
    },
    attendance: todayAttendance
      ? {
          status: todayAttendance.status,
          morningTimeIn: todayAttendance.morningTimeIn,
          morningTimeOut: todayAttendance.morningTimeOut,
          afternoonTimeIn: todayAttendance.afternoonTimeIn,
          afternoonTimeOut: todayAttendance.afternoonTimeOut,
          workArea: todayAttendance.workArea,
        }
      : null,
    qr: qr
      ? {
          publicToken: qr.publicToken,
          status: qr.status,
        }
      : null,
  });
}
