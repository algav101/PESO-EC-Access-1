// UI only: every API request is intercepted. No live DB writes, real PII or printer use.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const files = [], errors = [], writes = [];
const programs = ["new", "old"].map((id) => ({ id, programCode: `SYNTHETIC-${id}`, programName: `${id} synthetic program`, status: "ACTIVE", requiredWorkDays: 10, workDays: [] }));
let role = "DOLE_COORDINATOR", saved = {};
const data = (id) => ({ program: programs.find((p) => p.id === id), meta: { municipality: id === "new" ? "Dingalan" : "Baler", dailyRate: "", referenceNumber: `SYNTHETIC-${id}` }, rows: [{ id: `${id}-pb`, designatedNumber: "1", fullName: `SYNTHETIC ${id.toUpperCase()} PERSON`, firstName: "TEST", lastName: "SYNTHETIC", birthday: "1990-01-02", idNumber: "", monthlyIncome: "0", attendance: [1,null] }], workDays: [], draft: saved[id]?.draft || { meta: {}, rows: {}, cells: {} }, revision: saved[id]?.revision || null, warnings: [] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: "block", acceptDownloads: true });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic", url: base }]);
  await context.addInitScript(() => { window.print = () => { throw new Error("Browser print must not replace original Excel layout"); }; });
  const page = await context.newPage(); page.setDefaultTimeout(60000); page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "synthetic-user", role, fullName: "Synthetic Report Officer" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs });
    const match = url.pathname.match(/\/programs\/(new|old)\/reports$/);
    if (match) {
      const id = match[1];
      if (request.method() === "GET") return reply(data(id));
      const body = request.postDataJSON(); writes.push({ id, ...body });
      if (body.action === "save") { saved[id] = { draft: body.draft, revision: "saved-revision" }; return reply({ success: true }); }
      return route.fulfill({ contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers: { "Content-Disposition": 'attachment; filename="synthetic-report.xlsx"' }, body: fs.readFileSync("node_modules/.cache/dole-report-review/synthetic-report.xlsx") });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) throw new Error("Unexpected write " + url.pathname);
    if (url.pathname.endsWith("/template")) return route.fulfill({ contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers: { "Content-Disposition": 'attachment; filename="tupad_form4_consolidated_template.xlsx"' }, body: fs.readFileSync("public/templates/dole-2026-all-forms.xlsx") });
    return reply({ beneficiaries: [], slots: [], settings: {} });
  });
  await page.goto(base + "/reports?programId=new", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "DOLE Reports", exact: true }).waitFor();
  assert.equal(await page.getByRole("checkbox").count(), 12);
  await page.getByText("Program details and signatories", { exact: true }).click();
  assert.equal(await page.getByLabel("Municipality", { exact: true }).inputValue(), "Dingalan");
  await page.getByLabel("Approved daily wage rate (PHP)", { exact: true }).fill("600");
  await page.getByLabel("Form 4 prepared/certified by", { exact: true }).fill("Synthetic Officer");
  await page.getByRole("checkbox", { name: /^PAYROLL/ }).check();
  await page.getByText("Review beneficiary details / fill blanks", { exact: true }).click();
  await page.getByLabel("Beneficiary ID number", { exact: true }).fill("SYNTHETIC-MANUAL-ID");
  await page.getByRole("button", { name: "Save report draft", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Report draft saved" }).waitFor();
  assert.equal(writes[0].draft.rows["new-pb"].idNumber, "SYNTHETIC-MANUAL-ID");
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate Excel", exact: true }).click();
  files.push((await download).suggestedFilename());
  assert.deepEqual(writes.at(-1).sheets, ["FORM 4 FINAL", "PAYROLL"]);
  assert.equal(writes.at(-1).draft.meta.dailyRate, "600");
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Print via Excel", exact: true }).click();
  files.push((await download).suggestedFilename());
  await page.getByRole("status").filter({ hasText: "Print workbook downloaded" }).waitFor();
  assert.equal(writes.at(-1).action, "print");
  await page.screenshot({ path: "node_modules/.cache/dole-reports-desktop.png", fullPage: true });
  await page.locator("select").filter({ has: page.locator('option[value="old"]') }).first().selectOption("old");
  await page.waitForFunction(() => document.querySelector('input[aria-label="Municipality"]')?.value === "Baler");
  await page.getByText("Program details and signatories", { exact: true }).click();
  assert.equal(await page.getByLabel("Approved daily wage rate (PHP)", { exact: true }).inputValue(), "");
  assert.equal(await page.getByLabel("Beneficiary ID number", { exact: true }).inputValue(), "");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "node_modules/.cache/dole-reports-mobile.png", fullPage: true });
  assert.ok(await page.getByRole("button", { name: "Print via Excel", exact: true }).isVisible());
  role = "PESO_STAFF";
  await page.goto(base + "/reports", { waitUntil: "networkidle" });
  assert.equal(await page.getByRole("heading", { name: "DOLE Reports", exact: true }).count(), 0);
  assert.deepEqual(errors, []); assert.equal(writes.length, 3);
  assert.ok(files[0].startsWith("REPORTS_")); assert.ok(files[1].startsWith("PRINT_"));
  console.log("DOLE Reports browser passed: DOLE role access, 12-sheet selection, program autofill, editable missing details, draft save, Excel export, native-Excel print guidance, program-change isolation and staff gating. All API traffic mocked.");
} finally { await browser.close(); }
