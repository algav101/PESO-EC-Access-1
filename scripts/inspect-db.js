const { PrismaClient } = require('@prisma/client');

async function inspect(url, label) {
  console.log(`\n=== Checking Database: ${label} ===`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const userCount = await prisma.user.count();
    const programCount = await prisma.program.count();
    const beneCount = await prisma.beneficiary.count();
    const progBeneCount = await prisma.programBeneficiary.count();
    const workProgramCount = await prisma.tupadWorkProgram.count();
    const workItemCount = await prisma.tupadWorkProgramItem.count();
    const attendanceCount = await prisma.attendanceRecord.count();
    const photoCount = await prisma.accomplishmentPhoto.count();
    const auditCount = await prisma.auditLog.count();

    console.log(`✓ Connected successfully!`);
    console.log(`• Users: ${userCount}`);
    console.log(`• Programs: ${programCount}`);
    console.log(`• Beneficiaries: ${beneCount}`);
    console.log(`• Program Beneficiaries (Roster entries): ${progBeneCount}`);
    console.log(`• Work Programs (Barangays): ${workProgramCount}`);
    console.log(`• Work Program Items (Activities): ${workItemCount}`);
    console.log(`• Attendance Records: ${attendanceCount}`);
    console.log(`• Accomplishment Photos: ${photoCount}`);
    console.log(`• Audit Logs: ${auditCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { id: true, username: true, fullName: true, role: true, assignedBarangay: true, status: true },
        take: 10
      });
      console.log(`\nSample Users (${users.length}):`);
      console.table(users);
    }

    if (programCount > 0) {
      const progs = await prisma.program.findMany({
        select: { id: true, programCode: true, programName: true, status: true, beneficiaryCount: true }
      });
      console.log(`\nPrograms (${progs.length}):`);
      console.table(progs);
    }

    if (progBeneCount > 0) {
      const benes = await prisma.programBeneficiary.findMany({
        take: 10,
        select: {
          designatedNumber: true,
          tableNumber: true,
          participationStatus: true,
          beneficiary: {
            select: { fullName: true, barangay: true, sitio: true, birthday: true }
          }
        }
      });
      console.log(`\nSample Beneficiaries (${benes.length}):`);
      console.table(benes.map(b => ({
        Number: b.designatedNumber,
        Name: b.beneficiary.fullName,
        Barangay: b.beneficiary.barangay,
        Sitio: b.beneficiary.sitio,
        Table: b.tableNumber,
        Status: b.participationStatus
      })));
    }

    if (workProgramCount > 0) {
      const wps = await prisma.tupadWorkProgram.findMany({
        include: { items: true }
      });
      console.log(`\nWork Programs (${wps.length}):`);
      for (const wp of wps) {
        console.log(`- Barangay ${wp.barangay} (Days ${wp.dayRange || '1-10'}): ${wp.items.length} activities scheduled`);
      }
    }

    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.error(`✗ Failed to connect to ${label}:`, err.message);
    await prisma.$disconnect();
    return false;
  }
}

async function main() {
  const currentUrl = process.env.DATABASE_URL;
  const railwayUrl = "postgresql://postgres:ZqCdfgIesMfqnLwJkCjA@altaria.proxy.rlwy.net:24031/railway";
  
  console.log("Inspecting current configuration...");
  if (currentUrl) {
    await inspect(currentUrl, "Current .env DATABASE_URL");
  }
  
  if (railwayUrl && railwayUrl !== currentUrl) {
    await inspect(railwayUrl, "Railway TCP Proxy DATABASE_URL");
  }
}

main();
