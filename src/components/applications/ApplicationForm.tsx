"use client";

import React, { useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, RotateCcw, Save, Send, UserPlus } from "lucide-react";
import { PesoLogo } from "@/components/layout/PesoLogo";
import { IdUploadPanel, type OcrResponse } from "./IdUploadPanel";
import {
  BARANGAYS,
  BENEFICIARY_TYPES,
  CIVIL_STATUS_OPTIONS,
  EMPLOYMENT_INTEREST_OPTIONS,
  EXTENSION_NAMES,
  ID_TYPES,
  OCCUPATION_OPTIONS,
  RELATIONSHIP_OPTIONS,
  SEX_OPTIONS,
  SKILLS_TRAINING_OPTIONS,
  YES_NO_OPTIONS,
  applicationFinalSchema,
  calculateAge,
  createEmptyApplication,
  isAcceptedApplicationFile,
  type ApplicationFormValues,
} from "@/lib/application-schema";
import { applyOcrAutofill, ocrFieldsForSubject, type OcrConflict } from "@/lib/ocr/application-id-mapper";

type DocumentField = "applicantIdFront" | "applicantIdBack" | "medicalCertificate" | "dependentIdFront" | "dependentIdBack";
type FormErrors = Record<string, string>;

interface ApplicationFormProps {
  mode: "ONLINE" | "WALK_IN";
  encoderName?: string;
}

interface FieldProps {
  name: keyof ApplicationFormValues;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  values: ApplicationFormValues;
  errors: FormErrors;
  uncertain: Set<keyof ApplicationFormValues>;
  onChange: (name: keyof ApplicationFormValues, value: string) => void;
}

function SourceBadge({ name, values, uncertain }: Pick<FieldProps, "name" | "values" | "uncertain">) {
  const source = values.fieldSources[name];
  if (!source && !uncertain.has(name)) return null;
  return <span className={`ml-2 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${uncertain.has(name) ? "border-amber-300 bg-amber-50 text-amber-800" : source === "OCR" ? "border-blue-200 bg-blue-50 text-blue-700" : source === "CALCULATION" ? "border-purple-200 bg-purple-50 text-purple-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{uncertain.has(name) ? "NEEDS REVIEW" : source}</span>;
}

function TextField({ name, label, required, type = "text", placeholder, values, errors, uncertain, onChange }: FieldProps) {
  const rawValue = values[name];
  return <label className="block space-y-1">
    <span className="text-xs font-black uppercase text-slate-700">{label}{required ? " *" : ""}<SourceBadge name={name} values={values} uncertain={uncertain} /></span>
    <input
      type={type}
      value={typeof rawValue === "string" || typeof rawValue === "number" ? rawValue : ""}
      readOnly={name === "applicantAge" || (name === "dependentAge" && Boolean(values.dependentBirthDate))}
      placeholder={placeholder}
      onChange={(event) => onChange(name, event.target.value)}
      className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-blue-100 ${errors[name] ? "border-rose-400" : uncertain.has(name) ? "border-amber-400" : "border-slate-300 focus:border-gov-blue"}`}
    />
    {errors[name] && <span className="text-xs font-semibold text-rose-600">{errors[name]}</span>}
  </label>;
}

function SelectField({ name, label, required, options, values, errors, uncertain, onChange }: FieldProps & { options: readonly string[] }) {
  return <label className="block space-y-1">
    <span className="text-xs font-black uppercase text-slate-700">{label}{required ? " *" : ""}<SourceBadge name={name} values={values} uncertain={uncertain} /></span>
    <select value={String(values[name] ?? "")} onChange={(event) => onChange(name, event.target.value)} className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold outline-none ${errors[name] ? "border-rose-400" : uncertain.has(name) ? "border-amber-400" : "border-slate-300"}`}>
      <option value="">Select one</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
    {errors[name] && <span className="text-xs font-semibold text-rose-600">{errors[name]}</span>}
  </label>;
}

function MultiChoice({ name, label, required, options, values, errors, onChange }: { name: "occupations" | "skillsTraining"; label: string; required?: boolean; options: readonly string[]; values: ApplicationFormValues; errors: FormErrors; onChange: (name: keyof ApplicationFormValues, value: string[]) => void }) {
  const selected = values[name] as string[];
  const toggle = (option: string) => onChange(name, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  return <div className="space-y-2">
    <span className="text-xs font-black uppercase text-slate-700">{label}{required ? " *" : ""}</span>
    <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-xl border p-3 ${errors[name] ? "border-rose-400" : "border-slate-200"}`}>
      {options.map((option) => <label key={option} className="flex items-start gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} className="mt-0.5" />{option}</label>)}
    </div>
    {errors[name] && <span className="text-xs font-semibold text-rose-600">{errors[name]}</span>}
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4 shadow-sm"><h2 className="border-b pb-3 text-base font-black text-gov-blue">{title}</h2>{children}</section>;
}

export function ApplicationForm({ mode, encoderName }: ApplicationFormProps) {
  const [values, setValues] = useState<ApplicationFormValues>(() => createEmptyApplication());
  const [files, setFiles] = useState<Partial<Record<DocumentField, File>>>({});
  const [dependentIdType, setDependentIdType] = useState("");
  const [idNumberCandidate, setIdNumberCandidate] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [uncertain, setUncertain] = useState<Set<keyof ApplicationFormValues>>(new Set());
  const [conflicts, setConflicts] = useState<OcrConflict[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applicationId, setApplicationId] = useState<string>();
  const [duplicateWarning, setDuplicateWarning] = useState<{ possibleDuplicate: boolean; reasons: string[] } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const manuallyEdited = useRef(new Set<keyof ApplicationFormValues>());

  const changeValue = (name: keyof ApplicationFormValues, value: string | string[]) => {
    manuallyEdited.current.add(name);
    setUncertain((current) => { const next = new Set(current); next.delete(name); return next; });
    setConflicts((current) => current.filter((conflict) => conflict.field !== name));
    setErrors((current) => ({ ...current, [name]: "" }));
    setValues((current) => {
      const normalizedValue = name === "dependentAge" && typeof value === "string"
        ? (value === "" ? null : Number(value))
        : value;
      const next = { ...current, [name]: normalizedValue, fieldSources: { ...current.fieldSources, [name]: "MANUAL" as const } } as ApplicationFormValues;
      if (name === "birthDate" && typeof value === "string") {
        next.applicantAge = calculateAge(value);
        next.fieldSources.applicantAge = "CALCULATION";
      }
      if (name === "dependentBirthDate" && typeof value === "string") {
        next.dependentAge = calculateAge(value);
        next.fieldSources.dependentAge = "CALCULATION";
      }
      return next;
    });
  };

  const handleOcr = (subject: "APPLICANT" | "DEPENDENT", response: OcrResponse) => {
    if (subject === "APPLICANT") setIdNumberCandidate(response.fields.idNumber || "");
    const subjectFields = new Set(ocrFieldsForSubject(subject));
    setUncertain((current) => new Set([...current].filter((field) => !subjectFields.has(field)).concat(response.uncertainFields.filter((field) => !manuallyEdited.current.has(field)))));
    setConflicts((current) => [...current.filter((conflict) => !subjectFields.has(conflict.field)), ...response.conflicts.filter((conflict) => !manuallyEdited.current.has(conflict.field))]);
    setValues((current) => {
      const next = applyOcrAutofill(current, response.fields, manuallyEdited.current, subject);
      next.ocrMetadata = {
        ...next.ocrMetadata,
        [subject.toLowerCase()]: { status: response.status, selectedIdType: response.selectedIdType || null, provider: response.provider || null, uncertainFields: response.uncertainFields, conflicts: response.conflicts },
      };
      return next;
    });
  };

  const setDocument = (field: DocumentField, file?: File) => {
    if (field.startsWith("applicant")) setIdNumberCandidate("");
    if (field !== "medicalCertificate") {
      const subject = field.startsWith("applicant") ? "APPLICANT" : "DEPENDENT";
      const subjectFields = new Set(ocrFieldsForSubject(subject));
      setValues((current) => applyOcrAutofill(current, {}, manuallyEdited.current, subject));
      setUncertain((current) => new Set([...current].filter((name) => !subjectFields.has(name))));
      setConflicts((current) => current.filter((conflict) => !subjectFields.has(conflict.field)));
    }
    setFiles((current) => ({ ...current, [field]: file }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const selectIdType = (subject: "APPLICANT" | "DEPENDENT", idType: string) => {
    if (idType && !ID_TYPES.includes(idType as (typeof ID_TYPES)[number])) return;
    if (subject === "APPLICANT") setIdNumberCandidate("");
    const subjectFields = new Set(ocrFieldsForSubject(subject));
    setFiles((current) => ({ ...current, ...(subject === "APPLICANT" ? { applicantIdFront: undefined, applicantIdBack: undefined } : { dependentIdFront: undefined, dependentIdBack: undefined }) }));
    setUncertain((current) => new Set([...current].filter((field) => !subjectFields.has(field))));
    setConflicts((current) => current.filter((conflict) => !subjectFields.has(conflict.field)));
    setErrors((current) => ({ ...current, [subject === "APPLICANT" ? "idType" : "dependentIdType"]: "", ...(subject === "APPLICANT" ? { applicantIdFront: "", applicantIdBack: "" } : { dependentIdFront: "", dependentIdBack: "" }) }));
    if (subject === "APPLICANT") manuallyEdited.current.add("idType");
    else setDependentIdType(idType);
    setValues((current) => {
      const next = applyOcrAutofill(current, {}, manuallyEdited.current, subject);
      const metadata = { ...next.ocrMetadata };
      delete metadata[subject.toLowerCase()];
      if (subject === "APPLICANT") {
        next.idType = idType as ApplicationFormValues["idType"];
        next.fieldSources.idType = "MANUAL";
      }
      next.ocrMetadata = metadata;
      return next;
    });
  };

  const validateFinal = () => {
    const parsed = applicationFinalSchema.safeParse(values);
    const nextErrors: FormErrors = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] || "form"), issue.message]));
    if (!dependentIdType) nextErrors.dependentIdType = "Piliin muna ang uri ng dependent ID.";
    for (const field of ["applicantIdFront", "applicantIdBack", "dependentIdFront", "dependentIdBack"] as const) {
      if (!files[field] && !applicationId) nextErrors[field] = "Required ang document na ito.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const reviewApplication = async () => {
    if (!validateFinal()) {
      setNotice("Pakireview ang mga field na may error bago magpatuloy.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setNotice("");
    try {
      const response = await fetch("/api/v1/public/applications/duplicates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (response.ok) setDuplicateWarning(await response.json());
    } catch { /* A warning check must not block manual review. */ }
    setReviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (action: "DRAFT" | "SUBMIT") => {
    if (action === "SUBMIT" && !validateFinal()) return;
    setSaving(true);
    setNotice("");
    try {
      const body = new FormData();
      body.append("payload", JSON.stringify({ values, action, applicationId }));
      for (const [field, file] of Object.entries(files)) if (file) body.append(field, file);
      const endpoint = mode === "ONLINE" ? "/api/v1/public/applications" : "/api/v1/applications/encode";
      const response = await fetch(endpoint, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        if (data.fieldErrors) setErrors((current) => ({ ...current, ...data.fieldErrors }));
        throw new Error(data.error || "Unable to save application.");
      }
      const application = data.application || data.applicant;
      if (application?.id) setApplicationId(application.id);
      if (data.duplicateWarning) setDuplicateWarning(data.duplicateWarning);
      if (action === "DRAFT") {
        setNotice(`Draft saved${data.application?.applicationCode ? ` — ${data.application.applicationCode}` : ""}.`);
      } else {
        setResult(data);
        setReviewing(false);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save application.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setValues(createEmptyApplication());
    setFiles({});
    setDependentIdType("");
    setIdNumberCandidate("");
    setErrors({});
    setUncertain(new Set());
    setConflicts([]);
    setReviewing(false);
    setApplicationId(undefined);
    setDuplicateWarning(null);
    setResult(null);
    setNotice("");
    manuallyEdited.current.clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shared = { values, errors, uncertain, onChange: changeValue };
  const seniorApplicant = values.typeOfBeneficiary === "SENIOR CITIZEN" || (values.applicantAge !== null && values.applicantAge >= 60);

  if (result) {
    const app = result.application || result.applicant;
    return <div className="mx-auto max-w-3xl rounded-3xl border-2 border-emerald-200 bg-white p-8 text-center shadow-xl space-y-5">
      <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
      <h1 className="text-2xl font-black text-slate-900">Application submitted</h1>
      <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Pending admin review. {mode === "ONLINE" ? "Nasa Online Applications inbox na ng admin ang iyong aplikasyon." : "Nasa Walk-in Submissions inbox na ng admin ang aplikasyon."} Hindi pa ito approval o enrollment sa TUPAD.</p>
      <p className="text-sm text-slate-600">Reference: <strong className="font-mono text-gov-blue">{result.applicationCode || app?.applicationCode}</strong></p>
      {duplicateWarning?.possibleDuplicate && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Possible duplicate warning recorded for staff review. The application was not rejected or merged.</p>}
      {mode === "WALK_IN" ? <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-gov-blue px-5 py-3 text-sm font-black text-white"><UserPlus className="w-4 h-4" />Encode Next Applicant</button> : <a href="/" className="inline-flex items-center gap-2 rounded-xl bg-gov-blue px-5 py-3 text-sm font-black text-white"><ArrowLeft className="w-4 h-4" />Back to Home</a>}
    </div>;
  }

  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-3xl bg-gradient-to-r from-gov-blue to-blue-800 p-6 text-white shadow-xl">
      <div className="flex items-center gap-4"><PesoLogo size={54} className="h-14 w-14" /><div><p className="text-xs font-bold uppercase text-gov-goldLight">PESO Dingalan • TUPAD</p><h1 className="text-2xl font-black">{mode === "ONLINE" ? "Online TUPAD Application" : "Walk-in Encoding"}</h1><p className="text-xs text-blue-100">{mode === "WALK_IN" ? `Authorized encoder: ${encoderName || "Staff"}` : "Upload IDs, review autofill, then submit your application."}</p></div></div>
    </header>

    {notice && <div className={`rounded-xl border p-3 text-sm font-semibold ${Object.values(errors).some(Boolean) ? "border-rose-300 bg-rose-50 text-rose-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>{notice}</div>}
    {duplicateWarning?.possibleDuplicate && <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /><div><strong>Possible duplicate only — not rejected.</strong><p>{duplicateWarning.reasons.join("; ")}. Staff must review before any merge decision.</p></div></div>}
    {conflicts.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Front/back ID conflict:</strong>{conflicts.map((conflict) => <p key={String(conflict.field)}>{String(conflict.field)}: “{conflict.frontValue}” vs “{conflict.backValue}”. Please correct manually.</p>)}</div>}

    {reviewing ? <Section title="Review Application">
      <p className="text-sm text-slate-600">Confirm the details and document selections below. OCR never submits or approves automatically.</p>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {[
          ["Applicant", `${values.lastName}, ${values.givenName} ${values.middleName}`], ["Email", values.email], ["Birth date / Age", `${values.birthDate} / ${values.applicantAge ?? "-"}`], ["ID", `${values.idType} • ${values.idNumber}`],
          ["Beneficiary type", values.typeOfBeneficiary], ["Occupation", [...values.occupations, values.occupationOther].filter(Boolean).join(", ")], ["Address", `${values.streetSitio}, ${values.barangay}`], ["Dependent", `${values.dependentGivenName} ${values.dependentLastName} • Age ${values.dependentAge ?? "-"}`],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><span className="block text-[10px] font-black uppercase text-slate-400">{label}</span><strong className="text-slate-800">{value || "-"}</strong></div>)}
      </div>
      <div className="flex flex-wrap justify-end gap-2"><button onClick={() => setReviewing(false)} className="rounded-xl border px-4 py-2 text-sm font-bold"><ArrowLeft className="mr-1 inline w-4 h-4" />Edit</button><button disabled={saving} onClick={() => save("SUBMIT")} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white disabled:opacity-50"><Send className="mr-1 inline w-4 h-4" />{saving ? "Submitting…" : "Submit Application"}</button></div>
    </Section> : <>
      <IdUploadPanel subject="APPLICANT" idType={values.idType} onIdTypeChange={(type) => selectIdType("APPLICANT", type)} title="Identification & Applicant ID Autofill" frontField="applicantIdFront" backField="applicantIdBack" frontFile={files.applicantIdFront} backFile={files.applicantIdBack} required errors={errors} onFile={setDocument} onError={(field, message) => setErrors((current) => ({ ...current, [field]: message || "" }))} onResult={(response) => handleOcr("APPLICANT", response)} />

      <Section title="Personal Information">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TextField name="email" label="Email" required type="email" {...shared} />
          <TextField name="givenName" label="GIVEN NAME" required {...shared} />
          <TextField name="middleName" label="MIDDLE NAME — buong middle name" {...shared} />
          <TextField name="lastName" label="LAST NAME" required {...shared} />
          <SelectField name="extensionName" label="EXTENSION NAME" options={EXTENSION_NAMES} {...shared} />
          <TextField name="birthDate" label="BIRTH DATE" required type="date" {...shared} />
          <TextField name="applicantAge" label="AGE — calculated from application date" required type="number" {...shared} />
          <SelectField name="sex" label="SEX" required options={SEX_OPTIONS} {...shared} />
          <SelectField name="civilStatus" label="CIVIL STATUS" required options={CIVIL_STATUS_OPTIONS} {...shared} />
          <TextField name="contactNumber" label="CONTACT NUMBER" required placeholder="09XXXXXXXXX" {...shared} />
        </div>
      </Section>

      <Section title="Identification">
        <TextField name="idNumber" label="ID NUMBER" required {...shared} />
        {idNumberCandidate && idNumberCandidate !== values.idNumber && manuallyEdited.current.has("idNumber") && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2 text-xs text-amber-900">
          <p>May nabasang ID number, pero hindi pinalitan ang field dahil na-edit mo ito manually: <strong>{idNumberCandidate}</strong>. I-check muna sa ID.</p>
          <button type="button" className="rounded-lg border border-amber-400 bg-white px-3 py-2 font-bold" onClick={() => {
            manuallyEdited.current.delete("idNumber");
            setValues((current) => ({ ...current, idNumber: idNumberCandidate, fieldSources: { ...current.fieldSources, idNumber: "OCR" } }));
            setUncertain((current) => new Set([...current, "idNumber"]));
            setConflicts((current) => current.filter((conflict) => conflict.field !== "idNumber"));
            setErrors((current) => ({ ...current, idNumber: "" }));
          }}>Gamitin ang nabasang ID number</button>
        </div>}
      </Section>

      <Section title="Beneficiary Details">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><SelectField name="typeOfBeneficiary" label="TYPE OF BENEFICIARIES" required options={BENEFICIARY_TYPES} {...shared} /><SelectField name="isIp" label="ARE YOU IP's" required options={YES_NO_OPTIONS} {...shared} /><SelectField name="is4ps" label="ARE YOU MEMBER OF 4P's" required options={YES_NO_OPTIONS} {...shared} /><TextField name="disability" label="If PWD, Please indicate your disability" {...shared} /></div>
      </Section>

      <Section title="Employment and Training">
        <MultiChoice name="occupations" label="OCCUPATION" required options={OCCUPATION_OPTIONS} values={values} errors={errors} onChange={changeValue} />
        {values.occupations.includes("Other") && <TextField name="occupationOther" label="Other occupation (uppercase)" required {...shared} />}
        <div className="grid sm:grid-cols-2 gap-4"><TextField name="monthlyIncome" label="AVERAGE MONTHLY INCOME (PHP)" required type="number" {...shared} /><SelectField name="employmentInterest" label="INTERESTED IN WAGE EMPLOYMENT OR SELF-EMPLOYMENT?" required options={EMPLOYMENT_INTEREST_OPTIONS} {...shared} /></div>
        <MultiChoice name="skillsTraining" label="SKILLS TRAINING NEEDED?" options={SKILLS_TRAINING_OPTIONS} values={values} errors={errors} onChange={changeValue} />
        {values.skillsTraining.includes("Other") && <TextField name="skillsTrainingOther" label="Other skills training (uppercase)" required {...shared} />}
      </Section>

      <Section title="Address">
        <div className="grid sm:grid-cols-2 gap-4"><SelectField name="barangay" label="BARANGAY" required options={BARANGAYS} {...shared} /><TextField name="streetSitio" label="STREET / PUROK / SITIO" required {...shared} /></div>
      </Section>

      <Section title="Supporting Documents">
        {seniorApplicant && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>Senior applicant reminder:</strong> The medical certificate result must contain “Fit to work”. Staff/applicants must review the certificate; OCR does not decide fitness to work.</div>}
        <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-700">MEDICAL CERTIFICATE FOR SENIOR CITEZENS (optional)</span><input type="file" accept="image/*,application/pdf" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const issue = isAcceptedApplicationFile(file); if (issue) setErrors((current) => ({ ...current, medicalCertificate: issue })); else setDocument("medicalCertificate", file); }} className="block w-full text-xs" />{errors.medicalCertificate && <span className="text-xs text-rose-600">{errors.medicalCertificate}</span>}<span className="text-xs text-slate-500">Result must contain “Fit to work”. No automated fitness decision is made.</span></label>
        {seniorApplicant && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={values.medicalReminderAcknowledged} onChange={(event) => setValues((current) => ({ ...current, medicalReminderAcknowledged: event.target.checked }))} className="mt-1" />I understand that fitness to work must be reviewed manually.</label>}
      </Section>

      <IdUploadPanel subject="DEPENDENT" idType={dependentIdType} onIdTypeChange={(type) => selectIdType("DEPENDENT", type)} title="Dependent ID Autofill" frontField="dependentIdFront" backField="dependentIdBack" frontFile={files.dependentIdFront} backFile={files.dependentIdBack} required errors={errors} onFile={setDocument} onError={(field, message) => setErrors((current) => ({ ...current, [field]: message || "" }))} onResult={(response) => handleOcr("DEPENDENT", response)} />

      <Section title="Dependent Information">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><TextField name="dependentGivenName" label="DEPENDENT GIVEN NAME" required {...shared} /><TextField name="dependentMiddleName" label="DEPENDENT MIDDLE NAME" {...shared} /><TextField name="dependentLastName" label="DEPENDENT LAST NAME" required {...shared} /><SelectField name="dependentExtensionName" label="DEPENDENT EXTENSION NAME" options={EXTENSION_NAMES} {...shared} /><TextField name="dependentBirthDate" label="Dependent birth date (if shown on ID)" type="date" {...shared} /><TextField name="dependentAge" label="AGE" required type="number" {...shared} /><SelectField name="dependentRelationship" label="RELATIONSHIP" options={RELATIONSHIP_OPTIONS} {...shared} /></div>
      </Section>

      <Section title="Declaration and Consent">
        <TextField name="remarks" label="Remarks (optional)" {...shared} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={values.agreedToTruthfulness} onChange={(event) => setValues((current) => ({ ...current, agreedToTruthfulness: event.target.checked }))} className="mt-1" /><span>I declare that the information and documents are true and correct. *</span></label>{errors.agreedToTruthfulness && <p className="text-xs text-rose-600">{errors.agreedToTruthfulness}</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={values.agreedToDataPrivacy} onChange={(event) => setValues((current) => ({ ...current, agreedToDataPrivacy: event.target.checked }))} className="mt-1" /><span>I consent to PESO Dingalan processing these details and private documents for the TUPAD application. *</span></label>{errors.agreedToDataPrivacy && <p className="text-xs text-rose-600">{errors.agreedToDataPrivacy}</p>}
      </Section>

      <div className="sticky bottom-3 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border bg-white/95 p-3 shadow-xl backdrop-blur">
        {mode === "WALK_IN" && <button disabled={saving} onClick={() => save("DRAFT")} className="rounded-xl border border-gov-blue px-4 py-2 text-sm font-black text-gov-blue disabled:opacity-50"><Save className="mr-1 inline w-4 h-4" />Save Draft</button>}
        <button onClick={reviewApplication} className="rounded-xl bg-gov-blue px-5 py-2 text-sm font-black text-white"><ClipboardCheck className="mr-1 inline w-4 h-4" />Review Application</button>
        <button onClick={reset} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600"><RotateCcw className="mr-1 inline w-4 h-4" />Clear</button>
      </div>
    </>}
  </div>;
}
