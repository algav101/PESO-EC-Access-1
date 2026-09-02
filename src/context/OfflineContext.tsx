"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { offlineDb, pushSyncQueue, getPendingQueueCount } from "@/lib/dexie";

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<any>;
  cacheProgramData: (programId: string) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  syncNow: async () => {},
  cacheProgramData: async () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPending = async () => {
    try {
      const count = await getPendingQueueCount();
      setPendingCount(count);
    } catch (e) {}
  };

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    refreshPending();
    const interval = setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncNow = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await pushSyncQueue();
      await refreshPending();
      return res;
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const cacheProgramData = async (programId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${programId}`);
      if (!res.ok) return;
      const { program } = await res.json();

      await offlineDb.cachedPrograms.put({
        id: program.id,
        programCode: program.programCode,
        programName: program.programName,
        municipality: program.municipality,
        province: program.province,
        status: program.status,
        requiredWorkDays: program.requiredWorkDays,
        morningStart: program.morningStart,
        morningEnd: program.morningEnd,
        afternoonStart: program.afternoonStart,
        afternoonEnd: program.afternoonEnd,
        orientationDate: program.orientationDate,
        payoutDate: program.payoutDate,
      });

      // Cache work days
      for (const wd of program.workDays || []) {
        await offlineDb.cachedWorkDays.put({
          id: wd.id,
          programId: program.id,
          dayNumber: wd.dayNumber,
          workDate: wd.workDate,
          status: wd.status,
        });
      }

      // Fetch beneficiaries for caching
      const beneRes = await fetch(`/api/v1/programs/${programId}/beneficiaries`);
      if (beneRes.ok) {
        const { beneficiaries } = await beneRes.json();
        for (const pb of beneficiaries || []) {
          const activeQr = pb.qrCodes?.find((q: any) => q.status === "ACTIVE");
          // calculate birthday pin
          const bdayParts = pb.beneficiary.birthday.split("-");
          const birthdayPin = bdayParts.length === 3 && bdayParts[0].length === 4
            ? `${bdayParts[1]}-${bdayParts[2]}-${bdayParts[0]}`
            : pb.beneficiary.birthday;

          await offlineDb.cachedBeneficiaries.put({
            id: pb.id,
            programId: program.id,
            beneficiaryId: pb.beneficiaryId,
            designatedNumber: pb.designatedNumber,
            fullName: pb.beneficiary.fullName,
            birthday: pb.beneficiary.birthday,
            birthdayPin,
            barangay: pb.beneficiary.barangay || "",
            sitio: pb.beneficiary.sitio || "",
            tableNumber: pb.tableNumber || "",
            qrToken: activeQr?.publicToken,
            status: pb.participationStatus,
          });
        }
      }
      console.log(`Program ${program.programCode} cached offline successfully!`);
    } catch (err) {
      console.error("Failed to cache program data:", err);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        syncNow,
        cacheProgramData,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
