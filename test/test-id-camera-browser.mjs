// Synthetic canvas-backed video only. Never opens the computer's actual camera.
// Every API request is intercepted and all writes are blocked.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
let writes = 0;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
  await context.addInitScript(() => {
    const test = window.__cameraTest = { mode: "success", requests: [], streams: [], stops: 0, resolvers: [] };
    const source = () => {
      const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#30445b"; ctx.fillRect(0, 0, 1600, 1000);
      for (let x = 0; x < 1600; x += 100) { ctx.fillStyle = x % 200 ? "#5e9d89" : "#82b9a2"; ctx.fillRect(x, 0, 100, 1000); }
      ctx.fillStyle = "#fff"; ctx.font = "bold 32px Arial"; ctx.fillText("SYNTHETIC CAMERA TEST — NOT A VALID ID", 80, 120);
      const stream = canvas.captureStream(10);
      test.streams.push(stream);
      for (const track of stream.getTracks()) { const stop = track.stop.bind(track); track.stop = () => { test.stops++; stop(); }; }
      return stream;
    };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: async (constraints) => {
      test.requests.push(constraints);
      if (test.mode === "denied") throw new DOMException("Synthetic denied", "NotAllowedError");
      if (test.mode === "missing") throw new DOMException("Synthetic missing", "NotFoundError");
      if (test.mode === "pending") return new Promise((resolve) => test.resolvers.push(() => resolve(source())));
      return source();
    } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) { writes++; return route.abort(); }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false }) });
  });
  await page.goto(base + "/apply", { waitUntil: "networkidle" });
  await page.waitForFunction(() => { const input = document.querySelector('input[type="file"]'); return input && Object.keys(input).some((key) => key.startsWith("__reactProps$") && input[key]?.onChange); });
  const frontButton = page.getByRole("button", { name: "Kunan ang front id picture gamit ang camera", exact: true });
  assert.ok(await frontButton.isDisabled());
  assert.equal(await page.evaluate(() => window.__cameraTest.requests.length), 0, "no camera request before user action");
  await page.getByLabel("TYPE OF ID", { exact: true }).selectOption("NATIONAL ID");
  await page.getByLabel(/^GIVEN NAME/).fill("MANUAL CAMERA TEST");
  await frontButton.click();
  const dialog = page.getByRole("dialog"), guide = page.getByTestId("id-camera-guide");
  const shutter = dialog.getByRole("button", { name: "Kunan ang ID", exact: true });
  await shutter.waitFor();
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find((b) => b.textContent === "Kunan ang ID")?.disabled);
  assert.equal(await guide.getAttribute("data-preset"), "CARD");
  let bounds = await guide.boundingBox();
  assert.ok(Math.abs(bounds.width / bounds.height - 1.586) < 0.01);
  const slider = dialog.getByRole("slider", { name: "Laki ng border", exact: true });
  await slider.press("Home");
  await page.waitForFunction((width) => document.querySelector('[data-testid="id-camera-guide"]').getBoundingClientRect().width < width * 0.85, bounds.width);
  for (let i = 0; i < 5; i++) await slider.press("ArrowRight");
  await page.screenshot({ path: "node_modules/.cache/id-camera-national-phone.png" });
  await shutter.click();
  const review = dialog.getByAltText("Review ng nakuhang ID photo", { exact: true });
  await review.waitFor();
  const photo = await review.evaluate(async (image) => { await image.decode(); const blob = await (await fetch(image.src)).blob(); return { width: image.naturalWidth, height: image.naturalHeight, type: blob.type, size: blob.size }; });
  assert.equal(photo.type, "image/jpeg");
  assert.ok(photo.width > 500 && photo.height > 300, "capture keeps native camera pixels, not a low-resolution CSS screenshot");
  assert.ok(Math.abs(photo.width / photo.height - 1.586) < 0.02);
  assert.ok(photo.size < 10 * 1024 * 1024);
  await page.waitForFunction(() => window.__cameraTest.streams.every((s) => s.getTracks().every((t) => t.readyState === "ended")));
  assert.equal(await page.getByAltText(/^id-front-id-picture-/).count(), 0, "retake/review must not overwrite the uploaded file yet");
  await dialog.getByRole("button", { name: "Kunan muli", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
  await shutter.click(); await review.waitFor();
  await dialog.getByRole("button", { name: "Gamitin ang photo", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByAltText(/^id-front-id-picture-/).waitFor();
  assert.equal(await page.getByLabel(/^GIVEN NAME/).inputValue(), "MANUAL CAMERA TEST");
  await page.getByLabel("TYPE OF ID", { exact: true }).selectOption("VOTER'S CETIFICATE");
  await frontButton.click(); await guide.waitFor();
  assert.equal(await guide.getAttribute("data-preset"), "DOCUMENT");
  const documentBounds = await guide.boundingBox();
  assert.ok(documentBounds.height > documentBounds.width);
  assert.ok(documentBounds.width * documentBounds.height > bounds.width * bounds.height * 1.4, "larger certificate frame is selected automatically");
  await page.screenshot({ path: "node_modules/.cache/id-camera-certificate-phone.png" });
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find((b) => b.textContent === "Kunan ang ID")?.disabled);
  await shutter.click(); await review.waitFor();
  const certificate = await review.evaluate(async (image) => { await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight }; });
  assert.ok(certificate.height > certificate.width);
  assert.ok(Math.abs(certificate.width / certificate.height - 1 / Math.SQRT2) < 0.01);
  await dialog.getByRole("button", { name: "Kunan muli", exact: true }).click();
  await guide.waitFor();
  await dialog.getByRole("button", { name: "Paikutin ang border", exact: true }).click();
  await page.waitForFunction(() => { const r = document.querySelector('[data-testid="id-camera-guide"]')?.getBoundingClientRect(); return r && r.width > r.height; });
  await dialog.getByLabel("Uri ng border", { exact: true }).selectOption("CARD");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => { const frame = document.querySelector('[data-testid="id-camera-guide"]')?.getBoundingClientRect(), stage = document.querySelector('[data-testid="id-camera-stage"]')?.getBoundingClientRect(); return frame && stage && frame.right <= stage.right && frame.bottom <= stage.bottom; });
  await page.screenshot({ path: "node_modules/.cache/id-camera-landscape.png" });
  await dialog.getByRole("button", { name: "Palit camera", exact: true }).click();
  await page.waitForFunction(() => window.__cameraTest.requests.some((r) => r.video.facingMode.ideal === "user"));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => window.__cameraTest.streams.every((s) => s.getTracks().every((t) => t.readyState === "ended")));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("DEPENDENT TYPE OF ID", { exact: true }).selectOption("VOTER'S CETIFICATE");
  await page.getByRole("button", { name: "Dependent: Kunan ang back id picture gamit ang camera", exact: true }).click();
  await dialog.getByRole("heading", { name: "Dependent: Back ID Picture — camera", exact: true }).waitFor();
  assert.equal(await guide.getAttribute("data-preset"), "DOCUMENT");
  await dialog.getByRole("button", { name: "Isara ang camera", exact: true }).click();
  await page.getByRole("button", { name: "Kunan ang close-up ng ID number", exact: true }).click();
  await guide.waitFor(); assert.equal(await guide.getAttribute("data-preset"), "NUMBER");
  await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });

  await page.evaluate(() => { window.__cameraTest.mode = "denied"; });
  await frontButton.click(); await dialog.getByRole("alert").filter({ hasText: "Hindi pinayagan" }).waitFor();
  assert.ok(await dialog.getByRole("button", { name: "Pumili na lang ng photo / file", exact: true }).isVisible());
  await page.evaluate(() => { window.__cameraTest.mode = "success"; });
  await dialog.getByRole("button", { name: "Buksan muli ang camera", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
  const beforeBackground = await page.evaluate(() => window.__cameraTest.requests.length);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await dialog.getByRole("status").filter({ hasText: "Naka-pause" }).waitFor();
  await page.waitForFunction(() => window.__cameraTest.streams.every((s) => s.getTracks().every((t) => t.readyState === "ended")));
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  assert.equal(await page.evaluate(() => window.__cameraTest.requests.length), beforeBackground, "camera must not silently resume after returning from another app/tab");
  await dialog.getByRole("button", { name: "Buksan muli ang camera", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
  const chooserPromise = page.waitForEvent("filechooser");
  await dialog.getByRole("button", { name: "Pumili na lang ng photo / file", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "fallback-test.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
  await dialog.waitFor({ state: "hidden" });
  await page.getByAltText("fallback-test.png", { exact: true }).waitFor();
  await page.getByLabel("TYPE OF ID", { exact: true }).selectOption("NATIONAL ID");
  await page.evaluate(() => { window.__cameraTest.mode = "missing"; });
  await frontButton.click(); await dialog.getByRole("alert").filter({ hasText: "Walang camera" }).waitFor();
  await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
  await page.evaluate(() => { window.__cameraTest.mode = "pending"; });
  await frontButton.click(); await dialog.waitFor();
  await page.waitForFunction(() => window.__cameraTest.resolvers.length > 0);
  await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
  await page.evaluate(() => window.__cameraTest.resolvers.splice(0).forEach((resolve) => resolve()));
  await page.waitForFunction(() => window.__cameraTest.streams.every((s) => s.getTracks().every((t) => t.readyState === "ended")));
  assert.ok(await page.evaluate(() => window.__cameraTest.requests.every((r) => r.audio === false)));
  // Unsupported API: no permission requests and a usable file-upload fallback.
  const unsupported = await browser.newContext();
  await unsupported.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
  await unsupported.addInitScript(() => Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined }));
  const unsupportedPage = await unsupported.newPage();
  await unsupportedPage.route("**/api/**", (route) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) { writes++; return route.abort(); }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: false }) });
  });
  await unsupportedPage.goto(base + "/apply", { waitUntil: "networkidle" });
  await unsupportedPage.getByLabel("TYPE OF ID", { exact: true }).selectOption("NATIONAL ID");
  await unsupportedPage.getByRole("button", { name: "Kunan ang front id picture gamit ang camera", exact: true }).click();
  await unsupportedPage.getByRole("alert").filter({ hasText: "Kailangan ng HTTPS" }).waitFor();
  await unsupportedPage.getByRole("button", { name: "Isara ang camera", exact: true }).click();
  await unsupported.close();
  assert.equal(writes, 0); assert.deepEqual(errors, []);
  console.log("Guided camera browser tests passed: phone card/certificate borders, native crops, review/retake/use, dependent/back/number, landscape, resize/switch, denied/missing/unsupported camera, gallery fallback, background pause and late-stream cleanup. Synthetic video only; no real camera or API writes.");
} finally { await browser.close(); }
