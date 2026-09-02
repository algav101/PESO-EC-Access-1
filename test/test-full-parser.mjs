import * as XLSX from "xlsx";
import { parseWorkProgramBuffer } from "../src/lib/work-program-parser.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FULL_USER_CSV = `TUPAD Work Program (10 Days),,,,,,,
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
,,,,,,,
Project Location:,CARAGSACAN,,,,,,
No. of Beneficiaries:,82,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,23,59,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions",Purok 5,8,15,,,82
,"Community Gardening ( Weeding, Land preparation)",Purok 1 Phase 1,7,14,,,
,De-clogging/Removal of Debris of Canals and Creeks outside/inside School perimeter,"Caragsacan Elementary School, Dingalan National Highschool",8,30,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,23,59,,,82
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,23,59,,,82
,,,,,,,
Project Location:,DAVILDAVILAN,,,,,,
No. of Beneficiaries:,30,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,9,21,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions","Purok 1 ,Purok 2, Purok 3, and Purok 5",5,11,,,30
,"Community Gardening ( Weeding, Land preparation)",Purok 1,4,10,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Roads going to Dingalan Community College and Convention Center,21,9,,,30
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Roads going to Dingalan Community College and Convention Center,21,9,,,30
,,,,,,,
Project Location:,APLAYA,,,,,,
No. of Beneficiaries:,36,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,8,28,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions",Purok Lapu-Lapu,4,14,,,36
,"Community Gardening ( Weeding, Land preparation)",Purok Lapu-Lapu,4,14,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,8,28,,,36
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,8,28,,,36
,,,,,,,
Project Location:,BUTAS NA BATO,,,,,,
No. of Beneficiaries:,32,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,10,22,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions","PUROK 1, PUROK 2, PUROK 3, PUROK 4",5,10,,,32
,"Community Gardening ( Weeding, Land preparation)",PUROK 1,5,12,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,10,22,,,32
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,10,22,,,32
,,,,,,,
Project Location:,DIKAPANIKIAN,,,,,,
No. of Beneficiaries:,13,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,7,6,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"Community Gardening ( Weeding, Land preparation)",Core Housing,7,6,,,13
2,"Community Gardening (Vegetable planting, Digging of compost pit )",Core Housing,7,6,,,13
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Dingalan-Baler Road,7,6,,,13
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Dingalan-Baler Road,7,6,,,13
,,,,,,,
Project Location:,IBONA,,,,,,
No. of Beneficiaries:,41,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,12,29,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"Community Gardening ( Weeding, Land preparation)",Purok 6 aves,4,12,,,41
,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions",Purok 1 and purok 2,4,5,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Lipit Area,12,29,,,41
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Lipit Area,12,29,,,41
,,,,,,,
Project Location:,POBLACION,,,,,,
No. of Beneficiaries:,20,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,6,14,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"Community Gardening ( Weeding, Land preparation)",Purok 4,6,14,,,20
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,6,14,,,20
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Municipal MRF,6,14,,,20
,,,,,,,
Project Location:,TANAWAN,,,,,,
No. of Beneficiaries:,28,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,6,22,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"Community Gardening ( Weeding, Land preparation)",Purok 1,3,11,,,28
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Tanawan Road going to Tanawan Falls,6,22,,,28
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Tanawan Road going to Tanawan Falls,6,22,,,28
,,,,,,,
Project Location:,UMIRAY,,,,,,
No. of Beneficiaries:,112,,,,,,
Nature of Work:,Environmental Cleaning & Maintenance; Vegetation Management;  Waste Management Activities; Community Gardening ; Drainage and Flood Mitigation Works; Road and Public Safety Works; Tourism and Coastal Area Maintenance; School Support ( in response to increasing dengue cases),,,,,,
Working Hours:,Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM),,,,,,
,,,31,81,,,
DAY,Specific Activities,AREA,MALE,FEMALE,SC/PWD MALE,SC/PWD FEMALE,TOTAL
1,"Community Gardening ( Weeding, Land preparation)",Sitio Schoolsite,10,27,,,112
,"De-clogging of canals, creeks, waterways, catch basins, and drainage inlets; removal of silt, mud, plastics, and other obstructions",Sitio Kamandag along Ferry to Singawan Road,11,29,,,
,Maintenance/cleaning/greening of public Facilities,"Brgy Hall, Evacuation Center, Municipal Extension",10,25,,,
9,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Sitio Sabang,31,81,,,112
10,"Tree Planting Activity (Cleaning of Area, Digging of Hole, Planting of Seedlings and provision of Tree Guard Fence)",Along Sitio Sabang,31,81,,,112
`;

async function testFullParser() {
  const prog = await prisma.program.findFirst();
  if (!prog) throw new Error("No program found in db");

  const buffer = Buffer.from(FULL_USER_CSV, "utf-8");
  const parsed = await parseWorkProgramBuffer(buffer, "user_template.csv", prog.id);

  console.log(`Parsed total barangays: ${parsed.totalBarangays}`);
  console.log(`Parsed total activities: ${parsed.totalActivities}`);
  console.log(`Parsed total target beneficiaries: ${parsed.totalTargetBeneficiaries}`);

  const expectedBarangays = [
    "Paltic", "Matawe", "Caragsacan", "Davildavilan", "Aplaya",
    "Butas na Bato", "Dikapanikian", "Ibona", "Poblacion", "Tanawan", "Umiray"
  ];

  for (const exp of expectedBarangays) {
    const found = parsed.programs.find((p) => p.barangay.toLowerCase() === exp.toLowerCase());
    if (found) {
      console.log(`[PASS] Found Barangay: ${found.barangay} (${found.beneficiaryCount} Pax, ${found.items.length} activities)`);
    } else {
      console.error(`[FAIL] Missing Barangay: ${exp}`);
    }
  }

  await prisma.$disconnect();
}

testFullParser().catch((e) => {
  console.error(e);
  process.exit(1);
});
