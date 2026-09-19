const BASE_URL = "http://localhost:3000";

async function testAllRolesLogin() {
  console.log("=== Testing Authentication for All 6 Preset Role Categories ===\n");

  const testAccounts = [
    { role: "DOMAIN_MASTER", username: "admin", pass: "admin123" },
    { role: "PESO_ADMIN", username: "peso_admin", pass: "admin123" },
    { role: "PESO_STAFF", username: "pesostaff", pass: "Dingalan123!" },
    { role: "TUPAD_COORDINATOR", username: "peso_umiray1", pass: "UMIRAY123" },
    { role: "TUPAD_ASSISTING_DOCUMENTOR", username: "peso_paltic_doc", pass: "PALTIC123" },
    { role: "DOLE_COORDINATOR", username: "dolefoaurora_1", pass: "ALL BARANGAY123" },
  ];

  for (const acc of testAccounts) {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: acc.username, password: acc.pass }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Failed to login as [${acc.role}] @${acc.username}: ${err.error || res.status}`);
    }

    const data = await res.json();
    console.log(`✓ [${acc.role}] @${acc.username} -> Logged in as "${data.user.fullName}" (${data.user.role})`);
  }

  console.log("\n=== ALL 6 ROLES AUTHENTICATED SUCCESSFULLY! ===");
}

testAllRolesLogin().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
