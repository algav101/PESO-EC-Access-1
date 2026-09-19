import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function cleanup() {
  const deleted = await prisma.user.deleteMany({
    where: {
      username: {
        startsWith: "test_coord_",
      },
    },
  });
  console.log(`Cleaned up ${deleted.count} test users.`);
}

cleanup().finally(() => prisma.$disconnect());
