-- Inactive/replaced enrolments remain available with their historical slot.
-- Active slots are unique per program; 001 and 1 identify the same numeric slot.
-- CREATE INDEX rejects pre-existing conflicts without deleting or changing data.
CREATE UNIQUE INDEX IF NOT EXISTS "ProgramBeneficiary_active_program_slot_key"
ON "ProgramBeneficiary" (
  "programId",
  (CASE WHEN "designatedNumber" ~ '^[0-9]+$'
    THEN COALESCE(NULLIF(ltrim("designatedNumber", '0'), ''), '0')
    ELSE "designatedNumber" END)
)
WHERE "participationStatus" IN ('ACTIVE', 'ENROLLED', 'FLAGGED_FOR_REPLACEMENT');
