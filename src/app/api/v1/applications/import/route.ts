export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import * as XLSX from "xlsx";

function getVal(row: any, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
    // Also try case-insensitive key search
    const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const rKey of Object.keys(row)) {
      const normalizedRKey = rKey.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedRKey === lowerKey && row[rKey] !== undefined && row[rKey] !== null) {
        const val = String(row[rKey]).trim();
        if (val !== "") return val;
      }
    }
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (!isAdminUser(user) && !hasPermission(user.role, "program.create"))) {
      return NextResponse.json(
        { error: "Forbidden: Only Domain Master and PESO Admin can upload application status rosters." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "APPEND"; // "APPEND" | "REPLACE"
    const batchName = (formData.get("batchName") as string) || "TUPAD Applicants Roster";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: "Uploaded spreadsheet is empty." }, { status: 400 });
    }

    if (mode === "REPLACE") {
      await prisma.tupadApplicationRoster.deleteMany({ where: { source: "IMPORT" } });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const row of rawRows) {
      const lastName = getVal(row, ["LAST NAME", "LASTNAME", "SURNAME"]).toUpperCase();
      const firstName = getVal(row, ["FIRST NAME", "FIRSTNAME", "GIVEN NAME"]).toUpperCase();
      const middleName = getVal(row, ["MIDDLE NAME", "MIDDLENAME"]).toUpperCase();
      const extensionName = getVal(row, ["EXT. NAME", "EXT NAME", "EXTENSION", "SUFFIX"]).toUpperCase();

      if (!lastName || !firstName) continue; // Skip empty name rows

      const birthMonth = getVal(row, ["MONTH", "BIRTH MONTH", "MTH"]);
      const birthDay = getVal(row, ["DAY", "BIRTH DAY"]);
      const birthYear = getVal(row, ["YEAR", "BIRTH YEAR", "YR"]);

      let formattedBirthday = "";
      if (birthMonth && birthDay && birthYear) {
        const m = birthMonth.padStart(2, "0");
        const d = birthDay.padStart(2, "0");
        formattedBirthday = `${m}-${d}-${birthYear}`;
      } else {
        const rawBday = getVal(row, ["BIRTHDAY", "DOB", "DATE OF BIRTH"]);
        if (rawBday) formattedBirthday = rawBday;
      }

      const civilStatus = getVal(row, ["CIVIL STATUS", "STATUS", "CIVIL"]).toUpperCase();
      const streetSitio = getVal(row, ["STREET/SITIO", "STREET", "SITIO", "PUROK"]).toUpperCase();
      const barangay = getVal(row, ["BARANGAY", "BRGY"]).toUpperCase();
      const contactNumber = getVal(row, ["CONTACT NO.", "CONTACT NO", "CONTACT", "PHONE", "MOBILE"]);
      const idPresented = getVal(row, ["ID PRESENTED", "ID TYPE", "ID"]).toUpperCase();
      const idNumber = getVal(row, ["ID NO.", "ID NO", "ID NUMBER"]);
      const is4ps = getVal(row, ["4PS(Y/N)", "4PS", "4PS (Y/N)"]).toUpperCase();
      const isIp = getVal(row, ["IP(Y/N)", "IP", "IP (Y/N)"]).toUpperCase();
      const occupation = getVal(row, ["OCCUPATION", "JOB"]).toUpperCase();
      const monthlyIncome = getVal(row, ["MONTHLY INCOME", "INCOME"]);
      const dependentFullName = getVal(row, ["DEPENDENT(FULL NAME)", "DEPENDENT", "DEPENDENT NAME"]).toUpperCase();
      const dependentAge = getVal(row, ["AGE", "DEPENDENT AGE"]);
      const dependentRelationship = getVal(row, ["RELATIONSHIP", "RELATION"]).toUpperCase();
      const remarks = getVal(row, ["REMARKS", "COMMENT", "COMMENTS", "REMARK"]);

      const normalizedFullName = `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}${extensionName ? ` ${extensionName}` : ""}`.trim();

      // Check if lacking key fields
      const hasLackingDetails =
        !contactNumber ||
        !idPresented ||
        !idNumber ||
        !civilStatus ||
        !formattedBirthday ||
        !barangay ||
        !dependentFullName ||
        (remarks && /kulang|lacking|pending|photocopy|valid id/i.test(remarks));

      const appStatus = hasLackingDetails ? "INCOMPLETE" : "QUEUED";

      // Upsert applicant record
      const existing = await prisma.tupadApplicationRoster.findFirst({
        where: {
          source: "IMPORT",
          lastName,
          firstName,
          middleName: middleName || undefined,
        },
      });

      if (existing) {
        await prisma.tupadApplicationRoster.update({
          where: { id: existing.id },
          data: {
            batchName,
            source: "IMPORT",
            submissionStatus: "SUBMITTED",
            submittedAt: new Date(),
            extensionName: extensionName || null,
            fullName: normalizedFullName,
            birthMonth: birthMonth || null,
            birthDay: birthDay || null,
            birthYear: birthYear || null,
            birthday: formattedBirthday || null,
            civilStatus: civilStatus || null,
            streetSitio: streetSitio || null,
            barangay: barangay || null,
            contactNumber: contactNumber || null,
            idPresented: idPresented || null,
            idNumber: idNumber || null,
            is4ps: is4ps || null,
            isIp: isIp || null,
            occupation: occupation || null,
            monthlyIncome: monthlyIncome || null,
            dependentFullName: dependentFullName || null,
            dependentAge: dependentAge || null,
            dependentRelationship: dependentRelationship || null,
            remarks: remarks || null,
            status: appStatus,
            uploadedById: user.id,
          },
        });
        updatedCount++;
      } else {
        await prisma.tupadApplicationRoster.create({
          data: {
            batchName,
            source: "IMPORT",
            submissionStatus: "SUBMITTED",
            submittedAt: new Date(),
            lastName,
            firstName,
            middleName: middleName || null,
            extensionName: extensionName || null,
            fullName: normalizedFullName,
            birthMonth: birthMonth || null,
            birthDay: birthDay || null,
            birthYear: birthYear || null,
            birthday: formattedBirthday || null,
            civilStatus: civilStatus || null,
            streetSitio: streetSitio || null,
            barangay: barangay || null,
            contactNumber: contactNumber || null,
            idPresented: idPresented || null,
            idNumber: idNumber || null,
            is4ps: is4ps || null,
            isIp: isIp || null,
            occupation: occupation || null,
            monthlyIncome: monthlyIncome || null,
            dependentFullName: dependentFullName || null,
            dependentAge: dependentAge || null,
            dependentRelationship: dependentRelationship || null,
            remarks: remarks || null,
            status: appStatus,
            uploadedById: user.id,
          },
        });
        insertedCount++;
      }
    }

    await logAudit({
      userId: user.id,
      action: "TUPAD_APPLICATIONS_IMPORTED",
      entityType: "TUPAD_APPLICATION_ROSTER",
      metadata: {
        fileName: file.name,
        mode,
        insertedCount,
        updatedCount,
        totalProcessed: rawRows.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported application roster: ${insertedCount} added, ${updatedCount} updated (${insertedCount + updatedCount} total applicants).`,
      insertedCount,
      updatedCount,
      total: insertedCount + updatedCount,
    });
  } catch (error: any) {
    console.error("POST /applications/import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
