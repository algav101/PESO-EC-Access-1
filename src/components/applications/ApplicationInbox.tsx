"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, FileText, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/permissions";
import { BARANGAYS } from "@/lib/application-schema";
import { REVIEW_STATUSES, STATUS_LABELS, type IntakeSource } from "@/lib/application-workflow";

interface ApplicationRecord {
  id: string; fullName: string; applicationCode: string | null; source: string; status: string;
  barangay: string | null; submittedAt: string | null; updatedAt: string;
  remarks: string | null; encodedBy: { fullName: string } | null;
  duplicateWarning?: { possibleDuplicate?: boolean; reasons?: string[] };
  documents: Array<{ id: string; fieldName: string; subject: string; fileName: string }>;
  [key: string]: unknown;
}
interface InboxData {
  applications: ApplicationRecord[]; filteredCount: number; pageSize: number;
  counts: { total: number; pending: number; queued: number; incomplete: number };
}
const valueText = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(valueText).join(", ");
  return typeof value === "object" ? "See application record" : String(value);
};
const dateText = (value: string | null) => value ? new Date(value).toLocaleString("en-PH") : "—";
const sections: Array<{ title: string; fields: Array<[string, string]> }> = [
  { title: "Applicant information", fields: [["fullName", "Full name"], ["email", "Email"], ["birthday", "Birth date"], ["applicantAge", "Age at application"], ["sex", "Sex"], ["civilStatus", "Civil status"], ["contactNumber", "Contact number"], ["streetSitio", "Street / Purok / Sitio"], ["barangay", "Barangay"], ["idPresented", "ID type"], ["idNumber", "ID number"]] },
  { title: "Dependent information", fields: [["dependentGivenName", "Given name"], ["dependentMiddleName", "Middle name"], ["dependentLastName", "Last name"], ["dependentExtensionName", "Extension"], ["dependentFullName", "Full name"], ["dependentBirthDate", "Birth date"], ["dependentAge", "Age at application"], ["dependentRelationship", "Relationship"]] },
  { title: "Beneficiary and livelihood information", fields: [["typeOfBeneficiary", "Beneficiary type"], ["is4ps", "4Ps member"], ["isIp", "IP member"], ["disability", "Disability"], ["occupation", "Occupation"], ["monthlyIncome", "Monthly income"], ["employmentInterest", "Employment interest"], ["skillsTraining", "Skills / training"], ["medicalReminderAcknowledged", "Medical reminder acknowledged"]] },
];

export function ApplicationInbox({ source }: { source: IntakeSource }) {
  const { user, loading: authLoading } = useAuth();
  const admin = isAdminUser(user);
  const title = source === "ONLINE" ? "Online Applications" : "Walk-in Submissions";
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [barangay, setBarangay] = useState("ALL");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ApplicationRecord | null>(null);
  const [detailError, setDetailError] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !admin) { setData(null); return; }
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    const query = new URLSearchParams({ source, search, status, barangay, page: String(page) });
    void fetch(`/api/v1/applications?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load submissions."); return result; })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authLoading, admin, user?.id, source, search, status, barangay, page, revision]);

  useEffect(() => {
    setDetail(null); setDetailError(""); setRemarks("");
    if (!selectedId || !admin) return;
    const controller = new AbortController();
    void fetch(`/api/v1/applications/${encodeURIComponent(selectedId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to open submission."); return result.application as ApplicationRecord; })
      .then((application) => { if (!controller.signal.aborted) { setDetail(application); setRemarks(application.remarks || ""); } })
      .catch((failure) => { if (!controller.signal.aborted) setDetailError(failure.message); });
    return () => controller.abort();
  }, [selectedId, admin, user?.id]);

  const review = async (nextStatus: "QUEUED" | "INCOMPLETE") => {
    if (!detail || saving) return;
    if (nextStatus === "INCOMPLETE" && !remarks.trim()) { setDetailError("Describe the missing details or documents first."); return; }
    if (!window.confirm(nextStatus === "QUEUED" ? "Mark this application reviewed and queued? This does not enroll or approve a TUPAD beneficiary." : "Mark this application for completion?")) return;
    setSaving(true); setDetailError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/applications/${encodeURIComponent(detail.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, remarks, updatedAt: detail.updatedAt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review was not saved.");
      setDetail(result.application); setRemarks(result.application.remarks || ""); setRevision((current) => current + 1);
      setNotice("Admin review saved. No beneficiary was automatically created or enrolled.");
    } catch (failure) { setDetailError(failure instanceof Error ? failure.message : "Review was not saved."); }
    finally { setSaving(false); }
  };

  if (authLoading) return <p className="p-8 text-sm text-slate-500">Checking admin access...</p>;
  if (!admin) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900"><ShieldCheck className="mb-3 h-8 w-8" /><h1 className="text-xl font-black">Admin access required</h1><p className="mt-2 text-sm">Only PESO Admin and Domain Master can review incoming applications.</p></div>;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">All submitted {source === "ONLINE" ? "online applications" : "walk-in applications from authorized encoders"}. Drafts are not included.</p></div><button type="button" disabled={loading || saving} onClick={() => setRevision((current) => current + 1)} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh inbox</button></header>
    <nav aria-label="Application channels" className="flex flex-wrap gap-2 text-sm font-bold">
      <a href="/admin/applications/online" aria-current={source === "ONLINE" ? "page" : undefined} className={`rounded-xl border px-4 py-2 ${source === "ONLINE" ? "bg-gov-blue text-white" : "bg-white text-gov-blue"}`}>Online Applications</a>
      <a href="/admin/applications/walk-in-submissions" aria-current={source === "WALK_IN" ? "page" : undefined} className={`rounded-xl border px-4 py-2 ${source === "WALK_IN" ? "bg-gov-blue text-white" : "bg-white text-gov-blue"}`}>Walk-in Submissions</a>
      <a href="/applications/walk-in" className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-gov-blue"><UserPlus className="h-4 w-4" />Encode walk-in</a>
      <a href="/admin/applications" className="rounded-xl border bg-white px-4 py-2 text-slate-600">Imported roster</a>
    </nav>
    <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">New submissions await admin review. OCR and submission do not verify an ID, approve an applicant, or add anyone to a beneficiary batch.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Total submitted", data?.counts.total], ["Pending review", data?.counts.pending], ["Reviewed / Queued", data?.counts.queued], ["For completion", data?.counts.incomplete]].map(([label, count]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-gov-blue">{count ?? "—"}</p></div>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3">
      <label className="text-xs font-bold text-slate-600">Search submissions<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, reference, contact or ID" className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs font-bold text-slate-600">Review status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"><option value="ALL">All statuses</option>{[...REVIEW_STATUSES, "APPROVED", "DISQUALIFIED"].map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">Barangay<select value={barangay} onChange={(event) => { setBarangay(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"><option value="ALL">All barangays</option>{BARANGAYS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button type="submit" className="rounded-lg bg-gov-blue px-4 py-2 text-sm font-bold text-white sm:col-span-3">Search</button>
    </form>
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    <section aria-label="Submitted applications" className="overflow-hidden rounded-2xl border bg-white">
      {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading submissions...</p> : !data || data.applications.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{error ? "Submissions could not be loaded. Retry using Refresh inbox." : "No submitted applications match these filters."}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{["Reference / Applicant", "Barangay", "Submitted", ...(source === "WALK_IN" ? ["Encoded by"] : []), "Status", "Action"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{data.applications.map((application) => <tr key={application.id}><td className="px-4 py-3"><span className="block font-mono text-xs text-slate-500">{application.applicationCode || "Legacy application"}</span><strong>{application.fullName}</strong>{application.duplicateWarning?.possibleDuplicate && <span className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" />Possible duplicate</span>}</td><td className="px-4 py-3">{application.barangay || "—"}</td><td className="px-4 py-3 text-xs">{dateText(application.submittedAt)}</td>{source === "WALK_IN" && <td className="px-4 py-3">{application.encodedBy?.fullName || "Encoder unavailable"}</td>}<td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${application.status === "PENDING_REVIEW" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-900"}`}>{STATUS_LABELS[application.status] || application.status}</span></td><td className="px-4 py-3"><button disabled={saving} onClick={() => { setSelectedId(application.id); setNotice(""); }} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-gov-blue">Review application</button></td></tr>)}</tbody></table></div>}
      {data && <div className="flex items-center justify-between gap-2 border-t p-4 text-xs"><span>{data.filteredCount} matching submissions · Page {page} of {Math.max(1, Math.ceil(data.filteredCount / data.pageSize))}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page * data.pageSize >= data.filteredCount || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>}
    </section>
    {selectedId && <section aria-label="Application review" className="space-y-5 rounded-2xl border-2 border-blue-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black text-gov-blue">Application review</h2><button disabled={saving} onClick={() => setSelectedId("")} className="flex items-center gap-1 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Close review</button></div>
      {detailError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{detailError}</p>}
      {!detail ? <p className="text-sm text-slate-500">{detailError ? "Reopen the application to retry." : "Loading application details..."}</p> : <>
        <p className="text-sm"><strong>{detail.applicationCode || detail.fullName}</strong> · {detail.source === "ONLINE" ? "Online" : "Walk-in"} · {STATUS_LABELS[detail.status] || detail.status}</p>
        <p className="text-xs text-slate-500">Submitted: {dateText(detail.submittedAt)}{detail.encodedBy ? ` · Encoded by ${detail.encodedBy.fullName}` : ""}</p>
        {detail.duplicateWarning?.possibleDuplicate && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Possible duplicate — review manually; no automatic rejection or merge. {detail.duplicateWarning.reasons?.join("; ")}</p>}
        {sections.map((section) => <section key={section.title}><h3 className="mb-3 border-b pb-2 text-sm font-black text-slate-800">{section.title}</h3><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{section.fields.map(([field, label]) => <div key={field} className="rounded-lg bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{valueText(detail[field])}</dd></div>)}</dl></section>)}
        <section><h3 className="mb-3 border-b pb-2 text-sm font-black">Uploaded documents</h3><p className="mb-2 text-xs text-slate-500">Private documents open only after server-side access checks.</p><div className="grid gap-2 sm:grid-cols-2">{detail.documents.map((document) => <a key={document.id} target="_blank" rel="noreferrer" href={`/api/v1/applications/documents/${encodeURIComponent(document.id)}`} className="flex items-center gap-2 rounded-lg border p-3 text-xs font-bold text-gov-blue hover:bg-blue-50"><FileText className="h-4 w-4 shrink-0" /><span className="break-all">{document.subject} / {document.fieldName}<span className="block font-normal text-slate-500">{document.fileName}</span></span></a>)}</div>{!detail.documents.length && <p className="text-sm text-amber-800">No uploaded documents found. Check this before queueing.</p>}</section>
        <label className="block text-sm font-bold text-slate-700">Admin review notes<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={2000} disabled={saving} rows={3} className="mt-2 w-full rounded-xl border p-3 font-normal" placeholder="List missing requirements or record your review notes." /></label>
        {REVIEW_STATUSES.includes(detail.status as typeof REVIEW_STATUSES[number]) ? <div className="flex flex-wrap gap-3"><button disabled={saving} onClick={() => review("QUEUED")} className="rounded-xl bg-gov-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving review..." : "Mark reviewed & queue"}</button><button disabled={saving} onClick={() => review("INCOMPLETE")} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 disabled:opacity-50">For completion</button></div> : <p className="text-sm text-slate-500">Final decisions cannot be changed from this intake inbox.</p>}
      </>}
    </section>}
  </div>;
}
