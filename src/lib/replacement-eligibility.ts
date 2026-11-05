import prisma from "@/lib/prisma";

export interface ParsedPersonName {
  fullName: string;
  lastName: string;
  firstName: string;
  middleName: string;
  extensionName: string;
}

export interface PersonEligibilityEvaluation {
  eligible: boolean;
  disqualified: boolean;
  inputName: string;
  normalizedFullName: string;
  parsedName: ParsedPersonName;
  reason: string;
  source?: "RESTRICTION_REGISTRY" | "CURRENT_PROGRAM_BENEFICIARY" | "CURRENT_PROGRAM_DEPENDENT" | "CLEAN";
  adlNo?: string;
  payoutDate?: string;
  workDurationDate?: string;
  eligibilityDate?: string;
  daysElapsed?: number;
  daysRemaining?: number;
  isAppointivePersonnel?: boolean;
  barangay?: string;
}

const SUFFIXES = new Set(["JR", "JR.", "SR", "SR.", "II", "III", "IV", "V"]);

export function parseEnteredFullName(raw: string): ParsedPersonName {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  if (!cleaned) {
    return { fullName: "", lastName: "", firstName: "", middleName: "", extensionName: "" };
  }

  if (cleaned.includes(",")) {
    const [lastPart, ...restParts] = cleaned.split(",");
    const lastName = lastPart.trim();
    const tokens = restParts.join(" ").trim().split(/\s+/).filter(Boolean);
    let extensionName = "";
    if (tokens.length > 1 && SUFFIXES.has(tokens[tokens.length - 1])) {
      extensionName = tokens.pop()!.replace(/\./g, "");
    }
    const firstName = tokens[0] || "";
    const middleName = tokens.slice(1).join(" ");
    const fullName = `${lastName}, ${[firstName, middleName, extensionName].filter(Boolean).join(" ")}`.trim();
    return { fullName, lastName, firstName, middleName, extensionName };
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { fullName: tokens[0], lastName: tokens[0], firstName: "", middleName: "", extensionName: "" };
  }
  let extensionName = "";
  if (tokens.length > 2 && SUFFIXES.has(tokens[tokens.length - 1])) {
    extensionName = tokens.pop()!.replace(/\./g, "");
  }
  const lastName = tokens[tokens.length - 1] || "";
  const firstName = tokens[0] || "";
  const middleName = tokens.slice(1, -1).join(" ");
  const fullName = `${lastName}, ${[firstName, middleName, extensionName].filter(Boolean).join(" ")}`.trim();
  return { fullName, lastName, firstName, middleName, extensionName };
}

function parsePayoutDateToTimestamp(payoutDateStr?: string | null): number {
  if (!payoutDateStr) return 0;
  const parsed = new Date(payoutDateStr);
  if (!isNaN(parsed.getTime())) return parsed.getTime();
  const clean = payoutDateStr.replace(/Sept\./i, "Sep").replace(/Aug\./i, "Aug");
  const p2 = new Date(clean);
  if (!isNaN(p2.getTime())) return p2.getTime();
  return 0;
}

export function normalizeBirthdayComparison(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = String(raw).trim().replace(/\//g, "-");
  const parts = clean.split("-");
  if (parts.length !== 3) return null;
  if (parts[0].length === 4) {
    // YYYY-MM-DD -> MM-DD-YYYY
    return `${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}-${parts[0]}`;
  }
  if (parts[2].length === 4) {
    return `${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[2]}`;
  }
  return null;
}

export function toIsoBirthday(raw?: string | null): string | null {
  const mmddyyyy = normalizeBirthdayComparison(raw);
  if (!mmddyyyy) return null;
  const [m, d, y] = mmddyyyy.split("-");
  return `${y}-${m}-${d}`;
}

export async function evaluatePersonTupadEligibility(params: {
  fullName: string;
  birthday?: string | null;
  programId?: string | null;
  excludeProgramBeneficiaryId?: string | null;
  roleLabel?: "APPLICANT" | "DEPENDENT";
}): Promise<PersonEligibilityEvaluation> {
  const parsed = parseEnteredFullName(params.fullName);
  const roleTitle = params.roleLabel === "DEPENDENT" ? "Dependent" : "Replacement Applicant";

  if (!parsed.lastName || !parsed.firstName) {
    return {
      eligible: false,
      disqualified: true,
      inputName: params.fullName,
      normalizedFullName: parsed.fullName,
      parsedName: parsed,
      reason: `Please enter the complete Full Name (First Name and Last Name) of the ${roleTitle}.`,
    };
  }

  const fName = parsed.firstName;
  const lName = parsed.lastName;
  const combinedTargetName = parsed.fullName;
  const invertedName = [parsed.firstName, parsed.middleName, parsed.lastName, parsed.extensionName]
    .filter(Boolean)
    .join(" ");

  // 1. Check BeneficiaryRestriction Registry (320-day lockout & Appointive Personnel)
  const restriction = await prisma.beneficiaryRestriction.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { beneficiary: { fullName: { contains: combinedTargetName, mode: "insensitive" } } },
        { beneficiary: { fullName: { contains: `${lName}, ${fName}`, mode: "insensitive" } } },
        { beneficiary: { fullName: { contains: `${fName} ${lName}`, mode: "insensitive" } } },
        {
          AND: [
            { beneficiary: { lastName: { equals: lName, mode: "insensitive" } } },
            { beneficiary: { firstName: { contains: fName, mode: "insensitive" } } },
          ],
        },
        { dependent: { fullName: { contains: combinedTargetName, mode: "insensitive" } } },
        { dependent: { fullName: { contains: `${lName}, ${fName}`, mode: "insensitive" } } },
        { dependent: { fullName: { contains: invertedName, mode: "insensitive" } } },
        {
          AND: [
            { dependent: { lastName: { equals: lName, mode: "insensitive" } } },
            { dependent: { firstName: { contains: fName, mode: "insensitive" } } },
          ],
        },
      ],
    },
    include: {
      beneficiary: true,
      dependent: true,
      sourceProgram: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const todayIso = now.toISOString().split("T")[0];

  if (restriction) {
    const payoutDateStr = restriction.payoutDate;
    const payoutTimestamp = parsePayoutDateToTimestamp(payoutDateStr);
    const isAppointive =
      restriction.isAppointivePersonnel ||
      Boolean(
        restriction.adlNo &&
          /BHW|TANOD|OFFICIAL|TREASURER|SECRETARY|COUNCIL|STAFF|APPOINTIVE|HEAD|MANAGER|DEPARTMENT|GOVERNMENT|GOOVERNMENT|MUNICIPAL|EMPLOYEE|PERSONNEL|LUPON|CAPTAIN|KAGAWAD|PESO/i.test(
            restriction.adlNo
          )
      );

    if (isAppointive) {
      return {
        eligible: false,
        disqualified: true,
        inputName: params.fullName,
        normalizedFullName: combinedTargetName,
        parsedName: parsed,
        source: "RESTRICTION_REGISTRY",
        isAppointivePersonnel: true,
        adlNo: restriction.adlNo || "Appointive Position",
        barangay: restriction.barangay || restriction.beneficiary?.barangay || "Dingalan",
        reason: `Not Eligible: Listed as Barangay / Municipal Appointive Personnel (${restriction.adlNo || "Appointive Position"}). Government officials and appointive personnel are disqualified under DOLE TUPAD guidelines.`,
      };
    }

    if (payoutTimestamp > 0) {
      const daysElapsed = Math.floor((now.getTime() - payoutTimestamp) / (1000 * 60 * 60 * 24));
      if (daysElapsed < 320) {
        const daysRemaining = 320 - daysElapsed;
        const eligibleDate = new Date(payoutTimestamp + 320 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return {
          eligible: false,
          disqualified: true,
          inputName: params.fullName,
          normalizedFullName: combinedTargetName,
          parsedName: parsed,
          source: "RESTRICTION_REGISTRY",
          payoutDate: payoutDateStr,
          workDurationDate: restriction.workDate || "10-Day Work Program",
          adlNo: restriction.adlNo || "Historical Batch",
          daysElapsed,
          daysRemaining,
          eligibilityDate: eligibleDate,
          barangay: restriction.barangay || restriction.beneficiary?.barangay || "Dingalan",
          reason: `Not Eligible: Previous TUPAD payout on ${payoutDateStr} (${daysElapsed} days ago). Mandatory 320-day lockout active until ${eligibleDate} (${daysRemaining} days remaining).`,
        };
      }
    } else if (!restriction.restrictionEnd || restriction.restrictionEnd >= todayIso) {
      return {
        eligible: false,
        disqualified: true,
        inputName: params.fullName,
        normalizedFullName: combinedTargetName,
        parsedName: parsed,
        source: "RESTRICTION_REGISTRY",
        payoutDate: payoutDateStr || "Recorded",
        eligibilityDate: restriction.restrictionEnd || "Active Lockout",
        adlNo: restriction.adlNo || "Restricted",
        reason: `Not Eligible: Active TUPAD restriction until ${restriction.restrictionEnd || "cleared"} (${restriction.reason}).`,
      };
    }
  }

  // 2. Check if already enrolled as an active Beneficiary or Dependent in the current program
  if (params.programId) {
    // If checking the APPLICANT, verify they are not the exact same person as the Original Beneficiary being replaced
    if (params.roleLabel === "APPLICANT" && params.excludeProgramBeneficiaryId) {
      const origPbBeingReplaced = await prisma.programBeneficiary.findUnique({
        where: { id: params.excludeProgramBeneficiaryId },
        include: { beneficiary: true },
      });
      if (origPbBeingReplaced) {
        const origParsed = parseEnteredFullName(origPbBeingReplaced.beneficiary.fullName);
        if (
          origParsed.fullName === combinedTargetName ||
          (origParsed.lastName === lName && origParsed.firstName === fName)
        ) {
          return {
            eligible: false,
            disqualified: true,
            inputName: params.fullName,
            normalizedFullName: combinedTargetName,
            parsedName: parsed,
            source: "CURRENT_PROGRAM_BENEFICIARY",
            barangay: origPbBeingReplaced.beneficiary.barangay || "Dingalan",
            reason: `Not Eligible: Replacement Applicant cannot be the same person as the Original Beneficiary being replaced (${origPbBeingReplaced.beneficiary.fullName}).`,
          };
        }
      }
    }

    // Note: When roleLabel === "DEPENDENT", excludeProgramBeneficiaryId is excluded so the Original Beneficiary
    // being replaced (e.g. spouse/immediate family member) IS allowed to be declared as Dependent of the replacement!
    const existingActivePb = await prisma.programBeneficiary.findFirst({
      where: {
        programId: params.programId,
        participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] },
        ...(params.excludeProgramBeneficiaryId ? { id: { not: params.excludeProgramBeneficiaryId } } : {}),
        OR: [
          { beneficiary: { fullName: { equals: combinedTargetName, mode: "insensitive" } } },
          { beneficiary: { fullName: { equals: invertedName, mode: "insensitive" } } },
          {
            AND: [
              { beneficiary: { lastName: { equals: lName, mode: "insensitive" } } },
              { beneficiary: { firstName: { equals: fName, mode: "insensitive" } } },
            ],
          },
        ],
      },
      include: { beneficiary: true },
    });

    if (existingActivePb) {
      return {
        eligible: false,
        disqualified: true,
        inputName: params.fullName,
        normalizedFullName: combinedTargetName,
        parsedName: parsed,
        source: "CURRENT_PROGRAM_BENEFICIARY",
        barangay: existingActivePb.beneficiary.barangay || "Dingalan",
        reason: `Not Eligible: ${existingActivePb.beneficiary.fullName} is already an active enrolled beneficiary in this TUPAD program (Slot #${existingActivePb.designatedNumber}).`,
      };
    }

    const existingActiveDependent = await prisma.dependent.findFirst({
      where: {
        OR: [
          { fullName: { equals: combinedTargetName, mode: "insensitive" } },
          { fullName: { equals: invertedName, mode: "insensitive" } },
          {
            AND: [
              { lastName: { equals: lName, mode: "insensitive" } },
              { firstName: { equals: fName, mode: "insensitive" } },
            ],
          },
        ],
        beneficiary: {
          programBeneficiaries: {
            some: {
              programId: params.programId,
              participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] },
              ...(params.excludeProgramBeneficiaryId ? { id: { not: params.excludeProgramBeneficiaryId } } : {}),
            },
          },
        },
      },
      include: {
        beneficiary: {
          include: {
            programBeneficiaries: {
              where: {
                programId: params.programId,
                participationStatus: { in: ["ACTIVE", "ENROLLED", "FLAGGED_FOR_REPLACEMENT"] },
                ...(params.excludeProgramBeneficiaryId ? { id: { not: params.excludeProgramBeneficiaryId } } : {}),
              },
              take: 1,
            },
          },
        },
      },
    });

    if (existingActiveDependent) {
      const parentPb = existingActiveDependent.beneficiary.programBeneficiaries[0];
      return {
        eligible: false,
        disqualified: true,
        inputName: params.fullName,
        normalizedFullName: combinedTargetName,
        parsedName: parsed,
        source: "CURRENT_PROGRAM_DEPENDENT",
        reason: `Not Eligible: Already registered as a dependent of active Beneficiary #${parentPb?.designatedNumber || "?"} (${existingActiveDependent.beneficiary.fullName}) in this program.`,
      };
    }

    // Check if the Dependent is the Original Beneficiary being replaced, to show a helpful confirmation note
    if (params.roleLabel === "DEPENDENT" && params.excludeProgramBeneficiaryId) {
      const origPbBeingReplaced = await prisma.programBeneficiary.findUnique({
        where: { id: params.excludeProgramBeneficiaryId },
        include: { beneficiary: true },
      });
      if (origPbBeingReplaced) {
        const origParsed = parseEnteredFullName(origPbBeingReplaced.beneficiary.fullName);
        if (
          origParsed.fullName === combinedTargetName ||
          (origParsed.lastName === lName && origParsed.firstName === fName)
        ) {
          return {
            eligible: true,
            disqualified: false,
            inputName: params.fullName,
            normalizedFullName: combinedTargetName,
            parsedName: parsed,
            source: "CLEAN",
            reason: `Qualified (Original Beneficiary as Dependent): ${origPbBeingReplaced.beneficiary.fullName} is the original beneficiary of Slot #${origPbBeingReplaced.designatedNumber} and is eligible to be declared as the Dependent of their replacement family member.`,
          };
        }
      }
    }
  }

  return {
    eligible: true,
    disqualified: false,
    inputName: params.fullName,
    normalizedFullName: combinedTargetName,
    parsedName: parsed,
    source: "CLEAN",
    reason: `Qualified: No active 320-day payout lockout, appointive restriction, or duplicate enrollment found for ${combinedTargetName}.`,
  };
}

