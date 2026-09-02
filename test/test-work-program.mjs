import prisma from "../src/lib/prisma.js";
import { parseWorkProgramBuffer } from "../src/lib/work-program-parser.js";
import fs from "fs";

// Sample CSV from user input
const SAMPLE_CSV = `TUPAD Work Program (10 Days),,,,,,,
Municipality of Dingalan,,,,,,,
Project Location:,PALTIC,,,,,,
No. of Beneficiaries:,91,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,,,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions",Purok Mulawin to Ipil-ipil,12,14,,,91
,"Community Gardening ( Weeding, Land preparation)","Ipil-ipil, Yakal 1, Yakal 2, Kamagong",6,16,,,
,De-clogging/Removal of Debris of Canals and Creeks outside/inside School perimeter,"Paltic Elementary School, Saint Patrick Academy",12,14,,,
1,Waste Segregation in Barangay MRF,Ipil-ipl,4,13,,,
2,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions",Purok Yakal 1 to Yakal 2,12,14,,,91
2,"Community Gardening (Land Preparation, Planting of Vegetables, Watering of Plants and Digging of Fishpond)","Ipil-ipil, Yakal 1, Yakal 2, Kamagong",6,16,,,
2,"Trimming of Tree/shrubs branches, Search and Destroy within school facilities for Dengue Mosquito breeding Ground","Paltic Elementary School, Saint Patrick Academy",12,14,,,
2,Digging of Pits for Compost and continuation of segregration  in Barangay MRF,Ipil-ipl,4,13,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Paltic-Dika Road,34,57,,,91
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Paltic-Dika Road,34,57,,,91
,,,,,,,
Project Location:,MATAWE,,,,,,
No. of Beneficiaries:,35,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,7,28,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,Maintenance/cleaning/greening of public Facilities,"Mun. extension matawe Covered Court,Evacuation Center,Daycare Center, Health Center",1,12,,,35
1,"Community Gardening ( Weeding, Land preparation)","Purok 3, Purok 2",2,8,,,
1,De-clogging/Removal of Debris of Canals and Creeks outside/inside School perimeter,"Cabog Integrated School, Matawe Elementary School",4,8,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Amutan River and Matawe Housing Area,7,28,,,35
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Amutan River and Matawe Housing Area,7,28,,,35
`;

async function runTests() {
  console.log("=== Testing TUPAD Work Program Parser ===");

  // Find any active program in DB
  const programs = await prisma.program.findMany({ take: 1 });
  if (programs.length === 0) {
    console.log("No program found in DB to test against.");
    return;
  }

  const prog = programs[0];
  console.log(`Testing against program: ${prog.programName} (${prog.id})`);

  const buffer = Buffer.from(SAMPLE_CSV, "utf-8");
  const result = await parseWorkProgramBuffer(buffer, "sample_tupad_work_program.csv", prog.id);

  console.log(`Parsed Total Barangays: ${result.totalBarangays}`);
  console.log(`Parsed Total Activities: ${result.totalActivities}`);
  console.log(`Parsed Target Beneficiaries: ${result.totalTargetBeneficiaries}`);

  for (const p of result.programs) {
    console.log(`\nBarangay: ${p.barangay}`);
    console.log(`- Project Location: ${p.projectLocation}`);
    console.log(`- Target Beneficiaries: ${p.beneficiaryCount}`);
    console.log(`- Total Activities: ${p.items.length}`);
    console.log(`- Validation Status: ${p.validation.status}`);
    console.log(`- Masterlist Count: ${p.validation.masterlistCount}`);
    if (p.validation.warnings.length > 0) {
      console.log(`- Warnings:`, p.validation.warnings);
    }
  }

  console.log("\n=== Test Completed Successfully ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
