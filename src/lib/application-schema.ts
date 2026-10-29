import { z } from "zod";

export const APPLICATION_SOURCES = ["ONLINE", "WALK_IN"] as const;
export const EXTENSION_NAMES = ["JR", "SR", "I", "II", "III", "IV"] as const;
export const SEX_OPTIONS = ["MALE", "FEMALE"] as const;
export const CIVIL_STATUS_OPTIONS = ["SINGLE", "MARRIED", "WIDOWED", "SEPPARATED"] as const;
export const YES_NO_OPTIONS = ["Y", "N"] as const;
export const EMPLOYMENT_INTEREST_OPTIONS = ["YES", "No"] as const;

export const ID_TYPES = [
  "NATIONAL ID",
  "DRIVER LICENSE ID",
  "SSS ID",
  "TIN ID",
  "PHILHEALTH ID",
  "UMID",
  "SENIOR CITIZEN ID",
  "PASSPORT",
  "POLICE CLEARANCE",
  "NBI CLEARANCE",
  "PAGIBIG ID",
  "SOLO PARENT ID",
  "PWD ID",
  "POSTAL ID",
  "PRC",
  "VOTER'S ID",
  "VOTER'S CETIFICATE",
] as const;

export const BENEFICIARY_TYPES = [
  "SENIOR CITIZEN",
  "SELF-EMPLOYED",
  "UNDEREMPLOYED",
  "PARENTS OF CHILD LABOR",
  "SOLO PARENT",
  "PWD",
  "DISPLACED WORKER",
  "FARMERS",
  "FISHERFOLKS",
  "REBEL RETURNEES",
  "PAROLE",
] as const;

export const OCCUPATION_OPTIONS = [
  "FARMER",
  "FISHERMAN / FISHERFOLKS",
  "CARPENTER",
  "LABORER",
  "DRIVER",
  "VENDOR",
  "MINERS",
  "CONSTRUCTION WORKERS",
  "TRICYCLE DRIVER",
  "HOMEBASED WORKER",
  "Other",
] as const;

export const SKILLS_TRAINING_OPTIONS = [
  "DRIVING COURSES",
  "BARISTA",
  "BREAD & PASTRY PRODUCTION",
  "BARTENDING",
  "COOKERY",
  "FOOD AND BEVERAGE SERVICES",
  "FOOD PROCESSING",
  "AGRICULTURAL CROPS PRODUCTION",
  "HAIRDRESSING",
  "CAREGIVER",
  "CARPENTRY",
  "SHIELDED METAL ARC WELDING (SMAW)",
  "GAS METAL ARC WELDING (GMAW)",
  "ELECTRICAL INSTALLATION AND MAINTENANCE",
  "REFRIGERATION AND AIR-CONDITIONING",
  "Other",
] as const;

export const BARANGAYS = [
  "APLAYA",
  "BUTAS NA BATO",
  "MATAWE",
  "CARAGSACAN",
  "DAVILDAVILAN",
  "DIKAPANIKIAN",
  "IBONA",
  "PALTIC",
  "POBLACION",
  "TANAWAN",
  "UMIRAY",
] as const;

export const RELATIONSHIP_OPTIONS = [
  "WIFE",
  "HUSBAND",
  "SON",
  "GUARDIAN",
  "LIVE IN PARTNER",
  "GRAND PARENT",
  "DAUGHTER",
  "MOTHER",
  "FATHER",
  "BROTHER",
  "SISTER",
  "NEPHEW / NIECE",
] as const;

export const DOCUMENT_FIELDS = [
  "applicantIdFront",
  "applicantIdBack",
  "medicalCertificate",
  "dependentIdFront",
  "dependentIdBack",
] as const;

export const MAX_APPLICATION_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_APPLICATION_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/bmp",
] as const;

const optionalEmail = z.string().trim().refine(
  (value) => !value || z.string().email().safeParse(value).success,
  "Maglagay ng valid email address."
);

const optionalContact = z.string().trim().refine((value) => {
  if (!value) return true;
  const compact = value.replace(/[\s()-]/g, "");
  return /^(?:\+63|0)(?:9\d{9}|2\d{8}|[3-8]\d{7,9})$/.test(compact);
}, "Maglagay ng valid Philippine contact number.");

const optionalDate = z.string().trim().refine((value) => {
  if (!value) return true;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed <= new Date();
}, "Maglagay ng valid date na hindi nasa hinaharap.");

const optionalIncome = z.string().trim().refine((value) => {
  if (!value) return true;
  const amount = Number(value.replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 0;
}, "Ang income ay kailangang valid at hindi negative.");

const optionOrEmpty = <T extends readonly [string, ...string[]]>(options: T) => z.union([z.literal(""), z.enum(options)]);

export const applicationDraftSchema = z.object({
  email: optionalEmail,
  givenName: z.string().trim(),
  middleName: z.string().trim(),
  lastName: z.string().trim(),
  extensionName: optionOrEmpty(EXTENSION_NAMES),
  birthDate: optionalDate,
  applicantAge: z.number().int().min(0).max(130).nullable(),
  sex: optionOrEmpty(SEX_OPTIONS),
  civilStatus: optionOrEmpty(CIVIL_STATUS_OPTIONS),
  contactNumber: optionalContact,
  idType: optionOrEmpty(ID_TYPES),
  idNumber: z.string().trim(),
  typeOfBeneficiary: optionOrEmpty(BENEFICIARY_TYPES),
  isIp: optionOrEmpty(YES_NO_OPTIONS),
  is4ps: optionOrEmpty(YES_NO_OPTIONS),
  disability: z.string().trim(),
  occupations: z.array(z.enum(OCCUPATION_OPTIONS)),
  occupationOther: z.string().trim(),
  monthlyIncome: optionalIncome,
  employmentInterest: optionOrEmpty(EMPLOYMENT_INTEREST_OPTIONS),
  skillsTraining: z.array(z.enum(SKILLS_TRAINING_OPTIONS)),
  skillsTrainingOther: z.string().trim(),
  barangay: optionOrEmpty(BARANGAYS),
  streetSitio: z.string().trim(),
  medicalReminderAcknowledged: z.boolean(),
  dependentGivenName: z.string().trim(),
  dependentMiddleName: z.string().trim(),
  dependentLastName: z.string().trim(),
  dependentExtensionName: optionOrEmpty(EXTENSION_NAMES),
  dependentBirthDate: optionalDate,
  dependentAge: z.number().int().min(0).max(130).nullable(),
  dependentRelationship: optionOrEmpty(RELATIONSHIP_OPTIONS),
  remarks: z.string().trim(),
  agreedToTruthfulness: z.boolean(),
  agreedToDataPrivacy: z.boolean(),
  idempotencyKey: z.string().min(8),
  fieldSources: z.record(z.enum(["OCR", "MANUAL", "CALCULATION"])),
  ocrMetadata: z.record(z.unknown()).optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationDraftSchema>;

const REQUIRED_FIELDS: Array<[keyof ApplicationFormValues, string]> = [
  ["email", "Email"],
  ["givenName", "GIVEN NAME"],
  ["lastName", "LAST NAME"],
  ["birthDate", "BIRTH DATE"],
  ["applicantAge", "AGE"],
  ["sex", "SEX"],
  ["civilStatus", "CIVIL STATUS"],
  ["contactNumber", "CONTACT NUMBER"],
  ["idType", "TYPE OF ID"],
  ["idNumber", "ID NUMBER"],
  ["typeOfBeneficiary", "TYPE OF BENEFICIARIES"],
  ["isIp", "ARE YOU IP's"],
  ["is4ps", "ARE YOU MEMBER OF 4P's"],
  ["occupations", "OCCUPATION"],
  ["monthlyIncome", "AVERAGE MONTHLY INCOME"],
  ["employmentInterest", "INTERESTED IN WAGE EMPLOYMENT OR SELF-EMPLOYMENT?"],
  ["barangay", "BARANGAY"],
  ["streetSitio", "STREET / PUROK / SITIO"],
  ["dependentGivenName", "DEPENDENT GIVEN NAME"],
  ["dependentLastName", "DEPENDENT LAST NAME"],
  ["dependentAge", "DEPENDENT AGE"],
];

export const applicationFinalSchema = applicationDraftSchema.superRefine((values, ctx) => {
  for (const [field, label] of REQUIRED_FIELDS) {
    const value = values[field];
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${label} ay required.` });
    }
  }

  if (values.occupations.includes("Other") && !values.occupationOther) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["occupationOther"], message: "Ilagay ang Other occupation." });
  }
  if (values.skillsTraining.includes("Other") && !values.skillsTrainingOther) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["skillsTrainingOther"], message: "Ilagay ang Other skills training." });
  }
  if (!values.agreedToTruthfulness) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["agreedToTruthfulness"], message: "Kailangan ang declaration of truthfulness." });
  }
  if (!values.agreedToDataPrivacy) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["agreedToDataPrivacy"], message: "Kailangan ang data privacy consent." });
  }
});

export function calculateAge(birthDate: string, applicationDate = new Date()): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > applicationDate) return null;
  let age = applicationDate.getFullYear() - birth.getFullYear();
  const monthDelta = applicationDate.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && applicationDate.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

export function createEmptyApplication(): ApplicationFormValues {
  return {
    email: "",
    givenName: "",
    middleName: "",
    lastName: "",
    extensionName: "",
    birthDate: "",
    applicantAge: null,
    sex: "",
    civilStatus: "",
    contactNumber: "",
    idType: "",
    idNumber: "",
    typeOfBeneficiary: "",
    isIp: "",
    is4ps: "",
    disability: "",
    occupations: [],
    occupationOther: "",
    monthlyIncome: "",
    employmentInterest: "",
    skillsTraining: [],
    skillsTrainingOther: "",
    barangay: "",
    streetSitio: "",
    medicalReminderAcknowledged: false,
    dependentGivenName: "",
    dependentMiddleName: "",
    dependentLastName: "",
    dependentExtensionName: "",
    dependentBirthDate: "",
    dependentAge: null,
    dependentRelationship: "",
    remarks: "",
    agreedToTruthfulness: false,
    agreedToDataPrivacy: false,
    idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    fieldSources: {},
    ocrMetadata: {},
  };
}

export function formatApplicantFullName(values: Pick<ApplicationFormValues, "lastName" | "givenName" | "middleName" | "extensionName">): string {
  const suffix = [values.givenName, values.middleName, values.extensionName].filter(Boolean).join(" ");
  return `${values.lastName}, ${suffix}`.trim().toUpperCase();
}

export function formatDependentFullName(values: Pick<ApplicationFormValues, "dependentGivenName" | "dependentMiddleName" | "dependentLastName" | "dependentExtensionName">): string {
  return [values.dependentGivenName, values.dependentMiddleName, values.dependentLastName, values.dependentExtensionName]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toUpperCase();
}

export function isAcceptedApplicationFile(file: Pick<File, "type" | "size">): string | null {
  if (file.size > MAX_APPLICATION_FILE_SIZE) return "Maximum na 10 MB lamang ang bawat document.";
  if (!ACCEPTED_APPLICATION_FILE_TYPES.includes(file.type as (typeof ACCEPTED_APPLICATION_FILE_TYPES)[number])) {
    return "Image o PDF lamang ang maaaring i-upload.";
  }
  return null;
}
