export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateBeneficiaryToken } from "@/lib/qr";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (
      !user ||
      (!hasPermission(user.role, "stub.override") &&
        !hasPermission(user.role, "orientation.correct") &&
        !hasPermission(user.role, "beneficiary.update"))
    ) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const {
      programBeneficiaryIds = [],
      action, // "APPROVE_STUB", "APPROVE_ORIENTATION", "APPROVE_BOTH", "RESET_STUB", "RESET_ORIENTATION", "RESET_BOTH"
      remarks,
    } = body;

    if (!Array.isArray(programBeneficiaryIds) || programBeneficiaryIds.length === 0) {
      return NextResponse.json({ error: "No beneficiaries selected" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // Fetch target program beneficiaries with their QR codes
    const targetBeneficiaries = await prisma.programBeneficiary.findMany({
      where: {
        id: { in: programBeneficiaryIds },
        programId: params.id,
      },
      include: {
        qrCodes: true,
      },
    });

    if (targetBeneficiaries.length === 0) {
      return NextResponse.json({ error: "No matching beneficiaries found for this program" }, { status: 404 });
    }

    const targetPbIds = targetBeneficiaries.map((b) => b.id);
    const chunkSize = 100;

    await prisma.$transaction(
      async (tx) => {
        // 1. Handle STUB / AFFIRMATION ACTIONS
        if (action === "APPROVE_STUB" || action === "APPROVE_BOTH") {
          // Clear existing stub distributions for these beneficiaries
          for (let i = 0; i < targetPbIds.length; i += chunkSize) {
            await tx.stubDistribution.deleteMany({
              where: { programBeneficiaryId: { in: targetPbIds.slice(i, i + chunkSize) } },
            });
          }

          // Ensure active QR exists for every beneficiary
          const stubDistributionsData: any[] = [];
          const missingQrs: any[] = [];

          for (const pb of targetBeneficiaries) {
            let activeQr = pb.qrCodes.find((q) => q.status === "ACTIVE") || pb.qrCodes[0];
            let qrId = activeQr?.id;

            if (!qrId) {
              qrId = crypto.randomUUID();
              const qrData = generateBeneficiaryToken(params.id, pb.designatedNumber);
              missingQrs.push({
                id: qrId,
                programId: params.id,
                programBeneficiaryId: pb.id,
                publicToken: qrData.publicToken,
                tokenHash: qrData.tokenHash,
                status: "ACTIVE",
                generatedById: user.id,
              });
            }

            stubDistributionsData.push({
              id: crypto.randomUUID(),
              qrId: qrId,
              programBeneficiaryId: pb.id,
              distributedById: user.id,
              distributedAt: new Date(),
              verificationMethod: "ADMIN_BULK_APPROVAL",
              status: "DISTRIBUTED",
              remarks: remarks || "Approved via Beneficiaries Masterlist Bulk Action",
            });
          }

          if (missingQrs.length > 0) {
            for (let i = 0; i < missingQrs.length; i += chunkSize) {
              await tx.qrCode.createMany({
                data: missingQrs.slice(i, i + chunkSize),
                skipDuplicates: true,
              });
            }
          }

          for (let i = 0; i < stubDistributionsData.length; i += chunkSize) {
            await tx.stubDistribution.createMany({
              data: stubDistributionsData.slice(i, i + chunkSize),
              skipDuplicates: true,
            });
          }

          // Reset any FLAGGED_FOR_REPLACEMENT to ACTIVE
          for (let i = 0; i < targetPbIds.length; i += chunkSize) {
            await tx.programBeneficiary.updateMany({
              where: {
                id: { in: targetPbIds.slice(i, i + chunkSize) },
                participationStatus: "FLAGGED_FOR_REPLACEMENT",
              },
              data: {
                participationStatus: "ACTIVE",
              },
            });
          }
        } else if (action === "RESET_STUB" || action === "RESET_BOTH") {
          for (let i = 0; i < targetPbIds.length; i += chunkSize) {
            await tx.stubDistribution.deleteMany({
              where: { programBeneficiaryId: { in: targetPbIds.slice(i, i + chunkSize) } },
            });
          }
        }

        // 2. Handle ORIENTATION ACTIONS
        if (action === "APPROVE_ORIENTATION" || action === "APPROVE_BOTH") {
          // Clear existing orientation records
          for (let i = 0; i < targetPbIds.length; i += chunkSize) {
            await tx.orientationAttendance.deleteMany({
              where: {
                programId: params.id,
                programBeneficiaryId: { in: targetPbIds.slice(i, i + chunkSize) },
              },
            });
          }

          const orientationData = targetPbIds.map((pbId) => ({
            id: crypto.randomUUID(),
            programId: params.id,
            programBeneficiaryId: pbId,
            status: "PRESENT",
            scannedById: user.id,
            scannedAt: new Date(),
            deviceId: "ADMIN_WEB_ROSTER",
            syncStatus: "SYNCED",
          }));

          for (let i = 0; i < orientationData.length; i += chunkSize) {
            await tx.orientationAttendance.createMany({
              data: orientationData.slice(i, i + chunkSize),
              skipDuplicates: true,
            });
          }
        } else if (action === "RESET_ORIENTATION" || action === "RESET_BOTH") {
          for (let i = 0; i < targetPbIds.length; i += chunkSize) {
            await tx.orientationAttendance.deleteMany({
              where: {
                programId: params.id,
                programBeneficiaryId: { in: targetPbIds.slice(i, i + chunkSize) },
              },
            });
          }
        }

        // 3. Handle DELETE BENEFICIARIES ACTION
        if (action === "DELETE_BENEFICIARIES") {
          const beneIds = Array.from(new Set(targetBeneficiaries.map((b) => b.beneficiaryId)));

          for (let i = 0; i < targetPbIds.length; i += chunkSize) {
            const chunk = targetPbIds.slice(i, i + chunkSize);
            await Promise.all([
              tx.attendanceRecord.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
              tx.orientationAttendance.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
              tx.stubDistribution.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
              tx.payout.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
              tx.qrCode.deleteMany({ where: { programBeneficiaryId: { in: chunk } } }),
            ]);
            await tx.programBeneficiary.deleteMany({ where: { id: { in: chunk } } });
          }

          if (body.deleteGlobal) {
            for (let i = 0; i < beneIds.length; i += chunkSize) {
              const chunk = beneIds.slice(i, i + chunkSize);
              await Promise.all([
                tx.dependent.deleteMany({ where: { beneficiaryId: { in: chunk } } }),
                tx.beneficiaryRestriction.deleteMany({ where: { beneficiaryId: { in: chunk } } }),
              ]);
              await tx.beneficiary.deleteMany({ where: { id: { in: chunk } } });
            }
          }

          // Recount program beneficiaries
          const count = await tx.programBeneficiary.count({
            where: { programId: params.id, participationStatus: { not: "REPLACED" } },
          });
          await tx.program.update({
            where: { id: params.id },
            data: { beneficiaryCount: count },
          });
        }
      },
      {
        timeout: 30000,
        maxWait: 15000,
      }
    );

    await logAudit({
      userId: user.id,
      action: `BENEFICIARY_BATCH_${action}`,
      entityType: "PROGRAM",
      entityId: params.id,
      metadata: { count: targetBeneficiaries.length, action, remarks, deleteGlobal: Boolean(body.deleteGlobal) },
    });

    return NextResponse.json({
      success: true,
      updatedCount: targetBeneficiaries.length,
      action,
    });
  } catch (error: any) {
    console.error("Batch action error:", error);
    return NextResponse.json({ error: error.message || "Failed to process batch action" }, { status: 500 });
  }
}
