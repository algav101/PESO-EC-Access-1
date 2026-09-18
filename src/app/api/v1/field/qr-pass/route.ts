export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateBeneficiaryToken, formatBeneficiaryQrPayload, generateQrDataUrl } from "@/lib/qr";
import { assignBeneficiaryWorkArea, WorkProgramItemAllocation } from "@/lib/work-assignment";
import { format } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") || searchParams.get("q") || "").trim();
    const designatedNumber = searchParams.get("designatedNumber") || searchParams.get("slot") || "";
    const barangay = searchParams.get("barangay") || "";
    const programId = searchParams.get("programId") || "";
    const dayNumberParam = searchParams.get("dayNumber") ? parseInt(searchParams.get("dayNumber")!, 10) : null;
    const origin = request.headers.get("origin") || request.headers.get("host") ? `http://${request.headers.get("host")}` : undefined;

    return await handleQrPassSearch({
      query,
      designatedNumber,
      barangay,
      programId,
      dayNumberParam,
      origin,
    });
  } catch (err: any) {
    console.error("Field QR Pass lookup error:", err);
    return NextResponse.json({ error: "Failed to generate QR pass: " + err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const origin = request.headers.get("origin") || undefined;
    return await handleQrPassSearch({ ...body, origin });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to parse request: " + err.message }, { status: 400 });
  }
}

async function handleQrPassSearch(params: {
  query?: string;
  designatedNumber?: string;
  barangay?: string;
  programId?: string;
  dayNumberParam?: number | null;
  origin?: string;
}) {
  const user = await getCurrentUser();

  // 1. Resolve Target Program
  let program: any = null;
  if (params.programId) {
    program = await prisma.program.findUnique({
      where: { id: params.programId },
      include: {
        workDays: { orderBy: { dayNumber: "asc" } },
        tupadWorkPrograms: {
          include: {
            items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
          },
        },
      },
    });
  }

  if (!program) {
    program = await prisma.program.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        workDays: { orderBy: { dayNumber: "asc" } },
        tupadWorkPrograms: {
          include: {
            items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
          },
        },
      },
    });
  }

  if (!program) {
    program = await prisma.program.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        workDays: { orderBy: { dayNumber: "asc" } },
        tupadWorkPrograms: {
          include: {
            items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
          },
        },
      },
    });
  }

  if (!program) {
    return NextResponse.json({ error: "No TUPAD program found." }, { status: 404 });
  }

  // 2. Build Where Clause
  const whereClause: any = {
    programId: program.id,
    participationStatus: { in: ["ACTIVE", "ENROLLED"] },
  };

  // Enforce coordinator / assisting documentor isolation if applicable
  if ((user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) {
    whereClause.beneficiary = { barangay: user.assignedBarangay };
  } else if (params.barangay && params.barangay !== "ALL") {
    whereClause.beneficiary = { barangay: { contains: params.barangay, mode: "insensitive" } };
  }

  const queryTerm = (params.designatedNumber || params.query || "").trim();
  if (queryTerm) {
    if (/^\d+$/.test(queryTerm) && queryTerm.length <= 4) {
      // Slot number match or name match
      whereClause.OR = [
        { designatedNumber: queryTerm },
        { designatedNumber: { contains: queryTerm } },
        { beneficiary: { fullName: { contains: queryTerm, mode: "insensitive" } } },
      ];
    } else {
      whereClause.OR = [
        { beneficiary: { fullName: { contains: queryTerm, mode: "insensitive" } } },
        { beneficiary: { lastName: { contains: queryTerm, mode: "insensitive" } } },
        { beneficiary: { firstName: { contains: queryTerm, mode: "insensitive" } } },
        { beneficiary: { sitio: { contains: queryTerm, mode: "insensitive" } } },
        { designatedNumber: { contains: queryTerm } },
      ];
    }
  }

  const programBeneficiaries = await prisma.programBeneficiary.findMany({
    where: whereClause,
    include: {
      beneficiary: true,
      qrCodes: true,
      attendanceRecords: {
        where: {
          attendanceDate: format(new Date(), "yyyy-MM-dd"),
        },
      },
    },
    take: 30,
  });

  // Sort naturally by designated number (1, 2, 3...)
  programBeneficiaries.sort((a, b) => {
    const numA = parseInt(a.designatedNumber, 10);
    const numB = parseInt(b.designatedNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, { numeric: true });
  });

  // 3. Process Each Beneficiary & Generate Scannable QR Payload
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const totalDays = program.requiredWorkDays || 10;
  const currentDayNumber = params.dayNumberParam || 1;

  const results = await Promise.all(
    programBeneficiaries.map(async (pb) => {
      let activeQr = pb.qrCodes.find((q) => q.status === "ACTIVE") || pb.qrCodes[0];

      // If no QR exists, auto-generate and store
      if (!activeQr) {
        const generated = generateBeneficiaryToken(program.id, pb.designatedNumber);
        activeQr = await prisma.qrCode.create({
          data: {
            programId: program.id,
            programBeneficiaryId: pb.id,
            publicToken: generated.publicToken,
            tokenHash: generated.tokenHash,
            status: "ACTIVE",
            generatedById: user?.id || null,
          },
        });
      }

      // Build scannable web URL and QR Image Data URL
      const qrPayloadUrl = formatBeneficiaryQrPayload(activeQr.publicToken, params.origin);
      const qrDataUrl = await generateQrDataUrl(qrPayloadUrl);

      // Resolve Work Program for beneficiary's barangay
      const beneBrgy = (pb.beneficiary.barangay || "").toUpperCase().trim();
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

      // Calculate 10-day schedule
      const allDaysSchedule: any[] = [];
      const dailyAssignmentsMap: Record<number, any> = {};

      for (let d = 1; d <= totalDays; d++) {
        const matchingWorkDay = program.workDays.find((w: any) => w.dayNumber === d);
        const dayDate = matchingWorkDay?.workDate || todayDate;

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
            id: pb.beneficiary.id,
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            sex: pb.beneficiary.sex,
            sitio: pb.beneficiary.sitio,
            barangay: pb.beneficiary.barangay,
            isSenior: pb.beneficiary.isSenior,
            isPwd: pb.beneficiary.isPwd,
          },
          specificDayItems,
          d
        );

        const entry = {
          dayNumber: d,
          workDate: dayDate,
          area: calculatedDayAssignment.area,
          specificActivity: calculatedDayAssignment.specificActivity,
          matchingRationale: calculatedDayAssignment.matchingRationale,
          allocationMethod: calculatedDayAssignment.allocationMethod,
        };

        allDaysSchedule.push(entry);
        dailyAssignmentsMap[d] = entry;
      }

      const activeAssignment = dailyAssignmentsMap[currentDayNumber] || allDaysSchedule[0] || {
        dayNumber: currentDayNumber,
        area: `Brgy. ${pb.beneficiary.barangay} Central Sector`,
        specificActivity: "Community Clearing & Greening",
        matchingRationale: "Standard Barangay Work Program Allocation",
      };

      return {
        id: pb.id,
        designatedNumber: pb.designatedNumber,
        tableNumber: pb.tableNumber || "Table 1",
        participationStatus: pb.participationStatus,
        beneficiary: {
          id: pb.beneficiary.id,
          fullName: pb.beneficiary.fullName,
          lastName: pb.beneficiary.lastName,
          firstName: pb.beneficiary.firstName,
          middleName: pb.beneficiary.middleName,
          sex: pb.beneficiary.sex,
          birthday: pb.beneficiary.birthday,
          contactNumber: pb.beneficiary.contactNumber,
          sitio: pb.beneficiary.sitio || "Centro",
          barangay: pb.beneficiary.barangay || "Dingalan",
          isSenior: pb.beneficiary.isSenior,
          isPwd: pb.beneficiary.isPwd,
          is4Ps: pb.beneficiary.is4Ps,
        },
        qr: {
          id: activeQr.id,
          publicToken: activeQr.publicToken,
          qrPayloadUrl,
          qrDataUrl,
          status: activeQr.status,
        },
        currentAssignment: activeAssignment,
        allDaysSchedule,
        dailyAssignments: dailyAssignmentsMap,
      };
    })
  );

  return NextResponse.json({
    success: true,
    program: {
      id: program.id,
      programCode: program.programCode,
      programName: program.programName,
      requiredWorkDays: program.requiredWorkDays,
      morningHours: `${program.morningStart || "08:00"} – ${program.morningEnd || "12:00"}`,
      afternoonHours: `${program.afternoonStart || "13:00"} – ${program.afternoonEnd || "17:00"}`,
      municipality: program.municipality || "Dingalan",
      province: program.province || "Aurora",
    },
    count: results.length,
    beneficiaries: results,
  });
}
