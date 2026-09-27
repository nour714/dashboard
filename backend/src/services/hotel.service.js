/**
 * AfricaTravel — Hotel Booking Service
 */

import { getPrismaClient } from '../config/database.js';
import { NotFoundError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';
import { generateHotelBookingDetails, generateReferenceCodes, calculateNights } from './hotel-ai.service.js';
import { PythonScraperService } from './python-scraper.service.js';

export const HotelService = {
  /**
   * Generate realistic hotel booking details using live Python scraper with AI/curated fallback
   */
  async generateAi(data) {
    const { clientName, country, checkIn, checkOut, customerId } = data;
    const nights = calculateNights(checkIn, checkOut);
    const { bookingReference, confirmationNumber } = generateReferenceCodes();

    // 1. Prioritize Python Live Scraper (real Booking.com accommodation)
    try {
      const liveHotel = await PythonScraperService.scrapeLiveHotel({
        destination: country,
        checkIn,
        checkOut
      });

      if (liveHotel && liveHotel.hotelName) {
        const bNum = liveHotel.bookingNumber || `${Math.floor(1000 + Math.random() * 9000)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}`;
        const pin = liveHotel.pinCode || `${Math.floor(1000 + Math.random() * 9000)}`;

        return {
          bookingReference,
          confirmationNumber,
          bookingNumber: bNum,
          pinCode: pin,
          clientName: clientName.trim(),
          customerId: customerId || null,
          hotelName: liveHotel.hotelName,
          hotelStars: liveHotel.hotelStars || 5,
          hotelAddress: liveHotel.hotelAddress || `City Center, ${country}`,
          hotelPhone: liveHotel.hotelPhone || '+971 4 430 4528',
          city: liveHotel.city || country,
          country: liveHotel.country || country,
          checkIn: new Date(checkIn).toISOString(),
          checkOut: new Date(checkOut).toISOString(),
          nights,
          roomType: liveHotel.roomType || 'Deluxe King Room',
          boardBasis: liveHotel.boardBasis || 'Breakfast included',
          price: liveHotel.price || 'US$ 450',
          reviewScore: liveHotel.reviewScore || '9.0 Superb · 2,840 reviews',
          hotelImage: liveHotel.hotelImage || '',
          guests: '1 Adult',
          checkInTime: liveHotel.checkInTime || '15:00',
          checkOutTime: liveHotel.checkOutTime || '12:00',
          amenities: Array.isArray(liveHotel.amenities) && liveHotel.amenities.length > 0
            ? liveHotel.amenities
            : ['Free high-speed WiFi', 'Air conditioning', 'Private bathroom', 'Flat-screen TV'],
          specialRequests: liveHotel.specialRequests || 'Non-smoking room, high floor requested',
          cancellationPolicy: liveHotel.cancellationPolicy || 'Free cancellation anytime up to 48 hours before check-in.',
          paymentStatus: liveHotel.paymentStatus || 'Paid online',
          status: 'CONFIRMED',
          source: 'BOOKING_LIVE',
          provider: 'PYTHON_SCRAPER',
          generatedByAi: false
        };
      }
    } catch (scraperErr) {
      console.warn('[HotelService] Python live scraper failed, proceeding to fallback:', scraperErr.message);
    }

    // 2. Seamless fallback to Gemini AI / Curated catalog
    const generated = await generateHotelBookingDetails({
      clientName,
      country,
      checkIn,
      checkOut,
      customerId
    });
    return generated;
  },

  /**
   * Save a hotel booking to the database
   */
  async createBooking(data, currentUser = {}) {
    const prisma = getPrismaClient();

    const inDate = new Date(data.checkIn);
    const outDate = new Date(data.checkOut);
    const nights = data.nights || calculateNights(data.checkIn, data.checkOut);
    const codes = generateReferenceCodes();

    const bookingReference = data.bookingReference || codes.bookingReference;
    const confirmationNumber = data.confirmationNumber || codes.confirmationNumber;

    // Optional customer link: if customerId not provided, search by exact name
    let resolvedCustomerId = data.customerId || null;
    if (!resolvedCustomerId && data.clientName) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          name: { equals: data.clientName.trim(), mode: 'insensitive' },
          deletedAt: null
        }
      });
      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
      }
    }

    const booking = await prisma.hotelBooking.create({
      data: {
        bookingReference,
        confirmationNumber,
        clientName: data.clientName.trim(),
        customerId: resolvedCustomerId,
        hotelName: data.hotelName.trim(),
        hotelStars: data.hotelStars || 5,
        hotelAddress: data.hotelAddress || null,
        city: data.city.trim(),
        country: data.country.trim(),
        checkIn: inDate,
        checkOut: outDate,
        nights,
        roomType: data.roomType || 'Standard Double Room',
        boardBasis: data.boardBasis || 'Bed & Breakfast',
        guests: data.guests || '1 Guest',
        specialRequests: data.specialRequests || null,
        notes: data.notes || null,
        status: data.status || 'CONFIRMED',
        createdBy: currentUser?.name || currentUser?.email || 'Staff',
        createdById: currentUser?.id || null
      },
      include: {
        customer: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Record audit log
    try {
      await AuditService.recordLog({
        user: currentUser?.name || 'Staff',
        userId: currentUser?.id || null,
        action: 'HOTEL_BOOKING_CREATED',
        customerId: resolvedCustomerId,
        description: `Created hotel booking ${booking.bookingReference} for ${booking.clientName} at ${booking.hotelName}`
      });
    } catch (auditErr) {
      console.warn('[HotelService] Audit logging failed:', auditErr.message);
    }

    return booking;
  },

  /**
   * List hotel bookings with pagination and filters
   */
  async listBookings(query = {}) {
    const prisma = getPrismaClient();
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '25', 10)));
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: null
    };

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { clientName: { contains: s, mode: 'insensitive' } },
        { hotelName: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { country: { contains: s, mode: 'insensitive' } },
        { bookingReference: { contains: s, mode: 'insensitive' } },
        { confirmationNumber: { contains: s, mode: 'insensitive' } }
      ];
    }

    if (query.country) {
      where.country = { contains: query.country.trim(), mode: 'insensitive' };
    }

    if (query.status) {
      where.status = query.status.trim();
    }

    const [totalCount, bookings] = await Promise.all([
      prisma.hotelBooking.count({ where }),
      prisma.hotelBooking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true }
          },
          user: {
            select: { id: true, name: true }
          }
        }
      })
    ]);

    return {
      items: bookings,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1
      }
    };
  },

  /**
   * Get single booking by ID
   */
  async getBookingById(id) {
    const prisma = getPrismaClient();
    const booking = await prisma.hotelBooking.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!booking) {
      throw new NotFoundError(`Hotel booking with ID "${id}" was not found.`);
    }

    return booking;
  },

  /**
   * Soft delete a booking
   */
  async deleteBooking(id, currentUser = {}) {
    const prisma = getPrismaClient();
    const existing = await prisma.hotelBooking.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundError(`Hotel booking with ID "${id}" was not found.`);
    }

    const updated = await prisma.hotelBooking.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    try {
      await AuditService.recordLog({
        user: currentUser?.name || 'Staff',
        userId: currentUser?.id || null,
        action: 'HOTEL_BOOKING_DELETED',
        description: `Deleted hotel booking ${existing.bookingReference} for ${existing.clientName}`
      });
    } catch (auditErr) {
      console.warn('[HotelService] Audit logging failed:', auditErr.message);
    }

    return updated;
  }
};
