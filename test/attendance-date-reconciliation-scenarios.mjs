import assert from "node:assert/strict";

// Exact regression: AM IN was captured Nov 19, but its stale attendanceDate is
// Nov 16 after Day 1 changed to Nov 19. An empty PM IN must remain recordable.
export async function testAttendanceDateReconciliation({ db, load, admin, request, route }) {
  const program = await db.program.create({ data: { programCode: "DATE-RECONCILE", programName: "Synthetic stale date regression", status: "ACTIVE", startDate: "2026-11-16", requiredWorkDays: 1 } });
  const day = await db.workDay.create({ data: { programId: program.id, dayNumber: 1, workDate: "2026-11-19" } });
  const captured = new Date("2026-11-19T01:42:32.491Z");
  const past = new Date("2026-11-16T01:42:32.491Z");
  const originals = [];
  const cards = [];
  for (let i = 0; i < 6; i++) {
    const person = await db.beneficiary.create({ data: { beneficiaryNumber: `RECONCILE-${i}`, fullName: `SYNTHETIC DATE RECONCILIATION ${i}`, birthday: "1990-01-02" } });
    const pb = await db.programBeneficiary.create({ data: { programId: program.id, beneficiaryId: person.id, designatedNumber: String(i + 1), originalBeneficiary: false } });
    const card = await db.qrCode.create({ data: { programId: program.id, programBeneficiaryId: pb.id, ...load("src/lib/qr.ts").generateBeneficiaryToken(program.id, String(i + 1)) } });
    cards.push(card);
    originals.push(await db.attendanceRecord.create({ data: {
      programId: program.id, programBeneficiaryId: pb.id, workDayId: day.id, attendanceDate: "2026-11-16",
      morningTimeIn: i === 5 ? null : i === 1 ? past : i === 4 ? new Date("2026-11-18T23:30:00Z") : captured,
      afternoonTimeIn: i === 2 ? past : i === 3 ? new Date("2026-11-19T05:00:00Z") : null,
    } }));
  }
  const beforeRepair = await route("attendance").POST(request({ programId: program.id, qrToken: cards[0].publicToken, workDayId: day.id, targetDate: day.workDate, shiftMode: "AFTERNOON_IN" }));
  assert.equal(beforeRepair.status, 409);
  const alert = await beforeRepair.json();
  assert.equal(alert.code, "ATTENDANCE_DATE_MISMATCH"); assert.doesNotMatch(alert.error, /ALREADY SCANNED/);
  assert.equal((await db.attendanceRecord.findUnique({ where: { id: originals[0].id } })).afternoonTimeIn, null);
  const changed = await load("src/app/api/v1/programs/[id]/route.ts").PATCH(request({ startDate: "2026-11-19" }), { params: { id: program.id } });
  assert.equal(changed.status, 200);
  for (const i of [0, 3, 4]) {
    const current = await db.attendanceRecord.findUnique({ where: { id: originals[i].id } });
    assert.equal(current.attendanceDate, day.workDate);
    for (const field of ["morningTimeIn", "morningTimeOut", "afternoonTimeIn", "afternoonTimeOut"]) assert.deepEqual(current[field], originals[i][field], "schedule metadata correction must not change any scan timestamp");
  }
  for (const i of [1, 2, 5]) assert.deepEqual(await db.attendanceRecord.findUnique({ where: { id: originals[i].id } }), originals[i], "genuine old-day, mixed-day and empty records must not be relabelled");
  assert.equal(await db.auditLog.count({ where: { action: "ATTENDANCE_SCHEDULE_DATE_RECONCILED", entityId: { in: originals.map((row) => row.id) } } }), 3);
  const pm = await route("attendance").POST(request({ programId: program.id, qrToken: cards[0].publicToken, workDayId: day.id, targetDate: day.workDate, shiftMode: "AFTERNOON_IN" }));
  assert.equal(pm.status, 200, JSON.stringify(await pm.clone().json()));
  const afterPm = await db.attendanceRecord.findUnique({ where: { id: originals[0].id } });
  assert.ok(afterPm.afternoonTimeIn); assert.deepEqual(afterPm.morningTimeIn, captured);
  assert.equal((await route("attendance").POST(request({ programId: program.id, qrToken: cards[0].publicToken, workDayId: day.id, targetDate: day.workDate, shiftMode: "AFTERNOON_IN" }))).status, 400);
  assert.deepEqual((await db.attendanceRecord.findUnique({ where: { id: originals[0].id } })).afternoonTimeIn, afterPm.afternoonTimeIn, "a true PM duplicate must preserve the first PM timestamp");
  const bulk = await load("src/app/api/v1/programs/[id]/attendance/bulk/route.ts").POST(request({ programBeneficiaryIds: [originals[4].programBeneficiaryId], workDayId: day.id, targetDate: day.workDate, shiftMode: "AFTERNOON_IN" }), { params: { id: program.id } });
  assert.equal(bulk.status, 200); assert.equal((await bulk.json()).updatedCount, 1, "the corrected date must also allow the missing PM shift from the masterlist");
  const safe = load("src/lib/attendance-schedule-reconciliation.ts");
  assert.equal((await db.$transaction((tx) => safe.reconcileAttendanceScheduleDates(tx, program.id, admin.id))).length, 0, "repeat reconciliation must be idempotent");
  console.log("Attendance-date regression passed: stale Nov 16 metadata corrected to Nov 19 only when every saved Manila timestamp agrees; AM timestamps preserved; missing PM IN accepted by QR and masterlist; real PM duplicates blocked; old/mixed/empty histories retained and reconciliation audited.");
}
