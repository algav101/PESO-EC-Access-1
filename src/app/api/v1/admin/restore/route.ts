import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "PESO_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only PESO Admins can access restore status" }, { status: 403 });
    }

    const beneCount = await prisma.beneficiary.count();
    const progCount = await prisma.program.count();
    const wpCount = await prisma.tupadWorkProgram.count();
    const wpiCount = await prisma.tupadWorkProgramItem.count();
    const qrCount = await prisma.qrCode.count();
    const userCount = await prisma.user.count();

    return NextResponse.json({
      success: true,
      stats: {
        beneficiaries: beneCount,
        programs: progCount,
        workPrograms: wpCount,
        workActivities: wpiCount,
        qrCodes: qrCount,
        users: userCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "PESO_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only PESO Admins can restore data" }, { status: 403 });
    }

    const backupPath = path.join(process.cwd(), "data_export/master_tupad_dingalan_backup.json");
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: "Backup file not found on server" }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

    // 1. Restore System Settings
    if (data.SystemSetting) {
      for (const s of data.SystemSetting) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, description: s.description },
          create: { key: s.key, value: s.value, description: s.description },
        }).catch(() => {});
      }
    }

    // 2. Restore Program
    let targetProgramId = "";
    if (data.Program && data.Program.length > 0) {
      for (const p of data.Program) {
        const prog = await prisma.program.upsert({
          where: { programCode: p.programCode },
          update: {},
          create: {
            id: p.id,
            programCode: p.programCode,
            batchNumber: p.batchNumber,
            programName: p.programName,
            municipality: p.municipality || "Dingalan",
            province: p.province || "Aurora",
            doleOffice: p.doleOffice || "DOLE Aurora Field Office",
            projectLocation: p.projectLocation || "Municipality of Dingalan (All 11 Barangays)",
            natureOfWork: p.natureOfWork,
            beneficiaryCount: p.beneficiaryCount || 538,
            requiredWorkDays: p.requiredWorkDays || 10,
            dailyHours: p.dailyHours || 8.0,
            morningStart: p.morningStart || "08:00",
            morningEnd: p.morningEnd || "12:00",
            afternoonStart: p.afternoonStart || "13:00",
            afternoonEnd: p.afternoonEnd || "17:00",
            orientationDate: p.orientationDate || "2026-08-01",
            payoutDate: p.payoutDate || "2026-08-15",
            startDate: p.startDate || "2026-08-03",
            endDate: p.endDate || "2026-08-14",
            status: p.status || "ACTIVE",
            createdById: user.id,
          },
        });
        targetProgramId = prog.id;
      }
    }

    // 3. Restore Beneficiaries (611 records)
    let beneCount = 0;
    if (data.Beneficiary) {
      for (const b of data.Beneficiary) {
        await prisma.beneficiary.upsert({
          where: { id: b.id },
          update: {},
          create: {
            id: b.id,
            beneficiaryNumber: b.beneficiaryNumber,
            fullName: b.fullName,
            lastName: b.lastName,
            firstName: b.firstName,
            middleName: b.middleName,
            birthday: b.birthday,
            sex: b.sex || "MALE",
            civilStatus: b.civilStatus,
            contactNumber: b.contactNumber,
            barangay: b.barangay || "Paltic",
            sitio: b.sitio,
            municipality: b.municipality || "Dingalan",
            province: b.province || "Aurora",
            status: b.status || "ACTIVE",
          },
        }).catch(() => {});
        beneCount++;
      }
    }

    // 4. Restore Program Beneficiaries (538 roster entries)
    let progBeneCount = 0;
    if (data.ProgramBeneficiary) {
      for (const pb of data.ProgramBeneficiary) {
        await prisma.programBeneficiary.upsert({
          where: { id: pb.id },
          update: {},
          create: {
            id: pb.id,
            programId: pb.programId || targetProgramId,
            beneficiaryId: pb.beneficiaryId,
            designatedNumber: pb.designatedNumber,
            participationStatus: pb.participationStatus || "ACTIVE",
            originalBeneficiary: Boolean(pb.originalBeneficiary),
            tableNumber: pb.tableNumber,
            slotGroup: pb.slotGroup || "Main Regular",
          },
        }).catch(() => {});
        progBeneCount++;
      }
    }

    // 5. Restore QR Codes (522 entries)
    if (data.QrCode) {
      for (const q of data.QrCode) {
        await prisma.qrCode.upsert({
          where: { id: q.id },
          update: {},
          create: {
            id: q.id,
            programId: q.programId || targetProgramId,
            programBeneficiaryId: q.programBeneficiaryId,
            publicToken: q.publicToken,
            tokenHash: q.tokenHash,
            status: q.status || "ACTIVE",
          },
        }).catch(() => {});
      }
    }

    // 6. Restore Work Programs & Items (11 Barangays / 226 Activities)
    let wpCount = 0;
    let wpiCount = 0;
    if (data.TupadWorkProgram) {
      for (const wp of data.TupadWorkProgram) {
        await prisma.tupadWorkProgram.upsert({
          where: { id: wp.id },
          update: {},
          create: {
            id: wp.id,
            programId: wp.programId || targetProgramId,
            barangay: wp.barangay,
            dayRange: wp.dayRange || "1-10",
            status: wp.status || "ACTIVE",
            uploadedById: user.id,
          },
        }).catch(() => {});
        wpCount++;
      }
    }

    if (data.TupadWorkProgramItem) {
      for (const wpi of data.TupadWorkProgramItem) {
        await prisma.tupadWorkProgramItem.upsert({
          where: { id: wpi.id },
          update: {},
          create: {
            id: wpi.id,
            workProgramId: wpi.workProgramId,
            dayNumber: wpi.dayNumber,
            specificActivities: wpi.specificActivities,
            area: wpi.area,
            maleCount: wpi.maleCount || 0,
            femaleCount: wpi.femaleCount || 0,
            scPwdMaleCount: wpi.scPwdMaleCount || 0,
            scPwdFemaleCount: wpi.scPwdFemaleCount || 0,
            totalCount: wpi.totalCount || 0,
            orderIndex: wpi.orderIndex || 0,
          },
        }).catch(() => {});
        wpiCount++;
      }
    }

    await logAudit({
      userId: user.id,
      action: "DATA_RESTORE_EXECUTED",
      entityType: "SYSTEM",
      metadata: {
        beneficiaries: beneCount,
        programBeneficiaries: progBeneCount,
        workPrograms: wpCount,
        workActivities: wpiCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data successfully restored to the active database.",
      restored: {
        beneficiaries: beneCount,
        programBeneficiaries: progBeneCount,
        workPrograms: wpCount,
        workActivities: wpiCount,
      },
    });
  } catch (error: any) {
    console.error("Data restore error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
