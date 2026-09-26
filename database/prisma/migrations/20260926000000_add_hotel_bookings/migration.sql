-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "confirmationNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "customerId" TEXT,
    "hotelName" TEXT NOT NULL,
    "hotelStars" INTEGER NOT NULL DEFAULT 5,
    "hotelAddress" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "roomType" TEXT NOT NULL DEFAULT 'Standard Double Room',
    "boardBasis" TEXT NOT NULL DEFAULT 'Bed & Breakfast',
    "guests" TEXT NOT NULL DEFAULT '1 Guest',
    "specialRequests" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_bookingReference_key" ON "hotel_bookings"("bookingReference");

-- CreateIndex
CREATE INDEX "hotel_bookings_createdById_idx" ON "hotel_bookings"("createdById");

-- CreateIndex
CREATE INDEX "hotel_bookings_customerId_idx" ON "hotel_bookings"("customerId");

-- CreateIndex
CREATE INDEX "hotel_bookings_deletedAt_idx" ON "hotel_bookings"("deletedAt");

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
