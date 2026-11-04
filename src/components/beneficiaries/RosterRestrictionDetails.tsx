import React from "react";
import type { ParsedBeneficiaryRow, RosterRestrictionDetail } from "@/lib/excel-importer";

function displayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return value;
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Shared by the masterlist modal and per-program import preview. No hover needed. */
export function RosterRestrictionDetails({ row }: { row: ParsedBeneficiaryRow }) {
  if (!row.restrictionDetails?.length && !row.restrictionReason && !row.restrictionEnd && row.status !== "RESTRICTED" && row.status !== "EXEMPTED" && !row.isExempted) return null;

  const details: RosterRestrictionDetail[] = row.restrictionDetails?.length ? row.restrictionDetails : [{
    reason: row.restrictionReason?.trim() || row.validationError?.trim() || "Reason not recorded. Review the restriction record before proceeding.",
    end: row.restrictionEnd || "",
  }];

  return (
    <div role="group" aria-label="Restriction details" className="mt-2 min-w-[230px] max-w-sm rounded-lg border border-rose-200 bg-rose-50/70 p-2 text-[11px] leading-relaxed text-rose-900 break-words whitespace-normal">
      <p className="font-bold">{row.isExempted || row.status === "EXEMPTED" ? "Original restriction reason" : "Restriction reason"}{details.length > 1 ? "s" : ""}</p>
      <ul className="mt-1 space-y-2">
        {details.map((detail, index) => (
          <li key={index} className="space-y-0.5">
            <p>{detail.reason?.trim() || "Reason not recorded. Review the restriction record before proceeding."}</p>
            <p className="text-[10px] text-rose-800">
              {detail.isAppointivePersonnel ? "Appointive personnel — no date-based expiry" : detail.end && detail.end !== "Active Restriction" ? `Restricted until: ${displayDate(detail.end)}` : "No end date recorded"}
            </p>
            {detail.start && <p className="text-[10px] text-rose-800">Restriction start: {displayDate(detail.start)}</p>}
            {detail.payoutDate && <p className="text-[10px] text-rose-800">Payout date: {displayDate(detail.payoutDate)}</p>}
          </li>
        ))}
      </ul>
      {(row.isExempted || row.status === "EXEMPTED") && (
        <p className="mt-2 border-t border-rose-200 pt-1 text-purple-900"><span className="font-bold">Exemption justification: </span>{row.exemptionReason || "Authorized exemption"}</p>
      )}
    </div>
  );
}
