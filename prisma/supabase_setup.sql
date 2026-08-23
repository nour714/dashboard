-- ========================================================
-- AfricaTravel — Supabase Complete Database Setup
-- 1. Create Enums & Tables
-- 2. Add Foreign Keys & Constraints
-- 3. Seed Initial Demo Data (Users, Customers, Tickets, Settings)
-- ========================================================

-- Create Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Tables
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "title" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActive" TEXT DEFAULT 'Just now',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passport" TEXT,
    "passportDocPath" TEXT,
    "passportDocUploadedAt" TIMESTAMP(3),
    "nationality" TEXT NOT NULL DEFAULT 'Egyptian (EGY)',
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "memberSince" TEXT NOT NULL DEFAULT '2024',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_notes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNumber_key" ON "tickets"("ticketNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- Performance Indexes on Foreign Keys
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "modifications_processedById_idx" ON "modifications"("processedById");
CREATE INDEX IF NOT EXISTS "payments_addedById_idx" ON "payments"("addedById");
CREATE INDEX IF NOT EXISTS "tickets_createdById_idx" ON "tickets"("createdById");

-- Foreign Keys
DO $$ BEGIN
  ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "modifications" ADD CONSTRAINT "modifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "modifications" ADD CONSTRAINT "modifications_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ========================================================
-- Seed Initial Demo Data
-- ========================================================

-- Settings
INSERT INTO "system_settings" ("id", "data", "updatedAt") 
VALUES ('default', '{"profile":{"name":"Mohamed Raafat","fullName":"Mohamed Raafat","email":"admin@africatravel.com","role":"Senior Operations Director","title":"Senior Operations Director","phone":"+20 100 000 1122"},"company":{"name":"AfricaTravel Travel Operations Ltd.","iataNumber":"12-3 4567 8","taxId":"EG-904-881-229","baseCurrency":"EGP","address":"14 Al-Thawra Street, Heliopolis, Cairo, Egypt","phone":"+20 2 2415 8800"},"currencies":["EGP","USD","EUR","SAR","AED"],"paymentMethods":["Cash","Credit Card","Bank Transfer","Vodafone Cash","InstaPay","Corporate Account"],"ticketStatuses":["CONFIRMED","PENDING PAY","PARTIALLY PAID","PAID","MODIFIED","REFUNDED","CANCELLED"],"notifications":{"emailOnNewTicket":true,"emailOnRefundRequest":true,"emailOnFlightDelay":true,"dailySummaryReport":true}}'::jsonb, NOW())
ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data";

-- Users (Password: password123)
INSERT INTO "users" ("id", "name", "email", "role", "title", "passwordHash", "status", "lastActive", "createdAt", "updatedAt") 
VALUES ('EMP-101', 'Mohamed Raafat', 'admin@africatravel.com', 'ADMIN', 'Senior Operations Director', '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', 'ACTIVE', 'Just now', NOW(), NOW()) 
ON CONFLICT ("id") DO UPDATE SET "passwordHash" = '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', "status" = 'ACTIVE';
INSERT INTO "users" ("id", "name", "email", "role", "title", "passwordHash", "status", "lastActive", "createdAt", "updatedAt") 
VALUES ('EMP-102', 'Ahmed Raafat', 'ahmed.r@africatravel.com', 'ADMIN', 'Senior Operations Manager', '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', 'ACTIVE', 'Just now', NOW(), NOW()) 
ON CONFLICT ("id") DO UPDATE SET "passwordHash" = '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', "status" = 'ACTIVE';
INSERT INTO "users" ("id", "name", "email", "role", "title", "passwordHash", "status", "lastActive", "createdAt", "updatedAt") 
VALUES ('EMP-103', 'Nour Wael', 'nour.w@africatravel.com', 'AGENT', 'Ticketing Officer', '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', 'ACTIVE', 'Just now', NOW(), NOW()) 
ON CONFLICT ("id") DO UPDATE SET "passwordHash" = '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', "status" = 'ACTIVE';
INSERT INTO "users" ("id", "name", "email", "role", "title", "passwordHash", "status", "lastActive", "createdAt", "updatedAt") 
VALUES ('EMP-104', 'Hashem Ahmed', 'hashem.a@africatravel.com', 'AGENT', 'Customer Operations Specialist', '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', 'ACTIVE', 'Just now', NOW(), NOW()) 
ON CONFLICT ("id") DO UPDATE SET "passwordHash" = '$2b$10$NwtYw1S7Glwpsuwt9wNR4OiFsuCGV7kQKnwU0ooXs6NrRgC9mXe.2', "status" = 'ACTIVE';

-- Customers
INSERT INTO "customers" ("id", "name", "email", "phone", "passport", "nationality", "isVip", "memberSince", "createdAt", "updatedAt") 
VALUES ('CUST-8924', 'Ahmed Mohamed', 'ahmed.m@example.com', '+20 100 123 4567', 'A12345678', 'Egyptian (EGY)', true, '2021', NOW(), NOW()) 
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "customers" ("id", "name", "email", "phone", "passport", "nationality", "isVip", "memberSince", "createdAt", "updatedAt") 
VALUES ('CUST-8925', 'Nourhan Adel', 'nourhan.adel@example.com', '+20 111 987 6543', 'A98765432', 'Egyptian (EGY)', false, '2022', NOW(), NOW()) 
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "customers" ("id", "name", "email", "phone", "passport", "nationality", "isVip", "memberSince", "createdAt", "updatedAt") 
VALUES ('CUST-8926', 'Tarek Mahmoud', 'tarek.m@example.com', '+20 122 345 6789', 'A55443322', 'Egyptian (EGY)', false, '2023', NOW(), NOW()) 
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "customers" ("id", "name", "email", "phone", "passport", "nationality", "isVip", "memberSince", "createdAt", "updatedAt") 
VALUES ('CUST-8927', 'Sarah Jenkins', 'sarah.j@globex.com', '+1 (555) 345-6789', 'P98472910', 'American (USA)', true, '2020', NOW(), NOW()) 
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "customers" ("id", "name", "email", "phone", "passport", "nationality", "isVip", "memberSince", "createdAt", "updatedAt") 
VALUES ('CUST-8928', 'Eleanor Vance', 'eleanor.v@example.com', '+44 20 7946 0912', 'GB8823419', 'British (GBR)', false, '2023', NOW(), NOW()) 
ON CONFLICT ("id") DO NOTHING;
