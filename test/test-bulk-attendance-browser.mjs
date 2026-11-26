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
let authId = "test-admin";
const days = ["2026-11-19", "2026-11-20"].map((workDate, i) => ({ id: `bulk-day-${i + 1}`, programId: "bulk-ui", dayNumber: i + 1, workDate, status: "SCHEDULED" }));
const program = { id: "bulk-ui", programCode: "3RD BATCH TEST", programName: "Synthetic selected attendance", status: "ACTIVE", requiredWorkDays: 10, workDays: days };
const otherProgram = { ...program, id: "bulk-ui-other", programCode: "OTHER BATCH TEST" };
const roster = Array.from({ length: 7 }, (_, i) => ({ id: `bulk-ui-${i + 1}`, programId: program.id, designatedNumber: String(i + 1), participationStatus: "ACTIVE", tableNumber: "Table 1", beneficiary: { id: `person-${i}`, fullName: `BULK UI PERSON ${i + 1}`, birthday: "1990-01-02", barangay: "Aplaya", sitio: "Lapu-Lapu", beneficiaryNumber: `UI-${i}` }, qrCodes: [], stubDistributions: [{ status: "DISTRIBUTED" }], orientationAttendance: i === 2 ? [] : [{ status: "PRESENT" }], attendanceRecords: [], payouts: [] }));
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/api/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: authId, role: authRole, fullName: "Synthetic Admin" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs: [program, otherProgram] });
    if (url.pathname === "/api/v1/programs/bulk-ui") return reply({ program });
    if (url.pathname.endsWith("/beneficiaries")) return reply({ beneficiaries: url.pathname.includes("/bulk-ui-other/") ? [] : roster });
    if (url.pathname.endsWith("/attendance/bulk")) {
      const body = req.postDataJSON(); calls.push(body);
      assert.deepEqual(body.programBeneficiaryIds, ["bulk-ui-1", "bulk-ui-3", "bulk-ui-5"]);
      assert.equal(body.workDayId, days[1].id); assert.equal(body.targetDate, days[1].workDate); assert.equal(body.shiftMode, calls.length === 1 ? "AFTERNOON_IN" : "MORNING_OUT");
      const times = calls.length === 1 ? { "bulk-ui-1": "2026-11-20T04:37:12Z", "bulk-ui-5": "2026-11-20T04:58:00Z" } : { "bulk-ui-1": "2026-11-20T02:37:12Z", "bulk-ui-5": "2026-11-20T02:58:00Z" };
      const field = calls.length === 1 ? "afternoonTimeIn" : "morningTimeOut";
      for (const id of ["bulk-ui-1", "bulk-ui-5"]) {
        const person = roster.find((pb) => pb.id === id);
        person.attendanceRecords = [{ ...person.attendanceRecords[0], workDayId: days[1].id, attendanceDate: days[1].workDate, [field]: times[id], status: "PRESENT" }];
      }
      return reply({ success: true, updatedCount: 2, skippedCount: 1, slotLabel: calls.length === 1 ? "Afternoon Time-In (PM IN)" : "Morning Time-Out (AM OUT)", timeRangeLabel: calls.length === 1 ? "12:30–1:00 PM" : "10:30–11:00 AM", workDay: days[1], results: body.programBeneficiaryIds.map((id) => ({ programBeneficiaryId: id, designatedNumber: id.slice(-1), fullName: roster.find((pb) => pb.id === id).beneficiary.fullName, status: id === "bulk-ui-3" ? "SKIPPED" : "RECORDED", attendanceTime: times[id] || null, reason: id === "bulk-ui-3" ? "Orientation attendance must be verified first." : "" })) });
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
  assert.equal(await page.getByRole("button", { name: /Previous Selection/ }).count(), 0, "cancel must not replace attendance history");
  await page.getByRole("button", { name: "Attendance (3)", exact: true }).last().click();
  modal = page.getByRole("dialog", { name: "Attendance for Selected Beneficiaries" });
  await modal.getByLabel("Attendance Day").selectOption(days[1].id);
  for (const [slot, label] of [["MORNING_IN", "6:30–7:00 AM"], ["MORNING_OUT", "10:30–11:00 AM"], ["AFTERNOON_IN", "12:30–1:00 PM"], ["AFTERNOON_OUT", "4:30–5:00 PM"]]) {
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
  await modal.getByText("Attendance recorded · 12:37:12 PM (Philippine time)", { exact: true }).waitFor();
  await modal.getByText("Attendance recorded · 12:58:00 PM (Philippine time)", { exact: true }).waitFor();
  assert.equal(calls.length, 1); assert.equal(calls[0].remarks, "Synthetic multi-selection test");
  await modal.getByRole("button", { name: "Done", exact: true }).click();
  assert.equal(await row(1).locator('input[type="checkbox"]').isChecked(), false);
  assert.equal(await row(3).locator('input[type="checkbox"]').isChecked(), true, "skipped beneficiaries should stay selected for review");
  assert.equal(await row(5).locator('input[type="checkbox"]').isChecked(), false);
  assert.match(await row(1).innerText(), /1\s*\/\s*10 Days/);
  // Restore the exact previous group, replacing unrelated current selections.
  const previous = () => page.getByRole("button", { name: "Previous Selection (3)", exact: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await row(2).locator('input[type="checkbox"]').check();
  await previous().click();
  for (const number of [1, 3, 5]) assert.equal(await row(number).locator('input[type="checkbox"]').isChecked(), true);
  assert.equal(await row(2).locator('input[type="checkbox"]').isChecked(), false, "restore must not merge unrelated selected beneficiaries");
  assert.equal(calls.length, 1, "restoring selection must not record attendance automatically");
  await page.getByRole("button", { name: "Attendance (3)", exact: true }).last().click();
  modal = page.getByRole("dialog", { name: "Attendance for Selected Beneficiaries" });
  await modal.getByLabel("Attendance Day").selectOption(days[1].id);
  await modal.getByLabel("Attendance Shift").selectOption("MORNING_OUT");
  await modal.getByRole("button", { name: "Record Attendance (3)", exact: true }).click();
  await modal.getByRole("status").filter({ hasText: "2 recorded · 1 skipped" }).waitFor();
  await modal.getByRole("button", { name: "Previous Selection", exact: true }).click();
  await modal.waitFor({ state: "hidden" });
  assert.equal(calls.length, 2, "the next shift must use only the previous beneficiaries after explicit submission");
  await page.getByRole("button", { name: "Clear (3)", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  await previous().click();
  for (const number of [1, 3, 5]) assert.equal(await row(number).locator('input[type="checkbox"]').isChecked(), true, "previous attendance selection survives refresh in this tab");
  await page.screenshot({ path: "node_modules/.cache/bulk-attendance-previous-selection.png", animations: "disabled" });
  // Program and account boundaries must never restore another roster's group.
  await page.setViewportSize({ width: 1440, height: 1050 });
  const programSelect = page.locator("select").filter({ has: page.locator('option[value="bulk-ui-other"]') });
  await programSelect.selectOption(otherProgram.id);
  assert.equal(await page.getByRole("button", { name: /Previous Selection/ }).count(), 0);
  await programSelect.selectOption(program.id);
  await previous().waitFor();
  authId = "test-other-admin";
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("button", { name: /Previous Selection/ }).count(), 0, "another account must not inherit saved selection");
  authId = "test-admin";
  roster[0].participationStatus = "REPLACED";
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Previous Selection (2)", exact: true }).click();
  await page.getByRole("button", { name: "Attendance (2)", exact: true }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(calls.length, 2, "restoring a group must exclude inactive members without sending attendance");
  roster[0].participationStatus = "ACTIVE";
  await page.setViewportSize({ width: 1440, height: 1050 });
  for (const role of ["PESO_STAFF", "DOMAIN_MASTER", "DOLE_COORDINATOR"]) {
    authRole = role;
    await page.goto(`${base}/beneficiaries?programId=bulk-ui`, { waitUntil: "networkidle" });
    await row(1).locator('input[type="checkbox"]').check();
    const buttons = page.getByRole("button", { name: /^Attendance \(\d+\)$/ });
    if (["PESO_STAFF", "DOMAIN_MASTER"].includes(role)) {
      assert.ok(await buttons.count() > 0, `${role} must see Attendance`);
      await buttons.last().click();
      await page.getByRole("dialog", { name: "Attendance for Selected Beneficiaries" }).waitFor();
      await page.getByRole("button", { name: "Close attendance", exact: true }).click();
    } else {
      assert.equal(await buttons.count(), 0, `${role} must not see masterlist Attendance`);
      assert.equal(await page.getByRole("button", { name: /Previous Selection/ }).count(), 0, `${role} must not restore attendance groups`);
    }
  }
  assert.deepEqual(errors, []);
  console.log("Bulk attendance browser passed: multiple shifts, exact previous-selection restoration, skipped members retained, unrelated selections replaced, refresh persistence, program/account isolation, inactive members excluded, role checks and mobile modal. All APIs mocked.");
} finally { await browser.close(); }
