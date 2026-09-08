/**
 * PESO Dingalan - TUPAD Work Area Assignment & Proximity Allocation Engine
 *
 * Intelligently maps beneficiaries to their designated work area and specific activity
 * based on the 10-day Work Program Schedule, home address / Purok / Sitio proximity,
 * and gender / SC-PWD quotas.
 */

export interface WorkProgramItemAllocation {
  id: string;
  dayNumber: number;
  specificActivities: string;
  area: string;
  maleCount: number;
  femaleCount: number;
  scPwdMaleCount: number;
  scPwdFemaleCount: number;
  totalCount: number;
}

export interface BeneficiaryAllocationInput {
  id: string;
  designatedNumber: string;
  fullName: string;
  sex?: string | null;
  sitio?: string | null;
  barangay?: string | null;
  isSenior?: boolean;
  isPwd?: boolean;
}

export interface AssignmentResult {
  assignedItem: WorkProgramItemAllocation | null;
  area: string;
  specificActivity: string;
  dayNumber: number;
  proximityScore: number;
  matchingRationale: string;
  allocationMethod: "EXACT_PUROK" | "PROXIMITY_PUROK" | "GENDER_BALANCED" | "DEFAULT_CENTRAL";
}

/**
 * Extracts normalized purok numbers or tokens from a string.
 * Example: "Purok 2" -> [2], "Purok 1 to Purok 3" -> [1, 2, 3], "Sitio Maligaya" -> ["maligaya"]
 */
export function extractAddressTokens(addressStr: string = ""): {
  numbers: number[];
  words: string[];
} {
  const clean = (addressStr || "").toLowerCase();

  // Extract pure numbers
  const numberMatches = clean.match(/\b\d+\b/g);
  const numbers: number[] = numberMatches ? numberMatches.map((n) => parseInt(n, 10)) : [];

  // Check for range patterns like "1 to 3" or "1-3" or "1 to purok 3"
  const rangeMatch = clean.match(/purok\s*(\d+)\s*(?:to|-)\s*(?:purok\s*)?(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && start <= end && end - start <= 10) {
      for (let i = start; i <= end; i++) {
        if (!numbers.includes(i)) numbers.push(i);
      }
    }
  }

  // Extract meaningful words (filtering out common filler words)
  const stopWords = new Set(["purok", "sitio", "brgy", "barangay", "street", "st", "zone", "and", "to", "the", "near", "front", "road"]);
  const words = clean
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w) && isNaN(Number(w)));

  return { numbers, words };
}

/**
 * Calculates proximity match score between a beneficiary's address and a work area description.
 * Range: 0 to 100
 */
export function calculateProximityScore(
  beneficiarySitio: string = "",
  workArea: string = ""
): { score: number; rationale: string; isPurokMatch: boolean } {
  if (!beneficiarySitio || !workArea) {
    return { score: 10, rationale: "Default central barangay allocation", isPurokMatch: false };
  }

  const beneTokens = extractAddressTokens(beneficiarySitio);
  const areaTokens = extractAddressTokens(workArea);

  // Check exact purok number intersection
  if (beneTokens.numbers.length > 0 && areaTokens.numbers.length > 0) {
    const commonNumbers = beneTokens.numbers.filter((n) => areaTokens.numbers.includes(n));
    if (commonNumbers.length > 0) {
      return {
        score: 95,
        rationale: `Exact Purok match (Purok ${commonNumbers.join(", ")}) in ${workArea}`,
        isPurokMatch: true,
      };
    }

    // Check adjacent purok distance
    let minDistance = 999;
    for (const bNum of beneTokens.numbers) {
      for (const aNum of areaTokens.numbers) {
        const dist = Math.abs(bNum - aNum);
        if (dist < minDistance) minDistance = dist;
      }
    }

    if (minDistance === 1) {
      return {
        score: 80,
        rationale: `Adjacent neighboring Purok distance (±1 Purok) to ${workArea}`,
        isPurokMatch: true,
      };
    } else if (minDistance === 2) {
      return {
        score: 65,
        rationale: `Nearby Purok sector (±2 Puroks) to ${workArea}`,
        isPurokMatch: true,
      };
    }
  }

  // Check text keyword / Sitio name overlap
  if (beneTokens.words.length > 0 && areaTokens.words.length > 0) {
    const commonWords = beneTokens.words.filter((w) => areaTokens.words.includes(w));
    if (commonWords.length > 0) {
      return {
        score: 90,
        rationale: `Direct Sitio match (${commonWords.join(", ")}) in ${workArea}`,
        isPurokMatch: true,
      };
    }
  }

  // Fallback substring check
  const beneLower = beneficiarySitio.toLowerCase().trim();
  const areaLower = workArea.toLowerCase().trim();
  if (areaLower.includes(beneLower) || beneLower.includes(areaLower)) {
    return {
      score: 85,
      rationale: `Address segment matched within work area`,
      isPurokMatch: true,
    };
  }

  return {
    score: 25,
    rationale: `General Barangay sector allocation`,
    isPurokMatch: false,
  };
}

/**
 * Assigns a beneficiary to the most appropriate Work Program Item for a given Day,
 * taking into account:
 * 1. Proximity to home Purok/Sitio
 * 2. Gender quota capacity (Male / Female)
 * 3. Special priority for SC / PWD beneficiaries
 * 4. Overall work area capacity
 */
export function assignBeneficiaryWorkArea(
  beneficiary: BeneficiaryAllocationInput,
  dayItems: WorkProgramItemAllocation[],
  dayNumber: number,
  currentlyAssignedCounts: Record<string, { male: number; female: number; scPwd: number; total: number }> = {}
): AssignmentResult {
  if (!dayItems || dayItems.length === 0) {
    return {
      assignedItem: null,
      area: "General Barangay Public Sector",
      specificActivity: "Community Environmental Cleaning & Greening",
      dayNumber,
      proximityScore: 0,
      matchingRationale: "No customized work program items defined for this day. Using general barangay sector.",
      allocationMethod: "DEFAULT_CENTRAL",
    };
  }

  const isMale = (beneficiary.sex || "").toUpperCase() === "MALE";
  const isScOrPwd = Boolean(beneficiary.isSenior || beneficiary.isPwd);
  const beneSitio = beneficiary.sitio || "";

  // Evaluate each work item
  const scoredItems = dayItems.map((item) => {
    const { score, rationale, isPurokMatch } = calculateProximityScore(beneSitio, item.area);
    const counts = currentlyAssignedCounts[item.id] || { male: 0, female: 0, scPwd: 0, total: 0 };

    // Capacity checks
    const maleQuota = item.maleCount || Math.ceil(item.totalCount / 2);
    const femaleQuota = item.femaleCount || Math.floor(item.totalCount / 2);
    const hasMaleSlot = isMale ? counts.male < maleQuota || maleQuota === 0 : true;
    const hasFemaleSlot = !isMale ? counts.female < femaleQuota || femaleQuota === 0 : true;
    const hasGenderSlot = isMale ? hasMaleSlot : hasFemaleSlot;
    const isUnderTotalCap = item.totalCount === 0 || counts.total < item.totalCount;

    // SC/PWD bonus for accessible/light activities
    let vulnerabilityScoreBonus = 0;
    if (isScOrPwd) {
      const lowerAct = item.specificActivities.toLowerCase();
      if (
        lowerAct.includes("seedling") ||
        lowerAct.includes("greening") ||
        lowerAct.includes("sorting") ||
        lowerAct.includes("hall") ||
        lowerAct.includes("center") ||
        item.scPwdMaleCount > 0 ||
        item.scPwdFemaleCount > 0
      ) {
        vulnerabilityScoreBonus = 15;
      }
    }

    const effectiveScore = score + vulnerabilityScoreBonus + (hasGenderSlot ? 10 : 0);

    return {
      item,
      score,
      effectiveScore,
      rationale,
      isPurokMatch,
      hasGenderSlot,
      isUnderTotalCap,
    };
  });

  // Sort candidates:
  // 1. Has gender slot & under cap first
  // 2. Highest effective score
  scoredItems.sort((a, b) => {
    if (a.hasGenderSlot !== b.hasGenderSlot) return a.hasGenderSlot ? -1 : 1;
    if (a.isUnderTotalCap !== b.isUnderTotalCap) return a.isUnderTotalCap ? -1 : 1;
    return b.effectiveScore - a.effectiveScore;
  });

  const bestMatch = scoredItems[0];
  const targetItem = bestMatch.item;

  let method: AssignmentResult["allocationMethod"] = "DEFAULT_CENTRAL";
  if (bestMatch.isPurokMatch && bestMatch.score >= 90) {
    method = "EXACT_PUROK";
  } else if (bestMatch.isPurokMatch) {
    method = "PROXIMITY_PUROK";
  } else if (bestMatch.hasGenderSlot) {
    method = "GENDER_BALANCED";
  }

  let rationale = bestMatch.rationale;
  if (isScOrPwd) {
    rationale += ` • Prioritized accessible sector for Senior Citizen / PWD beneficiary`;
  }
  if (bestMatch.hasGenderSlot) {
    rationale += ` • Balanced with ${isMale ? "Male" : "Female"} quota allocation`;
  }

  return {
    assignedItem: targetItem,
    area: targetItem.area,
    specificActivity: targetItem.specificActivities,
    dayNumber: targetItem.dayNumber || dayNumber,
    proximityScore: bestMatch.score,
    matchingRationale: rationale,
    allocationMethod: method,
  };
}
