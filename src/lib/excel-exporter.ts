import ExcelJS from "exceljs";
import prisma from "./prisma";
import { format } from "date-fns";
import { assignBeneficiaryWorkArea, WorkProgramItemAllocation } from "./work-assignment";

export async function generateAttendanceExcel(programId: string): Promise<Buffer> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      workDays: { orderBy: { dayNumber: "asc" } },
      programBeneficiaries: {
        include: {
          beneficiary: true,
          attendanceRecords: true,
        },
        orderBy: { designatedNumber: "asc" },
      },
    },
  });

  if (!program) throw new Error("Program not found");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LGU Dingalan - PESO TUPAD System";
  workbook.created = new Date();

  // Group by barangay or create consolidated sheet
  const worksheet = workbook.addWorksheet("CONSOLIDATED ATTENDANCE", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 7 }],
  });

  // Headers matching Reference 2: ATTENDANCE TEMPLATE FOR TUPAD.xlsx
  worksheet.mergeCells("A1:N1");
  worksheet.getCell("A1").value = "LOCAL GOVERNMENT UNIT OF DINGALAN, AURORA";
  worksheet.getCell("A1").font = { name: "Arial", size: 12, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.mergeCells("A2:N2");
  worksheet.getCell("A2").value = "PUBLIC EMPLOYMENT SERVICE OFFICE (PESO) - DOLE TUPAD PROGRAM";
  worksheet.getCell("A2").font = { name: "Arial", size: 11, bold: true };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells("A3:N3");
  worksheet.getCell("A3").value = `PROGRAM: ${program.programName.toUpperCase()} (${program.programCode})`;
  worksheet.getCell("A3").font = { name: "Arial", size: 10, bold: true };
  worksheet.getCell("A3").alignment = { horizontal: "center" };

  worksheet.mergeCells("A4:N4");
  worksheet.getCell("A4").value = `MUNICIPALITY: DINGALAN | PROVINCE: AURORA | REQUIRED WORK DAYS: ${program.requiredWorkDays} DAYS`;
  worksheet.getCell("A4").font = { name: "Arial", size: 10, italic: true };
  worksheet.getCell("A4").alignment = { horizontal: "center" };

  // Table Columns
  // Row 6: Day headers
  // Row 7: Morning/Afternoon Time In/Out headers
  worksheet.getCell("A6").value = "DESIGNATED";
  worksheet.getCell("A7").value = "NUMBER";
  worksheet.mergeCells("A6:A7");

  worksheet.getCell("B6").value = "NAME OF BENEFICIARY";
  worksheet.getCell("B7").value = "(Last Name, First Name, Middle Name)";
  worksheet.mergeCells("B6:B7");

  worksheet.getCell("C6").value = "BARANGAY";
  worksheet.getCell("C7").value = "SITIO";
  worksheet.mergeCells("C6:C7");

  worksheet.getCell("D6").value = "TABLE";
  worksheet.getCell("D7").value = "SLOT";
  worksheet.mergeCells("D6:D7");

  let colIdx = 5;
  const numDays = program.workDays.length > 0 ? program.workDays.length : program.requiredWorkDays;

  for (let d = 1; d <= numDays; d++) {
    const startColLetter = getColLetter(colIdx);
    const endColLetter = getColLetter(colIdx + 3);
    const dayObj = program.workDays.find((wd) => wd.dayNumber === d);
    const dayLabel = dayObj ? `DAY ${d} (${dayObj.workDate})` : `DAY ${d}`;

    worksheet.mergeCells(`${startColLetter}6:${endColLetter}6`);
    worksheet.getCell(`${startColLetter}6`).value = dayLabel;
    worksheet.getCell(`${startColLetter}6`).alignment = { horizontal: "center" };
    worksheet.getCell(`${startColLetter}6`).font = { bold: true };
    worksheet.getCell(`${startColLetter}6`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCE6F1" },
    };

    worksheet.getCell(`${getColLetter(colIdx)}7`).value = "AM IN";
    worksheet.getCell(`${getColLetter(colIdx + 1)}7`).value = "AM OUT";
    worksheet.getCell(`${getColLetter(colIdx + 2)}7`).value = "PM IN";
    worksheet.getCell(`${getColLetter(colIdx + 3)}7`).value = "PM OUT";

    colIdx += 4;
  }

  // Style Header Rows
  worksheet.getRow(6).font = { bold: true, size: 9 };
  worksheet.getRow(7).font = { bold: true, size: 9 };
  worksheet.getRow(6).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(7).alignment = { horizontal: "center", vertical: "middle" };

  // Data rows
  let rowIdx = 8;
  for (const pb of program.programBeneficiaries) {
    const row = worksheet.getRow(rowIdx);
    row.getCell(1).value = pb.designatedNumber;
    row.getCell(2).value = pb.beneficiary.fullName;
    row.getCell(3).value = pb.beneficiary.barangay || "";
    row.getCell(4).value = pb.tableNumber || "";

    let dayCol = 5;
    for (let d = 1; d <= numDays; d++) {
      const dayObj = program.workDays.find((wd) => wd.dayNumber === d);
      const rec = dayObj
        ? pb.attendanceRecords.find((a) => a.workDayId === dayObj.id || a.attendanceDate === dayObj.workDate)
        : null;

      row.getCell(dayCol).value = rec?.morningTimeIn ? format(new Date(rec.morningTimeIn), "HH:mm") : "-";
      row.getCell(dayCol + 1).value = rec?.morningTimeOut ? format(new Date(rec.morningTimeOut), "HH:mm") : "-";
      row.getCell(dayCol + 2).value = rec?.afternoonTimeIn ? format(new Date(rec.afternoonTimeIn), "HH:mm") : "-";
      row.getCell(dayCol + 3).value = rec?.afternoonTimeOut ? format(new Date(rec.afternoonTimeOut), "HH:mm") : "-";

      dayCol += 4;
    }

    row.alignment = { vertical: "middle" };
    row.font = { size: 9 };
    rowIdx++;
  }

  // Set widths
  worksheet.getColumn(1).width = 12;
  worksheet.getColumn(2).width = 30;
  worksheet.getColumn(3).width = 16;
  worksheet.getColumn(4).width = 12;
  for (let c = 5; c < colIdx; c++) {
    worksheet.getColumn(c).width = 9;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateWorkProgramExcel(programId: string): Promise<Buffer> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      tupadWorkPrograms: {
        include: {
          items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
        },
      },
    },
  });

  if (!program) throw new Error("Program not found");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LGU Dingalan - PESO TUPAD System";
  workbook.created = new Date();

  const workPrograms = program.tupadWorkPrograms;

  // Create Consolidated Sheet
  const ws = workbook.addWorksheet("10-DAY TUPAD WORK PROGRAM", {
    views: [{ state: "frozen", ySplit: 8 }],
  });

  let rowIdx = 1;

  for (const wp of workPrograms) {
    ws.mergeCells(`A${rowIdx}:H${rowIdx}`);
    ws.getCell(`A${rowIdx}`).value = "TUPAD Work Program (10 Days)";
    ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 12, bold: true };

    rowIdx++;
    ws.mergeCells(`A${rowIdx}:H${rowIdx}`);
    ws.getCell(`A${rowIdx}`).value = "Municipality of Dingalan";
    ws.getCell(`A${rowIdx}`).font = { name: "Arial", size: 10, italic: true };

    rowIdx++;
    ws.getCell(`A${rowIdx}`).value = "Project Location:";
    ws.getCell(`B${rowIdx}`).value = wp.projectLocation || wp.barangay;
    ws.getCell(`A${rowIdx}`).font = { bold: true };
    ws.getCell(`B${rowIdx}`).font = { bold: true };

    rowIdx++;
    ws.getCell(`A${rowIdx}`).value = "No. of Beneficiaries:";
    ws.getCell(`B${rowIdx}`).value = wp.beneficiaryCount;
    ws.getCell(`A${rowIdx}`).font = { bold: true };
    ws.getCell(`B${rowIdx}`).font = { bold: true };

    rowIdx++;
    ws.getCell(`A${rowIdx}`).value = "Nature of Work:";
    ws.mergeCells(`B${rowIdx}:H${rowIdx}`);
    ws.getCell(`B${rowIdx}`).value = wp.natureOfWork || program.natureOfWork || "Environmental Cleaning & Maintenance";
    ws.getCell(`A${rowIdx}`).font = { bold: true };

    rowIdx++;
    ws.getCell(`A${rowIdx}`).value = "Working Hours:";
    ws.mergeCells(`B${rowIdx}:H${rowIdx}`);
    ws.getCell(`B${rowIdx}`).value = wp.workingHours || "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)";
    ws.getCell(`A${rowIdx}`).font = { bold: true };

    rowIdx++;
    // Table Header
    const tableHeaderRow = rowIdx;
    ws.getCell(`A${tableHeaderRow}`).value = "DAY";
    ws.getCell(`B${tableHeaderRow}`).value = "Specific Activities";
    ws.getCell(`C${tableHeaderRow}`).value = "AREA";
    ws.getCell(`D${tableHeaderRow}`).value = "MALE";
    ws.getCell(`E${tableHeaderRow}`).value = "FEMALE";
    ws.getCell(`F${tableHeaderRow}`).value = "SC/PWD MALE";
    ws.getCell(`G${tableHeaderRow}`).value = "SC/PWD FEMALE";
    ws.getCell(`H${tableHeaderRow}`).value = "TOTAL";

    const header = ws.getRow(tableHeaderRow);
    header.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    header.alignment = { horizontal: "center", vertical: "middle" };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0C3B6D" },
    };

    rowIdx++;

    // Group items by day
    for (const item of wp.items) {
      const row = ws.getRow(rowIdx);
      row.getCell(1).value = item.dayNumber;
      row.getCell(2).value = item.specificActivities;
      row.getCell(3).value = item.area;
      row.getCell(4).value = item.maleCount || "";
      row.getCell(5).value = item.femaleCount || "";
      row.getCell(6).value = item.scPwdMaleCount || "";
      row.getCell(7).value = item.scPwdFemaleCount || "";
      row.getCell(8).value = item.totalCount || item.maleCount + item.femaleCount || "";

      row.alignment = { vertical: "middle" };
      row.font = { size: 9 };
      rowIdx++;
    }

    rowIdx += 2; // Spacing between barangays
  }

  // Set widths
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 46;
  ws.getColumn(3).width = 36;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 10;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateAccomplishmentExcel(programId: string): Promise<Buffer> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      programBeneficiaries: {
        include: {
          beneficiary: true,
          qrCodes: true,
        },
      },
      workDays: { orderBy: { dayNumber: "asc" } },
      accomplishmentPhotos: true,
      programBarangays: true,
      tupadWorkPrograms: {
        include: {
          items: { orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] },
        },
      },
    },
  });

  if (!program) throw new Error("Program not found");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LGU Dingalan - PESO TUPAD System";

  const barangays = [
    "APLAYA", "BUTAS NA BATO", "CARAGSACAN", "DAVILDAVILAN",
    "DIKAPANIKIAN", "IBONA", "MATAWE", "PALTIC",
    "POBLACION", "TANAWAN", "UMIRAY"
  ];

  for (const brgyName of barangays) {
    const ws = workbook.addWorksheet(brgyName);
    const brgyBeneficiaries = program.programBeneficiaries.filter(
      (pb) => (pb.beneficiary.barangay || "").toUpperCase() === brgyName
    );

    const wp = program.tupadWorkPrograms.find(
      (w) => w.barangay.toUpperCase() === brgyName
    );

    ws.mergeCells("A1:H1");
    ws.getCell("A1").value = "DOLE - TUPAD PROGRAM ACCOMPLISHMENT REPORT";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.mergeCells("A2:H2");
    ws.getCell("A2").value = `BARANGAY: ${brgyName} | MUNICIPALITY: DINGALAN, AURORA`;
    ws.getCell("A2").font = { bold: true, size: 11 };
    ws.getCell("A2").alignment = { horizontal: "center" };

    ws.getCell("A4").value = "Project Location:";
    ws.getCell("B4").value = `Barangay ${brgyName}, Dingalan, Aurora`;
    ws.getCell("A5").value = "Nature of Work:";
    ws.getCell("B5").value = wp?.natureOfWork || program.natureOfWork || "Environmental Cleaning & Maintenance";
    ws.getCell("A6").value = "Number of Beneficiaries:";
    ws.getCell("B6").value = wp?.beneficiaryCount || brgyBeneficiaries.length;
    ws.getCell("A7").value = "Period of Work:";
    ws.getCell("B7").value = `${program.startDate || "Day 1"} to ${program.endDate || "Day 10"} (${program.requiredWorkDays} Days)`;

    // Section 1: Work Program Activities Schedule
    ws.getCell("A9").value = "TUPAD WORK PROGRAM SCHEDULE & ACTIVITIES";
    ws.getCell("A9").font = { bold: true, size: 10, color: { argb: "FF0C3B6D" } };

    ws.getCell("A10").value = "DAY";
    ws.getCell("B10").value = "SPECIFIC ACTIVITY";
    ws.getCell("C10").value = "ASSIGNED WORK AREA";
    ws.getCell("D10").value = "MALE";
    ws.getCell("E10").value = "FEMALE";
    ws.getCell("F10").value = "SC/PWD";
    ws.getCell("G10").value = "TOTAL";

    ws.getRow(10).font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    ws.getRow(10).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0C3B6D" },
    };

    let rIdx = 11;
    const workItemsList: WorkProgramItemAllocation[] = [];
    if (wp && wp.items.length > 0) {
      for (const it of wp.items) {
        workItemsList.push({
          id: it.id,
          dayNumber: it.dayNumber,
          specificActivities: it.specificActivities,
          area: it.area,
          maleCount: it.maleCount,
          femaleCount: it.femaleCount,
          scPwdMaleCount: it.scPwdMaleCount,
          scPwdFemaleCount: it.scPwdFemaleCount,
          totalCount: it.totalCount,
        });

        const row = ws.getRow(rIdx);
        row.getCell(1).value = `Day ${it.dayNumber}`;
        row.getCell(2).value = it.specificActivities;
        row.getCell(3).value = it.area;
        row.getCell(4).value = it.maleCount || "";
        row.getCell(5).value = it.femaleCount || "";
        row.getCell(6).value = (it.scPwdMaleCount || 0) + (it.scPwdFemaleCount || 0) || "";
        row.getCell(7).value = it.totalCount || it.maleCount + it.femaleCount || "";
        row.font = { size: 9 };
        rIdx++;
      }
    } else {
      const row = ws.getRow(rIdx);
      row.getCell(2).value = "General Community Cleaning & Greening";
      row.getCell(3).value = "Barangay Public Areas";
      row.getCell(7).value = brgyBeneficiaries.length;
      rIdx++;
    }

    rIdx += 2;

    // Section 2: Beneficiary Roster with Smart Work Area and Activity Assignment
    ws.getCell(`A${rIdx}`).value = "BENEFICIARY ATTENDANCE, WORK AREA & PARTICIPATION ROSTER";
    ws.getCell(`A${rIdx}`).font = { bold: true, size: 10, color: { argb: "FF0C3B6D" } };
    rIdx++;

    ws.getCell(`A${rIdx}`).value = "#";
    ws.getCell(`B${rIdx}`).value = "DESIGNATED NO.";
    ws.getCell(`C${rIdx}`).value = "BENEFICIARY NAME";
    ws.getCell(`D${rIdx}`).value = "SEX";
    ws.getCell(`E${rIdx}`).value = "SITIO / ADDRESS";
    ws.getCell(`F${rIdx}`).value = "ASSIGNED WORK AREA";
    ws.getCell(`G${rIdx}`).value = "DESIGNATED SPECIFIC ACTIVITY";
    ws.getCell(`H${rIdx}`).value = "STATUS";
    ws.getCell(`I${rIdx}`).value = "QR TOKEN REF";

    ws.getRow(rIdx).font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    ws.getRow(rIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };

    rIdx++;
    brgyBeneficiaries.forEach((b, idx) => {
      const activeQr = b.qrCodes?.find((q: any) => q.status === "ACTIVE") || b.qrCodes?.[0];

      // Calculate smart work assignment for Day 1 schedule
      const assignment = assignBeneficiaryWorkArea(
        {
          id: b.beneficiary.id,
          designatedNumber: b.designatedNumber,
          fullName: b.beneficiary.fullName,
          sex: b.beneficiary.sex,
          sitio: b.beneficiary.sitio,
          barangay: b.beneficiary.barangay,
          isSenior: b.beneficiary.isSenior,
          isPwd: b.beneficiary.isPwd,
        },
        workItemsList.filter((it) => it.dayNumber === 1 || workItemsList.length <= 1),
        1
      );

      const row = ws.getRow(rIdx);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = b.designatedNumber;
      row.getCell(3).value = b.beneficiary.fullName;
      row.getCell(4).value = b.beneficiary.sex || "UNSPECIFIED";
      row.getCell(5).value = b.beneficiary.sitio || "";
      row.getCell(6).value = assignment.area;
      row.getCell(7).value = assignment.specificActivity;
      row.getCell(8).value = b.participationStatus;
      row.getCell(9).value = activeQr?.publicToken || `SLOT-${b.designatedNumber}`;
      row.font = { size: 9 };
      rIdx++;
    });

    // Signature section
    rIdx += 3;
    ws.getCell(`A${rIdx}`).value = "Prepared by:";
    ws.getCell(`E${rIdx}`).value = "Verified by:";

    rIdx += 3;
    ws.getCell(`A${rIdx}`).value = "_________________________";
    ws.getCell(`E${rIdx}`).value = "_________________________";

    rIdx += 1;
    ws.getCell(`A${rIdx}`).value = "TUPAD Coordinator / Focal Person";
    ws.getCell(`E${rIdx}`).value = "PESO Manager / DOLE Coordinator";

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 30;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 24;
    ws.getColumn(6).width = 34;
    ws.getColumn(7).width = 38;
    ws.getColumn(8).width = 14;
    ws.getColumn(9).width = 28;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generates an official Orientation & Stub Distribution Excel Report
 */
export async function generateOrientationExcel(programId: string): Promise<Buffer> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      programBeneficiaries: {
        where: { participationStatus: { not: "REPLACED" } },
        include: {
          beneficiary: true,
          orientationAttendance: true,
          stubDistributions: true,
        },
        orderBy: { designatedNumber: "asc" },
      },
    },
  });

  if (!program) throw new Error("Program not found");

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Orientation & Stubs");

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = `${program.programName} - ORIENTATION & STUB DISTRIBUTION REPORT`;
  ws.getCell("A1").font = { bold: true, size: 12 };

  const headers = ["#", "DESIGNATED NO.", "FULL NAME", "BARANGAY", "TABLE NO.", "STUB STATUS", "ORIENTATION STATUS", "SCANNED AT"];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };

  program.programBeneficiaries.forEach((pb, idx) => {
    const r = ws.getRow(idx + 4);
    const stub = pb.stubDistributions?.[0];
    const orient = pb.orientationAttendance?.[0];
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = pb.designatedNumber;
    r.getCell(3).value = pb.beneficiary.fullName;
    r.getCell(4).value = pb.beneficiary.barangay || "Dingalan";
    r.getCell(5).value = pb.tableNumber || "-";
    r.getCell(6).value = stub?.status || "PENDING";
    r.getCell(7).value = orient?.status || "ABSENT";
    r.getCell(8).value = orient?.scannedAt ? format(new Date(orient.scannedAt), "yyyy-MM-dd hh:mm a") : "-";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generates an official Payout Verification Excel Report
 */
export async function generatePayoutExcel(programId: string): Promise<Buffer> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      programBeneficiaries: {
        where: { participationStatus: { not: "REPLACED" } },
        include: {
          beneficiary: true,
          payouts: { include: { verifiedBy: { select: { fullName: true } } } },
        },
        orderBy: { designatedNumber: "asc" },
      },
    },
  });

  if (!program) throw new Error("Program not found");

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Payout Verification");

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = `${program.programName} - PAYOUT VERIFICATION REPORT`;
  ws.getCell("A1").font = { bold: true, size: 12 };

  const headers = ["#", "DESIGNATED NO.", "FULL NAME", "BARANGAY", "PAYOUT STATUS", "PAYOUT DATE", "VERIFIED BY", "REMARKS"];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };

  program.programBeneficiaries.forEach((pb, idx) => {
    const r = ws.getRow(idx + 4);
    const payout = pb.payouts?.[0];
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = pb.designatedNumber;
    r.getCell(3).value = pb.beneficiary.fullName;
    r.getCell(4).value = pb.beneficiary.barangay || "Dingalan";
    r.getCell(5).value = payout?.status || "PENDING";
    r.getCell(6).value = payout?.payoutDate || "-";
    r.getCell(7).value = payout?.verifiedBy?.fullName || "-";
    r.getCell(8).value = payout?.remarks || "";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}


function getColLetter(colIndex: number): string {
  let temp = "";
  let letter = "";
  while (colIndex > 0) {
    temp = String.fromCharCode(((colIndex - 1) % 26) + 65);
    letter = temp + letter;
    colIndex = Math.floor((colIndex - 1) / 26);
  }
  return letter;
}

