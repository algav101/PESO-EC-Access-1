import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";

export const maxDuration = 60; // 60s max execution for Vercel/Node

function parseDateToISO(val: any): { iso: string; formatted: string; timestamp: number } {
  if (!val) {
    const d = new Date();
    return {
      iso: d.toISOString().split("T")[0],
      formatted: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      timestamp: d.getTime(),
    };
  }

  // If Excel serial number (e.g. 45913)
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
    // Check DD/MM/YYYY or DD-MM-YYYY format (e.g. 22/07/2025 or 13/09/2025)
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const part1 = parseInt(dmyMatch[1], 10);
      const part2 = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      let day = part1;
      let month = part2;
      if (part1 <= 12 && part2 > 12) {
        month = part1;
        day = part2;
      }
      const jsDate = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(jsDate.getTime())) {
        return {
          iso: jsDate.toISOString().split("T")[0],
          formatted: jsDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          timestamp: jsDate.getTime(),
        };
      }
    }

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

function addDaysToDate(dateObj: { timestamp: number }, days: number = 320): string {
  const d = new Date(dateObj.timestamp + days * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

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
  const startTime = Date.now();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(user) && !hasPermission(user.role, "restriction.create")) {
      return NextResponse.json(
        { error: "Forbidden: Only Domain Master and PESO Admins can upload disqualified beneficiaries reference lists" },
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
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, dense: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    } else {
      const body = await request.json();
      if (Array.isArray(body.rows)) {
        rawRows = body.rows;
      } else if (body.csvText) {
        const workbook = XLSX.read(body.csvText, { type: "string", dense: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      } else {
        return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
      }
    }

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: "No rows found in uploaded file" }, { status: 400 });
    }

    // 1. Fast In-Memory Normalization & Deduplication
    const deduplicatedRowsMap = new Map<string, any>();
    const uniqueFullNameSet = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Column A: NAME OF BENEFICIARIES
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

      if (!rawName) continue;

      const parsedName = parseNameParts(rawName);
      uniqueFullNameSet.add(parsedName.fullName);

      // Column B: Batch / Appointive Position / ADL No.
      const adlNo = (
        row["Batch / Appointive Position"] ||
        row["BATCH / APPOINTIVE POSITION"] ||
        row["Batch / Position"] ||
        row["Batch/Appointive Position"] ||
        row["BATCH"] ||
        row["Batch"] ||
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

      // Column C: ORIENTATION DATE
      const orientationDateRaw = (
        row["ORIENTATION DATE"] ||
        row["ORIENTATION"] ||
        row["Orientation Date"]
      );
      const orientationDateParsed = parseDateToISO(orientationDateRaw);

      // Column D: WORK DATE
      const workDate = (
        row["WORK DATE"] ||
        row["WORK DURATION DATE"] ||
        row["WORK DURATION"] ||
        row["Work Date"]
      )?.toString().trim();

      // Column E: PAYOUT DATE
      const payoutDateRaw = (
        row["PAYOUT DATE"] ||
        row["PAYOUT DATE (YYYY-MM-DD)"] ||
        row["DATE OF PAYOUT"] ||
        row["Payout Date"] ||
        row["payoutDate"]
      );
      const payoutParsed = parseDateToISO(payoutDateRaw);

      // Column F: Barangay
      const barangay = (
        row["Barangay"] ||
        row["BARANGAY"] ||
        row["Brgy"] ||
        row["brgy"] ||
        "BUHANGIN"
      )?.toString().trim();

      // Column G: City/ Municipality
      const municipality = (
        row["City/ Municipality"] ||
        row["CITY/ MUNICIPALITY"] ||
        row["MUNICIPALITY"] ||
        row["CITY"] ||
        row["Municipality"] ||
        "BALER"
      )?.toString().trim();

      const restrictionEnd = addDaysToDate(payoutParsed, 320);

      let reason = `TUPAD Payout on ${payoutParsed.formatted} (Subject to DOLE 320-day statutory interval)`;
      if (isAppointive) {
        reason = `Barangay Appointive Personnel / Government Employee (${adlNo || "Appointive Position"}). Barred from emergency employment.`;
      }

      const rowData = {
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
      };

      // Key by name + adlNo to deduplicate duplicates in single file
      const dedupKey = `${parsedName.fullName}__${rowData.adlNo}`;
      deduplicatedRowsMap.set(dedupKey, rowData);
    }

    const processedRows = Array.from(deduplicatedRowsMap.values());

    if (processedRows.length === 0) {
      return NextResponse.json(
        { error: "No valid beneficiary rows could be parsed. Please check the Excel/CSV column headers." },
        { status: 400 }
      );
    }

    // 2. Chunked Lookup of Existing Beneficiaries (batches of 1,000 to prevent Postgres parameter limit)
    const uniqueNamesArray = Array.from(uniqueFullNameSet);
    const beneMap = new Map<string, any>();
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < uniqueNamesArray.length; i += CHUNK_SIZE) {
      const nameChunk = uniqueNamesArray.slice(i, i + CHUNK_SIZE);
      const existing = await prisma.beneficiary.findMany({
        where: {
          fullName: { in: nameChunk },
        },
        select: {
          id: true,
          fullName: true,
          barangay: true,
          municipality: true,
        },
      });

      for (const b of existing) {
        beneMap.set(b.fullName.toUpperCase().trim(), b);
      }
    }

    // 3. Bulk Insert Missing Beneficiaries in Batches of 1,000
    const newBenesToCreate: any[] = [];
    const seenNewBenes = new Set<string>();

    for (const r of processedRows) {
      if (!beneMap.has(r.fullName) && !seenNewBenes.has(r.fullName)) {
        seenNewBenes.add(r.fullName);
        newBenesToCreate.push({
          beneficiaryNumber: `BN-REF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
          fullName: r.fullName,
          lastName: r.lastName || null,
          firstName: r.firstName || null,
          middleName: r.middleName || null,
          extensionName: r.extensionName || null,
          birthday: "1990-01-01",
          barangay: r.barangay || "BUHANGIN",
          municipality: r.municipality || "BALER",
          province: "Aurora",
          status: "ACTIVE",
        });
      }
    }

    if (newBenesToCreate.length > 0) {
      for (let i = 0; i < newBenesToCreate.length; i += CHUNK_SIZE) {
        const chunk = newBenesToCreate.slice(i, i + CHUNK_SIZE);
        await prisma.beneficiary.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }

      // Re-fetch newly created beneficiaries in chunks
      const newNamesArray = Array.from(seenNewBenes);
      for (let i = 0; i < newNamesArray.length; i += CHUNK_SIZE) {
        const chunk = newNamesArray.slice(i, i + CHUNK_SIZE);
        const newlyCreated = await prisma.beneficiary.findMany({
          where: {
            fullName: { in: chunk },
          },
          select: {
            id: true,
            fullName: true,
            barangay: true,
            municipality: true,
          },
        });

        for (const b of newlyCreated) {
          beneMap.set(b.fullName.toUpperCase().trim(), b);
        }
      }
    }

    // 4. Collect and prepare all Restriction records
    const allBeneIds = Array.from(beneMap.values()).map((b) => b.id);
    const restrictionsToCreate: any[] = [];

    for (const r of processedRows) {
      const bene = beneMap.get(r.fullName);
      if (!bene) continue;

      restrictionsToCreate.push({
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
      });
    }

    // 5. Blazing-Fast Overwrite: Remove existing restriction records for these beneficiaries in bulk chunks
    if (allBeneIds.length > 0) {
      for (let i = 0; i < allBeneIds.length; i += 2000) {
        const idChunk = allBeneIds.slice(i, i + 2000);
        await prisma.beneficiaryRestriction.deleteMany({
          where: {
            beneficiaryId: { in: idChunk },
          },
        });
      }
    }

    // 6. Fast Bulk Ingestion in chunks of 1,000 rows
    let insertedCount = 0;
    if (restrictionsToCreate.length > 0) {
      for (let i = 0; i < restrictionsToCreate.length; i += CHUNK_SIZE) {
        const chunk = restrictionsToCreate.slice(i, i + CHUNK_SIZE);
        await prisma.beneficiaryRestriction.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        insertedCount += chunk.length;
      }
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    await logAudit({
      userId: user.id,
      action: "RESTRICTIONS_MASTERLIST_IMPORTED",
      entityType: "RESTRICTION",
      metadata: {
        totalRows: rawRows.length,
        processedRows: processedRows.length,
        importedCount: insertedCount,
        durationSeconds,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} disqualified reference records in ${durationSeconds} seconds!`,
      importedCount: insertedCount,
      totalProcessed: processedRows.length,
      durationSeconds,
    });
  } catch (error: any) {
    console.error("Restriction bulk import error:", error);
    return NextResponse.json({ error: error.message || "Failed to process restriction masterlist" }, { status: 500 });
  }
}
