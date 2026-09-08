export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Generate unique application reference number e.g. APP-2026-DGL-8K9Z1
function generateAppCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomStr = "";
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `APP-${year}-DGL-${randomStr}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      lastName,
      firstName,
      middleName,
      extensionName,
      birthday,
      birthMonth,
      birthDay,
      birthYear,
      civilStatus,
      streetSitio,
      barangay,
      contactNumber,
      idPresented,
      idNumber,
      is4ps = "N",
      isIp = "N",
      occupation,
      monthlyIncome,
      dependentFullName,
      dependentAge,
      dependentRelationship,
      remarks,
    } = body;

    // 1. Validation
    if (!lastName || !firstName) {
      return NextResponse.json(
        { error: "Mangyaring ilagay ang Last Name at First Name ng aplikante." },
        { status: 400 }
      );
    }

    if (!barangay) {
      return NextResponse.json(
        { error: "Mangyaring piliin ang inyong Barangay sa Dingalan." },
        { status: 400 }
      );
    }

    const cleanLast = String(lastName).trim().toUpperCase();
    const cleanFirst = String(firstName).trim().toUpperCase();
    const cleanMiddle = middleName ? String(middleName).trim().toUpperCase() : "";
    const cleanExt = extensionName ? String(extensionName).trim().toUpperCase() : "";

    const normalizedFullName = `${cleanLast}, ${cleanFirst}${cleanMiddle ? ` ${cleanMiddle}` : ""}${cleanExt ? ` ${cleanExt}` : ""}`.trim();

    // Format Birthday
    let formattedBirthday = birthday ? String(birthday).trim() : "";
    let bMonth = birthMonth ? String(birthMonth).trim() : "";
    let bDay = birthDay ? String(birthDay).trim() : "";
    let bYear = birthYear ? String(birthYear).trim() : "";

    if (!formattedBirthday && bMonth && bDay && bYear) {
      formattedBirthday = `${bMonth.padStart(2, "0")}-${bDay.padStart(2, "0")}-${bYear}`;
    } else if (formattedBirthday && formattedBirthday.includes("-")) {
      const parts = formattedBirthday.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD -> MM-DD-YYYY
          bYear = parts[0];
          bMonth = parts[1];
          bDay = parts[2];
          formattedBirthday = `${bMonth}-${bDay}-${bYear}`;
        } else {
          bMonth = parts[0];
          bDay = parts[1];
          bYear = parts[2];
        }
      }
    }

    // 2. Perform 365-Day Restriction & Validator Pre-Check
    let restrictionWarning: any = null;
    const existingRestriction = await prisma.beneficiaryRestriction.findFirst({
      where: {
        OR: [
          {
            beneficiary: {
              fullName: {
                contains: `${cleanLast}, ${cleanFirst}`,
                mode: "insensitive",
              },
            },
          },
          {
            reason: {
              contains: `${cleanLast}, ${cleanFirst}`,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingRestriction) {
      restrictionWarning = {
        adlNo: existingRestriction.adlNo || "2025_03_0318_RO3_LAWAATBINHI",
        payoutDate: existingRestriction.payoutDate,
        workDate: existingRestriction.workDate || "Previous TUPAD",
        reason: existingRestriction.reason,
        status: existingRestriction.status,
      };
    }

    // 3. Detect Lacking Fields
    const lackingFields: string[] = [];
    if (!contactNumber || String(contactNumber).trim().length < 7) {
      lackingFields.push("Active Contact / Mobile Number");
    }
    if (!idPresented || String(idPresented).trim() === "") {
      lackingFields.push("Valid Government / Voter's ID Type");
    }
    if (!idNumber || String(idNumber).trim() === "") {
      lackingFields.push("Valid ID Number");
    }
    if (!civilStatus) lackingFields.push("Civil Status");
    if (!formattedBirthday) lackingFields.push("Date of Birth (Birthday)");
    if (!streetSitio) lackingFields.push("Street / Sitio / Purok Address");
    if (!dependentFullName || String(dependentFullName).trim() === "") {
      lackingFields.push("Designated Dependent / Next-of-Kin Full Name");
    }

    const isLacking = lackingFields.length > 0;
    const status = isLacking ? "INCOMPLETE" : "QUEUED";

    let finalRemarks = remarks ? String(remarks).trim() : "";
    if (isLacking) {
      finalRemarks = finalRemarks
        ? `${finalRemarks} | Lacking: ${lackingFields.join(", ")}`
        : `Lacking requirements: ${lackingFields.join(", ")}`;
    } else if (!finalRemarks) {
      finalRemarks = "Submitted via Online TUPAD Application Portal";
    }

    // 4. Upsert into TupadApplicationRoster
    const existing = await prisma.tupadApplicationRoster.findFirst({
      where: {
        lastName: cleanLast,
        firstName: cleanFirst,
        middleName: cleanMiddle || undefined,
      },
    });

    let record: any;
    const applicationCode = generateAppCode();

    if (existing) {
      record = await prisma.tupadApplicationRoster.update({
        where: { id: existing.id },
        data: {
          batchName: "Online TUPAD Application Portal",
          extensionName: cleanExt || null,
          fullName: normalizedFullName,
          birthMonth: bMonth || null,
          birthDay: bDay || null,
          birthYear: bYear || null,
          birthday: formattedBirthday || null,
          civilStatus: civilStatus ? String(civilStatus).toUpperCase() : null,
          streetSitio: streetSitio ? String(streetSitio).toUpperCase() : null,
          barangay: barangay ? String(barangay).toUpperCase() : null,
          contactNumber: contactNumber ? String(contactNumber).trim() : null,
          idPresented: idPresented ? String(idPresented).toUpperCase() : null,
          idNumber: idNumber ? String(idNumber).trim() : null,
          is4ps: is4ps ? String(is4ps).toUpperCase() : "N",
          isIp: isIp ? String(isIp).toUpperCase() : "N",
          occupation: occupation ? String(occupation).toUpperCase() : null,
          monthlyIncome: monthlyIncome ? String(monthlyIncome).trim() : null,
          dependentFullName: dependentFullName ? String(dependentFullName).toUpperCase() : null,
          dependentAge: dependentAge ? String(dependentAge).trim() : null,
          dependentRelationship: dependentRelationship ? String(dependentRelationship).toUpperCase() : null,
          remarks: finalRemarks,
          status,
        },
      });
    } else {
      record = await prisma.tupadApplicationRoster.create({
        data: {
          batchName: "Online TUPAD Application Portal",
          lastName: cleanLast,
          firstName: cleanFirst,
          middleName: cleanMiddle || null,
          extensionName: cleanExt || null,
          fullName: normalizedFullName,
          birthMonth: bMonth || null,
          birthDay: bDay || null,
          birthYear: bYear || null,
          birthday: formattedBirthday || null,
          civilStatus: civilStatus ? String(civilStatus).toUpperCase() : null,
          streetSitio: streetSitio ? String(streetSitio).toUpperCase() : null,
          barangay: barangay ? String(barangay).toUpperCase() : null,
          contactNumber: contactNumber ? String(contactNumber).trim() : null,
          idPresented: idPresented ? String(idPresented).toUpperCase() : null,
          idNumber: idNumber ? String(idNumber).trim() : null,
          is4ps: is4ps ? String(is4ps).toUpperCase() : "N",
          isIp: isIp ? String(isIp).toUpperCase() : "N",
          occupation: occupation ? String(occupation).toUpperCase() : null,
          monthlyIncome: monthlyIncome ? String(monthlyIncome).trim() : null,
          dependentFullName: dependentFullName ? String(dependentFullName).toUpperCase() : null,
          dependentAge: dependentAge ? String(dependentAge).trim() : null,
          dependentRelationship: dependentRelationship ? String(dependentRelationship).toUpperCase() : null,
          remarks: finalRemarks,
          status,
        },
      });
    }

    let resultMessage = "";
    if (isLacking) {
      resultMessage = "Magtungo sa Tangapan ng PESO-Dingalan o di kaya ay magmessage sa ating System Message Inquiry Form para sa kalinawan ng kakulangan ng inyong aplikasyon";
    } else {
      resultMessage = "Maedup! Ang inyong aplikasyon ay kasalukuyang nakapila para susunod na batch ng TUPAD Beneficiary";
    }

    return NextResponse.json({
      success: true,
      applicationCode,
      status: record.status,
      message: resultMessage,
      isLackingDetails: isLacking,
      lackingFields,
      applicant: {
        id: record.id,
        fullName: record.fullName,
        barangay: record.barangay,
        birthday: record.birthday,
        contactNumber: record.contactNumber,
        submittedAt: record.updatedAt,
      },
      restrictionWarning,
    });
  } catch (error: any) {
    console.error("POST /api/v1/public/applications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
