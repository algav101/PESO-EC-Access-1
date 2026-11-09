import Dexie, { type Table } from "dexie";
import { normalizeQrSlot, registeredQrSlot } from "@/lib/program-qr-slot";
import { format } from "date-fns";
import {
  getPhilippineTime,
  determineAttendanceSlot,
  ATTENDANCE_SLOT_LABELS,
  extractCleanQrToken as canonicalExtractCleanQrToken,
} from "@/lib/utils";
import {
  normalizeBarangayName,
  normalizeSitioName,
} from "@/lib/dingalan-groupings";

export interface CachedProgram {
  id: string;
  programCode: string;
  programName: string;
  municipality: string;
  province: string;
  status: string;
  requiredWorkDays: number;
  morningStart?: string;
  morningEnd?: string;
  afternoonStart?: string;
  afternoonEnd?: string;
  orientationDate?: string;
  payoutDate?: string;
  workDays?: CachedWorkDay[];
}

export interface CachedBeneficiary {
  id: string; // programBeneficiaryId
  programId: string;
  beneficiaryId: string;
  designatedNumber: string;
  fullName: string;
  birthday: string;
  birthdayPin: string; // MM-DD-YYYY
  barangay: string;
  sitio?: string;
  tableNumber?: string;
  qrToken?: string;
  status: string;
  orientationStatus?: "PRESENT" | "ABSENT";
  stubDistributed?: boolean;
  payoutStatus?: string;
  serverStubDistributed?: boolean;
  serverOrientationStatus?: "PRESENT" | "ABSENT";
}

export interface CachedWorkDay {
  id: string;
  programId: string;
  dayNumber: number;
  workDate: string;
  status: string;
}

export interface CachedWorkProgramItem {
  id: string;
  programId: string;
  barangay: string;
  dayNumber: number;
  area: string;
  specificActivities: string;
  totalCount?: number;
  maleCount?: number;
  femaleCount?: number;
}

export interface OfflineAttendanceRecord {
  id?: number;
  programId: string;
  workDayId: string;
  dayNumber?: number;
  programBeneficiaryId: string;
  designatedNumber?: string;
  attendanceDate: string;
  morningTimeIn?: string;
  morningTimeOut?: string;
  afternoonTimeIn?: string;
  afternoonTimeOut?: string;
  workProgramItemId?: string;
  workArea?: string;
  activityName?: string;
  status: string;
  scannedAt: string;
  isSynced?: boolean;
  scannedById?: string;
  scannedByName?: string;
}

export interface OfflineTransaction {
  id?: number;
  clientTransactionId: string;
  deviceId: string;
  entityType: "ATTENDANCE" | "ORIENTATION" | "STUB_DISTRIBUTION" | "PAYOUT" | "PHOTO" | "REPLACEMENT";
  operation: "CREATE" | "UPDATE";
  payload: any;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
  retryCount: number;
  lastError?: string;
  createdAt: string;
  syncStartedAt?: string;
}

export class TupadOfflineDatabase extends Dexie {
  cachedPrograms!: Table<CachedProgram, string>;
  cachedBeneficiaries!: Table<CachedBeneficiary, string>;
  cachedWorkDays!: Table<CachedWorkDay, string>;
  cachedWorkProgramItems!: Table<CachedWorkProgramItem, string>;
  offlineAttendanceRecords!: Table<OfflineAttendanceRecord, number>;
  offlineQueue!: Table<OfflineTransaction, number>;
  cachedQrSlots!: Table<{ publicToken: string; designatedNumber: string }, string>;

  constructor() {
    super("TupadOfflineDB_Dingalan");
    this.version(2).stores({
      cachedPrograms: "id, programCode, status",
      cachedBeneficiaries: "id, programId, designatedNumber, qrToken, barangay, fullName",
      cachedWorkDays: "id, programId, dayNumber, workDate",
      cachedWorkProgramItems: "id, programId, barangay, dayNumber",
      offlineAttendanceRecords: "++id, [programId+workDayId+programBeneficiaryId], programBeneficiaryId, workDayId, attendanceDate",
      offlineQueue: "++id, clientTransactionId, entityType, status, createdAt",
    });
    this.version(3).stores({ cachedQrSlots: "publicToken, designatedNumber" });
    // Existing records are retained. Matrix lookups require the previously missing programId index.
    this.version(4).stores({
      offlineAttendanceRecords: "++id, programId, [programId+workDayId+programBeneficiaryId], programBeneficiaryId, workDayId, attendanceDate",
    });
  }
}

export const offlineDb = new TupadOfflineDatabase();

/**
 * Resolves standard authorization headers from localStorage to prevent 401 Unauthorized during sync
 */
export function getClientAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("peso_jwt_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Clean & extract token string from raw URLs, JSON, or parameters
 */
export function extractCleanQrToken(raw: string): string {
  return canonicalExtractCleanQrToken(raw);
}

/**
 * Intelligent offline beneficiary finder
 * Resolves by exact QR token, token substring, designated number (#1, 001), full name, or ID
 */
export async function findBeneficiaryOffline(
  tokenOrQuery: string,
  targetProgramId?: string
): Promise<CachedBeneficiary | null> {
  if (typeof window === "undefined" || !tokenOrQuery) return null;
  const clean = extractCleanQrToken(tokenOrQuery);
  if (!clean) return null;
  const upperClean = clean.toUpperCase();

  try {
    if (!targetProgramId) throw new Error("Pumili muna ng TUPAD program.");
    const roster = (await offlineDb.cachedBeneficiaries.where("programId").equals(targetProgramId).toArray())
      .filter((b) => ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"].includes(b.status));
    let slot = normalizeQrSlot(clean);
    if (!slot) {
      const reference = await offlineDb.cachedQrSlots.get(upperClean);
      if (reference) slot = reference.designatedNumber;
      // Compatibility with an existing cache before the new reference list was downloaded.
      if (!slot && !(await offlineDb.cachedQrSlots.get("__SYNCED__"))) {
        const known = (await offlineDb.cachedBeneficiaries.toArray()).find((b) => b.qrToken?.toUpperCase() === upperClean);
        if (known?.qrToken) slot = registeredQrSlot(known.qrToken, known.designatedNumber);
      }
    }
    const matches = roster.filter((b) => slot
      ? normalizeQrSlot(b.designatedNumber) === slot
      : b.fullName?.toUpperCase() === upperClean || b.id === clean || b.beneficiaryId === clean);
    // Never choose an arbitrary person when a slot is duplicated.
    return matches.length === 1 ? matches[0] : null;
  } catch (err) {
    console.error("Error finding beneficiary offline:", err);
    return null;
  }
}

/**
 * High-reliability Offline Attendance Recording Engine
 * Enforces duplicate checks on installed unit, resolves work areas, saves locally, and queues for sync
 */
export async function recordOfflineAttendance(params: {
  rawToken: string;
  programId: string;
  workDayId: string;
  shiftMode: string;
  workProgramItemId?: string;
  workArea?: string;
  activityName?: string;
  deviceId?: string;
  bypass3HourRule?: boolean;
}) {
  const { rawToken, programId, workDayId, shiftMode, workProgramItemId, workArea, activityName, deviceId, bypass3HourRule } = params;

  const bene = await findBeneficiaryOffline(rawToken, programId);
  if (!bene) {
    throw new Error(`QR Token or Beneficiary identifier "${rawToken}" not found in offline database cache.`);
  }

  const pht = getPhilippineTime();
  const now = pht.now;
  const todayStr = pht.dateStr;

  // Resolve work day
  let workDay = workDayId ? await offlineDb.cachedWorkDays.get(workDayId) : null;
  if (workDay && workDay.programId !== bene.programId) throw new Error("CANNOT SCAN: Work day belongs to a different program.");
  if (!workDay && programId) {
    const progDays = await offlineDb.cachedWorkDays.where("programId").equals(programId).toArray();
    workDay = progDays.find((d) => d.workDate === todayStr) || progDays[0] || null;
  }

  const attendanceDate = workDay?.workDate || todayStr;
  const dayNumber = workDay?.dayNumber || 1;
  const resolvedProgramId = bene.programId || programId;
  const resolvedWorkDayId = workDay?.id || workDayId || `WD-${dayNumber}`;

  // Resolve Shift Slot in Philippine Standard Time
  let targetSlot: "MORNING_IN" | "MORNING_OUT" | "AFTERNOON_IN" | "AFTERNOON_OUT" = "MORNING_IN";
  if (shiftMode === "MORNING_IN") targetSlot = "MORNING_IN";
  else if (shiftMode === "MORNING_OUT") targetSlot = "MORNING_OUT";
  else if (shiftMode === "AFTERNOON_IN") targetSlot = "AFTERNOON_IN";
  else if (shiftMode === "AFTERNOON_OUT") targetSlot = "AFTERNOON_OUT";
  else {
    // AUTO detection by Philippine Standard Time
    targetSlot = determineAttendanceSlot(pht.timeDecimal);
  }

  const slotLabels = ATTENDANCE_SLOT_LABELS;

  // Find local attendance record for duplicate detection
  const records = await offlineDb.offlineAttendanceRecords
    .where("programBeneficiaryId")
    .equals(bene.id)
    .toArray();

  const existingRecord = records.find(
    (r) => r.programId === resolvedProgramId && (r.workDayId === resolvedWorkDayId || r.attendanceDate === attendanceDate)
  );

  const scannerInfo = existingRecord?.scannedByName ? ` (by ${existingRecord.scannedByName})` : "";

  // Anti-double-scan checks on installed unit
  if (targetSlot === "MORNING_IN" && existingRecord?.morningTimeIn) {
    const loggedTime = format(new Date(existingRecord.morningTimeIn), "hh:mm a");
    return {
      isDuplicate: true,
      slotRecorded: slotLabels[targetSlot],
      message: `ALREADY SCANNED: Morning Time-In (AM IN) for #${bene.designatedNumber} (${bene.fullName}) was already recorded today at ${loggedTime}${scannerInfo}. Double scanning is blocked.`,
      data: {
        designatedNumber: bene.designatedNumber,
        fullName: bene.fullName,
        barangay: bene.barangay,
        sitio: bene.sitio,
        dayNumber,
        workDate: attendanceDate,
        workArea: existingRecord.workArea || workArea,
        activityName: existingRecord.activityName || activityName,
      },
      isOffline: true,
    };
  }

  if (targetSlot === "MORNING_OUT" && existingRecord?.morningTimeOut) {
    const loggedTime = format(new Date(existingRecord.morningTimeOut), "hh:mm a");
    return {
      isDuplicate: true,
      slotRecorded: slotLabels[targetSlot],
      message: `ALREADY SCANNED: Morning Time-Out (AM OUT) for #${bene.designatedNumber} (${bene.fullName}) was already recorded today at ${loggedTime}${scannerInfo}. Double scanning is blocked.`,
      data: {
        designatedNumber: bene.designatedNumber,
        fullName: bene.fullName,
        barangay: bene.barangay,
        sitio: bene.sitio,
        dayNumber,
        workDate: attendanceDate,
        workArea: existingRecord.workArea || workArea,
        activityName: existingRecord.activityName || activityName,
      },
      isOffline: true,
    };
  }

  if (targetSlot === "AFTERNOON_IN" && existingRecord?.afternoonTimeIn) {
    const loggedTime = format(new Date(existingRecord.afternoonTimeIn), "hh:mm a");
    return {
      isDuplicate: true,
      slotRecorded: slotLabels[targetSlot],
      message: `ALREADY SCANNED: Afternoon Time-In (PM IN) for #${bene.designatedNumber} (${bene.fullName}) was already recorded today at ${loggedTime}${scannerInfo}. Double scanning is blocked.`,
      data: {
        designatedNumber: bene.designatedNumber,
        fullName: bene.fullName,
        barangay: bene.barangay,
        sitio: bene.sitio,
        dayNumber,
        workDate: attendanceDate,
        workArea: existingRecord.workArea || workArea,
        activityName: existingRecord.activityName || activityName,
      },
      isOffline: true,
    };
  }

  if (targetSlot === "AFTERNOON_OUT" && existingRecord?.afternoonTimeOut) {
    const loggedTime = format(new Date(existingRecord.afternoonTimeOut), "hh:mm a");
    return {
      isDuplicate: true,
      slotRecorded: slotLabels[targetSlot],
      message: `ALREADY SCANNED: Afternoon Time-Out (PM OUT) for #${bene.designatedNumber} (${bene.fullName}) was already recorded today at ${loggedTime}${scannerInfo}. Double scanning is blocked.`,
      data: {
        designatedNumber: bene.designatedNumber,
        fullName: bene.fullName,
        barangay: bene.barangay,
        sitio: bene.sitio,
        dayNumber,
        workDate: attendanceDate,
        workArea: existingRecord.workArea || workArea,
        activityName: existingRecord.activityName || activityName,
      },
      isOffline: true,
    };
  }

  // =========================================================================
  // 3-HOUR RULE & SEQUENCE CHECKS (Offline Engine)
  // Disabled by default to allow users to record and catch up on backlogs
  // =========================================================================
  const isBypassActive =
    bypass3HourRule === true ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("tupad_bypass_3hr_rule") !== "false" &&
        localStorage.getItem("bypass_three_hour_rule") !== "false"));

  const isEnforceActive =
    typeof window !== "undefined" &&
    (localStorage.getItem("tupad_bypass_3hr_rule") === "false_enforce" ||
      localStorage.getItem("bypass_three_hour_rule") === "false_enforce");

  if (isEnforceActive) {
    const MIN_WORK_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Hours (180 minutes)
    if (targetSlot === "MORNING_OUT" && existingRecord?.morningTimeIn) {
      const amInDate = new Date(existingRecord.morningTimeIn);
      const diffMs = now.getTime() - amInDate.getTime();
      if (diffMs < MIN_WORK_DURATION_MS) {
        const remainingMs = MIN_WORK_DURATION_MS - Math.max(0, diffMs);
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        const elapsedMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
        const unlockTime = new Date(amInDate.getTime() + MIN_WORK_DURATION_MS);
        const amInTimeFormatted = format(amInDate, "hh:mm a");
        const unlockTimeFormatted = format(unlockTime, "hh:mm a");

        const remainingText =
          remainingMinutes >= 60
            ? `${Math.floor(remainingMinutes / 60)} hr ${remainingMinutes % 60} mins`
            : `${remainingMinutes} mins`;
        const elapsedText =
          elapsedMinutes >= 60
            ? `${Math.floor(elapsedMinutes / 60)} hr ${elapsedMinutes % 60} mins`
            : `${elapsedMinutes} mins`;

        throw new Error(
          `TIME-OUT BLOCKED: Morning Time-Out (AM OUT) requires at least 3 hours of active work duration. AM IN was recorded at ${amInTimeFormatted} (elapsed: ${elapsedText}). Re-scanning AM OUT is allowed at or after ${unlockTimeFormatted} (${remainingText} remaining).`
        );
      }
    }

    if (targetSlot === "AFTERNOON_OUT" && existingRecord?.afternoonTimeIn) {
      const pmInDate = new Date(existingRecord.afternoonTimeIn);
      const diffMs = now.getTime() - pmInDate.getTime();
      if (diffMs < MIN_WORK_DURATION_MS) {
        const remainingMs = MIN_WORK_DURATION_MS - Math.max(0, diffMs);
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        const elapsedMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
        const unlockTime = new Date(pmInDate.getTime() + MIN_WORK_DURATION_MS);
        const pmInTimeFormatted = format(pmInDate, "hh:mm a");
        const unlockTimeFormatted = format(unlockTime, "hh:mm a");

        const remainingText =
          remainingMinutes >= 60
            ? `${Math.floor(remainingMinutes / 60)} hr ${remainingMinutes % 60} mins`
            : `${remainingMinutes} mins`;
        const elapsedText =
          elapsedMinutes >= 60
            ? `${Math.floor(elapsedMinutes / 60)} hr ${elapsedMinutes % 60} mins`
            : `${elapsedMinutes} mins`;

        throw new Error(
          `TIME-OUT BLOCKED: Afternoon Time-Out (PM OUT) requires at least 3 hours of active work duration. PM IN was recorded at ${pmInTimeFormatted} (elapsed: ${elapsedText}). Re-scanning PM OUT is allowed at or after ${unlockTimeFormatted} (${remainingText} remaining).`
        );
      }
    }
  }

  // Work Area Matching from Offline Work Program Items
  let resolvedArea = workArea;
  let resolvedActivity = activityName;
  let resolvedItemId = workProgramItemId;

  if (!resolvedArea || resolvedItemId === "AUTO" || !resolvedItemId) {
    const cachedItems = await offlineDb.cachedWorkProgramItems
      .where("programId")
      .equals(resolvedProgramId)
      .toArray();

    const matchingDayItems = cachedItems.filter(
      (it) => it.dayNumber === dayNumber && (!bene.barangay || it.barangay.toUpperCase() === bene.barangay.toUpperCase())
    );

    if (matchingDayItems.length > 0) {
      let targetItem = null;
      if (bene.sitio) {
        targetItem = matchingDayItems.find((it) => it.area.toUpperCase().includes(bene.sitio!.toUpperCase()));
      }
      if (!targetItem) targetItem = matchingDayItems[0];
      if (targetItem) {
        resolvedArea = targetItem.area;
        resolvedActivity = targetItem.specificActivities;
        resolvedItemId = targetItem.id;
      }
    }
  }

  const nowIso = now.toISOString();

  // Save/update locally
  if (existingRecord && existingRecord.id) {
    const updates: Partial<OfflineAttendanceRecord> = {
      isSynced: false,
      workArea: resolvedArea || existingRecord.workArea,
      activityName: resolvedActivity || existingRecord.activityName,
      workProgramItemId: resolvedItemId || existingRecord.workProgramItemId,
      dayNumber: dayNumber || existingRecord.dayNumber,
      designatedNumber: bene.designatedNumber || existingRecord.designatedNumber,
    };
    if (targetSlot === "MORNING_IN") updates.morningTimeIn = nowIso;
    else if (targetSlot === "MORNING_OUT") updates.morningTimeOut = nowIso;
    else if (targetSlot === "AFTERNOON_IN") updates.afternoonTimeIn = nowIso;
    else if (targetSlot === "AFTERNOON_OUT") updates.afternoonTimeOut = nowIso;

    await offlineDb.offlineAttendanceRecords.update(existingRecord.id, updates);
  } else {
    await offlineDb.offlineAttendanceRecords.add({
      programId: resolvedProgramId,
      workDayId: resolvedWorkDayId,
      dayNumber,
      programBeneficiaryId: bene.id,
      designatedNumber: bene.designatedNumber,
      attendanceDate,
      morningTimeIn: targetSlot === "MORNING_IN" ? nowIso : undefined,
      morningTimeOut: targetSlot === "MORNING_OUT" ? nowIso : undefined,
      afternoonTimeIn: targetSlot === "AFTERNOON_IN" ? nowIso : undefined,
      afternoonTimeOut: targetSlot === "AFTERNOON_OUT" ? nowIso : undefined,
      workProgramItemId: resolvedItemId,
      workArea: resolvedArea,
      activityName: resolvedActivity,
      status: "PRESENT",
      scannedAt: nowIso,
      isSynced: false,
    });
  }

  // Queue to offline transactions
  await queueOfflineTransaction("ATTENDANCE", "CREATE", {
    programId: resolvedProgramId,
    workDayId: resolvedWorkDayId,
    dayNumber,
    programBeneficiaryId: bene.id,
    designatedNumber: bene.designatedNumber,
    qrToken: bene.qrToken || rawToken,
    attendanceDate,
    morningTimeIn: targetSlot === "MORNING_IN" ? nowIso : undefined,
    morningTimeOut: targetSlot === "MORNING_OUT" ? nowIso : undefined,
    afternoonTimeIn: targetSlot === "AFTERNOON_IN" ? nowIso : undefined,
    afternoonTimeOut: targetSlot === "AFTERNOON_OUT" ? nowIso : undefined,
    workProgramItemId: resolvedItemId,
    workArea: resolvedArea,
    activityName: resolvedActivity,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("tupad-attendance-updated", {
        detail: {
          programBeneficiaryId: bene.id,
          designatedNumber: bene.designatedNumber,
          workDayId: resolvedWorkDayId,
          dayNumber,
          attendanceDate,
          slot: targetSlot,
        },
      })
    );
  }

  return {
    isDuplicate: false,
    slotRecorded: slotLabels[targetSlot],
    message: `✓ Stored to Installed Unit & Queued for Sync (${slotLabels[targetSlot]})`,
    data: {
      designatedNumber: bene.designatedNumber,
      fullName: bene.fullName,
      barangay: bene.barangay,
      sitio: bene.sitio,
      tableNumber: bene.tableNumber,
      dayNumber,
      workDate: attendanceDate,
      workArea: resolvedArea,
      activityName: resolvedActivity,
    },
    isOffline: true,
  };
}

export const UNSYNCED_QUEUE_STATUSES = ["PENDING", "FAILED", "SYNCING", "CONFLICT"];
export const SYNC_LEASE_MS = 5 * 60 * 1000;

function notifyQueueChanged(enqueued = false) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("tupad-queue-updated", { detail: { enqueued } }));
}

export async function queueOfflineTransaction(
  entityType: OfflineTransaction["entityType"], operation: OfflineTransaction["operation"], payload: any
): Promise<string> {
  const clientTransactionId = "TX-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
  await offlineDb.transaction("rw", offlineDb.offlineQueue, offlineDb.offlineAttendanceRecords, async () => {
    await offlineDb.offlineQueue.add({
      clientTransactionId,
      deviceId: typeof window !== "undefined" ? localStorage.getItem("tupad_device_id") || "BROWSER_DEVICE" : "SERVER",
      entityType, operation, payload, status: "PENDING", retryCount: 0, createdAt: new Date().toISOString(),
    });
    if (entityType === "ATTENDANCE") {
      const rec = await offlineDb.offlineAttendanceRecords.where("[programId+workDayId+programBeneficiaryId]")
        .equals([payload.programId, payload.workDayId, payload.programBeneficiaryId]).first();
      if (rec?.id) await offlineDb.offlineAttendanceRecords.update(rec.id, { isSynced: false });
    }
  });
  notifyQueueChanged(true);
  return clientTransactionId;
}

export async function getPendingQueueCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  return offlineDb.offlineQueue.where("status").anyOf(UNSYNCED_QUEUE_STATUSES).count();
}

/** Recover interrupted requests, not active requests. Keep the original idempotency key. */
export async function recoverInterruptedSync(now = Date.now()) {
  let recovered = 0;
  await offlineDb.transaction("rw", offlineDb.offlineQueue, async () => {
    const rows = await offlineDb.offlineQueue.where("status").equals("SYNCING").toArray();
    for (const row of rows) {
      const started = Date.parse(row.syncStartedAt || row.createdAt);
      if (!Number.isFinite(started) || now - started >= SYNC_LEASE_MS) {
        await offlineDb.offlineQueue.update(row.id!, {
          status: "PENDING", syncStartedAt: undefined,
          lastError: "Previous upload was interrupted. Waiting for server acknowledgment on retry.",
        });
        recovered++;
      }
    }
  });
  if (recovered) notifyQueueChanged();
  return recovered;
}

type SyncResult = {
  accepted: string[]; duplicates: string[]; conflicts: string[]; failed: string[];
  errors: Record<string, string>; authRequired: boolean; remaining: number;
};
let syncInFlight: Promise<SyncResult> | null = null;

/** Serialize tabs when possible; atomic IDB claims also protect browsers without Web Locks. */
export function pushSyncQueue(): Promise<SyncResult> {
  if (syncInFlight) return syncInFlight;
  const run = () => pushClaimedSyncQueue();
  const task = (async () => {
    if (typeof navigator !== "undefined" && navigator.locks) return await navigator.locks.request("tupad-offline-upload", run);
    return run();
  })();
  const pending = task.finally(() => { syncInFlight = null; });
  syncInFlight = pending;
  return pending;
}

async function pushClaimedSyncQueue(): Promise<SyncResult> {
  const result: SyncResult = { accepted: [], duplicates: [], conflicts: [], failed: [], errors: {}, authRequired: false, remaining: 0 };
  if (typeof window === "undefined") return result;
  await recoverInterruptedSync();
  const candidates = await offlineDb.offlineQueue.where("status").anyOf(["PENDING", "FAILED"]).toArray();
  // Preserve chronological order. Photos have separate requests to bound payload size.
  const chunks: OfflineTransaction[][] = [];
  for (const item of candidates) {
    const last = chunks[chunks.length - 1];
    if (item.entityType !== "PHOTO" && last && last[0].entityType !== "PHOTO" && last.length < 20) last.push(item);
    else chunks.push([item]);
  }
  for (const candidatesChunk of chunks) {
    const chunk: OfflineTransaction[] = [];
    await offlineDb.transaction("rw", offlineDb.offlineQueue, async () => {
      for (const candidate of candidatesChunk) {
        const row = await offlineDb.offlineQueue.get(candidate.id!);
        if (!row || !["PENDING", "FAILED"].includes(row.status)) continue;
        await offlineDb.offlineQueue.update(row.id!, { status: "SYNCING", syncStartedAt: new Date().toISOString() });
        chunk.push(row);
      }
    });
    if (!chunk.length) continue;
    notifyQueueChanged();
    try {
      const response = await fetch("/api/v1/sync/push", {
        method: "POST", headers: getClientAuthHeaders(), body: JSON.stringify({ transactions: chunk }),
        signal: AbortSignal.timeout(30000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        result.authRequired = response.status === 401 || response.status === 403;
        throw new Error(result.authRequired
          ? "Sign in again with the authorized scanning account, then retry. Unsynced records are still on this device."
          : body?.error || "Upload failed (HTTP " + response.status + "). Records kept for retry.");
      }
      if (!body || !Array.isArray(body.accepted) || !Array.isArray(body.duplicates) || !Array.isArray(body.conflicts)) {
        throw new Error("Invalid server acknowledgment. Records kept for retry.");
      }
      for (const item of chunk) {
        const txId = item.clientTransactionId;
        if (body.accepted.includes(txId) || body.duplicates.includes(txId)) {
          await offlineDb.transaction("rw", offlineDb.offlineQueue, offlineDb.offlineAttendanceRecords, async () => {
            await offlineDb.offlineQueue.delete(item.id!);
            if (item.entityType === "ATTENDANCE") {
              const { programId, workDayId, programBeneficiaryId } = item.payload;
              const other = (await offlineDb.offlineQueue.where("status").anyOf(UNSYNCED_QUEUE_STATUSES).toArray())
                .some(q => q.entityType === "ATTENDANCE" && q.payload.programId === programId
                  && q.payload.workDayId === workDayId && q.payload.programBeneficiaryId === programBeneficiaryId);
              const rec = await offlineDb.offlineAttendanceRecords.where("[programId+workDayId+programBeneficiaryId]")
                .equals([programId, workDayId, programBeneficiaryId]).first();
              if (rec?.id) await offlineDb.offlineAttendanceRecords.update(rec.id, { isSynced: !other });
            }
          });
          (body.accepted.includes(txId) ? result.accepted : result.duplicates).push(txId);
        } else {
          const conflict = body.conflicts.includes(txId);
          const error = body.errors?.[txId] || (conflict ? "Server conflict. Review before retrying." : "Server did not acknowledge this record.");
          (conflict ? result.conflicts : result.failed).push(txId);
          result.errors[txId] = error;
          await offlineDb.offlineQueue.update(item.id!, {
            status: conflict ? "CONFLICT" : "FAILED", lastError: error,
            syncStartedAt: undefined, retryCount: item.retryCount + 1,
          });
        }
      }
    } catch (error: any) {
      for (const item of chunk) {
        const current = await offlineDb.offlineQueue.get(item.id!);
        if (!current || current.status !== "SYNCING") continue;
        if (!result.failed.includes(item.clientTransactionId)) result.failed.push(item.clientTransactionId);
        result.errors[item.clientTransactionId] = error.message || "Upload interrupted. Retry when online.";
        await offlineDb.offlineQueue.update(item.id!, {
          status: "FAILED", retryCount: item.retryCount + 1,
          lastError: result.errors[item.clientTransactionId], syncStartedAt: undefined,
        });
      }
    }
    notifyQueueChanged();
    if (result.authRequired) break;
  }
  result.remaining = await getPendingQueueCount();
  if (result.accepted.length || result.duplicates.length) {
    window.dispatchEvent(new CustomEvent("tupad-offline-synced", { detail: result }));
    window.dispatchEvent(new CustomEvent("tupad-photos-updated"));
  }
  return result;
}

export async function retryOfflineTransaction(id: number) {
  await offlineDb.transaction("rw", offlineDb.offlineQueue, async () => {
    const row = await offlineDb.offlineQueue.get(id);
    if (row?.status === "FAILED") await offlineDb.offlineQueue.update(id, { status: "PENDING" });
  });
  notifyQueueChanged();
}

export async function retryAllFailedTransactions() {
  await recoverInterruptedSync();
  await offlineDb.offlineQueue.where("status").equals("FAILED").modify({ status: "PENDING" });
  notifyQueueChanged();
}

type CacheUser = { id?: string; role?: string; assignedBarangay?: string | null };
let cacheInFlight: Promise<{ beneficiariesCount: number; attendanceCount: number; scope: string }> | null = null;

/** Stage downloads before writing. Serialize scope changes instead of sharing another account's snapshot. */
export function initializeUserOfflineCache(user?: CacheUser) {
  const previous = cacheInFlight;
  const task = (async () => {
    if (previous) await previous.catch(() => {});
    return downloadOfflineSnapshot(user);
  })();
  cacheInFlight = task;
  void task.finally(() => { if (cacheInFlight === task) cacheInFlight = null; }).catch(() => {});
  return task;
}

async function downloadOfflineSnapshot(user?: CacheUser) {
  if (typeof window === "undefined") throw new Error("Offline cache requires a browser.");
  const auth = getClientAuthHeaders();
  const get = async (url: string, optional = false) => {
    const response = await fetch(url, { headers: auth, cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (optional && response.status === 403) return null;
    if (!response.ok) throw new Error("Cache download failed (HTTP " + response.status + "). Existing device data was kept.");
    return response.json();
  };
  const { programs } = await get("/api/v1/programs");
  if (!Array.isArray(programs)) throw new Error("Invalid program response. Existing cache was kept.");
  const qrData = await get("/api/v1/qr/slots", true);
  if (qrData && !Array.isArray(qrData.slots)) throw new Error("Invalid QR slot response.");
  const beneRows: CachedBeneficiary[] = [];
  const days: CachedWorkDay[] = [];
  const activities: CachedWorkProgramItem[] = [];
  const attendance: OfflineAttendanceRecord[] = [];
  const programRows: CachedProgram[] = [];
  for (const prog of programs) {
    programRows.push({ ...prog, municipality: prog.municipality || "Dingalan", province: prog.province || "Aurora", requiredWorkDays: prog.requiredWorkDays || 10 });
    for (const wd of prog.workDays || []) days.push({ ...wd, programId: prog.id });
    const wpData = await get("/api/v1/programs/" + prog.id + "/work-program", true);
    if (wpData && !Array.isArray(wpData.workPrograms)) throw new Error("Invalid work program response.");
    for (const wp of wpData?.workPrograms || []) {
      for (const it of wp.items || []) activities.push({ ...it, programId: prog.id, barangay: wp.barangay });
    }
    const query = user?.assignedBarangay ? "?barangay=" + encodeURIComponent(normalizeBarangayName(user.assignedBarangay)) : "";
    const { beneficiaries } = await get("/api/v1/programs/" + prog.id + "/beneficiaries" + query);
    if (!Array.isArray(beneficiaries)) throw new Error("Invalid beneficiary response. Existing cache was kept.");
    for (const pb of beneficiaries) {
      const birthday = (pb.beneficiary?.birthday || "").slice(0, 10);
      const parts = birthday.split("-");
      const brgy = normalizeBarangayName(pb.beneficiary?.barangay);
      const stub = Boolean(pb.stubDistributions?.some((s: any) => s.status === "DISTRIBUTED"));
      const orientation = pb.orientationAttendance?.some((o: any) => o.status === "PRESENT") ? "PRESENT" : "ABSENT";
      beneRows.push({
        id: pb.id, programId: prog.id, beneficiaryId: pb.beneficiaryId,
        designatedNumber: pb.designatedNumber, fullName: pb.beneficiary?.fullName || "",
        birthday, birthdayPin: parts.length === 3 ? parts[1] + "-" + parts[2] + "-" + parts[0] : "",
        barangay: brgy, sitio: normalizeSitioName(pb.beneficiary?.sitio, brgy), tableNumber: pb.tableNumber || "",
        qrToken: (pb.qrCodes?.find((q: any) => q.status === "ACTIVE") || pb.qrCodes?.[0])?.publicToken || "",
        status: pb.participationStatus || "ACTIVE",
        stubDistributed: stub, serverStubDistributed: stub,
        orientationStatus: orientation, serverOrientationStatus: orientation,
        payoutStatus: pb.payouts?.find((p: any) => p.status === "PAID")?.status || "PENDING",
      });
      for (const rec of pb.attendanceRecords || []) attendance.push({
        programId: prog.id, workDayId: rec.workDayId, programBeneficiaryId: pb.id,
        designatedNumber: pb.designatedNumber, attendanceDate: rec.attendanceDate || "",
        morningTimeIn: rec.morningTimeIn, morningTimeOut: rec.morningTimeOut,
        afternoonTimeIn: rec.afternoonTimeIn, afternoonTimeOut: rec.afternoonTimeOut,
        status: rec.status || "PRESENT", scannedAt: rec.morningTimeIn || new Date().toISOString(),
        scannedById: rec.scannedById, scannedByName: rec.scannedBy?.fullName, isSynced: true,
      });
    }
  }
  if (getClientAuthHeaders().Authorization !== auth.Authorization) throw new Error("Account changed during download. Please refresh again.");
  await offlineDb.transaction("rw", [
    offlineDb.cachedPrograms, offlineDb.cachedWorkDays, offlineDb.cachedWorkProgramItems,
    offlineDb.cachedBeneficiaries, offlineDb.cachedQrSlots, offlineDb.offlineQueue, offlineDb.offlineAttendanceRecords,
  ], async () => {
    const queue = await offlineDb.offlineQueue.where("status").anyOf(UNSYNCED_QUEUE_STATUSES).toArray();
    const existingBenes = await offlineDb.cachedBeneficiaries.toArray();
    for (const bene of beneRows) {
      for (const tx of queue) {
        if (tx.payload.programId !== bene.programId || tx.payload.programBeneficiaryId !== bene.id) continue;
        if (tx.entityType === "STUB_DISTRIBUTION") bene.stubDistributed = true;
        if (tx.entityType === "ORIENTATION") bene.orientationStatus = tx.payload.status || "PRESENT";
        if (tx.entityType === "PAYOUT") bene.payoutStatus = tx.payload.status;
      }
    }
    const retained = existingBenes.filter(b => !beneRows.some(n => n.id === b.id)
      && queue.some(q => q.payload.programId === b.programId && q.payload.programBeneficiaryId === b.id));
    await offlineDb.cachedPrograms.clear();
    await offlineDb.cachedWorkDays.clear();
    await offlineDb.cachedWorkProgramItems.clear();
    await offlineDb.cachedBeneficiaries.clear();
    await offlineDb.cachedPrograms.bulkPut(programRows);
    await offlineDb.cachedWorkDays.bulkPut(days);
    await offlineDb.cachedWorkProgramItems.bulkPut(activities);
    await offlineDb.cachedBeneficiaries.bulkPut([...beneRows, ...retained]);
    if (qrData) {
      await offlineDb.cachedQrSlots.clear();
      await offlineDb.cachedQrSlots.bulkPut(qrData.slots);
      await offlineDb.cachedQrSlots.put({ publicToken: "__SYNCED__", designatedNumber: "" });
    }
    for (const rec of attendance) {
      const local = await offlineDb.offlineAttendanceRecords.where("[programId+workDayId+programBeneficiaryId]")
        .equals([rec.programId, rec.workDayId, rec.programBeneficiaryId]).first();
      const pending = queue.some(q => q.entityType === "ATTENDANCE" && q.payload.programId === rec.programId
        && q.payload.workDayId === rec.workDayId && q.payload.programBeneficiaryId === rec.programBeneficiaryId);
      if (local?.id) {
        const merged = { ...rec, isSynced: !pending };
        if (pending || local.isSynced === false) {
          for (const field of ["morningTimeIn", "morningTimeOut", "afternoonTimeIn", "afternoonTimeOut"] as const) {
            if (local[field]) merged[field] = local[field];
          }
          merged.isSynced = false;
        }
        await offlineDb.offlineAttendanceRecords.update(local.id, merged);
      } else await offlineDb.offlineAttendanceRecords.add({ ...rec, isSynced: !pending });
    }
    // Restore queued timestamps even if an older app version previously overwrote the local mirror.
    for (const tx of queue.filter(q => q.entityType === "ATTENDANCE")) {
      const { programId, workDayId, programBeneficiaryId } = tx.payload;
      if (!programId || !workDayId || !programBeneficiaryId) continue;
      const local = await offlineDb.offlineAttendanceRecords.where("[programId+workDayId+programBeneficiaryId]")
        .equals([programId, workDayId, programBeneficiaryId]).first();
      if (!local?.id) continue;
      const updates: Partial<OfflineAttendanceRecord> = { isSynced: false };
      for (const field of ["morningTimeIn", "morningTimeOut", "afternoonTimeIn", "afternoonTimeOut"] as const) {
        if (tx.payload[field]) updates[field] = tx.payload[field];
      }
      await offlineDb.offlineAttendanceRecords.update(local.id, updates);
    }
  });
  const scope = user?.assignedBarangay ? "Barangay " + normalizeBarangayName(user.assignedBarangay) : "Municipality-wide";
  localStorage.setItem("tupad_last_offline_sync", new Date().toISOString());
  localStorage.setItem("tupad_offline_scope", scope);
  window.dispatchEvent(new CustomEvent("tupad-cache-updated"));
  return { beneficiariesCount: beneRows.length, attendanceCount: attendance.length, scope };
}

/** Block a reset while any outgoing mutation still needs acknowledgment or conflict review. */
export async function forceMasterSyncWithServer(user?: CacheUser) {
  try {
    const upload = await pushSyncQueue();
    if (upload.remaining) throw new Error(upload.authRequired
      ? "Sign in again before retrying. Unsynced records and cache were kept."
      : upload.remaining + " record(s) still await server acknowledgment or conflict review. No cache reset was performed.");
    const snapshot = await initializeUserOfflineCache(user);
    if (await getPendingQueueCount()) throw new Error("New scans were queued during refresh. They are retained on this device; sync again before considering it complete.");
    return { success: true as const, ...snapshot };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

