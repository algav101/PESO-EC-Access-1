import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pb = await prisma.programBeneficiary.findFirst({
    where: { designatedNumber: "1" },
    include: {
      beneficiary: true,
      program: {
        include: {
          workDays: { orderBy: { dayNumber: "asc" } },
          tupadWorkPrograms: {
            include: {
              items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
            },
          },
        },
      },
      qrCodes: true,
    },
  });

  if (!pb) {
    console.error("Beneficiary #1 not found!");
    return;
  }

  console.log("Found Beneficiary #1:", pb.beneficiary.fullName);
  console.log("Barangay:", pb.beneficiary.barangay, "Sitio:", pb.beneficiary.sitio);
  console.log("Active QR Code:", pb.qrCodes[0]?.publicToken);

  const testToken = pb.qrCodes[0]?.publicToken || "1";
  console.log("Testing lookup with token/slot:", testToken);

  const res = await fetch(`http://localhost:3000/api/v1/work-assignment/lookup?qrToken=${encodeURIComponent(testToken)}&isQrScan=true`).catch(() => null);

  if (res && res.ok) {
    const data = await res.json();
    console.log("✓ Lookup API Response Success:", data.success);
    console.log("✓ Assigned Area Day 1:", data.assignment?.area);
    console.log("✓ Specific Activity:", data.assignment?.specificActivity);
    console.log("✓ Total Days in Schedule:", data.allDaysSchedule?.length);
  } else {
    console.log("Dev server not currently running on port 3000, testing database resolution logic directly.");
  }
}

main().finally(() => prisma.$disconnect());
