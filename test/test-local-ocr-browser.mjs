// Run against npm run dev. Install the isolated test driver with:
// npm install --prefix node_modules/.cache/ocr-browser-tools --no-save --package-lock=false playwright
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("../node_modules/.cache/ocr-browser-tools/node_modules/playwright")); }
const base = process.env.OCR_TEST_URL || "http://localhost:3000";
const requested = process.argv.find((value) => value.startsWith("--case="))?.split("=")[1];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const age = (date) => {
  const now = new Date(), birth = new Date(date + "T00:00:00");
  return String(now.getFullYear() - birth.getFullYear() - (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) ? 1 : 0));
};
try {
  const session = await browser.newContext();
  await session.addCookies([{ name: "peso_landing_visited", value: "1", url: base }]);
  const page = await session.newPage();
  const errors = [];
  let cloudRequests = 0;
  page.on("pageerror", (error) => { errors.push(error.message); console.log("Browser error:", error.message); });
  page.on("request", (request) => { if (request.url().includes("/applications/ocr")) cloudRequests++; });
  await page.goto(base + "/apply", { waitUntil: "domcontentloaded", timeout: 30_000 });
  // The server-rendered input can be visible before React attaches onChange.
  await page.waitForFunction(() => {
    const input = document.querySelector('input[type="file"]');
    return input && Object.keys(input).some((key) => key.startsWith("__reactProps$") && typeof input[key]?.onChange === "function");
  });
  await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
  assert.equal(await page.getByLabel("Front ID Picture", { exact: true }).first().isDisabled(), true);
  assert.equal(await page.getByLabel("Back ID Picture", { exact: true }).first().isDisabled(), true);
  assert.equal(await page.getByLabel("Front ID Picture", { exact: true }).nth(1).isDisabled(), true);
  assert.equal(await page.getByLabel("Close-up ID number", { exact: true }).isDisabled(), true);
  assert.equal(await page.getByLabel("TYPE OF ID", { exact: true }).count(), 1, "there is one authoritative applicant ID selector");
  const png = await page.evaluate(() => {
    const image = document.createElement("canvas"); image.width = 1100; image.height = 700;
    const ctx = image.getContext("2d");
    ctx.fillStyle = "#d8edf0"; ctx.fillRect(0, 0, 1100, 700);
    ctx.fillStyle = "#172c40"; ctx.font = "bold 26px Arial";
    ctx.fillText("SYNTHETIC TEST - NOT A VALID ID", 45, 45);
    ctx.font = "bold 24px Arial"; ctx.fillText("PAMBANSANG PAGKAKAKILANLAN", 300, 90);
    ctx.font = "26px Arial"; ctx.fillText("1234-5678-9012-3456", 45, 145);
    ctx.fillStyle = "#aab6bd"; ctx.fillRect(45, 190, 275, 320);
    const field = (label, value, y) => {
      ctx.fillStyle = "#223343"; ctx.font = "17px Arial"; ctx.fillText(label, 400, y);
      ctx.font = "bold 30px Arial"; ctx.fillText(value, 400, y + 35);
    };
    field("Apelyido / Last Name", "DELA CRUZ", 200);
    field("Mga Pangalan / Given Names", "JUAN CARLO", 290);
    field("Gitnang Apelyido / Middle Name", "SANTOS", 380);
    field("Petsa ng Kapanganakan / Date of Birth", "MAY 05, 1982", 470);
    ctx.font = "18px Arial"; ctx.fillText("Tirahan / Address", 45, 570);
    ctx.font = "bold 20px Arial"; ctx.fillText("PUROK 2, BARANGAY PALTIC, DINGALAN, AURORA", 45, 605);
    const multiline = document.createElement("canvas"); multiline.width = 1100; multiline.height = 700;
    const addressCtx = multiline.getContext("2d"); addressCtx.drawImage(image, 0, 0);
    addressCtx.fillStyle = "#d8edf0"; addressCtx.fillRect(25, 540, 1050, 160);
    addressCtx.fillStyle = "#223343"; addressCtx.font = "18px Arial"; addressCtx.fillText("Tirahan / Address", 45, 565);
    addressCtx.font = "bold 22px Arial";
    addressCtx.fillText("PUROK 5 GAWAD KALINGA", 45, 600);
    addressCtx.fillText("BRGY. CARAGSACAN", 45, 635);
    addressCtx.fillText("DINGALAN, AURORA", 45, 670);
    const noAddress = document.createElement("canvas"); noAddress.width = 1100; noAddress.height = 700;
    const noAddressCtx = noAddress.getContext("2d"); noAddressCtx.drawImage(image, 0, 0);
    noAddressCtx.fillStyle = "#d8edf0"; noAddressCtx.fillRect(25, 540, 1050, 160);
    const back = document.createElement("canvas"); back.width = 1100; back.height = 700;
    const backCtx = back.getContext("2d"); backCtx.fillStyle = "#d8edf0"; backCtx.fillRect(0, 0, 1100, 700);
    backCtx.fillStyle = "#223343"; backCtx.font = "bold 26px Arial"; backCtx.fillText("SYNTHETIC TEST - NOT A VALID ID", 45, 45);
    backCtx.font = "20px Arial"; backCtx.fillText("Tirahan / Address", 45, 260);
    backCtx.font = "bold 28px Arial"; backCtx.fillText("PUROK 7, SITIO MALIGAYA", 45, 310);
    backCtx.fillText("BRGY. IBONA", 45, 355); backCtx.fillText("DINGALAN, AURORA", 45, 400);
    backCtx.font = "20px Arial"; backCtx.fillText("Sex MALE", 45, 460);
    const backRotated = document.createElement("canvas"); backRotated.width = 700; backRotated.height = 1100;
    const backRotatedCtx = backRotated.getContext("2d"); backRotatedCtx.translate(700, 0); backRotatedCtx.rotate(Math.PI / 2); backRotatedCtx.drawImage(back, 0, 0);
    const missingPcn = document.createElement("canvas"); missingPcn.width = 1100; missingPcn.height = 700;
    const missingCtx = missingPcn.getContext("2d"); missingCtx.drawImage(image, 0, 0);
    missingCtx.fillStyle = "#d8edf0"; missingCtx.fillRect(30, 115, 1050, 50);
    const pcn = document.createElement("canvas"); pcn.width = 1100; pcn.height = 700;
    const pcnCtx = pcn.getContext("2d"); pcnCtx.drawImage(missingPcn, 0, 0);
    pcnCtx.font = "14px Arial"; pcnCtx.fillStyle = "#53666a"; pcnCtx.fillText("1234–5678–9012–3456", 45, 145);
    const fragments = document.createElement("canvas"); fragments.width = 1100; fragments.height = 700;
    const fragmentsCtx = fragments.getContext("2d"); fragmentsCtx.drawImage(missingPcn, 0, 0);
    fragmentsCtx.font = "18px Arial"; fragmentsCtx.fillStyle = "#53666a";
    for (const [index, group] of ["1234", "5678", "9012", "3456"].entries()) fragmentsCtx.fillText(group, 45 + index * 100, 145 + (index % 2));
    const bottom = document.createElement("canvas"); bottom.width = 1100; bottom.height = 700;
    const bottomCtx = bottom.getContext("2d"); bottomCtx.drawImage(missingPcn, 0, 0);
    bottomCtx.font = "16px Arial"; bottomCtx.fillStyle = "#53666a"; bottomCtx.fillText("1234-5678-9012-3456", 45, 670);
    const closeup = document.createElement("canvas"); closeup.width = 1100; closeup.height = 170;
    const closeupCtx = closeup.getContext("2d"); closeupCtx.fillStyle = "white"; closeupCtx.fillRect(0, 0, 1100, 170);
    closeupCtx.fillStyle = "black"; closeupCtx.font = "22px Arial"; closeupCtx.fillText("PCN", 45, 40);
    closeupCtx.font = "64px Arial"; closeupCtx.fillText("1234 5678 9012 3456", 45, 115);
    const rotated = document.createElement("canvas"); rotated.width = 700; rotated.height = 1100;
    const rotatedCtx = rotated.getContext("2d"); rotatedCtx.translate(700, 0); rotatedCtx.rotate(Math.PI / 2); rotatedCtx.drawImage(image, 0, 0);
    const dim = document.createElement("canvas"); dim.width = 650; dim.height = 414;
    const dimCtx = dim.getContext("2d"); dimCtx.filter = "blur(0.35px) contrast(0.8) brightness(0.85)"; dimCtx.drawImage(image, 0, 0, 650, 414);
    const card = (heading, rows) => {
      const card = document.createElement("canvas"); card.width = 1100; card.height = 700;
      const context = card.getContext("2d"); context.fillStyle = "#d8edf0"; context.fillRect(0, 0, 1100, 700);
      context.fillStyle = "#172c40"; context.font = "bold 26px Arial";
      context.fillText("SYNTHETIC TEST - NOT A VALID ID", 45, 45); context.fillText(heading, 45, 95);
      for (const [label, value, y] of rows) {
        context.font = "18px Arial"; context.fillText(label, 45, y);
        context.font = "bold 30px Arial"; context.fillText(value, 45, y + 35);
      }
      return card;
    };
    const license = card("DRIVER'S LICENSE", [["Last Name, First Name, Middle Name", "DELA CRUZ, JUAN CARLO, SANTOS", 190], ["Date of Birth", "MAY 05, 1982", 290], ["License No.", "N01-23-456789", 390], ["Address", "PUROK 2, BARANGAY PALTIC, DINGALAN", 490]]);
    const passport = card("PASSPORT", [["Surname", "REYES", 190], ["Given Names", "ANA MARIA", 290], ["Date of Birth", "JUNE 21, 1995", 390], ["Passport No.", "P1234567A", 490]]);
    const lto = document.createElement("canvas"); lto.width = 1100; lto.height = 700;
    const lc = lto.getContext("2d"); lc.fillStyle = "#efeee1"; lc.fillRect(0, 0, 1100, 700);
    lc.fillStyle = "#172c40"; lc.font = "bold 19px Arial"; lc.fillText("SYNTHETIC TEST - NOT A VALID ID", 330, 35);
    lc.fillText("LAND TRANSPORTATION OFFICE", 420, 80); lc.font = "bold 24px Arial"; lc.fillText("DRIVER'S LICENSE", 420, 115);
    lc.fillStyle = "#adb7ba"; lc.fillRect(35, 180, 320, 350); lc.fillStyle = "#172c40";
    lc.font = "15px Arial"; lc.fillText("Last Name, First Name, Middle Name", 420, 170);
    lc.font = "bold 25px Arial"; lc.fillText("REYES, MARIA ANA DE LA CRUZ", 420, 205);
    const ltoField = (label, value, x, y) => { lc.font = "14px Arial"; lc.fillText(label, x, y); lc.font = "bold 22px Arial"; lc.fillText(value, x, y + 32); };
    for (const [label, value, x] of [["Nationality", "PHL", 420], ["Sex", "F", 565], ["Date of Birth", "1994/02/17", 660], ["Weight (kg)", "62", 830], ["Height (m)", "1.62", 950]]) ltoField(label, value, x, 255);
    ltoField("Address", "PUROK 4, IBONA, DINGALAN, AURORA", 420, 330);
    ltoField("License No.", "N01-23-456789", 420, 430); ltoField("Expiration Date", "2028/02/17", 720, 430);
    lc.font = "14px Arial"; lc.fillText("Eyes Color BLACK", 420, 535); lc.fillText("Conditions NONE", 420, 600);
    const sidewaysLicense = document.createElement("canvas"); sidewaysLicense.width = 1100; sidewaysLicense.height = 1500;
    const sl = sidewaysLicense.getContext("2d"); sl.fillStyle = "#12364b"; sl.fillRect(0, 0, 1100, 1500);
    sl.translate(550, 750); sl.rotate(Math.PI / 2); sl.drawImage(lto, -550, -350);
    const agencies = [["SSS ID", "SOCIAL SECURITY SYSTEM", "12-3456789-0"], ["PHILHEALTH ID", "PHILHEALTH ID", "12-345678901-2"], ["PAGIBIG ID", "PAG-IBIG", "1234-5678-9012"], ["UMID", "UMID", "1234-5678901-2"], ["TIN ID", "TIN ID", "123-456-789"]].map(([type, heading, number]) => ({ type, number, canvas: card(heading, [["Last Name", "SANTOS", 190], ["Given Names", "MARIA", 290], ["Date of Birth", "DECEMBER 31, 1990", 390], ["", number, 490]]) }));
    const blank = document.createElement("canvas"); blank.width = 800; blank.height = 500;
    const blankCtx = blank.getContext("2d"); blankCtx.fillStyle = "white"; blankCtx.fillRect(0, 0, 800, 500);
    const distractor = document.createElement("canvas"); distractor.width = 1100; distractor.height = 700;
    const distractorCtx = distractor.getContext("2d"); distractorCtx.drawImage(image, 0, 0);
    distractorCtx.fillStyle = "#172c40"; distractorCtx.font = "18px Arial"; distractorCtx.fillText("9999-8888-7777-6666", 750, 45);
    const voter = document.createElement("canvas"); voter.width = 1100; voter.height = 1500;
    const voterCtx = voter.getContext("2d"); voterCtx.fillStyle = "white"; voterCtx.fillRect(0, 0, 1100, 1500);
    voterCtx.fillStyle = "#172c40"; voterCtx.font = "bold 26px Arial"; voterCtx.fillText("SYNTHETIC TEST - NOT A VALID ID", 45, 45);
    voterCtx.fillText("VOTER'S CERTIFICATE", 45, 110);
    voterCtx.font = "22px Arial"; voterCtx.fillText("Precinct ID Number: 7777-8888", 45, 210);
    for (const [label, value, y] of [["Last Name", "SANTOS", 360], ["Given Names", "MARIA", 470], ["Middle Name", "REYES", 580], ["Date of Birth", "DECEMBER 31, 1990", 690]]) {
      voterCtx.font = "18px Arial"; voterCtx.fillText(label, 45, y);
      voterCtx.font = "bold 28px Arial"; voterCtx.fillText(value, 45, y + 40);
    }
    voterCtx.font = "22px Arial"; voterCtx.fillText("V.I.N.", 650, 980);
    voterCtx.font = "bold 26px Arial"; voterCtx.fillText("AB12-3456-7890-1234", 650, 1030);
    const dependentCertificate = document.createElement("canvas"); dependentCertificate.width = 960; dependentCertificate.height = 1280;
    const certCtx = dependentCertificate.getContext("2d"); certCtx.fillStyle = "#c2dee1"; certCtx.fillRect(0, 0, 960, 1280);
    certCtx.fillStyle = "#172c40"; certCtx.font = "bold 24px Arial"; certCtx.fillText("SYNTHETIC TEST - NOT A VALID ID", 35, 45);
    certCtx.fillText("VOTER'S CERTIFICATION", 35, 100);
    certCtx.font = "20px Arial"; certCtx.fillText("Name :", 215, 320);
    certCtx.fillText("REYES, MARIA ANA DE LA CRUZ", 330, 320);
    certCtx.fillText("Date of Birth", 20, 595); certCtx.fillText("02/17/1994", 235, 595);
    certCtx.fillText("Date of Registration", 20, 630); certCtx.fillText("10/11/2021", 235, 630);
    certCtx.fillText("Date Issued", 20, 900); certCtx.fillText("11/20/2025", 235, 900);
    const noBirthCertificate = document.createElement("canvas"); noBirthCertificate.width = 960; noBirthCertificate.height = 1280;
    const noBirthCtx = noBirthCertificate.getContext("2d"); noBirthCtx.drawImage(dependentCertificate, 0, 0);
    noBirthCtx.fillStyle = "#c2dee1"; noBirthCtx.fillRect(230, 570, 200, 35);
    const encoded = (canvas) => canvas.toDataURL().split(",")[1];
    return { sidewaysLicense: encoded(sidewaysLicense), dependentCertificate: encoded(dependentCertificate), noBirthCertificate: encoded(noBirthCertificate), voter: encoded(voter), distractor: encoded(distractor), agencies: agencies.map(({ type, number, canvas }) => ({ type, number, data: encoded(canvas) })), closeup: encoded(closeup), fragments: encoded(fragments), bottom: encoded(bottom), license: encoded(license), passport: encoded(passport), noAddress: encoded(noAddress), back: encoded(back), backRotated: encoded(backRotated), multiline: encoded(multiline), normal: encoded(image), rotated: encoded(rotated), dim: encoded(dim), blank: encoded(blank), pcn: encoded(pcn), missingPcn: encoded(missingPcn) };
  });
  const panel = (dependent = false) => page.locator("section").filter({ has: page.getByRole("heading", { name: dependent ? "Dependent ID Autofill" : "Identification & Applicant ID Autofill", exact: true }) });
  const read = async (name, mimeType, buffer, dependent = false, idType = "NATIONAL ID") => {
    const started = Date.now();
    const selection = page.getByLabel(dependent ? "DEPENDENT TYPE OF ID" : "TYPE OF ID", { exact: true });
    if (await selection.inputValue() !== idType) await selection.selectOption(idType);
    await page.getByLabel("Front ID Picture", { exact: true }).nth(dependent ? 1 : 0).setInputFiles({ name, mimeType, buffer });
    await panel(dependent).getByRole("status").filter({ hasText: /Preparing|Loading|Reading|Enhancing|Checking|Recovering/ }).waitFor({ timeout: 10_000 });
    await panel(dependent).getByRole("status").filter({ hasText: /Nabasa ang ID|Hindi malinaw|Hindi mabuksan/ }).waitFor({ timeout: 150_000 });
    console.log(name, Math.round((Date.now() - started) / 1000) + "s", await panel(dependent).getByRole("status").innerText());
  };
  const fields = async () => ({
    given: await page.getByLabel(/^GIVEN NAME/).inputValue(),
    middle: await page.getByLabel(/^MIDDLE NAME/).inputValue(),
    last: await page.getByLabel(/^LAST NAME/).inputValue(),
    birthday: await page.getByLabel(/^BIRTH DATE/).inputValue(),
    id: await page.getByLabel(/^ID NUMBER/).inputValue(),
    age: await page.locator("input[type=number][readonly]").first().inputValue(),
  });
  const expected = { given: "JUAN CARLO", middle: "SANTOS", last: "DELA CRUZ", birthday: "1982-05-05", id: "1234-5678-9012-3456", age: age("1982-05-05") };
  if (!requested || requested === "sideways-license") {
    await read("synthetic-sideways-license.png", "image/png", Buffer.from(png.sidewaysLicense, "base64"), false, "DRIVER LICENSE ID");
    assert.deepEqual(await fields(), { given: "MARIA ANA", middle: "DE LA CRUZ", last: "REYES", birthday: "1994-02-17", id: "N01-23-456789", age: age("1994-02-17") });
    assert.equal(await page.getByLabel(/^SEX/).inputValue(), "FEMALE");
    assert.equal(await page.getByLabel(/^CIVIL STATUS/).inputValue(), "", "license conditions are not marital status");
    assert.equal(await page.getByLabel(/^STREET \/ PUROK \/ SITIO/).inputValue(), "PUROK 4");
    assert.equal(await page.getByLabel(/^BARANGAY/).inputValue(), "IBONA");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("Sideways license with dark background, surname-first name, separate DOB/expiry columns, sex and address passed.");
  }
  if (!requested || requested === "dependent-certificate") {
    await page.getByLabel(/^GIVEN NAME/).fill("APPLICANT KEEP");
    await page.getByLabel(/^LAST NAME/).fill("UNCHANGED");
    await page.getByLabel(/^ID NUMBER/).fill("KEEP-123456");
    const before = await fields();
    await read("synthetic-dependent-voter-cert.png", "image/png", Buffer.from(png.dependentCertificate, "base64"), true, "VOTER'S CETIFICATE");
    assert.equal(await page.getByLabel(/^DEPENDENT GIVEN NAME/).inputValue(), "MARIA ANA");
    assert.equal(await page.getByLabel(/^DEPENDENT MIDDLE NAME/).inputValue(), "DE LA CRUZ");
    assert.equal(await page.getByLabel(/^DEPENDENT LAST NAME/).inputValue(), "REYES");
    assert.equal(await page.getByLabel(/^DEPENDENT BIRTH DATE/i).inputValue(), "1994-02-17");
    assert.equal(await page.getByLabel(/^AGE\b/).nth(1).inputValue(), age("1994-02-17"));
    assert.deepEqual(await fields(), before, "dependent certificate extraction leaves applicant fields untouched");
    await read("synthetic-cert-without-birthday.png", "image/png", Buffer.from(png.noBirthCertificate, "base64"), true, "VOTER'S CETIFICATE");
    assert.equal(await page.getByLabel(/^DEPENDENT BIRTH DATE/i).inputValue(), "", "registration date cannot fill an unreadable birthday");
    assert.equal(await page.getByLabel(/^AGE\b/).nth(1).inputValue(), "");
    assert.deepEqual(await fields(), before);
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("Dependent combined-name certificate, correct birth-date row, missing birthday and namespace separation passed.");
  }
  if (!requested || requested === "security-qr") {
    const qr = await QRCode.toBuffer(JSON.stringify({ DateIssued: "2021-12-06", Issuer: "SYNTHETIC TEST ONLY", subject: {
      Suffix: "", lName: "REYES", fName: "JUAN", mName: "AGGALO", sex: "Male", DOB: "May 05, 1982", PCN: "1234-5678-9012-3456",
    }, alg: "TEST-ONLY", signature: "NOT-A-VALID-SIGNATURE-".repeat(8) }), { width: 900, margin: 4, color: { dark: "#315e5c", light: "#adc6c6" } });
    await read("synthetic-colored-dense-qr.png", "image/png", qr);
    assert.deepEqual(await fields(), { given: "JUAN", middle: "AGGALO", last: "REYES", birthday: "1982-05-05", age: age("1982-05-05"), id: "1234-5678-9012-3456" });
    assert.equal(await page.getByLabel(/^SEX/).inputValue(), "MALE");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("Colored dense QR recovery preserves encoded double-letter names; decoding is not authentication.");
  }
  if (!requested || requested === "positions") {
    await read("synthetic-national-with-background-number.png", "image/png", Buffer.from(png.distractor, "base64"));
    assert.deepEqual(await fields(), expected, "National ID above-left number beats an unrelated 16-digit number elsewhere in the photo");
    await read("synthetic-portrait-voter-certificate.png", "image/png", Buffer.from(png.voter, "base64"), false, "VOTER'S CETIFICATE");
    assert.deepEqual(await fields(), { given: "MARIA", middle: "REYES", last: "SANTOS", birthday: "1990-12-31", age: age("1990-12-31"), id: "AB12-3456-7890-1234" });
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("National ID above-left PCN and lower-right certificate VIN positions passed.");
  }
  if (!requested || requested === "numbers") {
    for (const agency of png.agencies) {
      await read("synthetic-unlabeled-" + agency.type + ".png", "image/png", Buffer.from(agency.data, "base64"), false, agency.type);
      const values = await fields();
      assert.equal(values.id, agency.number); assert.equal(values.given, "MARIA"); assert.equal(values.last, "SANTOS"); assert.equal(values.birthday, "1990-12-31");
    }
    for (const [name, data] of [["fragmented", png.fragments], ["bottom", png.bottom]]) {
      await read("synthetic-pcn-" + name + ".png", "image/png", Buffer.from(data, "base64"));
      assert.deepEqual(await fields(), expected);
    }
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("Unlabeled agency numbers, separated PCN groups and lower-card PCN passed.");
  }
  if (!requested || requested === "closeup") {
    await read("front-with-unreadable-number.png", "image/png", Buffer.from(png.missingPcn, "base64"));
    assert.equal((await fields()).id, "");
    await page.getByLabel(/^ID NUMBER/).fill("TEMPORARY MANUAL VALUE");
    await page.getByLabel(/^ID NUMBER/).fill("");
    await page.getByLabel("Close-up ID number", { exact: true }).setInputFiles({ name: "pcn-close-up.png", mimeType: "image/png", buffer: Buffer.from(png.closeup, "base64") });
    await panel().getByRole("status").filter({ hasText: /Preparing|Loading|Reading/ }).waitFor();
    await panel().getByRole("status").filter({ hasText: /Nabasa ang ID/ }).waitFor({ timeout: 150_000 });
    assert.equal((await fields()).id, "", "a manually cleared number remains protected until explicitly accepted");
    await page.getByRole("button", { name: "Gamitin ang nabasang ID number", exact: true }).click();
    assert.deepEqual(await fields(), expected, "close-up fills the number without replacing personal details from the full ID");
    await page.getByRole("button", { name: "Alisin ang close-up", exact: true }).click();
    await panel().getByRole("status").filter({ hasText: /Preparing|Loading|Reading/ }).waitFor();
    await panel().getByRole("status").filter({ hasText: /Nabasa ang ID/ }).waitFor({ timeout: 30_000 });
    assert.equal((await fields()).id, "", "removing a close-up clears its OCR-only number");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("Optional number close-up recovery and removal passed.");
  }
  if (!requested || requested === "profiles") {
    await read("synthetic-license.png", "image/png", Buffer.from(png.license, "base64"), false, "DRIVER LICENSE ID");
    assert.deepEqual(await fields(), { ...expected, id: "N01-23-456789" });
    await page.getByLabel("TYPE OF ID", { exact: true }).selectOption("NATIONAL ID");
    await page.getByLabel("Front ID Picture", { exact: true }).first().setInputFiles({ name: "cancelled-national.png", mimeType: "image/png", buffer: Buffer.from(png.normal, "base64") });
    await panel().getByRole("status").filter({ hasText: /Reading front ID/ }).waitFor({ timeout: 30_000 });
    await read("synthetic-passport.png", "image/png", Buffer.from(png.passport, "base64"), false, "PASSPORT");
    assert.deepEqual(await fields(), { given: "ANA MARIA", middle: "", last: "REYES", birthday: "1995-06-21", age: age("1995-06-21"), id: "P1234567A" });
    assert.equal(await page.getByLabel("TYPE OF ID", { exact: true }).inputValue(), "PASSPORT");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("Driver/passport profiles and cancellation while changing ID type passed.");
  }
  if (!requested || requested === "selection") {
    await read("selection-national-id.png", "image/png", Buffer.from(png.normal, "base64"));
    assert.deepEqual(await fields(), expected);
    await page.getByLabel(/^MIDDLE NAME/).fill("MANUAL MIDDLE");
    await page.getByLabel("TYPE OF ID", { exact: true }).selectOption("DRIVER LICENSE ID");
    assert.equal((await fields()).given, "");
    assert.equal((await fields()).id, "");
    assert.equal((await fields()).middle, "MANUAL MIDDLE");
    assert.equal(await page.getByLabel("Front ID Picture", { exact: true }).first().evaluate((input) => input.files.length), 0);
    await page.getByLabel("TYPE OF ID", { exact: true }).selectOption("");
    assert.equal(await page.getByLabel("Front ID Picture", { exact: true }).first().isDisabled(), true);
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    await read("wrong-national-id-for-license.png", "image/png", Buffer.from(png.normal, "base64"), false, "DRIVER LICENSE ID");
    assert.match(await panel().getByRole("status").innerText(), /Pinili ang DRIVER LICENSE ID, pero NATIONAL ID/);
    assert.equal((await fields()).given, "");
    assert.equal((await fields()).id, "");
    assert.equal(await page.getByLabel("TYPE OF ID", { exact: true }).inputValue(), "DRIVER LICENSE ID");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByLabel(/^Email/).fill("synthetic-ocr-test@example.com");
    console.log("ID selection gates uploads, resets old OCR, preserves manual edits and rejects a mismatched picture.");
  }
  for (const [name, data] of [["photo", png.normal], ["rotated", png.rotated], ["dim", png.dim], ["pcn", png.pcn]]) {
    if (requested && requested !== name) continue;
    await read("synthetic-" + name + ".png", "image/png", Buffer.from(data, "base64"));
    const values = await fields(); console.log(name, JSON.stringify(values)); assert.deepEqual(values, expected);
    assert.equal(await page.getByLabel(/^STREET \/ PUROK \/ SITIO/).inputValue(), "PUROK 2");
    assert.equal(await page.getByLabel(/^BARANGAY/).inputValue(), "PALTIC");
  }
  if (!requested || requested === "address") {
    await read("synthetic-multiline-address.png", "image/png", Buffer.from(png.multiline, "base64"));
    assert.deepEqual(await fields(), expected);
    assert.equal(await page.getByLabel(/^STREET \/ PUROK \/ SITIO/).inputValue(), "PUROK 5 GAWAD KALINGA");
    assert.equal(await page.getByLabel(/^BARANGAY/).inputValue(), "CARAGSACAN");
    console.log("Multiline address is separated into Purok/Sitio and Barangay.");
  }
  if (!requested || requested === "address-back") {
    await read("synthetic-front-without-address.png", "image/png", Buffer.from(png.noAddress, "base64"));
    for (const [name, data] of [["back", png.back], ["rotated-back", png.backRotated]]) {
      await page.getByLabel("Back ID Picture", { exact: true }).first().setInputFiles({ name: name + ".png", mimeType: "image/png", buffer: Buffer.from(data, "base64") });
      await panel().getByRole("status").filter({ hasText: /Preparing|Loading|Reading/ }).waitFor();
      await panel().getByRole("status").filter({ hasText: /Nabasa ang ID/ }).waitFor({ timeout: 150_000 });
      assert.deepEqual(await fields(), expected);
      assert.equal(await page.getByLabel(/^STREET \/ PUROK \/ SITIO/).inputValue(), "PUROK 7, SITIO MALIGAYA");
      assert.equal(await page.getByLabel(/^BARANGAY/).inputValue(), "IBONA");
    }
    await page.getByLabel("Back ID Picture", { exact: true }).first().setInputFiles([]);
    await panel().getByRole("status").filter({ hasText: /Preparing|Loading|Reading/ }).waitFor();
    await panel().getByRole("status").filter({ hasText: /Nabasa ang ID/ }).waitFor({ timeout: 30_000 });
    assert.equal(await page.getByLabel(/^STREET \/ PUROK \/ SITIO/).inputValue(), "", "removing the only address source clears stale OCR address");
    console.log("Normal and rotated back-side addresses are read; removal clears stale address.");
  }
  if (!requested || requested === "missing-pcn") {
    await read("synthetic-missing-pcn.png", "image/png", Buffer.from(png.missingPcn, "base64"));
    const values = await fields();
    assert.equal(values.id, "", "an absent PCN must not be replaced by invented digits");
    assert.equal(values.given, "JUAN CARLO");
    assert.match(await panel().getByRole("status").innerText(), /Hindi pa nabasa nang buo ang 16-digit PCN/);
  }
  if (!requested || requested === "partial") {
    await read("synthetic-photo.png", "image/png", Buffer.from(png.normal, "base64"));
    await page.getByLabel("Back ID Picture", { exact: true }).first().setInputFiles({ name: "unreadable.png", mimeType: "image/png", buffer: Buffer.from([0, 1, 2]) });
    await panel().getByRole("status").filter({ hasText: /Preparing|Loading|Reading/ }).waitFor();
    await panel().getByRole("status").filter({ hasText: /May hindi nabasang side/ }).waitFor({ timeout: 30_000 });
    assert.deepEqual(await fields(), expected, "a bad back file does not discard the readable front");
    await page.getByLabel("Back ID Picture", { exact: true }).first().setInputFiles([]);
    await panel().getByRole("status").filter({ hasText: /Preparing|Loading|Reading/ }).waitFor();
    await panel().getByRole("status").filter({ hasText: /Nabasa ang ID/ }).waitFor({ timeout: 30_000 });
    console.log("Partial-side recovery passed.");
  }
  if (!requested || requested === "qr") {
    await page.getByLabel(/^MIDDLE NAME/).fill("MANUAL MIDDLE");
    const qr = await QRCode.toBuffer(JSON.stringify({ PCN: "9876-5432-1098-7654", idType: "NATIONAL ID", Subject: { fName: "MARIA", mName: "REYES", lName: "RAMOS", DOB: "1990-12-31", address: { purok: "PUROK 3", sitio: "SITIO APLAYA", barangay: "PALTIC", municipality: "DINGALAN" } } }), { width: 900, margin: 6 });
    await read("synthetic-qr.png", "image/png", qr);
    assert.deepEqual(await fields(), { given: "MARIA", middle: "MANUAL MIDDLE", last: "RAMOS", birthday: "1990-12-31", id: "9876-5432-1098-7654", age: age("1990-12-31") });
    assert.equal(await page.getByLabel(/^STREET \/ PUROK \/ SITIO/).inputValue(), "PUROK 3, SITIO APLAYA");
    assert.equal(await page.getByLabel(/^BARANGAY/).inputValue(), "PALTIC");
  }
  if (!requested || requested === "pdf") {
    const pdf = new jsPDF({ unit: "pt", format: [1100, 700], orientation: "landscape" });
    pdf.setFontSize(24); pdf.text("SYNTHETIC TEST - NOT A VALID ID", 45, 45); pdf.text("NATIONAL ID", 45, 90);
    pdf.text("4321-8765-2109-6543", 45, 140);
    for (const [label, value, y] of [["Last Name", "REYES", 200], ["Given Names", "ANA MARIA", 290], ["Middle Name", "DEL ROSARIO", 380], ["Date of Birth", "JUNE 21, 1995", 470]]) {
      pdf.setFontSize(17); pdf.text(label, 400, y); pdf.setFontSize(30); pdf.text(value, 400, y + 35);
    }
    await read("synthetic-id.pdf", "application/pdf", Buffer.from(pdf.output("arraybuffer")));
    const values = await fields();
    assert.equal(values.given, "ANA MARIA"); assert.equal(values.last, "REYES"); assert.equal(values.birthday, "1995-06-21"); assert.equal(values.id, "4321-8765-2109-6543");
    assert.equal(values.middle, requested === "pdf" ? "DEL ROSARIO" : "MANUAL MIDDLE");
  }
  if (!requested || requested === "dependent") {
    const before = await fields();
    await read("synthetic-dependent.png", "image/png", Buffer.from(png.normal, "base64"), true);
    assert.equal(await page.getByLabel(/^DEPENDENT GIVEN NAME/).inputValue(), "JUAN CARLO");
    assert.equal(await page.getByLabel(/^DEPENDENT MIDDLE NAME/).inputValue(), "SANTOS");
    assert.equal(await page.getByLabel(/^DEPENDENT LAST NAME/).inputValue(), "DELA CRUZ");
    assert.deepEqual(await fields(), before);
  }
  if (!requested || requested === "rapid") {
    await page.getByLabel("Front ID Picture", { exact: true }).first().setInputFiles({ name: "cancelled-photo.png", mimeType: "image/png", buffer: Buffer.from(png.normal, "base64") });
    await panel().getByRole("status").filter({ hasText: /Reading front ID/ }).waitFor({ timeout: 30_000 });
    const newer = await QRCode.toBuffer(JSON.stringify({ PCN: "9876-5432-1098-7654", Subject: { fName: "MARIA", mName: "REYES", lName: "RAMOS", DOB: "1990-12-31" } }), { width: 900, margin: 6 });
    await read("newer-id.png", "image/png", newer);
    const values = await fields();
    assert.equal(values.given, "MARIA"); assert.equal(values.last, "RAMOS"); assert.equal(values.birthday, "1990-12-31");
    console.log("Cancelled old upload cannot replace the newer result.");
  }
  if (!requested || requested === "blank") {
    await read("synthetic-blank.png", "image/png", Buffer.from(png.blank, "base64"));
    assert.match(await panel().getByRole("status").innerText(), /Hindi malinaw/);
    const values = await fields();
    assert.equal(values.given, ""); assert.equal(values.last, ""); assert.equal(values.birthday, ""); assert.equal(values.id, ""); assert.equal(values.age, "");
    assert.equal(values.middle, requested === "blank" ? "" : "MANUAL MIDDLE");
  }
  assert.deepEqual(errors, []); assert.equal(cloudRequests, 0, "ID images are not sent to cloud OCR");
  console.log("Local browser OCR tests passed.");
} finally { await browser.close(); }
