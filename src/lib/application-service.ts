import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  DOCUMENT_FIELDS,
  applicationDraftSchema,
  applicationFinalSchema,
  calculateAge,
  formatApplicantFullName,
  formatDependentFullName,
  isAcceptedApplicationFile,
  type ApplicationFormValues,
} from "@/lib/application-schema";
import { removeApplicationDocuments, uploadApplicationDocument } from "@/lib/application-storage";
import { isIdempotentReplay } from "@/lib/application-idempotency";

export type ApplicationAction = "DRAFT" | "SUBMIT";
export type ApplicationSource = "ONLINE" | "WALK_IN";
export type ApplicationFiles = Partial<Record<(typeof DOCUMENT_FIELDS)[number], File>>;

export class ApplicationValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("APPLICATION_VALIDATION_FAILED");
  }
}

function uppercase(value: string): string {
  return value.trim().toUpperCase();
}

function applicationCode(): string {
  const token = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `APP-${new Date().getFullYear()}-DGL-${token}`;
}

function zodErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): Record<string, string> {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] || "form"), issue.message]));
}

export async function parseApplicationRequest(request: Request): Promise<{
  values: unknown;
  files: ApplicationFiles;
  action: ApplicationAction;
  applicationId?: string;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payload = formData.get("payload");
    if (typeof payload !== "string") throw new ApplicationValidationError({ form: "Missing application payload." });
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new ApplicationValidationError({ form: "Invalid application payload." });
    }
    const files: ApplicationFiles = {};
    for (const field of DOCUMENT_FIELDS) {
      const candidate = formData.get(field);
      if (candidate instanceof File && candidate.size > 0) files[field] = candidate;
    }
    return {
      values: parsed.values,
      files,
      action: parsed.action === "DRAFT" ? "DRAFT" : "SUBMIT",
      applicationId: typeof parsed.applicationId === "string" ? parsed.applicationId : undefined,
    };
  }

  const body = await request.json();
  return {
    values: body.values || body,
    files: {},
    action: body.action === "DRAFT" ? "DRAFT" : "SUBMIT",
    applicationId: typeof body.applicationId === "string" ? body.applicationId : undefined,
  };
}

export async function findDuplicateWarnings(values: Partial<ApplicationFormValues>, excludeId?: string) {
  const lastName = uppercase(values.lastName || "");
  const firstName = uppercase(values.givenName || "");
  const idNumber = (values.idNumber || "").trim();
  const birthday = (values.birthDate || "").trim();
  const contact = (values.contactNumber || "").replace(/[\s()-]/g, "");
  const matches: Array<{ reason: string; where: Prisma.TupadApplicationRosterWhereInput }> = [];

  if (idNumber) matches.push({ reason: "Same ID number", where: { idNumber: { equals: idNumber, mode: "insensitive" } } });
  if (lastName && firstName && birthday) {
    matches.push({ reason: "Same full name and birth date", where: { lastName, firstName, birthday } });
  }
  if (lastName && firstName && contact) {
    matches.push({ reason: "Same full name and contact number", where: { lastName, firstName, contactNumber: contact } });
  }

  const reasons: string[] = [];
  for (const match of matches) {
    const exists = await prisma.tupadApplicationRoster.findFirst({
      where: { AND: [match.where, ...(excludeId ? [{ id: { not: excludeId } }] : [])] },
      select: { id: true },
    });
    if (exists) reasons.push(match.reason);
  }
  return { possibleDuplicate: reasons.length > 0, reasons: [...new Set(reasons)] };
}

function documentSubject(fieldName: keyof ApplicationFiles): string {
  if (fieldName.startsWith("dependent")) return "DEPENDENT";
  if (fieldName === "medicalCertificate") return "SUPPORTING";
  return "APPLICANT";
}

function toDatabaseData(
  values: ApplicationFormValues,
  source: ApplicationSource,
  encoderId: string | null,
  duplicateWarning: Awaited<ReturnType<typeof findDuplicateWarnings>>
): Prisma.TupadApplicationRosterUncheckedCreateInput {
  const [birthYear, birthMonth, birthDay] = values.birthDate ? values.birthDate.split("-") : ["", "", ""];
  const occupations = values.occupations.map((item) => item === "Other" ? values.occupationOther : item).filter(Boolean);
  const training = values.skillsTraining.map((item) => item === "Other" ? values.skillsTrainingOther : item).filter(Boolean);
  const applicantAge = calculateAge(values.birthDate);
  const dependentAge = values.dependentBirthDate ? calculateAge(values.dependentBirthDate) : values.dependentAge;
  const fieldSources = {
    ...values.fieldSources,
    applicantAge: "CALCULATION",
    ...(values.dependentBirthDate ? { dependentAge: "CALCULATION" } : {}),
  };

  return {
    batchName: source === "ONLINE" ? "Online TUPAD Application Portal" : "Walk-in Encoding",
    source,
    submissionStatus: "DRAFT",
    email: values.email.trim().toLowerCase() || null,
    lastName: uppercase(values.lastName),
    firstName: uppercase(values.givenName),
    middleName: uppercase(values.middleName) || null,
    extensionName: uppercase(values.extensionName) || null,
    fullName: formatApplicantFullName(values),
    birthMonth: birthMonth || null,
    birthDay: birthDay || null,
    birthYear: birthYear || null,
    birthday: values.birthDate || null,
    applicantAge,
    sex: values.sex || null,
    civilStatus: values.civilStatus || null,
    streetSitio: uppercase(values.streetSitio) || null,
    barangay: values.barangay || null,
    contactNumber: values.contactNumber.replace(/[\s()-]/g, "") || null,
    idPresented: values.idType || null,
    idNumber: values.idNumber.trim() || null,
    typeOfBeneficiary: values.typeOfBeneficiary || null,
    is4ps: values.is4ps || null,
    isIp: values.isIp || null,
    disability: uppercase(values.disability) || null,
    occupation: occupations.join(", ") || null,
    occupations: occupations,
    occupationOther: uppercase(values.occupationOther) || null,
    monthlyIncome: values.monthlyIncome.replace(/,/g, "") || null,
    monthlyIncomeAmount: values.monthlyIncome ? values.monthlyIncome.replace(/,/g, "") : null,
    employmentInterest: values.employmentInterest || null,
    skillsTraining: training,
    skillsTrainingOther: uppercase(values.skillsTrainingOther) || null,
    dependentFullName: formatDependentFullName(values) || null,
    dependentGivenName: uppercase(values.dependentGivenName) || null,
    dependentMiddleName: uppercase(values.dependentMiddleName) || null,
    dependentLastName: uppercase(values.dependentLastName) || null,
    dependentExtensionName: uppercase(values.dependentExtensionName) || null,
    dependentBirthDate: values.dependentBirthDate || null,
    dependentAge: dependentAge === null ? null : String(dependentAge),
    dependentAgeValue: dependentAge,
    dependentRelationship: values.dependentRelationship || null,
    medicalReminderAcknowledged: values.medicalReminderAcknowledged,
    fieldSources,
    ocrMetadata: JSON.parse(JSON.stringify(values.ocrMetadata || {})) as Prisma.InputJsonValue,
    duplicateWarning,
    remarks: values.remarks || null,
    status: "INCOMPLETE",
    encodedById: encoderId,
    uploadedById: encoderId,
  };
}

export async function saveApplication(options: {
  values: unknown;
  files: ApplicationFiles;
  action: ApplicationAction;
  source: ApplicationSource;
  encoderId?: string | null;
  applicationId?: string;
}) {
  const schema = options.action === "SUBMIT" ? applicationFinalSchema : applicationDraftSchema;
  const parsed = schema.safeParse(options.values);
  if (!parsed.success) throw new ApplicationValidationError(zodErrors(parsed.error));
  const values = parsed.data;

  for (const [field, file] of Object.entries(options.files)) {
    const error = isAcceptedApplicationFile(file);
    if (error) throw new ApplicationValidationError({ [field]: error });
  }

  let existing = options.applicationId
    ? await prisma.tupadApplicationRoster.findUnique({ where: { id: options.applicationId }, include: { documents: true } })
    : await prisma.tupadApplicationRoster.findUnique({ where: { idempotencyKey: values.idempotencyKey }, include: { documents: true } });

  if (existing && existing.source !== options.source) {
    throw new ApplicationValidationError({ form: "Invalid application reference." });
  }
  if (options.source === "WALK_IN" && existing && existing.encodedById !== options.encoderId) {
    throw new ApplicationValidationError({ form: "Draft belongs to a different encoder." });
  }
  if (existing && isIdempotentReplay(existing.submissionStatus, options.action)) {
    return { application: existing, duplicateWarning: existing.duplicateWarning, idempotent: true };
  }
  if (existing?.submissionStatus === "SUBMITTED") {
    throw new ApplicationValidationError({ form: "Submitted applications cannot be overwritten by a draft." });
  }

  const existingFields = new Set(existing?.documents.map((document) => document.fieldName) || []);
  const missingDocuments: Record<string, string> = {};
  if (options.action === "SUBMIT") {
    for (const field of ["applicantIdFront", "applicantIdBack", "dependentIdFront", "dependentIdBack"] as const) {
      if (!options.files[field] && !existingFields.has(field)) missingDocuments[field] = "Required ang document na ito bago magsumite.";
    }
  }
  if (Object.keys(missingDocuments).length) throw new ApplicationValidationError(missingDocuments);

  const duplicateWarning = await findDuplicateWarnings(values, existing?.id);
  const dbData = toDatabaseData(values, options.source, options.encoderId || null, duplicateWarning);
  let createdNow = false;

  if (existing) {
    existing = await prisma.tupadApplicationRoster.update({
      where: { id: existing.id },
      data: dbData,
      include: { documents: true },
    });
  } else {
    createdNow = true;
    existing = await prisma.tupadApplicationRoster.create({
      data: { ...dbData, applicationCode: applicationCode(), idempotencyKey: values.idempotencyKey },
      include: { documents: true },
    });
  }

  if (!existing) throw new Error("APPLICATION_RECORD_NOT_CREATED");

  const uploaded: Array<{ bucket: string; key: string }> = [];
  const createdDocumentIds: string[] = [];
  try {
    for (const [fieldName, file] of Object.entries(options.files) as Array<[keyof ApplicationFiles, File]>) {
      const subject = documentSubject(fieldName);
      const stored = await uploadApplicationDocument(existing.id, fieldName, subject, file);
      uploaded.push(stored);
      const documentRecord = await prisma.tupadApplicationDocument.create({
        data: {
          applicationId: existing.id,
          fieldName,
          subject,
          storageBucket: stored.bucket,
          storageKey: stored.key,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedById: options.encoderId || null,
        },
      });
      createdDocumentIds.push(documentRecord.id);
    }

    const application = await prisma.tupadApplicationRoster.update({
      where: { id: existing.id },
      data: options.action === "SUBMIT"
        ? { submissionStatus: "SUBMITTED", status: "PENDING_REVIEW", submittedAt: new Date() }
        : { submissionStatus: "DRAFT", status: "INCOMPLETE", submittedAt: null },
      include: { documents: { select: { id: true, fieldName: true, subject: true, fileName: true, mimeType: true, createdAt: true } } },
    });

    return { application, duplicateWarning, idempotent: false };
  } catch (error) {
    if (createdDocumentIds.length) {
      await prisma.tupadApplicationDocument.deleteMany({ where: { id: { in: createdDocumentIds } } }).catch(() => undefined);
    }
    if (uploaded.length) await removeApplicationDocuments(uploaded).catch(() => undefined);
    if (createdNow) await prisma.tupadApplicationRoster.delete({ where: { id: existing.id } }).catch(() => undefined);
    throw error;
  }
}
