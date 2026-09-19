import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function syncAllPasswords() {
  console.log("=== Syncing password hashes with plain passwords for all accounts ===");
  const users = await prisma.user.findMany();

  for (const u of users) {
    if (u.plainPassword) {
      const match = await bcrypt.compare(u.plainPassword, u.passwordHash);
      if (!match) {
        console.log(`Rehashing password for @${u.username} (${u.plainPassword})...`);
        const newHash = await bcrypt.hash(u.plainPassword, 10);
        await prisma.user.update({
          where: { id: u.id },
          data: { passwordHash: newHash },
        });
        console.log(`✓ Synchronized password hash for @${u.username}`);
      }
    }
  }

  console.log("=== All account hashes verified & synchronized! ===");
}

syncAllPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
