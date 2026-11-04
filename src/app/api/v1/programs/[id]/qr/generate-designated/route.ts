export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { ensureProgramQrCodes } from "@/lib/program-qr-generation";
import { generateBeneficiaryToken, formatBeneficiaryQrPayload, generateQrDataUrl } from "@/lib/qr";
import { assignBeneficiaryWorkArea, WorkProgramItemAllocation } from "@/lib/work-assignment";
import { format } from "date-fns";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "qr.generate")) return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    const programId = params.id;

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed
    }

    const forceRegenerate = Boolean(body?.forceRegenerate);
    const filterBarangay = body?.barangay && body.barangay !== "ALL" ? body.barangay : null;
    const origin =
      body?.origin ||
      request.headers.get("origin") ||
      (request.headers.get("host") ? `http://${request.headers.get("host")}` : undefined);

    // 1. Fetch Program & Work Program Items
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        workDays: { orderBy: { dayNumber: "asc" } },
        tupadWorkPrograms: {
          include: {
            items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Hindi nahanap ang programang ito." }, { status: 404 });
    }

    const stats = await prisma.$transaction((tx) => ensureProgramQrCodes(tx, programId, user.id, { force: forceRegenerate, barangay: filterBarangay }), { maxWait: 5000, timeout: 45000 });

    // 2. Fetch Beneficiaries
    const whereClause: any = {
      programId: program.id,
      participationStatus: { in: ["ACTIVE", "ENROLLED"] },
    };

    if (filterBarangay) {
      whereClause.beneficiary = { barangay: { equals: filterBarangay, mode: "insensitive" } };
    }

    const beneficiaries = await prisma.programBeneficiary.findMany({
      where: whereClause,
      include: {
        beneficiary: true,
        qrCodes: true,
      },
      orderBy: { designatedNumber: "asc" },
    });

    // Sort naturally by designated number (1, 2, 3...)
    beneficiaries.sort((a, b) => {
      const numA = parseInt(a.designatedNumber, 10);
      const numB = parseInt(b.designatedNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.designatedNumber).localeCompare(String(b.designatedNumber), undefined, { numeric: true });
    });

    const updatedBeneficiaries = await Promise.all(
      beneficiaries.map(async (pb) => {
        const activeQr = pb.qrCodes.find((q) => ["ACTIVE", "REPRINTED"].includes(q.status));
        if (!activeQr) throw new Error("QR not available after batch generation");

        // Build scannable direct web URL & QR Image Data URL
        const qrPayloadUrl = formatBeneficiaryQrPayload(activeQr.publicToken, origin);
        const qrDataUrl = await generateQrDataUrl(qrPayloadUrl);

        // Resolve Work Program for beneficiary's barangay & nearest purok
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

        const totalDays = program.requiredWorkDays || 10;
        const allDaysSchedule: any[] = [];

        for (let d = 1; d <= totalDays; d++) {
          const matchingWorkDay = program.workDays.find((w: any) => w.dayNumber === d);
          const dayDate = matchingWorkDay?.workDate || format(new Date(), "yyyy-MM-dd");

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

          const calculated = assignBeneficiaryWorkArea(
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

          allDaysSchedule.push({
            dayNumber: d,
            workDate: dayDate,
            area: calculated.area,
            specificActivity: calculated.specificActivity,
            matchingRationale: calculated.matchingRationale,
            allocationMethod: calculated.allocationMethod,
          });
        }

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
            sitio: pb.beneficiary.sitio || "Centro",
            barangay: pb.beneficiary.barangay || "Dingalan",
            isSenior: pb.beneficiary.isSenior,
            isPwd: pb.beneficiary.isPwd,
          },
          qr: {
            id: activeQr.id,
            publicToken: activeQr.publicToken,
            qrPayloadUrl,
            qrDataUrl,
            status: activeQr.status,
          },
          allDaysSchedule,
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: `Matagumpay na naihanda ang Designated Work Area QR Codes para sa ${beneficiaries.length} benepisyaryo.`,
      stats: {
        ...stats,
        newlyGeneratedCount: stats.generatedCount,
      },
      beneficiaries: updatedBeneficiaries,
    });
  } catch (error: any) {
    if (error.message === "QR_GENERATION_BUSY") return NextResponse.json({ error: "May ongoing import/QR generation sa program. Hintaying matapos." }, { status: 409 });
    console.error("Batch designated QR generation error:", { code: error.code || error.name });
    return NextResponse.json({ error: "Failed to generate designated QR codes: " + error.message }, { status: 500 });
  }
}
