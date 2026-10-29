"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, UploadCloud } from "lucide-react";
import { ID_TYPES, isAcceptedApplicationFile, type ApplicationFormValues } from "@/lib/application-schema";
import { getIdentityProfile } from "@/lib/ocr/identity-profiles";
import type { OcrConflict, OcrAutofillStatus } from "@/lib/ocr/application-id-mapper";

export interface OcrResponse {
  configured: boolean;
  status: OcrAutofillStatus;
  fields: Partial<ApplicationFormValues>;
  uncertainFields: Array<keyof ApplicationFormValues>;
  conflicts: OcrConflict[];
  message?: string;
  provider?: string;
  selectedIdType?: string;
  missingFields?: string[];
}

interface IdUploadPanelProps {
  subject: "APPLICANT" | "DEPENDENT";
  title: string;
  frontField: "applicantIdFront" | "dependentIdFront";
  backField: "applicantIdBack" | "dependentIdBack";
  frontFile?: File;
  backFile?: File;
  required?: boolean;
  idType: string;
  onIdTypeChange: (value: string) => void;
  errors: Record<string, string>;
  onFile: (field: IdUploadPanelProps["frontField"] | IdUploadPanelProps["backField"], file?: File) => void;
  onError: (field: string, message?: string) => void;
  onResult: (result: OcrResponse) => void;
}

function FilePreview({ file }: { file?: File }) {
  const url = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (!file) return <div className="h-36 rounded-xl border border-dashed border-slate-300 bg-slate-50 grid place-items-center text-xs text-slate-400">No document selected</div>;
  if (file.type === "application/pdf") return <iframe src={url} title={file.name} className="h-36 w-full rounded-xl border bg-white" />;
  return <img src={url} alt={file.name} className="h-36 w-full rounded-xl border bg-slate-50 object-contain" />;
}

export function IdUploadPanel(props: IdUploadPanelProps) {
  const [status, setStatus] = useState<OcrAutofillStatus | "Reading ID" | null>(null);
  const [message, setMessage] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [numberFile, setNumberFile] = useState<File>();
  const numberInput = useRef<HTMLInputElement>(null);
  const onResultRef = useRef(props.onResult);
  const { frontFile, backFile, subject, idType } = props;
  const profile = getIdentityProfile(idType);
  const selectionRef = useRef(idType);
  selectionRef.current = idType;
  useEffect(() => { setNumberFile(undefined); }, [idType]);

  useEffect(() => { onResultRef.current = props.onResult; }, [props.onResult]);

  useEffect(() => {
    if (!getIdentityProfile(idType) || (!frontFile && !backFile && !numberFile)) {
      setStatus(null);
      setMessage("");
      setMissingFields([]);
      return;
    }
    const controller = new AbortController();
    setStatus("Reading ID");
    setMissingFields([]);
    setMessage("Preparing enhanced ID reader...");
    const timer = setTimeout(async () => {
      try {
        const { readIdentityFilesInBrowser } = await import("@/lib/ocr/browser-id-ocr");
        const result = await readIdentityFilesInBrowser({
          frontFile, backFile, numberFile, subject, selectedIdType: idType,
          signal: controller.signal,
          force: attempt > 0,
          onProgress: (progress) => { if (!controller.signal.aborted) setMessage(progress); },
        });
        if (controller.signal.aborted || selectionRef.current !== idType) return;
        setStatus(result.status);
        setMessage(result.message || "");
        setMissingFields(result.missingFields || []);
        onResultRef.current(result);
      } catch (error) {
        if (controller.signal.aborted || selectionRef.current !== idType) return;
        setStatus("Unable to Read ID");
        setMessage(error instanceof Error ? error.message : "Continue with manual encoding.");
        onResultRef.current({ configured: true, status: "Unable to Read ID", fields: {}, uncertainFields: [], conflicts: [], provider: "LOCAL_ENHANCED_OCR+QR", selectedIdType: idType });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [frontFile, backFile, numberFile, subject, attempt, idType]);

  const choose = (field: IdUploadPanelProps["frontField"] | IdUploadPanelProps["backField"], file?: File) => {
    if (!profile) return props.onError(field, "Piliin muna ang uri ng ID bago mag-upload.");
    if (!file) return props.onFile(field, undefined);
    const validation = isAcceptedApplicationFile(file);
    if (validation) return props.onError(field, validation);
    props.onError(field, undefined);
    props.onFile(field, file);
  };

  const statusStyle = status === "Autofill Complete"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "Needs Review"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : status === "Unable to Read ID"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <section className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-black text-slate-900 flex items-center gap-2"><FileSearch className="w-5 h-5 text-gov-blue" />{props.title}</h2>
          <p className="text-xs text-slate-600">Upload o camera capture ng front at back. Image o PDF, maximum 10 MB bawat file.</p>
        </div>
        {status && <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle}`}>
          {status === "Autofill Complete" ? <CheckCircle2 className="w-3.5 h-3.5" /> : status !== "Reading ID" ? <AlertTriangle className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5 animate-pulse" />}
          {status}
        </span>}
      </div>
      {message && <p role="status" aria-live="polite" className="rounded-xl bg-white border px-3 py-2 text-xs text-slate-700">{message}</p>}
      {(frontFile || backFile || numberFile) && <button type="button" disabled={status === "Reading ID"} onClick={() => setAttempt((current) => current + 1)} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-gov-blue disabled:opacity-50">Basahin muli ang ID</button>}
      <div className="space-y-2 rounded-xl border border-blue-200 bg-white p-3">
        <label className="block space-y-1">
          <span className="text-xs font-black uppercase text-slate-700">1. {subject === "APPLICANT" ? "TYPE OF ID" : "DEPENDENT TYPE OF ID"} *</span>
          <select aria-label={subject === "APPLICANT" ? "TYPE OF ID" : "DEPENDENT TYPE OF ID"} value={idType} onChange={(event) => props.onIdTypeChange(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold">
            <option value="">Piliin muna ang ID na gagamitin</option>
            {ID_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        {props.errors[subject === "APPLICANT" ? "idType" : "dependentIdType"] && <p className="text-xs font-semibold text-rose-600">{props.errors[subject === "APPLICANT" ? "idType" : "dependentIdType"]}</p>}
        <p className="text-xs text-slate-600">{profile?.guide || "Pumili ng ID upang ma-enable ang picture upload at ang tamang reading rules."}</p>
        <p className="text-[11px] text-slate-500">Kapag pinalitan ang ID type, aalisin ang dating pictures at OCR-only details. Mananatili ang manual corrections.</p>
      </div>
      {missingFields.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">I-check manually (hindi nabasa o wala sa ID): {missingFields.join(", ")}. Hindi hinuhulaan ang mga nawawalang detalye.</p>}
      <fieldset disabled={!profile} className="grid md:grid-cols-2 gap-4 disabled:opacity-50">
        <legend className="mb-2 text-xs font-black text-slate-700">2. UPLOAD ID PICTURES</legend>
        {([
          ["Front ID Picture", props.frontField, props.frontFile],
          ["Back ID Picture", props.backField, props.backFile],
        ] as const).map(([label, field, file]) => (
          <div key={field} className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase">{label}{props.required ? " *" : ""}</label>
            <FilePreview file={file} />
            <input
              key={`${subject}:${idType}:${field}`}
              type="file"
              aria-label={label}
              accept="image/*,application/pdf"
              capture="environment"
              onClick={(event) => { event.currentTarget.value = ""; }}
              onChange={(event) => choose(field, event.target.files?.[0])}
              className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-gov-blue file:px-3 file:py-2 file:font-bold file:text-white"
            />
            {props.errors[field] && <p className="text-xs font-semibold text-rose-600">{props.errors[field]}</p>}
          </div>
        ))}
      </fieldset>
      {subject === "APPLICANT" && <fieldset disabled={!profile} className="rounded-xl border border-dashed border-blue-200 bg-white p-3 space-y-2 disabled:opacity-50">
        <legend className="px-1 text-xs font-black text-gov-blue">OPTIONAL: CLOSE-UP NG ID NUMBER</legend>
        <p className="text-xs text-slate-600">Kung hindi pa nabasa ang number, kumuha ng malapit na picture ng buong numero kasama ang label nito. Browser OCR lang ito; hindi kasama sa ise-save na supporting documents. Kailangan pa rin ang buong front at back.</p>
        <input ref={numberInput} key={`number:${idType}`} type="file" aria-label="Close-up ID number" accept="image/*,application/pdf" capture="environment"
          onClick={(event) => { event.currentTarget.value = ""; }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            const issue = file ? isAcceptedApplicationFile(file) : null;
            props.onError("idNumberCloseup", issue || undefined);
            if (!issue) setNumberFile(file);
          }} className="block w-full text-xs" />
        {numberFile && <><FilePreview file={numberFile} /><button type="button" onClick={() => { setNumberFile(undefined); if (numberInput.current) numberInput.current.value = ""; }} className="text-xs font-semibold text-gov-blue">Alisin ang close-up</button></>}
        {props.errors.idNumberCloseup && <p className="text-xs text-rose-600">{props.errors.idNumberCloseup}</p>}
      </fieldset>}
      <p className="text-[11px] text-slate-500">Ipakita ang buong ID nang malapit, pantay, at walang glare. Sa browser mismo binabasa ang QR at ID details. Pakireview ang lahat ng nabasang fields bago isumite.</p>
    </section>
  );
}
