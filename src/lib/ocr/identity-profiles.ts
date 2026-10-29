import { ID_TYPES } from "../application-schema.ts";

export type IdentityDocumentType = (typeof ID_TYPES)[number];
interface IdentityProfile {
  numberLabel: string;
  numberPatterns: RegExp[];
  qrNumberAliases: string[];
  guide: string;
  nationalLayout?: boolean;
}
const genericNumbers = [/\bID\s*(?:NUMBER|NO\.?)\b/i, /\bDOCUMENT\s*NUMBER\b/i, /\bCARD\s*NUMBER\b/i];
const profile = (numberLabel: string, numberPatterns: RegExp[], qrNumberAliases: string[], guide: string): IdentityProfile => ({ numberLabel, numberPatterns: [...numberPatterns, ...genericNumbers].map((pattern) => new RegExp(pattern.source.replace(/NO/g, "N[O0]"), "i")), qrNumberAliases: [...qrNumberAliases, "documentNumber", "idNumber", "cardNumber"], guide });

// Use printed labels for variable layouts. PhilSys and recognized LTO layouts
// have their own guarded region recovery, never another agency's coordinates.
const PROFILES: Record<IdentityDocumentType, IdentityProfile> = {
  "NATIONAL ID": { ...profile("PCN", [/\bPCN\b/i, /\bPHILSYS\s*CARD\s*(?:NUMBER|NO\.?)\b/i, /\bPSN\b/i], ["pcn", "philSysCardNumber", "psn"], "Ipakita ang buong front para sa pangalan, birthday, address at 16-digit PCN; isama ang back para sa QR. Huwag putulin ang numero sa itaas."), nationalLayout: true },
  "DRIVER LICENSE ID": profile("License Number", [/\bLICEN[CS]E\s*(?:NUMBER|NO\.?)\b/i], ["licenseNumber", "licenceNumber"], "Ipakita ang front na may License No., pangalan, birth date at address. Susundin ang Last / First / Middle Name labels."),
  "SSS ID": profile("SS Number", [/\b(?:SSS?|SOCIAL\s*SECURITY)\s*(?:NUMBER|NO\.?)\b/i], ["ssNumber", "sssNumber", "socialSecurityNumber"], "Ipakita ang SS Number at personal-information section. Kung UMID card ang hawak, piliin ang UMID."),
  "TIN ID": profile("TIN", [/\bTIN\b(?=\s*[:#.-]|\s+\d|\s*$)/i, /\bTAX\s*IDENTIFICATION\s*(?:NUMBER|NO\.?)\b/i], ["tin", "taxIdentificationNumber"], "Ipakita ang TIN, pangalan, birthday at address kung nakalimbag. Hindi kukunin ang issue date bilang birthday."),
  "PHILHEALTH ID": profile("PhilHealth Number", [/\b(?:PHILHEALTH|PHILHEALTH\s*IDENTIFICATION|PIN)\s*(?:NUMBER|NO\.?)\b/i, /^PIN\b/i], ["pin", "philHealthNumber"], "Ipakita ang PhilHealth Identification Number / PIN at personal-information section."),
  "UMID": profile("CRN", [/\bCRN\b/i, /\bCOMMON\s*REFERENCE\s*(?:NUMBER|NO\.?)\b/i], ["crn", "commonReferenceNumber"], "Ipakita ang CRN at pangalan, birthday at address. CRN ang babasahin, hindi PhilSys PCN."),
  "SENIOR CITIZEN ID": profile("ID Number", [/\b(?:OSCA|CONTROL)\s*(?:NUMBER|NO\.?)\b/i], ["oscaNumber", "controlNumber"], "Ipakita ang ID / OSCA number at personal details. Nag-iiba ang layout bawat LGU; printed labels ang susundin."),
  "PASSPORT": profile("Passport Number", [/\bPASSPORT\s*(?:NUMBER|NO\.?)\b/i], ["passportNumber"], "I-upload ang bio-data page na may Passport No., surname, given names at date of birth. Walang address autofill kung hindi nakalimbag."),
  "POLICE CLEARANCE": profile("Clearance Number", [/\b(?:CLEARANCE|CONTROL)\s*(?:NUMBER|NO\.?)\b/i], ["clearanceNumber", "controlNumber"], "Ipakita ang Clearance / Control No. at personal details; hindi receipt number ang gagamitin."),
  "NBI CLEARANCE": profile("NBI ID Number", [/\bNBI\s*(?:ID\s*)?(?:NUMBER|NO\.?)\b/i], ["nbiNumber", "nbiIdNumber"], "Ipakita ang NBI ID No. at personal details; hindi OR / payment reference ang gagamitin."),
  "PAGIBIG ID": profile("MID Number", [/\b(?:MID|PAG.?IBIG)\s*(?:NUMBER|NO\.?)\b/i], ["midNumber", "pagIbigNumber"], "Ipakita ang MID No. at personal details. Kung loyalty card, isama ang side na may MID number."),
  "SOLO PARENT ID": profile("ID Number", [/\b(?:SOLO\s*PARENT|SPIC)\s*(?:ID\s*)?(?:NUMBER|NO\.?)\b/i], ["spicNumber"], "Ipakita ang ID number at personal details. Printed labels ang susundin dahil iba-iba ang LGU layout."),
  "PWD ID": profile("PWD ID Number", [/\bPWD\s*(?:ID\s*)?(?:NUMBER|NO\.?)\b/i], ["pwdNumber"], "Ipakita ang PWD ID No., pangalan, birthday at address kung mayroon. Hindi huhulaan ang disability details."),
  "POSTAL ID": profile("Postal Reference Number", [/\b(?:PRN|POSTAL\s*(?:REFERENCE|ID))\s*(?:NUMBER|NO\.?)\b/i, /^PRN\b/i], ["prn", "postalNumber"], "Ipakita ang Postal ID / PRN at personal-information section."),
  "PRC": profile("Registration Number", [/\b(?:REGISTRATION|REG\.?|LICEN[CS]E)\s*(?:NUMBER|NO\.?)\b/i], ["registrationNumber", "licenseNumber"], "Ipakita ang Registration No. at personal details. Hindi issue / expiry date ang birthday."),
  "VOTER'S ID": profile("VIN", [/\bV\s*\.?\s*[I1L]\s*\.?\s*N\b\.?/i, /\bVOTER.?S?\s*(?:IDENTIFICATION|ID)\s*(?:NUMBER|NO\.?)\b/i], ["vin", "voterIdNumber", "voterIdentificationNumber"], "Ipakita ang VIN at personal details, saanman ito nakalimbag sa card; hindi precinct number ang ID number."),
  "VOTER'S CETIFICATE": profile("VIN", [/\bV\s*\.?\s*[I1L]\s*\.?\s*N\b\.?/i, /\bVOTER.?S?\s*(?:IDENTIFICATION|ID)\s*(?:NUMBER|NO\.?)\b/i], ["vin", "voterIdNumber", "voterIdentificationNumber"], "Ipakita ang certificate section na may VIN at personal details; hahanapin ang label saanman sa page, hindi ang precinct / certificate reference."),
};

export function getIdentityProfile(idType: string): IdentityProfile | undefined {
  return ID_TYPES.includes(idType as IdentityDocumentType) ? PROFILES[idType as IdentityDocumentType] : undefined;
}
