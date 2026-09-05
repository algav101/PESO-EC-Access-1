import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ParsedBarangayWorkProgram } from "@/lib/work-program-parser";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(user) && !hasPermission(user.role, "program.update")) {
      return NextResponse.json({ error: "Forbidden: Only Domain Master and PESO Admins can upload and commit work programs" }, { status: 403 });
    }

    const { programs } = (await request.json()) as { programs: ParsedBarangayWorkProgram[] };

    if (!programs || !Array.isArray(programs) || programs.length === 0) {
      return NextResponse.json({ error: "No work program data to commit" }, { status: 400 });
    }

    const program = await prisma.program.findUnique({
      where: { id: params.id },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    let totalItemsSaved = 0;

    // Execute in transaction with extended timeout (60s) and batch createMany
    await prisma.$transaction(
      async (tx) => {
        for (const wp of programs) {
          // 1. Upsert TupadWorkProgram
          const existingWp = await tx.tupadWorkProgram.findUnique({
            where: {
              programId_barangay: {
                programId: params.id,
                barangay: wp.barangay,
              },
            },
          });

          let workProgramId: string;
          if (existingWp) {
            workProgramId = existingWp.id;
            await tx.tupadWorkProgram.update({
              where: { id: existingWp.id },
              data: {
                projectLocation: wp.projectLocation || wp.barangay,
                beneficiaryCount: wp.beneficiaryCount,
                natureOfWork: wp.natureOfWork,
                workingHours: wp.workingHours,
              },
            });
            // Delete old items to replace with newly uploaded schedule
            await tx.tupadWorkProgramItem.deleteMany({
              where: { workProgramId: existingWp.id },
            });
          } else {
            const created = await tx.tupadWorkProgram.create({
              data: {
                programId: params.id,
                barangay: wp.barangay,
                projectLocation: wp.projectLocation || wp.barangay,
                beneficiaryCount: wp.beneficiaryCount,
                natureOfWork: wp.natureOfWork,
                workingHours: wp.workingHours,
              },
            });
            workProgramId = created.id;
          }

          // 2. High-speed batch insert items using createMany
          if (wp.items && wp.items.length > 0) {
            const itemsToInsert = wp.items.map((it, i) => ({
              workProgramId,
              dayNumber: it.dayNumber,
              specificActivities: it.specificActivities,
              area: it.area,
              maleCount: it.maleCount || 0,
              femaleCount: it.femaleCount || 0,
              scPwdMaleCount: it.scPwdMaleCount || 0,
              scPwdFemaleCount: it.scPwdFemaleCount || 0,
              totalCount: it.totalCount || (it.maleCount || 0) + (it.femaleCount || 0) || 0,
              orderIndex: it.orderIndex !== undefined ? it.orderIndex : i,
            }));

            await tx.tupadWorkProgramItem.createMany({
              data: itemsToInsert,
            });
            totalItemsSaved += itemsToInsert.length;
          }

          // 3. Sync ProgramBarangay target
          await tx.programBarangay.upsert({
            where: {
              programId_barangayName: {
                programId: params.id,
                barangayName: wp.barangay,
              },
            },
            update: {
              beneficiaryTarget: wp.beneficiaryCount,
              projectLocation: wp.projectLocation || wp.barangay,
            },
            create: {
              programId: params.id,
              barangayName: wp.barangay,
              beneficiaryTarget: wp.beneficiaryCount,
              projectLocation: wp.projectLocation || wp.barangay,
            },
          });
        }

        // Update program natureOfWork if currently empty
        if (!program.natureOfWork && programs[0]?.natureOfWork) {
          await tx.program.update({
            where: { id: params.id },
            data: { natureOfWork: programs[0].natureOfWork },
          });
        }
      },
      {
        timeout: 60000,
        maxWait: 20000,
      }
    );

    await logAudit({
      userId: user.id,
      action: "TUPAD_WORK_PROGRAM_COMMITTED",
      entityType: "PROGRAM",
      entityId: params.id,
      metadata: {
        barangayCount: programs.length,
        totalActivities: totalItemsSaved,
      },
    });

    return NextResponse.json({
      success: true,
      committedBarangays: programs.length,
      committedActivities: totalItemsSaved,
    });
  } catch (error: any) {
    console.error("Work Program commit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
