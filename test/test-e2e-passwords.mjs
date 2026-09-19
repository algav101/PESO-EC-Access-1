const BASE_URL = "http://localhost:3000";

async function runE2EPasswordTests() {
  console.log("=================================================");
  console.log("  PESO EC ACCESS - PASSWORD VIEW E2E TEST SUITE  ");
  console.log("=================================================\n");

  // Step 1: Login as Domain Master
  console.log("1. Testing Domain Master Login (`admin` / `admin123`)...");
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const cookie = loginRes.headers.get("set-cookie");
  const loginData = await loginRes.json();
  console.log(`   ✓ Domain Master authenticated: ${loginData.user.fullName} (${loginData.user.role})`);
  console.log(`   ✓ Received authentication cookie.\n`);

  // Step 2: Fetch all users as Domain Master
  console.log("2. Testing User List API with Password Retrieval (`GET /api/v1/users`)...");
  const usersRes = await fetch(`${BASE_URL}/api/v1/users`, {
    headers: { Cookie: cookie },
  });

  if (!usersRes.ok) {
    throw new Error(`GET /api/v1/users failed with status ${usersRes.status}`);
  }

  const usersData = await usersRes.json();
  const users = usersData.users || [];
  console.log(`   ✓ Successfully retrieved ${users.length} accounts.`);

  let usersWithPlainPassword = 0;
  for (const u of users) {
    if (u.plainPassword && u.plainPassword.length > 0) {
      usersWithPlainPassword++;
    }
  }

  console.log(`   ✓ Accounts with viewable plaintext password: ${usersWithPlainPassword} / ${users.length}`);
  if (usersWithPlainPassword !== users.length) {
    console.warn(`   ⚠️ Warning: Some accounts did not have plainPassword populated.`);
  } else {
    console.log(`   ✓ 100% of accounts have active viewable passwords for Domain Master & PESO Admin!`);
  }

  console.log("\n   Sample Accounts Preview:");
  users.slice(0, 6).forEach((u) => {
    console.log(`   • [${u.role}] @${u.username} (${u.fullName}): Password="${u.plainPassword}" | Barangay="${u.assignedBarangay || 'Municipality'}"`);
  });

  // Step 3: Create a new single user with custom password
  const testUname = `test_coord_${Date.now()}`;
  const testPass = "TestSecret2026!";
  console.log(`\n3. Testing Single User Creation with Password View (` + testUname + `)...`);

  const createRes = await fetch(`${BASE_URL}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      username: testUname,
      password: testPass,
      fullName: "Test Coordinator Password View",
      email: `${testUname}@dingalan.gov.ph`,
      role: "TUPAD_COORDINATOR",
      assignedBarangay: "Paltic",
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Failed to create test user: ${err.error}`);
  }

  const createdData = await createRes.json();
  const createdUser = createdData.user;
  console.log(`   ✓ Created user: @${createdUser.username} with Password="${createdUser.plainPassword}"`);

  // Step 4: Login as the newly created user
  console.log(`\n4. Testing Login with Newly Created User Credentials...`);
  const userLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: testUname, password: testPass }),
  });

  if (!userLoginRes.ok) {
    throw new Error(`Failed to login as created user: ${userLoginRes.status}`);
  }
  const userLoginData = await userLoginRes.json();
  const userCookie = userLoginRes.headers.get("set-cookie");
  console.log(`   ✓ Successfully logged in as @${userLoginData.user.username}`);

  // Step 5: Verify non-admin CANNOT access User Management API
  console.log(`\n5. Verifying RBAC Security (Non-admin coordinator cannot view passwords)...`);
  const nonAdminRes = await fetch(`${BASE_URL}/api/v1/users`, {
    headers: { Cookie: userCookie },
  });
  console.log(`   ✓ Non-admin request status: ${nonAdminRes.status} (Expected: 403 Forbidden)`);
  if (nonAdminRes.status !== 403) {
    throw new Error(`Security breach: non-admin was able to query /api/v1/users!`);
  }

  // Step 6: Test Password Reset via PATCH /api/v1/users
  const newSecret = "UpdatedDingalan2026!";
  console.log(`\n6. Testing Password Reset via PATCH for @${testUname}...`);
  const patchRes = await fetch(`${BASE_URL}/api/v1/users`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      id: createdUser.id,
      password: newSecret,
    }),
  });

  if (!patchRes.ok) {
    throw new Error(`Failed to update password: ${patchRes.status}`);
  }
  const patchData = await patchRes.json();
  console.log(`   ✓ Updated user password in DB. New Plain Password="${patchData.user.plainPassword}"`);

  // Step 7: Test Login with Updated Password
  console.log(`\n7. Testing Login with Updated Password...`);
  const newLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: testUname, password: newSecret }),
  });

  if (!newLoginRes.ok) {
    throw new Error(`Login with new password failed`);
  }
  console.log(`   ✓ Successfully authenticated with new password!`);

  console.log("\n=================================================");
  console.log("  ALL TESTS PASSED WITH 100% SUCCESS!           ");
  console.log("=================================================\n");
}

runE2EPasswordTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
