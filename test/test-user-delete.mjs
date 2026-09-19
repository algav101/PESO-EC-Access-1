import { strict as assert } from "node:assert";

const BASE_URL = "http://localhost:3000";

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
  console.log("=== Testing User Deletion API and RBAC Safety Checks ===");

  // 1. Log in as Domain Master
  const dmLogin = await login("admin", "admin123");
  assert.equal(dmLogin.status, 200, "Domain Master login failed");
  const dmCookie = dmLogin.cookie;
  const dmUserId = dmLogin.data.user.id;
  console.log("✅ 1. Logged in as Domain Master:", dmLogin.data.user.username);

  // 2. Create a test user
  const tempUsername = `test_delete_${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: dmCookie,
    },
    body: JSON.stringify({
      username: tempUsername,
      password: "TestPassword123!",
      fullName: "Test Delete Account",
      email: "testdelete@dingalan.gov.ph",
      role: "TUPAD_COORDINATOR",
      assignedBarangay: "Paltic",
    }),
  });
  const createData = await createRes.json();
  assert.equal(createRes.status, 201, `Failed to create test user: ${JSON.stringify(createData)}`);
  const testUserId = createData.user.id;
  console.log(`✅ 2. Created temporary test user: @${tempUsername} (ID: ${testUserId})`);

  // 3. Verify user appears in users list with password
  const listRes = await fetch(`${BASE_URL}/api/v1/users`, {
    headers: { Cookie: dmCookie },
  });
  const listData = await listRes.json();
  const createdUser = listData.users.find((u) => u.id === testUserId);
  assert.ok(createdUser, "Created user not found in list");
  assert.equal(createdUser.plainPassword, "TestPassword123!", "Plain password not saved correctly");
  console.log("✅ 3. User found in list with plain password visible to Domain Master");

  // 4. Test protection: cannot delete primary @admin
  const deleteAdminRes = await fetch(`${BASE_URL}/api/v1/users?id=${dmUserId}`, {
    method: "DELETE",
    headers: { Cookie: dmCookie },
  });
  assert.equal(deleteAdminRes.status, 400, "Should reject deleting self / root admin");
  const deleteAdminData = await deleteAdminRes.json();
  console.log("✅ 4. Root admin / self-delete rejection verified:", deleteAdminData.error);

  // 5. Delete the temporary user as Domain Master
  const deleteRes = await fetch(`${BASE_URL}/api/v1/users?id=${testUserId}`, {
    method: "DELETE",
    headers: { Cookie: dmCookie },
  });
  assert.equal(deleteRes.status, 200, "Failed to delete test user");
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true, "Delete response success should be true");
  console.log("✅ 5. Temporary user successfully deleted by Domain Master:", deleteData.message);

  // 6. Verify user is no longer in users list
  const verifyListRes = await fetch(`${BASE_URL}/api/v1/users`, {
    headers: { Cookie: dmCookie },
  });
  const verifyListData = await verifyListRes.json();
  const deletedUserCheck = verifyListData.users.find((u) => u.id === testUserId);
  assert.equal(deletedUserCheck, undefined, "User should no longer exist in DB");
  console.log("✅ 6. Verified user is completely removed from list");

  // 7. Test PESO Admin can also delete a user
  const pesoAdminLogin = await login("peso_admin", "admin123");
  assert.equal(pesoAdminLogin.status, 200, "PESO Admin login failed");
  const pesoCookie = pesoAdminLogin.cookie;
  console.log("✅ 7. Logged in as PESO Admin");

  const tempUsername2 = `test_peso_delete_${Date.now()}`;
  const createRes2 = await fetch(`${BASE_URL}/api/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: pesoCookie,
    },
    body: JSON.stringify({
      username: tempUsername2,
      password: "TestPassword456!",
      fullName: "Test PESO Delete Account",
      email: "testpesodelete@dingalan.gov.ph",
      role: "TUPAD_ASSISTING_DOCUMENTOR",
      assignedBarangay: "Umiray",
    }),
  });
  const createData2 = await createRes2.json();
  const testUserId2 = createData2.user.id;
  console.log(`✅ 8. Created second temporary user: @${tempUsername2} (ID: ${testUserId2})`);

  const deleteRes2 = await fetch(`${BASE_URL}/api/v1/users?id=${testUserId2}`, {
    method: "DELETE",
    headers: { Cookie: pesoCookie },
  });
  assert.equal(deleteRes2.status, 200, "Failed to delete test user as PESO Admin");
  console.log("✅ 9. Second temporary user successfully deleted by PESO Admin");

  // 8. Test that a coordinator cannot delete users (RBAC check)
  const coordLogin = await login("peso_paltic", "PALTIC123");
  if (coordLogin.status === 200) {
    const coordCookie = coordLogin.cookie;
    const forbidRes = await fetch(`${BASE_URL}/api/v1/users?id=${dmUserId}`, {
      method: "DELETE",
      headers: { Cookie: coordCookie },
    });
    assert.equal(forbidRes.status, 403, "Coordinator should be forbidden from deleting users");
    console.log("✅ 10. RBAC verified: Non-admin Coordinator is forbidden (403) from deleting users");
  }

  console.log("\n🎉 ALL USER DELETION TESTS PASSED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
