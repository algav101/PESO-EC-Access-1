import assert from "node:assert/strict";

function assertTimeInRange(value, start, end) {
  const time = new Date(value).getTime();
  assert.ok(time >= Date.parse(start) && time <= Date.parse(end), `${value} must be within ${start} to ${end}`);
}

// Disposable PostgreSQL fixtures only. Never calls a shared/live database.
export async function testBulkAttendance({ db, load, admin, request, route }) {
  const program = await db.program.create({ data: { programCode: "BULK-ATTENDANCE", programName: "Synthetic multi-selection", status: "ACTIVE", createdById: admin.id } });
  const day = await db.workDay.create({ data: { programId: program.id, dayNumber: 1, workDate: "2026-11-19" } });
  const other = await db.program.create({ data: { programCode: "BULK-OTHER", programName: "Other program with same numbers", status: "ACTIVE" } });
  const otherDay = await db.workDay.create({ data: { programId: other.id, dayNumber: 1, workDate: day.workDate } });
  const wp = await db.tupadWorkProgram.create({ data: { programId: program.id, barangay: "Aplaya", items: { create: { dayNumber: 1, area: "LAPU-LAPU area", specificActivities: "Synthetic cleanup" } } }, include: { items: true } });
  const count = 600;
  await db.beneficiary.createMany({ data: Array.from({ length: count }, (_, i) => ({ id: `bulk-person-${i}`, beneficiaryNumber: `BULK-${i}`, fullName: `BULK SYNTHETIC PERSON ${i}`, birthday: "1990-01-02", barangay: "Aplaya", sitio: "LAPU-LAPU" })) });
  await db.programBeneficiary.createMany({ data: Array.from({ length: count }, (_, i) => ({ id: `bulk-pb-${i}`, programId: program.id, beneficiaryId: `bulk-person-${i}`, designatedNumber: String(i + 1), participationStatus: i === 4 ? "REPLACED" : "ACTIVE", originalBeneficiary: i !== 3 })) });
  const foreign = await db.programBeneficiary.create({ data: { programId: other.id, beneficiaryId: "bulk-person-0", designatedNumber: "1" } });
  await db.orientationAttendance.createMany({ data: Array.from({ length: count }, (_, i) => i).filter((i) => i !== 2).map((i) => ({ programId: program.id, programBeneficiaryId: `bulk-pb-${i}`, status: "PRESENT" })) });
  const originalTime = new Date("2026-11-19T01:00:00Z");
  const prior = await db.attendanceRecord.create({ data: { programId: program.id, workDayId: day.id, programBeneficiaryId: "bulk-pb-1", attendanceDate: day.workDate, morningTimeIn: originalTime } });
  await db.attendanceRecord.create({ data: { programId: program.id, workDayId: day.id, programBeneficiaryId: "bulk-pb-5", attendanceDate: "2026-11-16", afternoonTimeIn: originalTime } });
  const bulk = load("src/app/api/v1/programs/[id]/attendance/bulk/route.ts");
  const body = (ids, extras = {}) => ({ programBeneficiaryIds: ids, workDayId: day.id, targetDate: day.workDate, shiftMode: "MORNING_IN", ...extras });
  const call = (value) => bulk.POST(request(value), { params: { id: program.id } });
  assert.equal((await bulk.POST(new Request("http://synthetic.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "null" }), { params: { id: program.id } })).status, 400);
  for (const bad of [body([]), body(["bulk-pb-0"], { shiftMode: "ALL_DAY" }), body(["bulk-pb-0"], { workDayId: otherDay.id }), body(["bulk-pb-0"], { targetDate: "2026-11-16" }), body(["bulk-pb-0", foreign.id])]) {
    assert.ok((await call(bad)).status >= 400);
  }
  assert.equal(await db.attendanceRecord.count({ where: { programId: program.id } }), 2, "invalid/cross-program requests must write nothing");
  const originalRole = admin.role;
  for (const role of ["DOLE_COORDINATOR", "TUPAD_COORDINATOR", "TUPAD_ASSISTING_DOCUMENTOR", "UNKNOWN_ROLE"]) {
    admin.role = role;
    assert.equal((await call(body(["bulk-pb-0"]))).status, 403, `${role} cannot record masterlist attendance`);
  }
  for (const role of ["DOMAIN_MASTER", "PESO_ADMIN", "PESO_STAFF"]) {
    admin.role = role;
    // Invalid selection reaches validation instead of being rejected for role.
    assert.equal((await call(body([]))).status, 400, `${role} is allowed to access masterlist attendance`);
  }
  assert.equal(await db.attendanceRecord.count({ where: { programId: program.id } }), 2, "denied roles must not modify attendance");
  admin.role = originalRole;
  const sentAt = Date.now();
  const response = await call(body(Array.from({ length: 6 }, (_, i) => `bulk-pb-${i}`), { attendanceTime: "2030-01-01T00:00:00Z" }));
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const result = await response.json();
  assert.equal(result.updatedCount, 2); assert.equal(result.skippedCount, 4);
  assert.deepEqual(result.results.filter((row) => row.status === "RECORDED").map((row) => row.programBeneficiaryId).sort(), ["bulk-pb-0", "bulk-pb-3"]);
  assert.equal((await db.attendanceRecord.findUnique({ where: { id: prior.id } })).morningTimeIn.toISOString(), originalTime.toISOString());
  const saved = await db.attendanceRecord.findFirst({ where: { programBeneficiaryId: "bulk-pb-0" } });
  assertTimeInRange(saved.morningTimeIn, "2026-11-18T22:30:00Z", "2026-11-18T23:00:00Z");
  assert.equal(result.timeRangeLabel, "6:30–7:00 AM");
  for (const row of result.results) {
    if (row.status === "RECORDED") {
      const record = await db.attendanceRecord.findFirst({ where: { programBeneficiaryId: row.programBeneficiaryId, workDayId: day.id } });
      assert.equal(row.attendanceTime, record.morningTimeIn.toISOString(), "report each person's actual saved random time");
    } else assert.equal(row.attendanceTime, null, "skips must not report an unsaved random time");
  }
  assert.ok(saved.createdAt.getTime() >= sentAt && saved.createdAt.getTime() <= Date.now(), "audit creation time must retain the actual processing time");
  assert.equal(saved.source, "MASTERLIST_BULK"); assert.equal(saved.workProgramItemId, wp.items[0].id); assert.equal(saved.scannedById, admin.id);
  assert.equal(await db.attendanceRecord.count({ where: { programId: other.id } }), 0);
  assert.equal(await db.auditLog.count({ where: { action: "ATTENDANCE_RECORDED_FROM_MASTERLIST", metadata: { contains: program.id } } }), 2);
  assert.equal((await (await call(body(["bulk-pb-0", "bulk-pb-3"]))).json()).updatedCount, 0, "repeat click must preserve recorded timestamps");
  assert.equal((await db.attendanceRecord.findUnique({ where: { id: saved.id } })).morningTimeIn.toISOString(), saved.morningTimeIn.toISOString(), "retry must never rerandomize a saved shift");
  await db.systemSetting.upsert({ where: { key: "bypass_three_hour_rule" }, create: { key: "bypass_three_hour_rule", value: "enforce_3hr" }, update: { value: "enforce_3hr" } });
  const duration = await (await call(body(["bulk-pb-0"], { shiftMode: "MORNING_OUT" }))).json();
  assert.equal(duration.updatedCount, 1, "every allowed AM IN/OUT combination must satisfy duration independently of the processing clock");
  const tooShort = await (await call(body(["bulk-pb-1"], { shiftMode: "MORNING_OUT" }))).json();
  assert.equal(tooShort.updatedCount, 0); assert.match(tooShort.results[0].reason, /3 hours/);
  await db.systemSetting.update({ where: { key: "bypass_three_hour_rule" }, data: { value: "true" } });
  admin.role = "PESO_STAFF";
  assert.equal((await (await call(body(["bulk-pb-1"], { shiftMode: "MORNING_OUT" }))).json()).updatedCount, 1);
  admin.role = originalRole;
  assert.equal((await db.attendanceRecord.findUnique({ where: { id: saved.id } })).morningTimeIn.toISOString(), saved.morningTimeIn.toISOString(), "another shift must preserve AM IN");
  for (const shiftMode of ["AFTERNOON_IN", "AFTERNOON_OUT"]) assert.equal((await (await call(body(["bulk-pb-0"], { shiftMode }))).json()).updatedCount, 1);
  const randomized = await db.attendanceRecord.findUnique({ where: { id: saved.id } });
  for (const [field, start, end] of [
    ["morningTimeIn", "2026-11-18T22:30:00Z", "2026-11-18T23:00:00Z"],
    ["morningTimeOut", "2026-11-19T02:30:00Z", "2026-11-19T03:00:00Z"],
    ["afternoonTimeIn", "2026-11-19T04:30:00Z", "2026-11-19T05:00:00Z"],
    ["afternoonTimeOut", "2026-11-19T08:30:00Z", "2026-11-19T09:00:00Z"],
  ]) assertTimeInRange(randomized[field], start, end);
  assert.equal((await (await call(body(["bulk-pb-0"], { shiftMode: "AFTERNOON_IN" }))).json()).updatedCount, 0, "random-time mode must still skip duplicates");
  const nextDay = await db.workDay.create({ data: { programId: program.id, dayNumber: 2, workDate: "2026-12-01" } });
  assert.equal((await (await call(body(["bulk-pb-0"], { workDayId: nextDay.id, targetDate: nextDay.workDate, shiftMode: "MORNING_IN" }))).json()).updatedCount, 1);
  const selectedDate = await db.attendanceRecord.findFirst({ where: { programBeneficiaryId: "bulk-pb-0", workDayId: nextDay.id } });
  assertTimeInRange(selectedDate.morningTimeIn, "2026-11-30T22:30:00Z", "2026-11-30T23:00:00Z");
  const audit = await db.auditLog.findFirst({ where: { action: "ATTENDANCE_RECORDED_FROM_MASTERLIST", entityId: saved.id }, orderBy: { createdAt: "asc" } });
  const metadata = JSON.parse(audit.metadata);
  assert.equal(metadata.attendanceTime, saved.morningTimeIn.toISOString()); assert.equal(metadata.recordedAt, saved.createdAt.toISOString());
  assert.equal(metadata.timePolicy, "RANDOM_WITHIN_PHILIPPINE_TIME_RANGE");
  assert.deepEqual(metadata.timeRange, { start: "2026-11-18T22:30:00.000Z", end: "2026-11-18T23:00:00.000Z" });
  const many = await call(body(Array.from({ length: count - 6 }, (_, i) => `bulk-pb-${i + 6}`)));
  assert.equal(many.status, 200); assert.equal((await many.json()).updatedCount, count - 6, "bulk action must support the entire 500+ roster");
  const batch = await db.attendanceRecord.findMany({ where: { programId: program.id, workDayId: day.id, programBeneficiaryId: { in: Array.from({ length: count - 6 }, (_, i) => `bulk-pb-${i + 6}`) } } });
  for (const record of batch) assertTimeInRange(record.morningTimeIn, "2026-11-18T22:30:00Z", "2026-11-18T23:00:00Z");
  assert.ok(new Set(batch.map((record) => record.morningTimeIn.getTime())).size > 1, "bulk times must be randomized per beneficiary, not once for the entire batch");
  // Shared conditional writer also protects against concurrent single/bulk callers.
  const writer = load("src/lib/attendance-slot-write.ts").writeAttendanceSlot;
  const input = { programId: program.id, workDayId: day.id, attendanceDate: day.workDate, slot: "AFTERNOON_IN", now: new Date(), userId: admin.id, source: "TEST_CONCURRENT", deviceId: "TEST", rows: [{ programBeneficiaryId: "bulk-pb-6" }] };
  const raced = await Promise.all([writer(db, input), writer(db, { ...input, now: new Date(input.now.getTime() + 1000) })]);
  assert.equal(raced[0].length + raced[1].length, 1, "only one concurrent call may write the same timestamp");
  assert.ok(raced.flat()[0].afternoonTimeIn.getTime() === input.now.getTime() || raced.flat()[0].afternoonTimeIn.getTime() === input.now.getTime() + 1000, "QR/default writer must continue using actual time when no assigned time is requested");
  await db.program.update({ where: { id: program.id }, data: { status: "CLOSED" } });
  assert.equal((await call(body(["bulk-pb-6"], { shiftMode: "AFTERNOON_OUT" }))).status, 409);
  console.log("Bulk attendance integration passed: multiple selected records, all 594+ remaining beneficiaries, program/day validation, read-only-role rejection, per-person skip reasons, orientation/inactive/history/duplicate/3-hour checks, automatic work-area assignment, preserved timestamps, audits and concurrent-write protection.");
}
