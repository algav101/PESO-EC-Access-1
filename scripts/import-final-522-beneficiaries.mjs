import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

const MONTH_NAME_MAP = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

const DINGALAN_BARANGAYS = [
  "Aplaya", "Butas na Bato", "Caragsacan", "Davildavilan",
  "Dikapanikian", "Ibona", "Matawe", "Paltic",
  "Poblacion", "Tanawan", "Umiray"
];

function normalizeBarangayName(input) {
  if (!input) return "Dingalan";
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  for (const brgy of DINGALAN_BARANGAYS) {
    if (cleaned.includes(brgy.toLowerCase())) {
      return brgy;
    }
  }
  return input.trim().toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function normalizeSitioName(rawSitio) {
  if (!rawSitio) return "";
  const trimmed = rawSitio.trim();
  const upper = trimmed.toUpperCase().replace(/\s+/g, " ");

  const aliasMap = {
    "LAPU LAPU": "Lapu-Lapu",
    "LAPU-LAPU": "Lapu-Lapu",
    "PUROK LAPU-LAPU": "Lapu-Lapu",
    "PUROK LAPU LAPU": "Lapu-Lapu",
    "TANGIGUE": "Tanigue",
    "TANGGUE": "Tanigue",
    "TANIGUE": "Tanigue",
    "PUROK TANIGUE": "Tanigue",
    "MAYA-MAYA": "Maya-Maya",
    "MAYA MAYA": "Maya-Maya",
    "PUROK MAYA-MAYA": "Maya-Maya",
    "PUROK MAYA MAYA": "Maya-Maya",
    "PUROK 1": "Purok 1",
    "PUROK 2": "Purok 2",
    "PUROK 3": "Purok 3",
    "PUROK 4": "Purok 4",
    "PUROK 5": "Purok 5",
    "PUROK 6": "Purok 6",
    "PUROK 7": "Purok 7",
    "PUROK 1 PHASE 1": "Purok 1 Phase 1",
    "PUROK 1 PHASE 2": "Purok 1 Phase 2",
    "PUROK 5 EVNAI": "Purok 5 EVNAI",
    "PUROK 5 HORSHOE": "Purok 5 Horseshoe",
    "PUROK 5 HORSESHOE": "Purok 5 Horseshoe",
    "PUROK 5 KAILYO": "Purok 5 Kailyo",
    "PUROK 5 ADRA": "Purok 5 ADRA",
    "PUROK 5 GAWAD KALINGA": "Purok 5 Gawad Kalinga",
    "PUROK 6B": "Purok 6B",
    "PUROK 6A": "Purok 6A",
    "SENTRO": "Sentro",
    "CENTRO": "Sentro",
    "SAINT PAUL 1": "Saint Paul 1",
    "SAINT PAUL 2": "Saint Paul 2",
    "PUNDONGAN": "Pundongan",
    "SAGINGAN": "Sagingan",
    "CORE HOUSING": "Core Housing",
    "ABUNGAN": "Abungan",
    "CAMILING": "Camiling",
    "ALMACIGA": "Almaciga",
    "KAMAGONG": "Kamagong",
    "MAHOGANY": "Mahogany",
    "MULAWIN": "Mulawin",
    "NARRA": "Narra",
    "YAKAL 1": "Yakal 1",
    "YAKAL 2": "Yakal 2",
    "IPIL-IPIL": "Ipil-Ipil",
    "IPIL IPIL": "Ipil-Ipil",
    "BACONG": "Bacong",
    "BAKAHAN": "Bakahan",
    "DUGYAN": "Dugyan",
    "FERRY": "Ferry",
    "IYAPIT": "Iyapit",
    "KAMANDAG": "Kamandag",
    "LIMBOK": "Limbok",
    "MALACAUAYAN": "Malacauayan",
    "MALAKAWAYAN": "Malacauayan",
    "MALAMIG": "Malamig",
    "MARKET SITE": "Market Site",
    "PINAMAYPAYAN": "Pinamaypayan",
    "SABANG": "Sabang",
    "SINGAWAN": "Singawan",
    "TABI": "Tabi",
  };

  if (aliasMap[upper]) return aliasMap[upper];

  return trimmed
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseCSVLine(text) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

async function main() {
  console.log("=== Importing 522 Final Masterlist Beneficiaries ===");

  const csvPath = path.resolve("src/data/final_tupad_beneficiaries_dingalan_522.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`File not found: ${csvPath}`);
  }

  const rawLines = fs.readFileSync(csvPath, "utf-8").split(/\r?\n/).filter(Boolean);
  console.log(`Total raw lines: ${rawLines.length}`);

  // Find active program
  let prog = await prisma.program.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!prog) {
    prog = await prisma.program.findFirst({ orderBy: { createdAt: "desc" } });
  }
  if (!prog) {
    throw new Error("No program found in database!");
  }
  console.log(`Target Program: ${prog.programCode} - ${prog.programName} (ID: ${prog.id})`);

  // Table assignment rules
  const tableRules = await prisma.tableAssignmentRule.findMany({
    where: { programId: prog.id },
    orderBy: { priority: "desc" },
  });

  const getTable = (num) => {
    for (const rule of tableRules) {
      if (num >= rule.startNumber && num <= rule.endNumber) {
        return rule.tableNumber;
      }
    }
    return `Table ${Math.ceil(num / 100)}`;
  };

  // Find admin user for creator
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN", "PESO_MANAGER"] } },
  });
  const createdById = adminUser ? adminUser.id : null;

  const parsedItems = [];

  // Data starts at line index 2 (skip header 1 and header 2)
  for (let i = 2; i < rawLines.length; i++) {
    const cols = parseCSVLine(rawLines[i]);
    if (!cols || cols.length < 5) continue;

    const desigNum = cols[0] || String(parsedItems.length + 1);
    const fullName = cols[1]?.replace(/^"|"$/g, "").trim().toUpperCase() || "";
    const firstName = cols[3]?.trim().toUpperCase() || "";
    const middleName = cols[4]?.trim().toUpperCase() || "";
    const lastName = cols[5]?.trim().toUpperCase() || "";
    const extName = cols[6]?.trim().toUpperCase() || "";

    const mStr = cols[8]?.trim().padStart(2, "0") || "01";
    const dStr = cols[9]?.trim().padStart(2, "0") || "01";
    const yStr = cols[10]?.trim() || "1980";
    const birthday = `${yStr}-${mStr}-${dStr}`;

    const rawStreet = cols[11]?.trim() || "";
    const rawBrgy = cols[12]?.trim() || "Aplaya";
    const barangay = normalizeBarangayName(rawBrgy);
    const sitio = normalizeSitioName(rawStreet);

    const idType = cols[16]?.trim() || "NATIONAL ID";
    const idNumber = cols[17]?.trim() || "";
    const contactNumber = cols[18]?.trim() || "";

    const typeOfBeneficiary = cols[20]?.trim() || "SELF-EMPLOYED";
    const occupation = cols[21]?.trim() || "LABORER";
    const rawSex = cols[22]?.trim().toUpperCase() || "M";
    const sex = rawSex.startsWith("F") ? "FEMALE" : "MALE";
    const civilStatus = cols[23]?.trim().toUpperCase() === "M" ? "MARRIED" : cols[23]?.trim().toUpperCase() === "S" ? "SINGLE" : "WIDOWED";
    const age = parseInt(cols[24]?.trim(), 10) || undefined;

    const depFullName = cols[26]?.replace(/^"|"$/g, "").trim().toUpperCase() || "";
    const depFirst = cols[28]?.trim().toUpperCase() || "";
    const depMiddle = cols[29]?.trim().toUpperCase() || "";
    const depLast = cols[30]?.trim().toUpperCase() || "";
    const depExt = cols[31]?.trim().toUpperCase() || "";
    const depRel = cols[32]?.trim().toUpperCase() || "";
    const depAge = parseInt(cols[33]?.trim(), 10) || undefined;

    const isPwd = (cols[36]?.trim().toUpperCase() === "Y" || cols[36]?.trim().toUpperCase() === "YES");
    const is4Ps = (cols[37]?.trim().toUpperCase() === "Y" || cols[37]?.trim().toUpperCase() === "YES");
    const isIp = (cols[38]?.trim().toUpperCase() === "Y" || cols[38]?.trim().toUpperCase() === "YES");
    const isSenior = (age && age >= 60) || typeOfBeneficiary.toLowerCase().includes("senior");

    parsedItems.push({
      designatedNumber: desigNum,
      fullName,
      firstName,
      middleName,
      lastName,
      extensionName: extName,
      birthday,
      barangay,
      sitio,
      idType,
      idNumber,
      contactNumber,
      typeOfBeneficiary,
      occupation,
      sex,
      civilStatus,
      age,
      isSenior,
      isPwd,
      is4Ps,
      isIp,
      depFullName,
      depFirst,
      depMiddle,
      depLast,
      depExt,
      depRel,
      depAge,
    });
  }

  console.log(`Successfully parsed ${parsedItems.length} beneficiaries from CSV.`);

  // Process & UPSERT in Database
  let createdBenes = 0;
  let updatedBenes = 0;
  let createdPbs = 0;
  let updatedPbs = 0;

  for (const item of parsedItems) {
    const numInt = parseInt(item.designatedNumber, 10) || 1;
    const tableNumber = getTable(numInt);

    // 1. Find or create Beneficiary
    let bene = await prisma.beneficiary.findFirst({
      where: {
        OR: [
          { fullName: item.fullName, birthday: item.birthday },
          { fullName: item.fullName },
        ],
      },
    });

    if (!bene) {
      bene = await prisma.beneficiary.create({
        data: {
          beneficiaryNumber: `BN-${String(item.designatedNumber).padStart(4, "0")}`,
          fullName: item.fullName,
          firstName: item.firstName,
          middleName: item.middleName,
          lastName: item.lastName,
          extensionName: item.extensionName,
          birthday: item.birthday,
          sex: item.sex,
          civilStatus: item.civilStatus,
          age: item.age,
          barangay: item.barangay,
          sitio: item.sitio,
          municipality: "Dingalan",
          province: "Aurora",
          contactNumber: item.contactNumber,
          idType: item.idType,
          idNumber: item.idNumber,
          typeOfBeneficiary: item.typeOfBeneficiary,
          occupation: item.occupation,
          isSenior: item.isSenior,
          isPwd: item.isPwd,
          is4Ps: item.is4Ps,
          isIp: item.isIp,
          status: "ACTIVE",
        },
      });
      createdBenes++;
    } else {
      bene = await prisma.beneficiary.update({
        where: { id: bene.id },
        data: {
          firstName: item.firstName || bene.firstName,
          middleName: item.middleName || bene.middleName,
          lastName: item.lastName || bene.lastName,
          extensionName: item.extensionName || bene.extensionName,
          birthday: item.birthday,
          barangay: item.barangay,
          sitio: item.sitio,
          idType: item.idType || bene.idType,
          idNumber: item.idNumber || bene.idNumber,
          contactNumber: item.contactNumber || bene.contactNumber,
          typeOfBeneficiary: item.typeOfBeneficiary || bene.typeOfBeneficiary,
          occupation: item.occupation || bene.occupation,
          sex: item.sex || bene.sex,
          civilStatus: item.civilStatus || bene.civilStatus,
          age: item.age || bene.age,
          isSenior: item.isSenior,
          isPwd: item.isPwd,
          is4Ps: item.is4Ps,
          isIp: item.isIp,
        },
      });
      updatedBenes++;
    }

    // 2. ProgramBeneficiary
    let pb = await prisma.programBeneficiary.findFirst({
      where: {
        programId: prog.id,
        beneficiaryId: bene.id,
      },
    });

    if (!pb) {
      pb = await prisma.programBeneficiary.create({
        data: {
          programId: prog.id,
          beneficiaryId: bene.id,
          designatedNumber: item.designatedNumber,
          tableNumber,
          slotGroup: "Main",
          participationStatus: "ACTIVE",
        },
      });
      createdPbs++;
    } else {
      pb = await prisma.programBeneficiary.update({
        where: { id: pb.id },
        data: {
          designatedNumber: item.designatedNumber,
          tableNumber,
          participationStatus: "ACTIVE",
        },
      });
      updatedPbs++;
    }

    // 3. Ensure QR Code exists
    const existingQr = await prisma.qrCode.findFirst({
      where: { programBeneficiaryId: pb.id, status: "ACTIVE" },
    });

    if (!existingQr) {
      const publicToken = `TUPAD-DGL-${prog.id.substring(0, 4).toUpperCase()}-${String(item.designatedNumber).padStart(4, "0")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const tokenHash = crypto.createHash("sha256").update(publicToken).digest("hex");
      await prisma.qrCode.create({
        data: {
          programBeneficiaryId: pb.id,
          publicToken,
          tokenHash,
          signedPayload: `DGL:${pb.id}:${item.birthday}`,
          status: "ACTIVE",
        },
      });
    }

    // 4. Dependent if present
    if (item.depFullName) {
      const existingDep = await prisma.dependent.findFirst({
        where: { beneficiaryId: bene.id },
      });
      if (!existingDep) {
        await prisma.dependent.create({
          data: {
            beneficiaryId: bene.id,
            fullName: item.depFullName,
            firstName: item.depFirst,
            middleName: item.depMiddle,
            lastName: item.depLast,
            extensionName: item.depExt,
            relationship: item.depRel,
            age: item.depAge,
          },
        });
      }
    }
  }

  // Update total beneficiaries count on program
  const finalCount = await prisma.programBeneficiary.count({
    where: { programId: prog.id, participationStatus: { not: "REPLACED" } },
  });

  await prisma.program.update({
    where: { id: prog.id },
    data: { totalBeneficiaries: finalCount },
  });

  console.log(`\n=== Import Summary ===`);
  console.log(`- Beneficiaries Created: ${createdBenes}`);
  console.log(`- Beneficiaries Updated: ${updatedBenes}`);
  console.log(`- Program Roster Created: ${createdPbs}`);
  console.log(`- Program Roster Updated: ${updatedPbs}`);
  console.log(`- Total Active Beneficiaries in ${prog.programCode}: ${finalCount}`);
  console.log("=== Completed Successfully! ===");
}

main()
  .catch((e) => {
    console.error("Import error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
