import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";

function addYears(dateStr: string, years: number = 1): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const fallback = new Date();
      fallback.setFullYear(fallback.getFullYear() + years);
      return fallback.toISOString().split("T")[0];
    }
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split("T")[0];
  } catch {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + years);
    return fallback.toISOString().split("T")[0];
  }
}

function formatDateSafe(val: any): string {
  if (!val) return new Date().toISOString().split("T")[0];
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    return trimmed;
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  if (typeof val === "number") {
    // Excel serial date number
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) return jsDate.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Process & Normalize rows
    const processedRows = [];
    const errors = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowIdx = i + 1;

      // Extract full name
      const fullName = (
        row["FULL NAME"] ||
        row["BENEFICIARY NAME"] ||
        row["NAME"] ||
        row["fullname"] ||
        row["FullName"] ||
        (row["FIRST NAME"] && row["LAST NAME"] ? `${row["LAST NAME"]}, ${row["FIRST NAME"]}` : "")
      )?.toString().trim().toUpperCase();

      if (!fullName) {
        errors.push({ row: rowIdx, error: "Missing Full Name" });
        continue;
      }

      // Extract Birthday
      const bdayRaw = (
        row["BIRTHDAY (YYYY-MM-DD)"] ||
        row["BIRTHDAY"] ||
        row["DOB"] ||
        row["DATE OF BIRTH"] ||
        row["birthday"]
      );
      const birthday = formatDateSafe(bdayRaw);

      // Extract Payout Date
      const payoutRaw = (
        row["PAYOUT DATE (YYYY-MM-DD)"] ||
        row["PAYOUT DATE"] ||
        row["DATE OF PAYOUT"] ||
        row["payoutDate"] ||
        row["payout_date"]
      );
      const payoutDate = formatDateSafe(payoutRaw);

      // Lockout period
      const lockoutStart = payoutDate;
      const restrictionEnd = addYears(payoutDate, 1);

      // Optional fields
      const barangay = (row["BARANGAY"] || row["barangay"] || "Paltic")?.toString().trim();
      const sourceProgram = (row["SOURCE PROGRAM NAME"] || row["PROGRAM"] || row["sourceProgram"] || "Historical TUPAD Batch")?.toString().trim();
      const reason = (row["RESTRICTION REASON"] || row["REASON"] || row["reason"] || "365-day statutory lockout from previous TUPAD payout")?.toString().trim();

      processedRows.push({
        fullName,
        birthday,
        barangay,
        payoutDate,
        lockoutStart,
        restrictionEnd,
        sourceProgram,
        reason,
      });
    }

    if (processedRows.length === 0) {
      return NextResponse.json({
        error: "No valid rows could be parsed. Check column headers.",
        details: errors,
      }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const r of processedRows) {
      // 1. Find or create beneficiary record
      let bene = await prisma.beneficiary.findFirst({
        where: {
          fullName: r.fullName,
          birthday: r.birthday,
        },
      });

      if (!bene) {
        bene = await prisma.beneficiary.create({
          data: {
            beneficiaryNumber: `BN-HIST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
            fullName: r.fullName,
            birthday: r.birthday,
            barangay: r.barangay,
            municipality: "Dingalan",
            province: "Aurora",
            status: "ACTIVE",
          },
        });
      }

      // 2. Check if active restriction already exists
      const existing = await prisma.beneficiaryRestriction.findFirst({
        where: {
          beneficiaryId: bene.id,
          restrictionEnd: r.restrictionEnd,
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // 3. Insert restriction record
      await prisma.beneficiaryRestriction.create({
        data: {
          beneficiaryId: bene.id,
          payoutDate: r.payoutDate,
          restrictionStart: r.lockoutStart,
          restrictionEnd: r.restrictionEnd,
          reason: `${r.reason} (${r.sourceProgram})`,
          status: "ACTIVE",
        },
      });
      importedCount++;
    }

    await logAudit({
      userId: user.id,
      action: "RESTRICTIONS_MASTERLIST_IMPORTED",
      entityType: "RESTRICTION",
      metadata: {
        totalRows: rawRows.length,
        importedCount,
        skippedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} restricted beneficiaries into the 365-day compliance database.`,
      importedCount,
      skippedCount,
      totalProcessed: processedRows.length,
    });
  } catch (error: any) {
    console.error("Restriction import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
