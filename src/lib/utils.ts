import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | Date | null, formatStr = "MMMM dd, yyyy") {
  if (!dateString) return "N/A";
  try {
    const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
    return format(d, formatStr);
  } catch (e) {
    return String(dateString);
  }
}

export function formatTime(dateString?: string | Date | null) {
  if (!dateString) return "--:--";
  try {
    const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
    return format(d, "hh:mm a");
  } catch (e) {
    return String(dateString);
  }
}

export function formatBirthdayPin(birthdayStr?: string | null): string {
  if (!birthdayStr) return "";
  try {
    const d = new Date(birthdayStr);
    if (isNaN(d.getTime())) {
      // If string is YYYY-MM-DD
      const parts = birthdayStr.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[1]}-${parts[2]}-${parts[0]}`;
      }
      return birthdayStr;
    }
    return format(d, "MM-dd-yyyy");
  } catch {
    return birthdayStr || "";
  }
}
