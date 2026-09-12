-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_ticketId_idx" ON "payments"("ticketId");
CREATE INDEX IF NOT EXISTS "refunds_ticketId_idx" ON "refunds"("ticketId");
CREATE INDEX IF NOT EXISTS "modifications_ticketId_idx" ON "modifications"("ticketId");
CREATE INDEX IF NOT EXISTS "customer_notes_customerId_idx" ON "customer_notes"("customerId");
