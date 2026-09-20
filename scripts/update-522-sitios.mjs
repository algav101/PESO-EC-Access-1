import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

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

async function main() {
  const prog = await prisma.program.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!prog) throw new Error("No active program");

  console.log(`Updating Beneficiaries for Program: ${prog.programCode} (ID: ${prog.id})`);

  // Fetch all program beneficiaries for this program
  const pbs = await prisma.programBeneficiary.findMany({
    where: { programId: prog.id },
    include: { beneficiary: true, qrCodes: true },
    orderBy: { designatedNumber: "asc" },
  });

  console.log(`Found ${pbs.length} program beneficiaries in database.`);

  let updatedCount = 0;
  for (const pb of pbs) {
    const b = pb.beneficiary;
    if (!b) continue;

    // Check if barangay or sitio needs normalization
    const cleanBrgy = normalizeBarangayName(b.barangay);
    const cleanSitio = normalizeSitioName(b.sitio);

    if (b.barangay !== cleanBrgy || (b.sitio && b.sitio !== cleanSitio)) {
      await prisma.beneficiary.update({
        where: { id: b.id },
        data: {
          barangay: cleanBrgy,
          sitio: cleanSitio || b.sitio,
        },
      });
      updatedCount++;
    }

    // Ensure active QR exists
    if (!pb.qrCodes || pb.qrCodes.length === 0) {
      const publicToken = `TUPAD-DGL-${prog.id.substring(0, 4).toUpperCase()}-${String(pb.designatedNumber).padStart(4, "0")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const tokenHash = crypto.createHash("sha256").update(publicToken).digest("hex");
      await prisma.qrCode.create({
        data: {
          programId: prog.id,
          programBeneficiaryId: pb.id,
          publicToken,
          tokenHash,
          status: "ACTIVE",
        },
      });
    }
  }

  console.log(`Updated ${updatedCount} beneficiaries with clean Barangay and Sitio/Purok names.`);

  const finalSummary = await prisma.beneficiary.groupBy({
    by: ['barangay', 'sitio'],
    where: {
      programBeneficiaries: {
        some: { programId: prog.id, participationStatus: { not: "REPLACED" } }
      }
    },
    _count: { id: true }
  });

  console.log("\n=== Final Masterlist Distribution by Barangay & Sitio ===");
  finalSummary.sort((a, b) => (a.barangay || "").localeCompare(b.barangay || "")).forEach(s => {
    console.log(`- ${s.barangay} -> ${s.sitio || "Centro"}: ${s._count.id}`);
  });
}

main().finally(() => prisma.$disconnect());
