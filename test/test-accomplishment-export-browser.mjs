// Run after test-accomplishment-work-schedule.mjs. APIs are mocked, with synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const testRole = process.env.REPORT_TEST_ROLE || "PESO_ADMIN";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ serviceWorkers: "block" });
const fixture = fs.readFileSync("node_modules/.cache/accomplishment-schedule-review/synthetic-accomplishment.xlsx");
const programs = ["a", "b"].map(id => ({ id: "synthetic-program-" + id, programCode: "SYNTHETIC " + id.toUpperCase(), programName: "Synthetic Program", workDays: [] }));
await context.addCookies([{ name: "tupad_auth_token", value: "synthetic-only", url: base }, { name: "peso_landing_visited", value: "1", url: base }]);
await context.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, route => route.abort());
await context.route("**/api/**", async route => {
  const request = route.request(), url = new URL(request.url());
  assert.equal(request.method(), "GET", "Viewing/exporting reports must not mutate data");
  if (url.pathname === "/api/v1/reports/export") {
    assert.equal(url.searchParams.get("type"), "ACCOMPLISHMENT");
    assert.equal(url.searchParams.get("programId"), programs[0].id);
    return route.fulfill({ headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="synthetic-accomplishment.xlsx"' }, body: fixture });
  }
  if (url.pathname.endsWith("/reports")) return route.fulfill({ status: 404, json: { error: "Unrelated template panel omitted from this isolated test." } });
  return route.fulfill({ json: url.pathname === "/api/v1/auth/me"
    ? { authenticated: true, user: { id: "synthetic-user", username: "synthetic", fullName: "Synthetic Report User", role: testRole } }
    : { programs, beneficiaries: [], slots: [], workPrograms: [] } });
});
try {
  const page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/reports", { waitUntil: "networkidle" });
  const link = page.locator('a[href*="type=ACCOMPLISHMENT"]');
  await link.waitFor();
  await page.getByRole("link", { name: "Reports", exact: true }).first().waitFor({ state: "visible" });
  assert.ok((await link.getAttribute("href")).includes("programId=" + programs[0].id));
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  const book = new ExcelJS.Workbook(); await book.xlsx.readFile(await download.path());
  const sheetText = [];
  book.getWorksheet("IBONA").eachRow(row => row.eachCell(cell => { if (typeof cell.value === "string") sheetText.push(cell.value); }));
  assert.equal(book.getWorksheet("IBONA").getCell("A1").value, "TUPAD Completion Report");
  assert.ok(sheetText.some(text => /Repair the community garden fence/.test(text.replace(/\s+/g, " "))));
  assert.ok(sheetText.some(text => /Prepare emergency supply kits/.test(text.replace(/\s+/g, " "))));
  assert.equal(book.getWorksheet("IBONA").getImages().length, 8, "Downloaded workbook includes embedded documentation photos");
  await page.getByRole("combobox").first().selectOption(programs[1].id);
  assert.ok((await link.getAttribute("href")).includes("programId=" + programs[1].id));
  assert.deepEqual(errors, []);
  console.log(`PASS: ${testRole} sees Reports navigation and downloads the Completion Report with photos; target program updates export link`);
} finally { await context.close(); await browser.close(); }
