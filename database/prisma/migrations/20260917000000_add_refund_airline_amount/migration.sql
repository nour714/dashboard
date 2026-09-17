-- AlterTable
ALTER TABLE "refunds" ADD COLUMN IF NOT EXISTS "airlineRefundAmount" DECIMAL(12,2) DEFAULT 0;
