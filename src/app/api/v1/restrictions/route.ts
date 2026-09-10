export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdminUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function parsePayoutDateToTimestamp(payoutDateStr: string): number {
  if (!payoutDateStr) return 0;
  const parsed = new Date(payoutDateStr);
  if (!isNaN(parsed.getTime())) return parsed.getTime();

  // Try parsing formats like "September 13, 2025" or "Sept. 13, 2025"
  const clean = payoutDateStr.replace(/Sept\./i, "Sep").replace(/Aug\./i, "Aug");
  const p2 = new Date(clean);
  if (!isNaN(p2.getTime())) return p2.getTime();

  return 0;
}

function maskFullName(fullName: string = ""): string {
  if (!fullName) return "***";
  return fullName
    .split(/\s+/)
    .map((word) => (word.length > 1 ? word[0] + "*".repeat(Math.min(word.length - 1, 4)) : word))
    .join(" ");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const isSuggestions = searchParams.get("suggestions") === "1" || searchParams.get("type") === "suggestions";
    const isCountOnly = searchParams.get("countOnly") === "1";

    // Public count of reference entries
    if (isCountOnly) {
      const totalCount = await prisma.beneficiaryRestriction.count();
      return NextResponse.json({ totalCount });
    }

    const user = await getCurrentUser();

    // Masked suggestions for public eligibility lookup dropdown
    if (isSuggestions && query) {
      const qUpper = query.toUpperCase();

      const restrictions = await prisma.beneficiaryRestriction.findMany({
        where: {
          OR: [
            { beneficiary: { fullName: { contains: qUpper, mode: "insensitive" } } },
            { beneficiary: { lastName: { contains: qUpper, mode: "insensitive" } } },
            { beneficiary: { firstName: { contains: qUpper, mode: "insensitive" } } },
            { adlNo: { contains: qUpper, mode: "insensitive" } },
          ],
        },
        include: {
          beneficiary: true,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      const suggestions = restrictions.map((r) => {
        const b = r.beneficiary;
        const isAuthStaff = Boolean(user);
        return {
          id: r.id,
          fullName: isAuthStaff ? (b?.fullName || "") : maskFullName(b?.fullName || ""),
          firstName: b?.firstName || "",
          middleName: b?.middleName || "",
          lastName: b?.lastName || "",
          extensionName: b?.extensionName || "",
          adlNo: isAuthStaff ? (r.adlNo || "") : (r.adlNo ? `${r.adlNo.slice(0, 4)}****` : "Historical"),
          workDate: isAuthStaff ? (r.workDate || "") : "Recorded Duration",
          payoutDate: isAuthStaff ? (r.payoutDate || "") : (r.payoutDate ? r.payoutDate.slice(0, 4) + " (Recorded)" : "Recorded"),
          barangay: r.barangay || b?.barangay || "Dingalan",
          municipality: r.municipality || b?.municipality || "Dingalan",
          isAppointive: r.isAppointivePersonnel,
        };
      });

      return NextResponse.json({ suggestions });
    }

    // Full table dumps require authentication
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Viewing the complete restrictions registry requires staff authentication." },
        { status: 401 }
      );
    }

    const whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { beneficiary: { fullName: { contains: query, mode: "insensitive" } } },
        { adlNo: { contains: query, mode: "insensitive" } },
        { barangay: { contains: query, mode: "insensitive" } },
      ];
    }

    const [restrictions, totalCount] = await Promise.all([
      prisma.beneficiaryRestriction.findMany({
        where: whereClause,
        include: {
          beneficiary: true,
          sourceProgram: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.beneficiaryRestriction.count(),
    ]);

    return NextResponse.json({ restrictions, totalCount });
  } catch (error: any) {
    console.error("GET restrictions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName = "", middleName = "", lastName = "", extensionName = "", fullName: rawFullName = "" } = body;

    const fName = firstName.trim().toUpperCase();
    const mName = middleName.trim().toUpperCase();
    const lName = lastName.trim().toUpperCase();
    const extName = extensionName.trim().toUpperCase();

    let combinedTargetName = rawFullName.trim().toUpperCase();

    if (!combinedTargetName) {
      if (lName && fName) {
        const middlePart = mName ? ` ${mName}` : "";
        const extPart = extName ? ` ${extName}` : "";
        combinedTargetName = `${lName}, ${fName}${middlePart}${extPart}`;
      } else if (fName) {
        combinedTargetName = fName;
      }
    }

    if (!combinedTargetName && !lName && !fName) {
      return NextResponse.json(
        { error: "Please provide at least a First Name or Last Name to evaluate eligibility." },
        { status: 400 }
      );
    }

    // Build flexible search conditions
    const orConditions: any[] = [];

    if (combinedTargetName) {
      orConditions.push({ beneficiary: { fullName: { contains: combinedTargetName, mode: "insensitive" } } });
      // Also try inverted "FIRSTNAME LASTNAME"
      if (lName && fName) {
        orConditions.push({ beneficiary: { fullName: { contains: `${fName} ${lName}`, mode: "insensitive" } } });
        orConditions.push({ beneficiary: { fullName: { contains: `${lName}, ${fName}`, mode: "insensitive" } } });
      }
    }

    if (lName && fName) {
      orConditions.push({
        AND: [
          { beneficiary: { fullName: { contains: lName, mode: "insensitive" } } },
          { beneficiary: { fullName: { contains: fName, mode: "insensitive" } } },
        ],
      });
      orConditions.push({
        AND: [
          { beneficiary: { lastName: { contains: lName, mode: "insensitive" } } },
          { beneficiary: { firstName: { contains: fName, mode: "insensitive" } } },
        ],
      });
    }

    const restriction = await prisma.beneficiaryRestriction.findFirst({
      where: {
        OR: orConditions.length > 0 ? orConditions : [{ beneficiary: { fullName: { contains: fName } } }],
      },
      include: {
        beneficiary: true,
        sourceProgram: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const presentDateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    if (restriction) {
      const beneName = restriction.beneficiary?.fullName || combinedTargetName;
      const payoutDateStr = restriction.payoutDate;
      const payoutTimestamp = parsePayoutDateToTimestamp(payoutDateStr);

      let isDisqualified = false;
      let daysElapsed = 0;
      let daysRemaining = 0;
      let eligibilityDateFormatted = "";
      let disqualificationReason = "";

      // Check Appointive Personnel Rule
      const isAppointive = restriction.isAppointivePersonnel || (restriction.adlNo && /BHW|TANOD|OFFICIAL|TREASURER|SECRETARY|COUNCIL|STAFF|APPOINTIVE|HEAD|MANAGER|DEPARTMENT|GOVERNMENT|GOOVERNMENT|MUNICIPAL|EMPLOYEE|PERSONNEL|LUPON|CAPTAIN|KAGAWAD|PESO/i.test(restriction.adlNo));

      if (isAppointive) {
        isDisqualified = true;
        disqualificationReason = `Disqualified: Active Barangay / Municipal Appointive Personnel / Government Employee (${restriction.adlNo || "Appointive Position"}). Government officials, department heads, and appointive personnel are strictly barred from TUPAD emergency employment under DOLE statutory guidelines.`;
      } else if (payoutTimestamp > 0) {
        // Check 320 Days Rule
        daysElapsed = Math.floor((now.getTime() - payoutTimestamp) / (1000 * 60 * 60 * 24));

        if (daysElapsed < 320) {
          isDisqualified = true;
          daysRemaining = 320 - daysElapsed;
          const eligibleTimestamp = payoutTimestamp + 320 * 24 * 60 * 60 * 1000;
          const eligibleDate = new Date(eligibleTimestamp);
          eligibilityDateFormatted = eligibleDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          disqualificationReason = `Disqualified: Received TUPAD payout on ${payoutDateStr} (${daysElapsed} days ago). DOLE guidelines require a minimum 320-day interval between TUPAD availments. Eligible on ${eligibilityDateFormatted} (${daysRemaining} days remaining).`;
        } else {
          isDisqualified = false;
          disqualificationReason = `Eligible: Previous TUPAD payout was on ${payoutDateStr} (${daysElapsed} days ago, exceeding the mandatory 320-day interval).`;
        }
      } else {
        // Restriction without timestamp
        isDisqualified = restriction.status === "ACTIVE";
        disqualificationReason = restriction.reason || "Active restriction recorded in compliance database.";
      }

      return NextResponse.json({
        eligible: !isDisqualified,
        disqualified: isDisqualified,
        name: beneName,
        workDurationDate: restriction.workDate || "10-Day Work Program",
        payoutDate: restriction.payoutDate || "N/A",
        orientationDate: restriction.orientationDate || "N/A",
        adlNo: restriction.adlNo || "HISTORICAL_BATCH",
        barangay: restriction.barangay || restriction.beneficiary?.barangay || "BUHANGIN",
        municipality: restriction.municipality || restriction.beneficiary?.municipality || "BALER",
        reason: disqualificationReason,
        daysElapsed,
        daysRemaining,
        eligibilityDate: eligibilityDateFormatted || restriction.restrictionEnd || "N/A",
        isAppointivePersonnel: Boolean(isAppointive),
        presentDate: presentDateStr,
        sourceProgram: restriction.sourceProgram?.programName,
      });
    }

    // No disqualifying record found
    const displayedName = combinedTargetName || `${fName} ${lName}`;
    return NextResponse.json({
      eligible: true,
      disqualified: false,
      name: displayedName,
      workDurationDate: "None Recorded",
      payoutDate: "No Previous Payout Lockout",
      adlNo: "None (Clean Registry)",
      barangay: "Verified Clean",
      municipality: "Dingalan / Baler",
      reason: "Eligible: No active 320-day payout lockout or Barangay Appointive Personnel disqualification found in the registry.",
      presentDate: presentDateStr,
    });
  } catch (error: any) {
    console.error("POST restrictions check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUser(user) && !hasPermission(user.role, "restriction.create")) {
      return NextResponse.json(
        { error: "Forbidden: Only Domain Master and PESO Admins can clear the reference list." },
        { status: 403 }
      );
    }

    // 1. Delete all records from BeneficiaryRestriction
    const deleteRestrictionsResult = await prisma.beneficiaryRestriction.deleteMany({});

    // 2. Clean up placeholder reference beneficiaries with 'BN-REF-' prefix who are not enrolled in any program
    let deletedBenesCount = 0;
    try {
      const deletedBenes = await prisma.beneficiary.deleteMany({
        where: {
          beneficiaryNumber: { startsWith: "BN-REF-" },
          programBeneficiaries: { none: {} },
        },
      });
      deletedBenesCount = deletedBenes.count;
    } catch (e) {
      console.warn("Could not delete orphaned reference beneficiaries:", e);
    }

    // 3. Log Audit
    await logAudit({
      userId: user.id,
      action: "RESTRICTIONS_MASTERLIST_CLEARED",
      entityType: "RESTRICTION",
      metadata: {
        deletedRestrictionsCount: deleteRestrictionsResult.count,
        deletedPlaceholderBenesCount: deletedBenesCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all reference records (reset to 0). Removed ${deleteRestrictionsResult.count} restriction entries.`,
      deletedCount: deleteRestrictionsResult.count,
    });
  } catch (error: any) {
    console.error("DELETE restrictions error:", error);
    return NextResponse.json({ error: error.message || "Failed to clear restrictions" }, { status: 500 });
  }
}
