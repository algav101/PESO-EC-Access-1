import * as XLSX from "xlsx";
import prisma from "./prisma";

export interface ParsedWorkProgramItem {
  dayNumber: number;
  specificActivities: string;
  area: string;
  maleCount: number;
  femaleCount: number;
  scPwdMaleCount: number;
  scPwdFemaleCount: number;
  totalCount: number;
  orderIndex: number;
}

export interface ParsedBarangayWorkProgram {
  barangay: string;
  projectLocation: string;
  beneficiaryCount: number;
  natureOfWork: string;
  workingHours: string;
  items: ParsedWorkProgramItem[];
  // Masterlist validation results
  validation: {
    status: "MATCHED" | "COUNT_MISMATCH" | "GENDER_MISMATCH" | "NO_MASTERLIST_BENEFICIARIES";
    masterlistCount: number;
    masterlistMaleCount: number;
    masterlistFemaleCount: number;
    masterlistPwdCount: number;
    masterlistSeniorCount: number;
    masterlistSitios: string[];
    warnings: string[];
  };
}

export interface WorkProgramPreviewResult {
  fileName: string;
  totalBarangays: number;
  totalActivities: number;
  totalTargetBeneficiaries: number;
  programs: ParsedBarangayWorkProgram[];
  overallValidationStatus: "VALID" | "WARNINGS" | "ERROR";
  globalWarnings: string[];
}

const DINGALAN_BARANGAYS = [
  "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
  "Dikapanikian", "Ibona", "Matawe", "Paltic",
  "Poblacion", "Tanawan", "Umiray"
];

export function normalizeBarangay(input: string): string {
  if (!input) return "Dingalan";
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  for (const brgy of DINGALAN_BARANGAYS) {
    if (cleaned.includes(brgy.toLowerCase())) {
      return brgy;
    }
  }
  return input
    .trim()
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function parseWorkProgramBuffer(
  buffer: Buffer,
  fileName: string,
  targetProgramId: string
): Promise<WorkProgramPreviewResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  
  // Fetch existing masterlist beneficiaries for validation
  const programBeneficiaries = await prisma.programBeneficiary.findMany({
    where: {
      programId: targetProgramId,
      participationStatus: "ACTIVE",
    },
    include: {
      beneficiary: true,
    },
  });

  // Group masterlist beneficiaries by normalized barangay
  const masterlistByBarangay: Record<
    string,
    {
      total: number;
      male: number;
      female: number;
      pwd: number;
      senior: number;
      sitios: Set<string>;
    }
  > = {};

  for (const pb of programBeneficiaries) {
    const brgy = normalizeBarangay(pb.beneficiary.barangay || "");
    if (!masterlistByBarangay[brgy]) {
      masterlistByBarangay[brgy] = {
        total: 0,
        male: 0,
        female: 0,
        pwd: 0,
        senior: 0,
        sitios: new Set<string>(),
      };
    }
    const stat = masterlistByBarangay[brgy];
    stat.total += 1;
    const sex = (pb.beneficiary.sex || "").toUpperCase();
    if (sex.startsWith("M")) stat.male += 1;
    else if (sex.startsWith("F")) stat.female += 1;

    if (pb.beneficiary.isPwd) stat.pwd += 1;
    if (pb.beneficiary.isSenior) stat.senior += 1;
    if (pb.beneficiary.sitio) stat.sitios.add(pb.beneficiary.sitio.trim());
  }

  const parsedPrograms: ParsedBarangayWorkProgram[] = [];

  // Parse all worksheets
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

    if (rawRows.length === 0) continue;

    // Scan for multiple sections in this sheet
    let r = 0;
    while (r < rawRows.length) {
      // Look for Section start or Project Location
      let foundLocationRow = -1;
      let projectLocation = "";
      let beneficiaryCount = 0;
      let natureOfWork = "";
      let workingHours = "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)";

      while (r < rawRows.length) {
        const row = rawRows[r] || [];
        const rowStr = row.map((c) => String(c).trim()).join(" ");
        const rowLower = rowStr.toLowerCase();

        if (rowLower.includes("project location:") || rowLower.startsWith("project location")) {
          foundLocationRow = r;
          // Extract location value
          for (let c = 0; c < row.length; c++) {
            const cellVal = String(row[c]).trim();
            if (cellVal.toLowerCase().includes("project location")) {
              const remaining = cellVal.replace(/project location:?/i, "").trim();
              if (remaining) {
                projectLocation = remaining;
              } else if (c + 1 < row.length && String(row[c + 1]).trim()) {
                projectLocation = String(row[c + 1]).trim();
              }
              break;
            }
          }
          r++;
          break;
        } else if (rowLower.includes("tupad work program") && rowLower.includes("barangay")) {
          // Alternative header format e.g. "TUPAD Work Program - Barangay Paltic"
          projectLocation = rowStr.split("-").pop()?.replace(/barangay/i, "").trim() || "";
        }
        r++;
      }

      if (foundLocationRow === -1 && !projectLocation) {
        break; // No more sections in this sheet
      }

      // Read metadata rows following Project Location
      let tableHeaderRow = -1;
      while (r < rawRows.length) {
        const row = rawRows[r] || [];
        const rowStr = row.map((c) => String(c).trim()).join(" ");
        const rowLower = rowStr.toLowerCase();

        if (rowLower.includes("no. of beneficiaries:") || rowLower.includes("no. of beneficiaries")) {
          for (let c = 0; c < row.length; c++) {
            const cellVal = String(row[c]).trim();
            const countNum = parseInt(cellVal.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(countNum) && countNum > 0) {
              beneficiaryCount = countNum;
              break;
            }
          }
        } else if (rowLower.includes("nature of work:") || rowLower.includes("nature of work")) {
          for (let c = 0; c < row.length; c++) {
            const cellVal = String(row[c]).trim();
            if (cellVal.toLowerCase().includes("nature of work")) {
              const remaining = cellVal.replace(/nature of work:?/i, "").trim();
              if (remaining) {
                natureOfWork = remaining;
              } else if (c + 1 < row.length) {
                natureOfWork = row.slice(c + 1).map((x) => String(x).trim()).filter(Boolean).join(" ");
              }
              break;
            }
          }
        } else if (rowLower.includes("working hours:") || rowLower.includes("working hours")) {
          for (let c = 0; c < row.length; c++) {
            const cellVal = String(row[c]).trim();
            if (cellVal.toLowerCase().includes("working hours")) {
              const remaining = cellVal.replace(/working hours:?/i, "").trim();
              if (remaining) {
                workingHours = remaining;
              } else if (c + 1 < row.length) {
                workingHours = row.slice(c + 1).map((x) => String(x).trim()).filter(Boolean).join(" ");
              }
              break;
            }
          }
        } else if (rowLower.includes("day") && (rowLower.includes("specific activities") || rowLower.includes("area") || rowLower.includes("male"))) {
          tableHeaderRow = r;
          r++;
          break;
        }

        r++;
      }

      if (tableHeaderRow === -1) {
        continue;
      }

      // Column mapping from Table Header
      const headerRow = (rawRows[tableHeaderRow] || []).map((c) => String(c).trim().toLowerCase());
      const findCol = (...keywords: string[]) => {
        return headerRow.findIndex((h) => keywords.some((k) => h.includes(k.toLowerCase())));
      };

      const colDay = findCol("day");
      const colActivities = findCol("specific activities", "activity", "activities");
      const colArea = findCol("area", "purok", "sitio", "location");
      const colMale = findCol("male");
      const colFemale = findCol("female");
      const colScPwdMale = findCol("sc/pwd male", "pwd male", "sc male");
      const colScPwdFemale = findCol("sc/pwd female", "pwd female", "sc female");
      const colTotal = findCol("total");

      // Read activity rows until next section or empty table
      const items: ParsedWorkProgramItem[] = [];
      let currentDay = 1;
      let orderIndex = 0;

      while (r < rawRows.length) {
        const row = rawRows[r] || [];
        const rowStr = row.map((c) => String(c).trim()).join(" ");
        const rowLower = rowStr.toLowerCase();

        // Check if a new section started
        if (rowLower.includes("project location:") || rowLower.includes("tupad work program (10 days)")) {
          break; // Stop and let outer loop handle next section
        }

        // Skip completely empty lines
        if (row.every((c) => String(c).trim() === "")) {
          // Look ahead to see if next row is another activity or next section
          if (r + 1 < rawRows.length) {
            const nextRowStr = (rawRows[r + 1] || []).map((c) => String(c).trim()).join(" ").toLowerCase();
            if (nextRowStr.includes("project location:") || nextRowStr.includes("tupad work program")) {
              r++;
              break;
            }
          }
          r++;
          continue;
        }

        // Parse Day # (with forward fill for merged rows)
        const dayCell = colDay !== -1 && row[colDay] !== undefined ? String(row[colDay]).trim() : "";
        const parsedDayNum = parseInt(dayCell, 10);
        if (!isNaN(parsedDayNum) && parsedDayNum >= 1 && parsedDayNum <= 30) {
          currentDay = parsedDayNum;
        }

        const activities = colActivities !== -1 && row[colActivities] ? String(row[colActivities]).trim() : "";
        const area = colArea !== -1 && row[colArea] ? String(row[colArea]).trim() : "";

        // If no activity and no area, check if it's summary row or skip
        if (!activities && !area) {
          r++;
          continue;
        }

        const parseNum = (colIdx: number) => {
          if (colIdx === -1 || row[colIdx] === undefined) return 0;
          const val = parseInt(String(row[colIdx]).replace(/[^0-9]/g, ""), 10);
          return isNaN(val) ? 0 : val;
        };

        const maleCount = parseNum(colMale);
        const femaleCount = parseNum(colFemale);
        const scPwdMaleCount = parseNum(colScPwdMale);
        const scPwdFemaleCount = parseNum(colScPwdFemale);
        let totalCount = parseNum(colTotal);
        if (totalCount === 0) {
          totalCount = maleCount + femaleCount;
        }

        items.push({
          dayNumber: currentDay,
          specificActivities: activities,
          area: area || "Community Area",
          maleCount,
          femaleCount,
          scPwdMaleCount,
          scPwdFemaleCount,
          totalCount,
          orderIndex: orderIndex++,
        });

        r++;
      }

      // If no beneficiary count was in header, derive from max total on day 1 or sum
      if (beneficiaryCount === 0 && items.length > 0) {
        const day1Items = items.filter((it) => it.dayNumber === 1);
        const day1Sum = day1Items.reduce((acc, it) => acc + (it.maleCount + it.femaleCount || it.totalCount), 0);
        beneficiaryCount = day1Sum || items[0].totalCount;
      }

      const normalizedBrgy = normalizeBarangay(projectLocation || sheetName);

      // Validate against masterlist
      const masterStat = masterlistByBarangay[normalizedBrgy];
      const warnings: string[] = [];
      let status: ParsedBarangayWorkProgram["validation"]["status"] = "MATCHED";

      if (!masterStat || masterStat.total === 0) {
        status = "NO_MASTERLIST_BENEFICIARIES";
        warnings.push(`No active beneficiaries found in Masterlist for Barangay '${normalizedBrgy}'.`);
      } else {
        if (beneficiaryCount !== masterStat.total) {
          status = "COUNT_MISMATCH";
          warnings.push(
            `Target beneficiary count (${beneficiaryCount}) does not match Masterlist count (${masterStat.total}) for ${normalizedBrgy}.`
          );
        }

        // Validate daily tallies
        const days = Array.from(new Set(items.map((it) => it.dayNumber)));
        for (const d of days) {
          const dItems = items.filter((it) => it.dayNumber === d);
          const dMale = dItems.reduce((acc, it) => acc + it.maleCount, 0);
          const dFemale = dItems.reduce((acc, it) => acc + it.femaleCount, 0);
          const dTotal = dMale + dFemale;

          if (dTotal > 0 && dTotal !== beneficiaryCount) {
            warnings.push(
              `Day ${d} sum of beneficiaries (${dTotal}) differs from Barangay target (${beneficiaryCount}).`
            );
          }
        }
      }

      parsedPrograms.push({
        barangay: normalizedBrgy,
        projectLocation: projectLocation || normalizedBrgy,
        beneficiaryCount: beneficiaryCount || (masterStat ? masterStat.total : 0),
        natureOfWork:
          natureOfWork ||
          "Environmental Cleaning & Maintenance; Vegetation Management; Waste Management Activities; Community Gardening",
        workingHours:
          workingHours || "Not Exceed Eight (8) Hours a day (8:00 AM–12:00 NN; 1:00 PM–5:00 PM)",
        items,
        validation: {
          status,
          masterlistCount: masterStat?.total || 0,
          masterlistMaleCount: masterStat?.male || 0,
          masterlistFemaleCount: masterStat?.female || 0,
          masterlistPwdCount: masterStat?.pwd || 0,
          masterlistSeniorCount: masterStat?.senior || 0,
          masterlistSitios: Array.from(masterStat?.sitios || []),
          warnings,
        },
      });
    }
  }

  const totalBarangays = parsedPrograms.length;
  const totalActivities = parsedPrograms.reduce((acc, p) => acc + p.items.length, 0);
  const totalTargetBeneficiaries = parsedPrograms.reduce((acc, p) => acc + p.beneficiaryCount, 0);

  const globalWarnings: string[] = [];
  let overallValidationStatus: "VALID" | "WARNINGS" | "ERROR" = "VALID";

  if (totalBarangays === 0) {
    overallValidationStatus = "ERROR";
    globalWarnings.push("No valid TUPAD Work Program sections were found in the uploaded file.");
  } else {
    const hasWarnings = parsedPrograms.some((p) => p.validation.warnings.length > 0);
    if (hasWarnings) overallValidationStatus = "WARNINGS";
  }

  return {
    fileName,
    totalBarangays,
    totalActivities,
    totalTargetBeneficiaries,
    programs: parsedPrograms,
    overallValidationStatus,
    globalWarnings,
  };
}
