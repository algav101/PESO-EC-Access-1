import { signToken } from "../src/lib/auth.ts";

async function testApi() {
  console.log("=== Testing User Management APIs with Domain Master Token ===");
  
  const domainMasterToken = signToken({
    id: "admin-test-id",
    username: "admin",
    fullName: "PESO Dingalan Admin Officer",
    role: "DOMAIN_MASTER",
    assignedBarangay: null,
  });

  const pesoAdminToken = signToken({
    id: "peso-admin-id",
    username: "peso_admin_test",
    fullName: "PESO Administrator",
    role: "PESO_ADMIN",
    assignedBarangay: null,
  });

  console.log("Tokens generated successfully for DOMAIN_MASTER and PESO_ADMIN.");
}

testApi().catch(console.error);
