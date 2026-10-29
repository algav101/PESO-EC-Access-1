// UI smoke tests against npm run dev; synthetic auth/data, no real writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const fixture = { id: "synthetic-record", applicationCode: "APP-TEST-001", fullName: "REYES, MARIA ANA", source: "ONLINE", status: "PENDING_REVIEW", submissionStatus: "SUBMITTED", barangay: "PALTIC", birthday: "1994-02-17", dependentGivenName: "ANA", dependentLastName: "REYES", encodedBy: { fullName: "Synthetic DOLE Encoder" }, submittedAt: "2026-10-29T01:00:00Z", updatedAt: "2026-10-29T01:00:00Z", remarks: null, documents: [{ id: "synthetic-document", subject: "APPLICANT", fieldName: "applicantIdFront", fileName: "synthetic.png" }], duplicateWarning: { possibleDuplicate: true, reasons: ["Same ID number"] } };
const errors = [], requests = [];
let record = structuredClone(fixture), failList = false, patches = 0, unexpectedWrites = 0;
async function setup(role) {
  const context = await browser.newContext();
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-ui-test-only", url: base }]);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "synthetic-user", role, fullName: "Synthetic Encoder", username: "synthetic" } });
    if (url.pathname === "/api/v1/applications") {
      requests.push(url);
      if (failList) return reply({ error: "Synthetic inbox failure" }, 500);
      const application = { ...record, source: url.searchParams.get("source") };
      const list = url.searchParams.get("status") === "INCOMPLETE" && record.status !== "INCOMPLETE" ? [] : [application];
      return reply({ applications: list, counts: { total: 26, pending: record.status === "PENDING_REVIEW" ? 26 : 25, queued: record.status === "QUEUED" ? 1 : 0, incomplete: 0 }, filteredCount: list.length ? 26 : 0, pageSize: 25 });
    }
    if (url.pathname === "/api/v1/applications/synthetic-record") {
      if (request.method() === "PATCH") { patches++; const body = request.postDataJSON(); assert.equal(body.updatedAt, record.updatedAt); record = { ...record, ...body, updatedAt: new Date().toISOString() }; }
      return reply({ application: record });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) { unexpectedWrites++; return route.abort(); }
    return reply({});
  });
  return { context, page };
}
try {
  for (const role of ["PESO_STAFF", "TUPAD_COORDINATOR", "TUPAD_ASSISTING_DOCUMENTOR", "DOLE_COORDINATOR"]) {
    const { page, context } = await setup(role);
    await page.goto(base + "/applications/walk-in");
    await page.getByRole("heading", { name: "Walk-in Encoding", exact: true }).waitFor();
    assert.equal(await page.getByLabel("TYPE OF ID", { exact: true }).count(), 1);
    assert.ok(await page.getByRole("link", { name: "Walk-in Application", exact: true }).count());
    assert.equal(await page.getByRole("link", { name: "Online Applications", exact: true }).count(), 0);
    const before = requests.length;
    await page.goto(base + "/admin/applications/online");
    await page.getByRole("heading", { name: "Admin access required" }).waitFor();
    assert.equal(requests.length, before, "non-admin pages never request incoming applications");
    await context.close();
  }
  const { page, context } = await setup("PESO_ADMIN");
  await page.goto(base + "/admin/applications/online");
  await page.getByRole("button", { name: "Review application", exact: true }).waitFor();
  assert.equal(requests.at(-1).searchParams.get("source"), "ONLINE");
  await page.getByRole("button", { name: "Review application", exact: true }).click();
  await page.getByLabel("Admin review notes").waitFor();
  assert.ok(await page.getByRole("link", { name: /applicantIdFront/ }).count());
  await page.getByRole("button", { name: "For completion", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Describe the missing" }).waitFor();
  assert.equal(patches, 0);
  await page.getByLabel("Admin review notes").fill("Reviewed the synthetic documents.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Mark reviewed & queue", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Admin review saved" }).waitFor();
  assert.equal(patches, 1); assert.equal(record.status, "QUEUED");
  await page.getByRole("button", { name: "Close review", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes("Page 2 of 2"));
  assert.equal(requests.at(-1).searchParams.get("page"), "2");
  await page.getByLabel("Review status").selectOption("INCOMPLETE");
  await page.getByText("No submitted applications match these filters.", { exact: true }).waitFor();
  assert.equal(requests.at(-1).searchParams.get("page"), "1");
  await page.goto(base + "/admin/applications/walk-in-submissions");
  await page.getByRole("button", { name: "Review application", exact: true }).waitFor();
  assert.equal(requests.at(-1).searchParams.get("source"), "WALK_IN");
  assert.ok(await page.getByRole("cell", { name: "Synthetic DOLE Encoder", exact: true }).count());
  await page.screenshot({ path: "node_modules/.cache/application-inbox-smoke.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "mobile inbox does not overflow the viewport");
  failList = true;
  await page.getByRole("button", { name: "Refresh inbox", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Synthetic inbox failure" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Review application", exact: true }).count(), 0, "failed fetch clears stale entries");
  await context.close();
  const unauthenticated = await browser.newContext();
  assert.equal((await unauthenticated.request.get(base + "/api/v1/applications?source=ONLINE")).status(), 403);
  assert.equal((await unauthenticated.request.get(base + "/api/v1/applications/synthetic-record")).status(), 403);
  await unauthenticated.close();
  assert.deepEqual(errors, []); assert.equal(unexpectedWrites, 0);
  console.log("Application inbox UI passed: all four encoder roles, admin-only inbox, detail/documents, review notes, queue, pagination, channel isolation, error recovery. All writes mocked.");
} finally { await browser.close(); }
