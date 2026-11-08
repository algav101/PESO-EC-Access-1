// Deterministic clock + synthetic iframe; no live Facebook posts or DB writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
let feedRequests = 0;
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: "block", reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, (route) => route.abort());
  await page.route("**/api/**", (route) => {
    assert.equal(route.request().method(), "GET", "No mutations in feed refresh");
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: false, programs: [], beneficiaries: [] }) });
  });
  await page.route("https://www.facebook.com/plugins/page.php?**", (route) => {
    feedRequests++;
    assert.equal(new URL(route.request().url()).searchParams.get("show_posts"), "true");
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body>Synthetic timeline</body></html>" });
  });
  await page.goto(base, { waitUntil: "networkidle" });
  const iframe = page.getByTitle("PESO Facebook Page timeline", { exact: true });
  await iframe.scrollIntoViewIfNeeded();
  await page.frameLocator('iframe[title="PESO Facebook Page timeline"]').getByText("Synthetic timeline", { exact: true }).waitFor();
  await page.clock.runFor(100);
  const initial = feedRequests;
  const refresh = page.waitForResponse((response) => response.url().startsWith("https://www.facebook.com/plugins/page.php?"));
  await page.clock.fastForward(300001);
  await refresh;
  assert.equal(feedRequests > initial, true, "Five-minute refresh must reload the feed without clicking");
  await page.frameLocator('iframe[title="PESO Facebook Page timeline"]').getByText("Synthetic timeline", { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.clock.runFor(100);
  const offscreen = feedRequests;
  await page.clock.fastForward(300001);
  await page.clock.runFor(100);
  assert.equal(feedRequests, offscreen, "Do not reload while the feed is off screen");
  assert.deepEqual(errors, []);
  console.log("PASS: Facebook posts reload automatically after five minutes and pause while off screen.");
} finally { await browser.close(); }
