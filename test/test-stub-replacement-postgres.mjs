// Synthetic data only, in a disposable loopback PostgreSQL cluster. Never reads .env.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import cp from "node:child_process";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const root = process.cwd(), cacheRoot = path.resolve(root, "node_modules/.cache");
fs.mkdirSync(cacheRoot, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(cacheRoot, "stub-repl-pg-"));
const pgBin = process.env.TEST_POSTGRES_BIN || "C:/Program Files/PostgreSQL/18/bin";
const suffix = process.platform === "win32" ? ".exe" : "";

function run(program, args, env = process.env) {
  const result = cp.spawnSync(program, args, {
    encoding: "utf8",
    windowsHide: true,
    env,
    timeout: 30000,
    maxBuffer: 4 * 1024 * 1024,
    stdio: path.basename(program).startsWith("pg_ctl") ? "ignore" : "pipe",
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(program)}: ${result.stderr || result.stdout || result.status}`);
  }
}

const listener = net.createServer();
await new Promise((resolve, reject) => {
  listener.once("error", reject);
  listener.listen(0, "127.0.0.1", resolve);
});
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const testUrl = `postgresql://repl_test@127.0.0.1:${port}/postgres?schema=public`;

let started = false;
let db;
try {
  run(path.join(pgBin, "initdb" + suffix), ["-D", dataDir, "-U", "repl_test", "-A", "trust", "--no-locale", "-E", "UTF8"]);
  run(path.join(pgBin, "pg_ctl" + suffix), ["-D", dataDir, "-l", path.join(dataDir, "test.log"), "-o", `-h 127.0.0.1 -p ${port} -F`, "-w", "start"]);
  started = true;
  run(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"], {
    ...process.env,
    DATABASE_URL: testUrl,
    DIRECT_URL: testUrl,
  });

  db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const coordinator = await db.user.create({
    data: {
      username: "synthetic-coord",
      passwordHash: "synthetic",
      fullName: "Synthetic TUPAD Coordinator",
      role: "TUPAD_COORDINATOR",
    },
  });

  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(root, file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} };
    cache.set(resolved, module);
    const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name === "@/lib/prisma" || (name === "./prisma" && resolved.endsWith(path.join("lib", "audit.ts")))) {
        return { __esModule: true, default: db };
      }
      if (name === "@/lib/auth") {
        return { getCurrentUser: async () => coordinator, hasPermission: () => true };
      }
      if (name.startsWith("@/")) return load(path.join("src", name.slice(2)) + ".ts");
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: resolved })(localRequire, module, module.exports);
    return module.exports;
  }

  const request = (body) =>
    new Request("http://synthetic.test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const qr = load("src/lib/qr.ts");
  const checkRoute = load("src/app/api/v1/stub-distribution/check-replacement-eligibility/route.ts");
  const flagRoute = load("src/app/api/v1/stub-distribution/flag-replacement/route.ts");
  const scanRoute = load("src/app/api/v1/stub-distribution/scan/route.ts");
  const monitoringRoute = load("src/app/api/v1/stub-distribution/monitoring/route.ts");

  const program = await db.program.create({
    data: {
      programCode: "REPL-BATCH-2026",
      programName: "Replacement Test Program",
      status: "ACTIVE",
      createdById: coordinator.id,
    },
  });

  // Create Original Beneficiary #1 (CRUZ, MARILYN RITUAL, Birthday 1985-08-15)
  const origBene = await db.beneficiary.create({
    data: {
      beneficiaryNumber: "ORIG-0001",
      firstName: "MARILYN",
      middleName: "RITUAL",
      lastName: "CRUZ",
      fullName: "CRUZ, MARILYN RITUAL",
      birthday: "1985-08-15",
      barangay: "Aplaya",
      sitio: "Core Housing",
      status: "VALID",
    },
  });

  const origPb = await db.programBeneficiary.create({
    data: {
      programId: program.id,
      beneficiaryId: origBene.id,
      designatedNumber: "1",
      tableNumber: "Table 1",
      participationStatus: "ACTIVE",
    },
  });

  const slotQr = await db.qrCode.create({
    data: {
      programId: program.id,
      programBeneficiaryId: origPb.id,
      ...qr.generateBeneficiaryToken(program.id, "1"),
    },
  });

  // Create a Restricted Person in BeneficiaryRestriction to test disqualification
  const restrictedBene = await db.beneficiary.create({
    data: {
      beneficiaryNumber: "RESTR-0001",
      firstName: "PEDRO",
      middleName: "REYES",
      lastName: "SANTOS",
      fullName: "SANTOS, PEDRO REYES",
      birthday: "1980-05-10",
      barangay: "Aplaya",
      status: "RESTRICTED",
    },
  });
  await db.beneficiaryRestriction.create({
    data: {
      beneficiaryId: restrictedBene.id,
      payoutDate: "PERMANENT_APPOINTIVE",
      isAppointivePersonnel: true,
      adlNo: "BARANGAY TANOD",
      barangay: "Aplaya",
      reason: "Barangay Tanod in Brgy. Aplaya",
      status: "ACTIVE",
    },
  });

  // 1. Test Eligibility Check: Restricted Applicant should fail
  const resDisqualified = await checkRoute.POST(
    request({
      programId: program.id,
      applicantFullName: "SANTOS, PEDRO REYES",
      applicantBirthday: "05-10-1980",
      dependentFullName: "SANTOS, ANA LOPEZ",
      dependentBirthday: "06-12-1982",
    })
  );
  assert.equal(resDisqualified.status, 200);
  const bodyDisqualified = await resDisqualified.json();
  assert.equal(bodyDisqualified.bothQualified, false);
  assert.equal(bodyDisqualified.applicant.eligible, false);
  assert.equal(bodyDisqualified.dependent.eligible, true);

  // 2. Test Eligibility Check: Already Enrolled Beneficiary as Dependent should fail
  const resEnrolledDep = await checkRoute.POST(
    request({
      programId: program.id,
      applicantFullName: "RAMOS, JUAN DELA CRUZ",
      applicantBirthday: "03-21-1992",
      dependentFullName: "CRUZ, MARILYN RITUAL",
      dependentBirthday: "08-15-1985",
    })
  );
  const bodyEnrolledDep = await resEnrolledDep.json();
  assert.equal(bodyEnrolledDep.bothQualified, false);
  assert.equal(bodyEnrolledDep.applicant.eligible, true);
  assert.equal(bodyEnrolledDep.dependent.eligible, false);

  // 3. Test Eligibility Check: Qualified Replacement Applicant & Dependent should pass
  const resQualified = await checkRoute.POST(
    request({
      programId: program.id,
      applicantFullName: "RAMOS, JUAN DELA CRUZ",
      applicantBirthday: "03-21-1992",
      dependentFullName: "RAMOS, ELENA GARCIA",
      dependentBirthday: "07-19-1994",
    })
  );
  const bodyQualified = await resQualified.json();
  assert.equal(bodyQualified.bothQualified, true);
  assert.equal(bodyQualified.applicant.eligible, true);
  assert.equal(bodyQualified.dependent.eligible, true);

  const sampleIdPayload = (name) => ({
    name,
    size: 1024,
    type: "image/jpeg",
    dataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==",
  });

  // 4. Test Replacement Submission with WRONG Original Beneficiary Birthday PIN -> Must Reject (400)
  const wrongConsentRes = await flagRoute.POST(
    request({
      programId: program.id,
      programBeneficiaryId: origPb.id,
      replacementApplicantFullName: "RAMOS, JUAN DELA CRUZ",
      replacementApplicantBirthday: "03-21-1992",
      replacementApplicantSex: "MALE",
      replacementApplicantContact: "09171234567",
      replacementApplicantBarangay: "APLAYA",
      replacementApplicantSitio: "Core Housing",
      replacementApplicantIdType: "NATIONAL ID",
      replacementApplicantIdNumber: "1234-5678-9012",
      dependentFullName: "RAMOS, ELENA GARCIA",
      dependentRelationship: "WIFE",
      dependentAge: 32,
      dependentIdType: "NATIONAL ID",
      reason: "MEDICAL_CONDITION_OR_PREGNANCY",
      remarks: "Original beneficiary hospitalized",
      originalBeneficiaryBirthdayPin: "01-01-1999", // WRONG BIRTHDAY
      relationshipWithReplacement: "BROTHER / KAPATID",
      consentConfirmed: true,
      applicantIdFront: sampleIdPayload("app-front.jpg"),
      applicantIdBack: sampleIdPayload("app-back.jpg"),
      dependentIdFront: sampleIdPayload("dep-front.jpg"),
      dependentIdBack: sampleIdPayload("dep-back.jpg"),
    })
  );
  assert.equal(wrongConsentRes.status, 400);
  const wrongConsentBody = await wrongConsentRes.json();
  assert.match(wrongConsentBody.error, /does not match our official record/i);

  // 5. Test Replacement Submission with CORRECT Original Beneficiary Birthday PIN (08-15-1985) + 4 IDs -> Must Succeed (200)
  const okRes = await flagRoute.POST(
    request({
      programId: program.id,
      programBeneficiaryId: origPb.id,
      replacementApplicantFullName: "RAMOS, JUAN DELA CRUZ",
      replacementApplicantBirthday: "03-21-1992",
      replacementApplicantSex: "MALE",
      replacementApplicantContact: "09171234567",
      replacementApplicantBarangay: "APLAYA",
      replacementApplicantSitio: "Core Housing",
      replacementApplicantIdType: "NATIONAL ID",
      replacementApplicantIdNumber: "1234-5678-9012",
      dependentFullName: "RAMOS, ELENA GARCIA",
      dependentRelationship: "WIFE",
      dependentAge: 32,
      dependentIdType: "NATIONAL ID",
      reason: "MEDICAL_CONDITION_OR_PREGNANCY",
      remarks: "Original beneficiary hospitalized",
      originalBeneficiaryBirthdayPin: "08-15-1985", // MATCHES CRUZ, MARILYN RITUAL (1985-08-15)
      relationshipWithReplacement: "SIBLING / KAPATID",
      consentConfirmed: true,
      applicantIdFront: sampleIdPayload("app-front.jpg"),
      applicantIdBack: sampleIdPayload("app-back.jpg"),
      dependentIdFront: sampleIdPayload("dep-front.jpg"),
      dependentIdBack: sampleIdPayload("dep-back.jpg"),
    })
  );
  assert.equal(okRes.status, 200, JSON.stringify(await okRes.clone().json()));
  const okBody = await okRes.json();
  assert.equal(okBody.success, true);
  assert.equal(okBody.data.designatedNumber, "1");
  assert.equal(okBody.data.fullName, "RAMOS, JUAN DELA CRUZ");
  assert.equal(okBody.data.originalBeneficiaryName, "CRUZ, MARILYN RITUAL");
  assert.equal(okBody.data.dependentFullName, "RAMOS, ELENA GARCIA");

  // Verify DB state:
  // a) Original ProgramBeneficiary is marked REPLACED
  const updatedOrigPb = await db.programBeneficiary.findUnique({ where: { id: origPb.id } });
  assert.equal(updatedOrigPb.participationStatus, "REPLACED");

  // b) New ProgramBeneficiary is ACTIVE in slot #1 and bound to the existing QR code
  const newPb = await db.programBeneficiary.findUnique({
    where: { id: okBody.data.programBeneficiaryId },
    include: { beneficiary: { include: { dependents: true, documents: true } } },
  });
  assert.equal(newPb.participationStatus, "ACTIVE");
  assert.equal(newPb.designatedNumber, "1");
  assert.equal(newPb.beneficiary.fullName, "RAMOS, JUAN DELA CRUZ");
  assert.equal(newPb.beneficiary.dependents.length, 1);
  assert.equal(newPb.beneficiary.dependents[0].fullName, "RAMOS, ELENA GARCIA");
  assert.equal(newPb.beneficiary.documents.length, 4);

  const reboundQr = await db.qrCode.findUnique({ where: { id: slotQr.id } });
  assert.equal(reboundQr.programBeneficiaryId, newPb.id);

  // c) Monitoring endpoint shows the completed replacement details
  const monRes = await monitoringRoute.GET(new Request(`http://synthetic.test/api/v1/stub-distribution/monitoring?programId=${program.id}`));
  assert.equal(monRes.status, 200);
  const monBody = await monRes.json();
  assert.equal(monBody.summary.totalBeneficiaries, 1);
  assert.equal(monBody.summary.totalConfirmed, 1);
  assert.equal(monBody.summary.totalFlaggedReplacement, 1);
  assert.equal(monBody.beneficiaries[0].fullName, "RAMOS, JUAN DELA CRUZ");
  assert.equal(monBody.beneficiaries[0].originalBeneficiaryName, "CRUZ, MARILYN RITUAL");
  assert.equal(monBody.beneficiaries[0].dependentFullName, "RAMOS, ELENA GARCIA");
  assert.equal(monBody.beneficiaries[0].isCompletedReplacement, true);

  console.log("PASS: stub distribution replacement, eligibility check, original beneficiary birthday consent & 4-ID capture verified");
} finally {
  await db?.$disconnect().catch(() => {});
  if (started) {
    try {
      run(path.join(pgBin, "pg_ctl" + suffix), ["-D", dataDir, "-m", "immediate", "-w", "stop"]);
    } catch {}
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
}
