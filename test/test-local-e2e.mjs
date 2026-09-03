import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runE2ETests() {
  console.log("================================================================================");
  console.log("🧪 RUNNING LOCAL END-TO-END AUTOMATED TEST SUITE FOR PESO DINGALAN TUPAD SYSTEM");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Check Server Health (with warm-up retry)
  // -------------------------------------------------------------------------
  console.log("[1] Checking Local Server & Database Health...");
  let healthOk = false;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/health`);
      if (res.status === 200) {
        const data = await res.json();
        if (data.database === "connected") {
          healthOk = true;
          break;
        }
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  assert(healthOk, "Local server and PostgreSQL database are healthy and connected");

  // -------------------------------------------------------------------------
  // 2. Check Landing Page HTML Render
  // -------------------------------------------------------------------------
  console.log("\n[2] Checking Landing Page Render (/)...");
  try {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    assert(res.status === 200, "Landing page responded with status 200");
    assert(html.includes("login-portal-badge.png"), "Landing page contains clickable MAEDUP! e-PESO access login button");
    assert(html.includes("TUPAD Application Status Inquiry"), "Landing page contains Application Status Inquiry section");
    assert(html.includes("PESO-Dingalan Public Message &amp; Inquiry Form") || html.includes("PESO-Dingalan Public Message"), "Landing page contains Public Message Form section");
    assert(html.includes("CAPTCHA"), "Landing page contains CAPTCHA Anti-Spam Security");
  } catch (err) {
    assert(false, `Landing page check failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 3. Test Public Status Inquiry API Scenarios
  // -------------------------------------------------------------------------
  console.log("\n[3] Testing Public Status Inquiry API Scenarios...");

  // Seed reference data
  await prisma.tupadApplicationRoster.deleteMany({});
  await prisma.tupadApplicationRoster.create({
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

  await prisma.tupadApplicationRoster.create({
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

  // Scenario A: Complete Application Queued
  try {
    const res = await fetch(`${BASE_URL}/api/v1/public/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastName: "DELA CRUZ", firstName: "JUAN", birthday: "05-14-1988" }),
    });
    const data = await res.json();
    assert(data.found === true, "Applicant JUAN DELA CRUZ was found");
    assert(data.isLackingDetails === false, "Application is verified as complete (no lacking data)");
    assert(
      data.message === "Maedup! Ang inyong aplikasyon ay kasalukuyang nakapila para susunod na batch ng TUPAD Beneficiary",
      "Matches verbatim queued Tagalog message"
    );
    assert(data.lastAvailment !== null && data.lastAvailment.adlNo !== undefined, "Displays past TUPAD availment ADL reference");
  } catch (err) {
    assert(false, `Inquiry Scenario A failed: ${err.message}`);
  }

  // Scenario B: Application with Lacking Details
  try {
    const res = await fetch(`${BASE_URL}/api/v1/public/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastName: "SANTOS", firstName: "MARIA" }),
    });
    const data = await res.json();
    assert(data.found === true, "Applicant MARIA SANTOS was found");
    assert(data.isLackingDetails === true, "Identified as having lacking details");
    assert(
      data.message === "Magtungo sa Tangapan ng PESO-Dingalan o di kaya ay magmessage sa ating System Message Inquiry Form para sa kalinawan ng kakulangan ng inyong aplikasyon",
      "Matches verbatim lacking details Tagalog message"
    );
    assert(data.lackingFields.length > 0, "Itemizes specific lacking fields for citizen guidance");
  } catch (err) {
    assert(false, `Inquiry Scenario B failed: ${err.message}`);
  }

  // Scenario C: Non-existent Applicant
  try {
    const res = await fetch(`${BASE_URL}/api/v1/public/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastName: "UNKNOWN_APPLICANT", firstName: "TEST" }),
    });
    const data = await res.json();
    assert(data.found === false, "Returns found: false for unregistered citizen");
    assert(
      data.message === "Paumanhin, ngunit wala pa sa ating Tangapan o System ang inyong Aplikasyon mangyaring Mag apply gamit ang ating PESO EC Access Tupad Application System",
      "Matches verbatim not-found Tagalog message"
    );
  } catch (err) {
    assert(false, `Inquiry Scenario C failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 4. Test Public Message Submission & CAPTCHA Verification
  // -------------------------------------------------------------------------
  console.log("\n[4] Testing Public Message Submission & Tracking...");

  // Scenario A: Failed CAPTCHA
  try {
    const res = await fetch(`${BASE_URL}/api/v1/public/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "INQUIRY",
        message: "Testing wrong captcha submission",
        senderName: "Test Citizen",
        senderContact: "09123456789",
        captchaAnswer: "999",
        captchaExpected: 15,
      }),
    });
    assert(res.status === 400, "Rejects submission when CAPTCHA is incorrect");
  } catch (err) {
    assert(false, `CAPTCHA rejection test failed: ${err.message}`);
  }

  // Scenario B: Successful Submission with Human Verification
  let createdTrackingCode = "";
  try {
    const res = await fetch(`${BASE_URL}/api/v1/public/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "SUGGESTION",
        subject: "Eco-Clean initiative suggestion",
        message: "Nais ko po magmungkahi ng karagdagang gloves at safety gear para sa mga TUPAD workers sa baybayin.",
        isAnonymous: true,
        senderName: "Maria Clara",
        senderContact: "09987654321",
        senderBarangay: "Aplaya",
        captchaAnswer: "15",
        captchaExpected: 15,
      }),
    });
    const data = await res.json();
    assert(res.status === 200, "Successfully accepted verified message submission");
    assert(data.trackingCode && data.trackingCode.startsWith("MSG-"), "Generated official tracking code format");
    createdTrackingCode = data.trackingCode;
  } catch (err) {
    assert(false, `Message submission test failed: ${err.message}`);
  }

  // Scenario C: Citizen Tracking Lookup
  if (createdTrackingCode) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/public/messages/${createdTrackingCode}`);
      const data = await res.json();
      assert(res.status === 200, "Citizen can look up ticket by tracking code");
      assert(data.message.senderName === "Anonymous Resident", "Masks name for public tracking when isAnonymous is true");
      assert(data.message.status === "UNREAD", "Ticket initial status is UNREAD");
    } catch (err) {
      assert(false, `Ticket lookup test failed: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 5. Test PESO Admin Management (Login & Inquiries & Applications)
  // -------------------------------------------------------------------------
  console.log("\n[5] Testing PESO Admin Portal & Management APIs...");

  let adminCookie = "";
  try {
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, "PESO Admin authentication succeeded");
    adminCookie = loginRes.headers.get("set-cookie") || "";
  } catch (err) {
    assert(false, `Admin login failed: ${err.message}`);
  }

  if (adminCookie) {
    // Admin list inquiries
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/inquiries`, {
        headers: { Cookie: adminCookie },
      });
      const data = await res.json();
      assert(res.status === 200, "Admin can retrieve inquiries inbox");
      assert(Array.isArray(data.messages) && data.messages.length > 0, "Retrieved submitted citizen messages");

      // Reply to citizen message
      const targetMsg = data.messages[0];
      const patchRes = await fetch(`${BASE_URL}/api/v1/admin/inquiries/${targetMsg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({
          adminReply: "Magandang araw! Naitataguyod na po ang pagbili ng karagdagang protective equipment para sa inyong barangay.",
          adminRemarks: "Coordinated with Municipal Supply Office",
          status: "REPLIED",
        }),
      });
      assert(patchRes.status === 200, "PESO Admin successfully posted reply to citizen inquiry");
    } catch (err) {
      assert(false, `Admin inquiry reply test failed: ${err.message}`);
    }

    // Admin download template
    try {
      const templateRes = await fetch(`${BASE_URL}/api/v1/applications/template`);
      assert(templateRes.status === 200, "Application roster Excel template endpoint is accessible");
      const contentType = templateRes.headers.get("content-type");
      assert(contentType.includes("spreadsheetml"), "Returns valid Excel (.xlsx) MIME type");
    } catch (err) {
      assert(false, `Template download test failed: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 6. Testing Online TUPAD Application & Dummy Logic Scenarios
  // -------------------------------------------------------------------------
  console.log("\n[6] Testing Online TUPAD Application Portal & Sandbox Submissions...");
  try {
    // 6a. Submit Complete Eligible Application
    const submitRes = await fetch(`${BASE_URL}/api/v1/public/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastName: "DELA CRUZ",
        firstName: "JUAN",
        middleName: "SANTOS",
        birthday: "1988-05-14",
        sex: "MALE",
        civilStatus: "MARRIED",
        contactNumber: "09123456789",
        streetSitio: "Centro",
        barangay: "Paltic",
        idPresented: "UMID",
        idNumber: "CRN-0111-2222-3333",
        is4ps: "N",
        isIp: "N",
        occupation: "CONSTRUCTION LABORER",
        monthlyIncome: "4500",
        dependentFullName: "MARIA DELA CRUZ",
        dependentAge: "34",
        dependentRelationship: "SPOUSE",
        remarks: "Online Application Test Submission",
      }),
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 200, "Online application submission endpoint responded with status 200");
    assert(submitData.applicationCode && submitData.applicationCode.startsWith("APP-"), "Generated unique application tracking code");
    assert(submitData.status === "QUEUED", "Complete application marked with status QUEUED");
    assert(submitData.message.includes("kasalukuyang nakapila"), "Returns queued approval confirmation message");

    // 6b. Submit Incomplete Application (Missing ID & Contact)
    const incompleteRes = await fetch(`${BASE_URL}/api/v1/public/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastName: "SANTOS",
        firstName: "MARIA",
        middleName: "GOMEZ",
        birthday: "1994-11-22",
        sex: "FEMALE",
        civilStatus: "SINGLE",
        contactNumber: "",
        streetSitio: "Purok 2",
        barangay: "Aplaya",
        idPresented: "",
        idNumber: "",
        is4ps: "N",
        isIp: "N",
        occupation: "HOUSEWIFE",
        monthlyIncome: "2000",
        dependentFullName: "",
        dependentAge: "",
        dependentRelationship: "",
      }),
    });
    const incompleteData = await incompleteRes.json();
    assert(incompleteRes.status === 200, "Incomplete submission recorded successfully");
    assert(incompleteData.status === "INCOMPLETE", "Incomplete application marked with status INCOMPLETE");
    assert(incompleteData.isLackingDetails === true, "Flags lacking details boolean");
    assert(incompleteData.lackingFields.length >= 3, "Itemizes missing requirements for applicant follow-up");
    assert(incompleteData.message.includes("Magtungo sa Tangapan ng PESO-Dingalan"), "Returns lacking details guidance notice");

    // 6c. Verify /apply page render
    const applyPageRes = await fetch(`${BASE_URL}/apply`);
    const applyHtml = await applyPageRes.text();
    assert(applyPageRes.status === 200, "Online application page (/apply) responded with status 200");
    assert(applyHtml.includes("Online TUPAD Application Portal"), "Contains portal header and title");
    assert(applyHtml.includes("Logic Planning &amp; Debugging Quick Autofill Sandbox") || applyHtml.includes("Quick Autofill Sandbox"), "Contains testing & logic planning sandbox dummy toolbar");
  } catch (err) {
    assert(false, `Online application test failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests()
  .catch((err) => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
