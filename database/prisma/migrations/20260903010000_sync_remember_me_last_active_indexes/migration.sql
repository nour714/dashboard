-- Reconcile schema changes hotfixed directly in production. Each statement is
-- safe to apply to an already-remediated database.

ALTER TABLE "refresh_tokens"
  ADD COLUMN IF NOT EXISTS "rememberMe" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'users'
      AND column_name = 'lastActive'
      AND data_type <> 'timestamp with time zone'
  ) THEN
    ALTER TABLE "users"
      ALTER COLUMN "lastActive" TYPE TIMESTAMPTZ
      USING "lastActive"::timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "customers_passport_idx" ON "customers"("passport");
CREATE INDEX IF NOT EXISTS "customers_deletedAt_idx" ON "customers"("deletedAt");
CREATE INDEX IF NOT EXISTS "tickets_pnr_idx" ON "tickets"("pnr");
CREATE INDEX IF NOT EXISTS "tickets_deletedAt_idx" ON "tickets"("deletedAt");
