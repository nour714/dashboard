/**
 * AfricaTravel — Hotel Booking Service
 */

import { getPrismaClient } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';
import { generateHotelBookingDetails, generateReferenceCodes, calculateNights } from './hotel-ai.service.js';
import { OpenHotelService } from './open-hotel.service.js';
import { RapidApiBookingService, generateHotelPhone } from './rapidapi-booking.service.js';

export const HotelService = {
  /**
   * Generate realistic hotel booking details using live RapidAPI Booking.com, Python scraper, or AI/curated fallback
   */
  async generateAi(data) {
    const { clientName, country, checkIn, checkOut, customerId } = data;
    const nights = calculateNights(checkIn, checkOut);
    const { bookingReference, confirmationNumber } = generateReferenceCodes();

    console.log('[HotelService] Searching via OpenStreetMap (primary)...');

    // 1. Primary: OpenStreetMap (Overpass API)
    try {
      const osmHotel = await OpenHotelService.fetchHotel({
        destination: country,
        checkIn,
        checkOut
      });

      if (osmHotel && osmHotel.hotelName) {
        return {
          bookingReference,
          confirmationNumber,
          bookingNumber: osmHotel.bookingNumber || `${Math.floor(1000 + Math.random() * 9000)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}`,
          pinCode: osmHotel.pinCode || `${Math.floor(1000 + Math.random() * 9000)}`,
          clientName: clientName.trim(),
          customerId: customerId || null,
          hotelName: osmHotel.hotelName,
          hotelStars: osmHotel.hotelStars || 5,
          hotelAddress: osmHotel.hotelAddress || `City Center, ${country}`,
          hotelPhone: osmHotel.hotelPhone || generateHotelPhone(country, osmHotel.hotelName),
          latitude: osmHotel.latitude || null,
          longitude: osmHotel.longitude || null,
          gpsCoordinates: osmHotel.gpsCoordinates || null,
          city: osmHotel.city || country,
          country: osmHotel.country || country,
          checkIn: new Date(checkIn).toISOString(),
          checkOut: new Date(checkOut).toISOString(),
          nights,
          roomType: osmHotel.roomType || 'Deluxe King Room',
          boardBasis: osmHotel.boardBasis || 'Breakfast included',
          price: osmHotel.price || 'US$ 450',
          reviewScore: osmHotel.reviewScore || '9.0 Superb · 2,840 reviews',
          hotelImage: osmHotel.hotelImage || '',
          guests: '1 Adult',
          checkInTime: osmHotel.checkInTime || '15:00',
          checkOutTime: osmHotel.checkOutTime || '12:00',
          amenities: Array.isArray(osmHotel.amenities) && osmHotel.amenities.length > 0
            ? osmHotel.amenities
            : ['Free high-speed WiFi', 'Air conditioning', 'Private bathroom', 'Flat-screen TV'],
          specialRequests: osmHotel.specialRequests || 'Non-smoking room, high floor requested',
          cancellationPolicy: osmHotel.cancellationPolicy || 'Free cancellation anytime up to 48 hours before check-in.',
          paymentStatus: osmHotel.paymentStatus || 'Paid online',
          status: 'CONFIRMED',
          source: 'OPENSTREETMAP',
          provider: osmHotel.provider || 'OSM_NOMINATIM',
          generatedByAi: false
        };
      }
    } catch (osmErr) {
      console.warn('[HotelService] OpenStreetMap call failed:', osmErr.message);
    }

    // 2. Secondary fallback: RapidAPI Booking.com
    try {
      const rapidHotel = await RapidApiBookingService.fetchLiveHotel({
        destination: country,
        checkIn,
        checkOut
      });

      if (rapidHotel && rapidHotel.hotelName) {
        return {
          bookingReference,
          confirmationNumber,
          bookingNumber: rapidHotel.bookingNumber,
          pinCode: rapidHotel.pinCode,
          clientName: clientName.trim(),
          customerId: customerId || null,
          hotelName: rapidHotel.hotelName,
          hotelStars: rapidHotel.hotelStars || 5,
          hotelAddress: rapidHotel.hotelAddress || `City Center, ${country}`,
          hotelPhone: rapidHotel.hotelPhone || generateHotelPhone(country, rapidHotel.hotelName),
          latitude: rapidHotel.latitude || null,
          longitude: rapidHotel.longitude || null,
          gpsCoordinates: rapidHotel.gpsCoordinates || null,
          city: rapidHotel.city || country,
          country: rapidHotel.country || country,
          checkIn: new Date(checkIn).toISOString(),
          checkOut: new Date(checkOut).toISOString(),
          nights,
          roomType: rapidHotel.roomType || 'Deluxe King Room',
          boardBasis: rapidHotel.boardBasis || 'Breakfast included',
          price: rapidHotel.price || 'US$ 450',
          reviewScore: rapidHotel.reviewScore || '9.0 Superb · 2,840 reviews',
          hotelImage: rapidHotel.hotelImage || '',
          guests: '1 Adult',
          checkInTime: rapidHotel.checkInTime || '15:00',
          checkOutTime: rapidHotel.checkOutTime || '12:00',
          amenities: rapidHotel.amenities || ['Free high-speed WiFi', 'Air conditioning', 'Private bathroom', 'Flat-screen TV'],
          specialRequests: rapidHotel.specialRequests || 'Non-smoking room, high floor requested',
          cancellationPolicy: rapidHotel.cancellationPolicy || 'Free cancellation anytime up to 48 hours before check-in.',
          paymentStatus: rapidHotel.paymentStatus || 'Paid online',
          status: 'CONFIRMED',
          source: 'BOOKING_LIVE',
          provider: 'RAPIDAPI_BOOKING',
          generatedByAi: false
        };
      }
    } catch (rapidErr) {
      console.warn('[HotelService] RapidAPI Booking.com call failed:', rapidErr.message);
    }

    // 3. Seamless fallback to Gemini AI / Curated catalog
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
   * Soft delete a booking (ADMIN only)
   */
  async deleteBooking(id, currentUser = {}) {
    const prisma = getPrismaClient();
    const existing = await prisma.hotelBooking.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundError(`Hotel booking with ID "${id}" was not found.`);
    }

    if (currentUser?.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can delete hotel bookings');
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
