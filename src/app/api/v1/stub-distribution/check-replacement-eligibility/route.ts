export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { evaluatePersonTupadEligibility } from "@/lib/replacement-eligibility";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      applicantFullName = "",
      applicantBirthday = "",
      dependentFullName = "",
      dependentBirthday = "",
      programId = "",
      originalProgramBeneficiaryId = "",
      programBeneficiaryId = "",
    } = body || {};

    const excludedPbId = originalProgramBeneficiaryId || programBeneficiaryId || null;

    if (!String(applicantFullName).trim() || !String(dependentFullName).trim()) {
      return NextResponse.json(
        { error: "Both the Replacement Applicant Full Name and Dependent Full Name are required." },
        { status: 400 }
      );
    }

    const [applicant, dependent] = await Promise.all([
      evaluatePersonTupadEligibility({
        fullName: applicantFullName,
        birthday: applicantBirthday,
        programId: programId || null,
        excludeProgramBeneficiaryId: excludedPbId,
        roleLabel: "APPLICANT",
      }),
      evaluatePersonTupadEligibility({
        fullName: dependentFullName,
        birthday: dependentBirthday,
        programId: programId || null,
        excludeProgramBeneficiaryId: excludedPbId,
        roleLabel: "DEPENDENT",
      }),
    ]);

    if (
      applicant.normalizedFullName &&
      dependent.normalizedFullName &&
      applicant.normalizedFullName === dependent.normalizedFullName
    ) {
      dependent.eligible = false;
      dependent.disqualified = true;
      dependent.reason = "Not Eligible: The Dependent cannot be the exact same person as the Replacement Applicant.";
    }

    return NextResponse.json({
      success: true,
      bothQualified: applicant.eligible && dependent.eligible,
      applicant,
      dependent,
    });
  } catch (error: any) {
    console.error("POST /api/v1/stub-distribution/check-replacement-eligibility error:", error);
    return NextResponse.json({ error: error.message || "Failed to evaluate replacement eligibility" }, { status: 500 });
  }
}

