-- CreateEnum
CREATE TYPE "VisaType" AS ENUM ('TOURIST', 'WORK', 'STUDY', 'UMRAH_HAJJ', 'MEDICAL');

-- CreateEnum
CREATE TYPE "VisaPaymentStatus" AS ENUM ('PAID', 'UNPAID');

-- CreateTable
CREATE TABLE "visas" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "phone" TEXT,
    "visaType" "VisaType" NOT NULL,
    "country" TEXT NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "paymentStatus" "VisaPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visas_createdById_idx" ON "visas"("createdById");

-- CreateIndex
CREATE INDEX "visas_visaType_idx" ON "visas"("visaType");

-- CreateIndex
CREATE INDEX "visas_deletedAt_idx" ON "visas"("deletedAt");

-- AddForeignKey
ALTER TABLE "visas" ADD CONSTRAINT "visas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
