// Actual Edit Program modal + attendance page in two tabs. All APIs are mocked.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const oldDates = ["16", "17", "18", "19", "20", "21", "23", "24", "25", "26"].map((d) => `2026-11-${d}`);
const newDates = ["19", "20", "21", "23", "24", "25", "26", "27", "28", "30"].map((d) => `2026-11-${d}`);
let startDate = "2026-11-16", scannedBody, saved = false;
const errors = [];
const program = () => ({ id: "date-program", programCode: "3RD BATCH TEST", programName: "Synthetic date program", startDate, endDate: "2026-11-30", status: "ACTIVE", requiredWorkDays: 10, dailyHours: 8, municipality: "Dingalan", province: "Aurora", beneficiaryCount: 1, programBarangays: [], tableRules: [],
  _count: { programBeneficiaries: 1, qrCodes: 1, attendanceRecords: 0, orientationAttendance: 0, beneficiaryReplacements: 0, accomplishmentPhotos: 0, payouts: 0, tupadWorkPrograms: 0 },
  workDays: (saved ? newDates : oldDates).map((workDate, i) => ({ id: `date-day-${i + 1}`, programId: "date-program", dayNumber: i + 1, workDate, status: "SCHEDULED" })) });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
  await context.addInitScript(() => {
    const RealDate = Date;
    window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ["2026-11-19T01:00:00Z"])); } static now() { return new RealDate("2026-11-19T01:00:00Z").getTime(); } };
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { throw new Error("Synthetic camera denied"); };
  });
  await context.route("**/api/**", async (route) => {
    const req = route.request(), url = new URL(req.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "test-admin", role: "PESO_ADMIN", fullName: "Synthetic Admin" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs: [program()] });
    if (url.pathname === "/api/v1/programs/date-program") {
      if (req.method() === "PATCH") { assert.equal(req.postDataJSON().startDate, "2026-11-19"); startDate = "2026-11-19"; saved = true; }
      return reply({ success: true, program: program() });
    }
    if (url.pathname.endsWith("attendance/scan")) {
      scannedBody = req.postDataJSON();
      return reply({ success: true, message: "Synthetic attendance recorded", data: { fullName: "SYNTHETIC DATE PERSON", designatedNumber: "1", programId: "date-program", dayNumber: 1, workDate: scannedBody.targetDate } });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) throw new Error("Unexpected mocked write " + url.pathname);
    if (url.pathname.endsWith("/work-program")) return reply({ workPrograms: [] });
    if (url.pathname.endsWith("/beneficiaries")) return reply({ beneficiaries: [] });
    if (url.pathname.endsWith("/qr/slots")) return reply({ slots: [] });
    return reply({ settings: [], photos: [], replacements: [] });
  });
  const scanner = await context.newPage(); scanner.setDefaultTimeout(30000);
  scanner.on("pageerror", (e) => errors.push(e.message));
  await scanner.goto(`${base}/field/attendance?programId=date-program`, { waitUntil: "networkidle" });
  await scanner.getByText("Today is Day 4", { exact: true }).waitFor();
  const day = (number) => scanner.getByRole("button", { name: new RegExp(`^Day ${number}\\s+11-`) });
  await day(2).click();
  const refresh = scanner.waitForResponse((r) => new URL(r.url()).pathname === "/api/v1/programs");
  await scanner.evaluate(() => window.dispatchEvent(new Event("focus"))); await refresh;
  await scanner.waitForLoadState("networkidle");
  assert.match(await day(2).getAttribute("class"), /bg-gov-blue/, "unchanged refresh must preserve the manually selected day");
  const editor = await context.newPage(); editor.setDefaultTimeout(30000);
  editor.on("pageerror", (e) => errors.push(e.message));
  await editor.goto(`${base}/programs/date-program`, { waitUntil: "networkidle" });
  await editor.getByRole("button", { name: "Edit Program", exact: true }).click();
  await editor.getByText("Work Start Date", { exact: true }).locator("..").locator("input").fill("2026-11-19");
  await editor.getByRole("button", { name: "Save Program Updates", exact: true }).click();
  await editor.getByText("Program details successfully updated!", { exact: true }).waitFor();
  await scanner.bringToFront();
  await scanner.getByText("Today is Day 1", { exact: true }).waitFor();
  assert.match(await day(1).innerText(), /11-19/);
  assert.match(await day(10).innerText(), /11-30/);
  assert.match(await day(1).getAttribute("class"), /bg-gov-blue/, "changed schedule must select today's new Day 1");
  fs.mkdirSync("node_modules/.cache", { recursive: true });
  await scanner.screenshot({ path: "node_modules/.cache/program-start-date-attendance.png", animations: "disabled" });
  await scanner.getByRole("button", { name: /SCAN QR FOR DAY 1/ }).click();
  await scanner.getByRole("button", { name: "Manual Token Entry" }).click();
  await scanner.getByPlaceholder("e.g. TUPAD-DGL-ABC123-1-XYZ").fill("TUPAD-V2-1-" + "A".repeat(48));
  await scanner.getByRole("button", { name: "Submit Token" }).click();
  await scanner.getByText("SYNTHETIC DATE PERSON", { exact: true }).waitFor();
  assert.equal(scannedBody.workDayId, "date-day-1"); assert.equal(scannedBody.targetDate, "2026-11-19");
  assert.deepEqual(errors, []);
  console.log("Start-date browser test passed: real Edit Program save updates another open attendance tab without reload; Day 1 becomes November 19, today's selection and scan payload follow the edited date, unchanged refresh preserves manual day choice. All APIs mocked.");
} finally { await browser.close(); }
