// Real scanner UI and real QR image decoding; APIs mocked, no live records touched.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const programs = ["A", "B", "C"].map((id) => ({ id, programCode: `WP-${id}`, programName: `Work Program ${id}`, status: "ACTIVE", requiredWorkDays: 1, workDays: [{ id: `day-${id}`, programId: id, dayNumber: 1, workDate: "2026-11-04" }] }));
const tokens = Object.fromEntries(programs.map((p, i) => [p.id, `TUPAD-V2-1-${String(i + 1).repeat(48)}`]));
const calls = [], errors = [];
let failSequence = false;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
  await context.addInitScript(() => { if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { throw new Error("Synthetic camera unavailable"); }; });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => errors.push(error.message));
  const identity = (id) => ({ qrId: `qr-${id}`, version: 2, programId: id, programCode: `WP-${id}`, programName: `Work Program ${id}`, programBeneficiaryId: `pb-${id}`, beneficiaryId: `person-${id}`, designatedNumber: "001", fullName: `MASTERLIST PERSON ${id}`, verificationStatus: "VERIFIED", verifiedAt: "2026-11-19T01:00:00Z" });
  await page.route("**/api/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "test-admin", role: "PESO_ADMIN", fullName: "Synthetic Admin" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs });
    if (url.pathname === "/api/v1/qr/slots") return reply({ slots: [] });
    if (url.pathname.endsWith("/scan")) {
      const body = req.postDataJSON(); calls.push({ path: url.pathname, body });
      const id = Object.keys(tokens).find((key) => body.qrToken.includes(tokens[key]));
      if (!id) return reply({ error: body.qrToken === "001" ? "AMBIGUOUS QR: use a registered program-specific QR." : "UNKNOWN QR: Walang na-record." }, body.qrToken === "001" ? 409 : 404);
      const detected = identity(id);
      if (failSequence) return reply({ error: "SEQUENCE BLOCKED: Complete orientation in detected program.", detected }, 400);
      if (url.pathname.includes("payout") && !body.isLookupOnly) {
        assert.equal(body.programId, id); assert.equal(body.programBeneficiaryId, `pb-${id}`);
      } else assert.equal(body.autoDetect, true, "scanner must request automatic registered identity detection");
      return reply({ success: true, detected, message: "Synthetic scan complete", data: { ...detected, barangay: "Aplaya", tableNumber: "Table 1", isDistributed: false, status: "PRESENT", dayNumber: 1, workDate: "2026-11-04" } });
    }
    if (url.pathname.endsWith("/verify-birthday")) {
      const body = req.postDataJSON(); calls.push({ path: url.pathname, body });
      assert.equal(body.programId, "C"); assert.equal(body.programBeneficiaryId, "pb-C"); assert.ok(body.qrToken.includes(tokens.C));
      return reply({ success: true, data: { ...identity("C"), barangay: "Aplaya", tableNumber: "Table 1" } });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) throw new Error("Unexpected write " + url.pathname);
    if (url.pathname.endsWith("/monitoring")) return reply({ summary: { totalBeneficiaries: 1, totalOrientationScanned: 0, totalOrientationPending: 1, totalStubsAffirmed: 0, attendanceRate: 0 }, beneficiaries: [], barangays: [] });
    if (url.pathname.endsWith("/beneficiaries")) return reply({ beneficiaries: [] });
    if (url.pathname.endsWith("/work-program")) return reply({ workPrograms: [] });
    if (/\/programs\/[ABC]$/.test(url.pathname)) return reply({ program: programs.find((p) => url.pathname.endsWith(p.id)) });
    return reply({ settings: [] });
  });
  async function scan(button, token, upload = false) {
    await page.getByRole("button", { name: button }).click();
    if (upload) {
      const buffer = await require("qrcode").toBuffer(token, { width: 700, margin: 4 });
      await page.locator('input[type="file"][accept="image/*"]:not([capture])').setInputFiles({ name: "program-c-card-001.png", mimeType: "image/png", buffer });
    } else {
      await page.getByRole("button", { name: "Manual Token Entry" }).click();
      await page.getByPlaceholder("e.g. TUPAD-DGL-ABC123-1-XYZ").fill(token);
      await page.getByRole("button", { name: "Submit Token" }).click();
    }
  }
  const panel = () => page.getByTestId("detected-qr-identity");
  for (const [stage, button] of [["attendance", /SCAN QR FOR DAY/], ["orientation", "LAUNCH CAMERA QR SCANNER"], ["stub-distribution", "SCAN FORMAT 1 STUB QR"], ["payout", "SCAN PAYOUT QR"]]) {
    await page.goto(`${base}/field/${stage}?programId=A`, { waitUntil: "networkidle" });
    const select = page.locator("select").filter({ has: page.locator('option[value="A"]') }).first();
    assert.equal(await select.inputValue(), "A");
    await scan(button, `https://synthetic.test/my-assignment?token=${tokens.C}`, stage === "attendance");
    await panel().getByText("MASTERLIST PERSON C", { exact: true }).waitFor();
    assert.match(await panel().innerText(), /WP-C.*Work Program C/);
    assert.match(await panel().innerText(), /Work Program ID: C/);
    assert.equal(await select.inputValue(), "A", "displayed monitoring context may remain A while the scanned operation follows C");
    if (stage === "stub-distribution") {
      await page.getByPlaceholder("MM-DD-YYYY (e.g. 08-15-1987)").fill("01021990");
      await page.getByRole("button", { name: "Confirm Stub Receipt & Orientation Attendance" }).click();
      await page.getByText(/Beneficiary Birthday Confirmed/).waitFor();
    }
    if (stage === "payout") {
      await page.getByRole("button", { name: "Confirm Payout", exact: true }).click();
      await page.getByText("Synthetic scan complete", { exact: true }).waitFor();
    }
  }
  await page.goto(`${base}/field/orientation?programId=A`, { waitUntil: "networkidle" });
  for (const id of ["A", "B", "C"]) {
    await scan("LAUNCH CAMERA QR SCANNER", tokens[id]);
    await panel().getByText(`MASTERLIST PERSON ${id}`, { exact: true }).waitFor();
  }
  await page.getByPlaceholder("e.g. 1, 45, or DGL-TUPAD-...").fill("001");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.getByText("AMBIGUOUS QR: use a registered program-specific QR.", { exact: true }).waitFor();
  assert.equal(await panel().count(), 0, "rejected ambiguous QR must clear the preceding identity");
  failSequence = true;
  await scan("LAUNCH CAMERA QR SCANNER", tokens.B);
  await panel().getByText("MASTERLIST PERSON B", { exact: true }).waitFor();
  await page.getByText("SEQUENCE BLOCKED: Complete orientation in detected program.", { exact: true }).waitFor();
  failSequence = false;
  await scan("LAUNCH CAMERA QR SCANNER", "UNKNOWN-CARD");
  await page.getByText("UNKNOWN QR: Walang na-record.", { exact: true }).waitFor();
  assert.equal(await panel().count(), 0);
  // No selection: registered QR scanning remains usable.
  const select = page.locator("select").filter({ has: page.locator('option[value="A"]') }).first();
  await select.selectOption("");
  await scan("LAUNCH CAMERA QR SCANNER", tokens.C);
  await panel().getByText("MASTERLIST PERSON C", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await panel().scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), "detected identity must fit mobile width");
  fs.mkdirSync("node_modules/.cache", { recursive: true });
  await page.screenshot({ path: "node_modules/.cache/auto-qr-detection-mobile.png" });
  assert.deepEqual(errors, []);
  assert.ok(calls.some((c) => c.path.endsWith("verify-birthday") && c.body.programId === "C"));
  console.log("Automatic QR browser tests passed: actual QR PNG upload, all four scanners detect program C while A is displayed, A/B/C identical #001, correct birthday/payout confirmations, unknown/ambiguous/sequence errors, no-selection scan, mobile layout. All APIs mocked.");
} finally { await browser.close(); }
