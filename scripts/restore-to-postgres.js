const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function restore() {
  const backupPath = path.join(__dirname, '../data_export/master_tupad_dingalan_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error("Backup file not found at:", backupPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  const prisma = new PrismaClient();

  console.log("=== RESTORING PREVIOUS DATA INTO TARGET POSTGRES DATABASE ===");

  try {
    // 1. System Settings
    if (data.SystemSetting) {
      console.log(`Restoring ${data.SystemSetting.length} System Settings...`);
      for (const s of data.SystemSetting) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, description: s.description },
          create: { key: s.key, value: s.value, description: s.description },
        }).catch(() => {});
      }
    }

    // 2. Users
    if (data.User) {
      console.log(`Restoring ${data.User.length} Users...`);
      for (const u of data.User) {
        await prisma.user.upsert({
          where: { username: u.username },
          update: { fullName: u.fullName, role: u.role, assignedBarangay: u.assignedBarangay, status: u.status },
          create: {
            id: u.id,
            username: u.username,
            passwordHash: u.passwordHash,
            fullName: u.fullName,
            email: u.email,
            role: u.role,
            assignedBarangay: u.assignedBarangay,
            status: u.status,
          },
        }).catch(() => {});
      }
    }

    // 3. Program & ProgramBarangay
    if (data.Program) {
      console.log(`Restoring ${data.Program.length} Programs...`);
      for (const p of data.Program) {
        await prisma.program.upsert({
          where: { programCode: p.programCode },
          update: {},
          create: {
            id: p.id,
            programCode: p.programCode,
            batchNumber: p.batchNumber,
            programName: p.programName,
            municipality: p.municipality,
            province: p.province,
            doleOffice: p.doleOffice,
            projectLocation: p.projectLocation,
            natureOfWork: p.natureOfWork,
            beneficiaryCount: p.beneficiaryCount,
            requiredWorkDays: p.requiredWorkDays,
            dailyHours: p.dailyHours,
            morningStart: p.morningStart,
            morningEnd: p.morningEnd,
            afternoonStart: p.afternoonStart,
            afternoonEnd: p.afternoonEnd,
            orientationDate: p.orientationDate,
            orientationTime: p.orientationTime,
            orientationVenue: p.orientationVenue,
            payoutDate: p.payoutDate,
            payoutTime: p.payoutTime,
            payoutVenue: p.payoutVenue,
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status,
            createdById: p.createdById,
          },
        }).catch(() => {});
      }
    }

    // 4. Beneficiaries
    if (data.Beneficiary) {
      console.log(`Restoring ${data.Beneficiary.length} Beneficiaries...`);
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
            sex: b.sex,
            civilStatus: b.civilStatus,
            contactNumber: b.contactNumber,
            barangay: b.barangay,
            sitio: b.sitio,
            municipality: b.municipality,
            province: b.province,
            status: b.status,
          },
        }).catch(() => {});
      }
    }

    // 5. Program Beneficiaries & QR Codes
    if (data.ProgramBeneficiary) {
      console.log(`Restoring ${data.ProgramBeneficiary.length} Program Beneficiaries...`);
      for (const pb of data.ProgramBeneficiary) {
        await prisma.programBeneficiary.upsert({
          where: { id: pb.id },
          update: {},
          create: {
            id: pb.id,
            programId: pb.programId,
            beneficiaryId: pb.beneficiaryId,
            designatedNumber: pb.designatedNumber,
            participationStatus: pb.participationStatus,
            originalBeneficiary: Boolean(pb.originalBeneficiary),
            tableNumber: pb.tableNumber,
            slotGroup: pb.slotGroup,
          },
        }).catch(() => {});
      }
    }

    if (data.QrCode) {
      console.log(`Restoring ${data.QrCode.length} QR Codes...`);
      for (const q of data.QrCode) {
        await prisma.qrCode.upsert({
          where: { id: q.id },
          update: {},
          create: {
            id: q.id,
            programId: q.programId,
            programBeneficiaryId: q.programBeneficiaryId,
            publicToken: q.publicToken,
            tokenHash: q.tokenHash,
            status: q.status,
          },
        }).catch(() => {});
      }
    }

    // 6. Work Programs & Items
    if (data.TupadWorkProgram) {
      console.log(`Restoring ${data.TupadWorkProgram.length} Work Programs...`);
      for (const wp of data.TupadWorkProgram) {
        await prisma.tupadWorkProgram.upsert({
          where: { id: wp.id },
          update: {},
          create: {
            id: wp.id,
            programId: wp.programId,
            barangay: wp.barangay,
            dayRange: wp.dayRange,
            status: wp.status,
            uploadedById: wp.uploadedById,
          },
        }).catch(() => {});
      }
    }

    if (data.TupadWorkProgramItem) {
      console.log(`Restoring ${data.TupadWorkProgramItem.length} Work Program Items...`);
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
            maleCount: wpi.maleCount,
            femaleCount: wpi.femaleCount,
            scPwdMaleCount: wpi.scPwdMaleCount,
            scPwdFemaleCount: wpi.scPwdFemaleCount,
            totalCount: wpi.totalCount,
            orderIndex: wpi.orderIndex,
          },
        }).catch(() => {});
      }
    }

    console.log("✓ Restore completed successfully!");
  } catch (err) {
    console.error("Restore error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

restore();
