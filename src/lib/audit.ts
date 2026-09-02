import prisma from "./prisma";

export interface LogAuditOptions {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
  ipAddress?: string;
  deviceId?: string;
}

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  oldData,
  newData,
  metadata,
  ipAddress,
  deviceId,
}: LogAuditOptions) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        deviceId,
      },
    });
  } catch (error) {
    console.error("Audit log failed to record:", error);
    return null;
  }
}
