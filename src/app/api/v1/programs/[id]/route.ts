export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const program = await prisma.program.findUnique({
      where: { id: params.id },
      include: {
        programBarangays: true,
        workDays: { orderBy: { dayNumber: "asc" } },
        tableRules: { orderBy: { startNumber: "asc" } },
        photoConfig: true,
        tupadWorkPrograms: {
          include: {
            items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
          },
        },
        _count: {
          select: {
            programBeneficiaries: { where: { participationStatus: { not: "REPLACED" } } },
            qrCodes: true,
            orientationAttendance: true,
            beneficiaryReplacements: true,
            attendanceRecords: true,
            accomplishmentPhotos: true,
            payouts: true,
            tupadWorkPrograms: true,
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    return NextResponse.json({ program });
  } catch (error: any) {
    console.error("GET /programs/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "program.update")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const oldProgram = await prisma.program.findUnique({
      where: { id: params.id },
      include: { programBarangays: true },
    });
    if (!oldProgram) return NextResponse.json({ error: "Program not found" }, { status: 404 });

    const {
      programCode,
      batchNumber,
      programName,
      status,
      municipality,
      province,
      doleOffice,
      projectLocation,
      natureOfWork,
      requiredWorkDays,
      dailyHours,
      morningStart,
      morningEnd,
      afternoonStart,
      afternoonEnd,
      startDate,
      endDate,
      orientationDate,
      orientationTime,
      orientationVenue,
      payoutDate,
      payoutTime,
      payoutVenue,
      participatingBarangays,
    } = body;

    const updateData: any = {};
    if (programCode !== undefined) updateData.programCode = String(programCode).trim();
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber ? String(batchNumber).trim() : null;
    if (programName !== undefined) updateData.programName = String(programName).trim();
    if (status !== undefined) updateData.status = status;
    if (municipality !== undefined) updateData.municipality = municipality;
    if (province !== undefined) updateData.province = province;
    if (doleOffice !== undefined) updateData.doleOffice = doleOffice;
    if (projectLocation !== undefined) updateData.projectLocation = projectLocation;
    if (natureOfWork !== undefined) updateData.natureOfWork = natureOfWork;
    if (requiredWorkDays !== undefined) updateData.requiredWorkDays = parseInt(requiredWorkDays, 10);
    if (dailyHours !== undefined) updateData.dailyHours = parseFloat(dailyHours);
    if (morningStart !== undefined) updateData.morningStart = morningStart;
    if (morningEnd !== undefined) updateData.morningEnd = morningEnd;
    if (afternoonStart !== undefined) updateData.afternoonStart = afternoonStart;
    if (afternoonEnd !== undefined) updateData.afternoonEnd = afternoonEnd;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (orientationDate !== undefined) updateData.orientationDate = orientationDate;
    if (orientationTime !== undefined) updateData.orientationTime = orientationTime;
    if (orientationVenue !== undefined) updateData.orientationVenue = orientationVenue;
    if (payoutDate !== undefined) updateData.payoutDate = payoutDate;
    if (payoutTime !== undefined) updateData.payoutTime = payoutTime;
    if (payoutVenue !== undefined) updateData.payoutVenue = payoutVenue;

    const updated = await prisma.$transaction(
      async (tx) => {
        const prog = await tx.program.update({
          where: { id: params.id },
          data: updateData,
        });

        // Update participating barangays if array provided
        if (Array.isArray(participatingBarangays)) {
          await tx.programBarangay.deleteMany({
            where: { programId: params.id },
          });

          const barangayRecords = participatingBarangays
            .map((brgy) => {
              const brgyName = typeof brgy === "string" ? brgy : brgy.barangayName;
              if (!brgyName) return null;
              return {
                programId: params.id,
                barangayName: brgyName,
                projectLocation: typeof brgy === "object" ? brgy.projectLocation : null,
                beneficiaryTarget: typeof brgy === "object" ? brgy.beneficiaryTarget || 0 : 0,
              };
            })
            .filter(Boolean);

          if (barangayRecords.length > 0) {
            await tx.programBarangay.createMany({
              data: barangayRecords as any[],
            });
          }
        }

        return prog;
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    await logAudit({
      userId: user.id,
      action: "PROGRAM_UPDATED",
      entityType: "PROGRAM",
      entityId: params.id,
      oldData: oldProgram,
      newData: updated,
    });

    return NextResponse.json({ success: true, program: updated });
  } catch (error: any) {
    console.error("PATCH /programs/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "program.delete")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to delete programs" }, { status: 403 });
    }

    const program = await prisma.program.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            programBeneficiaries: true,
            attendanceRecords: true,
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Safely delete program and all cascade relations in transaction
    await prisma.$transaction(
      async (tx) => {
        // 1. Delete associated attendance, photos, replacements, stubs, and QR tokens
        await tx.attendanceRecord.deleteMany({ where: { programId: params.id } });
        await tx.accomplishmentPhoto.deleteMany({ where: { programId: params.id } });
        await tx.beneficiaryReplacement.deleteMany({ where: { programId: params.id } });
        await tx.orientationAttendance.deleteMany({ where: { programId: params.id } });
        await tx.payout.deleteMany({ where: { programId: params.id } });
        await tx.beneficiaryRestriction.deleteMany({ where: { sourceProgramId: params.id } });
        await tx.stubDistribution.deleteMany({
          where: { programBeneficiary: { programId: params.id } },
        });
        await tx.qrPrintLog.deleteMany({
          where: { qr: { programId: params.id } },
        });
        await tx.qrCode.deleteMany({ where: { programId: params.id } });
        await tx.qrPrintBatch.deleteMany({ where: { programId: params.id } });
        await tx.tableAssignmentRule.deleteMany({ where: { programId: params.id } });
        await tx.photoConfiguration.deleteMany({ where: { programId: params.id } });
        await tx.tupadWorkProgram.deleteMany({ where: { programId: params.id } });
        await tx.workDay.deleteMany({ where: { programId: params.id } });
        await tx.programBarangay.deleteMany({ where: { programId: params.id } });

        // 2. Delete program beneficiaries
        await tx.programBeneficiary.deleteMany({ where: { programId: params.id } });

        // 3. Delete program itself
        await tx.program.delete({ where: { id: params.id } });
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    await logAudit({
      userId: user.id,
      action: "PROGRAM_DELETED",
      entityType: "PROGRAM",
      entityId: params.id,
      oldData: program,
    });

    return NextResponse.json({
      success: true,
      message: `Program '${program.programName}' and its associated records have been deleted successfully.`,
    });
  } catch (error: any) {
    console.error("DELETE /programs/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
