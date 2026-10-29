// Logo-only UI check. Synthetic lookup data; no application or database writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
  const page = await context.newPage(), errors = [];
  let blockedWrites = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) { blockedWrites++; return route.abort(); }
    const url = new URL(route.request().url());
    const body = url.pathname === "/api/v1/auth/me" ? { authenticated: false }
      : url.pathname === "/api/v1/migrants/family-circle" ? { member: { id: "synthetic-logo-check", memberCode: "OFC-TEST-ONLY", ofwFullName: "SYNTHETIC TEST RECORD", dingalanBarangay: "Paltic", familyMembersJson: "[]" } } : {};
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(base + "/migrants/family-circle", { waitUntil: "domcontentloaded" });
  const logo = page.getByAltText("OFW Family Circle Federation Dingalan logo", { exact: true });
  await logo.waitFor();
  await page.waitForFunction(() => [...document.images].some((image) => image.alt === "OFW Family Circle Federation Dingalan logo" && image.complete && image.naturalWidth > 0));
  assert.equal(await logo.getAttribute("src"), "/images/ofw-family-circle-dingalan.jpg");
  assert.equal(await logo.evaluate((image) => getComputedStyle(image).objectFit), "contain");
  const bytes = await (await context.request.get(base + "/images/ofw-family-circle-dingalan.jpg")).body();
  assert.deepEqual(bytes, readFileSync("public/images/ofw-family-circle-dingalan.jpg"));
  await page.getByAltText("PESO Official Seal", { exact: true }).waitFor();
  await page.getByAltText("Dingalan Aurora 1956 Official Seal", { exact: true }).waitFor();
  await logo.locator("..").screenshot({ path: "node_modules/.cache/ofw-logos-registration.png" });
  await page.getByRole("button", { name: /I-Print ang OFW Sheet/ }).click();
  await page.getByPlaceholder("Member Code (OFC-DGL-...)").fill("OFC-TEST-ONLY");
  await page.getByRole("button", { name: "Hanapin ang Record", exact: true }).click();
  await logo.waitFor();
  await page.waitForFunction(() => [...document.images].some((image) => image.alt === "OFW Family Circle Federation Dingalan logo" && image.complete && image.naturalWidth > 0));
  assert.equal(await logo.getAttribute("src"), "/images/ofw-family-circle-dingalan.jpg");
  await page.getByAltText("PESO Logo", { exact: true }).waitFor();
  await page.getByAltText("Dingalan Seal", { exact: true }).waitFor();
  await page.emulateMedia({ media: "print" });
  assert.equal(await logo.isVisible(), true);
  await logo.locator("..").screenshot({ path: "node_modules/.cache/ofw-logos-print.png" });
  assert.deepEqual(errors, []); assert.equal(blockedWrites, 0);
  console.log("OFW logo passed: original local asset, registration header, printable header, other seals retained, no writes.");
} finally { await browser.close(); }
