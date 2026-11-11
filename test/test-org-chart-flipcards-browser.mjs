// Public UI only. All APIs mocked; no real credentials or database writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ serviceWorkers: "block", hasTouch: true, viewport: { width: 1440, height: 1000 } });
await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
await context.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/, route => route.abort());
await context.route("**/api/**", route => {
  assert.equal(route.request().method(), "GET");
  return route.fulfill({ json: { authenticated: false, programs: [], beneficiaries: [] } });
});
const names = ["Hon. Aurora G. Taay", "Albert D. Gaviola, MPA", "Diola G. Sunga", "Jerico S. Mariano", "Jerome U. Llames", "MC Clain Q. Lucero", "John Francis A. Padrones", "Lhenard B. Alpuerto"];
try {
  const page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/#org-structure", { waitUntil: "networkidle" });
  const directory = page.getByTestId("peso-people-directory");
  assert.equal(await directory.getByRole("button").count(), 8);
  assert.equal(await directory.getByText("I-tap para sa detalye", { exact: true }).count(), 0, "Remove the repeated staff-card instruction");
  assert.equal(await directory.getByText("I-tap ang larawan para sa detalye", { exact: true }).count(), 0, "Remove the leadership-card instruction too");
  for (const name of names) {
    const card = directory.getByRole("button", { name: `I-flip ang larawan ni ${name}`, exact: true });
    const article = card.locator("..");
    const caption = article.locator("[data-person-name]");
    const captionBounds = await caption.evaluate(element => ({ left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight }));
    assert.ok((await card.boundingBox()).width < (await article.boundingBox()).width, "Only the picture frame is clickable");
    await caption.click();
    assert.equal(await card.getAttribute("aria-pressed"), "false", "Clicking the stationary caption must not flip the image");
    assert.equal(await card.getAttribute("aria-pressed"), "false");
    assert.equal(await card.getByRole("img", { name: `Larawan ni ${name}` }).count(), 1);
    await card.click();
    assert.equal(await card.getAttribute("aria-pressed"), "true");
    assert.equal(await card.locator(".peso-person-back").getAttribute("aria-hidden"), "false");
    assert.equal(await card.locator(".peso-person-front").getAttribute("aria-hidden"), "true");
    assert.equal(await article.evaluate(element => getComputedStyle(element).transform), "none", "Outer card must not rotate");
    assert.equal(await caption.evaluate(element => getComputedStyle(element).transform), "none", "Name must not rotate");
    assert.deepEqual(await caption.evaluate(element => ({ left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight })), captionBounds, "Name position must remain fixed during a flip");
    assert.ok(await card.locator(".peso-person-back").evaluate(back => back.offsetHeight <= back.parentElement.parentElement.clientHeight + 1), "Details remain inside the photo frame");
    assert.ok((await card.locator(".peso-person-back").textContent()).includes("Posisyon / Designation"));
    assert.ok((await card.locator(".peso-person-back").textContent()).includes("Dingalan, Aurora"));
    assert.equal(await page.getByRole("dialog").count(), 0, "Flipping must not launch the printable-image lightbox");
    await card.click();
    assert.equal(await card.getAttribute("aria-pressed"), "false");
  }
  const first = directory.getByRole("button").nth(0), second = directory.getByRole("button").nth(1);
  await first.focus(); await page.keyboard.press("Enter");
  assert.equal(await first.getAttribute("aria-pressed"), "true");
  assert.equal(await second.getAttribute("aria-pressed"), "false", "Cards flip independently");
  await page.keyboard.press("Escape");
  assert.equal(await first.getAttribute("aria-pressed"), "false");
  await first.focus(); await page.keyboard.press("Space");
  assert.equal(await first.getAttribute("aria-pressed"), "true");
  await page.keyboard.press("Space");
  for (const width of [1440, 1280, 1024, 768, 480, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await directory.evaluate(element => element.scrollWidth <= element.clientWidth), `Directory overflow at ${width}px`);
    const staffRow = directory.getByRole("region", { name: "PESO service staff" });
    assert.equal(await staffRow.locator("article").count(), 6);
    const tops = await staffRow.locator("article").evaluateAll(cards => cards.map(card => Math.round(card.getBoundingClientRect().top)));
    assert.equal(new Set(tops).size, width >= 1024 ? 1 : width >= 640 ? 2 : width >= 420 ? 3 : 6, `Responsive staff row count at ${width}px`);
    assert.ok(await staffRow.evaluate(element => element.scrollWidth <= element.clientWidth), `No staff side-scroll at ${width}px`);
    assert.ok(await staffRow.locator("article").evaluateAll(cards => cards.every(card => card.scrollWidth <= card.clientWidth)), `No card text overflow at ${width}px`);
    assert.ok(await staffRow.locator(".peso-person-photo").evaluateAll(photos => photos.every(photo => photo.clientWidth <= 136)), "Staff portraits stay compact");
    const fit = await directory.locator(".peso-person-face").evaluateAll(faces => faces.every(face => face.scrollHeight <= face.clientHeight + 1 && face.scrollWidth <= face.clientWidth + 1));
    assert.ok(fit, `All front/back content must fit at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await second.tap();
  assert.equal(await second.getAttribute("aria-pressed"), "true");
  await second.tap();
  assert.equal(await second.getAttribute("aria-pressed"), "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await first.locator(".peso-person-inner").evaluate(element => getComputedStyle(element).transitionDuration), "0s");
  await page.setViewportSize({ width: 1440, height: 1000 });
  const longDetails = directory.getByRole("button").nth(3);
  await longDetails.focus(); await page.keyboard.press("Enter");
  const scrollable = longDetails.locator("[data-person-details]");
  if (await scrollable.evaluate(element => element.scrollHeight > element.clientHeight)) {
    await page.keyboard.press("ArrowDown");
    assert.ok(await scrollable.evaluate(element => element.scrollTop > 0), "Long frame details can be scrolled using the keyboard");
  }
  await page.keyboard.press("Escape");
  await first.click();
  await first.screenshot({ path: "node_modules/.cache/peso-picture-frame-back.png" });
  await first.click();
  await directory.screenshot({ path: "node_modules/.cache/peso-people-flip-directory.png" });
  assert.deepEqual(errors, []);
  console.log("PASS: only the 8 picture frames flip; outer cards, names and positions stay fixed");
  console.log("PASS: click/tap, Enter, Space and Escape work; details stay inside each picture frame");
  console.log("PASS: front/back content fits at desktop/tablet/mobile widths; reduced-motion preference is honored");
  console.log("PASS: all six staff fit on one desktop row, with responsive mobile rows and no horizontal scrolling");
} finally { await context.close(); await browser.close(); }
