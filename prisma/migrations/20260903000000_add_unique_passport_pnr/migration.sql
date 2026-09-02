-- Step 1: Handle duplicate passport values before adding UNIQUE constraint
-- Append customer ID to duplicate passports to make them unique (does not delete any customer)
WITH dups AS (
  SELECT id, passport, ROW_NUMBER() OVER (PARTITION BY passport ORDER BY "createdAt" ASC) as rn
  FROM "customers"
  WHERE passport IS NOT NULL AND passport != ''
)
UPDATE "customers" SET passport = "customers".passport || '-DUP-' || "customers".id
FROM dups
WHERE "customers".id = dups.id AND dups.rn > 1;

-- Step 2: Handle duplicate PNR values before adding UNIQUE constraint
-- Append ticket ID to duplicate PNRs to make them unique (does not delete any ticket)
WITH dups AS (
  SELECT id, pnr, ROW_NUMBER() OVER (PARTITION BY pnr ORDER BY "createdAt" ASC) as rn
  FROM "tickets"
  WHERE pnr IS NOT NULL AND pnr != ''
)
UPDATE "tickets" SET pnr = "tickets".pnr || '-DUP-' || "tickets".id
FROM dups
WHERE "tickets".id = dups.id AND dups.rn > 1;

-- Step 3: Drop the old passport index (replaced by unique constraint)
DROP INDEX IF EXISTS "customers_passport_idx";

-- Step 4: Drop the old pnr index (replaced by unique constraint)
DROP INDEX IF EXISTS "tickets_pnr_idx";

-- Step 5: Make pnr column nullable (it was NOT NULL before)
ALTER TABLE "tickets" ALTER COLUMN "pnr" DROP NOT NULL;

-- Step 6: Add unique constraints
CREATE UNIQUE INDEX "customers_passport_key" ON "customers"("passport");
CREATE UNIQUE INDEX "tickets_pnr_key" ON "tickets"("pnr");
