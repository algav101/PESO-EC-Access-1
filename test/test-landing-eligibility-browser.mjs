// UI regression only: all API requests are mocked; no beneficiary data is written.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
let checks = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => errors.push(error.message));
  // External landing-page media must not hold networkidle open indefinitely.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, (route) => route.abort());
  // Verify iframe integration without relying on third-party availability or real posts.
  await page.route("https://www.facebook.com/plugins/page.php?**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body style='font-family:Arial;padding:24px;background:#f8fafc'><h2>Mock Facebook Page timeline</h2><p>Synthetic embed for automated layout checks only.</p></body></html>" }));
  await page.route("**/api/**", async (route) => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/auth/me") return reply({ authenticated: false, user: null });
    if (url.pathname === "/api/v1/restrictions") {
      if (request.method() === "POST") {
        checks++;
        assert.deepEqual(request.postDataJSON(), { firstName: "TEST", middleName: "", lastName: "SYNTHETIC", extensionName: "" });
        return reply({ disqualified: true, name: "SYNTHETIC TEST", reason: "Synthetic restriction reason for UI test.", barangay: "Aplaya", municipality: "Dingalan", daysRemaining: 10, daysElapsed: 310, eligibilityDate: "Test date" });
      }
      return reply(url.searchParams.has("countOnly") ? { totalCount: 7687 } : { suggestions: [] });
    }
    assert.equal(request.method(), "GET", "Unexpected mutation request");
    return reply({ programs: [], beneficiaries: [] });
  });
  await page.goto(base, { waitUntil: "networkidle" });
  const mastheadLogo = page.locator('[data-purpose="official-masthead"]').getByAltText("Official PESO EC Access Emblem Logo", { exact: true });
  assert.equal(await mastheadLogo.getAttribute("src"), "/images/peso-eccess-chrome-emblem.png");
  await mastheadLogo.evaluate((image) => image.decode());
  assert.equal(await mastheadLogo.evaluate((image) => image.naturalWidth > 0), true);
  assert.equal(await page.locator('[data-purpose="official-masthead"]').getByAltText("PESO Public Employment Service Office Seal", { exact: true }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: /Pagpapalakas ng Serbisyo ng PESO/ }).count(), 0);
  assert.equal(await page.getByText("KAHANGA-HANGA AT PROUDLY LOCAL:", { exact: false }).count(), 0);
  assert.equal(await page.locator('#hero').count(), 1, "Home navigation anchor remains available");
  const navigationLogo = page.locator('[data-purpose="primary-navigation"]').getByAltText("e PESO access Logo", { exact: true });
  assert.equal(await navigationLogo.getAttribute("src"), "/images/peso-eccess-chrome-emblem.png?v=ffeb0acf");
  await navigationLogo.evaluate((image) => image.decode());
  const attributionLogo = page.locator('footer').getByAltText("PESO eCCESS Logo - PESO Dingalan GovTech", { exact: true });
  assert.equal(await attributionLogo.getAttribute("src"), "/images/peso-eccess-chrome-emblem.png?v=ffeb0acf");
  await attributionLogo.evaluate((image) => image.decode());
  const republicLogo = page.locator('footer').getByAltText("Bagong Pilipinas Logo", { exact: true });
  assert.equal(await republicLogo.getAttribute("src"), "/images/bagong-pilipinas-transparent.png");
  await republicLogo.evaluate((image) => image.decode());
  const transparency = await republicLogo.evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0, opaque = 0;
    for (let index = 3; index < pixels.length; index += 4) { if (pixels[index] === 0) transparent++; if (pixels[index] === 255) opaque++; }
    return { corner: pixels[3], transparent, opaque };
  });
  assert.equal(transparency.corner, 0, "Logo background must have transparent alpha, not white");
  assert.equal(transparency.transparent > 0 && transparency.opaque > 0, true);
  await page.locator('footer').screenshot({ path: 'node_modules/.cache/footer-bagong-pilipinas.png' });
  assert.equal(await page.getByAltText("PESO EC Access Official Emblem Watermark", { exact: true }).count(), 0, "Background watermark is removed");
  const facebook = page.locator('#gallery');
  await facebook.getByRole("heading", { name: "Facebook Updates", exact: true }).waitFor();
  assert.equal(await facebook.getByRole("link", { name: "Buksan sa Facebook", exact: true }).getAttribute("href"), "https://www.facebook.com/profile.php?id=100077407929199");
  const frame = facebook.getByTitle("PESO Facebook Page timeline", { exact: true });
  assert.equal(await frame.count(), 1, "Render the confirmed Facebook Page timeline");
  const source = new URL(await frame.getAttribute("src"));
  assert.equal(source.origin, "https://www.facebook.com");
  assert.equal(source.pathname, "/plugins/page.php");
  assert.equal(source.searchParams.get("href"), "https://www.facebook.com/profile.php?id=100077407929199");
  assert.equal(source.searchParams.get("show_posts"), "true");
  assert.equal(source.searchParams.has("tabs"), false);
  await facebook.getByText(/Automatic updates/).waitFor();
  assert.equal(await facebook.getByText(/Personal profile ang account/).count(), 0);
  assert.equal(await facebook.getByRole("heading", { name: "Empowering Local Municipal Workforces", exact: true }).count(), 0);
  await facebook.screenshot({ path: 'node_modules/.cache/facebook-updates-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await facebook.evaluate((element) => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().right <= window.innerWidth), true, "Facebook section fits mobile viewport");
  assert.equal(Number(new URL(await frame.getAttribute("src")).searchParams.get("width")) <= 390, true, "Resize the embedded feed for phone screens");
  await facebook.screenshot({ path: 'node_modules/.cache/facebook-updates-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.locator('video').count(), 0, "Remove the landing video showcase");
  assert.equal(await page.locator('#migrants-corner, #inquiry, #inquiry-form').count(), 0, "Remove screenshot sections from landing");
  assert.equal(await page.getByRole("heading", { name: "Mabilis at Transparent na Serbisyong Publiko", exact: true }).count(), 0);
  assert.equal(await page.getByRole("heading", { name: "TUPAD Application Status Inquiry", exact: true }).count(), 0);
  assert.equal(await page.locator('a[href="#inquiry"], a[href="#inquiry-form"]').count(), 0, "Removed landing sections must not leave broken shortcuts");
  assert.equal(await page.getByRole("button", { name: /Narito ang mga Serbisyo ng PESO/ }).count(), 0, "Services menu trigger is removed");
  assert.equal(await page.locator('[data-purpose="dict-gwt-utility-bar"]').getByRole("link", { name: "365-Day Checker", exact: true }).count(), 0, "Top bar checker shortcut is removed");
  assert.equal(await page.locator('#eligibility-checker').count(), 0, "Eligibility form is not embedded in landing");
  assert.equal(await page.getByRole("button", { name: "Alamin at Magpatuloy" }).count(), 0);
  assert.equal(await page.locator('#work-assignment').count(), 0, "Remove the assignment scanner from landing");
  assert.equal(await page.locator('a[href="#work-assignment"]').count(), 0, "Do not leave stale assignment links");
  assert.equal(await page.locator('a[href="#eligibility-checker"]').count(), 0, "No stale eligibility anchors");
  await page.getByRole("button", { name: "Baligtarin Lahat (Back Details)", exact: true }).click();
  await page.locator('#programs').getByRole("link", { name: "Status Inquiry", exact: true }).click();
  await page.waitForURL("**/apply/inquiry");
  await page.getByRole("heading", { level: 1, name: "Application Status & Inquiry", exact: true }).waitFor();
  await page.getByRole("heading", { name: "TUPAD Application Status Inquiry", exact: true }).click();
  await page.getByRole("form", { name: "TUPAD Application Inquiry Form", exact: true }).waitFor();
  await page.getByRole("heading", { name: "PESO-Dingalan Public Message & Inquiry Form", exact: true }).waitFor();
  await page.getByRole("link", { name: "Bumalik sa Landing Page", exact: true }).click();
  await page.waitForURL(base + "/");
  await page.getByRole("button", { name: "Baligtarin Lahat (Back Details)", exact: true }).click();
  const eligibilityLink = page.locator('#programs').getByRole("link", { name: "365-Day Checker", exact: true });
  assert.equal(await eligibilityLink.getAttribute("href"), "/restrictions/checker");
  await eligibilityLink.click();
  await page.waitForURL("**/restrictions/checker");
  const checker = page.locator('main');
  await checker.getByRole("heading", { name: /Alamin kung ikaw/ }).waitFor();
  assert.equal(await checker.getByText("Database:", { exact: true }).count(), 0);
  assert.equal(await checker.getByRole("link", { name: "Template (.XLSX)" }).count(), 0);
  await checker.getByRole("link", { name: "Bumalik sa Landing Page", exact: true }).waitFor();
  assert.equal(await checker.getByRole("button", { name: "Upload Reference List" }).count(), 0);
  await checker.getByPlaceholder("e.g. ALCANTARA").fill("SYNTHETIC");
  await checker.getByPlaceholder("e.g. VILMA").fill("TEST");
  await checker.getByRole("button", { name: "Alamin at Magpatuloy" }).click();
  await checker.getByText("Synthetic restriction reason for UI test.").waitFor();
  assert.equal(checks, 1);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await checker.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth && element.scrollWidth <= element.clientWidth;
  }), true, "Eligibility checker must fit the mobile viewport");
  await checker.getByRole("button", { name: "Alamin at Magpatuloy" }).scrollIntoViewIfNeeded();
  await page.getByRole("heading", { level: 1, name: /Alamin kung ikaw/ }).waitFor();
  await page.getByText("Bumalik sa Landing Page", { exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Baligtarin Lahat (Back Details)", exact: true }).click();
  const assignmentLink = page.locator('#programs').getByRole("link", { name: "Work Area Assignment", exact: true });
  assert.equal(await assignmentLink.getAttribute("href"), "/my-assignment/inquiry");
  await assignmentLink.click();
  await page.waitForURL("**/my-assignment/inquiry");
  await page.getByRole("heading", { level: 1, name: "Work Area Assignment at Iskedyul" }).waitFor();
  await page.getByRole("button", { name: "Buksan ang Camera Scanner", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: /Alamin kung ikaw/ }).count(), 0);
  await page.getByRole("button", { name: "Upload Larawan ng QR", exact: true }).click();
  await page.getByRole("button", { name: "Pumili ng Larawan mula sa Device", exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "Assignment page must fit mobile viewport");
  await page.getByRole("link", { name: "Bumalik sa Landing Page", exact: true }).click();
  await page.waitForURL(base + "/");
  assert.deepEqual(errors, []);
  console.log("PASS: screenshot sections removed, standalone inquiry accessible from flipcard, eligibility and assignment links, mobile layout and back navigation.");
} finally { await browser.close(); }
