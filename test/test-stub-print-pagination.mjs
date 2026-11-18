// Real Chromium PDF pagination; all APIs use synthetic fixtures. No database or printer writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const output = path.resolve("tmp/pdfs");
fs.mkdirSync(output, { recursive: true });
const count = 103;
const program = { id: "print-fixture", programCode: "PRINT TEST", programName: "Synthetic print program", status: "ACTIVE", requiredWorkDays: 10 };
const roster = Array.from({ length: count }, (_, i) => ({
  id: `print-pb-${i + 1}`, programId: program.id, designatedNumber: String(i + 1), participationStatus: "ACTIVE", tableNumber: "Table 1",
  beneficiary: { fullName: `SYNTHETIC PRINT PERSON ${i + 1}`, barangay: "Aplaya", sitio: "Centro" },
  qrCodes: [{ publicToken: `TUPAD-DGL-PRINT1-${i + 1}-12345678`, status: "ACTIVE" }],
}));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-print-test", url: base }]);
  await context.addInitScript(() => { window.print = () => { window.__stubPrintCalls = (window.__stubPrintCalls || 0) + 1; }; });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const pageErrors = [], printLogs = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("**/api/**", (route) => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: true, user: { id: "print-admin", fullName: "Print Admin", role: "PESO_ADMIN" } });
    if (url.pathname === "/api/v1/programs") return reply({ programs: [program] });
    if (url.pathname.endsWith("/beneficiaries")) return reply({ beneficiaries: roster });
    if (url.pathname.endsWith("/stubs") && request.method() === "POST") { printLogs.push(request.postDataJSON()); return reply({ success: true }); }
    if (request.method() !== "GET") throw new Error("Unexpected write: " + url.pathname);
    return reply({ slots: [], workPrograms: [] });
  });
  await page.goto(base + "/stubs?programId=" + program.id, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Format 2: e-TUPAD Badge Card", exact: true }).click();
  await page.waitForFunction((expected) => {
    const codes = [...document.querySelectorAll('.stub-print-document img[alt^="QR #"]')];
    return codes.length === expected && codes.every((img) => img.complete && img.naturalWidth > 0);
  }, count);
  const cases = [
    { paper: "A4", rows: 5, cols: 2, mode: "badge", points: [595.28, 841.89] },
    { paper: "A4", rows: 4, cols: 2, mode: "badge", points: [595.28, 841.89] },
    { paper: "A4", rows: 6, cols: 3, mode: "badge", points: [595.28, 841.89] },
    { paper: "Letter", rows: 5, cols: 2, mode: "badge", points: [612, 792] },
    { paper: "Legal", rows: 5, cols: 2, mode: "badge", points: [612, 1008] },
    { paper: "A4", rows: 5, cols: 2, mode: "full", points: [595.28, 841.89] },
  ];
  for (const scenario of cases) {
    await page.emulateMedia({ media: "screen" });
    if (scenario.mode === "full") await page.getByRole("button", { name: "Format 1: Full Verification Stub", exact: true }).click();
    await page.locator("select").filter({ has: page.locator('option[value="A4"]') }).selectOption(scenario.paper);
    await page.getByRole("button", { name: `${scenario.rows} Rows`, exact: true }).click();
    await page.getByRole("button", { name: `${scenario.cols} Col`, exact: true }).click();
    const capacity = scenario.rows * scenario.cols;
    assert.equal(await page.locator(".stub-print-sheet").count(), Math.ceil(count / capacity));
    if (scenario === cases[0]) {
      await page.getByRole("button", { name: `Print All ${count} Cards`, exact: true }).click();
      await page.waitForFunction(() => window.__stubPrintCalls === 1);
      assert.equal(printLogs.length, 1);
      assert.equal(printLogs[0].rowsPerPage, 5); assert.equal(printLogs[0].columnsPerPage, 2);
    }
    await page.emulateMedia({ media: "print" });
    const filename = `stub-print-${scenario.paper.toLowerCase()}-${scenario.cols}x${scenario.rows}-${scenario.mode}.pdf`;
    const bytes = await page.pdf({ path: path.join(output, filename), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, disableFontFace: true }).promise;
    assert.equal(pdf.numPages, Math.ceil(count / capacity), `${filename}: selected sheet count must match the PDF, without blank pages`);
    for (let number = 1; number <= pdf.numPages; number++) {
      const pdfPage = await pdf.getPage(number);
      assert.ok(Math.abs(pdfPage.view[2] - scenario.points[0]) < 1 && Math.abs(pdfPage.view[3] - scenario.points[1]) < 1, `${filename}: incorrect physical paper dimensions`);
      const text = (await pdfPage.getTextContent()).items.map((item) => item.str).join(" ");
      const designatedText = text.replace(/TABLE ASSIGNMENT:\s*#\s*\d+/g, "");
      const numbers = [...designatedText.matchAll(/#\s*(\d+)/g)].map((match) => Number(match[1]));
      const start = (number - 1) * capacity + 1;
      assert.deepEqual(numbers, Array.from({ length: Math.min(capacity, count - start + 1) }, (_, i) => start + i), `${filename}, page ${number}: missing, duplicated or displaced card`);
    }
    await pdf.destroy();
    console.log(`PASS ${scenario.paper} ${scenario.cols} x ${scenario.rows} ${scenario.mode}: ${count} cards, ${Math.ceil(count / capacity)} pages, exact card order and paper size.`);
  }
  assert.deepEqual(pageErrors, []);
  console.log("Print pagination passed. All APIs were mocked; no real printer or database was used. PDFs: " + output);
} finally { await browser.close(); }
