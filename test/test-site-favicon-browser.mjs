// Public pages only, synthetic API replies, no credentials or database writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const iconPath = "/images/peso-eccess-chrome-emblem.png?v=20261111";
const expected = fs.readFileSync("public/images/peso-eccess-chrome-emblem.png");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ serviceWorkers: "block" });
await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
await context.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, route => route.abort());
await context.route("**/api/**", route => {
  assert.equal(route.request().method(), "GET");
  return route.fulfill({ json: { authenticated: false, programs: [], beneficiaries: [] } });
});
try {
  const page = await context.newPage();
  for (const route of ["/", "/login", "/apply/inquiry"]) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForFunction(path => [...document.head.querySelectorAll('link[rel="icon"]')].some(link => link.getAttribute("href") === path), iconPath);
    assert.equal(await page.locator('head link[rel="shortcut icon"]').getAttribute("href"), iconPath);
    const decoded = await page.evaluate(path => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Favicon does not load"));
      image.src = path;
    }), iconPath);
    assert.ok(decoded.width > 0 && decoded.height > 0);
  }
  const image = await context.request.get(base + iconPath);
  assert.equal(image.status(), 200);
  assert.match(image.headers()["content-type"], /image\/png/);
  assert.equal(createHash("sha256").update(await image.body()).digest("hex"), createHash("sha256").update(expected).digest("hex"), "Use the original supplied logo, not a replacement image");
  console.log("PASS: original PESO chrome emblem is a valid tab/shortcut icon on landing, login, and inquiry pages");
} finally { await context.close(); await browser.close(); }
