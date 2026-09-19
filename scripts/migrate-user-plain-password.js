const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPresetPassword = (uname, brgy, role) => {
  const u = (uname || '').toLowerCase();
  if (u === "admin") return "admin123";
  if (u === "coordinator") return "coord123";
  if (u === "documentor") return "doc123";
  if (u === "dole") return "dole123";
  if (u.includes("umiray")) return "UMIRAY123";
  if (u.includes("ibona")) return "IBONA123";
  if (u.includes("matawe")) return "MATAWE123";
  if (u.includes("bnb") || (brgy && brgy.toLowerCase().includes("butas"))) return "BUTAS NA BATO123";
  if (u.includes("aplaya")) return "APLAYA123";
  if (u.includes("poblacion")) return "POBLACION123";
  if (u.includes("davildavilan")) return "DAVILDAVILAN123";
  if (u.includes("caragsacan")) return "CARAGSACAN123";
  if (u.includes("tanawan")) return "TANAWAN123";
  if (u.includes("dika")) return "DIKAPANIKIAN123";
  if (u.includes("paltic")) return "PALTIC123";
  if (u.includes("dolefoaurora") || role === "DOLE_COORDINATOR") return "ALL BARANGAY123";
  if (brgy) return `${brgy.toUpperCase()}123`;
  return "Dingalan123!";
};

async function main() {
  console.log("Adding plainPassword column to User table if not exists...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plainPassword" TEXT;`);
  console.log("Column plainPassword ensured.");

  // Fetch all users to backfill known preset/default passwords
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database. Checking passwords...`);

  for (const u of users) {
    if (!u.plainPassword) {
      const defaultPass = getPresetPassword(u.username, u.assignedBarangay, u.role);
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "plainPassword" = $1 WHERE "id" = $2`,
        defaultPass,
        u.id
      );
      console.log(`Updated user @${u.username} (${u.fullName}) -> ${defaultPass}`);
    }
  }

  console.log("Migration and backfill completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
