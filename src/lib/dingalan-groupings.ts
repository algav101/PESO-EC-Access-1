/**
 * Dingalan Official Purok and Sitio Groupings for TUPAD Work Program Deployment
 * Reference: Clean, Canonical Uploaded Purok/Sitio Data from Final Beneficiaries Masterlist
 */

export interface SubGroupScheduleConfig {
  id?: string;
  subGroupName: string;
  subGroupLabel: string;
  designatedArea: string;
  specificActivity: string;
  targetDays: number[];
  beneficiaryIds: string[];
  demographics?: any;
}

export interface MergedGroupScheduleConfig {
  id?: string;
  mergedGroupName: string;
  mergedGroupLabel: string;
  partnerGroupNames: string[];
  designatedArea: string;
  specificActivity: string;
  targetDays: number[];
  demographics?: any;
}

export interface PurokSitioGroupDefinition {
  groupName: string;
  groupLabel: string;
  designatedMainArea: string;
  specificActivity?: string;
  purokSitios: string[];
  subGroups?: SubGroupScheduleConfig[];
  mergedSchedules?: MergedGroupScheduleConfig[];
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

export const CANONICAL_BARANGAYS = [
  "Aplaya",
  "Butas na Bato",
  "Caragsacan",
  "Davildavilan",
  "Dikapanikian",
  "Ibona",
  "Matawe",
  "Paltic",
  "Poblacion",
  "Tanawan",
  "Umiray",
] as const;

export const CANONICAL_SITIOS_BY_BARANGAY: Record<string, string[]> = {
  Aplaya: ["Lapu-Lapu", "Maya-Maya", "Tanigue"],
  "Butas na Bato": ["Purok 1", "Purok 2", "Purok 3", "Purok 4"],
  Caragsacan: [
    "Purok 1",
    "Purok 1 Phase 1",
    "Purok 1 Phase 2",
    "Purok 2",
    "Purok 3",
    "Purok 4",
    "Purok 5",
    "Purok 5 ADRA",
    "Purok 5 EVNAI",
    "Purok 5 Gawad Kalinga",
    "Purok 5 Horseshoe",
    "Purok 5 Kailyo",
    "Purok 6",
  ],
  Davildavilan: ["Purok 1", "Purok 2", "Purok 3", "Purok 5", "Purok 6"],
  Dikapanikian: ["Core Housing", "Pundongan", "Sagingan", "Saint Paul 1", "Saint Paul 2", "Sentro"],
  Ibona: ["Abungan", "Camiling", "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7"],
  Matawe: ["Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 6B", "Purok 7"],
  Paltic: ["Almaciga", "Ipil-Ipil", "Kamagong", "Mahogany", "Mulawin", "Narra", "Purok 2", "Yakal 1", "Yakal 2"],
  Poblacion: ["Market Site", "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5"],
  Tanawan: ["Purok 1", "Purok 2", "Purok 3"],
  Umiray: [
    "Bacong",
    "Bakahan",
    "Dugyan",
    "Ferry",
    "Iyapit",
    "Kamandag",
    "Limbok",
    "Malacauayan",
    "Malamig",
    "Market Site",
    "Pinamaypayan",
    "Sabang",
    "Singawan",
    "Tabi",
  ],
};

/**
 * Normalizes Barangay Name to standard capital key
 */
export function getBarangayKey(rawBarangay?: string | null): string {
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
export function getStandardBarangayName(rawBarangay?: string | null): string {
  const key = getBarangayKey(rawBarangay);
  const cfg = DINGALAN_BARANGAY_GROUPINGS[key];
  return cfg ? cfg.barangay : (rawBarangay || "").trim();
}

export function normalizeBarangayName(input?: string | null): string {
  return getStandardBarangayName(input);
}

/**
 * Normalizes Purok/Sitio strings for reliable matching against uploaded names
 */
export function normalizeSitioString(str?: string | null): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/^purok\s*/i, "")
    .replace(/^sitio\s*/i, "")
    .replace(/^s[\.\/]?o[\.,\s]*/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Unifies raw Sitio and Purok spellings into canonical Dingalan reference names
 */
export function normalizeSitioName(rawSitio?: string | null, rawBarangay?: string | null): string {
  if (!rawSitio) return "";
  let s = rawSitio.trim();
  if (!s || ["NONE", "N/A", "NA", "UNKNOWN", "(EMPTY)", "-", "NULL"].includes(s.toUpperCase())) {
    return "";
  }

  const bKey = rawBarangay ? getBarangayKey(rawBarangay) : "";

  // Strip prefixes like "SITIO ", "SO ", "SO. ", "SO, ", "S.O. ", "S/O "
  const upper = s
    .toUpperCase()
    .replace(/^SITIO\s+/i, "")
    .replace(/^S[\.\/]?O[\.,\s]+\s*/i, "")
    .replace(/^PUROK\s+/i, "PUROK ")
    .replace(/^P\-(\d)/i, "PUROK $1")
    .replace(/^P(\d)/i, "PUROK $1")
    .replace(/\s+/g, " ")
    .trim();

  // Alias Map for full precision across all 11 Barangays
  const aliasMap: Record<string, string> = {
    // Umiray
    "SINGAWAN": "Singawan",
    "SO SINGAWAN": "Singawan",
    "SITIO SINGAWAN": "Singawan",
    "PINAMAYPAYAN": "Pinamaypayan",
    "SO PINAMAYPAYAN": "Pinamaypayan",
    "SITIO PINAMAYPAYAN": "Pinamaypayan",
    "DUGYAN": "Dugyan",
    "SO DUGYAN": "Dugyan",
    "SITIO DUGYAN": "Dugyan",
    "MALACAUAYAN": "Malacauayan",
    "MALACAUYAN": "Malacauayan",
    "MALAKAWAYAN": "Malacauayan",
    "SO MALACAUAYAN": "Malacauayan",
    "SO MALAKAWAYAN": "Malacauayan",
    "SITIO MALACAUAYAN": "Malacauayan",
    "SITIO MALAKAWAYAN": "Malacauayan",
    "SABANG": "Sabang",
    "SO SABANG": "Sabang",
    "SITIO SABANG": "Sabang",
    "LIMBOK": "Limbok",
    "SO LIMBOK": "Limbok",
    "SO, LIMBOK": "Limbok",
    "SITIO LIMBOK": "Limbok",
    "MALAMIG": "Malamig",
    "SO MALAMIG": "Malamig",
    "SITIO MALAMIG": "Malamig",
    "IYAPIT": "Iyapit",
    "SO IYAPIT": "Iyapit",
    "SITIO IYAPIT": "Iyapit",
    "BAKAHAN": "Bakahan",
    "SO BAKAHAN": "Bakahan",
    "SITIO BAKAHAN": "Bakahan",
    "TABI": "Tabi",
    "TAPI": "Tabi",
    "SO TABI": "Tabi",
    "SITIO TABI": "Tabi",
    "SITIO TAPI": "Tabi",
    "BACONG": "Bacong",
    "BACOONG": "Bacong",
    "BACONG UMIRAY": "Bacong",
    "SO BACONG": "Bacong",
    "SO BACOONG": "Bacong",
    "SO.BACONG": "Bacong",
    "SO, BACONG": "Bacong",
    "SITIO BACONG": "Bacong",
    "FERRY": "Ferry",
    "SO FERRY": "Ferry",
    "SITIO FERRY": "Ferry",
    "KAMANDAG": "Kamandag",
    "SO KAMANDAG": "Kamandag",
    "SITIO KAMANDAG": "Kamandag",
    "PALENGKE UMIRAY": "Market Site",
    "PALENGKE": "Market Site",
    "SO MARKET SITE": "Market Site",
    "SITIO MARKET SITE": "Market Site",
    "BOUNDARY": "Boundary",

    // Aplaya
    "LAPU LAPU": "Lapu-Lapu",
    "LAPU-LAPU": "Lapu-Lapu",
    "PUROK LAPU LAPU": "Lapu-Lapu",
    "PUROK LAPU-LAPU": "Lapu-Lapu",
    "MAYA-MAYA": "Maya-Maya",
    "MAYA MAYA": "Maya-Maya",
    "MAY MAYA": "Maya-Maya",
    "PUROK MAYA-MAYA": "Maya-Maya",
    "PUROK MAYA MAYA": "Maya-Maya",
    "TANGIGUE": "Tanigue",
    "TANGGUE": "Tanigue",
    "TANIGUE": "Tanigue",
    "PUROK TANIGUE": "Tanigue",
    "PUROK TANGIGUE": "Tanigue",
    "SEASIDE": "Seaside",

    // Butas na Bato / General Puroks
    "PUROK 1": "Purok 1",
    "PUROK 2": "Purok 2",
    "PUROK 3": "Purok 3",
    "PUROK 4": "Purok 4",
    "PUROK 5": "Purok 5",
    "PUROK 6": "Purok 6",
    "PUROK 7": "Purok 7",
    "ROCK VIEW": "Rock View",
    "UNO": "Purok 1",

    // Caragsacan
    "PUROK 1 PHASE 1": "Purok 1 Phase 1",
    "PUROK 1PHASE 1": "Purok 1 Phase 1",
    "PHASE 1": "Purok 1 Phase 1",
    "PUROK 1 PHASE 2": "Purok 1 Phase 2",
    "PUROK 1PHASE 2": "Purok 1 Phase 2",
    "PHASE 2": "Purok 1 Phase 2",
    "PUROK 5 ADRA": "Purok 5 ADRA",
    "ADRA": "Purok 5 ADRA",
    "PUROK 5 EVNAI": "Purok 5 EVNAI",
    "EVNAI": "Purok 5 EVNAI",
    "PUROK 5 GAWAD KALINGA": "Purok 5 Gawad Kalinga",
    "PUROK 5 KALINGA": "Purok 5 Gawad Kalinga",
    "GAWAD KALINGA": "Purok 5 Gawad Kalinga",
    "GK": "Purok 5 Gawad Kalinga",
    "PUROK 5 HORSHOE": "Purok 5 Horseshoe",
    "PUROK 5 HORSESHOE": "Purok 5 Horseshoe",
    "HORSESHOE": "Purok 5 Horseshoe",
    "PUROK 5 KAILYO": "Purok 5 Kailyo",
    "KAILYO": "Purok 5 Kailyo",
    "MAIN ROAD": "Main Road",

    // Dikapanikian
    "SENTRO": "Sentro",
    "CENTRO": "Sentro",
    "PROPER": "Sentro",
    "CORE HOUSING": "Core Housing",
    "PUROK PUNDONGAN": "Pundongan",
    "PUNDONGAN": "Pundongan",
    "PUROK SAGINGAN": "Sagingan",
    "SAGINGAN": "Sagingan",
    "SAINT PAUL 1": "Saint Paul 1",
    "ST. PAUL 1": "Saint Paul 1",
    "ST PAUL 1": "Saint Paul 1",
    "SAINT PAUL 2": "Saint Paul 2",
    "ST. PAUL 2": "Saint Paul 2",
    "ST PAUL 2": "Saint Paul 2",
    "CREEK SIDE": "Creek Side",

    // Ibona
    "ABUNGAN": "Abungan",
    "PUROK ABUNGAN": "Abungan",
    "CAMILING": "Camiling",
    "PUROK CAMILING": "Camiling",
    "RIVERSIDE": "Riverside",

    // Matawe
    "PUROK 6B": "Purok 6B",
    "PUROK 6-B": "Purok 6B",
    "PUROK 6A": "Purok 6A",
    "HIGHWAY": "Highway",

    // Paltic
    "ALMACIGA": "Almaciga",
    "PUROK ALMACIGA": "Almaciga",
    "IPIL-IPIL": "Ipil-Ipil",
    "IPIL IPIL": "Ipil-Ipil",
    "IPIP IPIL": "Ipil-Ipil",
    "PUROK IPIL-IPIL": "Ipil-Ipil",
    "PUROK IPIL IPIL": "Ipil-Ipil",
    "KAMAGONG": "Kamagong",
    "PUROK KAMAGONG": "Kamagong",
    "MAHOGANY": "Mahogany",
    "MAHAGONY": "Mahogany",
    "PUROK MAHOGANY": "Mahogany",
    "PUROK MAHAGONY": "Mahogany",
    "MULAWIN": "Mulawin",
    "PUROK MULAWIN": "Mulawin",
    "NARRA": "Narra",
    "PUROK NARRA": "Narra",
    "YAKAL 1": "Yakal 1",
    "PUROK YAKAL 1": "Yakal 1",
    "YAKAL 2": "Yakal 2",
    "YAKAL2": "Yakal 2",
    "PUROK YAKAL 2": "Yakal 2",
    "YAKAL": "Yakal 1",
    "ABIS 1": "Abis 1",
    "FISH PORT": "Fish Port",

    // Poblacion / General
    "MARKET SITE": "Market Site",
    "PUROK MARKET SITE": "Market Site",
    "BRGY SITE": "Brgy Site",
    "UPPER": "Upper",
  };

  if (aliasMap[upper]) return aliasMap[upper];

  // Try matching against canonical list of the barangay
  if (bKey) {
    const stdBrgy = getStandardBarangayName(bKey);
    const sitios = CANONICAL_SITIOS_BY_BARANGAY[stdBrgy] || [];
    const cleanRaw = normalizeSitioString(s);
    for (const canon of sitios) {
      if (normalizeSitioString(canon) === cleanRaw) {
        return canon;
      }
    }
  }

  // Fallback title-case
  return s
    .replace(/^SITIO\s+/i, "")
    .replace(/^SO[\.,\s]+\s*/i, "")
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
