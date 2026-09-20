/**
 * Dingalan Official Purok and Sitio Groupings for TUPAD Work Program Deployment
 * Reference: Clean, Canonical Uploaded Purok/Sitio Data from Final Beneficiaries Masterlist
 */

export interface PurokSitioGroupDefinition {
  groupName: string;
  groupLabel: string;
  designatedMainArea: string;
  specificActivity?: string;
  purokSitios: string[];
}

export interface BarangayGroupingConfig {
  barangay: string;
  groups: PurokSitioGroupDefinition[];
}

export const DINGALAN_BARANGAY_GROUPINGS: Record<string, BarangayGroupingConfig> = {
  APLAYA: {
    barangay: "Aplaya",
    groups: [
      {
        groupName: "APLAYA GROUP 1",
        groupLabel: "Aplaya Group 1",
        designatedMainArea: "Purok Lapu-Lapu, Maya-Maya & Tanigue",
        purokSitios: ["Lapu-Lapu", "Maya-Maya", "Tanigue"],
      },
    ],
  },
  "BUTAS NA BATO": {
    barangay: "Butas na Bato",
    groups: [
      {
        groupName: "BNB GROUP 1",
        groupLabel: "BNB Group 1",
        designatedMainArea: "Purok 1, 2, 3 & 4 (All Puroks)",
        purokSitios: ["Purok 1", "Purok 2", "Purok 3", "Purok 4"],
      },
    ],
  },
  DAVILDAVILAN: {
    barangay: "Davildavilan",
    groups: [
      {
        groupName: "DAVILDAVILAN GROUP 1",
        groupLabel: "Davildavilan Group 1",
        designatedMainArea: "Purok 1, 2, 3, 5 & 6",
        purokSitios: ["Purok 1", "Purok 2", "Purok 3", "Purok 5", "Purok 6"],
      },
    ],
  },
  CARAGSACAN: {
    barangay: "Caragsacan",
    groups: [
      {
        groupName: "CARAGSACAN GROUP 1",
        groupLabel: "Caragsacan Group 1",
        designatedMainArea: "Purok 1 (Phase 1 & Phase 2)",
        purokSitios: ["Purok 1", "Purok 1 Phase 1", "Purok 1 Phase 2"],
      },
      {
        groupName: "CARAGSACAN GROUP 2",
        groupLabel: "Caragsacan Group 2",
        designatedMainArea: "Purok 2, 3 & 4",
        purokSitios: ["Purok 2", "Purok 3", "Purok 4"],
      },
      {
        groupName: "CARAGSACAN GROUP 3",
        groupLabel: "Caragsacan Group 3",
        designatedMainArea: "Purok 5 (Kailyo, EVNAI, Horseshoe, GK & ADRA) & Purok 6",
        purokSitios: [
          "Purok 5",
          "Purok 5 ADRA",
          "Purok 5 EVNAI",
          "Purok 5 Gawad Kalinga",
          "Purok 5 Horseshoe",
          "Purok 5 Kailyo",
          "Purok 6",
        ],
      },
    ],
  },
  IBONA: {
    barangay: "Ibona",
    groups: [
      {
        groupName: "IBONA GROUP 1",
        groupLabel: "Ibona Group 1",
        designatedMainArea: "Purok 1, 2, 3, 7 & Camiling",
        purokSitios: ["Camiling", "Purok 1", "Purok 2", "Purok 3", "Purok 7"],
      },
      {
        groupName: "IBONA GROUP 2",
        groupLabel: "Ibona Group 2",
        designatedMainArea: "Purok 4, 5, 6 & Abungan",
        purokSitios: ["Abungan", "Purok 4", "Purok 5", "Purok 6"],
      },
    ],
  },
  MATAWE: {
    barangay: "Matawe",
    groups: [
      {
        groupName: "MATAWE GROUP 1",
        groupLabel: "Matawe Group 1",
        designatedMainArea: "Purok 2, 3, 4 & 5",
        purokSitios: ["Purok 2", "Purok 3", "Purok 4", "Purok 5"],
      },
      {
        groupName: "MATAWE GROUP 2",
        groupLabel: "Matawe Group 2",
        designatedMainArea: "Purok 6, 6B & 7",
        purokSitios: ["Purok 6", "Purok 6B", "Purok 7"],
      },
    ],
  },
  TANAWAN: {
    barangay: "Tanawan",
    groups: [
      {
        groupName: "TANAWAN GROUP 1",
        groupLabel: "Tanawan Group 1",
        designatedMainArea: "Purok 1, 2 & 3",
        purokSitios: ["Purok 1", "Purok 2", "Purok 3"],
      },
    ],
  },
  POBLACION: {
    barangay: "Poblacion",
    groups: [
      {
        groupName: "POBLACION GROUP 1",
        groupLabel: "Poblacion Group 1",
        designatedMainArea: "Market Site, Purok 1, 2, 3, 4 & 5",
        purokSitios: ["Market Site", "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5"],
      },
    ],
  },
  PALTIC: {
    barangay: "Paltic",
    groups: [
      {
        groupName: "PALTIC GROUP 1",
        groupLabel: "Paltic Group 1",
        designatedMainArea: "Purok Kamagong, Mahogany & Narra",
        purokSitios: ["Kamagong", "Mahogany", "Narra"],
      },
      {
        groupName: "PALTIC GROUP 2",
        groupLabel: "Paltic Group 2",
        designatedMainArea: "Purok Almaciga, Yakal 1 & Yakal 2",
        purokSitios: ["Almaciga", "Yakal 1", "Yakal 2"],
      },
      {
        groupName: "PALTIC GROUP 3",
        groupLabel: "Paltic Group 3",
        designatedMainArea: "Purok Ipil-Ipil & Mulawin",
        purokSitios: ["Ipil-Ipil", "Mulawin"],
      },
    ],
  },
  UMIRAY: {
    barangay: "Umiray",
    groups: [
      {
        groupName: "UMIRAY GROUP 1",
        groupLabel: "Umiray Group 1",
        designatedMainArea: "Sitio Singawan (Covering Singawan, Pinamaypayan & Dugyan)",
        purokSitios: ["Dugyan", "Pinamaypayan", "Singawan"],
      },
      {
        groupName: "UMIRAY GROUP 2",
        groupLabel: "Umiray Group 2",
        designatedMainArea: "Sitio Sabang & Malakawayan (Covering Sabang, Malacauayan & Limbok)",
        purokSitios: ["Limbok", "Malacauayan", "Sabang"],
      },
      {
        groupName: "UMIRAY GROUP 3",
        groupLabel: "Umiray Group 3",
        designatedMainArea: "Sitio Malamig & Iyapit (Covering Malamig, Iyapit, Bakahan & Tabi)",
        purokSitios: ["Bakahan", "Iyapit", "Malamig", "Tabi"],
      },
      {
        groupName: "UMIRAY GROUP 4",
        groupLabel: "Umiray Group 4",
        designatedMainArea: "Sitio Bacong & Market Site (Covering Ferry, Bacong, Market Site & Kamandag)",
        purokSitios: ["Bacong", "Ferry", "Kamandag", "Market Site"],
      },
    ],
  },
  DIKAPANIKIAN: {
    barangay: "Dikapanikian",
    groups: [
      {
        groupName: "DIKAPANIKIAN GROUP 1",
        groupLabel: "Dikapanikian Group 1",
        designatedMainArea: "Sentro, Saint Paul 1 & 2, Pundongan, Sagingan & Core Housing",
        purokSitios: ["Core Housing", "Pundongan", "Sagingan", "Saint Paul 1", "Saint Paul 2", "Sentro"],
      },
    ],
  },
};

/**
 * Normalizes Barangay Name to standard capital key
 */
export function getBarangayKey(rawBarangay: string): string {
  if (!rawBarangay) return "PALTIC";
  const clean = rawBarangay.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ");
  if (clean.includes("BUTAS") || clean === "BNB") return "BUTAS NA BATO";
  if (clean.includes("APLAYA")) return "APLAYA";
  if (clean.includes("CARAGSACAN")) return "CARAGSACAN";
  if (clean.includes("DAVILDAVILAN")) return "DAVILDAVILAN";
  if (clean.includes("DIKAPANIKIAN") || clean.includes("DIKA")) return "DIKAPANIKIAN";
  if (clean.includes("IBONA")) return "IBONA";
  if (clean.includes("MATAWE")) return "MATAWE";
  if (clean.includes("PALTIC")) return "PALTIC";
  if (clean.includes("POBLACION")) return "POBLACION";
  if (clean.includes("TANAWAN")) return "TANAWAN";
  if (clean.includes("UMIRAY")) return "UMIRAY";
  return clean;
}

/**
 * Returns clean standard title-cased barangay name
 */
export function getStandardBarangayName(rawBarangay: string): string {
  const key = getBarangayKey(rawBarangay);
  const cfg = DINGALAN_BARANGAY_GROUPINGS[key];
  return cfg ? cfg.barangay : rawBarangay.trim();
}

/**
 * Normalizes Purok/Sitio strings for reliable matching against uploaded names
 */
export function normalizeSitioString(str: string): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/^purok\s*/i, "")
    .replace(/^sitio\s*/i, "")
    .replace(/^so\s*/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Match a beneficiary's Sitio / Purok / Address to their official Barangay Group
 * Uses normalized clean matching against uploaded names
 */
export function classifyBeneficiaryGroup(
  rawBarangay: string,
  rawSitioOrAddress: string
): {
  groupName: string;
  groupLabel: string;
  designatedMainArea: string;
  matchedPurokSitio: string;
} {
  const bKey = getBarangayKey(rawBarangay);
  const config = DINGALAN_BARANGAY_GROUPINGS[bKey];

  const defaultGroup = config?.groups[0] || {
    groupName: `${getStandardBarangayName(rawBarangay).toUpperCase()} GROUP 1`,
    groupLabel: `${getStandardBarangayName(rawBarangay)} Group 1`,
    designatedMainArea: "Community Clean-up & Maintenance Area",
    purokSitios: [],
  };

  if (!rawSitioOrAddress || !config) {
    return {
      groupName: defaultGroup.groupName,
      groupLabel: defaultGroup.groupLabel,
      designatedMainArea: defaultGroup.designatedMainArea,
      matchedPurokSitio: rawSitioOrAddress || "General Area",
    };
  }

  const cleanAddr = normalizeSitioString(rawSitioOrAddress);

  // 1. Direct and normalized matching across defined groups
  for (const group of config.groups) {
    for (const ps of group.purokSitios) {
      const cleanPs = normalizeSitioString(ps);
      if (
        cleanAddr === cleanPs ||
        cleanAddr.includes(cleanPs) ||
        cleanPs.includes(cleanAddr)
      ) {
        return {
          groupName: group.groupName,
          groupLabel: group.groupLabel,
          designatedMainArea: group.designatedMainArea,
          matchedPurokSitio: ps,
        };
      }
    }
  }

  // 2. Fallback to Group 1
  return {
    groupName: defaultGroup.groupName,
    groupLabel: defaultGroup.groupLabel,
    designatedMainArea: defaultGroup.designatedMainArea,
    matchedPurokSitio: rawSitioOrAddress,
  };
}

/**
 * Computes detailed demographic breakdown of beneficiaries in a group
 */
export function computeGroupDemographics(beneficiaries: any[]) {
  let maleCount = 0;
  let femaleCount = 0;
  let scPwdMaleCount = 0;
  let scPwdFemaleCount = 0;
  let isSeniorCount = 0;
  let isPwdCount = 0;
  let isIpCount = 0;
  let is4PsCount = 0;

  for (const item of beneficiaries) {
    const b = item.beneficiary || item;
    const sex = String(b.sex || "").trim().toUpperCase();
    const isMale = sex.startsWith("M");
    const isFemale = sex.startsWith("F");

    const age = parseInt(String(b.age || 0), 10);
    const isSenior = (age && age >= 60) || Boolean(b.isSenior);
    const isPwd = Boolean(b.isPwd);
    const isIp = Boolean(b.isIp);
    const is4Ps = Boolean(b.is4Ps);

    if (isMale) {
      maleCount++;
      if (isSenior || isPwd) scPwdMaleCount++;
    } else {
      femaleCount++;
      if (isSenior || isPwd) scPwdFemaleCount++;
    }

    if (isSenior) isSeniorCount++;
    if (isPwd) isPwdCount++;
    if (isIp) isIpCount++;
    if (is4Ps) is4PsCount++;
  }

  return {
    totalCount: beneficiaries.length,
    maleCount,
    femaleCount,
    scPwdMaleCount,
    scPwdFemaleCount,
    isSeniorCount,
    isPwdCount,
    isIpCount,
    is4PsCount,
  };
}
