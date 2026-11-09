import { offlineDb, UNSYNCED_QUEUE_STATUSES, type CachedBeneficiary, type OfflineTransaction } from "./dexie";

type MonitorKind = "stub" | "orientation";
const hasPending = (queue: OfflineTransaction[], id: string, entity: string) =>
  queue.some(q => q.payload.programBeneficiaryId === id && q.entityType === entity);

/** Keep the monitoring DTO vocabulary identical online and offline. Never count a queued scan as a server confirmation. */
export function buildCachedMonitoring(rows: CachedBeneficiary[], queue: OfflineTransaction[], kind: MonitorKind) {
  const beneficiaries = rows.map(b => {
    const pendingStubSync = hasPending(queue, b.id, "STUB_DISTRIBUTION");
    const pendingOrientationSync = hasPending(queue, b.id, "ORIENTATION");
    const isStubAffirmed = pendingStubSync ? b.serverStubDistributed === true : b.stubDistributed === true;
    const isOrientationScanned = (pendingOrientationSync ? b.serverOrientationStatus : b.orientationStatus) === "PRESENT";
    return {
      ...b, isStubAffirmed, isOrientationScanned, isFlagged: false,
      pendingStubSync, pendingOrientationSync,
      status: pendingStubSync && !isStubAffirmed ? "PENDING_SYNC" : isStubAffirmed ? "CONFIRMED" : "PENDING",
      remarks: pendingStubSync || pendingOrientationSync ? "Saved on this device; awaiting server acknowledgment. Check Offline Sync Center." : "",
    };
  });
  const total = beneficiaries.length;
  const confirmed = beneficiaries.filter(b => b.isStubAffirmed).length;
  const attended = beneficiaries.filter(b => b.isOrientationScanned).length;
  const rate = (n: number, d = total) => d ? ((n / d) * 100).toFixed(1) : "0";
  const barangays = [...new Set(beneficiaries.map(b => b.barangay))].map(barangayName => {
    const group = beneficiaries.filter(b => b.barangay === barangayName);
    const stubs = group.filter(b => b.isStubAffirmed).length;
    const scanned = group.filter(b => b.isOrientationScanned).length;
    const percent = Math.round(Number(rate(kind === "stub" ? stubs : scanned, kind === "stub" ? group.length : stubs || group.length)));
    return {
      barangayName, total: group.length, confirmed: stubs, distributed: stubs,
      pending: group.length - stubs, flaggedReplacement: 0, stubsAffirmed: stubs,
      orientationScanned: scanned, orientationPending: group.filter(b => b.isStubAffirmed && !b.isOrientationScanned).length,
      completionPercentage: percent, status: percent === 100 ? "COMPLETED" : percent ? "IN_PROGRESS" : "NOT_STARTED",
    };
  });
  return {
    isCached: true, beneficiaries, barangays,
    summary: {
      totalBeneficiaries: total, totalDistributed: confirmed, totalConfirmed: confirmed,
      totalPending: total - confirmed, totalFlaggedReplacement: 0, totalPendingApprovals: 0,
      distributionRate: rate(confirmed), confirmationRate: rate(confirmed),
      totalStubsAffirmed: confirmed, totalOrientationScanned: attended,
      totalOrientationPending: beneficiaries.filter(b => b.isStubAffirmed && !b.isOrientationScanned).length,
      attendanceRate: rate(attended, confirmed || total),
    },
  };
}

export async function getCachedMonitoring(programId: string, kind: MonitorKind) {
  const rows = await offlineDb.cachedBeneficiaries.where("programId").equals(programId).toArray();
  const queue = (await offlineDb.offlineQueue.where("status").anyOf(UNSYNCED_QUEUE_STATUSES).toArray())
    .filter(q => q.payload.programId === programId);
  return buildCachedMonitoring(rows, queue, kind);
}

/** A connected phone can still have a failed local upload; retain that distinction in its server view. */
export async function includeLocalPending(data: any, programId: string) {
  const queue = (await offlineDb.offlineQueue.where("status").anyOf(UNSYNCED_QUEUE_STATUSES).toArray())
    .filter(q => q.payload.programId === programId);
  return { ...data, beneficiaries: (data.beneficiaries || []).map((b: any) => ({
    ...b,
    status: b.status === "PENDING" && hasPending(queue, b.id, "STUB_DISTRIBUTION") ? "PENDING_SYNC" : b.status,
    pendingStubSync: hasPending(queue, b.id, "STUB_DISTRIBUTION"),
    pendingOrientationSync: hasPending(queue, b.id, "ORIENTATION"),
  })) };
}
