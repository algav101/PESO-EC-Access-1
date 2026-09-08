import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { assignBeneficiaryWorkArea, WorkProgramItemAllocation } from "@/lib/work-assignment";
import { getCurrentUser } from "@/lib/auth";

/**
 * Normalizes and verifies the entered middle name against the beneficiary's record (case-insensitive & accent-insensitive).
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
  const cleanEntered = (entered || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  // 1. Direct match with beneficiary.middleName
  const dbMiddle = (beneficiary.middleName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (dbMiddle) {
    if (cleanEntered === dbMiddle) return true;
    if (cleanEntered.length >= 3 && (dbMiddle.includes(cleanEntered) || cleanEntered.includes(dbMiddle))) return true;
    // Single letter initial match
    if (cleanEntered.length === 1 && dbMiddle.startsWith(cleanEntered)) return true;
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
        const candidateMiddle = parts[parts.length - 1]
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        if (cleanEntered === candidateMiddle) return true;
        if (cleanEntered.length >= 3 && (candidateMiddle.includes(cleanEntered) || cleanEntered.includes(candidateMiddle))) return true;
        if (cleanEntered.length === 1 && candidateMiddle.startsWith(cleanEntered)) return true;
      }
    } else {
      // Format B: "FIRST MIDDLE LAST"
      const parts = rawName.split(/\s+/);
      if (parts.length >= 3) {
        const candidateMiddle = parts[parts.length - 2]
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        if (cleanEntered === candidateMiddle) return true;
        if (cleanEntered.length >= 3 && (candidateMiddle.includes(cleanEntered) || cleanEntered.includes(candidateMiddle))) return true;
        if (cleanEntered.length === 1 && candidateMiddle.startsWith(cleanEntered)) return true;
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
  const lastNameParam = (params.lastName || "").toString().trim();
  const firstNameParam = (params.firstName || "").toString().trim();
  const enteredMiddleName = (params.middleName || params.authKey || "").toString();
  const barangayParam = (params.barangay || "").toString().trim();
  const programIdParam = params.programId || null;
  const explicitDayNumber = params.dayNumber ? parseInt(params.dayNumber, 10) : null;
  const targetDate = params.targetDate || format(new Date(), "yyyy-MM-dd");

  const hasNameInput = Boolean(lastNameParam && firstNameParam);
  if (!rawQrToken && !designatedNumber && !hasNameInput) {
    return NextResponse.json(
      { error: "Please provide your Full Name (Last Name, First Name, Middle Name), QR Token, or Designated Slot Number." },
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

  // 1. Search in ProgramBeneficiary by structured Full Name (Last Name, First Name, Barangay)
  if (hasNameInput) {
    const andConditions: any[] = [];

    // Match Last Name
    andConditions.push({
      OR: [
        { beneficiary: { lastName: { contains: lastNameParam, mode: "insensitive" } } },
        { beneficiary: { fullName: { contains: lastNameParam, mode: "insensitive" } } },
      ],
    });

    // Match First Name
    andConditions.push({
      OR: [
        { beneficiary: { firstName: { contains: firstNameParam, mode: "insensitive" } } },
        { beneficiary: { fullName: { contains: firstNameParam, mode: "insensitive" } } },
      ],
    });

    // Optional Barangay match
    if (barangayParam && barangayParam !== "ALL") {
      andConditions.push({
        beneficiary: { barangay: { contains: barangayParam, mode: "insensitive" } },
      });
    }

    const whereClause: any = {
      AND: andConditions,
      participationStatus: { in: ["ACTIVE", "REPLACED"] },
    };
    if (programIdParam) whereClause.programId = programIdParam;

    const candidatePbs = await prisma.programBeneficiary.findMany({
      where: whereClause,
      orderBy: { joinedAt: "desc" },
      include: pbIncludes,
      take: 10,
    });

    if (candidatePbs.length === 1) {
      pb = candidatePbs[0];
    } else if (candidatePbs.length > 1) {
      // If middle name provided, filter candidates by middle name verification
      if (enteredMiddleName) {
        const verified = candidatePbs.find((c) => verifyMiddleName(enteredMiddleName, c.beneficiary));
        if (verified) {
          pb = verified;
        } else {
          pb = candidatePbs[0];
        }
      } else {
        pb = candidatePbs[0];
      }
    }

    if (pb) {
      qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
    }
  }

  // 1.5. Fallback: Search in Masterlist Beneficiaries if not found in ProgramBeneficiary
  if (!pb && hasNameInput) {
    const andConditions: any[] = [];
    andConditions.push({
      OR: [
        { lastName: { contains: lastNameParam, mode: "insensitive" } },
        { fullName: { contains: lastNameParam, mode: "insensitive" } },
      ],
    });
    andConditions.push({
      OR: [
        { firstName: { contains: firstNameParam, mode: "insensitive" } },
        { fullName: { contains: firstNameParam, mode: "insensitive" } },
      ],
    });
    if (barangayParam && barangayParam !== "ALL") {
      andConditions.push({
        barangay: { contains: barangayParam, mode: "insensitive" },
      });
    }

    const masterlistCandidates = await prisma.beneficiary.findMany({
      where: { AND: andConditions },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (masterlistCandidates.length > 0) {
      let matchedBene = masterlistCandidates[0];
      if (enteredMiddleName) {
        const verified = masterlistCandidates.find((c) => verifyMiddleName(enteredMiddleName, c));
        if (verified) matchedBene = verified;
      }

      // Link with active program and work programs
      const activeProg = await prisma.program.findFirst({
        where: { status: "ACTIVE" },
        include: {
          workDays: { orderBy: { dayNumber: "asc" as const } },
          tupadWorkPrograms: {
            include: {
              items: { orderBy: [{ dayNumber: "asc" as const }, { orderIndex: "asc" as const }] },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (activeProg) {
        pb = {
          id: `MASTERLIST-${matchedBene.id}`,
          designatedNumber: "Enrolled",
          participationStatus: "ACTIVE",
          originalBeneficiary: true,
          tableNumber: "Desk 1",
          beneficiary: matchedBene,
          program: activeProg,
          qrCodes: [],
          attendanceRecords: [],
        };
      }
    }
  }

  // 2. Search by exact QR token
  if (!pb && cleanToken) {
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

  // 3. Search by designated slot number
  if (!pb && (designatedNumber || (/^\d+$/.test(cleanToken) && cleanToken.length < 5))) {
    const slotNum = designatedNumber || String(parseInt(cleanToken, 10));
    const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
    if (programIdParam) whereClause.programId = programIdParam;

    pb = await prisma.programBeneficiary.findFirst({
      where: whereClause,
      orderBy: { joinedAt: "desc" },
      include: pbIncludes,
    });

    if (pb) {
      qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
    }
  }

  // 4. Search by general beneficiary name or token
  if (!pb && cleanToken && !/^\d+$/.test(cleanToken)) {
    const whereClause: any = {
      OR: [
        { beneficiary: { beneficiaryNumber: cleanToken } },
        { beneficiary: { fullName: { contains: cleanToken, mode: "insensitive" } } },
      ],
    };
    if (programIdParam) whereClause.programId = programIdParam;

    pb = await prisma.programBeneficiary.findFirst({
      where: whereClause,
      orderBy: { joinedAt: "desc" },
      include: pbIncludes,
    });

    if (pb) {
      qr = pb.qrCodes.find((q: any) => q.status === "ACTIVE") || pb.qrCodes[0] || null;
    }
  }

  if (!pb) {
    return NextResponse.json(
      { error: "Walang nahanap na aktibong tala ng TUPAD benepisyaryo sa impormasyong ibinigay. Pakitiyak ang tamang baybay ng iyong Pangalan, Apelyido, at Gitnang Pangalan." },
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
  const beneBrgy = (beneficiary.barangay || "").toUpperCase().trim();
  const matchingWp =
    program.tupadWorkPrograms.find((wp: any) => {
      const wpBrgy = (wp.barangay || "").toUpperCase().trim();
      const wpLoc = (wp.projectLocation || "").toUpperCase().trim();
      return (
        wpBrgy === beneBrgy ||
        wpLoc === beneBrgy ||
        (beneBrgy && wpBrgy.includes(beneBrgy)) ||
        (wpBrgy && beneBrgy.includes(wpBrgy))
      );
    }) || program.tupadWorkPrograms[0] || null;

  let dayItems: WorkProgramItemAllocation[] = (matchingWp?.items || [])
    .filter((it: any) => it.dayNumber === dayNumber)
    .map((it: any) => ({
      id: it.id,
      dayNumber: it.dayNumber,
      specificActivities: it.specificActivities,
      area: it.area,
      maleCount: it.maleCount || 0,
      femaleCount: it.femaleCount || 0,
      scPwdMaleCount: it.scPwdMaleCount || 0,
      scPwdFemaleCount: it.scPwdFemaleCount || 0,
      totalCount: it.totalCount || 0,
    }));

  if (dayItems.length === 0 && matchingWp?.items?.length > 0) {
    dayItems = matchingWp.items.map((it: any) => ({
      id: it.id,
      dayNumber: it.dayNumber || dayNumber,
      specificActivities: it.specificActivities,
      area: it.area,
      maleCount: it.maleCount || 0,
      femaleCount: it.femaleCount || 0,
      scPwdMaleCount: it.scPwdMaleCount || 0,
      scPwdFemaleCount: it.scPwdFemaleCount || 0,
      totalCount: it.totalCount || 0,
    }));
  }

  // Perform smart proximity and gender area assignment for current day
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

  // Pre-calculate full 10-day schedule so client can switch days with instant 0ms speed
  const totalProgramDays = program.requiredWorkDays || 10;
  const allDaysSchedule: any[] = [];
  const dailyAssignmentsMap: Record<number, any> = {};

  for (let d = 1; d <= totalProgramDays; d++) {
    const matchingWorkDay = program.workDays.find((w: any) => w.dayNumber === d);
    const dayDate = matchingWorkDay?.workDate || targetDate;

    let specificDayItems: WorkProgramItemAllocation[] = (matchingWp?.items || [])
      .filter((it: any) => it.dayNumber === d)
      .map((it: any) => ({
        id: it.id,
        dayNumber: it.dayNumber,
        specificActivities: it.specificActivities,
        area: it.area,
        maleCount: it.maleCount || 0,
        femaleCount: it.femaleCount || 0,
        scPwdMaleCount: it.scPwdMaleCount || 0,
        scPwdFemaleCount: it.scPwdFemaleCount || 0,
        totalCount: it.totalCount || 0,
      }));

    if (specificDayItems.length === 0 && matchingWp?.items?.length > 0) {
      specificDayItems = matchingWp.items.map((it: any) => ({
        id: it.id,
        dayNumber: d,
        specificActivities: it.specificActivities,
        area: it.area,
        maleCount: it.maleCount || 0,
        femaleCount: it.femaleCount || 0,
        scPwdMaleCount: it.scPwdMaleCount || 0,
        scPwdFemaleCount: it.scPwdFemaleCount || 0,
        totalCount: it.totalCount || 0,
      }));
    }

    const calculatedDayAssignment = assignBeneficiaryWorkArea(
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
      specificDayItems,
      d
    );

    const entry = {
      dayNumber: d,
      workDate: dayDate,
      status: matchingWorkDay?.status || "SCHEDULED",
      area: calculatedDayAssignment.area,
      specificActivity: calculatedDayAssignment.specificActivity,
      proximityScore: calculatedDayAssignment.proximityScore,
      matchingRationale: calculatedDayAssignment.matchingRationale,
      allocationMethod: calculatedDayAssignment.allocationMethod,
    };

    allDaysSchedule.push(entry);
    dailyAssignmentsMap[d] = entry;
  }

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
    allDaysSchedule,
    dailyAssignments: dailyAssignmentsMap,
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
