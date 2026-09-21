import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProgramDetails() {
  const prog = await prisma.program.findUnique({
    where: { programCode: "TUPAD-DGL-2026-09" },
    include: {
      programBarangays: true,
      programBeneficiaries: {
        include: {
          beneficiary: true,
          attendanceRecords: {
            include: {
              workDay: true,
              scannedBy: true,
              workProgramItem: true
            }
          }
        }
      },
      accomplishmentPhotos: {
        include: {
          workDay: true,
          uploadedBy: true,
          approvedBy: true,
          workProgramItem: true
        }
      }
    }
  });

  if (!prog) {
    console.log("Program not found");
    return;
  }

  console.log(`Program: ${prog.programName} (${prog.programCode})`);
  console.log("Target Program Barangays:");
  console.table(prog.programBarangays.map(pb => ({
    Barangay: pb.barangayName,
    Target: pb.beneficiaryTarget,
    Location: pb.projectLocation
  })));

  // Group beneficiaries by beneficiary.barangay
  const bgyBenCounts = {};
  const bgyAttCounts = {};
  for (const pb of prog.programBeneficiaries) {
    const bgy = pb.beneficiary?.barangay || "Unknown";
    bgyBenCounts[bgy] = (bgyBenCounts[bgy] || 0) + 1;
    if (pb.attendanceRecords.length > 0) {
      bgyAttCounts[bgy] = (bgyAttCounts[bgy] || 0) + pb.attendanceRecords.length;
    }
  }

  console.log("\nProgram Beneficiary Count & Attendance Count by Barangay:");
  console.table(Object.keys(bgyBenCounts).map(bgy => ({
    Barangay: bgy,
    Beneficiaries: bgyBenCounts[bgy],
    AttendanceScans: bgyAttCounts[bgy] || 0
  })));

  console.log("\nAccomplishment Photos in Program:");
  console.table(prog.accomplishmentPhotos.map(p => ({
    ID: p.id,
    Barangay: p.barangay,
    Sitio: p.sitio,
    WorkArea: p.workArea,
    Activity: p.specificActivity,
    Day: p.workDay?.dayNumber,
    Status: p.status,
    Uploader: p.uploadedBy?.fullName,
    UploaderRole: p.uploadedBy?.role,
    CapturedAt: p.capturedAt?.toISOString(),
    UploadedAt: p.uploadedAt?.toISOString()
  })));
}

checkProgramDetails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
