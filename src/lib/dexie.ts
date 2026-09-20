import Dexie, { type Table } from "dexie";
import { format } from "date-fns";

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
  programBeneficiaryId: string;
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
}) {
  const { rawToken, programId, workDayId, shiftMode, workProgramItemId, workArea, activityName, deviceId } = params;

  const bene = await findBeneficiaryOffline(rawToken, programId);
  if (!bene) {
    throw new Error(`QR Token or Beneficiary identifier "${rawToken}" not found in offline database cache.`);
  }

  // Resolve work day
  let workDay = workDayId ? await offlineDb.cachedWorkDays.get(workDayId) : null;
  if (!workDay && programId) {
    const progDays = await offlineDb.cachedWorkDays.where("programId").equals(programId).toArray();
    const todayStr = format(new Date(), "yyyy-MM-dd");
    workDay = progDays.find((d) => d.workDate === todayStr) || progDays[0] || null;
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const attendanceDate = workDay?.workDate || todayStr;
  const dayNumber = workDay?.dayNumber || 1;
  const resolvedProgramId = bene.programId || programId;
  const resolvedWorkDayId = workDay?.id || workDayId || `WD-${dayNumber}`;

  // Resolve Shift Slot
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const timeDecimal = currentHour + currentMinute / 60;

  let targetSlot: "MORNING_IN" | "MORNING_OUT" | "AFTERNOON_IN" | "AFTERNOON_OUT" = "MORNING_IN";
  if (shiftMode === "MORNING_IN") targetSlot = "MORNING_IN";
  else if (shiftMode === "MORNING_OUT") targetSlot = "MORNING_OUT";
  else if (shiftMode === "AFTERNOON_IN") targetSlot = "AFTERNOON_IN";
  else if (shiftMode === "AFTERNOON_OUT") targetSlot = "AFTERNOON_OUT";
  else {
    // AUTO
    if (timeDecimal < 11.5) targetSlot = "MORNING_IN";
    else if (timeDecimal < 12.8) targetSlot = "MORNING_OUT";
    else if (timeDecimal < 15.5) targetSlot = "AFTERNOON_IN";
    else targetSlot = "AFTERNOON_OUT";
  }

  const slotLabels: Record<string, string> = {
    MORNING_IN: "Morning Time-In (AM IN)",
    MORNING_OUT: "Morning Time-Out (AM OUT)",
    AFTERNOON_IN: "Afternoon Time-In (PM IN)",
    AFTERNOON_OUT: "Afternoon Time-Out (PM OUT)",
  };

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
      programBeneficiaryId: bene.id,
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
    programBeneficiaryId: bene.id,
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
          workDayId: resolvedWorkDayId,
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
  if (typeof window === "undefined") return { accepted: 0, failed: 0 };
  const queueToSync = await offlineDb.offlineQueue
    .where("status")
    .anyOf(["PENDING", "FAILED"])
    .toArray();
  if (queueToSync.length === 0) return { accepted: 0, failed: 0 };

  // Mark in-flight as SYNCING
  for (const item of queueToSync) {
    if (item.id) {
      await offlineDb.offlineQueue.update(item.id, { status: "SYNCING" });
    }
  }

  try {
    const res = await fetch("/api/v1/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: queueToSync }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Sync push failed with status ${res.status}`);
    }

    const result = await res.json();
    const errors = result.errors || {};

    // Remove accepted / duplicates from offline queue; update failed / conflicts
    for (const item of queueToSync) {
      if (
        result.accepted?.includes(item.clientTransactionId) ||
        result.duplicates?.includes(item.clientTransactionId)
      ) {
        // Successful sync to system main storage: remove from local offline queue
        if (item.id) {
          await offlineDb.offlineQueue.delete(item.id);
        }
      } else if (result.conflicts?.includes(item.clientTransactionId)) {
        await offlineDb.offlineQueue.update(item.id!, {
          status: "CONFLICT",
          lastError: errors[item.clientTransactionId] || "Conflict detected on server",
        });
      } else {
        await offlineDb.offlineQueue.update(item.id!, {
          status: "FAILED",
          retryCount: (item.retryCount || 0) + 1,
          lastError: errors[item.clientTransactionId] || "Failed during sync processing",
        });
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tupad-offline-synced", { detail: result }));
    }

    return result;
  } catch (error: any) {
    console.error("Sync push error:", error);
    for (const item of queueToSync) {
      await offlineDb.offlineQueue.update(item.id!, {
        status: "FAILED",
        retryCount: (item.retryCount || 0) + 1,
        lastError: error.message || "Network or server connection error",
      });
    }
    return { accepted: 0, failed: queueToSync.length, error: error.message };
  }
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

      // 4. Fetch & Cache Beneficiaries (scoped if coordinator / assisting documentor, or full roster)
      let beneUrl = `/api/v1/programs/${prog.id}/beneficiaries`;
      if ((user?.role === "TUPAD_COORDINATOR" || user?.role === "TUPAD_ASSISTING_DOCUMENTOR") && user.assignedBarangay) {
        beneUrl += `?barangay=${encodeURIComponent(user.assignedBarangay)}`;
      }

      const beneRes = await fetch(beneUrl);
      if (beneRes.ok) {
        const { beneficiaries } = await beneRes.json();
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

          await offlineDb.cachedBeneficiaries.put({
            id: pb.id,
            programId: prog.id,
            beneficiaryId: pb.beneficiaryId,
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary?.fullName || "",
            birthday: pb.beneficiary?.birthday || "",
            birthdayPin,
            barangay: pb.beneficiary?.barangay || "",
            sitio: pb.beneficiary?.sitio || "",
            tableNumber: pb.tableNumber || "",
            qrToken: activeQr?.publicToken || "",
            status: pb.participationStatus || "ACTIVE",
            orientationStatus: hasOrientation ? "PRESENT" : "ABSENT",
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

