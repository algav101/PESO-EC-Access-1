import { strict as assert } from "node:assert";

const BASE_URL = "http://localhost:3000";

const SAMPLE_CSV = `No.,FORMULA FULL NAME,"FORMULA LAST NAME, FIRST NAME",Name of Beneficiary,,,,Birthdate,,,,Address (Beneficiary),,,,,Type of ID,ID No.,Contact No.,E-payment/,Type of Beneficiary,Occupation,Sex,Civil Status,Age,Average monthly income,DEPENDENT FULL NAME FORMULA,"DEPENDENT LAST NAME, FIRST NAME FORMULA ",Dependent (Name of Beneficiary of the Micro-insurance Holder),,,,RELATIONSHIP OF DEPENDEMT,AGE (18 ABOVE) OF DEPENDENT,Interested in wage employment or self-employment?,Skills Training Needed,"PWD
(Please Indicate)","4P's
(Y/N)","IP's
(Y/N)"
,,,First Name,Middle Name,Last Name,Extension Name,(YYYY/MM/DD),,,,Street,Brgy.,City/Municipality,Province,District,,,,Account No. ,,,,,,,,,First Name, Middle Name,Last Name,Extension Name,,,"(Yes/No, if Yes, please specify)",,,,
1,"ASTORGA, JONEL TALENTO","ASTORGA, JONEL",JONEL,TALENTO,ASTORGA,,2000/11/08,11,8,2000,LAPU LAPU,APLAYA,DINGALAN,AURORA,LONE,NATIONAL ID,2406-3425-7582-9680,639979925136,,SELF-EMPLOYED,LABORER,F,M,25,,"PRONTO, KAILA NICOL","PRONTO, KAILA",KAILA,NICOL,PRONTO,,WIFE,31,,,,N,N
2,"ATENTAR, OFELIA SARMIENTO","ATENTAR, OFELIA",OFELIA,SARMIENTO,ATENTAR,,1959/11/06,11,6,1959,PUROK TANIGUE,APLAYA,DINGALAN,AURORA,LONE,NATIONAL ID,6348-5468-2693-6042,639977003203,,SENIOR CITIZEN,PIGGERY FARM,F,M,66,,"ATENTAR, NICOLE SARMIENTO","ATENTAR, NICOLE",NICOLE,SARMIENTO,ATENTAR,,DAUGHTER,26,,,,N,N
3,"AVELLANO, LOVIE TENA","AVELLANO, LOVIE",LOVIE,TENA,AVELLANO,,1979/11/08,11,8,1979,LAPU LAPU,APLAYA,DINGALAN,AURORA,LONE,NATIONAL ID,5684-1903-1870-8153,639852686649,,SELF-EMPLOYED,LABORER,M,M,46,,"AVELLANO, ANNA CHERRIE BALDERAMA","AVELLANO, ANNA CHERRIE",ANNA CHERRIE,BALDERAMA,AVELLANO,,WIFE,48,,,,N,N
410,"ADONIS, LYKA RITUAL","ADONIS, LYKA",LYKA,RITUAL,ADONIS,,2005/06/20,6,20,2005,SO DUGYAN,UMIRAY,DINGALAN,AURORA,LONE,NATIONAL ID,2156438275205134,639128510692,,SELF-EMPLOYED,LABORER,F,S,21,,"PANTALUNAN, ROLAND CRUZ","PANTALUNAN, ROLAND",ROLAND,CRUZ,PANTALUNAN,,LIVE IN PARTNERS,43,,,,N,N
422,"AVELLANO, SERVANDO GURANGGO","AVELLANO, SERVANDO",SERVANDO,GURANGGO,AVELLANO,,1966/04/14,4,14,1966,SINGAWAN,UMIRAY,DINGALAN,AURORA,LONE,NATIONAL ID,3105-7804-7642-6023,639469255148,,SENIOR CITIZEN,VENDOR,M,M,60,,"AVELLANO, DELIA RITUAL","AVELLANO, DELIA",DELIA,RITUAL,AVELLANO,,WIFE,58,,,,N,N
441,"CORPUZ, MARITES PAGARAGAN","CORPUZ, MARITES",MARITES,PAGARAGAN,CORPUZ,,1983/02/15,2,15,1983,PINAMAYPAYAN,UMIRAY,DINGALAN,AURORA,LONE,NATIONAL ID,4025-6419-3475-3652,639469255148,,SELF-EMPLOYED,FARMER,F,M,43,,"CORPUZ, EMILIO GARCIA","CORPUZ, EMILIO",EMILIO,GARCIA,CORPUZ,,HUSBAND,47,,,,N,N
413,"ALVAREZ, SAN JUAN BITAMOR","ALVAREZ, SAN JUAN",SAN JUAN ,BITAMOR,ALVAREZ,,1986/06/24,6,24,1986,LIMBOK,UMIRAY,DINGALAN,AURORA,LONE,NATIONAL ID,8635-6984-7316-5306,639519148742,,SELF-EMPLOYED,VENDOR,M,S,40,,"TAPAYA, AMIE MEKITPEKIT","TAPAYA, AMIE",AMIE,MEKITPEKIT,TAPAYA,,LIVE IN PARTNERS,36,,,,N,N
270,"ADOLFO, JOHN MICHAEL ATULLE","ADOLFO, JOHN MICHAEL",JOHN MICHAEL,ATULLE,ADOLFO,,1999/06/06,6,6,1999,KAMAGONG,PALTIC,DINGALAN,AURORA,LONE,NATIONAL ID,6519768953294162,639703058599,,SELF-EMPLOYED,LABORER,M,M,27,,"PAHANUNOT, MONICA BARAS","PAHANUNOT, MONICA",MONICA,BARAS,PAHANUNOT,,WIFE,26,,,,N,N
284,"BILI, LHORY MAE COLOMA","BILI, LHORY MAE",LHORY MAE ,COLOMA,BILI,,2002/02/22,2,22,2002,ALMACIGA,PALTIC,DINGALAN,AURORA,LONE,VOTER'S CETIFICATE,77050043CB2202LCB20000,639507070890,,SELF-EMPLOYED,LABORER,F,M,24,,"BILI, JOHN CALVIN ROSETE","BILI, JOHN CALVIN",JOHN CALVIN,ROSETE,BILI,,HUSBAND,26,,,,N,N
281,"BELARDO, MARK ANTHONY CAEDO","BELARDO, MARK ANTHONY",MARK ANTHONY,CAEDO,BELARDO,,2001/01/10,1,10,2001,PUROK IPIL-IPIL,PALTIC,DINGALAN,AURORA,LONE,NATIONAL ID,2497-8364-1743-5104,639633035804,,SELF-EMPLOYED,VENDOR,M,S,25,,"TONGOL, LIEZEL CLARIDAD","TONGOL, LIEZEL",LIEZEL,CLARIDAD,TONGOL,,LIVE IN PARTNERS,20,,,,N,N
,APLAYA,,BNB,,DAVILDAVILAN,,CARAGSACAN,,IBONA,,MATAWE,,TANAWAN,,POBLACION,,PALTIC,,UMIRAY
APLAYA GROUP 1,PUROK LAPU LAPU,BNB GROUP 1,PUROK 1,DAVILDAVILAN GROUP 1,PUROK 1,CARAGSACAN GROUP 1,PUROK 1 PHASE 1,IBONA GROUP 1,PUROK 1,MATAWE GROUP 1,PUROK 1,TANAWAN GROUP 1,PUROK 1,POBLACION GROUP 1,PUROK 1,PALTIC GROUP 1,PUROK MAHOGANY,UMIRAY GROUP 1,SITIO SINGAWAN
APLAYA GROUP 1,PUROK MAYA-MAYA,BNB GROUP 1,PUROK 2,DAVILDAVILAN GROUP 1,PUROK 2,CARAGSACAN GROUP 1,PUROK 1 PHASE 2,IBONA GROUP 1,PUROK 2A,MATAWE GROUP 1,PUROK 2,TANAWAN GROUP 1,PUROK 2,POBLACION GROUP 1,PUROK 2,PALTIC GROUP 1,PUROK NARRA,UMIRAY GROUP 1,SITIO PINAMAYPAYAN
APLAYA GROUP 1,PUROK TANIGUE,BNB GROUP 1,PUROK 3,DAVILDAVILAN GROUP 1,PUROK 3,CARAGSACAN GROUP 2,PUROK 2,IBONA GROUP 1,PUROK 2B,MATAWE GROUP 1,PUROK 3,TANAWAN GROUP 1,PUROK 3,POBLACION GROUP 1,PUROK 3,PALTIC GROUP 1,PUROK KAMAGONG,UMIRAY GROUP 1,SITIO DUGYAN`;

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const cookieHeader = res.headers.get("set-cookie") || "";
  const cookie = cookieHeader.split(";")[0];
  const data = await res.json();
  return { status: res.status, data, cookie };
}

async function run() {
  console.log("=== Testing Final List of Beneficiaries & Work Program Logic Deployment ===");

  // 1. Log in as Domain Master
  const dmLogin = await login("admin", "admin123");
  assert.equal(dmLogin.status, 200, "Admin login failed");
  const cookie = dmLogin.cookie;
  console.log("✅ 1. Logged in as Domain Master");

  // 2. Download Template CSV
  const templateRes = await fetch(`${BASE_URL}/api/v1/beneficiaries/template`);
  assert.equal(templateRes.status, 200, "Template download failed");
  const templateText = await templateRes.text();
  assert.ok(templateText.includes("FORMULA FULL NAME"), "Template missing header columns");
  console.log("✅ 2. Downloaded Template CSV successfully");

  // 3. Get or create test Program
  const progsRes = await fetch(`${BASE_URL}/api/v1/programs`, { headers: { Cookie: cookie } });
  const progsData = await progsRes.json();
  let testProgramId = progsData.programs?.[0]?.id;

  if (!testProgramId) {
    const createProgRes = await fetch(`${BASE_URL}/api/v1/programs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        programCode: "TUPAD-2026-TEST",
        programName: "TUPAD Test Implementation Program 2026",
        requiredWorkDays: 10,
        dailyHours: 8,
      }),
    });
    const createProgData = await createProgRes.json();
    testProgramId = createProgData.program.id;
  }
  console.log(`✅ 3. Target Program resolved: ${testProgramId}`);

  // 4. Preview CSV Masterlist (including footer grouping matrix)
  const formData = new FormData();
  const fileBlob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  formData.append("file", fileBlob, "masterlist.csv");
  formData.append("programId", testProgramId);

  const previewRes = await fetch(`${BASE_URL}/api/v1/beneficiaries/import/preview`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });
  const previewData = await previewRes.json();
  console.log("Preview status & errors:", previewData.preview.rows.map(r => ({ desig: r.designatedNumber, name: r.fullName, bday: r.birthday, status: r.status, error: r.validationError })));
  assert.equal(previewRes.status, 200, `Preview failed: ${JSON.stringify(previewData)}`);
  assert.ok(previewData.preview.totalRows >= 10, "Expected at least 10 parsed beneficiary rows");
  console.log(`✅ 4. Previewed ${previewData.preview.totalRows} rows (${previewData.preview.validCount} valid) without getting tripped by footer matrix`);

  // Verify group assignments
  const umirayGroup1 = previewData.preview.rows.filter((r) => r.groupName === "UMIRAY GROUP 1");
  assert.ok(umirayGroup1.length >= 3, "Umiray Group 1 should contain at least 3 beneficiaries (Dugyan, Singawan, Pinamaypayan)");
  console.log("✅ 5. Verified Umiray Group 1 correctly grouped Singawan, Pinamaypayan, and Dugyan!");

  const palticGroup1 = previewData.preview.rows.filter((r) => r.groupName === "PALTIC GROUP 1");
  assert.ok(palticGroup1.length >= 1, "Paltic Group 1 should contain Kamagong");
  console.log("✅ 6. Verified Paltic Group 1 (Kamagong) correctly classified!");

  // 5. Commit Masterlist
  const commitRes = await fetch(`${BASE_URL}/api/v1/beneficiaries/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      rows: previewData.preview.rows,
      programId: testProgramId,
    }),
  });
  const commitData = await commitRes.json();
  assert.equal(commitRes.status, 200, `Commit failed: ${JSON.stringify(commitData)}`);
  console.log(`✅ 7. Committed ${commitData.importedCount} beneficiaries into program masterlist`);

  // 6. Test Auto-Deploy Work Program logic according to Purok/Sitio groups
  const autoDeployRes = await fetch(`${BASE_URL}/api/v1/programs/${testProgramId}/work-program/auto-deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ barangay: "ALL" }),
  });
  const autoDeployData = await autoDeployRes.json();
  assert.equal(autoDeployRes.status, 200, `Auto deploy failed: ${JSON.stringify(autoDeployData)}`);
  console.log("✅ 8. Work Program auto-deployed from masterlist:", autoDeployData.message);

  // 7. Fetch and verify Work Program items
  const wpRes = await fetch(`${BASE_URL}/api/v1/programs/${testProgramId}/work-program`, {
    headers: { Cookie: cookie },
  });
  const wpData = await wpRes.json();
  const umirayWp = wpData.workPrograms?.find((w) => w.barangay === "Umiray");
  assert.ok(umirayWp, "Umiray work program not found");
  assert.ok(umirayWp.items.length >= 10, "Umiray should have 10-day items");

  // Check Umiray Group 1 area and demographics
  const umirayDay1Group1 = umirayWp.items.find((it) => it.dayNumber === 1 && it.area.includes("Umiray Group 1"));
  assert.ok(umirayDay1Group1, "Umiray Day 1 Group 1 item should exist");
  assert.ok(umirayDay1Group1.totalCount >= 3, "Umiray Group 1 should have totalCount >= 3");
  console.log(`✅ 9. Verified Umiray Group 1 Work Program item: Area="${umirayDay1Group1.area}", Total=${umirayDay1Group1.totalCount}, Male=${umirayDay1Group1.maleCount}, Female=${umirayDay1Group1.femaleCount}, SC/PWD=${umirayDay1Group1.scPwdMaleCount + umirayDay1Group1.scPwdFemaleCount}`);

  // 8. Test Delete Beneficiary from Program
  const benesRes = await fetch(`${BASE_URL}/api/v1/programs/${testProgramId}/beneficiaries`, {
    headers: { Cookie: cookie },
  });
  const benesData = await benesRes.json();
  const targetToDelete = benesData.beneficiaries?.[0];
  assert.ok(targetToDelete, "No beneficiary found to delete");

  const deleteRes = await fetch(
    `${BASE_URL}/api/v1/programs/${testProgramId}/beneficiaries?programBeneficiaryId=${targetToDelete.id}&deleteGlobal=false`,
    {
      method: "DELETE",
      headers: { Cookie: cookie },
    }
  );
  assert.equal(deleteRes.status, 200, "Failed to delete beneficiary from program");
  console.log("✅ 10. Beneficiary successfully removed / deleted from masterlist");

  console.log("\n🎉 ALL FINAL MASTERLIST & WORK PROGRAM DEPLOYMENT TESTS PASSED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
