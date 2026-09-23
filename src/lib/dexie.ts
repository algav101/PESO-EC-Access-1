import Dexie, { type Table } from "dexie";
import { format } from "date-fns";
import {
  getPhilippineTime,
  determineAttendanceSlot,
  ATTENDANCE_SLOT_LABELS,
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
}

export class TupadOfflineDatabase extends Dexie {
  cachedPrograms!: Table<CachedProgram, string>;
  cachedBeneficiaries!: Table<CachedBeneficiary, string>;
  cachedWorkDays!: Table<CachedWorkDay, string>;
  cachedWorkProgramItems!: Table<CachedWorkProgramItem, string>;
  offlineAttendanceRecords!: Table<OfflineAttendanceRecord, number>;
  offlineQueue!: Table<OfflineTransaction, number>;

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
  }
}

export const offlineDb = new TupadOfflineDatabase();

/**
 * Clean & extract token string from raw URLs, JSON, or parameters
 */
export function extractCleanQrToken(raw: string): string {
  if (!raw) return "";
  let trimmed = String(raw).trim();

  // If JSON object string
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return (parsed.token || parsed.qrToken || parsed.designatedNumber || trimmed).trim();
    } catch {}
  }

  // If URL string or query string (e.g., https://... or /... or ?token=...)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.includes("?") ||
    trimmed.includes("=")
  ) {
    try {
      const fullUrl = trimmed.startsWith("http")
        ? trimmed
        : `http://localhost${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
      const url = new URL(fullUrl);
      const paramToken =
        url.searchParams.get("token") ||
        url.searchParams.get("qrToken") ||
        url.searchParams.get("q") ||
        url.searchParams.get("slot");
      if (paramToken) return paramToken.trim();

      const lastSeg = url.pathname.split("/").filter(Boolean).pop();
      if (
        lastSeg &&
        !["my-assignment", "scan", "attendance", "orientation", "payout", "stub-distribution"].includes(
          lastSeg.toLowerCase()
        )
      ) {
        return lastSeg.trim();
      }
    } catch {}
  }

  return trimmed;
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
    // 1. Direct indexed match on qrToken
    let match: CachedBeneficiary | null = (await offlineDb.cachedBeneficiaries.where("qrToken").equals(clean).first()) || null;
    if (!match && clean !== upperClean) {
      match = (await offlineDb.cachedBeneficiaries.where("qrToken").equals(upperClean).first()) || null;
    }

    if (match && (!targetProgramId || match.programId === targetProgramId)) {
      return match;
    }

    // 2. Fetch records (scoped by program if provided)
    const all = targetProgramId
      ? await offlineDb.cachedBeneficiaries.where("programId").equals(targetProgramId).toArray()
      : await offlineDb.cachedBeneficiaries.toArray();

    // 3. Match by QR substring, or designatedNumber (numeric or text)
    const isNum = /^\d+$/.test(clean);
    const parsedNum = isNum ? parseInt(clean, 10) : null;

    match = all.find((b) => {
      // Exact or substring QR token
      if (b.qrToken) {
        const bQrUpper = b.qrToken.toUpperCase();
        if (bQrUpper === upperClean || bQrUpper.includes(upperClean) || upperClean.includes(bQrUpper)) {
          return true;
        }
      }

      // Match designated slot number (e.g., "1" matches "1", "01", "001")
      if (b.designatedNumber) {
        if (b.designatedNumber === clean) return true;
        if (parsedNum !== null && parseInt(b.designatedNumber, 10) === parsedNum) return true;
      }

      // Match full name
      if (clean.length >= 3 && b.fullName?.toUpperCase().includes(upperClean)) {
        return true;
      }

      // Match ID
      if (b.id === clean || b.beneficiaryId === clean) {
        return true;
      }

      return false;
    }) || null;

    return match;
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
    (r) => r.workDayId === resolvedWorkDayId || r.attendanceDate === attendanceDate
  );

  // Anti-double-scan checks on installed unit
  if (targetSlot === "MORNING_IN" && existingRecord?.morningTimeIn) {
    const loggedTime = format(new Date(existingRecord.morningTimeIn), "hh:mm a");
    return {
      isDuplicate: true,
      slotRecorded: slotLabels[targetSlot],
      message: `ALREADY SCANNED: Morning Time-In (AM IN) for #${bene.designatedNumber} (${bene.fullName}) was already recorded on this unit today at ${loggedTime}. Double scanning is blocked.`,
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
      message: `ALREADY SCANNED: Morning Time-Out (AM OUT) for #${bene.designatedNumber} (${bene.fullName}) was already recorded on this unit today at ${loggedTime}. Double scanning is blocked.`,
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
      message: `ALREADY SCANNED: Afternoon Time-In (PM IN) for #${bene.designatedNumber} (${bene.fullName}) was already recorded on this unit today at ${loggedTime}. Double scanning is blocked.`,
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
      message: `ALREADY SCANNED: Afternoon Time-Out (PM OUT) for #${bene.designatedNumber} (${bene.fullName}) was already recorded on this unit today at ${loggedTime}. Double scanning is blocked.`,
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

export async function queueOfflineTransaction(
  entityType: OfflineTransaction["entityType"],
  operation: OfflineTransaction["operation"],
  payload: any
): Promise<string> {
  const clientTransactionId = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const deviceId = typeof window !== "undefined" ? localStorage.getItem("tupad_device_id") || "BROWSER_DEVICE" : "SERVER";

  await offlineDb.offlineQueue.add({
    clientTransactionId,
    deviceId,
    entityType,
    operation,
    payload,
    status: "PENDING",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });

  return clientTransactionId;
}

export async function getPendingQueueCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    return await offlineDb.offlineQueue
      .where("status")
      .anyOf(["PENDING", "FAILED"])
      .count();
  } catch (e) {
    return 0;
  }
}

export async function pushSyncQueue() {
  if (typeof window === "undefined") return { accepted: [], failed: [], duplicates: [], conflicts: [], errors: {} };
  const queueToSync = await offlineDb.offlineQueue
    .where("status")
    .anyOf(["PENDING", "FAILED"])
    .toArray();
  if (queueToSync.length === 0) return { accepted: [], failed: [], duplicates: [], conflicts: [], errors: {} };

  // Mark in-flight items as SYNCING
  for (const item of queueToSync) {
    if (item.id) {
      await offlineDb.offlineQueue.update(item.id, { status: "SYNCING" });
    }
  }

  // Split queue into chunks: PHOTO items pushed individually (or in pairs) to keep HTTP payload < 1MB, other items in batches of 20
  const chunks: OfflineTransaction[][] = [];
  let currentNonPhotoChunk: OfflineTransaction[] = [];

  for (const item of queueToSync) {
    if (item.entityType === "PHOTO") {
      // Photos get their own dedicated single-item chunk
      chunks.push([item]);
    } else {
      currentNonPhotoChunk.push(item);
      if (currentNonPhotoChunk.length >= 20) {
        chunks.push(currentNonPhotoChunk);
        currentNonPhotoChunk = [];
      }
    }
  }
  if (currentNonPhotoChunk.length > 0) {
    chunks.push(currentNonPhotoChunk);
  }

  const aggregateResult = {
    accepted: [] as string[],
    duplicates: [] as string[],
    conflicts: [] as string[],
    failed: [] as string[],
    errors: {} as Record<string, string>,
  };

  for (const chunk of chunks) {
    try {
      const res = await fetch("/api/v1/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: chunk }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `Sync push failed with status ${res.status}`;
        for (const item of chunk) {
          aggregateResult.failed.push(item.clientTransactionId);
          aggregateResult.errors[item.clientTransactionId] = errMsg;
          if (item.id) {
            await offlineDb.offlineQueue.update(item.id, {
              status: "FAILED",
              retryCount: (item.retryCount || 0) + 1,
              lastError: errMsg,
            });
          }
        }
        continue;
      }

      const result = await res.json();
      const errors = result.errors || {};

      for (const item of chunk) {
        const txId = item.clientTransactionId;
        if (result.accepted?.includes(txId) || result.duplicates?.includes(txId)) {
          if (result.accepted?.includes(txId)) aggregateResult.accepted.push(txId);
          if (result.duplicates?.includes(txId)) aggregateResult.duplicates.push(txId);
          // Successfully synced to central storage: remove from local offline queue
          if (item.id) {
            await offlineDb.offlineQueue.delete(item.id);
          }
        } else if (result.conflicts?.includes(txId)) {
          aggregateResult.conflicts.push(txId);
          const err = errors[txId] || "Conflict detected on server";
          aggregateResult.errors[txId] = err;
          if (item.id) {
            await offlineDb.offlineQueue.update(item.id, {
              status: "CONFLICT",
              lastError: err,
            });
          }
        } else {
          aggregateResult.failed.push(txId);
          const err = errors[txId] || "Failed during sync processing";
          aggregateResult.errors[txId] = err;
          if (item.id) {
            await offlineDb.offlineQueue.update(item.id, {
              status: "FAILED",
              retryCount: (item.retryCount || 0) + 1,
              lastError: err,
            });
          }
        }
      }
    } catch (chunkErr: any) {
      console.error("Chunk sync push error:", chunkErr);
      for (const item of chunk) {
        aggregateResult.failed.push(item.clientTransactionId);
        aggregateResult.errors[item.clientTransactionId] = chunkErr.message || "Network or connection error";
        if (item.id) {
          await offlineDb.offlineQueue.update(item.id, {
            status: "FAILED",
            retryCount: (item.retryCount || 0) + 1,
            lastError: chunkErr.message || "Network or connection error",
          });
        }
      }
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tupad-offline-synced", { detail: aggregateResult }));
    window.dispatchEvent(new CustomEvent("tupad-photos-updated"));
  }

  return aggregateResult;
}

export async function retryOfflineTransaction(id: number) {
  if (typeof window === "undefined") return;
  await offlineDb.offlineQueue.update(id, {
    status: "PENDING",
  });
}

export async function retryAllFailedTransactions() {
  if (typeof window === "undefined") return;
  const failedItems = await offlineDb.offlineQueue.where("status").equals("FAILED").toArray();
  for (const item of failedItems) {
    if (item.id) {
      await offlineDb.offlineQueue.update(item.id, { status: "PENDING" });
    }
  }
}

/**
 * Automatically initializes and caches active programs, work days, work program activities,
 * and beneficiaries into IndexedDB on the installed unit.
 */
export async function initializeUserOfflineCache(user?: {
  id?: string;
  role?: string;
  assignedBarangay?: string | null;
}) {
  if (typeof window === "undefined") return;

  try {
    const progRes = await fetch("/api/v1/programs");
    if (!progRes.ok) return;
    const { programs } = await progRes.json();
    if (!programs || programs.length === 0) return;

    for (const prog of programs) {
      // 1. Cache Program
      await offlineDb.cachedPrograms.put({
        id: prog.id,
        programCode: prog.programCode,
        programName: prog.programName,
        municipality: prog.municipality || "Dingalan",
        province: prog.province || "Aurora",
        status: prog.status,
        requiredWorkDays: prog.requiredWorkDays || 10,
        morningStart: prog.morningStart,
        morningEnd: prog.morningEnd,
        afternoonStart: prog.afternoonStart,
        afternoonEnd: prog.afternoonEnd,
        orientationDate: prog.orientationDate,
        payoutDate: prog.payoutDate,
      });

      // 2. Cache Work Days
      for (const wd of prog.workDays || []) {
        await offlineDb.cachedWorkDays.put({
          id: wd.id,
          programId: prog.id,
          dayNumber: wd.dayNumber,
          workDate: wd.workDate,
          status: wd.status,
        });
      }

      // 3. Cache Work Program Items & Areas
      try {
        const wpRes = await fetch(`/api/v1/programs/${prog.id}/work-program`);
        if (wpRes.ok) {
          const wpData = await wpRes.json();
          const workPrograms = wpData.workPrograms || [];
          for (const wp of workPrograms) {
            for (const it of wp.items || []) {
              await offlineDb.cachedWorkProgramItems.put({
                id: it.id,
                programId: prog.id,
                barangay: wp.barangay,
                dayNumber: it.dayNumber,
                area: it.area,
                specificActivities: it.specificActivities,
                totalCount: it.totalCount || (it.maleCount || 0) + (it.femaleCount || 0),
                maleCount: it.maleCount,
                femaleCount: it.femaleCount,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Work program caching notice:", err);
      }

      // 4. Fetch & Cache Beneficiaries (scoped if user has assigned barangay, or full roster for super admin)
      let beneUrl = `/api/v1/programs/${prog.id}/beneficiaries`;
      if (user?.assignedBarangay) {
        beneUrl += `?barangay=${encodeURIComponent(normalizeBarangayName(user.assignedBarangay))}`;
      }

      const beneRes = await fetch(beneUrl);
      if (beneRes.ok) {
        const { beneficiaries } = await beneRes.json();
        const beneListToPut: CachedBeneficiary[] = [];
        const attListToProcess: OfflineAttendanceRecord[] = [];

        for (const pb of beneficiaries || []) {
          const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE") || pb.qrCodes?.[0];
          let birthdayPin = pb.beneficiary?.birthday || "";
          if (birthdayPin) {
            const parts = birthdayPin.split("-");
            if (parts.length === 3 && parts[0].length === 4) {
              birthdayPin = `${parts[1]}-${parts[2]}-${parts[0]}`;
            }
          }

          const hasOrientation = pb.orientationAttendance && pb.orientationAttendance.length > 0;
          const normBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
          const normSitio = normalizeSitioName(pb.beneficiary?.sitio, normBrgy);

          beneListToPut.push({
            id: pb.id,
            programId: prog.id,
            beneficiaryId: pb.beneficiaryId,
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary?.fullName || "",
            birthday: pb.beneficiary?.birthday || "",
            birthdayPin,
            barangay: normBrgy,
            sitio: normSitio,
            tableNumber: pb.tableNumber || "",
            qrToken: activeQr?.publicToken || "",
            status: pb.participationStatus || "ACTIVE",
            orientationStatus: hasOrientation ? "PRESENT" : "ABSENT",
          });

          for (const rec of pb.attendanceRecords || []) {
            attListToProcess.push({
              programId: prog.id,
              workDayId: rec.workDayId,
              programBeneficiaryId: pb.id,
              designatedNumber: pb.designatedNumber,
              attendanceDate: rec.attendanceDate || "",
              morningTimeIn: rec.morningTimeIn,
              morningTimeOut: rec.morningTimeOut,
              afternoonTimeIn: rec.afternoonTimeIn,
              afternoonTimeOut: rec.afternoonTimeOut,
              status: rec.status || "PRESENT",
              scannedAt: rec.morningTimeIn || new Date().toISOString(),
              scannedById: rec.scannedById,
              scannedByName: rec.scannedBy?.fullName,
              isSynced: true,
            });
          }
        }

        // Fast atomic bulk storage for beneficiaries
        if (beneListToPut.length > 0) {
          await offlineDb.cachedBeneficiaries.bulkPut(beneListToPut);
        }

        // Fast batch transaction for attendance records
        if (attListToProcess.length > 0) {
          await offlineDb.transaction("rw", offlineDb.offlineAttendanceRecords, async () => {
            for (const rec of attListToProcess) {
              const existing = await offlineDb.offlineAttendanceRecords
                .where("[programId+workDayId+programBeneficiaryId]")
                .equals([rec.programId, rec.workDayId, rec.programBeneficiaryId])
                .first();

              if (existing && existing.id) {
                await offlineDb.offlineAttendanceRecords.update(existing.id, {
                  morningTimeIn: rec.morningTimeIn || existing.morningTimeIn,
                  morningTimeOut: rec.morningTimeOut || existing.morningTimeOut,
                  afternoonTimeIn: rec.afternoonTimeIn || existing.afternoonTimeIn,
                  afternoonTimeOut: rec.afternoonTimeOut || existing.afternoonTimeOut,
                  status: rec.status || existing.status,
                  isSynced: true,
                  scannedById: rec.scannedById || existing.scannedById,
                  scannedByName: rec.scannedByName || existing.scannedByName,
                });
              } else {
                await offlineDb.offlineAttendanceRecords.add(rec);
              }
            }
          });
        }
      }
    }

    localStorage.setItem("tupad_last_offline_sync", new Date().toISOString());
    localStorage.setItem(
      "tupad_offline_scope",
      (user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay
        ? `Barangay ${user.assignedBarangay}`
        : "Municipality-wide"
    );
  } catch (e) {
    console.warn("Offline cache initialization warning:", e);
  }
}

/**
 * MASTER KEY SYNC:
 * Forces a clean, authoritative purge and re-sync of all local client caches with the central PESO Admin database.
 * Scoped according to user's assigned barangay or municipality-wide access.
 */
export async function forceMasterSyncWithServer(user?: {
  id?: string;
  role?: string;
  assignedBarangay?: string | null;
}) {
  if (typeof window === "undefined") return { success: false, error: "Window is undefined" };

  try {
    // 1. Push any pending outgoing mutations first
    await pushSyncQueue();

    // 2. Fetch authoritative programs and workdays
    const progRes = await fetch("/api/v1/programs");
    if (!progRes.ok) throw new Error("Could not connect to PESO Admin server to retrieve programs.");
    const { programs } = await progRes.json();
    if (!programs || programs.length === 0) throw new Error("No active programs found on PESO Admin server.");

    // 3. Clear local Dexie caches for programs, workdays, beneficiaries, and attendance records
    await offlineDb.cachedPrograms.clear();
    await offlineDb.cachedWorkDays.clear();
    await offlineDb.cachedWorkProgramItems.clear();
    await offlineDb.cachedBeneficiaries.clear();
    await offlineDb.offlineAttendanceRecords.clear();

    let totalBeneficiariesCount = 0;
    let totalAttendanceRecordsCount = 0;

    for (const prog of programs) {
      // Put Program
      await offlineDb.cachedPrograms.put({
        id: prog.id,
        programCode: prog.programCode,
        programName: prog.programName,
        municipality: prog.municipality || "Dingalan",
        province: prog.province || "Aurora",
        status: prog.status,
        requiredWorkDays: prog.requiredWorkDays || 10,
        morningStart: prog.morningStart,
        morningEnd: prog.morningEnd,
        afternoonStart: prog.afternoonStart,
        afternoonEnd: prog.afternoonEnd,
        orientationDate: prog.orientationDate,
        payoutDate: prog.payoutDate,
      });

      // Put Work Days in bulk
      const workDaysList = (prog.workDays || []).map((wd: any) => ({
        id: wd.id,
        programId: prog.id,
        dayNumber: wd.dayNumber,
        workDate: wd.workDate,
        status: wd.status,
      }));
      if (workDaysList.length > 0) {
        await offlineDb.cachedWorkDays.bulkPut(workDaysList);
      }

      // Put Work Program Items in bulk
      try {
        const wpRes = await fetch(`/api/v1/programs/${prog.id}/work-program`);
        if (wpRes.ok) {
          const wpData = await wpRes.json();
          const itemsList: CachedWorkProgramItem[] = [];
          for (const wp of wpData.workPrograms || []) {
            for (const it of wp.items || []) {
              itemsList.push({
                id: it.id,
                programId: prog.id,
                barangay: wp.barangay,
                dayNumber: it.dayNumber,
                area: it.area,
                specificActivities: it.specificActivities,
                totalCount: it.totalCount || (it.maleCount || 0) + (it.femaleCount || 0),
                maleCount: it.maleCount,
                femaleCount: it.femaleCount,
              });
            }
          }
          if (itemsList.length > 0) {
            await offlineDb.cachedWorkProgramItems.bulkPut(itemsList);
          }
        }
      } catch (err) {}

      // Put Authoritative Beneficiaries & Attendance Records (scoped strictly to user's assigned barangay or full for admin)
      let beneUrl = `/api/v1/programs/${prog.id}/beneficiaries`;
      if (user?.assignedBarangay) {
        beneUrl += `?barangay=${encodeURIComponent(normalizeBarangayName(user.assignedBarangay))}`;
      }

      const beneRes = await fetch(beneUrl);
      if (beneRes.ok) {
        const { beneficiaries } = await beneRes.json();
        totalBeneficiariesCount += (beneficiaries || []).length;

        const beneList: CachedBeneficiary[] = [];
        const attList: OfflineAttendanceRecord[] = [];

        for (const pb of beneficiaries || []) {
          const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE") || pb.qrCodes?.[0];
          let birthdayPin = pb.beneficiary?.birthday || "";
          if (birthdayPin) {
            const parts = birthdayPin.split("-");
            if (parts.length === 3 && parts[0].length === 4) {
              birthdayPin = `${parts[1]}-${parts[2]}-${parts[0]}`;
            }
          }

          const hasOrientation = pb.orientationAttendance && pb.orientationAttendance.length > 0;
          const normBrgy = normalizeBarangayName(pb.beneficiary?.barangay);
          const normSitio = normalizeSitioName(pb.beneficiary?.sitio, normBrgy);

          beneList.push({
            id: pb.id,
            programId: prog.id,
            beneficiaryId: pb.beneficiaryId,
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary?.fullName || "",
            birthday: pb.beneficiary?.birthday || "",
            birthdayPin,
            barangay: normBrgy,
            sitio: normSitio,
            tableNumber: pb.tableNumber || "",
            qrToken: activeQr?.publicToken || "",
            status: pb.participationStatus || "ACTIVE",
            orientationStatus: hasOrientation ? "PRESENT" : "ABSENT",
          });

          // Store authoritative server attendance records (including records scanned by other users in the same barangay)
          for (const rec of pb.attendanceRecords || []) {
            totalAttendanceRecordsCount++;
            attList.push({
              programId: prog.id,
              workDayId: rec.workDayId,
              programBeneficiaryId: pb.id,
              designatedNumber: pb.designatedNumber,
              attendanceDate: rec.attendanceDate || "",
              morningTimeIn: rec.morningTimeIn,
              morningTimeOut: rec.morningTimeOut,
              afternoonTimeIn: rec.afternoonTimeIn,
              afternoonTimeOut: rec.afternoonTimeOut,
              status: rec.status || "PRESENT",
              scannedAt: rec.morningTimeIn || new Date().toISOString(),
              scannedById: rec.scannedById,
              scannedByName: rec.scannedBy?.fullName,
              isSynced: true,
            });
          }
        }

        if (beneList.length > 0) {
          await offlineDb.cachedBeneficiaries.bulkPut(beneList);
        }
        if (attList.length > 0) {
          await offlineDb.transaction("rw", offlineDb.offlineAttendanceRecords, async () => {
            for (const rec of attList) {
              const existing = await offlineDb.offlineAttendanceRecords
                .where("[programId+workDayId+programBeneficiaryId]")
                .equals([rec.programId, rec.workDayId, rec.programBeneficiaryId])
                .first();

              if (existing && existing.id) {
                await offlineDb.offlineAttendanceRecords.update(existing.id, {
                  ...rec,
                  scannedByName: rec.scannedByName || existing.scannedByName,
                });
              } else {
                await offlineDb.offlineAttendanceRecords.add(rec);
              }
            }
          });
        }
      }
    }

    const scopeStr = user?.assignedBarangay
      ? `Barangay ${normalizeBarangayName(user.assignedBarangay)}`
      : "Municipality-wide (All 11 Barangays)";

    localStorage.setItem("tupad_last_offline_sync", new Date().toISOString());
    localStorage.setItem("tupad_offline_scope", scopeStr);

    // Broadcast update events to all open tabs and components
    window.dispatchEvent(new CustomEvent("tupad-offline-synced"));
    window.dispatchEvent(new CustomEvent("tupad-attendance-updated"));

    return {
      success: true,
      beneficiariesCount: totalBeneficiariesCount,
      attendanceCount: totalAttendanceRecordsCount,
      scope: scopeStr,
    };
  } catch (error: any) {
    console.error("forceMasterSyncWithServer error:", error);
    return { success: false, error: error.message };
  }
}

