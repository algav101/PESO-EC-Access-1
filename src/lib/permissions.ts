export type UserRole = "DOMAIN_MASTER" | "PESO_ADMIN" | "PESO_STAFF" | "TUPAD_COORDINATOR" | "DOLE_COORDINATOR";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  role: UserRole | string;
  assignedBarangay?: string | null;
}

export const PERMISSIONS = {
  DOMAIN_MASTER: [
    "dashboard.view",
    "program.create", "program.read", "program.update", "program.delete", "program.close",
    "beneficiary.import", "beneficiary.create", "beneficiary.read", "beneficiary.update", "beneficiary.delete", "beneficiary.archive", "beneficiary.profile.edit",
    "dependent.create", "dependent.read", "dependent.update", "dependent.delete",
    "qr.generate", "qr.read", "qr.print", "qr.reprint", "qr.invalidate",
    "stub.configure", "stub.print", "stub.distribution.scan", "stub.distribution.read", "stub.distribution.monitor", "stub.override",
    "orientation.scan", "orientation.read", "orientation.correct",
    "replacement.create", "replacement.read", "replacement.approve",
    "attendance.scan", "attendance.read", "attendance.correct", "attendance.export",
    "photo.upload", "photo.read", "photo.approve", "photo.reject", "photo.configure",
    "payout.scan", "payout.read", "payout.correct",
    "restriction.read", "restriction.create", "restriction.override",
    "report.generate", "report.template.create", "report.template.update", "report.export", "report.read",
    "application.read", "application.update", "application.download", "application.export", "application.import",
    "inquiry.read", "inquiry.update",
    "user.create", "user.read", "user.update", "user.disable", "user.delete",
    "settings.read", "settings.update",
    "audit.read",
    "sync.read", "sync.resolve"
  ],
  PESO_ADMIN: [
    "dashboard.view",
    "program.create", "program.read", "program.update", "program.delete", "program.close",
    "beneficiary.import", "beneficiary.create", "beneficiary.read", "beneficiary.update", "beneficiary.delete", "beneficiary.archive", "beneficiary.profile.edit",
    "dependent.create", "dependent.read", "dependent.update", "dependent.delete",
    "qr.generate", "qr.read", "qr.scan", "qr.print", "qr.reprint", "qr.invalidate",
    "stub.configure", "stub.print", "stub.distribution.scan", "stub.distribution.read", "stub.distribution.monitor", "stub.override",
    "orientation.scan", "orientation.read", "orientation.correct",
    "replacement.create", "replacement.read", "replacement.approve",
    "attendance.scan", "attendance.read", "attendance.correct", "attendance.export",
    "photo.upload", "photo.read", "photo.approve", "photo.reject", "photo.configure",
    "payout.scan", "payout.read", "payout.correct",
    "restriction.read", "restriction.create", "restriction.override",
    "report.generate", "report.template.create", "report.template.update", "report.export", "report.read",
    "application.read", "application.update", "application.download", "application.export", "application.import",
    "inquiry.read", "inquiry.update",
    "user.create", "user.read", "user.update", "user.disable", "user.delete",
    "settings.read", "settings.update",
    "audit.read",
    "sync.read", "sync.resolve"
  ],
  PESO_STAFF: [
    "dashboard.view",
    "program.read",
    "beneficiary.read", "beneficiary.update", "beneficiary.profile.edit", "beneficiary.create",
    "dependent.create", "dependent.read", "dependent.update",
    "qr.read", "qr.scan", "qr.print", "qr.reprint",
    "stub.distribution.scan", "stub.distribution.read", "stub.distribution.monitor", "stub.override", "stub.print",
    "orientation.scan", "orientation.read", "orientation.correct",
    "replacement.create", "replacement.read", "replacement.approve",
    "attendance.scan", "attendance.read", "attendance.correct", "attendance.export",
    "photo.upload", "photo.read", "photo.approve",
    "payout.scan", "payout.read", "payout.correct",
    "report.generate", "report.export", "report.read",
    "application.read", "application.update", "application.download", "application.export",
    "inquiry.read", "inquiry.update",
    "restriction.read",
    "sync.read"
  ],
  TUPAD_COORDINATOR: [
    "dashboard.view",
    "beneficiary.read_limited",
    "qr.read", "qr.scan",
    "stub.distribution.scan", "stub.distribution.read_own",
    "orientation.scan", "orientation.read_own",
    "replacement.create", "replacement.read_own",
    "attendance.scan", "attendance.read_own",
    "photo.upload", "photo.read_own",
    "payout.scan", "payout.read_own",
    "sync.read"
  ],
  DOLE_COORDINATOR: [
    "dashboard.view",
    "program.read",
    "beneficiary.read_limited",
    "stub.distribution.read",
    "orientation.read",
    "replacement.read",
    "attendance.read",
    "photo.read_final",
    "payout.read",
    "restriction.read_limited",
    "report.generate", "report.export",
    "sync.read"
  ]
};

export function isDomainMaster(user?: { role?: string } | null): boolean {
  return user?.role === "DOMAIN_MASTER";
}

export function isAdminUser(user?: { role?: string } | null): boolean {
  return user?.role === "DOMAIN_MASTER" || user?.role === "PESO_ADMIN";
}

export function hasPermission(role: string, permission: string): boolean {
  if (role === "DOMAIN_MASTER" || role === "PESO_ADMIN") return true; // Full wildcard bypass for Domain Master and PESO Admin
  const list = PERMISSIONS[role as keyof typeof PERMISSIONS] || [];
  return list.includes(permission);
}
