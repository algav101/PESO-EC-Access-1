import assert from "node:assert/strict";

// Called only by the disposable PostgreSQL integration suite; no .env or live DB.
export async function testAutomaticQrDetection({ db, load, admin, request, route }) {
  const qr = load("src/lib/qr.ts");
  const programs = Array.from({ length: 100 }, (_, i) => ({ id: `auto-wp-${i}`, programCode: `AUTO-${i}`, programName: `Automatic program ${i}`, status: "ACTIVE", createdById: admin.id }));
  await db.program.createMany({ data: programs });
  await db.beneficiary.createMany({ data: programs.map((p, i) => ({ id: `auto-person-${i}`, beneficiaryNumber: "001", fullName: `AUTO MASTERLIST PERSON ${i}`, birthday: "1990-01-02" })) });
  await db.programBeneficiary.createMany({ data: programs.map((p, i) => ({ id: `auto-pb-${i}`, programId: p.id, beneficiaryId: `auto-person-${i}`, designatedNumber: "001", originalBeneficiary: false })) });
  await db.workDay.createMany({ data: programs.map((p, i) => ({ id: `auto-day-${i}`, programId: p.id, dayNumber: 1, workDate: "2026-11-04" })) });
  const cards = programs.map((p, i) => ({ programId: p.id, programBeneficiaryId: `auto-pb-${i}`, ...qr.generateBeneficiaryToken(p.id, "001") }));
  assert.equal(new Set(cards.map((c) => c.publicToken)).size, 100);
  assert.ok(cards.every((c) => /^TUPAD-V2-1-[A-F0-9]{48}$/.test(c.publicToken) && qr.verifyTokenHash(c.publicToken, c.tokenHash)));
  await db.qrCode.createMany({ data: cards });
  // All 100 programs share number 001. Resolve only the exact registered program/record.
  const resolver = load("src/lib/program-scan-resolver.ts");
  for (const [i, card] of cards.entries()) {
    const { pb, detected } = await resolver.resolveProgramScan(card.publicToken, programs[0].id, {}, { autoDetect: true });
    assert.equal(pb.id, `auto-pb-${i}`); assert.equal(pb.programId, programs[i].id);
    assert.equal(detected.version, 2); assert.equal(detected.fullName, `AUTO MASTERLIST PERSON ${i}`);
  }
  const cameraLink = await load("src/app/api/v1/work-assignment/lookup/route.ts").GET(new Request(`http://synthetic.test?token=${cards[2].publicToken}&programId=${programs[0].id}&targetDate=2026-11-04`));
  assert.equal(cameraLink.status, 200); assert.match(JSON.stringify(await cameraLink.json()), /AUTO MASTERLIST PERSON 2/);
  const legacy = await db.qrCode.create({ data: { programId: programs[8].id, programBeneficiaryId: "auto-pb-8", publicToken: "TUPAD-DGL-LEGACY-1-12345678", tokenHash: "1".repeat(64) } });
  assert.equal((await resolver.resolveProgramScan(legacy.publicToken, programs[0].id, {}, { autoDetect: true })).pb.id, "auto-pb-8", "exact legacy registrations must survive historical hash conventions");
  for (const i of [0, 1, 2]) {
    const body = { autoDetect: true, qrToken: cards[i].publicToken };
    if (i) body.programId = programs[0].id;
    const found = await route("stub-distribution").POST(request(body));
    assert.equal(found.status, 200, JSON.stringify(await found.clone().json()));
    const result = await found.json();
    assert.equal(result.detected.programId, programs[i].id); assert.equal(result.data.programBeneficiaryId, `auto-pb-${i}`);
    const orientation = await route("orientation").POST(request(body));
    assert.equal(orientation.status, 200); assert.equal((await orientation.json()).data.programId, programs[i].id);
    assert.equal((await route("orientation").POST(request(body))).status, 400, "same-program duplicate orientation must remain blocked");
  }
  // Ignore another displayed program's day/area IDs; retain the requested date and shift.
  const attendance = await route("attendance").POST(request({ autoDetect: true, programId: programs[0].id, qrToken: cards[2].publicToken, workDayId: "auto-day-0", workProgramItemId: "other-program-area", targetDate: "2026-11-04", shiftMode: "MORNING_IN" }));
  assert.equal(attendance.status, 200, JSON.stringify(await attendance.clone().json()));
  assert.equal((await attendance.json()).data.programId, programs[2].id);
  assert.equal(await db.attendanceRecord.count({ where: { programId: programs[0].id } }), 0);
  assert.equal((await db.attendanceRecord.findFirst({ where: { programId: programs[2].id } })).workDayId, "auto-day-2");
  assert.equal((await route("attendance").POST(request({ autoDetect: true, qrToken: cards[2].publicToken, targetDate: "2026-11-04", shiftMode: "MORNING_IN" }))).status, 400);
  assert.equal((await route("attendance").POST(request({ autoDetect: true, qrToken: cards[3].publicToken, targetDate: "2028-01-01", shiftMode: "MORNING_IN" }))).status, 400, "must not silently record the first work day when requested date is absent");
  const preview = await route("payout").POST(request({ autoDetect: true, qrToken: cards[1].publicToken, programId: programs[0].id, isLookupOnly: true }));
  assert.equal(preview.status, 200); assert.equal((await preview.json()).data.programId, programs[1].id);
  assert.equal((await route("payout").POST(request({ qrToken: cards[1].publicToken, programId: programs[1].id, programBeneficiaryId: "auto-pb-0" }))).status, 409, "confirmation cannot target another preview's beneficiary");
  assert.equal((await route("payout").POST(request({ qrToken: cards[1].publicToken, programId: programs[1].id, programBeneficiaryId: "auto-pb-1", status: "PAID", payoutDate: "2026-11-04" }))).status, 200);
  assert.equal(await db.payout.count({ where: { programId: programs[0].id } }), 0);
  assert.equal(await db.payout.count({ where: { programId: programs[1].id } }), 1);
  const before = async () => JSON.stringify(await db.programBeneficiary.findMany({ where: { programId: { in: programs.map((p) => p.id) } }, orderBy: { id: "asc" }, include: { beneficiary: true, orientationAttendance: true, attendanceRecords: true, payouts: true } }));
  const snapshot = await before();
  for (const token of ["UNREGISTERED-CARD", "TUPAD-V2-corrupt", cards[0].publicToken.slice(0, -1) + (cards[0].publicToken.endsWith("A") ? "B" : "A"), JSON.stringify({ version: 1, workProgramId: programs[0].id, beneficiaryId: "auto-person-0", qrId: "forged" })]) {
    assert.ok((await route("orientation").POST(request({ autoDetect: true, qrToken: token, programId: programs[0].id }))).status >= 400);
  }
  const ambiguous = await route("orientation").POST(request({ autoDetect: true, qrToken: "001", programId: programs[0].id }));
  assert.equal(ambiguous.status, 409); assert.match((await ambiguous.json()).error, /AMBIGUOUS QR/);
  assert.equal(await before(), snapshot, "invalid/unknown/ambiguous scans must not mutate any masterlist or field record");
  await db.qrCode.update({ where: { publicToken: cards[3].publicToken }, data: { tokenHash: "0".repeat(64) } });
  const badHash = await route("stub-distribution").POST(request({ autoDetect: true, qrToken: cards[3].publicToken }));
  assert.equal(badHash.status, 409); assert.match((await badHash.json()).error, /Verification token failed/);
  await db.qrCode.update({ where: { publicToken: cards[4].publicToken }, data: { status: "INVALIDATED" } });
  assert.equal((await route("stub-distribution").POST(request({ autoDetect: true, qrToken: cards[4].publicToken }))).status, 404);
  await db.program.update({ where: { id: programs[5].id }, data: { status: "CLOSED" } });
  assert.equal((await route("orientation").POST(request({ autoDetect: true, qrToken: cards[5].publicToken }))).status, 409);
  await db.programBeneficiary.update({ where: { id: "auto-pb-6" }, data: { participationStatus: "WITHDRAWN" } });
  assert.equal((await route("stub-distribution").POST(request({ autoDetect: true, qrToken: cards[6].publicToken }))).status, 404);
  await db.programBeneficiary.delete({ where: { id: "auto-pb-99" } });
  assert.equal((await route("stub-distribution").POST(request({ autoDetect: true, qrToken: cards[99].publicToken }))).status, 404);
  await assert.rejects(() => db.programBeneficiary.create({ data: { programId: programs[0].id, beneficiaryId: "auto-person-99", designatedNumber: "1" } }), (e) => e.code === "P2002");
  const audits = await db.auditLog.findMany({ where: { action: "ATTENDANCE_SCANNED", entityId: (await db.attendanceRecord.findFirst({ where: { programId: programs[2].id } })).id } });
  assert.ok(audits.some((a) => { const m = JSON.parse(a.metadata); return m.qrId && m.programId === programs[2].id && m.programBeneficiaryId === "auto-pb-2" && m.scanResult === "RECORDED" && m.verifiedAt && a.userId === admin.id; }));
  await db.program.update({ where: { id: programs[8].id }, data: { status: "CLOSED" } });
  const registration = await db.$transaction((tx) => load("src/lib/printed-qr-registration.ts").registerPrintedQr(tx, { rawToken: legacy.publicToken, programId: programs[9].id, userId: admin.id }));
  assert.equal(registration.designatedNumber, "001", "legacy reissue must match leading-zero target numbers safely");
  assert.equal((await resolver.resolveProgramScan(legacy.publicToken, programs[0].id, {}, { autoDetect: true })).pb.id, "auto-pb-9");
  // Importing a replacement while another enrollee moves slots must satisfy the
  // new unique index and keep the moving enrollee's existing history attached.
  await db.orientationAttendance.create({ data: { programId: programs[20].id, programBeneficiaryId: "auto-pb-20", scannedById: admin.id } });
  const imported = await load("src/app/api/v1/beneficiaries/import/commit/route.ts").POST(request({ programId: programs[20].id, rows: [
    { fullName: "AUTO MASTERLIST PERSON 20", birthday: "1990-01-02", designatedNumber: "2", barangay: "Aplaya", status: "VALID" },
    { fullName: "AUTO MASTERLIST PERSON 99", birthday: "1990-01-02", designatedNumber: "001", barangay: "Aplaya", status: "VALID" },
  ] }));
  assert.equal(imported.status, 200, JSON.stringify(await imported.clone().json()));
  assert.equal((await db.programBeneficiary.findUnique({ where: { id: "auto-pb-20" } })).designatedNumber, "2");
  assert.equal(await db.orientationAttendance.count({ where: { programBeneficiaryId: "auto-pb-20" } }), 1);
  const finalSlot = await resolver.resolveProgramScan(cards[20].publicToken, programs[0].id, {}, { autoDetect: true });
  assert.equal(finalSlot.pb.beneficiary.fullName, "AUTO MASTERLIST PERSON 99");
  assert.equal(await db.orientationAttendance.count({ where: { programBeneficiaryId: finalSlot.pb.id } }), 0);
  console.log("Automatic QR scenarios passed: 100 programs with #001, registered V2 identities/HMAC, no selection, cross-displayed-program scans, correct attendance day/payout, duplicate prevention, ambiguous numeric QR rejection, unknown/forged/invalidated/inactive/missing enrolment rejection, isolated histories and complete scan audits.");
}
