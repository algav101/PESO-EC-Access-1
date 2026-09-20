export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      lastName,
      firstName,
      middleName,
      extensionName,
      birthday, // MM-DD-YYYY or YYYY-MM-DD
    } = body;

    if (!lastName || !firstName) {
      return NextResponse.json(
        { error: "Mangyaring ilagay ang inyong Last Name at First Name." },
        { status: 400 }
      );
    }

    const cleanLast = String(lastName).trim().toUpperCase();
    const cleanFirst = String(firstName).trim().toUpperCase();
    const cleanMiddle = middleName ? String(middleName).trim().toUpperCase() : "";
    const cleanExt = extensionName ? String(extensionName).trim().toUpperCase() : "";
    const cleanBday = birthday ? String(birthday).trim() : "";

    // 1. Query TupadApplicationRoster
    const applicants = await prisma.tupadApplicationRoster.findMany({
      where: {
        lastName: { equals: cleanLast, mode: "insensitive" },
        firstName: { equals: cleanFirst, mode: "insensitive" },
      },
    });

    // Match middle name and extension if candidates found
    let matchedApplicant = null;
    if (applicants.length === 1) {
      matchedApplicant = applicants[0];
    } else if (applicants.length > 1) {
      if (cleanMiddle) {
        matchedApplicant = applicants.find(
          (a) => a.middleName && a.middleName.toUpperCase().includes(cleanMiddle)
        );
      }
      if (!matchedApplicant && cleanBday) {
        matchedApplicant = applicants.find((a) => {
          if (!a.birthday) return false;
          const normA = a.birthday.replace(/[^0-9]/g, "");
          const normIn = cleanBday.replace(/[^0-9]/g, "");
          return normA === normIn || normA.includes(normIn) || normIn.includes(normA);
        });
      }
      if (!matchedApplicant) {
        matchedApplicant = applicants[0];
      }
    }

    // 2. Check Validator / Restriction List for last TUPAD availment & ADL No.
    let lastAvailment: any = null;

    // Search BeneficiaryRestriction by name or relations
    const restriction = await prisma.beneficiaryRestriction.findFirst({
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

    if (restriction) {
      lastAvailment = {
        adlNo: restriction.adlNo || "2025_03_0318_RO3_LAWAATBINHI",
        payoutDate: restriction.payoutDate,
        workDate: restriction.workDate || "Past TUPAD Program",
        orientationDate: restriction.orientationDate || "-",
        barangay: restriction.barangay || matchedApplicant?.barangay || "Dingalan",
        isAppointivePersonnel: restriction.isAppointivePersonnel,
        reason: restriction.reason,
        status: restriction.status,
      };
    } else {
      // Also check historical ProgramBeneficiary records in the system
      const histPb = await prisma.programBeneficiary.findFirst({
        where: {
          beneficiary: {
            lastName: { equals: cleanLast, mode: "insensitive" },
            firstName: { equals: cleanFirst, mode: "insensitive" },
          },
        },
        include: {
          program: true,
          payouts: { where: { status: "PAID" }, take: 1 },
        },
        orderBy: { joinedAt: "desc" },
      });

      if (histPb) {
        lastAvailment = {
          adlNo: histPb.program.batchNumber || histPb.program.programCode,
          payoutDate: histPb.program.payoutDate || histPb.payouts[0]?.payoutDate || "Recorded in System",
          workDate: `${histPb.program.startDate || "Day 1"} - ${histPb.program.endDate || "Day 10"}`,
          orientationDate: histPb.program.orientationDate || "-",
          barangay: histPb.program.projectLocation || "Dingalan",
          isAppointivePersonnel: false,
          reason: "Previous TUPAD Beneficiary Record",
          status: "RECORDED",
        };
      }
    }

    // 3. If NO matching inquiry name found in data source:
    if (!matchedApplicant) {
      return NextResponse.json({
        found: false,
        message: "Paumanhin, ngunit wala pa sa ating Tangapan o System ang inyong Aplikasyon mangyaring Mag apply gamit ang ating PESO EC Access Tupad Application System",
        searchedName: `${cleanLast}, ${cleanFirst}${cleanMiddle ? ` ${cleanMiddle}` : ""}${cleanExt ? ` ${cleanExt}` : ""}`,
        lastAvailment,
      });
    }

    // 4. If matched, analyze lacking details
    const lackingFields: string[] = [];
    if (!matchedApplicant.contactNumber) lackingFields.push("Active Contact / Mobile Number");
    if (!matchedApplicant.idPresented) lackingFields.push("Valid Government / Voter's ID Type");
    if (!matchedApplicant.idNumber) lackingFields.push("Valid ID Number / Photocopy");
    if (!matchedApplicant.civilStatus) lackingFields.push("Civil Status");
    if (!matchedApplicant.birthday && !matchedApplicant.birthYear) lackingFields.push("Complete Date of Birth");
    if (!matchedApplicant.streetSitio) lackingFields.push("Street / Sitio / Purok Address");
    if (!matchedApplicant.barangay) lackingFields.push("Barangay");
    if (!matchedApplicant.dependentFullName) lackingFields.push("Dependent / Beneficiary Next-of-Kin Details");

    const remarksText = matchedApplicant.remarks || "";
    const hasLackingRemark = /kulang|lacking|pending|photocopy|valid id|walang contact/i.test(remarksText);

    const isLacking = lackingFields.length > 0 || hasLackingRemark || matchedApplicant.status === "INCOMPLETE";

    // Build Response
    let statusMessage = "";
    if (isLacking) {
      statusMessage = "Magtungo sa Tangapan ng PESO-Dingalan o di kaya ay magmessage sa ating System Message Inquiry Form para sa kalinawan ng kakulangan ng inyong aplikasyon";
    } else {
      statusMessage = "Maedup! Ang inyong aplikasyon ay kasalukuyang nakapila para susunod na batch ng TUPAD Beneficiary";
    }

    // Helper functions for Data Privacy Act (RA 10173) compliant masking
    const maskFullName = (fullName: string = ""): string => {
      if (!fullName) return "***";
      return fullName
        .split(/\s+/)
        .map((word) => (word.length > 1 ? word[0] + "*".repeat(Math.min(word.length - 1, 4)) : word))
        .join(" ");
    };

    const maskPhoneNumber = (phone?: string | null): string => {
      if (!phone || String(phone).trim().length < 7) return "Nakatala (Masked)";
      const clean = String(phone).trim();
      if (clean.length <= 4) return "****";
      return clean.slice(0, 4) + "****" + clean.slice(-3);
    };

    const maskIdNumber = (idNum?: string | null): string => {
      if (!idNum || String(idNum).trim().length < 4) return "Nakatala (Masked)";
      const clean = String(idNum).trim();
      return clean.slice(0, Math.min(3, clean.length)) + "-****-" + clean.slice(-2);
    };

    const maskDependentName = (name?: string | null): string => {
      if (!name || String(name).trim().length < 2) return "May Nakatalang Dependent";
      return maskFullName(String(name).trim());
    };

    return NextResponse.json({
      found: true,
      applicant: {
        id: matchedApplicant.id,
        fullName: maskFullName(matchedApplicant.fullName),
        lastName: matchedApplicant.lastName ? matchedApplicant.lastName[0] + "****" : "****",
        firstName: matchedApplicant.firstName ? matchedApplicant.firstName[0] + "****" : "****",
        barangay: matchedApplicant.barangay || "-",
        streetSitio: matchedApplicant.streetSitio ? `Purok / Sitio sa Brgy. ${matchedApplicant.barangay || "Dingalan"}` : "-",
        contactNumber: maskPhoneNumber(matchedApplicant.contactNumber),
        idPresented: matchedApplicant.idPresented ? `${matchedApplicant.idPresented} (Naberipika)` : "Nakatala",
        idNumber: maskIdNumber(matchedApplicant.idNumber),
        dependentFullName: maskDependentName(matchedApplicant.dependentFullName),
        status: matchedApplicant.status,
      },
      isLackingDetails: isLacking,
      lackingFields,
      message: statusMessage,
      sourceRemarks: isLacking ? "Kulang ang ilang kinakailangang dokumento/detalye. Mangyaring kumpletuhin sa tanggapan." : "Kumpleto ang mga pangunahing detalye sa talaan.",
      lastAvailment: lastAvailment ? {
        adlNo: lastAvailment.adlNo ? `${lastAvailment.adlNo.slice(0, 4)}****` : "Historical TUPAD",
        payoutDate: lastAvailment.payoutDate || "Recorded",
        workDate: lastAvailment.workDate || "Past Program",
        barangay: lastAvailment.barangay,
        status: lastAvailment.status,
        reason: lastAvailment.reason,
      } : null,
    });
  } catch (error: any) {
    console.error("POST /api/v1/public/inquiry error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
