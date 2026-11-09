// UI integration: every API is intercepted; no real credentials or database writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 } });
const errors = [], calls = new Map();
const program = { id: "synthetic-program", programCode: "SYNTHETIC", programName: "Synthetic Work Program", status: "ACTIVE", workDays: [{ id: "synthetic-day", dayNumber: 1, workDate: "2026-11-09", status: "ACTIVE" }] };
let confirmed = false;
const bene = () => ({ id: "synthetic-pb", programId: program.id, designatedNumber: "248", fullName: confirmed ? "SYNTHETIC UPDATED PERSON" : "SYNTHETIC PERSON", barangay: "Ibona", tableNumber: "Table 3", status: confirmed ? "CONFIRMED" : "PENDING", isStubAffirmed: confirmed, isOrientationScanned: confirmed });
await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
await context.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, route => route.abort());
await context.route("**/api/**", async route => {
  const request = route.request(), path = new URL(request.url()).pathname;
  calls.set(path, (calls.get(path) || 0) + 1);
  if (request.method() !== "GET") {
    assert.equal(path, "/api/v1/sync/push", "Unexpected write from the test UI");
    return route.fulfill({ status: 401, json: { error: "Synthetic expired session" } });
  }
  let data = {};
  if (path === "/api/v1/auth/me") data = { authenticated: true, user: { id: "synthetic-admin", fullName: "Synthetic Admin", username: "synthetic", role: "DOMAIN_MASTER" } };
  else if (path === "/api/v1/programs") data = { programs: [program] };
  else if (path === "/api/v1/health") data = { status: "ok" };
  else if (path.endsWith("/work-program")) data = { workPrograms: [] };
  else if (path === "/api/v1/qr/slots") data = { slots: [] };
  else if (path.endsWith("/beneficiaries")) data = { beneficiaries: [{ ...bene(), beneficiaryId: "synthetic-bene", beneficiary: { fullName: bene().fullName, birthday: "1990-01-01", barangay: "Ibona" }, stubDistributions: confirmed ? [{ status: "DISTRIBUTED" }] : [], orientationAttendance: [], attendanceRecords: [] }] };
  else if (path.endsWith("/matrix")) data = { program, beneficiaries: [{ ...bene(), beneficiary: { fullName: bene().fullName, barangay: "Ibona" }, attendanceRecords: [] }] };
  else if (path === "/api/v1/photos") data = { photos: [] };
  else if (path.endsWith("/monitoring")) data = {
    program, beneficiaries: [bene()], barangays: [],
    summary: { totalBeneficiaries: 1, totalDistributed: +confirmed, totalConfirmed: +confirmed, totalPending: +!confirmed, totalFlaggedReplacement: 0, totalPendingApprovals: 0, distributionRate: confirmed ? "100" : "0", confirmationRate: confirmed ? "100" : "0", totalStubsAffirmed: +confirmed, totalOrientationScanned: +confirmed, totalOrientationPending: 0, attendanceRate: confirmed ? "100" : "0" },
  };
  return route.fulfill({ json: data });
});
try {
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install();
  for (const [path, api, interval, tab] of [
    ["/field/stub-distribution?tab=monitoring", "/api/v1/stub-distribution/monitoring", 16000],
    ["/field/orientation", "/api/v1/orientation/monitoring", 11000, "Live Monitoring Scheme"],
    ["/attendance/matrix", "/api/v1/programs/synthetic-program/matrix", 31000],
    ["/field/photos", "/api/v1/photos", 31000],
  ]) {
    confirmed = false;
    await page.goto(base + path, { waitUntil: "networkidle" });
    if (tab) await page.getByRole("button", { name: tab }).click();
    if (path.includes("stub-distribution")) await page.locator("td").getByText("Pending (Uninformed)", { exact: true }).waitFor();
    const before = calls.get(api) || 0;
    confirmed = true; // Simulate a write from another phone: no DOM event on this admin's browser.
    await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === api),
      page.clock.fastForward(interval),
    ]);
    assert.ok((calls.get(api) || 0) > before, path + " must poll without same-window events");
    if (path.includes("stub-distribution")) {
      await page.getByText("✓ Confirmed", { exact: true }).waitFor();
      await page.getByText("SYNTHETIC UPDATED PERSON", { exact: true }).waitFor();
    }
    const count = calls.get(api) || 0;
    await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === api),
      page.evaluate(() => window.dispatchEvent(new Event("focus"))),
    ]);
    assert.ok((calls.get(api) || 0) > count, path + " must refresh on focus");
    console.log("PASS: " + path + " refreshes on polling and focus");
  }
  // The provider must not call failed uploads synchronized, and must expose conflicts/in-flight rows.
  await page.goto(base + "/sync", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open("TupadOfflineDB_Dingalan"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const transaction = db.transaction("offlineQueue", "readwrite");
    for (const [i, status] of ["PENDING", "CONFLICT", "SYNCING"].entries()) transaction.objectStore("offlineQueue").add({ clientTransactionId: "SYNTHETIC-UI-" + i, deviceId: "synthetic", entityType: "STUB_DISTRIBUTION", operation: "CREATE", payload: { programId: "synthetic-program", programBeneficiaryId: "synthetic-pb" }, status, retryCount: 0, createdAt: new Date().toISOString(), syncStartedAt: new Date().toISOString() });
    await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); });
    db.close();
    window.dispatchEvent(new CustomEvent("tupad-queue-updated"));
  });
  await page.getByText("3 unresolved on this device.", { exact: true }).waitFor();
  await context.setOffline(true);
  await context.setOffline(false);
  await page.getByText(/Upload needs an authorized login/).waitFor();
  console.log("PASS: reconnect automatically attempts upload and exposes expired login without losing records");
  await page.getByRole("button", { name: "Sync Queue (3)" }).click();
  await page.getByText(/Upload needs an authorized login/).waitFor();
  assert.equal(await page.getByText(/Queue is clear/).count(), 0);
  assert.equal(await page.getByText("SYNTHETIC-UI-0", { exact: true }).count(), 1);
  console.log("PASS: provider reports auth failure honestly; failed, conflict and active uploads remain visible");
  assert.deepEqual(errors, [], "No browser runtime errors");
} finally { await context.close(); await browser.close(); }
