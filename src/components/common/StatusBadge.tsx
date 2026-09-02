import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = (status || "").toUpperCase();

  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

  if (["ACTIVE", "PRESENT", "DISTRIBUTED", "APPROVED", "PAID", "SYNCED", "VALID"].includes(s)) {
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (["PENDING", "FOR_REVIEW", "SCHEDULED", "DRAFT", "PREVIEW"].includes(s)) {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["RESTRICTED", "REPLACED", "ABSENT", "REJECTED", "INVALID", "FAILED", "DUPLICATE"].includes(s)) {
    badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (["COMPLETED", "CLOSED", "OVERRIDDEN"].includes(s)) {
    badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide",
        badgeStyle,
        className
      )}
    >
      {s.replace(/_/g, " ")}
    </span>
  );
}

export default StatusBadge;

