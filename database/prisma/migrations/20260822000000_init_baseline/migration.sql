-- AfricaTravel — Initial Baseline Migration
--
-- CONTEXT: The original schema was created with `prisma db push` and no baseline
-- migration was ever committed, so the oldest migration in this repo began with
-- `ALTER TABLE "customers"` and `prisma migrate deploy` could never succeed against
-- a fresh database ("relation \"customers\" does not exist").
--
-- This migration reconstructs the schema as it existed immediately before the first
-- committed migration (20260823000000_add_customer_passport_document), so the full
-- migration chain replays correctly from an empty database.
--
-- Every statement is IDEMPOTENT (matching the convention already used by this repo's
-- later migrations) so it is also safe to apply to the existing production database
-- whose tables were created by `db push`. Applying it there is a no-op.
--
-- NOTE ON "lastActive": historically this column was created as
-- TEXT DEFAULT 'Just now'. The default is intentionally omitted here because
-- migration 20260903010000 converts the column to TIMESTAMPTZ, and PostgreSQL
-- refuses that conversion while a non-castable TEXT default is attached
-- ("default for column \"lastActive\" cannot be cast automatically"). Omitting the
-- default changes no data (a fresh database has no rows) and lets the documented
-- chain replay; the final schema default is declared in schema.prisma.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeStatus') THEN
    CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "title" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActive" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passport" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'Egyptian (EGY)',
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "memberSince" TEXT NOT NULL DEFAULT '2024',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "customer_notes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "pnr" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "passengerName" TEXT NOT NULL,
    "phone" TEXT,
    "passport" TEXT,
    "nationality" TEXT,
    "dob" TEXT,
    "email" TEXT,
    "airline" TEXT NOT NULL,
    "airlineCode" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "returnFlightNumber" TEXT,
    "origin" TEXT NOT NULL,
    "originTerminal" TEXT,
    "originAirportName" TEXT,
    "destination" TEXT NOT NULL,
    "destinationTerminal" TEXT,
    "destinationAirportName" TEXT,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "returnDepartureDate" TIMESTAMP(3),
    "returnArrivalDate" TIMESTAMP(3),
    "tripType" TEXT NOT NULL DEFAULT 'One Way',
    "flightDuration" TEXT,
    "cabinClass" TEXT NOT NULL DEFAULT 'Economy (Y)',
    "seat" TEXT,
    "baggage" TEXT,
    "ticketPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdBy" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "method" TEXT NOT NULL DEFAULT 'Credit Card',
    "reference" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL,
    "addedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "modifications" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalFlight" JSONB NOT NULL,
    "newFlight" JSONB NOT NULL,
    "changeFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "processedBy" TEXT NOT NULL,
    "processedById" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "refunds" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "originalAmount" DECIMAL(12,2),
    "totalPaid" DECIMAL(12,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT NOT NULL,
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ticketId" TEXT,
    "customerId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNumber_key" ON "tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_createdById_idx" ON "tickets"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_addedById_idx" ON "payments"("addedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "modifications_processedById_idx" ON "modifications"("processedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_notes_customerId_fkey') THEN
    ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_customerId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_createdById_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_ticketId_fkey') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_addedById_fkey') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_addedById_fkey"
      FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modifications_ticketId_fkey') THEN
    ALTER TABLE "modifications" ADD CONSTRAINT "modifications_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modifications_processedById_fkey') THEN
    ALTER TABLE "modifications" ADD CONSTRAINT "modifications_processedById_fkey"
      FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_ticketId_fkey') THEN
    ALTER TABLE "refunds" ADD CONSTRAINT "refunds_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_processedById_fkey') THEN
    ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processedById_fkey"
      FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_userId_fkey') THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_userId_fkey') THEN
    ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
