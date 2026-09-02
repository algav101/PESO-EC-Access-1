import Dexie, { type Table } from "dexie";

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
}

export interface CachedWorkDay {
  id: string;
  programId: string;
  dayNumber: number;
  workDate: string;
  status: string;
}

export interface OfflineTransaction {
  id?: number;
  clientTransactionId: string;
  deviceId: string;
  entityType: "ATTENDANCE" | "ORIENTATION" | "STUB_DISTRIBUTION" | "PAYOUT" | "PHOTO";
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
  offlineQueue!: Table<OfflineTransaction, number>;

  constructor() {
    super("TupadOfflineDB_Dingalan");
    this.version(1).stores({
      cachedPrograms: "id, programCode, status",
      cachedBeneficiaries: "id, programId, designatedNumber, qrToken, barangay",
      cachedWorkDays: "id, programId, dayNumber, workDate",
      offlineQueue: "++id, clientTransactionId, entityType, status, createdAt",
    });
  }
}

export const offlineDb = new TupadOfflineDatabase();

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
  return await offlineDb.offlineQueue.where("status").equals("PENDING").count();
}

export async function pushSyncQueue() {
  if (typeof window === "undefined") return { accepted: 0, failed: 0 };
  const pending = await offlineDb.offlineQueue.where("status").equals("PENDING").toArray();
  if (pending.length === 0) return { accepted: 0, failed: 0 };

  try {
    const res = await fetch("/api/v1/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: pending }),
    });

    if (!res.ok) throw new Error("Sync push failed with status " + res.status);
    const result = await res.json();

    // Mark accepted
    for (const item of pending) {
      if (result.accepted?.includes(item.clientTransactionId) || result.duplicates?.includes(item.clientTransactionId)) {
        await offlineDb.offlineQueue.update(item.id!, { status: "SYNCED" });
      } else if (result.conflicts?.includes(item.clientTransactionId)) {
        await offlineDb.offlineQueue.update(item.id!, { status: "CONFLICT", lastError: "Conflict detected on server" });
      } else {
        await offlineDb.offlineQueue.update(item.id!, {
          status: "FAILED",
          retryCount: item.retryCount + 1,
          lastError: "Failed during sync processing",
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error("Sync push error:", error);
    return { accepted: 0, failed: pending.length, error: error.message };
  }
}
