import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      assignedBarangay: true,
      plainPassword: true,
      status: true,
    },
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
  });

  const byRole = {};
  for (const u of users) {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  }

  console.log("=== USERS BY ROLE IN DATABASE ===");
  for (const [role, list] of Object.entries(byRole)) {
    console.log(`\nRole: ${role} (${list.length} accounts)`);
    for (const u of list) {
      console.log(`  - @${u.username} | ${u.fullName} | Brgy: ${u.assignedBarangay || 'Municipality'} | Pass: ${u.plainPassword}`);
    }
  }
}

check().finally(() => prisma.$disconnect());
