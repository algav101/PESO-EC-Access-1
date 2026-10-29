import { hasPermission, isAdminUser } from "./permissions";

export const INTAKE_SOURCES = ["ONLINE", "WALK_IN"] as const;
export type IntakeSource = (typeof INTAKE_SOURCES)[number];
export const REVIEW_STATUSES = ["PENDING_REVIEW", "QUEUED", "INCOMPLETE"] as const;
export const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending admin review", QUEUED: "Reviewed / Queued",
  INCOMPLETE: "For completion", APPROVED: "Approved", DISQUALIFIED: "Disqualified",
};

export function isIntakeSource(value: unknown): value is IntakeSource {
  return value === "ONLINE" || value === "WALK_IN";
}

export function canEncodeWalkIn(user?: { role: string } | null): boolean {
  return Boolean(user && hasPermission(user.role, "application.encode"));
}

export function canReadApplication(user: { id: string; role: string } | null, application: { source: string; encodedById: string | null }): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (application.source === "WALK_IN") return canEncodeWalkIn(user) && application.encodedById === user.id;
  return application.source === "IMPORT" && hasPermission(user.role, "application.read");
}
