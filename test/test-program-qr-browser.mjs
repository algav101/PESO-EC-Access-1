// Real application UI; every API call is mocked. No real camera, DB writes or payouts.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const calls = [], errors = [];
const programs = ["new", "old"].map((id) => ({ id, programCode: `TEST-${id.toUpperCase()}`, programName: `${id} synthetic program`, status: "ACTIVE", requiredWorkDays: 1, workDays: [{ id: `${id}-day`, programId: id, dayNumber: 1, workDate: "2026-11-04" }] }));
const roster = Array.from({ length: 600 }, (_, i) => ({ id: `new-pb-${i + 1}`, programId: "new", designatedNumber: String(i + 1), participationStatus: "ACTIVE", beneficiary: { id: `person-${i}`, fullName: `SYNTHETIC ${i + 1}`, barangay: "Aplaya", birthday: "1990-01-02" }, qrCodes: [] }));
let mode = "success";
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
  await context.addInitScript(() => { if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { throw new Error("Synthetic camera denied"); }; });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "test-admin", role: "PESO_ADMIN", fullName: "Synthetic Admin" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs });
    if (url.pathname === "/api/v1/qr/slots") return reply({ slots: [] });
    if (url.pathname.endsWith("/qr/generate")) {
      calls.push({ path: url.pathname, body: request.postDataJSON() });
      assert.ok(url.pathname.includes("/new/")); assert.equal(request.postDataJSON().forceRegenerate, false);
      return reply({ success: true, generatedCount: 78, message: "Added 78 missing QR codes: #523–#600. Existing QR codes and scan history were preserved." });
    }
    if (url.pathname.endsWith("/scan")) {
      const body = request.postDataJSON(); calls.push({ path: url.pathname, body });
      assert.equal(body.programId, "new", "every scanner must send the selected program");
      if (mode === "denied") return reply({ error: "Synthetic denied scan; no offline replay" }, 404);
      return reply({ success: true, message: "Synthetic scan complete", data: { programId: "new", programBeneficiaryId: "new-pb-113", qrId: "new-qr", designatedNumber: "113", fullName: "NEW ROSTER PERSON", barangay: "Aplaya", tableNumber: "Table 2", programName: "New synthetic program", status: "PRESENT", morningTimeIn: "2026-11-04T00:00:00Z", isDistributed: false } });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) throw new Error("Unexpected mocked write: " + url.pathname);
    if (url.pathname.endsWith("/monitoring")) return reply({ summary: { totalBeneficiaries: 600, totalOrientationScanned: 0, totalOrientationPending: 600, totalStubsAffirmed: 600, attendanceRate: 0 }, beneficiaries: [], barangays: [] });
    if (url.pathname.endsWith("/beneficiaries")) return reply({ beneficiaries: url.pathname.includes("/new/") ? roster : [] });
    if (url.pathname.match(/\/programs\/(new|old)$/)) return reply({ program: programs.find((p) => url.pathname.endsWith(p.id)) });
    if (url.pathname.endsWith("/work-program")) return reply({ workPrograms: [] });
    return reply({ beneficiaries: [], settings: [] });
  });
  await page.goto(base + "/stubs?programId=new", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Generate Designated QR for All" }).click();
  await page.getByRole("button", { name: "Add missing QR codes (kasama ang #523 pataas)" }).click();
  await page.getByRole("status").filter({ hasText: "Added 78 missing QR codes" }).waitFor();
  await page.screenshot({ path: "node_modules/.cache/program-qr-extension.png", fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = page.getByRole("heading", { name: "Generate Designated Work Area QR Codes" }).locator("../../..");
  const bounds = await panel.boundingBox();
  assert.ok(bounds.height <= 844 && bounds.y >= 0, "QR generation modal must fit mobile screen with scrolling");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(base + "/field/orientation", { waitUntil: "networkidle" });
  const selector = () => page.locator("select").filter({ has: page.locator('option[value="new"]') }).first();
  assert.equal(await selector().inputValue(), "new");
  await page.getByPlaceholder("e.g. 1, 45, or DGL-TUPAD-...").fill("113");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.getByText("NEW ROSTER PERSON", { exact: true }).waitFor();
  await selector().selectOption("old");
  await page.getByText("NEW ROSTER PERSON", { exact: true }).waitFor({ state: "hidden" });
  await selector().selectOption("new");
  mode = "denied";
  await page.getByPlaceholder("e.g. 1, 45, or DGL-TUPAD-...").fill("113");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.getByText("Synthetic denied scan; no offline replay", { exact: true }).waitFor();
  mode = "success";
  async function modalScan(button) {
    await page.getByRole("button", { name: button }).click();
    await page.getByRole("button", { name: "Manual Token Entry" }).click();
    await page.getByPlaceholder("e.g. TUPAD-DGL-ABC123-1-XYZ").fill("TUPAD-DGL-OLDOLD-113-12345678");
    await page.getByRole("button", { name: "Submit Token" }).click();
    await page.getByText("NEW ROSTER PERSON", { exact: true }).waitFor();
  }
  await page.goto(base + "/field/attendance", { waitUntil: "networkidle" });
  await modalScan(/SCAN QR FOR DAY/);
  assert.equal(calls.find((c) => c.path.includes("attendance/scan")).body.workDayId, "new-day");
  await page.goto(base + "/field/stub-distribution", { waitUntil: "networkidle" });
  await modalScan("SCAN FORMAT 1 STUB QR");
  await selector().selectOption("old");
  await page.getByText("NEW ROSTER PERSON", { exact: true }).waitFor({ state: "hidden" });
  await page.goto(base + "/field/payout", { waitUntil: "networkidle" });
  assert.equal(await page.getByLabel("TUPAD Program").inputValue(), "new");
  await modalScan("SCAN PAYOUT QR");
  await page.getByLabel("TUPAD Program").selectOption("old");
  await page.getByText("NEW ROSTER PERSON", { exact: true }).waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  assert.equal(calls.filter((c) => c.path.endsWith("/qr/generate")).length, 1);
  assert.equal(calls.filter((c) => c.path.endsWith("/scan")).length, 5);
  console.log("Program QR UI passed: 600-row missing-code action, selected program sent by all four scanners, current work day, payout program selector, stale results cleared and HTTP denial surfaced. All APIs mocked.");
} finally { await browser.close(); }
