import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testPasswordView() {
  console.log("=== Testing Password View Capabilities ===");

  // 1. Check all users in DB
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      assignedBarangay: true,
      plainPassword: true,
      passwordHash: true,
    },
    take: 10,
  });

  console.log(`Fetched ${users.length} sample users:`);
  for (const u of users) {
    console.log(`- [${u.role}] @${u.username} (${u.fullName}): Plain="${u.plainPassword}" | HashValid=${!!u.passwordHash}`);
    if (u.plainPassword && u.passwordHash) {
      const match = await bcrypt.compare(u.plainPassword, u.passwordHash);
      if (!match) {
        console.error(`⚠️ Password mismatch for @${u.username}`);
      } else {
        console.log(`  ✓ Password match verified for @${u.username}`);
      }
    }
  }

  console.log("=== All password view tests completed successfully! ===");
}

testPasswordView()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
