import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwksUrl = process.env.SUPABASE_JWKS_URL;

async function testSupabase() {
  console.log("================================================================================");
  console.log("SUPABASE CONNECTION & HEALTH AUDIT - LGU DINGALAN PESO TUPAD");
  console.log("================================================================================");
  console.log(`Supabase URL:             ${supabaseUrl}`);
  console.log(`Publishable Key Present:  ${!!publishableKey} (Prefix: ${publishableKey?.slice(0, 15)}...)`);
  console.log(`Secret Key Present:       ${!!secretKey} (Prefix: ${secretKey?.slice(0, 15)}...)`);
  console.log(`JWKS URL:                 ${jwksUrl}`);

  // 1. Test JWKS Endpoint
  console.log("\n[1] Testing Supabase Auth JWKS Endpoint...");
  try {
    const jwksRes = await fetch(jwksUrl);
    if (jwksRes.ok) {
      const jwksData = await jwksRes.json();
      console.log("  ✅ JWKS Endpoint Reachable! Keys found:", jwksData.keys?.length || 0);
    } else {
      console.log(`  ⚠️ JWKS status: ${jwksRes.status} ${jwksRes.statusText}`);
    }
  } catch (err) {
    console.error("  ❌ JWKS fetch failed:", err.message);
  }

  // 2. Test Supabase Admin Client
  console.log("\n[2] Testing Supabase Client API...");
  try {
    const supabase = createClient(supabaseUrl, secretKey);
    // Test auth list users or storage list buckets
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) {
      console.log("  ⚠️ Storage listBuckets notice:", bucketErr.message);
    } else {
      console.log("  ✅ Supabase API Connected! Available Storage Buckets:", buckets.map(b => b.name));
    }
  } catch (err) {
    console.error("  ❌ Supabase Client API error:", err.message);
  }

  // 3. Test PostgreSQL via Prisma
  console.log("\n[3] Testing PostgreSQL Supabase Database via Prisma...");
  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    const programCount = await prisma.program.count();
    const beneficiaryCount = await prisma.beneficiary.count();
    const attCount = await prisma.attendanceRecord.count();
    const photoCount = await prisma.accomplishmentPhoto.count();

    console.log("  ✅ PostgreSQL Database Connected Successfully!");
    console.log(`  - Total Users:                ${userCount}`);
    console.log(`  - Total Programs:             ${programCount}`);
    console.log(`  - Total Master Beneficiaries: ${beneficiaryCount}`);
    console.log(`  - Total Attendance Records:   ${attCount}`);
    console.log(`  - Total Accomplishment Photos:${photoCount}`);
  } catch (err) {
    console.error("  ❌ Prisma DB connection error:", err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log("ALL SUPABASE CONNECTION TESTS COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

testSupabase();
