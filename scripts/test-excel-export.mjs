import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { generateAttendanceExcel, generateAccomplishmentExcel, generateWorkProgramExcel } from '../src/lib/excel-exporter.ts';

const prisma = new PrismaClient();

async function testExport() {
  const prog = await prisma.program.findFirst({
    where: { programCode: "TUPAD-DGL-2026-09" }
  });

  if (!prog) throw new Error("Program not found");

  console.log(`Testing export for Program: ${prog.programName} (${prog.id})`);

  // 1. Test Attendance Excel
  const attBuffer = await generateAttendanceExcel(prog.id);
  const attPath = path.join(process.cwd(), 'scripts', 'TUPAD_Consolidated_Attendance_Export.xlsx');
  fs.writeFileSync(attPath, attBuffer);
  console.log(`Generated Attendance Excel: ${attPath} (${attBuffer.length} bytes)`);

  // 2. Test Accomplishment Excel
  const accBuffer = await generateAccomplishmentExcel(prog.id);
  const accPath = path.join(process.cwd(), 'scripts', 'TUPAD_Consolidated_Accomplishment_Export.xlsx');
  fs.writeFileSync(accPath, accBuffer);
  console.log(`Generated Accomplishment Excel: ${accPath} (${accBuffer.length} bytes)`);

  // 3. Test Work Program Excel
  const wpBuffer = await generateWorkProgramExcel(prog.id);
  const wpPath = path.join(process.cwd(), 'scripts', 'TUPAD_10Day_Work_Program_Export.xlsx');
  fs.writeFileSync(wpPath, wpBuffer);
  console.log(`Generated Work Program Excel: ${wpPath} (${wpBuffer.length} bytes)`);

  console.log("All 3 Excel export files generated successfully!");
}

testExport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
