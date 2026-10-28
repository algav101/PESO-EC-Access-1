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

export const DINGALAN_BARANGAYS = [
  "Aplaya",
  "Butas na Bato",
  "Caragsacan",
  "Davildavilan",
  "Dikapanikian",
  "Ibona",
  "Matawe",
  "Paltic",
  "Poblacion",
  "Tanawan",
  "Umiray",
] as const;

/**
 * Normalizes any variation of a Dingalan Barangay name into canonical Title Case format.
 * Prevents case-sensitivity fragmentation (e.g. "PALTIC" vs "Paltic", "CARAGSACAN" vs "Caragsacan").
 */
export function normalizeBarangayName(raw?: string | null): string {
  if (!raw) return "Paltic";
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ");

  if (cleaned === "aplaya" || cleaned.includes("aplaya")) return "Aplaya";
  if (cleaned === "butas na bato" || cleaned === "butasnabato" || cleaned === "butas-na-bato" || cleaned === "bnb" || cleaned.includes("butas")) return "Butas na Bato";
  if (cleaned === "caragsacan" || cleaned === "karagsakan" || cleaned === "caragsakan" || cleaned.includes("caragsacan")) return "Caragsacan";
  if (cleaned === "davildavilan" || cleaned === "dabildavilan" || cleaned === "dabil-dabilan" || cleaned === "davil-davilan" || cleaned.includes("davildavilan")) return "Davildavilan";
  if (cleaned === "dikapanikian" || cleaned === "dikapanikyan" || cleaned === "dika" || cleaned.includes("dikapanikian") || cleaned.includes("dika")) return "Dikapanikian";
  if (cleaned === "ibona" || cleaned.includes("ibona")) return "Ibona";
  if (cleaned === "matawe" || cleaned.includes("matawe")) return "Matawe";
  if (cleaned === "paltic" || cleaned.includes("paltic")) return "Paltic";
  if (cleaned === "poblacion" || cleaned.includes("poblacion")) return "Poblacion";
  if (cleaned === "tanawan" || cleaned.includes("tanawan")) return "Tanawan";
  if (cleaned === "umiray" || cleaned.includes("umiray")) return "Umiray";

  // Check exact match
  for (const b of DINGALAN_BARANGAYS) {
    if (b.toLowerCase() === cleaned) return b;
  }

  // Fallback to title case
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Clean & extract QR token string from raw URLs, JSON payloads, or query parameters.
 */
export function extractCleanQrToken(raw: string): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();

  // 1. If JSON object string
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return String(parsed.token || parsed.qrToken || parsed.designatedNumber || trimmed).trim();
    } catch {}
  }

  // 2. If URL string or query string (e.g., https://... or /... or ?token=...)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.includes("?") ||
    trimmed.includes("=")
  ) {
    try {
      const fullUrl = trimmed.startsWith("http")
        ? trimmed
        : `http://localhost${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
      const url = new URL(fullUrl);
      const paramToken =
        url.searchParams.get("token") ||
        url.searchParams.get("qrToken") ||
        url.searchParams.get("q") ||
        url.searchParams.get("slot");
      if (paramToken) return paramToken.trim();

      const lastSeg = url.pathname.split("/").filter(Boolean).pop();
      if (
        lastSeg &&
        !["my-assignment", "scan", "attendance", "orientation", "payout", "stub-distribution"].includes(
          lastSeg.toLowerCase()
        )
      ) {
        return lastSeg.trim();
      }
    } catch {}
  }

  return trimmed;
}

/**
 * Formats a birthday into standard MM-DD-YYYY PIN format.
 */
export function formatBirthdayPin(birthdayStr?: string | null): string {
  if (!birthdayStr) return "";
  const cleaned = birthdayStr.trim();

  // If already YYYY-MM-DD
  const ymd = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${m.padStart(2, "0")}-${d.padStart(2, "0")}-${y}`;
  }

  // If MM-DD-YYYY or M-D-YYYY
  const mdy = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${m.padStart(2, "0")}-${d.padStart(2, "0")}-${y}`;
  }

  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return format(d, "MM-dd-yyyy");
    }
  } catch {}

  return cleaned;
}

/**
 * Robustly matches an entered Birthday PIN against the stored beneficiary birthday.
 * Handles different date formats (YYYY-MM-DD, MM/DD/YYYY, M-D-YYYY, etc.)
 */
export function matchesBirthdayPin(storedBirthday?: string | null, enteredPin?: string | null): boolean {
  if (!storedBirthday || !enteredPin) return false;

  const extractParts = (str: string): { y: number; m: number; d: number } | null => {
    const clean = str.trim().replace(/\//g, "-").replace(/\./g, "-");

    // Format: YYYY-MM-DD
    const matchYMD = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (matchYMD) {
      return { y: parseInt(matchYMD[1], 10), m: parseInt(matchYMD[2], 10), d: parseInt(matchYMD[3], 10) };
    }

    // Format: MM-DD-YYYY
    const matchMDY = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (matchMDY) {
      return { y: parseInt(matchMDY[3], 10), m: parseInt(matchMDY[1], 10), d: parseInt(matchMDY[2], 10) };
    }

    // Format: DD-MM-YYYY
    const parsedDate = new Date(clean);
    if (!isNaN(parsedDate.getTime())) {
      return {
        y: parsedDate.getFullYear(),
        m: parsedDate.getMonth() + 1,
        d: parsedDate.getDate(),
      };
    }

    return null;
  };

  const p1 = extractParts(storedBirthday);
  const p2 = extractParts(enteredPin);

  if (!p1 || !p2) {
    return formatBirthdayPin(storedBirthday) === formatBirthdayPin(enteredPin);
  }

  return p1.y === p2.y && p1.m === p2.m && p1.d === p2.d;
}

/**
 * Returns the current date and time in Philippine Standard Time (PST / Asia/Manila, UTC+8).
 * Ensures correct calculations irrespective of server runtime timezone (e.g. UTC cloud environments).
 */
export function getPhilippineTime(inputDate: Date = new Date()): {
  now: Date;
  hour: number;
  minute: number;
  timeDecimal: number;
  dateStr: string;
  formattedTime: string;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(inputDate);
  const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "0";

  const hour = parseInt(getVal("hour"), 10) % 24;
  const minute = parseInt(getVal("minute"), 10);
  const year = getVal("year");
  const month = getVal("month");
  const day = getVal("day");

  const timeDecimal = hour + minute / 60;
  const dateStr = `${year}-${month}-${day}`;

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    now: inputDate,
    hour,
    minute,
    timeDecimal,
    dateStr,
    formattedTime: timeFormatter.format(inputDate),
  };
}

export function getPhilippineDateStr(inputDate: Date = new Date()): string {
  return getPhilippineTime(inputDate).dateStr;
}

export type AttendanceSlotType = "MORNING_IN" | "MORNING_OUT" | "AFTERNOON_IN" | "AFTERNOON_OUT";

/**
 * Determines target attendance shift slot based on Philippine time decimal.
 * - AM IN: 0:00 to 11:30 (timeDecimal < 11.5)
 * - AM OUT: 11:30 to 12:45 (11.5 <= timeDecimal < 12.8)
 * - PM IN: 12:45 to 15:30 (12.8 <= timeDecimal < 15.5)
 * - PM OUT: 15:30 onwards (timeDecimal >= 15.5)
 */
export function determineAttendanceSlot(timeDecimal: number): AttendanceSlotType {
  if (timeDecimal < 11.5) return "MORNING_IN";
  if (timeDecimal < 12.8) return "MORNING_OUT";
  if (timeDecimal < 15.5) return "AFTERNOON_IN";
  return "AFTERNOON_OUT";
}

export const ATTENDANCE_SLOT_LABELS: Record<AttendanceSlotType, string> = {
  MORNING_IN: "Morning Time-In (AM IN)",
  MORNING_OUT: "Morning Time-Out (AM OUT)",
  AFTERNOON_IN: "Afternoon Time-In (PM IN)",
  AFTERNOON_OUT: "Afternoon Time-Out (PM OUT)",
};

