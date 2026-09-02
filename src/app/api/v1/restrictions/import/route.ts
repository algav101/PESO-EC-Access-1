import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";

function parseDateToISO(val: any): { iso: string; formatted: string; timestamp: number } {
  if (!val) {
    const d = new Date();
    return {
      iso: d.toISOString().split("T")[0],
      formatted: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      timestamp: d.getTime(),
    };
  }

  // 1. If Excel serial number (e.g. 45913)
  if (typeof val === "number") {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      return {
        iso: jsDate.toISOString().split("T")[0],
        formatted: jsDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        timestamp: jsDate.getTime(),
      };
    }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return {
      iso: val.toISOString().split("T")[0],
      formatted: val.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      timestamp: val.getTime(),
    };
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    // Try native Date parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return {
        iso: parsed.toISOString().split("T")[0],
        formatted: trimmed,
        timestamp: parsed.getTime(),
      };
    }
  }

  const fallback = new Date();
  return {
    iso: fallback.toISOString().split("T")[0],
    formatted: String(val),
    timestamp: fallback.getTime(),
  };
}

// Add days to date string
function addDaysToDate(dateObj: { timestamp: number }, days: number = 320): string {
  const d = new Date(dateObj.timestamp + days * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

// Parse Full Name into parts
function parseNameParts(rawName: string) {
  const clean = rawName.trim();
  let lastName = "";
  let firstName = "";
  let middleName = "";
  let extensionName = "";

  const extensions = ["JR", "JR.", "SR", "SR.", "II", "III", "IV", "V"];

  if (clean.includes(",")) {
    const [lastPart, restPart] = clean.split(",").map((s) => s.trim());
    lastName = lastPart;

    if (restPart) {
      const restTokens = restPart.split(/\s+/).filter(Boolean);
      const lastToken = restTokens[restTokens.length - 1];

      if (lastToken && extensions.includes(lastToken.toUpperCase())) {
        extensionName = lastToken.toUpperCase();
        restTokens.pop();
      }

      if (restTokens.length === 1) {
        firstName = restTokens[0];
      } else if (restTokens.length > 1) {
        middleName = restTokens.pop() || "";
        firstName = restTokens.join(" ");
      }
    }
  } else {
    const tokens = clean.split(/\s+/).filter(Boolean);
    const lastToken = tokens[tokens.length - 1];

    if (lastToken && extensions.includes(lastToken.toUpperCase())) {
      extensionName = lastToken.toUpperCase();
      tokens.pop();
    }

    if (tokens.length >= 2) {
      lastName = tokens.pop() || "";
      middleName = tokens.length > 1 ? tokens.pop() || "" : "";
      firstName = tokens.join(" ");
    } else {
      firstName = clean;
    }
  }

  return {
    fullName: clean.toUpperCase(),
    lastName: lastName.toUpperCase(),
    firstName: firstName.toUpperCase(),
    middleName: middleName.toUpperCase(),
    extensionName: extensionName.toUpperCase(),
  };
}

// Detect if ADL No. designates Barangay Appointive Personnel
function checkIsAppointive(adlStr: string): boolean {
  if (!adlStr) return false;
  const upper = adlStr.toUpperCase();
  const appointiveKeywords = [
    "BHW",
    "TANOD",
    "APPOINTIVE",
    "BARANGAY APPOINTIVE",
    "OFFICIAL",
    "TREASURER",
    "SECRETARY",
    "COUNCIL",
    "LUPON",
    "STAFF",
    "CAPTAIN",
    "KAGAWAD",
    "EMPLOYEE",
    "PERSONNEL",
    "POLICE",
    "GOVERNMENT",
  ];

  return appointiveKeywords.some((k) => upper.includes(k));
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "PESO_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only PESO Admins can upload disqualified beneficiaries reference lists" },
        { status: 403 }
      );
    }

    let rawRows: any[] = [];
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    } else {
      const body = await request.json();
      if (Array.isArray(body.rows)) {
        rawRows = body.rows;
      } else if (body.csvText) {
        const workbook = XLSX.read(body.csvText, { type: "string" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      } else {
        return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
      }
    }

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: "No rows found in uploaded file" }, { status: 400 });
    }

    const processedRows = [];
    const errors = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowIdx = i + 1;

      // 1. Column A: NAME OF BENEFICIARIES
      const rawName = (
        row["NAME OF BENEFICIARIES"] ||
        row["NAME OF BENEFICIARY"] ||
        row["FULL NAME"] ||
        row["BENEFICIARY NAME"] ||
        row["NAME"] ||
        row["Name of Beneficiary"] ||
        row["Name of Beneficiaries"] ||
        (row["FIRST NAME"] && row["LAST NAME"] ? `${row["LAST NAME"]}, ${row["FIRST NAME"]}` : "")
      )?.toString().trim();

      if (!rawName) {
        errors.push({ row: rowIdx, error: "Missing Name of Beneficiary" });
        continue;
      }

      const parsedName = parseNameParts(rawName);

      // 2. Column B: ADL NO. / Barangay Appointive Position
      const adlNo = (
        row["ADL NO."] ||
        row["ADL NO"] ||
        row["ADL No."] ||
        row["ADL_NO"] ||
        row["ADL"] ||
        row["BARANGAY APPOINTIVE POSITION"] ||
        row["BATCH NO"] ||
        row["POSITION"]
      )?.toString().trim();

      const isAppointive = checkIsAppointive(adlNo);

      // 3. Column C: ORIENTATION DATE
      const orientationDateRaw = (
        row["ORIENTATION DATE"] ||
        row["ORIENTATION"] ||
        row["Orientation Date"]
      );
      const orientationDateParsed = parseDateToISO(orientationDateRaw);

      // 4. Column D: WORK DATE
      const workDate = (
        row["WORK DATE"] ||
        row["WORK DURATION DATE"] ||
        row["WORK DURATION"] ||
        row["Work Date"]
      )?.toString().trim();

      // 5. Column E: PAYOUT DATE
      const payoutDateRaw = (
        row["PAYOUT DATE"] ||
        row["PAYOUT DATE (YYYY-MM-DD)"] ||
        row["DATE OF PAYOUT"] ||
        row["Payout Date"] ||
        row["payoutDate"]
      );
      const payoutParsed = parseDateToISO(payoutDateRaw);

      // 6. Column F: Barangay
      const barangay = (
        row["Barangay"] ||
        row["BARANGAY"] ||
        row["Brgy"] ||
        row["brgy"] ||
        "BUHANGIN"
      )?.toString().trim();

      // 7. Column G: City/ Municipality
      const municipality = (
        row["City/ Municipality"] ||
        row["CITY/ MUNICIPALITY"] ||
        row["MUNICIPALITY"] ||
        row["CITY"] ||
        row["Municipality"] ||
        "BALER"
      )?.toString().trim();

      // 320 Days Rule Calculation
      const restrictionEnd = addDaysToDate(payoutParsed, 320);

      // Reason generation
      let reason = `TUPAD Payout on ${payoutParsed.formatted} (Subject to DOLE 320-day statutory interval)`;
      if (isAppointive) {
        reason = `Barangay Appointive Personnel / Government Employee (${adlNo || "Appointive Position"}). Barred from emergency employment.`;
      }

      processedRows.push({
        ...parsedName,
        adlNo: adlNo || "HISTORICAL_BATCH",
        orientationDate: orientationDateParsed.formatted,
        workDate: workDate || "10-Day Work Period",
        payoutDate: payoutParsed.formatted,
        payoutISO: payoutParsed.iso,
        payoutTimestamp: payoutParsed.timestamp,
        restrictionEnd,
        barangay,
        municipality,
        isAppointive,
        reason,
      });
    }

    if (processedRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows could be parsed. Please check the Excel column format.",
          details: errors,
        },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let updatedCount = 0;

    for (const r of processedRows) {
      // 1. Find or create beneficiary record
      let bene = await prisma.beneficiary.findFirst({
        where: {
          fullName: r.fullName,
        },
      });

      if (!bene) {
        bene = await prisma.beneficiary.create({
          data: {
            beneficiaryNumber: `BN-REF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
            fullName: r.fullName,
            lastName: r.lastName,
            firstName: r.firstName,
            middleName: r.middleName,
            extensionName: r.extensionName,
            birthday: "1990-01-01", // Default placeholder since birthday is not required
            barangay: r.barangay,
            municipality: r.municipality,
            province: "Aurora",
            status: "ACTIVE",
          },
        });
      } else {
        // Update name parts if missing
        await prisma.beneficiary.update({
          where: { id: bene.id },
          data: {
            lastName: r.lastName || bene.lastName,
            firstName: r.firstName || bene.firstName,
            middleName: r.middleName || bene.middleName,
            extensionName: r.extensionName || bene.extensionName,
            barangay: r.barangay || bene.barangay,
            municipality: r.municipality || bene.municipality,
          },
        });
      }

      // 2. Check if active restriction already exists
      const existing = await prisma.beneficiaryRestriction.findFirst({
        where: {
          beneficiaryId: bene.id,
          adlNo: r.adlNo,
        },
      });

      if (existing) {
        await prisma.beneficiaryRestriction.update({
          where: { id: existing.id },
          data: {
            payoutDate: r.payoutDate,
            workDate: r.workDate,
            orientationDate: r.orientationDate,
            barangay: r.barangay,
            municipality: r.municipality,
            restrictionEnd: r.restrictionEnd,
            isAppointivePersonnel: r.isAppointive,
            reason: r.reason,
            status: "ACTIVE",
          },
        });
        updatedCount++;
      } else {
        await prisma.beneficiaryRestriction.create({
          data: {
            beneficiaryId: bene.id,
            payoutDate: r.payoutDate,
            restrictionStart: r.payoutISO,
            restrictionEnd: r.restrictionEnd,
            adlNo: r.adlNo,
            workDate: r.workDate,
            orientationDate: r.orientationDate,
            barangay: r.barangay,
            municipality: r.municipality,
            isAppointivePersonnel: r.isAppointive,
            reason: r.reason,
            status: "ACTIVE",
          },
        });
        importedCount++;
      }
    }

    await logAudit({
      userId: user.id,
      action: "RESTRICTIONS_MASTERLIST_IMPORTED",
      entityType: "RESTRICTION",
      metadata: {
        totalRows: rawRows.length,
        importedCount,
        updatedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedRows.length} records (${importedCount} new, ${updatedCount} updated).`,
      importedCount,
      updatedCount,
      totalProcessed: processedRows.length,
    });
  } catch (error: any) {
    console.error("Restriction import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
