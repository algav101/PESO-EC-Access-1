// Mocked user sessions only; no real account credentials or database writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const roles = ["DOMAIN_MASTER", "PESO_ADMIN", "PESO_STAFF", "TUPAD_COORDINATOR", "TUPAD_ASSISTING_DOCUMENTOR", "DOLE_COORDINATOR"];
const errors = [], mutations = [];
try {
  for (const role of roles) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }, { name: "tupad_auth_token", value: "synthetic-test-only", url: base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, (route) => route.abort());
    await page.route("**/api/**", async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (request.method() !== "GET") { mutations.push(path); return route.abort(); }
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(path === "/api/v1/auth/me"
        ? { authenticated: true, user: { id: `synthetic-${role}`, username: "synthetic", fullName: "Synthetic Test User", role } }
        : { programs: [], beneficiaries: [] }) });
    });
    await page.goto(base + "/my-assignment/inquiry", { waitUntil: "networkidle" });
    const home = page.locator('header').getByRole("link", { name: "Back to Landing Page", exact: true });
    await home.waitFor();
    const headerLogo = page.locator('header').getByAltText("PESO EC Access Official Emblem Logo", { exact: true });
    assert.equal(await headerLogo.getAttribute("src"), "/images/peso-eccess-chrome-emblem.png?v=ffeb0acf");
    await headerLogo.evaluate((image) => image.decode());
    assert.equal(await headerLogo.evaluate((image) => image.naturalWidth > 0), true);
    assert.equal(await home.getAttribute("href"), "/", role);
    assert.equal(await home.isVisible(), true, role);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await home.isVisible(), true, `${role}: mobile link`);
    assert.equal(await page.locator('header').first().evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.scrollWidth <= element.clientWidth && box.right <= window.innerWidth;
    }), true, `${role}: mobile header fits`);
    await home.click();
    await page.waitForURL(base + "/");
    await page.locator('header').getByRole("button", { name: "Sign out of system" }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("peso_cached_user")).role), role, "Navigation must not log the user out");
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(mutations, [], "Home navigation must never call logout or sync writes");
  console.log(`PASS: Back to Landing Page works for all ${roles.length} user roles, including mobile, without logging out.`);
} finally { await browser.close(); }
