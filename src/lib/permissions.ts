export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  role: "PESO_ADMIN" | "TUPAD_COORDINATOR" | "DOLE_COORDINATOR";
}

export const PERMISSIONS = {
  PESO_ADMIN: [
    "dashboard.view",
    "program.create", "program.read", "program.update", "program.delete", "program.close",
    "beneficiary.import", "beneficiary.create", "beneficiary.read", "beneficiary.update", "beneficiary.delete", "beneficiary.archive",
    "dependent.create", "dependent.read", "dependent.update",
    "qr.generate", "qr.read", "qr.print", "qr.reprint", "qr.invalidate",
    "stub.configure", "stub.print", "stub.distribution.scan", "stub.distribution.read", "stub.distribution.monitor",
    "orientation.scan", "orientation.read", "orientation.correct",
    "replacement.create", "replacement.read", "replacement.approve",
    "attendance.scan", "attendance.read", "attendance.correct", "attendance.export",
    "photo.upload", "photo.read", "photo.approve", "photo.reject", "photo.configure",
    "payout.scan", "payout.read", "payout.correct",
    "restriction.read", "restriction.create", "restriction.override",
    "report.generate", "report.template.create", "report.template.update", "report.export",
    "user.create", "user.read", "user.update", "user.disable",
    "settings.read", "settings.update",
    "audit.read",
    "sync.read", "sync.resolve"
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

export function hasPermission(role: string, permission: string): boolean {
  const list = PERMISSIONS[role as keyof typeof PERMISSIONS] || [];
  return list.includes(permission);
}
