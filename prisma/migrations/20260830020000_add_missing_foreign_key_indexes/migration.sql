-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "modifications_processedById_idx" ON "modifications"("processedById");
CREATE INDEX IF NOT EXISTS "payments_addedById_idx" ON "payments"("addedById");
CREATE INDEX IF NOT EXISTS "tickets_createdById_idx" ON "tickets"("createdById");
