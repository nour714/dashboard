-- AfricaTravel — Financial Audit DB Constraints & Payment Classification Migration
-- Idempotent DDL: PaymentType enum, payment classification backfill, and financial CHECK constraints.

-- 1. Create PaymentType Enum
DO $$ BEGIN
  CREATE TYPE "PaymentType" AS ENUM ('TICKET', 'MODIFICATION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add type column to payments table with default TICKET
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "type" "PaymentType" NOT NULL DEFAULT 'TICKET';

-- 3. Backfill MODIFICATION payment types based on reference & notes pattern
UPDATE "payments"
SET "type" = 'MODIFICATION'
WHERE "type" = 'TICKET'
  AND (
    "reference" ~* '^Mod\s*#'
    OR "notes" ILIKE '%flight modification%'
    OR "notes" ILIKE '%تعديل الرحلة%'
  );

-- 4. Financial CHECK Constraints (Added NOT VALID first, then VALIDATED)

-- payments.amount > 0
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "chk_payments_amount_positive" CHECK ("amount" > 0) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "payments" VALIDATE CONSTRAINT "chk_payments_amount_positive";

-- refunds.amount > 0
DO $$ BEGIN
  ALTER TABLE "refunds" ADD CONSTRAINT "chk_refunds_amount_positive" CHECK ("amount" > 0) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "refunds" VALIDATE CONSTRAINT "chk_refunds_amount_positive";

-- expenses.amount > 0
DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_amount_positive" CHECK ("amount" > 0) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "expenses" VALIDATE CONSTRAINT "chk_expenses_amount_positive";

-- tickets.ticketPrice >= 0
DO $$ BEGIN
  ALTER TABLE "tickets" ADD CONSTRAINT "chk_tickets_price_non_negative" CHECK ("ticketPrice" >= 0) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "tickets" VALIDATE CONSTRAINT "chk_tickets_price_non_negative";

-- tickets.costPrice IS NULL OR >= 0
DO $$ BEGIN
  ALTER TABLE "tickets" ADD CONSTRAINT "chk_tickets_cost_price_bounds" CHECK ("costPrice" IS NULL OR "costPrice" >= 0) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "tickets" VALIDATE CONSTRAINT "chk_tickets_cost_price_bounds";

-- modifications.changeFee >= 0
DO $$ BEGIN
  ALTER TABLE "modifications" ADD CONSTRAINT "chk_modifications_change_fee_non_negative" CHECK ("changeFee" >= 0) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "modifications" VALIDATE CONSTRAINT "chk_modifications_change_fee_non_negative";

-- modifications.airlineFee >= 0
DO $$ BEGIN
  ALTER TABLE "modifications" ADD CONSTRAINT "chk_modifications_airline_fee_non_negative" CHECK ("airlineFee" >= 0) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "modifications" VALIDATE CONSTRAINT "chk_modifications_airline_fee_non_negative";
