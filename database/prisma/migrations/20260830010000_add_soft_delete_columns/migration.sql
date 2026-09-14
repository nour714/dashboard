-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN "deletedAt" TIMESTAMP(3);
