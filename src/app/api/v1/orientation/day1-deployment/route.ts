import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeBarangayName } from "@/lib/utils";

/**
 * Computes Purok/Sitio match priority score
 */
function computePurokProximityScore(beneficiarySitio: string, activityArea: string): number {
  if (!beneficiarySitio || !activityArea) return 10;

  const cleanSitio = beneficiarySitio.toLowerCase().trim();
  const cleanArea = activityArea.toLowerCase().trim();

  // 1. Direct exact or substring match
  if (cleanArea.includes(cleanSitio) || cleanSitio.includes(cleanArea)) {
    return 100;
  }

  // 2. Tokenized word overlap (e.g. "mulawin", "ipil-ipil", "centro", "dalampasigan")
  const sitioTokens = cleanSitio.split(/[\s,/-]+/).filter((t) => t.length > 2 && t !== "purok" && t !== "sitio");
  const areaTokens = cleanArea.split(/[\s,/-]+/).filter((t) => t.length > 2 && t !== "purok" && t !== "sitio");

  let matchCount = 0;
  for (const st of sitioTokens) {
    if (areaTokens.some((at) => at.includes(st) || st.includes(at))) {
      matchCount++;
    }
  }

  if (matchCount > 0) {
    return 60 + matchCount * 15;
  }

  // 3. Fallback baseline
  return 20;
}

/**
 * GET: Retrieves Day 1 deployment tracking board, statistics, and roster
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const barangayFilter = searchParams.get("barangay");

    // Fetch active program
    let prog = null;
    if (programId) {
      prog = await prisma.program.findUnique({
        where: { id: programId },
        include: {
          workDays: { where: { dayNumber: 1 } },
          tupadWorkPrograms: {
            include: {
              items: {
                where: { dayNumber: 1 },
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
      });
    } else {
      prog = await prisma.program.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          workDays: { where: { dayNumber: 1 } },
          tupadWorkPrograms: {
            include: {
              items: {
                where: { dayNumber: 1 },
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
      });
    }

    if (!prog) {
      return NextResponse.json({
        summary: {
          totalTarget: 0,
          totalOriented: 0,
          totalDay1Deployed: 0,
          pendingDeployment: 0,
          maleDeployed: 0,
          femaleDeployed: 0,
          scPwdDeployed: 0,
          deploymentRate: 0,
        },
        workAreas: [],
        deployments: [],
      });
    }

    // Fetch all active ProgramBeneficiaries
    const pbs = await prisma.programBeneficiary.findMany({
      where: {
        programId: prog.id,
        participationStatus: "ACTIVE",
      },
      include: {
        beneficiary: true,
        orientationAttendance: {
          orderBy: { scannedAt: "desc" },
        },
        stubDistributions: {
          where: { status: "DISTRIBUTED" },
        },
        attendanceRecords: {
          where: { workDay: { dayNumber: 1 } },
          include: {
            workProgramItem: true,
            scannedBy: { select: { fullName: true } },
          },
        },
        qrCodes: { where: { status: "ACTIVE" } },
      },
      orderBy: { designatedNumber: "asc" },
    });

    const day1WorkDay = prog.workDays?.[0] || null;

    // Collect all Day 1 TupadWorkProgram items
    const allDay1Items: any[] = [];
    (prog.tupadWorkPrograms || []).forEach((wp) => {
      (wp.items || []).forEach((it) => {
        allDay1Items.push({
          ...it,
          barangay: wp.barangay,
        });
      });
    });

    let totalOrientedCount = 0;
    let totalDay1DeployedCount = 0;
    let maleDeployedCount = 0;
    let femaleDeployedCount = 0;
    let scPwdDeployedCount = 0;

    // Map each beneficiary to Day 1 deployment status
    const deployments = pbs.map((pb) => {
      const bene = pb.beneficiary;
      const normalizedBrgy = normalizeBarangayName(bene.barangay);
      const isOriented = pb.orientationAttendance?.some((o) => o.status === "PRESENT");
      const isReplacement = !pb.originalBeneficiary;
      const isAuthorized = isOriented || isReplacement;

      if (isOriented) totalOrientedCount++;

      // Check if Day 1 Attendance Record exists
      const day1Att = pb.attendanceRecords?.[0] || null;
      const isDeployed = !!day1Att && (day1Att.status === "PRESENT" || !!day1Att.morningTimeIn);

      const beneSex = (bene.sex || "UNKNOWN").toUpperCase();
      if (isDeployed) {
        totalDay1DeployedCount++;
        if (beneSex === "MALE") maleDeployedCount++;
        if (beneSex === "FEMALE") femaleDeployedCount++;
        if (bene.isSenior || bene.isPwd) scPwdDeployedCount++;
      }

      // Proximity Area Matching for Day 1
      const brgyItems = allDay1Items.filter(
        (it) => normalizeBarangayName(it.barangay).toLowerCase() === normalizedBrgy.toLowerCase()
      );
      const beneSitio = bene.sitio || "Centro";

      let assignedAreaName = day1Att?.workArea || "";
      let activityName = day1Att?.activityName || "";
      let proximityScore = 100;

      if (!assignedAreaName) {
        if (brgyItems.length > 0) {
          const scored = brgyItems.map((item) => {
            const prox = computePurokProximityScore(beneSitio, item.area);
            return { item, prox };
          });
          scored.sort((a, b) => b.prox - a.prox);
          assignedAreaName = scored[0].item.area;
          activityName = scored[0].item.specificActivities;
          proximityScore = scored[0].prox;
        } else {
          assignedAreaName = `${normalizedBrgy} — ${beneSitio} Sector`;
          activityName = prog.natureOfWork || "Community cleaning and roadside clearing.";
        }
      }

      return {
        id: pb.id,
        beneficiaryId: bene.id,
        designatedNumber: pb.designatedNumber,
        fullName: bene.fullName,
        barangay: normalizedBrgy,
        sitio: beneSitio,
        sex: beneSex,
        age: bene.age,
        isSenior: bene.isSenior,
        isPwd: bene.isPwd,
        tableNumber: pb.tableNumber || "Table 1",
        isOriginal: pb.originalBeneficiary,
        isOriented,
        isAuthorized,
        isDeployed,
        deployedAt: day1Att?.morningTimeIn || day1Att?.createdAt || null,
        deployedBy: day1Att?.scannedBy?.fullName || "Field Officer",
        assignedArea: assignedAreaName,
        activityName,
        proximityScore,
        purokRank: proximityScore >= 60 ? "DIRECT_NEAREST_PUROK" : "SECTOR_ALLOCATION",
        qrToken: pb.qrCodes?.[0]?.publicToken || `TUPAD-${pb.designatedNumber}`,
      };
    });

    // Compute area capacity breakdown
    const areaBreakdown = allDay1Items.map((item) => {
      const matchedDeployments = deployments.filter(
        (d) => d.isDeployed && d.assignedArea === item.area
      );
      return {
        id: item.id,
        barangay: item.barangay,
        area: item.area,
        specificActivities: item.specificActivities,
        targetQuota: item.totalCount || item.maleCount + item.femaleCount,
        maleQuota: item.maleCount,
        femaleQuota: item.femaleCount,
        currentDeployed: matchedDeployments.length,
        currentMale: matchedDeployments.filter((d) => d.sex === "MALE").length,
        currentFemale: matchedDeployments.filter((d) => d.sex === "FEMALE").length,
      };
    });

    const totalTarget = pbs.length;
    const deploymentRate = totalTarget > 0 ? ((totalDay1DeployedCount / totalTarget) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      program: {
        id: prog.id,
        programCode: prog.programCode,
        programName: prog.programName,
        startDate: prog.startDate,
        day1Date: day1WorkDay?.workDate || prog.startDate || "Schedule Pending",
      },
      summary: {
        totalTarget,
        totalOriented: totalOrientedCount,
        totalDay1Deployed: totalDay1DeployedCount,
        pendingDeployment: totalTarget - totalDay1DeployedCount,
        maleDeployed: maleDeployedCount,
        femaleDeployed: femaleDeployedCount,
        scPwdDeployed: scPwdDeployedCount,
        deploymentRate,
      },
      workAreas: areaBreakdown,
      deployments,
    });
  } catch (error: any) {
    console.error("Day 1 deployment GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Scans beneficiary Format 2 QR ID, computes nearest Purok deployment,
 * and tracks / registers Day 1 activity deployment in the database.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const programIdParam = body.programId;
    const shouldRecordScan = body.recordScan !== false; // Default true: register Day 1 attendance / deployment

    if (!rawQrToken) {
      return NextResponse.json({ error: "QR Token or Beneficiary identifier is required" }, { status: 400 });
    }

    // Clean URL prefixes if passed
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

    let qr = null;
    let pb: any = null;

    // Strategy 1: Match by public token
    qr = await prisma.qrCode.findFirst({
      where: {
        OR: [
          { publicToken: cleanToken },
          { publicToken: cleanToken.toUpperCase() },
          { publicToken: { contains: cleanToken, mode: "insensitive" } },
        ],
      },
      include: {
        programBeneficiary: {
          include: {
            beneficiary: true,
            program: {
              include: {
                workDays: { where: { dayNumber: 1 } },
                tupadWorkPrograms: {
                  include: {
                    items: {
                      where: { dayNumber: 1 },
                      orderBy: { orderIndex: "asc" },
                    },
                  },
                },
              },
            },
            orientationAttendance: {
              include: { scannedBy: { select: { fullName: true } } },
              orderBy: { scannedAt: "desc" },
            },
            stubDistributions: {
              where: { status: "DISTRIBUTED" },
            },
            attendanceRecords: {
              where: { workDay: { dayNumber: 1 } },
            },
          },
        },
      },
    });

    if (qr && qr.programBeneficiary) {
      pb = qr.programBeneficiary;
    }

    // Strategy 2: Match by numeric designated slot number
    const isNumericSlot = /^\d+$/.test(cleanToken);
    if (!pb && isNumericSlot) {
      const slotNum = String(parseInt(cleanToken, 10));
      const whereClause: any = { designatedNumber: slotNum, participationStatus: "ACTIVE" };
      if (programIdParam) whereClause.programId = programIdParam;

      pb = await prisma.programBeneficiary.findFirst({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          beneficiary: true,
          program: {
            include: {
              workDays: { where: { dayNumber: 1 } },
              tupadWorkPrograms: {
                include: {
                  items: {
                    where: { dayNumber: 1 },
                    orderBy: { orderIndex: "asc" },
                  },
                },
              },
            },
          },
          orientationAttendance: {
            include: { scannedBy: { select: { fullName: true } } },
            orderBy: { scannedAt: "desc" },
          },
          stubDistributions: {
            where: { status: "DISTRIBUTED" },
          },
          attendanceRecords: {
            where: { workDay: { dayNumber: 1 } },
          },
          qrCodes: { where: { status: "ACTIVE" } },
        },
      });

      if (pb) {
        qr = pb.qrCodes?.[0] || null;
      }
    }

    // Strategy 3: Match by Beneficiary Number or Full Name
    if (!pb) {
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
        include: {
          beneficiary: true,
          program: {
            include: {
              workDays: { where: { dayNumber: 1 } },
              tupadWorkPrograms: {
                include: {
                  items: {
                    where: { dayNumber: 1 },
                    orderBy: { orderIndex: "asc" },
                  },
                },
              },
            },
          },
          orientationAttendance: {
            include: { scannedBy: { select: { fullName: true } } },
            orderBy: { scannedAt: "desc" },
          },
          stubDistributions: {
            where: { status: "DISTRIBUTED" },
          },
          attendanceRecords: {
            where: { workDay: { dayNumber: 1 } },
          },
          qrCodes: { where: { status: "ACTIVE" } },
        },
      });

      if (pb) {
        qr = pb.qrCodes?.[0] || null;
      }
    }

    if (!pb) {
      return NextResponse.json(
        { error: `No active beneficiary record found for token "${cleanToken}".` },
        { status: 404 }
      );
    }

    // Resolve replacement if beneficiary was replaced
    if (pb.participationStatus === "REPLACED") {
      const replacement = await prisma.programBeneficiary.findFirst({
        where: {
          programId: pb.programId,
          designatedNumber: pb.designatedNumber,
          participationStatus: "ACTIVE",
        },
        include: {
          beneficiary: true,
          program: {
            include: {
              workDays: { where: { dayNumber: 1 } },
              tupadWorkPrograms: {
                include: {
                  items: {
                    where: { dayNumber: 1 },
                    orderBy: { orderIndex: "asc" },
                  },
                },
              },
            },
          },
          orientationAttendance: {
            include: { scannedBy: { select: { fullName: true } } },
            orderBy: { scannedAt: "desc" },
          },
          stubDistributions: {
            where: { status: "DISTRIBUTED" },
          },
          attendanceRecords: {
            where: { workDay: { dayNumber: 1 } },
          },
          qrCodes: { where: { status: "ACTIVE" } },
        },
      });

      if (replacement) {
        pb = replacement;
      }
    }

    const bene = pb.beneficiary;
    const prog = pb.program;
    const normalizedBrgy = normalizeBarangayName(bene.barangay);

    // STEP 2 VALIDATION: Check DOLE Orientation Validation & Attendance
    const orientationRec = pb.orientationAttendance?.[0];
    const isOriented = orientationRec && orientationRec.status === "PRESENT";
    const isOnsiteReplacement = !pb.originalBeneficiary && pb.participationStatus === "ACTIVE";
    const isAuthorizedForDeployment = isOriented || isOnsiteReplacement;

    // DAY 1 ACTIVITY MATCHING & NEAREST PUROK PRIORITY SCHEDULING ALGORITHM
    const workProgForBrgy = prog.tupadWorkPrograms?.find(
      (wp: any) => normalizeBarangayName(wp.barangay).toLowerCase() === normalizedBrgy.toLowerCase()
    );

    const day1Items: any[] = workProgForBrgy?.items || [];
    const beneSitio = bene.sitio || "Centro";
    const beneSex = (bene.sex || "UNKNOWN").toUpperCase();

    let assignedActivity: any = null;
    let proximityScore = 0;

    if (day1Items.length > 0) {
      const scoredItems = day1Items.map((item) => {
        const prox = computePurokProximityScore(beneSitio, item.area);
        let genderBonus = 0;
        if (beneSex === "MALE" && item.maleCount > 0) genderBonus = 10;
        if (beneSex === "FEMALE" && item.femaleCount > 0) genderBonus = 10;
        if ((bene.isSenior || bene.isPwd) && (item.scPwdMaleCount > 0 || item.scPwdFemaleCount > 0)) {
          genderBonus += 15;
        }
        return { item, totalScore: prox + genderBonus, proxScore: prox };
      });
      scoredItems.sort((a, b) => b.totalScore - a.totalScore);
      assignedActivity = scoredItems[0].item;
      proximityScore = scoredItems[0].proxScore;
    }

    if (!assignedActivity) {
      assignedActivity = {
        id: "DEFAULT_DAY_1",
        dayNumber: 1,
        specificActivities:
          prog.natureOfWork || "Community cleaning, coastal rehabilitation, and roadside clearing.",
        area: `${normalizedBrgy} — ${beneSitio} Community Work Zone`,
        maleCount: Math.round(prog.beneficiaryCount * 0.45) || 20,
        femaleCount: Math.round(prog.beneficiaryCount * 0.55) || 25,
        totalCount: prog.beneficiaryCount || 45,
      };
      proximityScore = 100;
    }

    // Ensure Day 1 WorkDay exists in DB
    let day1WorkDay = prog.workDays?.[0];
    if (!day1WorkDay) {
      const todayStr = new Date().toISOString().split("T")[0];
      day1WorkDay = await prisma.workDay.create({
        data: {
          programId: prog.id,
          dayNumber: 1,
          workDate: prog.startDate || todayStr,
          description: "Day 1 TUPAD Community Activity & Site Deployment",
          status: "ACTIVE",
        },
      });
    }

    const day1Date = day1WorkDay?.workDate || prog.startDate || "Schedule Pending";
    const workingHours =
      prog.workingHours ||
      "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)";

    // =========================================================================
    // RETRACK & REGISTER DAY 1 SCAN INTO ATTENDANCE RECORD
    // =========================================================================
    let existingAttendance = pb.attendanceRecords?.[0] || null;
    let isNewlyDeployed = false;

    if (shouldRecordScan && isAuthorizedForDeployment) {
      const now = new Date();
      if (!existingAttendance) {
        existingAttendance = await prisma.attendanceRecord.create({
          data: {
            programId: prog.id,
            workDayId: day1WorkDay.id,
            programBeneficiaryId: pb.id,
            attendanceDate: day1Date,
            morningTimeIn: now,
            status: "PRESENT",
            source: "FORMAT_2_QR_SCAN",
            scannedById: user.id,
            workArea: assignedActivity.area,
            activityName: assignedActivity.specificActivities,
            workProgramItemId: assignedActivity.id !== "DEFAULT_DAY_1" ? assignedActivity.id : undefined,
          },
        });
        isNewlyDeployed = true;
      } else {
        // Update with work area if not set
        if (!existingAttendance.workArea) {
          existingAttendance = await prisma.attendanceRecord.update({
            where: { id: existingAttendance.id },
            data: {
              workArea: assignedActivity.area,
              activityName: assignedActivity.specificActivities,
              workProgramItemId: assignedActivity.id !== "DEFAULT_DAY_1" ? assignedActivity.id : undefined,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      isAuthorizedForDeployment,
      isNewlyDeployed,
      alreadyDeployed: !!existingAttendance && !isNewlyDeployed,
      deployedAt: existingAttendance?.morningTimeIn || existingAttendance?.createdAt || null,
      validationStatus: isOriented
        ? "DOLE_ORIENTED_AND_VALIDATED"
        : isOnsiteReplacement
        ? "ONSITE_REPLACEMENT_VALIDATED"
        : "AWAITING_ORIENTATION_VERIFICATION",
      beneficiary: {
        id: pb.id,
        beneficiaryId: bene.id,
        designatedNumber: pb.designatedNumber,
        fullName: bene.fullName,
        lastName: bene.lastName,
        firstName: bene.firstName,
        middleName: bene.middleName,
        sitio: beneSitio,
        barangay: normalizedBrgy,
        sex: beneSex,
        birthday: bene.birthday,
        age: bene.age,
        isSenior: bene.isSenior,
        isPwd: bene.isPwd,
        tableNumber: pb.tableNumber || "Table 1",
        originalBeneficiary: pb.originalBeneficiary,
        qrToken: qr?.publicToken || `TUPAD-${pb.designatedNumber}`,
      },
      program: {
        id: prog.id,
        programCode: prog.programCode,
        programName: prog.programName,
        municipality: prog.municipality || "Dingalan",
        province: prog.province || "Aurora",
      },
      orientationRecord: orientationRec
        ? {
            status: orientationRec.status,
            scannedAt: orientationRec.scannedAt,
            scannedBy: orientationRec.scannedBy?.fullName || "PESO / DOLE Officer",
          }
        : null,
      day1Deployment: {
        dayNumber: 1,
        workDate: day1Date,
        workingHours: workingHours,
        specificActivities: assignedActivity.specificActivities,
        assignedArea: assignedActivity.area,
        purokPriorityScore: proximityScore,
        purokPriorityRank: proximityScore >= 60 ? "DIRECT_NEAREST_PUROK" : "CONTIGUOUS_SECTOR",
        teamQuota: {
          totalAssigned: assignedActivity.totalCount,
          maleQuota: assignedActivity.maleCount,
          femaleQuota: assignedActivity.femaleCount,
          scPwdQuota:
            (assignedActivity.scPwdMaleCount || 0) + (assignedActivity.scPwdFemaleCount || 0),
        },
        reportingTime: "07:45 AM (Barangay Assembly Point)",
        safetyGuidelines:
          "Bring your e-TUPAD Card ID (Format 2), wear DOLE TUPAD long-sleeve uniform, hat, and safety gloves. Report to Barangay Team Leader.",
      },
    });
  } catch (error: any) {
    console.error("Day 1 deployment scan error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
