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

  if (cleaned === "aplaya") return "Aplaya";
  if (cleaned === "butas na bato" || cleaned === "butasnabato" || cleaned === "butas-na-bato") return "Butas na Bato";
  if (cleaned === "caragsacan" || cleaned === "karagsakan" || cleaned === "caragsakan") return "Caragsacan";
  if (cleaned === "davildavilan" || cleaned === "dabildavilan" || cleaned === "dabil-dabilan" || cleaned === "davil-davilan") return "Davildavilan";
  if (cleaned === "dikapanikian" || cleaned === "dikapanikyan") return "Dikapanikian";
  if (cleaned === "ibona") return "Ibona";
  if (cleaned === "matawe") return "Matawe";
  if (cleaned === "paltic") return "Paltic";
  if (cleaned === "poblacion") return "Poblacion";
  if (cleaned === "tanawan") return "Tanawan";
  if (cleaned === "umiray") return "Umiray";

  // Check substring match
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
