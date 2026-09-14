-- AfricaTravel - Add Unique Constraints on Customer.passport and Ticket.pnr
-- Preflight Integrity Check: Fail cleanly if duplicates exist without altering or deleting any data

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "customers"
    WHERE "passport" IS NOT NULL
      AND BTRIM("passport") <> ''
    GROUP BY "passport"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate customer passport values exist. Resolve them before applying the unique constraint.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "tickets"
    WHERE "pnr" IS NOT NULL
      AND BTRIM("pnr") <> ''
    GROUP BY "pnr"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate ticket PNR values exist. Resolve them before applying the unique constraint.';
  END IF;
END $$;

-- Drop redundant standard non-unique indexes if they exist (superseded by unique indexes)
DROP INDEX IF EXISTS "customers_passport_idx";
DROP INDEX IF EXISTS "tickets_pnr_idx";

-- Ensure pnr column in tickets is nullable (PostgreSQL allows multiple NULLs with UNIQUE constraints)
ALTER TABLE "tickets" ALTER COLUMN "pnr" DROP NOT NULL;

-- Create Unique Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "customers_passport_key" ON "customers"("passport");
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_pnr_key" ON "tickets"("pnr");
