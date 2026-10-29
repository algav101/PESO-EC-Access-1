import assert from "node:assert/strict";
import { calculateAge, createEmptyApplication } from "../src/lib/application-schema.ts";
import { applyOcrAutofill, mapLocalIdentityText, mergeOcrSides } from "../src/lib/ocr/application-id-mapper.ts";
import { combineLocalReadings, fieldCrops, driverFrontFieldCrops, nationalNumberCrops, numberRescueCrops, philsysFrontNumberCrops, philsysBackCivilCrops, parseIdentityQr } from "../src/lib/ocr/local-id-reader.ts";
import { lightDocumentBounds } from "../src/lib/ocr/document-image.ts";
import { extractProfileNumber } from "../src/lib/ocr/id-number-reader.ts";
import { getIdentityProfile } from "../src/lib/ocr/identity-profiles.ts";
import { ID_TYPES } from "../src/lib/application-schema.ts";

for (const type of ID_TYPES) assert.ok(getIdentityProfile(type)?.numberPatterns.length, type + " has an explicit reading profile");
assert.equal(getIdentityProfile("__proto__"), undefined);
const selected = (text, type, qr = {}) => mapLocalIdentityText(text, "APPLICANT", qr, [], type);
const thumbnail = (width, height, card) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const bright = card && x >= card[0] && x < card[2] && y >= card[1] && y < card[3];
    data.set(bright ? [220, 225, 218, 255] : [12, 35, 60, 255], (y * width + x) * 4);
  }
  return data;
};
for (const [width, height, card] of [[180, 120, [20, 20, 160, 100]], [120, 180, [20, 30, 100, 150]]]) {
  const bounds = lightDocumentBounds(thumbnail(width, height, card), width, height);
  assert.ok(bounds && bounds.left <= card[0] / width && bounds.top <= card[1] / height && bounds.left + bounds.width >= card[2] / width && bounds.top + bounds.height >= card[3] / height, "light cards are isolated without trimming printed edges");
}
assert.equal(lightDocumentBounds(thumbnail(180, 120, [0, 0, 180, 120]), 180, 120), null, "an already cropped light page is not cropped again");
assert.equal(lightDocumentBounds(thumbnail(180, 120, [20, 20, 35, 30]), 180, 120), null, "small bright background patches are not ID cards");
assert.equal(lightDocumentBounds(new Uint8ClampedArray(4), 180, 120), null);
const driverOrdered = selected("DRIVER'S LICENSE\nLast Name. Firat Name. Middle Name\nREYES, MARIA ANA DE LA CRUZ\nDate of Birth 1994/02/17\nLicense No. N01-23-456789 2028/02/17", "DRIVER LICENSE ID");
assert.deepEqual([driverOrdered.fields.lastName, driverOrdered.fields.givenName, driverOrdered.fields.middleName, driverOrdered.fields.birthDate, driverOrdered.fields.idNumber], ["REYES", "MARIA ANA", "DE LA CRUZ", "1994-02-17", "N01-23-456789"]);
assert.equal(driverOrdered.fields.civilStatus, undefined, "license marital status is not inferred from unrelated fields");
assert.equal(extractProfileNumber("N01-23-456789 2028/02/17", "DRIVER LICENSE ID", true), "N01-23-456789");
assert.equal(extractProfileNumber("NO1 23 456789", "DRIVER LICENSE ID", true), "N01-23-456789", "OCR glyph recovery is limited to numeric license positions");
assert.equal(extractProfileNumber("N01-23-45678", "DRIVER LICENSE ID", true), "", "missing license digits are never invented");
assert.equal(extractProfileNumber("N01-23-456789 N02-24-123456", "DRIVER LICENSE ID", true), "", "conflicting license tokens require manual review");
assert.deepEqual(driverFrontFieldCrops([], 1600, 1000), [], "layout recovery requires recognized license and DOB anchors");
for (const [type, label, number] of [
  ["DRIVER LICENSE ID", "License No.", "N01-23-456789"],
  ["PASSPORT", "Passport No.", "P1234567A"],
  ["SSS ID", "SS Number", "12-3456789-0"],
  ["UMID", "CRN", "1234-5678901-2"],
  ["TIN ID", "TIN:", "123-456-789"],
  ["PHILHEALTH ID", "PIN:", "12-345678901-2"],
  ["PAGIBIG ID", "MID No.", "1234-5678-9012"],
  ["PRC", "Registration No.", "0123456"],
  ["VOTER'S ID", "VIN:", "1234-5678-9012-3456"],
]) {
  const value = selected(label + " " + number, type);
  assert.equal(value.fields.idNumber, number, type + " follows its own number label without requiring an OCR-readable heading");
  assert.equal(value.fields.idType, type);
}
assert.equal(selected("NATIONAL ID\n1234-5678-9012-3456", "PASSPORT").fields.idNumber, undefined, "a passport profile never guesses a PCN as a passport number");
assert.equal(selected("TIN ID\nTIN: 123-456-789", "TIN ID").fields.idNumber, "123-456-789", "TIN header is not treated as the number");
assert.equal(selected("PCN: 1234-5678-9012-345", "NATIONAL ID").fields.idNumber, undefined);
assert.deepEqual(selected("", "NATIONAL ID").fields, {}, "selecting a type alone does not imply successful OCR");
assert.deepEqual(combineLocalReadings([], "APPLICANT", {}, "NATIONAL ID").fields, {});
assert.equal(selected("", "PASSPORT", { passportNumber: "P1234567A", pcn: "1234-5678-9012-3456" }).fields.idNumber, "P1234567A");
assert.equal(selected("1234\n5678\n9012\n3456", "NATIONAL ID").fields.idNumber, "1234-5678-9012-3456");
assert.equal(selected("1234\n5678-9012-3456", "NATIONAL ID").fields.idNumber, "1234-5678-9012-3456");
assert.equal(selected("1982\n1234\n5678\n9012\n3456", "NATIONAL ID").fields.idNumber, undefined, "extra year cannot be spliced into a fragmented PCN");
assert.equal(selected("License N0. N01-23-456789", "DRIVER LICENSE ID").fields.idNumber, "N01-23-456789");
assert.equal(selected("12\u20133456789\u20130", "SSS ID").fields.idNumber, "12-3456789-0");
assert.equal(selected("12 345678901 2", "PHILHEALTH ID").fields.idNumber, "12-345678901-2");
assert.equal(selected("1234 5678 9012", "PAGIBIG ID").fields.idNumber, "1234-5678-9012");
assert.equal(selected("TIN 123-45G-789", "TIN ID").fields.idNumber, "123-456-789");
assert.equal(extractProfileNumber("Contact Number\n0912345678", "SSS ID"), "");
assert.equal(extractProfileNumber("1234-5678-9012\n4321-8765-2109", "PAGIBIG ID"), "", "ambiguous numbers require review, not first-match selection");
assert.equal(extractProfileNumber("1982-05-05", "PRC", true), "");
assert.equal(extractProfileNumber("PUROK 2", "PWD ID", true), "");
assert.equal(selected("Kalagayang Sibil/MaritalStatus\nMARRIED", "NATIONAL ID").fields.civilStatus, "MARRIED", "joined OCR label words still allow the printed civil status");
for (const type of ["VOTER'S ID", "VOTER'S CETIFICATE"]) {
  for (const label of ["VIN:", "V.I.N.:", "Voter's Identification Number (VIN):"]) {
    assert.equal(selected("Precinct ID Number: 7777-8888\n" + label + " AB12-3456-7890-1234", type).fields.idNumber, "AB12-3456-7890-1234", "specific voter identification label wins over an earlier precinct/reference number");
  }
  assert.equal(selected("Precinct ID Number: 7777-8888\nReceipt Number: 9999-1111", type).fields.idNumber, undefined);
}
for (const birthday of ["MAY05,1982", "05MAY1982", "MAY051982", "MAY O5,1982"]) {
  assert.equal(selected("Birth Date " + birthday, "NATIONAL ID").fields.birthDate, "1982-05-05", "OCR-lost spaces in written birth dates are recovered without using an issue date");
}

const qr = parseIdentityQr(JSON.stringify({
  issuer: { firstName: "WRONG", lastName: "ISSUER" },
  PCN: "1234-5678-9012-3456",
  Subject: { fName: "MARIA", mName: "SANTOS", lName: "SANTOS", DOB: "1990-12-31", mother: { lastName: "OTHER" } },
}));
const qrFields = mapLocalIdentityText("", "APPLICANT", qr);
assert.equal(qrFields.fields.givenName, "MARIA");
assert.equal(qrFields.fields.middleName, "SANTOS");
assert.equal(qrFields.fields.lastName, "SANTOS", "legitimate equal middle name and surname are retained");
assert.equal(qrFields.fields.idNumber, "1234-5678-9012-3456");
assert.ok(!Object.keys(qr).some((key) => /mother|issuer/.test(key)));
const token = "header." + Buffer.from(JSON.stringify({ subject: { fName: "JUAN", lName: "REYES", DOB: "1982-05-05" } })).toString("base64url") + ".signature";
assert.equal(parseIdentityQr(token).fName, "JUAN");
assert.deepEqual(parseIdentityQr("https://example.com/not-an-identity-payload"), {});
assert.deepEqual(parseIdentityQr("a".repeat(65_000)), {});

const mapped = (text) => mapLocalIdentityText(text, "APPLICANT");
const addressOf = (text, qr = {}, layout = []) => {
  const { streetSitio = "", barangay = "" } = mapLocalIdentityText(text, "APPLICANT", qr, layout).fields;
  return { streetSitio, barangay };
};
assert.deepEqual(addressOf("Tirahan / Address\nPUROK 5 GAWAD KALINGA\nBRGY. CARAGSACAN\nDINGALAN, AURORA\nSex MALE"), { streetSitio: "PUROK 5 GAWAD KALINGA", barangay: "CARAGSACAN" });
assert.deepEqual(addressOf("Address: PUROK 2, SITIO MALIGAYA, BARANGAY PALTIC, DINGALAN, AURORA"), { streetSitio: "PUROK 2, SITIO MALIGAYA", barangay: "PALTIC" });
assert.deepEqual(addressOf("Address\nPUROK 4\nBUTAS NA BATO\nDINGALAN AURORA"), { streetSitio: "PUROK 4", barangay: "BUTAS NA BATO" });
assert.deepEqual(addressOf("Address\nPUROK 5\nGAWAD KALINGA\nBRGY. CARAGSACAN\nDINGALAN AURORA"), { streetSitio: "PUROK 5, GAWAD KALINGA", barangay: "CARAGSACAN" });
assert.deepEqual(addressOf("Address PUROK 2 CARAGSACAN DINGALAN AURORA"), { streetSitio: "PUROK 2", barangay: "CARAGSACAN" });
assert.deepEqual(addressOf("Address SITIO APLAYA, BRGY. PALTIC, DINGALAN"), { streetSitio: "SITIO APLAYA", barangay: "PALTIC" }, "sitio names cannot override an explicitly printed barangay");
assert.deepEqual(addressOf("Address SITIO APLAYA"), { streetSitio: "SITIO APLAYA", barangay: "" }, "a sitio named Aplaya is not necessarily Barangay Aplaya");
assert.deepEqual(addressOf("Address DIES 77\nPUROK 3 GAWAD KALINGA, CARAGZACAN, DINGALAN, AURORA"), { streetSitio: "PUROK 3 GAWAD KALINGA", barangay: "CARAGSACAN" }, "security-pattern noise is not prepended to the street; a unique bounded Dingalan barangay OCR typo can be reviewed");
assert.deepEqual(addressOf("Address PUROK 3, CARAGEZACAN, DINGALAN, AURORA"), { streetSitio: "PUROK 3", barangay: "CARAGSACAN" });
assert.equal(addressOf("Address PUROK 3, CARAGZACAN, BALER, AURORA").barangay, "", "fuzzy barangay matching cannot assume Dingalan for another town");
assert.equal(addressOf("Address SITIO PALTOC, DINGALAN").barangay, "", "a near-match sitio name is not promoted into a barangay");
assert.deepEqual(addressOf("Address BRGY. PALTIC, DINGALAN, AURORA"), { streetSitio: "", barangay: "PALTIC" }, "a missing purok is never invented");
assert.deepEqual(addressOf("Address PUROK 3, BRGY. UNREADABLE, DINGALAN, AURORA"), { streetSitio: "PUROK 3", barangay: "" });
assert.equal(addressOf("Address PUROK 3, BRGY. PALTIC, BRGY. IBONA").barangay, "", "conflicting barangays remain unresolved");
assert.equal(addressOf("Address 12 PALTICO STREET, DINGALAN").barangay, "", "substring names cannot select a barangay");
assert.equal(addressOf("Address PUROK 1, BARANGAY PALTIC HEIGHTS, DINGALAN").barangay, "", "a longer unrecognized locality cannot be truncated to a known barangay");
assert.deepEqual(addressOf("Place of Birth\nPALTIC DINGALAN AURORA"), { streetSitio: "", barangay: "" });
const structuredAddressQr = parseIdentityQr(JSON.stringify({ issuer: { address: { barangay: "IBONA" } }, Subject: { address: { purok: "PUROK 6", sitio: "SITIO APLAYA", barangay: "PALTIC", municipality: "DINGALAN", province: "AURORA" } } }));
assert.deepEqual(addressOf("", structuredAddressQr), { streetSitio: "PUROK 6, SITIO APLAYA", barangay: "PALTIC" });
assert.equal(addressOf("", { "address.barangay": "POBLACION", "address.municipality": "BALER" }).barangay, "", "another town's barangay cannot select a Dingalan option");
assert.equal(addressOf("Address BRGY. PALTIC", { "address.barangay": "POBLACION", "address.municipality": "BALER" }).barangay, "", "printed fallback cannot override a foreign QR locality");
assert.deepEqual(addressOf("", { "address.purok": "4", "address.sitio": "MALIGAYA", "address.barangay": "PALTIC" }), { streetSitio: "PUROK 4, SITIO MALIGAYA", barangay: "PALTIC" });
assert.deepEqual(addressOf("", { "birthPlace.barangay": "IBONA", "issuer.address": "BRGY PALTIC" }), { streetSitio: "", barangay: "" });
const qrAddressConflict = combineLocalReadings([{ mapped: mapped("Address PUROK 2, BRGY. PALTIC"), confidence: 90 }], "APPLICANT", { "address.barangay": "IBONA" });
assert.equal(qrAddressConflict.fields.barangay, "IBONA");
assert.equal(qrAddressConflict.fields.streetSitio, undefined, "a partial QR address cannot inherit a purok from another barangay");
assert.equal(combineLocalReadings([{ mapped: mapped("Address PUROK 2, BRGY. PALTIC"), confidence: 90 }], "APPLICANT", { "address.barangay": "POBLACION", "address.municipality": "BALER" }).fields.barangay, undefined);
const result = combineLocalReadings([
  { mapped: mapped("Last Name REYES\nMiddle Name SANTOS\nBirth Date 31/12/1990"), confidence: 75 },
  { mapped: mapped("Last Name REYES\nMiddle Name SANTOS"), confidence: 65 },
  { mapped: mapped("Last Name REYFS"), confidence: 90 },
], "APPLICANT");
assert.equal(result.fields.lastName, "REYES", "agreement across passes wins over one inconsistent recognition");
assert.equal(result.fields.birthDate, "1990-12-31");
assert.equal(result.fields.applicantAge, calculateAge("1990-12-31"));
assert.ok(result.uncertainFields.includes("lastName"), "OCR agreement does not imply verified identity");
const preferredQr = combineLocalReadings([{ mapped: mapped("Last Name WRONG"), confidence: 99 }], "APPLICANT", qr);
assert.equal(preferredQr.fields.lastName, "SANTOS");
assert.equal(preferredQr.fields.applicantAge, calculateAge("1990-12-31"));

const line = (text, left, top, width = 200) => ({ text, left, top, width, height: 20 });
const certificateLayout = [line("Name", 225, 315, 70), line("REYES, MARIA ANA DE LA CRUZ", 345, 315, 430),
  line("Date of Birth", 20, 595, 160), line("02/17/1994", 235, 595, 150),
  line("Date of Registration", 20, 625, 185), line("10/11/2021", 235, 625, 150),
  line("Date Issued", 20, 900, 150), line("11/20/2025", 235, 900, 150)];
const certificateText = "Name\nREYES, MARIA ANA DE LA CRUZ\nDate of Birth\nDate of Registration\n10/11/2021\nDate Issued\n11/20/2025";
const certificate = mapLocalIdentityText(certificateText, "DEPENDENT", {}, certificateLayout, "VOTER'S CETIFICATE");
assert.equal(certificate.fields.dependentLastName, "REYES");
assert.equal(certificate.fields.dependentGivenName, "MARIA ANA");
assert.equal(certificate.fields.dependentMiddleName, "DE LA CRUZ");
assert.equal(certificate.fields.dependentBirthDate, "1994-02-17", "a same-row birthday value wins over registration/issue dates on following rows");
assert.equal(certificate.fields.dependentAge, calculateAge("1994-02-17"));
assert.equal(certificate.fields.givenName, undefined, "dependent certificate extraction cannot change the applicant namespace");
const noBirthdayCertificate = mapLocalIdentityText(certificateText, "DEPENDENT", {}, certificateLayout.filter((row) => row.text !== "02/17/1994"), "VOTER'S CETIFICATE");
assert.equal(noBirthdayCertificate.fields.dependentBirthDate, undefined);
assert.equal(noBirthdayCertificate.fields.dependentAge, undefined, "missing birthday cannot borrow the registration date");
const birthCrop = fieldCrops(certificateLayout, 960, 1280, "VOTER'S CETIFICATE").find((crop) => crop.kind === "date");
assert.ok(birthCrop.top < 595 && birthCrop.top + birthCrop.height <= 625, "birthday crop includes the inline/right-hand value and stops before registration");
for (const label of ["Date of Ragestralion", "Dale of Registration", "Date of Registratlon"]) {
  const typoLayout = certificateLayout.filter((row) => row.text !== "02/17/1994").map((row) => row.text === "Date of Registration" ? { ...row, text: label } : row);
  const crop = fieldCrops(typoLayout, 960, 1280, "VOTER'S CETIFICATE").find((region) => region.kind === "date");
  assert.ok(crop.top + crop.height <= 625, "an OCR-misspelled registration label remains a date-crop boundary");
  assert.equal(mapLocalIdentityText("Date of Birth\n" + label + "\n10/11/2021", "DEPENDENT", {}, typoLayout, "VOTER'S CETIFICATE").fields.dependentBirthDate, undefined);
}
assert.ok(!fieldCrops([line("Lugar ng Kapanganakan / Place of Birth", 20, 500), line("Date of Registration", 20, 550)], 960, 1280, "VOTER'S CETIFICATE").some((crop) => crop.kind === "date"), "place of birth is not a date-of-birth crop");
for (const [text, given, middle, suffix] of [["Name REYES, MARIA ANA DELA CRUZ", "MARIA ANA", "DELA CRUZ", undefined], ["Name REYES JR., MARIA ANA DE LA CRUZ", "MARIA ANA", "DE LA CRUZ", "JR"], ["Name REYES, MARIA A.", "MARIA", undefined, undefined]]) {
  const parsed = selected(text, "VOTER'S CETIFICATE").fields;
  assert.equal(parsed.givenName, given); assert.equal(parsed.middleName, middle); assert.equal(parsed.extensionName, suffix);
}
assert.equal(selected("Name MARIA ANA REYES", "VOTER'S CETIFICATE").fields.givenName, undefined, "an unseparated full name is not guessed");
assert.equal(selected("Mother's Name REYES, MARIA ANA SANTOS", "VOTER'S CETIFICATE").fields.givenName, undefined);
const backStatusRegions = philsysBackCivilCrops([line("Kasarian / Sex", 50, 335)], 1280, 957);
assert.ok(backStatusRegions.some((crop) => crop.left <= 40 && crop.left + crop.width >= 450 && crop.top < 500 && crop.top + crop.height > 540), "physical back status recovery includes the left-hand status value");
assert.deepEqual(philsysBackCivilCrops([], 900, 1300), [], "portrait documents do not inherit physical back coordinates");
const nationalPosition = philsysFrontNumberCrops([line("Apelyido / Last Name", 608, 280)], 1280, 822);
assert.ok(nationalPosition.some((crop) => crop.left <= 115 && crop.left + crop.width >= 530 && crop.top <= 214 && crop.top + crop.height >= 255), "National ID crop covers the above-left PCN area shown in the user's layout, without embedding their personal number");
assert.ok(numberRescueCrops([], 1280, 822, "NATIONAL ID").some((crop) => crop.source === "philsys-position"));
assert.ok(numberRescueCrops([], 1280, 822, "VOTER'S ID").every((crop) => crop.source !== "philsys-position"));
assert.deepEqual(philsysFrontNumberCrops([], 900, 1300), [], "portrait certificates never inherit physical National ID coordinates");
const voterPosition = numberRescueCrops([line("V.I.N.", 650, 900), line("AB12-3456-7890-1234", 650, 935, 330)], 1100, 1500, "VOTER'S CETIFICATE");
assert.ok(voterPosition.some((crop) => crop.source === "label" && crop.left > 600 && crop.top > 850 && crop.top + crop.height >= 955), "a VIN label in the lower-right certificate region drives its own crop");
const voterWithDistractor = fieldCrops([line("Precinct ID Number: 7777-8888", 30, 200, 350), line("V.LN.", 650, 900), line("AB12-3456-7890-1234", 650, 935, 330)], 1100, 1500, "VOTER'S CETIFICATE").find((crop) => crop.kind === "number");
assert.ok(voterWithDistractor.left > 600 && voterWithDistractor.top > 850, "number close-up excludes precinct labels even when OCR confuses the I in VIN with L");
const fragmentedNumber = [line("1234", 30, 120, 50), line("5678", 100, 123, 50), line("9012", 170, 119, 50), line("3456", 240, 122, 50)];
assert.equal(mapLocalIdentityText("unreadable heading", "APPLICANT", {}, fragmentedNumber, "NATIONAL ID").fields.idNumber, "1234-5678-9012-3456", "same-baseline number fragments are reconstructed from geometry");
assert.equal(mapLocalIdentityText("", "APPLICANT", {}, [line("1234", 30, 120, 50), line("567890123456", 700, 120, 220)], "NATIONAL ID").fields.idNumber, undefined, "unrelated distant columns are not concatenated");
const inlineNumber = fieldCrops([line("License No. N01-23-456789", 30, 400, 500), line("Birth Date", 30, 470)], 1100, 700, "DRIVER LICENSE ID").find((crop) => crop.kind === "number");
assert.ok(inlineNumber.top < 400 && inlineNumber.top + inlineNumber.height > 420, "number crop includes an inline value, not only the blank area below its label");
assert.ok(numberRescueCrops([], 1100, 700, "NATIONAL ID").some((crop) => crop.top > 700 * .6), "number rescue includes the lower part of an ePhilID");
const lines = [line("Last Name", 400, 100), line("Given Names", 400, 150), line("ARMANDO", 400, 180), line("Middle Name", 400, 220), line("Address", 400, 260), line("PUROK GAWAD", 400, 290)];
const addressLines = [line("Tirahan / Address", 40, 400), line("PUROK 5 GAWAD KALINGA", 40, 430, 300), line("QR SIGNATURE DATA", 700, 432), line("BRGY. CARAGSACAN", 40, 460), line("DINGALAN, AURORA", 40, 490), line("Sex", 40, 530), line("MALE", 40, 560)];
assert.deepEqual(addressOf("", {}, addressLines), { streetSitio: "PUROK 5 GAWAD KALINGA", barangay: "CARAGSACAN" }, "layout joins address lines without reading the adjacent QR column or next field");
const addressCrop = fieldCrops(addressLines, 1100, 700).find((crop) => crop.kind === "address");
assert.ok(addressCrop.top <= 400 && addressCrop.top + addressCrop.height <= 530);
const manualAddress = applyOcrAutofill({ ...createEmptyApplication(), streetSitio: "PUROK MANUAL", barangay: "IBONA" }, { streetSitio: "PUROK OCR", barangay: "PALTIC" }, new Set(["streetSitio", "barangay"]), "APPLICANT");
assert.equal(manualAddress.streetSitio, "PUROK MANUAL");
assert.equal(manualAddress.barangay, "IBONA");
const noCrossField = mapLocalIdentityText("Last Name\nGiven Names\nARMANDO\nMiddle Name\nAddress\nPUROK GAWAD", "APPLICANT", {}, lines);
assert.equal(mapped("Apelyido / | ast Name\nDELA CRUZ").fields.lastName, "DELA CRUZ", "a damaged bilingual heading is not the surname value");
assert.equal(noCrossField.fields.lastName, undefined, "missing surname cannot consume the next field's value");
assert.equal(noCrossField.fields.middleName, undefined, "address cannot leak into a missing middle name");
const crops = fieldCrops(lines, 1100, 700);
assert.ok(crops.every((crop) => crop.left >= 0 && crop.top >= 0 && crop.left + crop.width <= 1100 && crop.top + crop.height <= 700));
assert.ok(crops.find((crop) => crop.label === "Last Name").top + crops.find((crop) => crop.label === "Last Name").height <= 150);
assert.equal(mapped("Date of issue MAY 05, 2020").fields.birthDate, undefined, "issue dates are never guessed as birthdays");
assert.equal(mapped("Birth Date FEB 31, 1990").fields.birthDate, undefined);
assert.equal(mapped("Birth Date MAY 05, 2099").fields.birthDate, undefined);
const license = mapped("DRIVER'S LICENSE\nLast Name, First Name, Middle Name\nDELA CRUZ, JUAN CARLO, SANTOS\nDate of Birth 1982-05-05\nLicense No. N01-23-456789");
assert.equal(license.fields.lastName, "DELA CRUZ", "comma-separated license names follow the printed label order");
assert.equal(license.fields.givenName, "JUAN CARLO");
assert.equal(license.fields.middleName, "SANTOS");
assert.equal(license.fields.idNumber, "N01-23-456789");
assert.equal(mapped("NATIONAL ID\n1234-5678\n9012-3456").fields.idNumber, "1234-5678-9012-3456");
assert.equal(mapped("NATIONAL ID\nBirth Date MAY 05, 1982\n1234-5678-9012-3456").fields.idNumber, "1234-5678-9012-3456", "birth year cannot become the first PCN group");
assert.equal(mapped("NATIONAL ID\nBirth Date MAY 05, 1982\n1234-5678\n9012-3456").fields.idNumber, "1234-5678-9012-3456");
for (const value of ["1234–5678–9012–3456", "1234.5678.9012.3456", "1234-56 78-9012-3456", "1234\u202f5678\u202f9012\u202f3456", "1234-5G78-9O12-3456"]) {
  assert.equal(mapped("NATIONAL ID\n" + value).fields.idNumber, "1234-5678-9012-3456", "OCR separators and limited digit glyph confusion are normalized");
}
for (const value of ["1234-5678-9012-345", "1234-5678-9012-3456-7", "BILL 1234-5678-9012"]) {
  assert.equal(mapped("NATIONAL ID\nPCN: " + value).fields.idNumber, undefined, "missing/extra digits and words never become a PCN");
}
const pcnPriority = mapLocalIdentityText("NATIONAL ID", "APPLICANT", { psn: "111122223333", pcn: "1234-5678-9012-3456" });
assert.equal(pcnPriority.fields.idNumber, "1234-5678-9012-3456", "PCN wins over a separate PSN regardless of QR key order");
const qrAlias = parseIdentityQr(JSON.stringify({ Subject: { fName: "JUAN" }, "PhilSys Card Number": "1234–5678–9012–3456" }));
assert.equal(mapLocalIdentityText("", "APPLICANT", qrAlias).fields.idNumber, "1234-5678-9012-3456");
assert.equal(mapLocalIdentityText("", "APPLICANT", { idType: "PASSPORT", cardNumber: "P00123A" }).fields.idNumber, "P00123A", "other card numbers retain their alphanumeric format");
const partialNumber = combineLocalReadings([
  { mapped: mapped("NATIONAL ID"), confidence: 80 },
  { mapped: { fields: { idNumber: "1234-5678-9012-345" }, uncertainFields: ["idNumber"] }, confidence: 99, weight: 2 },
], "APPLICANT");
assert.equal(partialNumber.fields.idNumber, undefined, "a generic crop cannot bypass National ID length validation");
const numberRegions = nationalNumberCrops([line("1234–5678–9012–3456", 40, 150, 360), line("MAY 05, 1982", 400, 500)], 1100, 700);
assert.equal(numberRegions[0].singleLine, true);
assert.ok(numberRegions[0].top < 150 && numberRegions[0].top + numberRegions[0].height > 170);
assert.ok(numberRegions.every((region) => region.left >= 0 && region.top >= 0 && region.left + region.width <= 1100 && region.top + region.height <= 700));

const previous = { ...createEmptyApplication(), givenName: "OLD", lastName: "OLD", birthDate: "1982-05-05", applicantAge: 44, dependentGivenName: "KEEP", email: "keep@example.com", fieldSources: { givenName: "OCR", lastName: "OCR", birthDate: "OCR", applicantAge: "CALCULATION", dependentGivenName: "OCR", email: "MANUAL" } };
const reapplied = applyOcrAutofill(previous, { givenName: "NEW" }, new Set(), "APPLICANT");
assert.equal(reapplied.givenName, "NEW");
assert.equal(reapplied.lastName, "", "a missing field on the new upload cannot retain the previous ID's value");
assert.equal(reapplied.birthDate, "");
assert.equal(reapplied.applicantAge, null);
assert.equal(reapplied.dependentGivenName, "KEEP", "applicant replacement does not clear dependent fields");
assert.equal(reapplied.email, "keep@example.com");
const manual = applyOcrAutofill({ ...previous, lastName: "CORRECTED", fieldSources: { ...previous.fieldSources, lastName: "MANUAL" } }, { lastName: "OCR" }, new Set(["lastName"]), "APPLICANT");
assert.equal(manual.lastName, "CORRECTED");
const conflict = mergeOcrSides({ fields: { applicantAge: 20 }, uncertainFields: [] }, { fields: { applicantAge: 30 }, uncertainFields: [] });
assert.equal(conflict.conflicts.length, 1);
console.log("Enhanced local identity reader tests passed.");
