-- DropIndex
DROP INDEX IF EXISTS "tickets_ticketNumber_key";

-- CreateIndex (Partial unique index — active tickets only)
CREATE UNIQUE INDEX "tickets_ticketNumber_active_unique" ON "tickets" ("ticketNumber") WHERE "deletedAt" IS NULL;
