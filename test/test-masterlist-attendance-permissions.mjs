import assert from "node:assert/strict";
import { canRecordMasterlistAttendance } from "../src/lib/permissions.ts";

for (const role of ["DOMAIN_MASTER", "PESO_ADMIN", "PESO_STAFF"]) {
  assert.equal(canRecordMasterlistAttendance({ role }), true, `${role} can record attendance from the masterlist`);
}

for (const role of ["DOLE_COORDINATOR", "TUPAD_COORDINATOR", "TUPAD_ASSISTING_DOCUMENTOR", "UNKNOWN_ROLE", ""]) {
  assert.equal(canRecordMasterlistAttendance({ role }), false, `${role} cannot record attendance from the masterlist`);
}

for (const user of [null, undefined, {}]) {
  assert.equal(canRecordMasterlistAttendance(user), false, "An authenticated operational role is required");
}

console.log("Masterlist attendance permissions passed for all roles and unauthenticated users.");
