// Local assets + mocked browser APIs only. No account credentials or database mutations.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const browser = await chromium.launch({ channel: "chrome", headless: true });
const source = "public/images/peso-organizational-structure.png";
const enhanced = "public/images/peso-organizational-structure-clear-portraits.png";
try {
  const pixelPage = await browser.newPage();
  const comparison = await pixelPage.evaluate(async ({ before, after }) => {
    const decode = async data => {
      const image = new Image(); image.src = "data:image/png;base64," + data; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
    };
    const a = await decode(before), b = await decode(after);
    const rectangles = [[970,255,285,343],[1885,255,268,343],[449,918,225,250],[798,918,224,250],[1144,918,224,250],[1523,918,224,250],[1884,918,225,250],[2224,918,226,250]];
    let outsideChanges = 0; const insideChanges = rectangles.map(() => 0);
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
      const offset = (y * a.width + x) * 4;
      if (![0,1,2,3].some(c => a.data[offset+c] !== b.data[offset+c])) continue;
      const rect = rectangles.findIndex(([left,top,width,height]) => x >= left && x < left + width && y >= top && y < top + height);
      if (rect === -1) outsideChanges++; else insideChanges[rect]++;
    }
    return { width: b.width, height: b.height, outsideChanges, insideChanges };
  }, { before: fs.readFileSync(source).toString("base64"), after: fs.readFileSync(enhanced).toString("base64") });
  assert.equal(comparison.width, 2560); assert.equal(comparison.height, 1440);
  assert.equal(comparison.outsideChanges, 0, "Every original text/logo/layout pixel must remain unchanged");
  assert.ok(comparison.insideChanges.every(count => count > 10000), "All eight portrait frames must contain the enhanced image");
  console.log("PASS: all eight portraits updated; every pixel outside portrait frames is identical to the original");
  await pixelPage.close();

  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 } });
  const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
  await context.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, route => route.abort());
  await context.route("**/api/**", route => {
    assert.equal(route.request().method(), "GET", "Public chart must never write data");
    return route.fulfill({ json: { authenticated: false, programs: [], beneficiaries: [] } });
  });
  const page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/#org-structure", { waitUntil: "networkidle" });
  const chart = page.locator("#org-structure");
  const image = chart.getByAltText("PESO EC ACCESS - LGU Dingalan Official Organizational Structure Directory", { exact: true });
  await image.evaluate(image => image.decode());
  assert.equal(await image.getAttribute("src"), "/images/peso-organizational-structure-clear-portraits.png");
  await chart.getByRole("button", { name: "Buong Screen (HD)" }).click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  await dialog.getByRole("button", { name: "100% size", exact: true }).click();
  assert.equal(await dialog.locator("img").evaluate(image => Math.round(image.getBoundingClientRect().width)), 2560);
  await dialog.getByRole("button", { name: "Zoom in", exact: true }).click();
  assert.equal(await dialog.locator("img").evaluate(image => Math.round(image.getBoundingClientRect().width)), 3200);
  await dialog.getByRole("button", { name: "Zoom out", exact: true }).click();
  await dialog.getByRole("button", { name: "Sakto sa screen", exact: true }).click();
  assert.ok(await dialog.locator("img").evaluate(image => image.getBoundingClientRect().width < 1440));
  await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  await page.setViewportSize({ width: 390, height: 844 });
  await chart.getByRole("button", { name: "Buong Screen (HD)" }).click();
  await dialog.getByRole("button", { name: "100% size", exact: true }).click();
  assert.ok(await dialog.locator("img").evaluate(image => image.parentElement.scrollWidth > image.parentElement.clientWidth));
  assert.ok(await dialog.getByRole("button", { name: "Isara ang preview" }).isVisible());
  await dialog.getByRole("button", { name: "Isara ang preview" }).click();
  assert.deepEqual(errors, []);
  console.log("PASS: desktop/mobile chart uses the new asset; native-size zoom, scrolling, fit, Escape and close work");
  await context.close();
} finally { await browser.close(); }
