export const DOLE_REPORT_VERSION = "dole-2026-forms-v1";
export const DOLE_REPORT_SHEETS = [
  { name: "FORM 4 EDIT", start: 14, end: 561, key: "A", label: "Form 4 working data" },
  { name: "FORM 4 FINAL", start: 14, end: 513, key: "A", label: "Form 4 final beneficiary profile" },
  { name: "for GPAI Enrollment", start: 17, end: 616, key: "A", label: "GPAI insurance enrollment" },
  { name: "CONTRACT", start: 6, end: 605, key: "A", label: "Beneficiary contract list" },
  { name: "PAYROLL", start: 19, end: 618, key: "A", label: "DOLE payroll" },
  { name: "USSC PAYROLL", start: 2, end: 601, key: "A", label: "USSC payroll" },
  { name: "PPES", start: 13, end: 612, key: "A", label: "PPE acknowledgement" },
  { name: "DTR", start: 11, end: 510, key: "A", label: "Daily time record certification" },
  { name: "SUMMARY BREAKDOWN", start: 2, end: 50, key: "A", label: "Consolidated demographic summary" },
  { name: "LIST MED", start: 7, end: 150, key: "A", label: "Senior citizens medical list" },
  { name: "VALIDATOR", start: 2, end: 501, key: "A", label: "Beneficiary validation list" },
  { name: "FORM 4 for consolidated", start: 3, end: 550, key: "H", label: "Form 4 consolidated masterlist" },
] as const;
export type DoleSheetName = typeof DOLE_REPORT_SHEETS[number]["name"];
export const FORM4_CONSOLIDATED = "FORM 4 for consolidated";
export const REPORT_META_FIELDS = [
  ["natureOfProject", "Nature of project"], ["regionalOffice", "Regional office"], ["referenceNumber", "Reference number"],
  ["adlNumber", "ADL number"], ["municipality", "Municipality"], ["province", "Province"], ["barangay", "Barangay / Various"],
  ["batchNumber", "Batch number"], ["proponent", "Proponent / district code"], ["orientationDate", "Orientation date (YYYY-MM-DD)"],
  ["payoutDate", "Payout date (YYYY-MM-DD)"], ["periodOfCoverage", "Work period"], ["tupadIdPrefix", "TUPAD ID prefix"],
  ["tupadIdStart", "First TUPAD ID sequence number"], ["dailyRate", "Approved daily wage rate (PHP)"],
  ["serviceProvider", "Payroll service provider"], ["serviceProviderAddress", "Service provider address"],
  ["specificNatureOfWork", "Specific nature of work"], ["certificationDate", "DTR certification date (YYYY-MM-DD)"],
  ["preparedBy", "Form 4 prepared/certified by"], ["contractWitness", "Contract LGU witness"], ["contractDoleWitness", "Contract DOLE witness"],
  ["fundsAvailableBy", "Payroll funds available by"], ["payrollCertifiedBy", "Payroll certified by"],
  ["insurancePreparedBy", "Insurance prepared by"], ["insuranceApprovedBy", "Insurance approved by"], ["dtrCertifiedBy", "DTR certified by"],
] as const;
export const REPORT_ROW_FIELDS = [
  ["firstName", "First name"], ["middleName", "Middle name"], ["lastName", "Last name"], ["extensionName", "Extension"],
  ["birthday", "Birthdate (YYYY-MM-DD)"], ["sitio", "Street / Purok / Sitio"], ["barangay", "Barangay"],
  ["municipality", "Municipality"], ["province", "Province"], ["district", "District"], ["email", "Email"],
  ["idType", "ID type"], ["idNumber", "ID number"], ["contactNumber", "Contact number"], ["bankAccount", "E-payment account"],
  ["typeOfBeneficiary", "Type of beneficiary"], ["occupation", "Occupation"], ["sex", "Sex"], ["civilStatus", "Civil status"],
  ["monthlyIncome", "Average monthly income"], ["dependentFirstName", "Dependent first name"], ["dependentMiddleName", "Dependent middle name"],
  ["dependentLastName", "Dependent last name"], ["dependentExtensionName", "Dependent extension"], ["dependentRelationship", "Dependent relationship"],
  ["dependentAge", "Dependent age"], ["employmentInterest", "Employment interest"], ["skillsTraining", "Skills training"],
  ["pwd", "PWD / type of disability"], ["fourPs", "4Ps (Y / N / EX)"], ["ip", "IP (Y / N)"], ["remarks", "Remarks"],
] as const;
export function canUseDoleReports(user?: { role?: string } | null) {
  return !!user && ["DOMAIN_MASTER", "PESO_ADMIN", "DOLE_COORDINATOR"].includes(user.role || "");
}
export interface DoleReportDraft {
  meta: Record<string, string>;
  rows: Record<string, Record<string, string>>;
  cells: Record<string, Record<string, string>>;
}
export interface DoleReportRow extends Record<string, any> { id: string; designatedNumber: string; attendance: (number | null)[]; }
export interface DoleReportData {
  program: { id: string; programCode: string; programName: string; requiredWorkDays: number };
  meta: Record<string, string>;
  rows: DoleReportRow[];
  workDays: { id: string; dayNumber: number; workDate: string }[];
  revision: string | null;
  draft: DoleReportDraft;
  warnings: string[];
}
