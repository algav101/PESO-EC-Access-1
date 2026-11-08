// Appearance-only check: API traffic is mocked and sign-in is never submitted.
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [], mutations = [];
const expected = [
  ["PESO eCCESS Logo", "/images/peso-eccess-chrome-emblem.png?v=ffeb0acf", "C:/Users/WHITERAVEN/Downloads/Glossy Chrome PESO eCCESS Emblem.png"],
  ["Public Employment Service Office (PESO) Seal", "/images/peso-official-seal.png", "C:/Users/WHITERAVEN/Downloads/Q9M85F9CS374JN5XP4ECK8K7D4FJKVXE5Z6KS7AH-5ef55667.png"],
  ["Municipality of Dingalan, Aurora Seal", "/images/dingalan-official-seal.jpg", "C:/Users/WHITERAVEN/Downloads/Seal-1013x1024.jpg"],
];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: "block" });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, (route) => route.abort());
  await page.route("**/api/**", (route) => {
    if (route.request().method() !== "GET") { mutations.push(route.request().url()); return route.abort(); }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: false, users: [], programs: [], beneficiaries: [] }) });
  });
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  const group = page.getByRole("group", { name: "Login partner logos", exact: true });
  assert.equal(await group.getByRole("img").count(), 3);
  const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
  for (const [alt, source, original] of expected) {
    const image = group.getByAltText(alt, { exact: true });
    assert.equal(await image.getAttribute("src"), source);
    await image.evaluate((element) => element.decode());
    assert.equal(await image.evaluate((element) => element.naturalWidth > 0 && element.naturalHeight > 0), true);
    const response = await page.request.get(base + source);
    assert.equal(response.status(), 200);
    assert.equal(hash(await response.body()), hash(fs.readFileSync(original)), "Use the supplied image unchanged");
  }
  assert.equal(await page.getByAltText("PESO EC Access Official Emblem Watermark", { exact: true }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Sign In to System", exact: true }).isVisible(), true);
  await page.screenshot({ path: 'node_modules/.cache/login-branding-desktop.png', fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${width}px mobile page fits`);
    assert.equal(await group.evaluate((element) => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().right <= window.innerWidth), true);
    for (const [alt] of expected) assert.equal(await group.getByAltText(alt, { exact: true }).isVisible(), true);
  }
  await page.screenshot({ path: 'node_modules/.cache/login-branding-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, []);
  console.log("PASS: all three original login logos load, no old watermark, desktop and 320/390px layouts fit; no authentication changes.");
} finally { await browser.close(); }
