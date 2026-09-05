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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rawQrToken = (body.qrToken || body.token || "").toString().trim();
    const programIdParam = body.programId;

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

    // Strategy 1: Match by public token (exact / uppercase / contains)
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

    // =========================================================================
    // STEP 2 VALIDATION: Check DOLE Orientation Validation & Attendance
    // =========================================================================
    const orientationRec = pb.orientationAttendance?.[0];
    const isOriented = orientationRec && orientationRec.status === "PRESENT";
    const isOnsiteReplacement = !pb.originalBeneficiary && pb.participationStatus === "ACTIVE";

    const isAuthorizedForDeployment = isOriented || isOnsiteReplacement;

    // =========================================================================
    // DAY 1 ACTIVITY MATCHING & NEAREST PUROK PRIORITY SCHEDULING ALGORITHM
    // =========================================================================
    const workProgForBrgy = prog.tupadWorkPrograms?.find(
      (wp: any) => normalizeBarangayName(wp.barangay).toLowerCase() === normalizedBrgy.toLowerCase()
    );

    const day1Items: any[] = workProgForBrgy?.items || [];
    const beneSitio = bene.sitio || "Centro";
    const beneSex = (bene.sex || "UNKNOWN").toUpperCase();

    let assignedActivity: any = null;
    let proximityScore = 0;

    if (day1Items.length > 0) {
      // Score each Day 1 activity item based on Purok proximity & gender capacity
      const scoredItems = day1Items.map((item) => {
        const prox = computePurokProximityScore(beneSitio, item.area);
        
        // Gender capacity weighting
        let genderBonus = 0;
        if (beneSex === "MALE" && item.maleCount > 0) genderBonus = 10;
        if (beneSex === "FEMALE" && item.femaleCount > 0) genderBonus = 10;
        if ((bene.isSenior || bene.isPwd) && (item.scPwdMaleCount > 0 || item.scPwdFemaleCount > 0)) {
          genderBonus += 15;
        }

        return {
          item,
          totalScore: prox + genderBonus,
          proxScore: prox,
        };
      });

      // Sort by highest total priority score
      scoredItems.sort((a, b) => b.totalScore - a.totalScore);
      assignedActivity = scoredItems[0].item;
      proximityScore = scoredItems[0].proxScore;
    }

    // Default fallback if no specific TupadWorkProgram items exist
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

    const day1WorkDay = prog.workDays?.[0];
    const day1Date = day1WorkDay?.workDate || prog.startDate || "Schedule Pending";
    const workingHours =
      prog.workingHours ||
      "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)";

    return NextResponse.json({
      success: true,
      isAuthorizedForDeployment,
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
    console.error("Day 1 deployment lookup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
