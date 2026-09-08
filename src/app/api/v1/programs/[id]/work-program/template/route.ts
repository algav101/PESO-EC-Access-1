export const dynamic = "force-dynamic";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "LGU Dingalan - PESO TUPAD System";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("TUPAD WORK PROGRAM TEMPLATE");

    const sampleSections = [
      {
        barangay: "PALTIC",
        count: 91,
        activities: [
          { day: 1, act: "De-clogging of canals, creeks, waterways, catch basins", area: "Purok Mulawin to Ipil-ipil", male: 12, female: 14, total: 91 },
          { day: 1, act: "Community Gardening (Weeding, Land preparation)", area: "Ipil-ipil, Yakal 1, Yakal 2, Kamagong", male: 6, female: 16, total: 0 },
          { day: 1, act: "De-clogging/Removal of Debris of Canals outside/inside School", area: "Paltic Elementary School, Saint Patrick Academy", male: 12, female: 14, total: 0 },
          { day: 1, act: "Waste Segregation in Barangay MRF", area: "Ipil-ipil", male: 4, female: 13, total: 0 },
          { day: 2, act: "De-clogging of canals, creeks, waterways, catch basins", area: "Purok Yakal 1 to Yakal 2", male: 12, female: 14, total: 91 },
        ],
      },
      {
        barangay: "MATAWE",
        count: 35,
        activities: [
          { day: 1, act: "Maintenance/cleaning/greening of public Facilities", area: "Mun. extension matawe Covered Court, Health Center", male: 1, female: 12, total: 35 },
          { day: 1, act: "Community Gardening (Weeding, Land preparation)", area: "Purok 3, Purok 2", male: 2, female: 8, total: 0 },
          { day: 1, act: "De-clogging/Removal of Debris inside/outside School perimeter", area: "Cabog Integrated School, Matawe Elementary School", male: 4, female: 8, total: 0 },
        ],
      },
    ];

    let rowIdx = 1;
    for (const sec of sampleSections) {
      ws.getCell(`A${rowIdx}`).value = "TUPAD Work Program (10 Days)";
      ws.getCell(`A${rowIdx}`).font = { bold: true, size: 12 };
      rowIdx++;

      ws.getCell(`A${rowIdx}`).value = "Municipality of Dingalan";
      ws.getCell(`A${rowIdx}`).font = { italic: true };
      rowIdx++;

      ws.getCell(`A${rowIdx}`).value = "Project Location:";
      ws.getCell(`B${rowIdx}`).value = sec.barangay;
      ws.getCell(`A${rowIdx}`).font = { bold: true };
      ws.getCell(`B${rowIdx}`).font = { bold: true };
      rowIdx++;

      ws.getCell(`A${rowIdx}`).value = "No. of Beneficiaries:";
      ws.getCell(`B${rowIdx}`).value = sec.count;
      ws.getCell(`A${rowIdx}`).font = { bold: true };
      ws.getCell(`B${rowIdx}`).font = { bold: true };
      rowIdx++;

      ws.getCell(`A${rowIdx}`).value = "Nature of Work:";
      ws.getCell(`B${rowIdx}`).value =
        "Environmental Cleaning & Maintenance; Vegetation Management; Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases)";
      ws.getCell(`A${rowIdx}`).font = { bold: true };
      rowIdx++;

      ws.getCell(`A${rowIdx}`).value = "Working Hours:";
      ws.getCell(`B${rowIdx}`).value =
        "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)";
      ws.getCell(`A${rowIdx}`).font = { bold: true };
      rowIdx++;

      // Header Row
      const hRow = rowIdx;
      ws.getCell(`A${hRow}`).value = "DAY";
      ws.getCell(`B${hRow}`).value = "Specific Activities";
      ws.getCell(`C${hRow}`).value = "AREA";
      ws.getCell(`D${hRow}`).value = "MALE";
      ws.getCell(`E${hRow}`).value = "FEMALE";
      ws.getCell(`F${hRow}`).value = "SC/PWD MALE";
      ws.getCell(`G${hRow}`).value = "SC/PWD FEMALE";
      ws.getCell(`H${hRow}`).value = "TOTAL";

      ws.getRow(hRow).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(hRow).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0C3B6D" },
      };
      rowIdx++;

      for (const act of sec.activities) {
        const row = ws.getRow(rowIdx);
        row.getCell(1).value = act.day;
        row.getCell(2).value = act.act;
        row.getCell(3).value = act.area;
        row.getCell(4).value = act.male;
        row.getCell(5).value = act.female;
        row.getCell(6).value = "";
        row.getCell(7).value = "";
        row.getCell(8).value = act.total || "";
        rowIdx++;
      }

      rowIdx += 2;
    }

    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 46;
    ws.getColumn(3).width = 36;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 10;
    ws.getColumn(6).width = 14;
    ws.getColumn(7).width = 16;
    ws.getColumn(8).width = 10;

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="TUPAD_Work_Program_Template_Dingalan.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
