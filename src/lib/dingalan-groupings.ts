/**
 * Dingalan Official Purok and Sitio Groupings for TUPAD Work Program Deployment
 * Reference: Official Dingalan Municipal Deployment Grouping Matrix
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
        purokSitios: ["PUROK LAPU LAPU", "PUROK MAYA-MAYA", "PUROK TANIGUE", "LAPU LAPU", "LAPU-LAPU", "MAYA MAYA", "MAYA-MAYA", "TANIGUE", "TANGIGUE", "TANGGUE", "PUROK 1"],
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
        purokSitios: ["PUROK 1", "PUROK 2", "PUROK 3", "PUROK 4", "1", "2", "3", "4"],
      },
    ],
  },
  DAVILDAVILAN: {
    barangay: "Davildavilan",
    groups: [
      {
        groupName: "DAVILDAVILAN GROUP 1",
        groupLabel: "Davildavilan Group 1",
        designatedMainArea: "Purok 1 to 6 & Angara / Ilang-Ilang St.",
        purokSitios: [
          "PUROK 1", "PUROK 2", "PUROK 3", "PUROK 4", "PUROK 5", "PUROK 6",
          "1", "2", "3", "4", "5", "6", "ANGARA ST.", "ANGARA STREET", "ILANG-ILANG STREET", "ILANG ILANG"
        ],
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
        purokSitios: ["PUROK 1 PHASE 1", "PUROK 1 PHASE 2", "PUROK 1", "PHASE 1", "PHASE 2", "UNO"],
      },
      {
        groupName: "CARAGSACAN GROUP 2",
        groupLabel: "Caragsacan Group 2",
        designatedMainArea: "Purok 2, 3 & 4",
        purokSitios: ["PUROK 2", "PUROK 3", "PUROK 4", "2", "3", "4"],
      },
      {
        groupName: "CARAGSACAN GROUP 3",
        groupLabel: "Caragsacan Group 3",
        designatedMainArea: "Purok 5 (Kailyo, EVNAI, Horseshoe, GK & ADRA)",
        purokSitios: [
          "PUROK 5 KAILYO", "PUROK 5 EVNAI", "PUROK 5 HORSEO", "PUROK 5 HORSHOE", "PUROK 5 HORSESHOE",
          "PUROK 5 GK", "PUROK 5 GAWAD KALINGA", "PUROK 5 KALINGA", "PUROK 5 ADRA", "PUROK 5", "KAILYO", "EVNAI", "ADRA", "GAWAD KALINGA"
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
        designatedMainArea: "Purok 1, 2A, 2B, 3A, 3B, 3C & Purok 7 Setic",
        purokSitios: [
          "PUROK 1", "PUROK 2", "PUROK 2A", "PUROK 2B", "PUROK 3", "PUROK 3A", "PUROK 3B", "PUROK 3C",
          "PUROK 7 SETIC", "PUROK 7", "SETIC", "CAMILING"
        ],
      },
      {
        groupName: "IBONA GROUP 2",
        groupLabel: "Ibona Group 2",
        designatedMainArea: "Purok 4, 5, 6 (Aves & Abungan) & Labuyo",
        purokSitios: [
          "PUROK 4", "PUROK 5", "PUROK 6 AVES", "PUROK 6 ABUNGAN", "PUROK 6", "AVES", "ABUNGAN", "LABUYO"
        ],
      },
    ],
  },
  MATAWE: {
    barangay: "Matawe",
    groups: [
      {
        groupName: "MATAWE GROUP 1",
        groupLabel: "Matawe Group 1",
        designatedMainArea: "Purok 1, 2, 3, 4 & 5",
        purokSitios: ["PUROK 1", "PUROK 2", "PUROK 3", "PUROK 4", "PUROK 5", "1", "2", "3", "4", "5"],
      },
      {
        groupName: "MATAWE GROUP 2",
        groupLabel: "Matawe Group 2",
        designatedMainArea: "Purok 6A, 6B, Bughaw & Purok 7",
        purokSitios: [
          "PUROK 6", "PUROK 6A", "PUROK 6B", "BUGHAW", "PUROK 7", "6A", "6B", "7"
        ],
      },
    ],
  },
  TANAWAN: {
    barangay: "Tanawan",
    groups: [
      {
        groupName: "TANAWAN GROUP 1",
        groupLabel: "Tanawan Group 1",
        designatedMainArea: "Purok 1, 2, 3 & Barangay Site",
        purokSitios: ["PUROK 1", "PUROK 2", "PUROK 3", "BRGY SITE", "BARANGAY SITE", "1", "2", "3"],
      },
    ],
  },
  POBLACION: {
    barangay: "Poblacion",
    groups: [
      {
        groupName: "POBLACION GROUP 1",
        groupLabel: "Poblacion Group 1",
        designatedMainArea: "Purok 1, 2, 3, 4 & 5 (Market Site)",
        purokSitios: ["PUROK 1", "PUROK 2", "PUROK 3", "PUROK 4", "PUROK 5", "MARKET SITE", "1", "2", "3", "4", "5"],
      },
    ],
  },
  PALTIC: {
    barangay: "Paltic",
    groups: [
      {
        groupName: "PALTIC GROUP 1",
        groupLabel: "Paltic Group 1",
        designatedMainArea: "Purok Mahogany, Narra & Kamagong",
        purokSitios: [
          "PUROK MAHOGANY", "MAHOGANY", "PUROK MAHAGONY", "MAHAGONY",
          "PUROK NARRA", "NARRA",
          "PUROK KAMAGONG", "KAMAGONG"
        ],
      },
      {
        groupName: "PALTIC GROUP 2",
        groupLabel: "Paltic Group 2",
        designatedMainArea: "Purok Almaciga, Yakal 1 & Yakal 2",
        purokSitios: [
          "PUROK ALMACIGA", "ALMACIGA", "PUROK ALMASIGA", "ALMASIGA",
          "PUROK YAKAL 1", "YAKAL 1", "PUROK YAKAL 2", "YAKAL 2", "YAKAL2", "YAKAL"
        ],
      },
      {
        groupName: "PALTIC GROUP 3",
        groupLabel: "Paltic Group 3",
        designatedMainArea: "Purok Ipil-Ipil & Mulawin",
        purokSitios: [
          "PUROK IPIL-IPIL", "IPIL-IPIL", "PUROK IPIL IPIL", "IPIL IPIL", "IPIP IPIL",
          "PUROK MULAWIN", "MULAWIN"
        ],
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
        purokSitios: [
          "SITIO SINGAWAN", "SINGAWAN", "SO SINGAWAN",
          "SITIO PINAMAYPAYAN", "PINAMAYPAYAN", "SO PINAMAYPAYAN",
          "SITIO DUGYAN", "DUGYAN", "SO DUGYAN"
        ],
      },
      {
        groupName: "UMIRAY GROUP 2",
        groupLabel: "Umiray Group 2",
        designatedMainArea: "Sitio Sabang & Malakawayan (Covering Sumalag, Sabang, Malakawayan, Limbok & School Site)",
        purokSitios: [
          "SITIO SUMALAG", "SUMALAG", "SO SUMALAG",
          "SITIO SABANG", "SABANG", "SO SABANG",
          "SITIO MALAKAWAYAN", "MALAKAWAYAN", "MALACAUAYAN", "MALACAUYAN", "SO MALACAUAYAN",
          "SITIO LIMBOK", "LIMBOK", "SO LIMBOK",
          "SITIO SCHOOL SITE", "SCHOOL SITE"
        ],
      },
      {
        groupName: "UMIRAY GROUP 3",
        groupLabel: "Umiray Group 3",
        designatedMainArea: "Sitio Malamig & Iyapit (Covering Malamig, Iyapit, Bakahan & Tabi)",
        purokSitios: [
          "SITIO MALAMIG", "MALAMIG", "SO MALAMIG",
          "SITIO IYAPIT", "IYAPIT", "SO IYAPIT",
          "SITIO BAKAHAN", "BAKAHAN", "SO BAKAHAN",
          "SITIO TABI", "TABI", "SO TABI"
        ],
      },
      {
        groupName: "UMIRAY GROUP 4",
        groupLabel: "Umiray Group 4",
        designatedMainArea: "Sitio Bacong & Market Site (Covering Ferry, Bacong Hi-Way, Bacong Looban, Market Site & Kamandag)",
        purokSitios: [
          "SITIO FERRY", "FERRY", "SO FERRY",
          "SITIO BACONG HI-WAY", "SITIO BACONG LOOBAN", "SITIO BACONG", "BACONG", "SO BACONG", "SO.BACONG", "SO BACOONG", "BACONG UMIRAY",
          "SITIO MARKET SITE", "MARKET SITE", "SO MARKET SITE", "PALENGKE UMIRAY",
          "SITIO KAMANDAG", "KAMANDAG", "SO KAMANDAG", "PUROK 6", "PUROK 2"
        ],
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
        purokSitios: [
          "PUROK 1 PHASE 1", "PUROK 1PHASE 1", "PUROK 1", "PUROK 2",
          "SENTRO", "CENTRO", "SAINT PAUL 1", "SAINT PAUL 2",
          "PUROK PUNDONGAN", "PUROK SAGINGAN", "SAGINGAN", "CORE HOUSING"
        ],
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
 * Match a beneficiary's Sitio / Purok / Address to their official Barangay Group
 * Uses fuzzy matching and aliases for nearest spellings
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

  const cleanAddr = rawSitioOrAddress
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ");

  // 1. Direct and Substring matching across defined groups
  for (const group of config.groups) {
    for (const ps of group.purokSitios) {
      const cleanPs = ps.toUpperCase();
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

  // 2. Token-based word match (handles "SO DUGYAN" vs "DUGYAN", "PUROK ALMACIGA" vs "ALMACIGA")
  const addrWords = cleanAddr.split(" ").filter((w) => w.length > 2 && w !== "PUROK" && w !== "SITIO");
  if (addrWords.length > 0) {
    for (const group of config.groups) {
      for (const ps of group.purokSitios) {
        const psWords = ps.toUpperCase().split(" ").filter((w) => w.length > 2 && w !== "PUROK" && w !== "SITIO");
        const hasOverlap = addrWords.some((aw) => psWords.includes(aw));
        if (hasOverlap) {
          return {
            groupName: group.groupName,
            groupLabel: group.groupLabel,
            designatedMainArea: group.designatedMainArea,
            matchedPurokSitio: ps,
          };
        }
      }
    }
  }

  // 3. Fallback to Group 1
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
