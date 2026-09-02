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
`;

async function testApi() {
  console.log("=== Testing Next.js API Routes for Work Program ===");

  // 1. Authenticate with admin account
  const loginRes = await fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });

  const cookieHeader = loginRes.headers.get("set-cookie");
  const authCookie = cookieHeader ? cookieHeader.split(";")[0] : "";
  console.log(`[PASS] Logged in as Admin. Auth Cookie acquired.`);

  // 2. Fetch programs with auth cookie
  const progRes = await fetch("http://localhost:3000/api/v1/programs", {
    headers: { Cookie: authCookie },
  });
  const progData = await progRes.json();
  const programs = progData.programs || [];

  if (programs.length === 0) {
    console.error("No programs found in DB");
    process.exit(1);
  }

  const prog = programs[0];
  console.log(`[PASS] Target Program: ${prog.programName} (${prog.id})`);

  // 3. Test Preview Route
  const formData = new FormData();
  const blob = new Blob([FULL_USER_CSV], { type: "text/csv" });
  formData.append("file", blob, "dingalan_work_program.csv");

  const previewRes = await fetch(`http://localhost:3000/api/v1/programs/${prog.id}/work-program/preview`, {
    method: "POST",
    headers: { Cookie: authCookie },
    body: formData,
  });

  const previewData = await previewRes.json();
  if (!previewRes.ok) {
    console.error("Preview failed:", previewData);
    process.exit(1);
  }

  console.log(`[PASS] Preview success:`);
  console.log(`  - Total Barangays: ${previewData.preview.totalBarangays}`);
  console.log(`  - Total Activities: ${previewData.preview.totalActivities}`);
  console.log(`  - Total Beneficiaries: ${previewData.preview.totalTargetBeneficiaries}`);

  // 4. Test Commit Route
  const commitRes = await fetch(`http://localhost:3000/api/v1/programs/${prog.id}/work-program/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({ programs: previewData.preview.programs }),
  });

  const commitData = await commitRes.json();
  if (!commitRes.ok) {
    console.error("Commit failed:", commitData);
    process.exit(1);
  }

  console.log(`[PASS] Commit success: ${commitData.committedBarangays} Barangays, ${commitData.committedActivities} Activities saved to DB!`);

  // 5. Test Fetch Work Program Route
  const fetchWpRes = await fetch(`http://localhost:3000/api/v1/programs/${prog.id}/work-program`, {
    headers: { Cookie: authCookie },
  });
  const fetchWpData = await fetchWpRes.json();
  console.log(`[PASS] Fetch stored work programs: ${fetchWpData.workPrograms.length} Barangays in DB`);

  // 7. Test Manual Beneficiary Creation & Deletion API
  const createBeneRes = await fetch(`http://localhost:3000/api/v1/programs/${prog.id}/beneficiaries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({
      designatedNumber: "997",
      fullName: "TEST API DELETION BENEFICIARY",
      birthday: "1993-03-03",
      barangay: "Paltic",
    }),
  });

  const createBeneData = await createBeneRes.json();
  if (!createBeneRes.ok) {
    console.error("Create test beneficiary failed:", createBeneData);
    process.exit(1);
  }
  console.log(`[PASS] Created test beneficiary entry: ${createBeneData.beneficiary.id}`);

  // Test Delete Beneficiary from Program
  const deleteBeneRes = await fetch(
    `http://localhost:3000/api/v1/programs/${prog.id}/beneficiaries?programBeneficiaryId=${createBeneData.beneficiary.id}&deleteGlobal=true`,
    {
      method: "DELETE",
      headers: { Cookie: authCookie },
    }
  );

  const deleteBeneData = await deleteBeneRes.json();
  if (!deleteBeneRes.ok) {
    console.error("Delete test beneficiary failed:", deleteBeneData);
    process.exit(1);
  }
  console.log(`[PASS] Deleted beneficiary entry successfully: ${deleteBeneData.message}`);

  // 8. Test Manual Beneficiary Status & Data PATCH API
  const createForEditRes = await fetch(`http://localhost:3000/api/v1/programs/${prog.id}/beneficiaries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({
      designatedNumber: "994",
      fullName: "BEFORE EDIT BENEFICIARY",
      birthday: "1995-05-05",
      barangay: "Paltic",
    }),
  });
  const createForEditData = await createForEditRes.json();
  const editTargetId = createForEditData.beneficiary.id;

  const patchRes = await fetch(`http://localhost:3000/api/v1/programs/${prog.id}/beneficiaries`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: authCookie },
    body: JSON.stringify({
      programBeneficiaryId: editTargetId,
      participationStatus: "REPLACED",
      tableNumber: "Table 7",
      slotGroup: "Senior Priority",
      orientationStatus: "PRESENT",
      fullName: "AFTER EDIT BENEFICIARY",
      birthday: "1995-06-06",
      barangay: "Aplaya",
      sitio: "Sitio Lapu Lapu",
      isSenior: true,
    }),
  });

  const patchData = await patchRes.json();
  if (!patchRes.ok) {
    console.error("PATCH beneficiary failed:", patchData);
    process.exit(1);
  }

  if (patchData.beneficiary.participationStatus !== "REPLACED") {
    console.error("PATCH validation failed: status is not REPLACED");
    process.exit(1);
  }
  if (patchData.beneficiary.tableNumber !== "Table 7") {
    console.error("PATCH validation failed: tableNumber is not Table 7");
    process.exit(1);
  }
  if (patchData.beneficiary.beneficiary.fullName !== "AFTER EDIT BENEFICIARY") {
    console.error("PATCH validation failed: fullName not updated");
    process.exit(1);
  }

  console.log(`[PASS] PATCH update successful: status changed to REPLACED, table assigned to Table 7, name updated!`);

  // Cleanup
  await fetch(
    `http://localhost:3000/api/v1/programs/${prog.id}/beneficiaries?programBeneficiaryId=${editTargetId}&deleteGlobal=true`,
    { method: "DELETE", headers: { Cookie: authCookie } }
  );

  console.log("\n=== ALL WORK PROGRAM & BENEFICIARY API TESTS PASSED! ===");
}

testApi().catch((err) => {
  console.error("Test API error:", err);
  process.exit(1);
});
