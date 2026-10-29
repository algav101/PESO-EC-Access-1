// Opt-in local sample verification. Never commit real ID images or expectations.
// Set OCR_SAMPLE_FRONT, optional OCR_SAMPLE_BACK, OCR_SAMPLE_ID_TYPE and
// OCR_SAMPLE_EXPECTED_JSON={"front":{...},"combined":{...}} in this process only.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const front = process.env.OCR_SAMPLE_FRONT, back = process.env.OCR_SAMPLE_BACK;
if (!front || !existsSync(front) || (back && !existsSync(back))) throw new Error("Provide existing local sample paths through OCR_SAMPLE_FRONT/BACK.");
const expected = JSON.parse(process.env.OCR_SAMPLE_EXPECTED_JSON || "{}");
const dependent = process.env.OCR_SAMPLE_SUBJECT === "DEPENDENT";
const base = process.env.OCR_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext();
  await context.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
  const page = await context.newPage();
  const errors = []; let blockedWrites = 0, cloudOcrRequests = 0;
  page.on("pageerror", (error) => errors.push(error.name));
  page.on("request", (request) => { if (request.url().includes("/applications/ocr")) cloudOcrRequests++; });
  await page.route("**/*", (route) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) { blockedWrites++; return route.abort(); }
    return route.continue();
  });
  await page.goto(base + "/apply", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => {
    const input = document.querySelector('input[type="file"]');
    return input && Object.keys(input).some((key) => key.startsWith("__reactProps$") && typeof input[key]?.onChange === "function");
  });
  await page.getByLabel(dependent ? "DEPENDENT TYPE OF ID" : "TYPE OF ID", { exact: true }).selectOption(process.env.OCR_SAMPLE_ID_TYPE || "NATIONAL ID");
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: dependent ? "Dependent ID Autofill" : "Identification & Applicant ID Autofill", exact: true }) });
  const labels = { idNumber: /^ID NUMBER/, givenName: /^GIVEN NAME/, middleName: /^MIDDLE NAME/, lastName: /^LAST NAME/, birthDate: /^BIRTH DATE/, streetSitio: /^STREET \/ PUROK \/ SITIO/, barangay: /^BARANGAY/, sex: /^SEX/, civilStatus: /^CIVIL STATUS/,
    dependentGivenName: /^DEPENDENT GIVEN NAME/, dependentMiddleName: /^DEPENDENT MIDDLE NAME/, dependentLastName: /^DEPENDENT LAST NAME/, dependentBirthDate: /^DEPENDENT BIRTH DATE/i };
  const read = async (side, file, phase) => {
    await page.getByLabel(side + " ID Picture", { exact: true }).nth(dependent ? 1 : 0).setInputFiles(file);
    await panel.getByRole("status").filter({ hasText: /Preparing|Reading|Loading/ }).waitFor({ timeout: 10_000 });
    await panel.getByRole("status").filter({ hasText: /Nabasa ang ID|Hindi malinaw|Hindi mabuksan/ }).waitFor({ timeout: 150_000 });
    const checks = {};
    for (const [key, value] of Object.entries(expected[phase] || {})) {
      const actual = key === "applicantAge" ? await page.locator('input[type="number"][readonly]').first().inputValue()
        : key === "dependentAge" ? await page.getByLabel(/^AGE\b/).nth(1).inputValue() : await page.getByLabel(labels[key]).inputValue();
      checks[key] = actual === String(value);
    }
    // Deliberately log pass/fail only, never raw ID numbers, names or addresses.
    console.log(JSON.stringify({ phase, checks, readerStatus: await panel.getByRole("status").innerText(), cloudOcrRequests, blockedWrites, browserErrors: errors.length }));
    if (Object.values(checks).some((value) => !value) || cloudOcrRequests || blockedWrites || errors.length) process.exitCode = 1;
  };
  await read("Front", front, "front");
  if (back) await read("Back", back, "combined");
} finally { await browser.close(); }
