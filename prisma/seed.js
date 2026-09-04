const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database for LGU Dingalan PESO TUPAD Platform ---');

  // Password hashes
  const adminPass = await bcrypt.hash('admin123', 10);
  const coordPass = await bcrypt.hash('coord123', 10);
  const dolePass = await bcrypt.hash('dole123', 10);

  // Users
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      role: 'DOMAIN_MASTER',
    },
    create: {
      username: 'admin',
      fullName: 'PESO Dingalan Admin Officer',
      email: 'peso.dingalan@aurora.gov.ph',
      passwordHash: adminPass,
      role: 'DOMAIN_MASTER',
      status: 'ACTIVE',
    },
  });

  // Dingalan 11-Barangay Coordinators & DOLE Roster
  const coordinatorRoster = [
    { fullName: 'NEDDIE', username: 'peso_umiray1', role: 'TUPAD_COORDINATOR', brgy: 'Umiray', pass: 'UMIRAY123' },
    { fullName: 'SHIELA', username: 'peso_umiray2', role: 'TUPAD_COORDINATOR', brgy: 'Umiray', pass: 'UMIRAY123' },
    { fullName: 'MARIAN', username: 'peso_umiray3', role: 'TUPAD_COORDINATOR', brgy: 'Umiray', pass: 'UMIRAY123' },
    { fullName: 'NALYN', username: 'peso_umiray4', role: 'TUPAD_COORDINATOR', brgy: 'Umiray', pass: 'UMIRAY123' },
    { fullName: 'GRACE', username: 'peso_ibona1', role: 'TUPAD_COORDINATOR', brgy: 'Ibona', pass: 'IBONA123' },
    { fullName: 'VENGEL', username: 'peso_ibona2', role: 'TUPAD_COORDINATOR', brgy: 'Ibona', pass: 'IBONA123' },
    { fullName: 'MAY', username: 'peso_matawe1', role: 'TUPAD_COORDINATOR', brgy: 'Matawe', pass: 'MATAWE123' },
    { fullName: 'ANNALYN', username: 'peso_matawe_2', role: 'TUPAD_COORDINATOR', brgy: 'Matawe', pass: 'MATAWE123' },
    { fullName: 'ENA', username: 'peso_bnb', role: 'TUPAD_COORDINATOR', brgy: 'Butas na Bato', pass: 'BUTAS NA BATO123' },
    { fullName: 'JONA', username: 'peso_aplaya2', role: 'TUPAD_COORDINATOR', brgy: 'Aplaya', pass: 'APLAYA123' },
    { fullName: 'MOLLY', username: 'peso_poblacion_1', role: 'TUPAD_COORDINATOR', brgy: 'Poblacion', pass: 'POBLACION123' },
    { fullName: 'IKOY', username: 'peso_poblacion_2', role: 'TUPAD_COORDINATOR', brgy: 'Poblacion', pass: 'POBLACION123' },
    { fullName: 'NEMZ', username: 'peso_davildavilan1', role: 'TUPAD_COORDINATOR', brgy: 'Davildavilan', pass: 'DAVILDAVILAN123' },
    { fullName: 'GLO', username: 'peso_davildavilan2', role: 'TUPAD_COORDINATOR', brgy: 'Davildavilan', pass: 'DAVILDAVILAN123' },
    { fullName: 'TESSIE', username: 'peso_caragsacan_1', role: 'TUPAD_COORDINATOR', brgy: 'Caragsacan', pass: 'CARAGSACAN123' },
    { fullName: 'BEBANG', username: 'peso_caragsacan2', role: 'TUPAD_COORDINATOR', brgy: 'Caragsacan', pass: 'CARAGSACAN123' },
    { fullName: 'MARICEL', username: 'peso_tanawan1', role: 'TUPAD_COORDINATOR', brgy: 'Tanawan', pass: 'TANAWAN123' },
    { fullName: 'JESSICA', username: 'peso_tanawan2', role: 'TUPAD_COORDINATOR', brgy: 'Tanawan', pass: 'TANAWAN123' },
    { fullName: 'TERE C.', username: 'peso_dika', role: 'TUPAD_COORDINATOR', brgy: 'Dikapanikian', pass: 'DIKAPANIKIAN123' },
    { fullName: 'RAMONITA', username: 'peso_paltic', role: 'TUPAD_COORDINATOR', brgy: 'Paltic', pass: 'PALTIC123' },
    { fullName: 'MARK', username: 'dolefoaurora_1', role: 'DOLE_COORDINATOR', brgy: null, pass: 'ALL BARANGAY123' },
    { fullName: 'ANGELO', username: 'dolefoaurora_2', role: 'DOLE_COORDINATOR', brgy: null, pass: 'ALL BARANGAY123' },
  ];

  for (const c of coordinatorRoster) {
    const hashedPass = await bcrypt.hash(c.pass, 10);
    await prisma.user.upsert({
      where: { username: c.username },
      update: {
        fullName: c.fullName,
        role: c.role,
        assignedBarangay: c.brgy,
        passwordHash: hashedPass,
      },
      create: {
        username: c.username,
        fullName: c.fullName,
        role: c.role,
        assignedBarangay: c.brgy,
        passwordHash: hashedPass,
        status: 'ACTIVE',
      },
    });
  }

  // System Settings
  const settings = [
    { key: 'MUNICIPALITY', value: 'Dingalan', description: 'Municipality Name' },
    { key: 'PROVINCE', value: 'Aurora', description: 'Province Name' },
    { key: 'LGU_NAME', value: 'Municipality of Dingalan', description: 'Official LGU Header' },
    { key: 'PESO_NAME', value: 'Public Employment Service Office (PESO) Dingalan', description: 'PESO Office' },
    { key: 'DOLE_OFFICE', value: 'DOLE Regional Office III - Aurora Field Office', description: 'DOLE Partner Office' },
    { key: 'DEFAULT_WORK_DAYS', value: '10', description: 'Standard TUPAD Work Days' },
    { key: 'DEFAULT_DAILY_HOURS', value: '8', description: 'Standard Daily Work Hours' },
    { key: 'DATE_FORMAT', value: 'MMMM DD, YYYY', description: 'Standard Date Display Format' },
    { key: 'BARANGAYS', value: JSON.stringify([
      'Aplaya', 'Butas na Bato', 'Caragsacan', 'Davildavilan',
      'Dikapanikian', 'Ibona', 'Matawe', 'Paltic',
      'Poblacion', 'Tanawan', 'Umiray'
    ]), description: 'Dingalan Barangays List' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // Sample Program: August 2026 10-Day Work Program
  const program = await prisma.program.upsert({
    where: { programCode: 'TUPAD-DINGALAN-2026-08' },
    update: {},
    create: {
      programCode: 'TUPAD-DINGALAN-2026-08',
      batchNumber: 'Batch 2026-08',
      programName: '10-Day TUPAD Emergency Employment Work Program',
      municipality: 'Dingalan',
      province: 'Aurora',
      doleOffice: 'DOLE Aurora Field Office',
      projectLocation: 'Municipality of Dingalan (All 11 Barangays)',
      natureOfWork: 'Community clean-up, coastal clearing, declogging of drainage canals, public facility greening, and farm-to-market road clearing',
      beneficiaryCount: 25,
      requiredWorkDays: 10,
      dailyHours: 8.0,
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
      orientationDate: '2026-08-01',
      orientationTime: '08:30',
      orientationVenue: 'Dingalan Municipal Gymnasium, Poblacion',
      payoutDate: '2026-08-15',
      payoutTime: '09:00',
      payoutVenue: 'Dingalan Municipal Gymnasium',
      startDate: '2026-08-03',
      endDate: '2026-08-14',
      status: 'ACTIVE',
      createdById: adminUser.id,
    },
  });

  // Photo Configuration
  await prisma.photoConfiguration.upsert({
    where: { programId: program.id },
    update: {},
    create: {
      programId: program.id,
      showGps: true,
      showDate: true,
      showTime: true,
      showBarangay: true,
      showProgramName: true,
      dateFormat: 'MMMM DD, YYYY',
      gpsFormat: 'DECIMAL',
      overlayPosition: 'BOTTOM',
    },
  });

  // Program Barangays
  const barangays = [
    'Aplaya', 'Butas na Bato', 'Caragsacan', 'Davildavilan',
    'Dikapanikian', 'Ibona', 'Matawe', 'Paltic',
    'Poblacion', 'Tanawan', 'Umiray'
  ];

  for (const brgy of barangays) {
    await prisma.programBarangay.upsert({
      where: {
        programId_barangayName: {
          programId: program.id,
          barangayName: brgy,
        },
      },
      update: {},
      create: {
        programId: program.id,
        barangayName: brgy,
        projectLocation: `Barangay ${brgy}, Dingalan, Aurora`,
        beneficiaryTarget: 25,
      },
    });
  }

  // Work Days: Day 1 to Day 10
  const dates = [
    '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
    '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'
  ];

  const workDayMap = {};
  for (let i = 0; i < 10; i++) {
    const wd = await prisma.workDay.upsert({
      where: {
        programId_dayNumber: {
          programId: program.id,
          dayNumber: i + 1,
        },
      },
      update: {},
      create: {
        programId: program.id,
        dayNumber: i + 1,
        workDate: dates[i],
        description: `Day ${i + 1} Community Work Activities`,
        status: i < 5 ? 'COMPLETED' : 'SCHEDULED',
      },
    });
    workDayMap[i + 1] = wd;
  }

  // Table Rules: 1-100 Table 1, 101-200 Table 2, etc.
  await prisma.tableAssignmentRule.createMany({
    data: [
      { programId: program.id, startNumber: 1, endNumber: 10, tableNumber: 'Table 1', slotGroup: 'Main Regular', priority: 1 },
      { programId: program.id, startNumber: 11, endNumber: 20, tableNumber: 'Table 2', slotGroup: 'Main Regular', priority: 1 },
      { programId: program.id, startNumber: 21, endNumber: 30, tableNumber: 'Table 3', slotGroup: 'DepEd Slot', priority: 2 },
    ],
  }).catch(() => {}); // ignore duplicates

  // Sample Beneficiaries
  const sampleBeneficiaries = [
    { num: '1', name: 'DELA CRUZ, JUAN M.', bday: '1985-04-12', sex: 'MALE', brgy: 'Paltic', sitio: 'Centro', table: 'Table 1' },
    { num: '2', name: 'SANTOS, MARIA L.', bday: '1990-08-23', sex: 'FEMALE', brgy: 'Poblacion', sitio: 'Purok 2', table: 'Table 1' },
    { num: '3', name: 'REYES, PEDRO S.', bday: '1978-11-05', sex: 'MALE', brgy: 'Aplaya', sitio: 'Seaside', table: 'Table 1' },
    { num: '4', name: 'GARCIA, ANA T.', bday: '1995-02-14', sex: 'FEMALE', brgy: 'Ibona', sitio: 'Riverside', table: 'Table 1' },
    { num: '5', name: 'MENDOZA, CARLOS R.', bday: '1982-09-30', sex: 'MALE', brgy: 'Tanawan', sitio: 'Upper', table: 'Table 1' },
    { num: '6', name: 'BAUTISTA, ELENA G.', bday: '1988-06-18', sex: 'FEMALE', brgy: 'Umiray', sitio: 'Boundary', table: 'Table 1' },
    { num: '7', name: 'RAMOS, JOSE P.', bday: '1975-12-25', sex: 'MALE', brgy: 'Caragsacan', sitio: 'Main Road', table: 'Table 1' },
    { num: '8', name: 'TORRES, ROSA V.', bday: '1992-07-09', sex: 'FEMALE', brgy: 'Matawe', sitio: 'Highway', table: 'Table 1' },
    { num: '9', name: 'FERNANDEZ, ANTONIO K.', bday: '1980-03-15', sex: 'MALE', brgy: 'Butas na Bato', sitio: 'Rock View', table: 'Table 1' },
    { num: '10', name: 'AQUINO, TERESA D.', bday: '1987-10-01', sex: 'FEMALE', brgy: 'Dikapanikian', sitio: 'Creek Side', table: 'Table 1' },
    // DepEd slot
    { num: '21', name: 'VILLANUEVA, RICARDO N.', bday: '1984-01-20', sex: 'MALE', brgy: 'Davildavilan', sitio: 'Proper', table: 'Table 3', slot: 'DepEd Slot' },
    { num: '22', name: 'CRUZ, GLORIA M.', bday: '1991-05-16', sex: 'FEMALE', brgy: 'Paltic', sitio: 'Fish Port', table: 'Table 3', slot: 'DepEd Slot' },
  ];

  for (const b of sampleBeneficiaries) {
    const parts = b.name.split(', ');
    const lName = parts[0];
    const fName = parts[1] || '';

    const bene = await prisma.beneficiary.create({
      data: {
        beneficiaryNumber: `BN-${b.num.padStart(4, '0')}`,
        fullName: b.name,
        lastName: lName,
        firstName: fName,
        birthday: b.bday,
        sex: b.sex,
        barangay: b.brgy,
        sitio: b.sitio,
        municipality: 'Dingalan',
        province: 'Aurora',
        contactNumber: '09171234567',
        status: 'ACTIVE',
      },
    });

    const progBene = await prisma.programBeneficiary.create({
      data: {
        programId: program.id,
        beneficiaryId: bene.id,
        designatedNumber: b.num,
        participationStatus: 'ACTIVE',
        originalBeneficiary: true,
        tableNumber: b.table,
        slotGroup: b.slot || 'Main Regular',
      },
    });

    // Create unique cryptographic QR token
    const token = `TUPAD-2026-${progBene.id.slice(0, 8)}-${b.num}`;
    const tokenHash = require('crypto').createHash('sha256').update(token + '_SALT_DINGALAN_2026').digest('hex');

    const qr = await prisma.qrCode.create({
      data: {
        programId: program.id,
        programBeneficiaryId: progBene.id,
        publicToken: token,
        tokenHash: tokenHash,
        status: 'ACTIVE',
      },
    });

    // Stub distributed
    await prisma.stubDistribution.create({
      data: {
        qrId: qr.id,
        programBeneficiaryId: progBene.id,
        distributedById: adminUser.id,
        verificationMethod: 'BIRTHDAY_PIN',
        status: 'DISTRIBUTED',
        latitude: 15.3941,
        longitude: 121.3965,
      },
    });

    // Orientation attendance
    await prisma.orientationAttendance.create({
      data: {
        programId: program.id,
        programBeneficiaryId: progBene.id,
        status: 'PRESENT',
        scannedById: adminUser.id,
        scannedAt: new Date('2026-08-01T08:45:00Z'),
      },
    });

    // Seed Day 1 to Day 3 Attendance
    for (let dayNum = 1; dayNum <= 3; dayNum++) {
      const wd = workDayMap[dayNum];
      if (wd) {
        await prisma.attendanceRecord.create({
          data: {
            programId: program.id,
            workDayId: wd.id,
            programBeneficiaryId: progBene.id,
            attendanceDate: wd.workDate,
            morningTimeIn: new Date(`${wd.workDate}T07:55:00+08:00`),
            morningTimeOut: new Date(`${wd.workDate}T12:02:00+08:00`),
            afternoonTimeIn: new Date(`${wd.workDate}T12:58:00+08:00`),
            afternoonTimeOut: new Date(`${wd.workDate}T17:05:00+08:00`),
            status: 'PRESENT',
            source: 'QR_SCAN',
            scannedById: adminUser.id,
          },
        });
      }
    }
  }

  // Add 1 Sample Past Restriction to test 365-day checker
  const pastRestrictedBene = await prisma.beneficiary.create({
    data: {
      beneficiaryNumber: 'BN-9999',
      fullName: 'RESTRICTED, ROBERTO X.',
      lastName: 'RESTRICTED',
      firstName: 'ROBERTO',
      birthday: '1983-03-10',
      sex: 'MALE',
      barangay: 'Paltic',
      municipality: 'Dingalan',
      province: 'Aurora',
      status: 'ACTIVE',
    },
  });

  await prisma.beneficiaryRestriction.create({
    data: {
      beneficiaryId: pastRestrictedBene.id,
      payoutDate: '2026-05-15',
      restrictionStart: '2026-05-15',
      restrictionEnd: '2027-05-15',
      reason: '365-day TUPAD payout restriction (Previous Program May 2026)',
      status: 'ACTIVE',
    },
  });

  // Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_INITIALIZED',
      entityType: 'SYSTEM',
      metadata: JSON.stringify({ note: 'Initial Dingalan PESO TUPAD Platform Setup & Seed' }),
    },
  });

  console.log('--- Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
