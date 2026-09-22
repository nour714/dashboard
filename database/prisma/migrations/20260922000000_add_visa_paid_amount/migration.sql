-- AlterEnum
ALTER TYPE "VisaPaymentStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "visas" ADD COLUMN "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
