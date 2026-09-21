import { format } from 'date-fns';

function validateDuration(targetSlot, record, now) {
  const MIN_WORK_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Hours (180 minutes)

  if (targetSlot === "MORNING_OUT" && !record?.morningTimeIn) {
    return {
      allowed: false,
      reason: "TIME_IN_REQUIRED",
      error: "Morning Time-In (AM IN) has not been recorded yet."
    };
  }

  if (targetSlot === "AFTERNOON_OUT" && !record?.afternoonTimeIn) {
    return {
      allowed: false,
      reason: "TIME_IN_REQUIRED",
      error: "Afternoon Time-In (PM IN) has not been recorded yet."
    };
  }

  if (targetSlot === "MORNING_OUT" && record?.morningTimeIn) {
    const amInDate = new Date(record.morningTimeIn);
    const diffMs = now.getTime() - amInDate.getTime();
    if (diffMs < MIN_WORK_DURATION_MS) {
      const remainingMs = MIN_WORK_DURATION_MS - Math.max(0, diffMs);
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      const elapsedMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
      const unlockTime = new Date(amInDate.getTime() + MIN_WORK_DURATION_MS);
      const amInTimeFormatted = format(amInDate, "hh:mm a");
      const unlockTimeFormatted = format(unlockTime, "hh:mm a");

      const remainingText =
        remainingMinutes >= 60
          ? `${Math.floor(remainingMinutes / 60)} hr ${remainingMinutes % 60} mins`
          : `${remainingMinutes} mins`;
      const elapsedText =
        elapsedMinutes >= 60
          ? `${Math.floor(elapsedMinutes / 60)} hr ${elapsedMinutes % 60} mins`
          : `${elapsedMinutes} mins`;

      return {
        allowed: false,
        reason: "MINIMUM_DURATION_NOT_MET",
        error: `TIME-OUT BLOCKED: Morning Time-Out (AM OUT) requires at least 3 hours of active work duration. AM IN was recorded at ${amInTimeFormatted} (elapsed: ${elapsedText}). Re-scanning AM OUT is allowed at or after ${unlockTimeFormatted} (${remainingText} remaining).`,
        remainingMinutes,
        unlockTimeFormatted
      };
    }
  }

  if (targetSlot === "AFTERNOON_OUT" && record?.afternoonTimeIn) {
    const pmInDate = new Date(record.afternoonTimeIn);
    const diffMs = now.getTime() - pmInDate.getTime();
    if (diffMs < MIN_WORK_DURATION_MS) {
      const remainingMs = MIN_WORK_DURATION_MS - Math.max(0, diffMs);
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      const elapsedMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
      const unlockTime = new Date(pmInDate.getTime() + MIN_WORK_DURATION_MS);
      const pmInTimeFormatted = format(pmInDate, "hh:mm a");
      const unlockTimeFormatted = format(unlockTime, "hh:mm a");

      const remainingText =
        remainingMinutes >= 60
          ? `${Math.floor(remainingMinutes / 60)} hr ${remainingMinutes % 60} mins`
          : `${remainingMinutes} mins`;
      const elapsedText =
        elapsedMinutes >= 60
          ? `${Math.floor(elapsedMinutes / 60)} hr ${elapsedMinutes % 60} mins`
          : `${elapsedMinutes} mins`;

      return {
        allowed: false,
        reason: "MINIMUM_DURATION_NOT_MET",
        error: `TIME-OUT BLOCKED: Afternoon Time-Out (PM OUT) requires at least 3 hours of active work duration. PM IN was recorded at ${pmInTimeFormatted} (elapsed: ${elapsedText}). Re-scanning PM OUT is allowed at or after ${unlockTimeFormatted} (${remainingText} remaining).`,
        remainingMinutes,
        unlockTimeFormatted
      };
    }
  }

  return { allowed: true };
}

function runTests() {
  console.log("================================================================================");
  console.log("TESTING 3-HOUR MINIMUM WORK DURATION VALIDATION SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  // Test 1: AM OUT scanned 1.5 hours after AM IN (Must be blocked)
  const amInTime = new Date("2026-09-21T08:00:00.000Z");
  const scanTime1 = new Date("2026-09-21T09:30:00.000Z"); // 1.5 hrs later
  const res1 = validateDuration("MORNING_OUT", { morningTimeIn: amInTime.toISOString() }, scanTime1);
  console.log("\n[Test 1] AM OUT scanned 1.5 hours after AM IN:");
  console.log("  Allowed:", res1.allowed, "| Reason:", res1.reason);
  console.log("  Message:", res1.error);
  if (!res1.allowed && res1.reason === "MINIMUM_DURATION_NOT_MET") {
    console.log("  ✅ PASS");
    passed++;
  } else {
    console.log("  ❌ FAIL");
    failed++;
  }

  // Test 2: AM OUT scanned 3.0 hours after AM IN (Must be allowed)
  const scanTime2 = new Date("2026-09-21T11:00:00.000Z"); // 3.0 hrs later
  const res2 = validateDuration("MORNING_OUT", { morningTimeIn: amInTime.toISOString() }, scanTime2);
  console.log("\n[Test 2] AM OUT scanned 3.0 hours after AM IN:");
  console.log("  Allowed:", res2.allowed);
  if (res2.allowed) {
    console.log("  ✅ PASS");
    passed++;
  } else {
    console.log("  ❌ FAIL");
    failed++;
  }

  // Test 3: PM OUT scanned 45 mins after PM IN (Must be blocked)
  const pmInTime = new Date("2026-09-21T13:00:00.000Z");
  const scanTime3 = new Date("2026-09-21T13:45:00.000Z"); // 45 mins later
  const res3 = validateDuration("AFTERNOON_OUT", { afternoonTimeIn: pmInTime.toISOString() }, scanTime3);
  console.log("\n[Test 3] PM OUT scanned 45 mins after PM IN:");
  console.log("  Allowed:", res3.allowed, "| Reason:", res3.reason);
  console.log("  Message:", res3.error);
  if (!res3.allowed && res3.reason === "MINIMUM_DURATION_NOT_MET") {
    console.log("  ✅ PASS");
    passed++;
  } else {
    console.log("  ❌ FAIL");
    failed++;
  }

  // Test 4: PM OUT scanned 3.5 hours after PM IN (Must be allowed)
  const scanTime4 = new Date("2026-09-21T16:30:00.000Z"); // 3.5 hrs later
  const res4 = validateDuration("AFTERNOON_OUT", { afternoonTimeIn: pmInTime.toISOString() }, scanTime4);
  console.log("\n[Test 4] PM OUT scanned 3.5 hours after PM IN:");
  console.log("  Allowed:", res4.allowed);
  if (res4.allowed) {
    console.log("  ✅ PASS");
    passed++;
  } else {
    console.log("  ❌ FAIL");
    failed++;
  }

  // Test 5: AM OUT scanned without prior AM IN (Must be blocked with TIME_IN_REQUIRED)
  const res5 = validateDuration("MORNING_OUT", {}, scanTime2);
  console.log("\n[Test 5] AM OUT scanned with NO prior AM IN:");
  console.log("  Allowed:", res5.allowed, "| Reason:", res5.reason);
  if (!res5.allowed && res5.reason === "TIME_IN_REQUIRED") {
    console.log("  ✅ PASS");
    passed++;
  } else {
    console.log("  ❌ FAIL");
    failed++;
  }

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================");
}

runTests();
