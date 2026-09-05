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
    orderBy: { createdAt: 'desc' },
    include: {
      programBeneficiaries: {
        include: {
          beneficiary: true,
          stubDistributions: true,
          qrCodes: true
        }
      }
    }
  });

  if (!program) {
    console.log("No program found");
    return;
  }

  const flaggedSlotSet = new Set(flaggedReference.map(f => f.slot));

  console.log(`Starting synchronization for Program: ${program.programName} (${program.id})`);
  console.log(`Reference contains exactly ${flaggedReference.length} flagged beneficiaries.`);

  // 1. First, find all currently active/flagged beneficiaries not in reference list and reconcile them to ACTIVE / DISTRIBUTED
  const unflagCount = 0;
  for (const pb of program.programBeneficiaries) {
    if (pb.participationStatus === "REPLACED") {
      // Keep replaced beneficiaries as REPLACED
      continue;
    }

    if (!flaggedSlotSet.has(pb.designatedNumber)) {
      // If previously flagged for replacement, unflag and mark as active + distributed
      if (pb.participationStatus === "FLAGGED_FOR_REPLACEMENT") {
        await prisma.programBeneficiary.update({
          where: { id: pb.id },
          data: { participationStatus: "ACTIVE" }
        });
      }

      // If stubDistributions has FLAGGED_REPLACEMENT, update to DISTRIBUTED
      const flaggedSds = pb.stubDistributions.filter(sd => sd.status === "FLAGGED_REPLACEMENT");
      for (const sd of flaggedSds) {
        await prisma.stubDistribution.update({
          where: { id: sd.id },
          data: {
            status: "DISTRIBUTED",
            remarks: "Distributed during field distribution"
          }
        });
      }
    }
  }

  // 2. Process the exact 42 flagged beneficiaries
  let updatedCount = 0;
  for (const item of flaggedReference) {
    // Find matching programBeneficiary by slot number (and not REPLACED)
    const matchingPbs = program.programBeneficiaries.filter(
      pb => pb.designatedNumber === item.slot && pb.participationStatus !== "REPLACED"
    );

    let targetPb = matchingPbs.find(pb => 
      pb.beneficiary.fullName.toLowerCase().includes(item.name.split(',')[0].toLowerCase().trim())
    );

    if (!targetPb && matchingPbs.length > 0) {
      targetPb = matchingPbs[0];
    }

    if (!targetPb) {
      console.warn(`Could not find active beneficiary for slot #${item.slot} (${item.name})`);
      continue;
    }

    // Set participationStatus = "FLAGGED_FOR_REPLACEMENT"
    await prisma.programBeneficiary.update({
      where: { id: targetPb.id },
      data: { participationStatus: "FLAGGED_FOR_REPLACEMENT" }
    });

    const activeQr = targetPb.qrCodes.find(q => q.status === "ACTIVE") || targetPb.qrCodes[0];

    // Check if StubDistribution already exists
    if (targetPb.stubDistributions.length > 0) {
      const firstSd = targetPb.stubDistributions[0];
      await prisma.stubDistribution.update({
        where: { id: firstSd.id },
        data: {
          status: "FLAGGED_REPLACEMENT",
          remarks: item.remarks,
          distributedAt: item.date,
          verificationMethod: "FLAGGED_UNREACHABLE",
          distributedById: adminUser?.id || firstSd.distributedById
        }
      });
    } else {
      await prisma.stubDistribution.create({
        data: {
          qrId: activeQr?.id || "FLAGGED_QR_" + targetPb.id,
          programBeneficiaryId: targetPb.id,
          distributedById: adminUser?.id,
          verificationMethod: "FLAGGED_UNREACHABLE",
          status: "FLAGGED_REPLACEMENT",
          remarks: item.remarks,
          distributedAt: item.date
        }
      });
    }

    updatedCount++;
    console.log(`✓ Updated Slot #${item.slot}: ${targetPb.beneficiary.fullName} -> FLAGGED_FOR_REPLACEMENT [${item.remarks}]`);
  }

  // 3. Ensure 3 Replacements are confirmed in BeneficiaryReplacement
  const replacementConfigs = [
    {
      slot: "306",
      origName: "GERVACIO, WELFREDO GABUNIA",
      repName: "PONCE, ERIC R.",
      reason: "Secured other employment",
      status: "APPROVED"
    },
    {
      slot: "464",
      origName: "GOTIZA, VENUS GILBAS",
      repName: "APAGAR, MARK GOTIZA",
      reason: "Medical condition / unfit",
      status: "APPROVED"
    },
    {
      slot: "520",
      origName: "VALDEMOR, MANUELITO ROYALES JR",
      repName: "VALDEMOR, ELLEN JOY M.",
      reason: "Secured other employment",
      status: "APPROVED"
    }
  ];

  for (const rc of replacementConfigs) {
    const origPb = program.programBeneficiaries.find(
      pb => pb.designatedNumber === rc.slot && pb.beneficiary.fullName.includes(rc.origName.split(',')[0])
    );
    const repPb = program.programBeneficiaries.find(
      pb => pb.designatedNumber === rc.slot && pb.beneficiary.fullName.includes(rc.repName.split(',')[0])
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
      console.log(`✓ Replacement confirmed for Slot #${rc.slot}: ${origPb.beneficiary.fullName} -> ${repPb.beneficiary.fullName}`);
    }
  }

  console.log(`\nSuccessfully synchronized all ${updatedCount} flagged beneficiaries and recorded replacements!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
