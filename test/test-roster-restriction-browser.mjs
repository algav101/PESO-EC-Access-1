// Browser checks with synthetic auth/roster data; every API request is intercepted.
// Preview POSTs are mocked. All other writes are blocked, including commit.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const program = { id: "synthetic-program", programCode: "TEST-ROSTER", programName: "Synthetic work program", status: "ACTIVE" };
const baseRow = { rowNumber: 1, designatedNumber: "1", fullName: "SYNTHETIC ACTIVE", birthday: "1990-01-02", birthdayPin: "0102", barangay: "Aplaya", sitio: "Centro", sex: "MALE", age: 36, groupLabel: "Aplaya Group 1", status: "RESTRICTED" };
const rows = [
  { ...baseRow, restrictionReason: "Recorded payout cooling-off period; Recorded additional restriction", restrictionEnd: "2099-12-31", restrictionDetails: [{ reason: "Recorded payout cooling-off period", end: "2099-12-31", start: "2026-01-01", payoutDate: "2025-12-31" }, { reason: "Recorded additional restriction", end: "2098-12-31" }] },
  { ...baseRow, rowNumber: 2, designatedNumber: "2", fullName: "SYNTHETIC APPOINTIVE", restrictionDetails: [{ reason: "Appointive personnel restriction", end: "2020-01-01", isAppointivePersonnel: true }] },
  { ...baseRow, rowNumber: 3, designatedNumber: "3", fullName: "SYNTHETIC LEGACY", validationError: "Legacy recorded restriction explanation" },
  { ...baseRow, rowNumber: 4, designatedNumber: "4", fullName: "SYNTHETIC READY", status: "VALID" },
];
const preview = { fileName: "synthetic-roster.csv", totalRows: 4, validCount: 1, restrictedCount: 3, duplicateCount: 0, invalidCount: 0, existingInDbCount: 0, existingInProgramCount: 0, newBeneficiaryCount: 4, barangaySummary: { Aplaya: 4 }, rows };
let previews = 0, unexpectedWrites = 0;
const errors = [];
let currentPage;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-ui-only", url: base }]);
  const page = await context.newPage();
  currentPage = page;
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const reply = (data) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    if (request.method() === "POST" && url.pathname.endsWith("/beneficiaries/import/preview")) { previews++; return reply({ success: true, preview }); }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) { unexpectedWrites++; return route.abort(); }
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "synthetic-admin", role: "PESO_ADMIN", fullName: "Synthetic Admin", username: "synthetic" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs: [program] });
    if (url.pathname.endsWith("/beneficiaries")) return reply({ beneficiaries: [] });
    return reply({});
  });
  const file = { name: "synthetic-roster.csv", mimeType: "text/csv", buffer: Buffer.from("No.,Full Name,Birthday\n1,SYNTHETIC ACTIVE,1990-01-02") };
  await page.goto(base + "/beneficiaries", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Upload CSV \/ Excel Masterlist/ }).click();
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole("button", { name: "Parse & Preview", exact: true }).click();
  const active = page.getByRole("row").filter({ hasText: "SYNTHETIC ACTIVE" });
  await active.getByRole("group", { name: "Restriction details" }).waitFor();
  assert.ok(await active.getByText("Recorded payout cooling-off period", { exact: true }).isVisible());
  assert.ok(await active.getByText("Recorded additional restriction", { exact: true }).isVisible());
  assert.ok(await active.getByText(/Restricted until:/).count());
  assert.ok(await active.getByText(/Payout date:/).isVisible());
  const ready = page.getByRole("row").filter({ hasText: "SYNTHETIC READY" });
  assert.equal(await ready.getByRole("group", { name: "Restriction details" }).count(), 0);
  await page.getByRole("button", { name: /Warnings \/ Restricted/ }).click();
  assert.equal(await ready.count(), 0);
  await active.getByRole("button", { name: "Exempt", exact: true }).click();
  const dialogHeading = page.getByRole("heading", { name: "Authorize Exemption: SYNTHETIC ACTIVE", exact: true });
  await dialogHeading.waitFor();
  assert.ok(await dialogHeading.locator("../..").getByText("Recorded additional restriction", { exact: true }).isVisible());
  await page.getByRole("button", { name: "Confirm & Apply Exemption", exact: true }).click();
  await page.getByRole("button", { name: "Exempted (1)", exact: true }).click();
  await active.getByText("Original restriction reasons", { exact: true }).waitFor();
  assert.ok(await active.getByText("Recorded additional restriction", { exact: true }).isVisible());
  assert.ok(await active.getByText(/Exemption justification:/).isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  await active.getByRole("group", { name: "Restriction details" }).scrollIntoViewIfNeeded();
  assert.ok(await active.getByText("Recorded payout cooling-off period", { exact: true }).isVisible());
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: "node_modules/.cache/roster-restriction-modal.png", fullPage: true });
  await active.getByRole("button", { name: "Revoke", exact: true }).click();
  await page.getByRole("button", { name: /Warnings \/ Restricted/ }).click();
  await active.getByText("Restriction reasons", { exact: true }).waitFor();
  assert.ok(await page.getByRole("row").filter({ hasText: "SYNTHETIC LEGACY" }).getByText("Legacy recorded restriction explanation", { exact: true }).isVisible());

  await page.goto(base + "/programs/synthetic-program/import", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole("button", { name: "Validate & Preview Rows", exact: true }).click();
  await active.getByRole("group", { name: "Restriction details" }).waitFor();
  assert.ok(await active.getByText("Recorded additional restriction", { exact: true }).isVisible());
  assert.ok(await page.getByRole("row").filter({ hasText: "SYNTHETIC APPOINTIVE" }).getByText("Appointive personnel — no date-based expiry", { exact: true }).isVisible());
  assert.ok(await ready.getByText("Passed Pre-Validation", { exact: true }).isVisible());
  await page.screenshot({ path: "node_modules/.cache/roster-restriction-program.png", fullPage: true });
  assert.equal(previews, 2);
  assert.equal(unexpectedWrites, 0);
  assert.deepEqual(errors, []);
  console.log("Roster browser preview passed: visible reasons/dates in modal and program importer, warnings filter, exemption/revoke preservation, mobile visibility, legacy fallback. No live API writes.");
} catch (error) {
  if (currentPage) {
    await currentPage.screenshot({ path: "node_modules/.cache/roster-restriction-failure.png", fullPage: true });
    console.error("Synthetic browser test page:", currentPage.url());
  }
  throw error;
} finally { await browser.close(); }
