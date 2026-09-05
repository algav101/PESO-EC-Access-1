const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function toDate(val) {
  if (!val) return null;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 10000000000) return new Date(num);
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function toBool(val, defaultVal = false) {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'boolean') return val;
  if (val === 1 || val === '1' || val === 'true' || val === 'TRUE') return true;
  if (val === 0 || val === '0' || val === 'false' || val === 'FALSE') return false;
  return defaultVal;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const prisma = new PrismaClient();
  const backupPath = path.join(__dirname, '../data_export/master_tupad_dingalan_backup.json');

  if (!fs.existsSync(backupPath)) {
    console.error("Backup file not found at:", backupPath);
    process.exit(1);
  }

  console.log("=== STARTING ROBUST MASTER DATA SYNCHRONIZATION ===");
  const rawData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  try {
    // 1. System Settings
    if (rawData.SystemSetting && rawData.SystemSetting.length > 0) {
      console.log(`\n[1/17] Syncing ${rawData.SystemSetting.length} System Settings...`);
      for (const s of rawData.SystemSetting) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, description: s.description },
          create: {
            key: s.key,
            value: s.value,
            description: s.description,
            updatedAt: toDate(s.updatedAt) || new Date(),
          },
        });
      }
      console.log(`✓ System Settings synced.`);
    }

    // 2. Fetch all existing users from Postgres and create user lookup map
    const existingUsers = await prisma.user.findMany();
    const userByUsername = new Map(existingUsers.map(u => [u.username, u]));
    const userById = new Map(existingUsers.map(u => [u.id, u]));
    
    // Upsert coordinator and dole users if not already present
    if (rawData.User && rawData.User.length > 0) {
      console.log(`\n[2/17] Checking ${rawData.User.length} Backup Users...`);
      for (const u of rawData.User) {
        let user = userByUsername.get(u.username);
        if (!user) {
          user = await prisma.user.create({
            data: {
              id: u.id,
              username: u.username,
              passwordHash: u.passwordHash,
              fullName: u.fullName,
              email: u.email,
              role: u.role,
              assignedBarangay: u.assignedBarangay || null,
              status: u.status || 'ACTIVE',
              lastLoginAt: toDate(u.lastLoginAt),
              createdAt: toDate(u.createdAt) || new Date(),
              updatedAt: toDate(u.updatedAt) || new Date(),
            },
          });
          userByUsername.set(user.username, user);
          userById.set(user.id, user);
        }
      }
      console.log(`✓ Users synced.`);
    }

    // Re-query users to get complete lookup
    const allUsers = await prisma.user.findMany();
    const validUserIds = new Set(allUsers.map(u => u.id));
    const defaultAdmin = allUsers.find(u => u.username === 'admin') || allUsers[0];
    const defaultAdminId = defaultAdmin ? defaultAdmin.id : null;

    const sanitizeUserId = (id) => {
      if (!id) return null;
      if (validUserIds.has(id)) return id;
      return defaultAdminId;
    };

    // 3. Programs
    if (rawData.Program && rawData.Program.length > 0) {
      console.log(`\n[3/17] Syncing ${rawData.Program.length} Programs...`);
      for (const p of rawData.Program) {
        await prisma.program.upsert({
          where: { programCode: p.programCode },
          update: {
            programName: p.programName,
            batchNumber: p.batchNumber,
            municipality: p.municipality || 'Dingalan',
            province: p.province || 'Aurora',
            doleOffice: p.doleOffice,
            projectLocation: p.projectLocation,
            natureOfWork: p.natureOfWork,
            beneficiaryCount: p.beneficiaryCount || 0,
            requiredWorkDays: p.requiredWorkDays || 10,
            dailyHours: Number(p.dailyHours) || 8.0,
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
            status: 'ACTIVE', // Active status
            createdById: sanitizeUserId(p.createdById),
          },
          create: {
            id: p.id,
            programCode: p.programCode,
            batchNumber: p.batchNumber,
            programName: p.programName,
            municipality: p.municipality || 'Dingalan',
            province: p.province || 'Aurora',
            doleOffice: p.doleOffice,
            projectLocation: p.projectLocation,
            natureOfWork: p.natureOfWork,
            beneficiaryCount: p.beneficiaryCount || 0,
            requiredWorkDays: p.requiredWorkDays || 10,
            dailyHours: Number(p.dailyHours) || 8.0,
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
            status: 'ACTIVE',
            createdById: sanitizeUserId(p.createdById),
            createdAt: toDate(p.createdAt) || new Date(),
            updatedAt: toDate(p.updatedAt) || new Date(),
          },
        });
      }
      console.log(`✓ Programs synced.`);
    }

    // 4. Program Barangays
    if (rawData.ProgramBarangay && rawData.ProgramBarangay.length > 0) {
      console.log(`\n[4/17] Syncing ${rawData.ProgramBarangay.length} Program Barangays...`);
      for (const pb of rawData.ProgramBarangay) {
        await prisma.programBarangay.upsert({
          where: {
            programId_barangayName: {
              programId: pb.programId,
              barangayName: pb.barangayName,
            },
          },
          update: {
            projectLocation: pb.projectLocation,
            beneficiaryTarget: pb.beneficiaryTarget || 0,
          },
          create: {
            id: pb.id,
            programId: pb.programId,
            barangayName: pb.barangayName,
            projectLocation: pb.projectLocation,
            beneficiaryTarget: pb.beneficiaryTarget || 0,
            createdAt: toDate(pb.createdAt) || new Date(),
          },
        });
      }
      console.log(`✓ Program Barangays synced.`);
    }

    // 5. Beneficiaries
    if (rawData.Beneficiary && rawData.Beneficiary.length > 0) {
      console.log(`\n[5/17] Syncing ${rawData.Beneficiary.length} Beneficiaries...`);
      const formattedBenes = rawData.Beneficiary.map(b => ({
        id: b.id,
        beneficiaryNumber: b.beneficiaryNumber || `BEN-${b.id.slice(0, 8)}`,
        fullName: b.fullName || '',
        lastName: b.lastName || null,
        firstName: b.firstName || null,
        middleName: b.middleName || null,
        extensionName: b.extensionName || null,
        birthday: b.birthday || '1990-01-01',
        sex: b.sex || null,
        civilStatus: b.civilStatus || null,
        age: b.age ? Number(b.age) : null,
        monthlyIncome: b.monthlyIncome ? Number(b.monthlyIncome) : null,
        typeOfBeneficiary: b.typeOfBeneficiary || null,
        occupation: b.occupation || null,
        idType: b.idType || null,
        idNumber: b.idNumber || null,
        sitio: b.sitio || null,
        barangay: b.barangay || null,
        municipality: b.municipality || 'Dingalan',
        province: b.province || 'Aurora',
        contactNumber: b.contactNumber || null,
        isSenior: toBool(b.isSenior),
        isPwd: toBool(b.isPwd),
        is4Ps: toBool(b.is4Ps),
        isIp: toBool(b.isIp),
        skillsTraining: b.skillsTraining || null,
        status: b.status || 'ACTIVE',
        sourceImportId: b.sourceImportId || null,
        createdAt: toDate(b.createdAt) || new Date(),
        updatedAt: toDate(b.updatedAt) || new Date(),
      }));

      const chunks = chunkArray(formattedBenes, 100);
      let inserted = 0;
      for (const chunk of chunks) {
        const res = await prisma.beneficiary.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      console.log(`✓ Beneficiaries processed (${inserted} new records inserted).`);
    }

    // 6. Dependents
    if (rawData.Dependent && rawData.Dependent.length > 0) {
      console.log(`\n[6/17] Syncing ${rawData.Dependent.length} Dependents...`);
      const formattedDeps = rawData.Dependent.map(d => ({
        id: d.id,
        beneficiaryId: d.beneficiaryId,
        fullName: d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        firstName: d.firstName || null,
        middleName: d.middleName || null,
        lastName: d.lastName || null,
        extensionName: d.extensionName || null,
        birthday: d.birthday || null,
        age: d.age ? Number(d.age) : null,
        relationship: d.relationship || null,
        createdAt: toDate(d.createdAt) || new Date(),
      }));

      const chunks = chunkArray(formattedDeps, 100);
      let inserted = 0;
      for (const chunk of chunks) {
        const res = await prisma.dependent.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      console.log(`✓ Dependents processed (${inserted} new records inserted).`);
    }

    // 7. Beneficiary Documents
    if (rawData.BeneficiaryDocument && rawData.BeneficiaryDocument.length > 0) {
      console.log(`\n[7/17] Syncing ${rawData.BeneficiaryDocument.length} Beneficiary Documents...`);
      const formattedDocs = rawData.BeneficiaryDocument.map(d => ({
        id: d.id,
        beneficiaryId: d.beneficiaryId,
        documentType: d.documentType || 'OTHER',
        fileKey: d.fileKey || '',
        fileName: d.fileName || 'document',
        fileSize: Number(d.fileSize) || 0,
        mimeType: d.mimeType || 'application/octet-stream',
        uploadedById: sanitizeUserId(d.uploadedById),
        verificationStatus: d.verificationStatus || 'PENDING',
        uploadedAt: toDate(d.uploadedAt) || new Date(),
      }));

      const res = await prisma.beneficiaryDocument.createMany({
        data: formattedDocs,
        skipDuplicates: true,
      });
      console.log(`✓ Documents processed (${res.count} new records inserted).`);
    }

    // 8. Program Beneficiaries (Roster entries)
    if (rawData.ProgramBeneficiary && rawData.ProgramBeneficiary.length > 0) {
      console.log(`\n[8/17] Syncing ${rawData.ProgramBeneficiary.length} Program Beneficiaries...`);
      const formattedPbs = rawData.ProgramBeneficiary.map(pb => ({
        id: pb.id,
        programId: pb.programId,
        beneficiaryId: pb.beneficiaryId,
        designatedNumber: String(pb.designatedNumber || ''),
        participationStatus: pb.participationStatus || 'ACTIVE',
        originalBeneficiary: toBool(pb.originalBeneficiary, true),
        tableNumber: pb.tableNumber || null,
        slotGroup: pb.slotGroup || null,
        joinedAt: toDate(pb.joinedAt) || new Date(),
      }));

      const chunks = chunkArray(formattedPbs, 100);
      let inserted = 0;
      for (const chunk of chunks) {
        const res = await prisma.programBeneficiary.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      console.log(`✓ Program Beneficiaries processed (${inserted} new records inserted).`);
    }

    // 9. QR Codes
    if (rawData.QrCode && rawData.QrCode.length > 0) {
      console.log(`\n[9/17] Syncing ${rawData.QrCode.length} QR Codes...`);
      const formattedQrs = rawData.QrCode.map(q => ({
        id: q.id,
        programId: q.programId,
        programBeneficiaryId: q.programBeneficiaryId,
        publicToken: q.publicToken,
        tokenHash: q.tokenHash || q.publicToken,
        status: q.status || 'ACTIVE',
        generatedAt: toDate(q.generatedAt) || new Date(),
        generatedById: sanitizeUserId(q.generatedById),
        invalidatedAt: toDate(q.invalidatedAt),
        invalidatedById: sanitizeUserId(q.invalidatedById),
      }));

      const chunks = chunkArray(formattedQrs, 100);
      let inserted = 0;
      for (const chunk of chunks) {
        const res = await prisma.qrCode.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      console.log(`✓ QR Codes processed (${inserted} new records inserted).`);
    }

    // 10. QR Print Batches
    if (rawData.QrPrintBatch && rawData.QrPrintBatch.length > 0) {
      console.log(`\n[10/17] Syncing ${rawData.QrPrintBatch.length} QR Print Batches...`);
      const formattedBatches = rawData.QrPrintBatch.map(b => ({
        id: b.id,
        programId: b.programId,
        batchName: b.batchName || 'Batch',
        paperSize: b.paperSize || 'A4',
        stubWidth: Number(b.stubWidth) || 90.0,
        stubHeight: Number(b.stubHeight) || 55.0,
        rowsPerPage: Number(b.rowsPerPage) || 4,
        columnsPerPage: Number(b.columnsPerPage) || 2,
        reminderText: b.reminderText || null,
        printedById: sanitizeUserId(b.printedById),
        printedAt: toDate(b.printedAt),
        printStatus: b.printStatus || 'PREVIEW',
        createdAt: toDate(b.createdAt) || new Date(),
      }));

      const res = await prisma.qrPrintBatch.createMany({
        data: formattedBatches,
        skipDuplicates: true,
      });
      console.log(`✓ Print Batches processed (${res.count} new records inserted).`);
    }

    // 11. QR Print Logs
    if (rawData.QrPrintLog && rawData.QrPrintLog.length > 0) {
      console.log(`\n[11/17] Syncing ${rawData.QrPrintLog.length} QR Print Logs...`);
      const formattedLogs = rawData.QrPrintLog.map(l => ({
        id: l.id,
        qrId: l.qrId,
        printBatchId: l.printBatchId || null,
        printType: l.printType || 'INITIAL',
        reason: l.reason || null,
        printedById: sanitizeUserId(l.printedById),
        printedAt: toDate(l.printedAt) || new Date(),
      }));

      const chunks = chunkArray(formattedLogs, 500);
      let inserted = 0;
      for (const chunk of chunks) {
        const res = await prisma.qrPrintLog.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      console.log(`✓ Print Logs processed (${inserted} new records inserted).`);
    }

    // 12. Table Assignment Rules
    if (rawData.TableAssignmentRule && rawData.TableAssignmentRule.length > 0) {
      console.log(`\n[12/17] Syncing ${rawData.TableAssignmentRule.length} Table Assignment Rules...`);
      const formattedRules = rawData.TableAssignmentRule.map(r => ({
        id: r.id,
        programId: r.programId,
        startNumber: Number(r.startNumber),
        endNumber: Number(r.endNumber),
        tableNumber: r.tableNumber,
        slotGroup: r.slotGroup || null,
        priority: Number(r.priority) || 0,
        createdAt: toDate(r.createdAt) || new Date(),
      }));

      const res = await prisma.tableAssignmentRule.createMany({
        data: formattedRules,
        skipDuplicates: true,
      });
      console.log(`✓ Table Rules processed (${res.count} new records inserted).`);
    }

    // 13. Work Days
    if (rawData.WorkDay && rawData.WorkDay.length > 0) {
      console.log(`\n[13/17] Syncing ${rawData.WorkDay.length} Work Days...`);
      for (const w of rawData.WorkDay) {
        await prisma.workDay.upsert({
          where: {
            programId_dayNumber: {
              programId: w.programId,
              dayNumber: Number(w.dayNumber),
            },
          },
          update: {
            workDate: w.workDate,
            description: w.description,
            status: w.status || 'SCHEDULED',
          },
          create: {
            id: w.id,
            programId: w.programId,
            dayNumber: Number(w.dayNumber),
            workDate: w.workDate,
            description: w.description,
            status: w.status || 'SCHEDULED',
          },
        });
      }
      console.log(`✓ Work Days synced.`);
    }

    // 14. Tupad Work Programs (Barangays)
    if (rawData.TupadWorkProgram && rawData.TupadWorkProgram.length > 0) {
      console.log(`\n[14/17] Syncing ${rawData.TupadWorkProgram.length} Tupad Work Programs...`);
      for (const wp of rawData.TupadWorkProgram) {
        await prisma.tupadWorkProgram.upsert({
          where: {
            programId_barangay: {
              programId: wp.programId,
              barangay: wp.barangay,
            },
          },
          update: {
            projectLocation: wp.projectLocation,
            beneficiaryCount: Number(wp.beneficiaryCount) || 0,
            natureOfWork: wp.natureOfWork,
            workingHours: wp.workingHours,
          },
          create: {
            id: wp.id,
            programId: wp.programId,
            barangay: wp.barangay,
            projectLocation: wp.projectLocation,
            beneficiaryCount: Number(wp.beneficiaryCount) || 0,
            natureOfWork: wp.natureOfWork,
            workingHours: wp.workingHours,
            createdAt: toDate(wp.createdAt) || new Date(),
            updatedAt: toDate(wp.updatedAt) || new Date(),
          },
        });
      }
      console.log(`✓ Tupad Work Programs synced.`);
    }

    // 15. Tupad Work Program Items (226 Activities)
    if (rawData.TupadWorkProgramItem && rawData.TupadWorkProgramItem.length > 0) {
      console.log(`\n[15/17] Syncing ${rawData.TupadWorkProgramItem.length} Work Program Items...`);
      const formattedItems = rawData.TupadWorkProgramItem.map(item => ({
        id: item.id,
        workProgramId: item.workProgramId,
        dayNumber: Number(item.dayNumber),
        specificActivities: item.specificActivities || '',
        area: item.area || '',
        maleCount: Number(item.maleCount) || 0,
        femaleCount: Number(item.femaleCount) || 0,
        scPwdMaleCount: Number(item.scPwdMaleCount) || 0,
        scPwdFemaleCount: Number(item.scPwdFemaleCount) || 0,
        totalCount: Number(item.totalCount) || 0,
        orderIndex: Number(item.orderIndex) || 0,
        createdAt: toDate(item.createdAt) || new Date(),
        updatedAt: toDate(item.updatedAt) || new Date(),
      }));

      const chunks = chunkArray(formattedItems, 100);
      let inserted = 0;
      for (const chunk of chunks) {
        const res = await prisma.tupadWorkProgramItem.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      console.log(`✓ Work Program Items processed (${inserted} new records inserted).`);
    }

    // 16. Beneficiary Replacements
    if (rawData.BeneficiaryReplacement && rawData.BeneficiaryReplacement.length > 0) {
      console.log(`\n[16/17] Syncing ${rawData.BeneficiaryReplacement.length} Beneficiary Replacements...`);
      const formattedReps = rawData.BeneficiaryReplacement.map(r => ({
        id: r.id,
        programId: r.programId,
        originalProgramBeneficiaryId: r.originalProgramBeneficiaryId,
        replacementProgramBeneficiaryId: r.replacementProgramBeneficiaryId || null,
        reason: r.reason || 'Substitute',
        initiatedById: sanitizeUserId(r.initiatedById),
        approvedById: sanitizeUserId(r.approvedById),
        initiatedAt: toDate(r.initiatedAt) || new Date(),
        approvedAt: toDate(r.approvedAt),
        status: r.status || 'PENDING',
      }));

      const res = await prisma.beneficiaryReplacement.createMany({
        data: formattedReps,
        skipDuplicates: true,
      });
      console.log(`✓ Replacements processed (${res.count} new records inserted).`);
    }

    // 17. Photo Configuration
    if (rawData.PhotoConfiguration && rawData.PhotoConfiguration.length > 0) {
      console.log(`\n[17/17] Syncing Photo Configuration...`);
      for (const pc of rawData.PhotoConfiguration) {
        await prisma.photoConfiguration.upsert({
          where: { programId: pc.programId },
          update: {
            showGps: toBool(pc.showGps, true),
            showDate: toBool(pc.showDate, true),
            showTime: toBool(pc.showTime, true),
            showBarangay: toBool(pc.showBarangay, true),
            showProgramName: toBool(pc.showProgramName, true),
            dateFormat: pc.dateFormat || 'MMMM DD, YYYY',
            gpsFormat: pc.gpsFormat || 'DECIMAL',
            overlayPosition: pc.overlayPosition || 'BOTTOM',
          },
          create: {
            id: pc.id,
            programId: pc.programId,
            showGps: toBool(pc.showGps, true),
            showDate: toBool(pc.showDate, true),
            showTime: toBool(pc.showTime, true),
            showBarangay: toBool(pc.showBarangay, true),
            showProgramName: toBool(pc.showProgramName, true),
            dateFormat: pc.dateFormat || 'MMMM DD, YYYY',
            gpsFormat: pc.gpsFormat || 'DECIMAL',
            overlayPosition: pc.overlayPosition || 'BOTTOM',
            updatedAt: toDate(pc.updatedAt) || new Date(),
          },
        });
      }
      console.log(`✓ Photo Configuration synced.`);
    }

    console.log("\n=================================================");
    console.log("✓ ALL MASTER DATA RESTORED & SYNCED SUCCESSFULLY!");
    console.log("=================================================");

  } catch (err) {
    console.error("Sync error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
