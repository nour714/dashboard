-- DropIndex
DROP INDEX IF EXISTS "tickets_pnr_key";

-- CreateIndex (Partial unique index — active tickets only)
CREATE UNIQUE INDEX "tickets_pnr_active_unique" ON "tickets" ("pnr") WHERE "deletedAt" IS NULL;
