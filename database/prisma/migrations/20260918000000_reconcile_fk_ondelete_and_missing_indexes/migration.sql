-- AfricaTravel — Reconcile schema.prisma drift from commit 6b0dc14
--
-- CONTEXT: Commit 6b0dc14 ("comprehensive full-stack remediation and hardening")
-- changed schema.prisma to (a) set ON DELETE RESTRICT on Payment/Modification/Refund
-- -> Ticket relations (financial records must never cascade-delete with their
-- ticket) and (b) add several @@index declarations for common query paths, but no
-- migration file was ever generated for that change — CI only ran `prisma db push`,
-- which silently applied the drift there while `migrate deploy` never caught up.
-- This migration closes that gap so `schema.prisma` and the migration history
-- match exactly (verified with `prisma migrate diff`). Idempotent: safe to apply to
-- databases that already have this drift applied via `db push`.

-- Financial records (payments/modifications/refunds) must block ticket deletion
-- instead of cascading, matching schema.prisma's onDelete: Restrict.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_ticketId_fkey') THEN
    ALTER TABLE "payments" DROP CONSTRAINT "payments_ticketId_fkey";
  END IF;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modifications_ticketId_fkey') THEN
    ALTER TABLE "modifications" DROP CONSTRAINT "modifications_ticketId_fkey";
  END IF;
  ALTER TABLE "modifications" ADD CONSTRAINT "modifications_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_ticketId_fkey') THEN
    ALTER TABLE "refunds" DROP CONSTRAINT "refunds_ticketId_fkey";
  END IF;
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

-- The remaining SET NULL / CASCADE relations were unchanged by 6b0dc14, but
-- schema.prisma's `db push` history had also detached and reattached them without
-- a migration; re-declare them so a fresh `migrate deploy` chain matches exactly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_createdById_fkey') THEN
    ALTER TABLE "tickets" DROP CONSTRAINT "tickets_createdById_fkey";
  END IF;
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_addedById_fkey') THEN
    ALTER TABLE "payments" DROP CONSTRAINT "payments_addedById_fkey";
  END IF;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_addedById_fkey"
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modifications_processedById_fkey') THEN
    ALTER TABLE "modifications" DROP CONSTRAINT "modifications_processedById_fkey";
  END IF;
  ALTER TABLE "modifications" ADD CONSTRAINT "modifications_processedById_fkey"
    FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_processedById_fkey') THEN
    ALTER TABLE "refunds" DROP CONSTRAINT "refunds_processedById_fkey";
  END IF;
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processedById_fkey"
    FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_userId_fkey') THEN
    ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";
  END IF;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- Missing indexes present in schema.prisma but never captured in a migration.
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_ticketId_idx" ON "audit_logs"("ticketId");
CREATE INDEX IF NOT EXISTS "audit_logs_customerId_idx" ON "audit_logs"("customerId");
CREATE INDEX IF NOT EXISTS "expenses_deletedAt_idx" ON "expenses"("deletedAt");
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");
CREATE INDEX IF NOT EXISTS "refunds_processedById_idx" ON "refunds"("processedById");
CREATE INDEX IF NOT EXISTS "tickets_customerId_idx" ON "tickets"("customerId");

-- Redundant plain indexes superseded by earlier partial-unique / composite indexes.
DROP INDEX IF EXISTS "customers_passport_idx";
DROP INDEX IF EXISTS "tickets_pnr_idx";

-- Finalize "lastActive" to match schema.prisma exactly.
--
-- schema.prisma declares `lastActive DateTime? @default(now())` with no
-- `@db.Timestamptz` annotation, so Prisma's own default native-type mapping (and
-- therefore `db push`, used by this repo's CI and every environment that has never
-- run `migrate deploy`) produces "timestamp(3) without time zone" — never
-- TIMESTAMPTZ. Migration 20260903010000 cast the column to TIMESTAMPTZ while
-- "reconciling changes hotfixed directly in production", which itself drifted from
-- schema.prisma. Cast back to TIMESTAMP(3) so a `migrate deploy` chain produces the
-- identical column type `db push` already produces everywhere else, and set the
-- schema-declared default.
ALTER TABLE "users"
  ALTER COLUMN "lastActive" TYPE TIMESTAMP(3) USING "lastActive"::timestamp(3),
  ALTER COLUMN "lastActive" SET DEFAULT CURRENT_TIMESTAMP;
