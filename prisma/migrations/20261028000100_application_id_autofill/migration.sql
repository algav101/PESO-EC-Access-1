-- Additive migration for online ID autofill and staff walk-in encoding.
-- Existing roster rows and import/export fields are intentionally preserved.
ALTER TABLE "TupadApplicationRoster"
  ADD COLUMN "applicationCode" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN "submissionStatus" TEXT NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN "email" TEXT,
  ADD COLUMN "applicantAge" INTEGER,
  ADD COLUMN "sex" TEXT,
  ADD COLUMN "typeOfBeneficiary" TEXT,
  ADD COLUMN "disability" TEXT,
  ADD COLUMN "occupations" JSONB,
  ADD COLUMN "occupationOther" TEXT,
  ADD COLUMN "monthlyIncomeAmount" DECIMAL(12,2),
  ADD COLUMN "employmentInterest" TEXT,
  ADD COLUMN "skillsTraining" JSONB,
  ADD COLUMN "skillsTrainingOther" TEXT,
  ADD COLUMN "dependentGivenName" TEXT,
  ADD COLUMN "dependentMiddleName" TEXT,
  ADD COLUMN "dependentLastName" TEXT,
  ADD COLUMN "dependentExtensionName" TEXT,
  ADD COLUMN "dependentBirthDate" TEXT,
  ADD COLUMN "dependentAgeValue" INTEGER,
  ADD COLUMN "medicalReminderAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "fieldSources" JSONB,
  ADD COLUMN "ocrMetadata" JSONB,
  ADD COLUMN "duplicateWarning" JSONB,
  ADD COLUMN "encodedById" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3);

UPDATE "TupadApplicationRoster"
SET "source" = CASE
  WHEN "batchName" = 'Online TUPAD Application Portal' THEN 'ONLINE'
  ELSE 'IMPORT'
END,
"submittedAt" = "updatedAt";

CREATE UNIQUE INDEX "TupadApplicationRoster_applicationCode_key"
  ON "TupadApplicationRoster"("applicationCode");
CREATE UNIQUE INDEX "TupadApplicationRoster_idempotencyKey_key"
  ON "TupadApplicationRoster"("idempotencyKey");
CREATE INDEX "TupadApplicationRoster_source_submissionStatus_idx"
  ON "TupadApplicationRoster"("source", "submissionStatus");
CREATE INDEX "TupadApplicationRoster_encodedById_idx"
  ON "TupadApplicationRoster"("encodedById");
CREATE INDEX "TupadApplicationRoster_submittedAt_idx"
  ON "TupadApplicationRoster"("submittedAt");

ALTER TABLE "TupadApplicationRoster"
  ADD CONSTRAINT "TupadApplicationRoster_encodedById_fkey"
  FOREIGN KEY ("encodedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TupadApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "storageBucket" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TupadApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- Documents are served only through the authenticated server download route.
ALTER TABLE "TupadApplicationDocument" ENABLE ROW LEVEL SECURITY;
-- The app uses server-side Prisma and its own signed role sessions. Supabase
-- Data API client roles must not bypass the application admin/encoder checks.
ALTER TABLE "TupadApplicationRoster" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TupadApplicationRoster", "TupadApplicationDocument" FROM anon, authenticated;

CREATE INDEX "TupadApplicationDocument_applicationId_fieldName_idx"
  ON "TupadApplicationDocument"("applicationId", "fieldName");
CREATE INDEX "TupadApplicationDocument_uploadedById_idx"
  ON "TupadApplicationDocument"("uploadedById");

ALTER TABLE "TupadApplicationDocument"
  ADD CONSTRAINT "TupadApplicationDocument_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "TupadApplicationRoster"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TupadApplicationDocument"
  ADD CONSTRAINT "TupadApplicationDocument_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
