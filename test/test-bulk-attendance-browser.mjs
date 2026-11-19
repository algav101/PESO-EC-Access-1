// Real masterlist multi-selection and modal; all APIs mocked, no live attendance.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const calls = [], errors = [];
let authRole = "PESO_ADMIN";
const days = ["2026-11-19", "2026-11-20"].map((workDate, i) => ({ id: `bulk-day-${i + 1}`, programId: "bulk-ui", dayNumber: i + 1, workDate, status: "SCHEDULED" }));
const program = { id: "bulk-ui", programCode: "3RD BATCH TEST", programName: "Synthetic selected attendance", status: "ACTIVE", requiredWorkDays: 10, workDays: days };
const roster = Array.from({ length: 7 }, (_, i) => ({ id: `bulk-ui-${i + 1}`, programId: program.id, designatedNumber: String(i + 1), participationStatus: "ACTIVE", tableNumber: "Table 1", beneficiary: { id: `person-${i}`, fullName: `BULK UI PERSON ${i + 1}`, birthday: "1990-01-02", barangay: "Aplaya", sitio: "Lapu-Lapu", beneficiaryNumber: `UI-${i}` }, qrCodes: [], stubDistributions: [{ status: "DISTRIBUTED" }], orientationAttendance: i === 2 ? [] : [{ status: "PRESENT" }], attendanceRecords: [], payouts: [] }));
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/api/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "test-admin", role: authRole, fullName: "Synthetic Admin" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs: [program] });
    if (url.pathname === "/api/v1/programs/bulk-ui") return reply({ program });
    if (url.pathname.endsWith("/beneficiaries")) return reply({ beneficiaries: roster });
    if (url.pathname.endsWith("/attendance/bulk")) {
      const body = req.postDataJSON(); calls.push(body);
      assert.deepEqual(body.programBeneficiaryIds, ["bulk-ui-1", "bulk-ui-3", "bulk-ui-5"]);
      assert.equal(body.workDayId, days[1].id); assert.equal(body.targetDate, days[1].workDate); assert.equal(body.shiftMode, "AFTERNOON_IN");
      for (const id of ["bulk-ui-1", "bulk-ui-5"]) roster.find((pb) => pb.id === id).attendanceRecords = [{ workDayId: days[1].id, attendanceDate: days[1].workDate, afternoonTimeIn: "2026-11-20T05:00:00Z", status: "PRESENT" }];
      return reply({ success: true, updatedCount: 2, skippedCount: 1, slotLabel: "Afternoon Time-In (PM IN)", fixedTimeLabel: "1:00 PM", workDay: days[1], results: body.programBeneficiaryIds.map((id) => ({ programBeneficiaryId: id, designatedNumber: id.slice(-1), fullName: roster.find((pb) => pb.id === id).beneficiary.fullName, status: id === "bulk-ui-3" ? "SKIPPED" : "RECORDED", reason: id === "bulk-ui-3" ? "Orientation attendance must be verified first." : "" })) });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) throw new Error("Unexpected mocked mutation " + url.pathname);
    if (url.pathname.endsWith("/qr/slots")) return reply({ slots: [] });
    return reply({ settings: [], workPrograms: [] });
  });
  await page.goto(`${base}/beneficiaries?programId=bulk-ui`, { waitUntil: "networkidle" });
  const row = (number) => page.locator("tbody tr").filter({ hasText: `BULK UI PERSON ${number}` });
  for (const number of [1, 3, 5]) await row(number).locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Attendance (3)", exact: true }).last().click();
  let modal = page.getByRole("dialog", { name: "Attendance for Selected Beneficiaries" });
  await modal.getByLabel("Attendance Day").selectOption(days[1].id);
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(calls.length, 0, "cancel must not record attendance");
  await page.getByRole("button", { name: "Attendance (3)", exact: true }).last().click();
  modal = page.getByRole("dialog", { name: "Attendance for Selected Beneficiaries" });
  await modal.getByLabel("Attendance Day").selectOption(days[1].id);
  for (const [slot, label] of [["MORNING_IN", "7:00 AM"], ["MORNING_OUT", "11:00 AM"], ["AFTERNOON_IN", "1:00 PM"], ["AFTERNOON_OUT", "5:00 PM"]]) {
    await modal.getByLabel("Attendance Shift").selectOption(slot);
    assert.match(await modal.getByTestId("masterlist-attendance-time").innerText(), new RegExp(`2026-11-20.*${label}`));
  }
  await modal.getByLabel("Attendance Shift").selectOption("AFTERNOON_IN");
  await modal.getByLabel("Remarks (Optional)").fill("Synthetic multi-selection test");
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await modal.boundingBox(); assert.ok(bounds.width <= 390 && bounds.height <= 844 && bounds.y >= 0, "modal must fit mobile screen");
  fs.mkdirSync("node_modules/.cache", { recursive: true });
  await page.screenshot({ path: "node_modules/.cache/bulk-attendance-mobile.png", animations: "disabled" });
  await modal.getByRole("button", { name: "Record Attendance (3)", exact: true }).click();
  await modal.getByRole("status").filter({ hasText: "2 recorded · 1 skipped" }).waitFor();
  await modal.getByText("Orientation attendance must be verified first.", { exact: true }).waitFor();
  assert.equal(calls.length, 1); assert.equal(calls[0].remarks, "Synthetic multi-selection test");
  await modal.getByRole("button", { name: "Done", exact: true }).click();
  assert.equal(await row(1).locator('input[type="checkbox"]').isChecked(), false);
  assert.equal(await row(3).locator('input[type="checkbox"]').isChecked(), true, "skipped beneficiaries should stay selected for review");
  assert.equal(await row(5).locator('input[type="checkbox"]').isChecked(), false);
  assert.match(await row(1).innerText(), /1\s*\/\s*10 Days/);
  await page.setViewportSize({ width: 1440, height: 1050 });
  for (const role of ["PESO_STAFF", "DOMAIN_MASTER", "DOLE_COORDINATOR"]) {
    authRole = role;
    await page.goto(`${base}/beneficiaries?programId=bulk-ui`, { waitUntil: "networkidle" });
    await row(1).locator('input[type="checkbox"]').check();
    const buttons = page.getByRole("button", { name: /^Attendance \(\d+\)$/ });
    if (role === "PESO_STAFF") {
      assert.ok(await buttons.count() > 0, "PESO Staff must see Attendance");
      await buttons.last().click();
      await page.getByRole("dialog", { name: "Attendance for Selected Beneficiaries" }).waitFor();
      await page.getByRole("button", { name: "Close attendance", exact: true }).click();
    } else assert.equal(await buttons.count(), 0, `${role} must not see masterlist Attendance`);
  }
  assert.deepEqual(errors, []);
  console.log("Bulk attendance browser passed: select 3 beneficiaries, cancel without writes, choose date/shift, one save, recorded/skipped results, masterlist refresh, preserved skipped selection and mobile modal. All APIs mocked.");
} finally { await browser.close(); }
