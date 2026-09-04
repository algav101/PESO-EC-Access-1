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

    // 1. In-Memory Normalization & Deduplication
    const processedRows = [];
    const errors = [];
    const uniqueFullNameSet = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowIdx = i + 1;

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

      if (!rawName) {
        errors.push({ row: rowIdx, error: "Missing Name of Beneficiary" });
        continue;
      }

      const parsedName = parseNameParts(rawName);
      uniqueFullNameSet.add(parsedName.fullName);

      // Column B: ADL NO. / Position
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

    // 2. High-Speed Bulk Fetch of Existing Beneficiaries in 1 Single Query
    const uniqueNamesArray = Array.from(uniqueFullNameSet);
    const existingBenes = await prisma.beneficiary.findMany({
      where: {
        fullName: { in: uniqueNamesArray },
      },
      select: {
        id: true,
        fullName: true,
        lastName: true,
        firstName: true,
        middleName: true,
        extensionName: true,
        barangay: true,
        municipality: true,
      },
    });

    const beneMap = new Map<string, any>();
    for (const b of existingBenes) {
      beneMap.set(b.fullName.toUpperCase().trim(), b);
    }

    // 3. Bulk Insert Missing Beneficiaries in 1 Batch
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
      // Chunk inserts in batches of 500 for maximum safety & speed
      const CHUNK_SIZE = 500;
      for (let i = 0; i < newBenesToCreate.length; i += CHUNK_SIZE) {
        const chunk = newBenesToCreate.slice(i, i + CHUNK_SIZE);
        await prisma.beneficiary.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }

      // Re-fetch newly created beneficiaries to populate beneMap
      const newlyCreated = await prisma.beneficiary.findMany({
        where: {
          fullName: { in: Array.from(seenNewBenes) },
        },
        select: {
          id: true,
          fullName: true,
          lastName: true,
          firstName: true,
          middleName: true,
          extensionName: true,
          barangay: true,
          municipality: true,
        },
      });

      for (const b of newlyCreated) {
        beneMap.set(b.fullName.toUpperCase().trim(), b);
      }
    }

    // 4. High-Speed Bulk Fetch of Existing Restrictions for all beneficiaries in 1 Query
    const allBeneIds = Array.from(beneMap.values()).map((b) => b.id);
    const existingRestrictions = await prisma.beneficiaryRestriction.findMany({
      where: {
        beneficiaryId: { in: allBeneIds },
      },
      select: {
        id: true,
        beneficiaryId: true,
        adlNo: true,
      },
    });

    const restrictionKeyMap = new Map<string, string>(); // `${beneId}_${adlNo}` -> restrictionId
    for (const rx of existingRestrictions) {
      restrictionKeyMap.set(`${rx.beneficiaryId}_${rx.adlNo || ""}`, rx.id);
    }

    // 5. Partition into Bulk Inserts vs Parallel Updates
    const newRestrictionsToInsert: any[] = [];
    const updatesToExecute: any[] = [];
    const seenInsertKeys = new Set<string>();

    for (const r of processedRows) {
      const bene = beneMap.get(r.fullName);
      if (!bene) continue;

      const key = `${bene.id}_${r.adlNo || ""}`;
      if (restrictionKeyMap.has(key)) {
        const existingId = restrictionKeyMap.get(key)!;
        updatesToExecute.push({
          id: existingId,
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
      } else if (!seenInsertKeys.has(key)) {
        seenInsertKeys.add(key);
        newRestrictionsToInsert.push({
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
    }

    // 6. Bulk Insert All New Restrictions in 1 Operation
    if (newRestrictionsToInsert.length > 0) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < newRestrictionsToInsert.length; i += CHUNK_SIZE) {
        const chunk = newRestrictionsToInsert.slice(i, i + CHUNK_SIZE);
        await prisma.beneficiaryRestriction.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
    }

    // 7. Parallel Bulk Updates in Concurrency Chunks of 50
    if (updatesToExecute.length > 0) {
      const UPDATE_CONCURRENCY = 50;
      for (let i = 0; i < updatesToExecute.length; i += UPDATE_CONCURRENCY) {
        const chunk = updatesToExecute.slice(i, i + UPDATE_CONCURRENCY);
        await Promise.all(
          chunk.map((u) =>
            prisma.beneficiaryRestriction.update({
              where: { id: u.id },
              data: u.data,
            })
          )
        );
      }
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    await logAudit({
      userId: user.id,
      action: "RESTRICTIONS_MASTERLIST_IMPORTED",
      entityType: "RESTRICTION",
      metadata: {
        totalRows: rawRows.length,
        importedCount: newRestrictionsToInsert.length,
        updatedCount: updatesToExecute.length,
        durationSeconds,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedRows.length} records in ${durationSeconds}s (${newRestrictionsToInsert.length} new registered, ${updatesToExecute.length} updated).`,
      importedCount: newRestrictionsToInsert.length,
      updatedCount: updatesToExecute.length,
      totalProcessed: processedRows.length,
      durationSeconds,
    });
  } catch (error: any) {
    console.error("Restriction bulk import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
