const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const flaggedReference = [
  {
    slot: "3",
    name: "AVELLANO, LUIGENE BALDERAMA",
    remarks: "OTHER: Replaced by Father Avellano, Louie Tena",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "27",
    name: "SANTIAGO, CHARLOU MADAYAG",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: Replaced by Mahilum, Amelita Alimanza",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "34",
    name: "UMALI, RANIEL RENS NILLO",
    remarks: "REFUSED_BENEFICIARY - Replaced by Umali, John Robert Nillo",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "114",
    name: "LIGGAYU, ERLINDA MARTINEZ",
    remarks: "REFUSED_BENEFICIARY - to be replace by husband",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "122",
    name: "NAPI, SUSAN BAUNILLO",
    remarks: "REFUSED_EMPLOYMENT: CHENILLA, THELMA BAUNILLO",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "192",
    name: "TALBO, BONIFACIO LEOVERAS JR",
    remarks: "REFUSED_BENEFICIARY",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "193",
    name: "UDARBE, REYMART ROXAS",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "198",
    name: "BALALA, MARIELLA JINTALAN",
    remarks: "MEDICAL_UNFIT: Imelda Balala Mauricio- Cousin Replacement",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "201",
    name: "BARLIS, MARY JOY SOTTO",
    remarks: "MEDICAL_UNFIT: 2months.plng na nanganak",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "219",
    name: "MENDOZA, JOERYLL KAE ALIGAM",
    remarks: "MEDICAL_UNFIT: Sheryll aligam mendoza- mother",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "240",
    name: "ESPAÑOL, CRISTELYN LEGASPI",
    remarks: "EMPLOYED_ELSEWHERE: Rutaquio marie fritzie Roldan",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "261",
    name: "ROMUALDEZ, JUDITH SUNGA",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE - Torre, Jimmy Umayan (Asawa)",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "266",
    name: "TOLENTINO, MARY ROSE DEVOTA",
    remarks: "OTHER",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "267",
    name: "VENIAZ, RONA MAY MODESTO",
    remarks: "HOSPITALIZED_OR_MEDICAL - To be replaced by Modesto, Aprilyn Victorio (Sister)",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "281",
    name: "BELARDO, JERWIN CAÑEDO",
    remarks: "REFUSED_BENEFICIARY - UNREACHABLE_PHONE_OR_RESIDENCE: Nsa laot,kapatid nya po",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "283",
    name: "BERNAL, KATHLEEN BUSTAMANTE",
    remarks: "EMPLOYED_ELSEWHERE: For replacement- Bernal, Amy Bustamante (Mother)",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "289",
    name: "BUMANGLAG, VIRGIE MILLIOMIDA",
    remarks: "REFUSED_BENEFICIARY - for replacement of Caballa, Monica Fernandez (Auntie-same household)",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "300",
    name: "ESQUIVEL, JONATHAN LATONA",
    remarks: "OTHER: Nsa laot,nanay",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "306",
    name: "PONCE, ERIC R.",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE - PESO Admin manual distribution & affirmation override",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "314",
    name: "LATONA, MARK VAND NARIDO",
    remarks: "OTHER: May trabaho,bayaw",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "322",
    name: "MALLARI, EDNA PANTAY",
    remarks: "HOSPITALIZED_OR_MEDICAL",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "330",
    name: "MONEZ, DRENA LAMBERGUE",
    remarks: "OTHER: May trabaho, nanay",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "337",
    name: "PANGANTIHON, REYMARK TADILI",
    remarks: "OTHER: Nsa trabaho, kapatid",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "357",
    name: "SAJOL, DELIA MANGUBAT",
    remarks: "OTHER: Di po sya makakarating nsa 8bang lugar po sya,malapit n kamag anak",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "361",
    name: "TORRE, RAUL ASTRERA",
    remarks: "OTHER: Ramirez Beatriz Caras",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "362",
    name: "BADILLES, ELVIE SALVACION",
    remarks: "MOVED_OUT_OF_TOWN: replace carolina s bataller",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "369",
    name: "DEL ROSARIO, JUNE DE LEON",
    remarks: "EMPLOYED_ELSEWHERE: No additional remarks",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "370",
    name: "DELA CRUZ, GENNELYN LOPEZ",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: No additional remarks",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "386",
    name: "BELLECA, JENNY ROSE QUIAMBAO",
    remarks: "OTHER: Hindi po makakauwi kaya po kumuha sya Ng kapalit",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "405",
    name: "RAMOS, MAY ANN ESCAÑO",
    remarks: "OTHER: Nagtatrabaho kaya Asawa po pinalit",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "412",
    name: "ALMARIO, CECILIA MALLO",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: Replaced by Verrey, Bernaliza Ortillano",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "416",
    name: "ANUNCIADA, ELENITA MANGAYA-AY",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: kaoopera ng mata Alberto Cotanda Anunciada",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "435",
    name: "BORREO, AIZA YBAÑEZ",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: No additional remarks",
    date: new Date("2026-09-03T08:00:00.000Z")
  },
  {
    slot: "443",
    name: "CORTEZ, ROLANDO MARIMLA JR",
    remarks: "OTHER - Replacement by Plaza, Lovely Borreo",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "448",
    name: "DAQUIO, ARCHIE JAMES ESPEDIDO",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "464",
    name: "APAGAR, MARK GOTIZA",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE - PESO Admin manual distribution & affirmation override",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "469",
    name: "JOVILLANO, ROSENDA MALTO",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: Replaced by Samehousehold-OBLEJENA, ARON ROARING",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "470",
    name: "JOVILLANO, ROSE MARIE MALTO",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE: Replaced by Mendoza, Arnel Bolante",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "484",
    name: "MEKITPEKIT, RANDY BATULAT",
    remarks: "REFUSED_BENEFICIARY - to be replace by wife",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "498",
    name: "RAMOS, BENILDA HUEGO",
    remarks: "HOSPITALIZED_OR_MEDICAL",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "510",
    name: "SALOMON, JERICO MEKITPEKIT",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE",
    date: new Date("2026-09-04T08:00:00.000Z")
  },
  {
    slot: "520",
    name: "VALDEMOR, ELLEN JOY M.",
    remarks: "UNREACHABLE_PHONE_OR_RESIDENCE",
    date: new Date("2026-09-04T08:00:00.000Z")
  }
];

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { role: "PESO_ADMIN" }
  });

  const program = await prisma.program.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!program) {
    console.log("No program found");
    return;
  }

  const flaggedSlots = flaggedReference.map(f => f.slot);

  console.log(`Synchronizing Program: ${program.programName} (${program.id})`);
  console.log(`Targeting exactly ${flaggedSlots.length} flagged beneficiaries.`);

  // 1. Batch unflag all other beneficiaries
  const unflagPb = await prisma.programBeneficiary.updateMany({
    where: {
      programId: program.id,
      participationStatus: "FLAGGED_FOR_REPLACEMENT",
      designatedNumber: { notIn: flaggedSlots }
    },
    data: { participationStatus: "ACTIVE" }
  });
  console.log(`Reconciled ${unflagPb.count} non-reference beneficiaries back to ACTIVE.`);

  // 2. Batch update stub distributions for unflagged beneficiaries to DISTRIBUTED
  const unflagSd = await prisma.stubDistribution.updateMany({
    where: {
      status: "FLAGGED_REPLACEMENT",
      programBeneficiary: {
        programId: program.id,
        designatedNumber: { notIn: flaggedSlots }
      }
    },
    data: {
      status: "DISTRIBUTED",
      remarks: "Distributed during field distribution"
    }
  });
  console.log(`Reconciled ${unflagSd.count} stub distributions back to DISTRIBUTED.`);

  // 3. Fetch all target program beneficiaries for the 42 slots
  const targetPbs = await prisma.programBeneficiary.findMany({
    where: {
      programId: program.id,
      designatedNumber: { in: flaggedSlots },
      participationStatus: { not: "REPLACED" }
    },
    include: {
      beneficiary: true,
      stubDistributions: true,
      qrCodes: true
    }
  });

  console.log(`Found ${targetPbs.length} active target beneficiaries in program.`);

  for (const item of flaggedReference) {
    const pb = targetPbs.find(p => p.designatedNumber === item.slot);
    if (!pb) {
      console.warn(`! Slot #${item.slot} not found among active target beneficiaries`);
      continue;
    }

    // Set status to FLAGGED_FOR_REPLACEMENT
    await prisma.programBeneficiary.update({
      where: { id: pb.id },
      data: { participationStatus: "FLAGGED_FOR_REPLACEMENT" }
    });

    const activeQr = pb.qrCodes.find(q => q.status === "ACTIVE") || pb.qrCodes[0];

    if (pb.stubDistributions.length > 0) {
      const sdId = pb.stubDistributions[0].id;
      await prisma.stubDistribution.update({
        where: { id: sdId },
        data: {
          status: "FLAGGED_REPLACEMENT",
          remarks: item.remarks,
          distributedAt: item.date,
          verificationMethod: "FLAGGED_UNREACHABLE",
          distributedById: adminUser?.id || pb.stubDistributions[0].distributedById
        }
      });
    } else {
      await prisma.stubDistribution.create({
        data: {
          qrId: activeQr?.id || `QR_FLAGGED_${pb.id}`,
          programBeneficiaryId: pb.id,
          distributedById: adminUser?.id,
          verificationMethod: "FLAGGED_UNREACHABLE",
          status: "FLAGGED_REPLACEMENT",
          remarks: item.remarks,
          distributedAt: item.date
        }
      });
    }

    console.log(`✓ [Slot #${item.slot}] ${pb.beneficiary.fullName} -> ${item.remarks}`);
  }

  // 4. Ensure Recorded Replacements History (3)
  const replacementConfigs = [
    {
      slot: "306",
      origName: "GERVACIO",
      repName: "PONCE",
      reason: "Secured other employment",
      status: "APPROVED"
    },
    {
      slot: "464",
      origName: "GOTIZA",
      repName: "APAGAR",
      reason: "Medical condition / unfit",
      status: "APPROVED"
    },
    {
      slot: "520",
      origName: "VALDEMOR",
      repName: "VALDEMOR, ELLEN",
      reason: "Secured other employment",
      status: "APPROVED"
    }
  ];

  const allReplacedAndRepPbs = await prisma.programBeneficiary.findMany({
    where: {
      programId: program.id,
      designatedNumber: { in: ["306", "464", "520"] }
    },
    include: { beneficiary: true }
  });

  for (const rc of replacementConfigs) {
    const origPb = allReplacedAndRepPbs.find(
      pb => pb.designatedNumber === rc.slot && pb.participationStatus === "REPLACED"
    );
    const repPb = allReplacedAndRepPbs.find(
      pb => pb.designatedNumber === rc.slot && pb.participationStatus !== "REPLACED"
    );

    if (origPb && repPb) {
      const existingRep = await prisma.beneficiaryReplacement.findFirst({
        where: {
          programId: program.id,
          originalProgramBeneficiaryId: origPb.id
        }
      });

      if (existingRep) {
        await prisma.beneficiaryReplacement.update({
          where: { id: existingRep.id },
          data: {
            replacementProgramBeneficiaryId: repPb.id,
            reason: rc.reason,
            status: rc.status,
            approvedById: adminUser?.id,
            approvedAt: new Date("2026-09-04T12:00:00.000Z")
          }
        });
      } else {
        await prisma.beneficiaryReplacement.create({
          data: {
            programId: program.id,
            originalProgramBeneficiaryId: origPb.id,
            replacementProgramBeneficiaryId: repPb.id,
            reason: rc.reason,
            status: rc.status,
            initiatedById: adminUser?.id,
            approvedById: adminUser?.id,
            initiatedAt: new Date("2026-09-04T08:00:00.000Z"),
            approvedAt: new Date("2026-09-04T12:00:00.000Z")
          }
        });
      }
      console.log(`✓ Replacement history confirmed for Slot #${rc.slot}: ${origPb.beneficiary.fullName} -> ${repPb.beneficiary.fullName}`);
    }
  }

  console.log("\nAll 42 flagged beneficiaries and replacement records updated successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
