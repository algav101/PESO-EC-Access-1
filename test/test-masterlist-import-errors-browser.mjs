// All API traffic is mocked; clicking Commit cannot write to a live database.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
let previewMode = "text", commitMode = "timeout", writes = 0, commitRequests = 0;
const pageErrors = [], alerts = [];
const rows = Array.from({ length: 500 }, (_, i) => ({ rowNumber: i + 1, fullName: `SYNTHETIC IMPORT ${i}`, birthday: "1990-01-02", designatedNumber: String(i + 1), barangay: "Aplaya", status: i >= 497 ? "EXEMPTED" : "VALID", isExempted: i >= 497, exemptionReason: i >= 497 ? "Synthetic exemption" : undefined, isExistingInDb: i < 290 }));
const preview = { totalRows: 500, validCount: 500, restrictedCount: 0, duplicateCount: 0, invalidCount: 0, existingInDbCount: 290, existingInProgramCount: 0, newBeneficiaryCount: 210, rows, barangaySummary: { Aplaya: 500 } };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("dialog", async (dialog) => { alerts.push(dialog.message()); await dialog.dismiss(); });
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.endsWith("/beneficiaries/import/preview")) return previewMode === "text"
      ? route.fulfill({ status: 502, contentType: "text/plain", body: "An error occurred while processing your request" })
      : reply({ success: true, resolvedProgramId: "synthetic-program", preview });
    if (url.pathname.endsWith("/beneficiaries/import/commit")) {
      commitRequests++;
      assert.equal(request.postDataJSON().programId, "synthetic-program");
      if (commitMode === "timeout") return route.fulfill({ status: 504, contentType: "text/plain", body: "An error occurred while processing your request" });
      if (commitMode === "empty") return route.fulfill({ status: 200, body: "" });
      if (commitMode === "rollback") return reply({ code: "IMPORT_ROLLED_BACK", error: "The import was not saved. Roster changes were rolled back." }, 503);
      if (commitMode === "network") return route.abort();
      return reply({ success: true, importedCount: 500, newCount: 210, updatedCount: 290, exemptedCount: 3 });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) { writes++; return route.abort(); }
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "synthetic-admin", role: "PESO_ADMIN", username: "synthetic", fullName: "Synthetic Admin" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs: [{ id: "synthetic-program", programCode: "TEST", programName: "Synthetic program", status: "ACTIVE" }] });
    return reply({ beneficiaries: [] });
  });
  await page.goto(base + "/beneficiaries", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Upload CSV \/ Excel Masterlist/ }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.csv", mimeType: "text/csv", buffer: Buffer.from("synthetic test data only") });
  await page.getByRole("button", { name: "Parse & Preview", exact: true }).click();
  await page.getByText(/unreadable response \(HTTP 502\)/).waitFor();
  assert.ok(!(await page.locator("body").innerText()).includes("Unexpected token"));
  previewMode = "json";
  await page.getByRole("button", { name: "Parse & Preview", exact: true }).click();
  const commit = page.getByRole("button", { name: /Commit & Implement \(500\)/ });
  for (const [mode, expected] of [["timeout", /server timed out \(HTTP 504\)/], ["empty", /unreadable response \(HTTP 200\)/], ["rollback", /Roster changes were rolled back/], ["network", /connection was interrupted/]]) {
    commitMode = mode;
    await commit.click();
    await page.getByText(expected).waitFor();
    assert.ok(await commit.isEnabled());
    assert.ok(await page.getByRole("button", { name: "All Rows (500)", exact: true }).isVisible());
    assert.equal(alerts.length, 0, "a failed/unknown import must never announce success");
    assert.ok(!(await page.locator("body").innerText()).includes("Unexpected token"));
  }
  assert.equal(commitRequests, 4, "no automatic replay after ambiguous failures");
  await page.screenshot({ path: "node_modules/.cache/masterlist-import-readable-error.png", fullPage: true });
  commitMode = "success";
  await commit.click();
  await page.getByRole("heading", { name: 'Upload "Final List of Beneficiaries for Implementation"', exact: true }).waitFor({ state: "hidden" });
  assert.equal(alerts.length, 1);
  assert.ok(alerts[0].includes("500 beneficiaries"));
  assert.equal(commitRequests, 5);
  assert.equal(writes, 0); assert.deepEqual(pageErrors, []);
  console.log("Masterlist browser error tests passed: text gateway errors, empty responses, rollback JSON, disconnected network, retained 500-row preview, no auto-retry, confirmed success only. No live writes.");
} finally { await browser.close(); }
