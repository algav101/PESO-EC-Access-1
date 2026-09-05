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
    let sanitizedUserId: string | null = userId || null;

    if (sanitizedUserId) {
      // Validate userId exists in User table to prevent Postgres 23503 FK violation
      const userExists = await prisma.user.findUnique({
        where: { id: sanitizedUserId },
        select: { id: true },
      });
      if (!userExists) {
        metadata = {
          ...(typeof metadata === "object" && metadata !== null ? metadata : { originalMetadata: metadata }),
          unmatchedUserId: sanitizedUserId,
        };
        sanitizedUserId = null;
      }
    }

    return await prisma.auditLog.create({
      data: {
        userId: sanitizedUserId,
        action,
        entityType,
        entityId,
        oldData: oldData ? (typeof oldData === "string" ? oldData : JSON.stringify(oldData)) : null,
        newData: newData ? (typeof newData === "string" ? newData : JSON.stringify(newData)) : null,
        metadata: metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null,
        ipAddress,
        deviceId,
      },
    });
  } catch (error: any) {
    // If foreign key violation still occurs, retry safely with userId = null
    if (error?.code === "P2003" || error?.message?.includes("foreign key") || error?.message?.includes("23503")) {
      try {
        return await prisma.auditLog.create({
          data: {
            userId: null,
            action,
            entityType,
            entityId,
            oldData: oldData ? (typeof oldData === "string" ? oldData : JSON.stringify(oldData)) : null,
            newData: newData ? (typeof newData === "string" ? newData : JSON.stringify(newData)) : null,
            metadata: JSON.stringify({
              ...(typeof metadata === "object" && metadata !== null ? metadata : { originalMetadata: metadata }),
              fkFallback: true,
              originalUserId: userId,
            }),
            ipAddress,
            deviceId,
          },
        });
      } catch (retryErr) {
        console.error("Audit log fallback failed:", retryErr);
        return null;
      }
    }
    console.error("Audit log failed to record:", error);
    return null;
  }
}

