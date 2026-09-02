import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const batches = await prisma.qrPrintBatch.findMany({
      where: { programId: params.id },
      include: {
        printedBy: { select: { fullName: true } },
        _count: { select: { printLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, "stub.print")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const {
      batchName = `Stub Batch ${new Date().toISOString().split("T")[0]}`,
      paperSize = "A4",
      stubWidth = 90.0,
      stubHeight = 55.0,
      rowsPerPage = 4,
      columnsPerPage = 2,
      reminderText,
      beneficiaryIds = [],
      printType = "INITIAL",
      reason,
    } = await request.json();

    if (printType === "REPRINT" && !reason) {
      return NextResponse.json({ error: "Reprint reason is mandatory for auditing" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.qrPrintBatch.create({
        data: {
          programId: params.id,
          batchName,
          paperSize,
          stubWidth: Number(stubWidth),
          stubHeight: Number(stubHeight),
          rowsPerPage: Number(rowsPerPage),
          columnsPerPage: Number(columnsPerPage),
          reminderText,
          printedById: user.id,
          printedAt: new Date(),
          printStatus: "PRINTED",
        },
      });

      // Target beneficiaries
      const targetQuery: any = { programId: params.id };
      if (beneficiaryIds.length > 0) {
        targetQuery.id = { in: beneficiaryIds };
      }

      const beneficiaries = await tx.programBeneficiary.findMany({
        where: targetQuery,
        include: { qrCodes: true },
      });

      for (const pb of beneficiaries) {
        const activeQr = pb.qrCodes.find((q) => q.status === "ACTIVE");
        if (activeQr) {
          await tx.qrPrintLog.create({
            data: {
              qrId: activeQr.id,
              printBatchId: batch.id,
              printType,
              reason,
              printedById: user.id,
            },
          });
        }
      }

      return batch;
    });

    await logAudit({
      userId: user.id,
      action: printType === "REPRINT" ? "QR_STUBS_REPRINTED" : "QR_STUBS_PRINTED",
      entityType: "QR_PRINT_BATCH",
      entityId: result.id,
      metadata: { printType, reason, count: beneficiaryIds.length },
    });

    return NextResponse.json({ success: true, batch: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST stubs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
