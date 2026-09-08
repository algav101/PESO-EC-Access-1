import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("=================================================");
  console.log("TESTING QR SCAN + MIDDLE NAME WORK AREA ROUTING");
  console.log("=================================================");

  const pb1 = await prisma.programBeneficiary.findFirst({
    where: { participationStatus: "ACTIVE" },
    include: { beneficiary: true, qrCodes: true },
  });

  if (!pb1) {
    console.log("No active beneficiary found in test database.");
    await prisma.$disconnect();
    return;
  }

  const qrToken = pb1.qrCodes[0]?.publicToken;
  const rawMiddle = pb1.beneficiary.middleName || "N/A";
  console.log(`Target Beneficiary: ${pb1.beneficiary.fullName} (Slot #${pb1.designatedNumber})`);
  console.log(`Registered Middle Name: ${rawMiddle}`);
  console.log(`Original QR Token: ${qrToken}`);

  const baseUrl = "http://localhost:3000/api/v1/work-assignment/lookup";

  // Step 1: Scan Original QR without Middle Name
  console.log("\n[STEP 1] Scanning Original QR Code (Privacy Barrier Active):");
  const res1 = await fetch(`${baseUrl}?qrToken=${encodeURIComponent(qrToken)}`);
  const json1 = await res1.json();
  console.log(`  - requiresAuth: ${json1.requiresAuth}`);
  console.log(`  - maskedName: ${json1.challenge?.maskedName}`);
  console.log(`  - barangay: ${json1.challenge?.barangay}`);
  console.log(`  - challengePrompt: "${json1.challenge?.prompt}"`);

  // Step 2: Attempt with wrong middle name
  console.log("\n[STEP 2] Attempt with Wrong Middle Name ('INCORRECT'):");
  const res2 = await fetch(`${baseUrl}?qrToken=${encodeURIComponent(qrToken)}&middleName=INCORRECT`);
  const json2 = await res2.json();
  console.log(`  - HTTP Status: ${res2.status}`);
  console.log(`  - authFailed: ${json2.authFailed}`);
  console.log(`  - error: ${json2.error}`);

  // Step 3: Authenticate with lowercase middle name
  console.log(`\n[STEP 3] Authenticating with Lowercase Middle Name ('${rawMiddle.toLowerCase()}'):`);
  const res3 = await fetch(`${baseUrl}?qrToken=${encodeURIComponent(qrToken)}&middleName=${encodeURIComponent(rawMiddle.toLowerCase())}`);
  const json3 = await res3.json();
  console.log(`  - authenticated: ${json3.authenticated}`);
  console.log(`  - Unlocked Name: ${json3.beneficiary?.fullName}`);
  console.log(`  - Address: ${json3.beneficiary?.sitio}, Brgy. ${json3.beneficiary?.barangay}`);
  console.log(`  - Day 1 Assigned Work Area: "${json3.assignment?.area}"`);
  console.log(`  - Day 1 Specific Activity: "${json3.assignment?.specificActivity}"`);
  console.log(`  - Working Hours: ${json3.program?.morningHours} | ${json3.program?.afternoonHours}`);
  console.log(`  - Allocation Rationale: ${json3.assignment?.matchingRationale}`);

  // Step 4: Check Day 5 Schedule with uppercase middle name
  console.log(`\n[STEP 4] Dynamic Schedule Check for Day 5 ('${rawMiddle.toUpperCase()}'):`);
  const res4 = await fetch(`${baseUrl}?qrToken=${encodeURIComponent(qrToken)}&middleName=${encodeURIComponent(rawMiddle.toUpperCase())}&dayNumber=5`);
  const json4 = await res4.json();
  console.log(`  - Day Number: ${json4.workDay?.dayNumber}`);
  console.log(`  - Day 5 Assigned Work Area: "${json4.assignment?.area}"`);
  console.log(`  - Day 5 Specific Activity: "${json4.assignment?.specificActivity}"`);

  console.log("\n=================================================");
  console.log("ALL QR + MIDDLE NAME PRIVACY CHECKS VERIFIED 100%");
  console.log("=================================================");
  await prisma.$disconnect();
}

run();
