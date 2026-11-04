import type { Prisma } from "@prisma/client";
import { REPORT_META_FIELDS, REPORT_ROW_FIELDS, DOLE_REPORT_SHEETS, type DoleReportData, type DoleReportDraft, type DoleReportRow } from "@/lib/dole-report-config";

export const EMPTY_REPORT_DRAFT = (): DoleReportDraft => ({ meta: {}, rows: {}, cells: {} });
export class ReportInputError extends Error {}
const text = (value: unknown) => value == null ? "" : String(value).slice(0, 1500);
const ageAt = (birth: string, date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const [y, m, d] = birth.split("-").map(Number), [yy, mm, dd] = date.split("-").map(Number);
  return String(yy - y - (mm < m || mm === m && dd < d ? 1 : 0));
};
export function importedReportRow(row: any) {
  const result: Record<string, string> = {};
  for (const [field] of REPORT_ROW_FIELDS) if (row[field] !== undefined && row[field] !== null) result[field] = text(row[field]);
  for (const field of ["fullName", "age", "dependentFullName"]) if (row[field] != null) result[field] = text(row[field]);
  if (row.isPwd !== undefined) result.pwd = row.isPwd ? "Y" : "N";
  if (row.is4Ps !== undefined) result.fourPs = row.is4Ps ? "Y" : "N";
  if (row.isIp !== undefined) result.ip = row.isIp ? "Y" : "N";
  if (row.reportInputs && typeof row.reportInputs === "object") {
    for (const field of ["district", "email", "bankAccount", "employmentInterest", "remarks", "pwd", "fourPs", "ip", "batchLabel", "proponentLabel", "orientationDate", "payoutDate", "periodOfCoverage", "salary"]) {
      if (row.reportInputs[field] !== undefined) result[field] = text(row.reportInputs[field]);
    }
  }
  return result;
}

/** Immutable program-scoped source snapshots use the existing private audit store, not public settings. */
export async function saveImportedReportRows(tx: Prisma.TransactionClient, programId: string, rows: any[], beneficiaryMap: Map<string, any>, userId: string, strategy: string) {
  const previous = await tx.auditLog.findFirst({ where: { entityType: "PROGRAM_REPORT_MASTERLIST", entityId: programId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const source: Record<string, any> = previous?.newData ? JSON.parse(previous.newData).rows || {} : {};
  for (const row of rows) {
    const key = `${row.fullName.trim().toUpperCase()}_${row.birthday}`;
    const beneficiary = beneficiaryMap.get(key) || beneficiaryMap.get(row.fullName.trim().toUpperCase());
    if (beneficiary && (strategy !== "SKIP" || !source[beneficiary.id])) source[beneficiary.id] = importedReportRow(row);
  }
  await tx.auditLog.create({ data: { userId, action: "REPORT_MASTERLIST_SOURCE_CAPTURED", entityType: "PROGRAM_REPORT_MASTERLIST", entityId: programId, newData: JSON.stringify({ version: 1, rows: source }), metadata: JSON.stringify({ rowCount: rows.length }) } });
}

export function validateReportDraft(raw: any, rowIds: Set<string>): DoleReportDraft {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportInputError("Invalid report draft.");
  if (JSON.stringify(raw).length > 1500000) throw new ReportInputError("Report draft is too large.");
  const draft = EMPTY_REPORT_DRAFT();
  const copy = (obj: any, target: Record<string, string>, allowed: Set<string>) => {
    if (obj == null) return;
    if (typeof obj !== "object" || Array.isArray(obj)) throw new ReportInputError("Invalid report fields.");
    for (const [key, value] of Object.entries(obj)) {
      if (!allowed.has(key) || typeof value !== "string" || value.length > 1500) throw new ReportInputError(`Invalid report field: ${key}`);
      target[key] = value.trim();
    }
  };
  copy(raw.meta, draft.meta, new Set(REPORT_META_FIELDS.map(([key]) => key)));
  for (const key of ["dailyRate", "tupadIdStart"]) if (draft.meta[key] && (!/^\d+(?:\.\d{1,2})?$/.test(draft.meta[key]) || Number(draft.meta[key]) > 100000000)) throw new ReportInputError(`Invalid ${key}.`);
  if (draft.meta.tupadIdStart && !/^\d+$/.test(draft.meta.tupadIdStart)) throw new ReportInputError("TUPAD ID start must be a whole number.");
  for (const key of ["orientationDate", "payoutDate", "certificationDate"]) if (draft.meta[key] && !validReportDate(draft.meta[key])) throw new ReportInputError(`Use a valid YYYY-MM-DD ${key}.`);
  for (const [id, fields] of Object.entries(raw.rows || {})) {
    if (!rowIds.has(id)) throw new ReportInputError("A report row does not belong to this program. Reload the roster.");
    const target: Record<string, string> = {}; copy(fields, target, new Set(REPORT_ROW_FIELDS.map(([key]) => key))); draft.rows[id] = target;
    if (target.birthday && !validReportDate(target.birthday)) throw new ReportInputError("Use a valid YYYY-MM-DD birth date.");
    for (const field of ["monthlyIncome", "dependentAge"]) if (target[field] && (!/^\d+(?:\.\d+)?$/.test(target[field]) || Number(target[field]) > 100000000)) throw new ReportInputError(`Invalid ${field}.`);
  }
  for (const [sheet, cells] of Object.entries(raw.cells || {})) {
    if (!DOLE_REPORT_SHEETS.some((s) => s.name === sheet)) throw new ReportInputError("Unknown report sheet.");
    if (!cells || typeof cells !== "object" || Array.isArray(cells)) throw new ReportInputError("Invalid cell edits.");
    const target: Record<string, string> = {};
    for (const [ref, value] of Object.entries(cells)) {
      if (!/^[A-Z]{1,2}[1-9]\d{0,3}$/.test(ref) || typeof value !== "string" || value.length > 1500) throw new ReportInputError("Invalid blank-cell edit.");
      target[ref] = value;
    }
    draft.cells[sheet] = target;
  }
  return draft;
}
function validReportDate(value: string) { const date = new Date(value + "T00:00:00Z"); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }

export function composeDoleReportData(program: any, source: Record<string, any>, draft: DoleReportDraft, revision: string | null): DoleReportData {
  const workDays = [...program.workDays].sort((a: any, b: any) => a.dayNumber - b.dayNumber);
  const barangays = [...new Set(program.programBeneficiaries.map((pb: any) => pb.beneficiary.barangay).filter(Boolean))];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const districts = [...new Set(program.programBeneficiaries.map((pb: any) => source[pb.beneficiaryId]?.district).filter(Boolean))];
  const meta: Record<string, string> = {
    natureOfProject: "TUPAD", regionalOffice: "III", referenceNumber: program.programCode, adlNumber: program.programCode,
    municipality: program.municipality || "", province: program.province || "", barangay: barangays.length === 1 ? String(barangays[0]) : "Various",
    batchNumber: program.batchNumber || "", proponent: districts.length === 1 ? String(districts[0]) : "", orientationDate: program.orientationDate || "", payoutDate: program.payoutDate || "",
    periodOfCoverage: [program.startDate, program.endDate].filter(Boolean).join(" to "), tupadIdPrefix: "", tupadIdStart: "", dailyRate: "",
    serviceProvider: "UNIVERSAL STOREFRONT SERVICES CORP.", serviceProviderAddress: "", specificNatureOfWork: program.natureOfWork || "", certificationDate: "",
    ...draft.meta,
  };
  const sorted = [...program.programBeneficiaries].sort((a: any, b: any) => a.designatedNumber.localeCompare(b.designatedNumber, undefined, { numeric: true }));
  const seen = new Set<string>();
  const rows: DoleReportRow[] = sorted.map((pb: any) => {
    if (seen.has(pb.designatedNumber)) throw new ReportInputError("Duplicate active designated number. Correct the program roster before generating reports.");
    seen.add(pb.designatedNumber);
    const b = pb.beneficiary, dep = b.dependents?.[0] || {};
    const input = source[b.id] || {};
    const row: DoleReportRow = {
      id: pb.id, designatedNumber: pb.designatedNumber, ...importedReportRow(b),
      dependentFirstName: dep.firstName || "", dependentMiddleName: dep.middleName || "", dependentLastName: dep.lastName || "", dependentExtensionName: dep.extensionName || "", dependentRelationship: dep.relationship || "", dependentAge: dep.age == null ? "" : String(dep.age),
      fullName: b.fullName, birthday: b.birthday, ...input, ...(draft.rows[pb.id] || {}),
      attendance: workDays.map((day: any) => {
        const record = pb.attendanceRecords.find((a: any) => a.workDayId === day.id && a.programId === program.id);
        if (!record) return null;
        return (record.morningTimeIn && record.morningTimeOut ? .5 : 0) + (record.afternoonTimeIn && record.afternoonTimeOut ? .5 : 0);
      }),
    };
    row.sex = /^M(ALE)?$/i.test(row.sex || "") ? "M" : /^F(EMALE)?$/i.test(row.sex || "") ? "F" : row.sex || "";
    row.age = ageAt(row.birthday, meta.orientationDate || today);
    return row;
  });
  const warnings = [
    "Excel 365 must recalculate the original LET/XLOOKUP/dynamic-array formulas before printing. No browser layout is substituted.",
    "Payroll days come from completed AM/PM sessions in this program. Missing scans are not treated as completed work days.",
  ];
  if (!meta.dailyRate) warnings.push("Approved daily wage rate is blank. Complete it before generating payroll reports.");
  if (!meta.tupadIdPrefix || !meta.tupadIdStart) warnings.push("TUPAD ID code/start is blank; fill these to calculate assigned TUPAD IDs.");
  if (!meta.orientationDate) warnings.push("Orientation date is blank; the original age formula falls back to TODAY().");
  if (rows.some((r) => !r.firstName || !r.lastName || !r.idNumber)) warnings.push("Some beneficiary name/ID details are missing. Review the editable report fields.");
  return { program: { id: program.id, programCode: program.programCode, programName: program.programName, requiredWorkDays: program.requiredWorkDays }, meta, rows, workDays, revision, draft, warnings };
}
