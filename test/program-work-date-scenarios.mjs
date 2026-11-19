import assert from "node:assert/strict";

// Run by the disposable loopback PostgreSQL suite; never uses the shared DB.
export async function testProgramWorkDateChanges({ db, load, admin, request, route }) {
  const service = load("src/lib/program-work-days.ts");
  const created = await load("src/app/api/v1/programs/route.ts").POST(request({ programCode: "DATE-TEST", programName: "Synthetic work dates", startDate: "2026-11-16", requiredWorkDays: 10 }));
  assert.equal(created.status, 201);
  const program = (await created.json()).program;
  await db.program.update({ where: { id: program.id }, data: { status: "ACTIVE" } });
  const oldDays = await db.workDay.findMany({ where: { programId: program.id }, orderBy: { dayNumber: "asc" } });
  const person = await db.beneficiary.create({ data: { beneficiaryNumber: "DATE-PERSON", fullName: "SYNTHETIC DATE PERSON", birthday: "1990-01-02" } });
  const pb = await db.programBeneficiary.create({ data: { programId: program.id, beneficiaryId: person.id, designatedNumber: "1", originalBeneficiary: false } });
  const qr = await db.qrCode.create({ data: { programId: program.id, programBeneficiaryId: pb.id, ...load("src/lib/qr.ts").generateBeneficiaryToken(program.id, "1") } });
  await db.attendanceRecord.create({ data: { programId: program.id, programBeneficiaryId: pb.id, workDayId: oldDays[0].id, attendanceDate: "2026-11-16", morningTimeIn: new Date("2026-11-16T00:00:00Z") } });
  await db.accomplishmentPhoto.create({ data: { programId: program.id, workDayId: oldDays[0].id, fileKey: "synthetic-date-photo", fileName: "synthetic.jpg", capturedAt: new Date("2026-11-16T00:00:00Z") } });
  const history = async () => JSON.stringify({ attendance: await db.attendanceRecord.findMany({ where: { programId: program.id }, orderBy: { id: "asc" } }), photos: await db.accomplishmentPhoto.findMany({ where: { programId: program.id }, orderBy: { id: "asc" } }) });
  const before = await history();
  const otherDays = await db.workDay.findMany({ where: { programId: { not: program.id } }, orderBy: { id: "asc" } });
  const patch = load("src/app/api/v1/programs/[id]/route.ts").PATCH;
  const updated = await patch(request({ startDate: "2026-11-19" }), { params: { id: program.id } });
  assert.equal(updated.status, 200, JSON.stringify(await updated.clone().json()));
  const days = (await updated.json()).program.workDays;
  assert.equal(days[0].workDate, "2026-11-19");
  assert.deepEqual(days.map((d) => d.id), oldDays.map((d) => d.id), "work day IDs must survive overlapping date changes");
  assert.deepEqual(days.map((d) => d.workDate), ["2026-11-19", "2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-30"]);
  assert.equal(await history(), before, "existing timestamps, dates, record IDs and photo associations must stay unchanged");
  assert.deepEqual(await db.workDay.findMany({ where: { programId: { not: program.id } }, orderBy: { id: "asc" } }), otherDays);
  assert.equal((await load("src/app/api/v1/programs/route.ts").GET(new Request("http://synthetic.test"))).status, 200);
  const stale = await route("attendance").POST(request({ programId: program.id, qrToken: qr.publicToken, workDayId: oldDays[1].id, targetDate: oldDays[1].workDate, shiftMode: "MORNING_IN" }));
  assert.equal(stale.status, 409); assert.match((await stale.json()).error, /schedule changed/i);
  assert.equal(await history(), before);
  const pushed = await load("src/app/api/v1/sync/push/route.ts").POST(request({ transactions: [{ entityType: "ATTENDANCE", clientTransactionId: "date-stale-offline", payload: { programId: program.id, programBeneficiaryId: pb.id, qrToken: qr.publicToken, workDayId: oldDays[1].id, attendanceDate: oldDays[1].workDate, morningTimeIn: "2026-11-17T00:00:00Z" } }] }));
  const pushedResult = await pushed.json();
  assert.equal(pushedResult.accepted.length, 0); assert.match(pushedResult.errors["date-stale-offline"], /schedule changed/i);
  assert.equal(await history(), before);
  for (const startDate of ["2026-02-30", "not-a-date", ""]) {
    assert.equal((await patch(request({ startDate }), { params: { id: program.id } })).status, 400);
    assert.equal((await db.program.findUnique({ where: { id: program.id } })).startDate, "2026-11-19");
  }
  assert.equal((await patch(request({ startDate: "2026-11-19" }), { params: { id: program.id } })).status, 200, "repeated saves are idempotent");
  assert.deepEqual((await db.workDay.findMany({ where: { programId: program.id }, orderBy: { dayNumber: "asc" } })).map((d) => d.id), oldDays.map((d) => d.id));
  // A backward move also overlaps existing dates and must retain all rows.
  assert.equal((await patch(request({ startDate: "2026-11-15" }), { params: { id: program.id } })).status, 200);
  const sunday = await db.workDay.findFirst({ where: { programId: program.id, dayNumber: 1 } });
  assert.equal(sunday.workDate, "2026-11-15", "explicit Sunday start must still be Day 1");
  assert.equal(service.buildProgramWorkDays("2026-11-15", 2)[1].workDate, "2026-11-16");
  assert.equal(await history(), before);
  // A downstream failure must roll back all staged dates and the parent update.
  const rollbackBefore = await db.workDay.findMany({ where: { programId: program.id }, orderBy: { dayNumber: "asc" } });
  await assert.rejects(db.$transaction(async (tx) => { await service.rescheduleProgramWorkDays(tx, { id: program.id, startDate: "2026-12-01", requiredWorkDays: 10 }); throw new Error("synthetic rollback"); }), /synthetic rollback/);
  assert.deepEqual(await db.workDay.findMany({ where: { programId: program.id }, orderBy: { dayNumber: "asc" } }), rollbackBefore);
  console.log("Program start-date integration passed: edited date becomes Day 1, later days keep Sunday-rest policy, overlapping forward/backward moves, stable IDs, unchanged attendance/photos/other programs, invalid-date rollback, repeat saves and stale online/offline scan guards.");
}
