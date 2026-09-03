import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Testing Public Status Inquiry & Public Message System...");

  // 1. Clean & Seed TupadApplicationRoster
  await prisma.tupadApplicationRoster.deleteMany({});

  const sample1 = await prisma.tupadApplicationRoster.create({
    data: {
      lastName: "DELA CRUZ",
      firstName: "JUAN",
      middleName: "SANTOS",
      fullName: "DELA CRUZ, JUAN SANTOS",
      birthMonth: "05",
      birthDay: "14",
      birthYear: "1988",
      birthday: "05-14-1988",
      civilStatus: "MARRIED",
      streetSitio: "CENTRO",
      barangay: "PALTIC",
      contactNumber: "09123456789",
      idPresented: "UMID",
      idNumber: "CRN-0111-2222-3333",
      occupation: "LABORER",
      dependentFullName: "MARIA DELA CRUZ",
      remarks: "Complete application requirements submitted",
      status: "QUEUED",
    },
  });

  const sample2 = await prisma.tupadApplicationRoster.create({
    data: {
      lastName: "SANTOS",
      firstName: "MARIA",
      middleName: "GOMEZ",
      fullName: "SANTOS, MARIA GOMEZ",
      birthMonth: "11",
      birthDay: "22",
      birthYear: "1994",
      birthday: "11-22-1994",
      civilStatus: "SINGLE",
      streetSitio: "PUROK 2",
      barangay: "APLAYA",
      contactNumber: "", // Missing contact!
      idPresented: "VOTERS ID",
      idNumber: "", // Missing ID No!
      occupation: "HOUSEWIFE",
      dependentFullName: "",
      remarks: "Lacking contact number and valid ID photocopy",
      status: "INCOMPLETE",
    },
  });

  console.log("✓ Seeded sample applicants in TupadApplicationRoster");

  // 2. Test Public Messages Ticket Creation
  const trackingCode = `MSG-2026-TEST1`;
  await prisma.publicInquiryMessage.deleteMany({ where: { trackingCode } });

  const msg = await prisma.publicInquiryMessage.create({
    data: {
      trackingCode,
      category: "INQUIRY",
      subject: "Follow-up on TUPAD status in Paltic",
      message: "Magandang araw po! Nais ko po sana itanong kung kailan ang deployment ng TUPAD batch para sa Barangay Paltic?",
      isAnonymous: false,
      senderName: "Juan Dela Cruz",
      senderContact: "09123456789",
      senderBarangay: "Paltic",
      status: "UNREAD",
    },
  });

  console.log("✓ Created sample inquiry message with tracking code:", msg.trackingCode);

  console.log("🎉 Test database seeding and models verified successfully!");
}

main()
  .catch((e) => {
    console.error("Test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
