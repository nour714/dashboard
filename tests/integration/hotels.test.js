/**
 * AfricaTravel — Hotels Feature & AI Integration Tests
 */

import { HotelService } from '../../backend/src/services/hotel.service.js';
import {
  generateHotelAiSchema,
  createHotelBookingSchema,
  queryHotelBookingsSchema
} from '../../backend/src/schemas/hotel.schema.js';
import { calculateNights, getCuratedFallback, generateReferenceCodes } from '../../backend/src/services/hotel-ai.service.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

async function runHotelTests() {
  console.log('\n🏨 ========================================================');
  console.log('   AfricaTravel Hotel Bookings & AI Verification Tests');
  console.log('========================================================\n');

  // Test Suite 1: Validation Schemas
  console.log('📋 Test Suite 1: Validation Schemas');

  const validAiInput = {
    clientName: 'Tarek Mahmoud',
    country: 'United Arab Emirates',
    checkIn: '2026-10-10',
    checkOut: '2026-10-15'
  };

  const aiParsed = generateHotelAiSchema.safeParse(validAiInput);
  assert(aiParsed.success, 'Valid AI generation input parses successfully');

  const invalidDates = {
    clientName: 'Tarek Mahmoud',
    country: 'UAE',
    checkIn: '2026-10-20',
    checkOut: '2026-10-10'
  };
  const invalidDateParsed = generateHotelAiSchema.safeParse(invalidDates);
  assert(!invalidDateParsed.success, 'Reject check-out date before check-in date');

  const missingName = {
    clientName: '',
    country: 'UAE',
    checkIn: '2026-10-10',
    checkOut: '2026-10-15'
  };
  const missingNameParsed = generateHotelAiSchema.safeParse(missingName);
  assert(!missingNameParsed.success, 'Reject empty client name');

  // Test Suite 2: AI & Calculation Utilities
  console.log('\n🧠 Test Suite 2: AI & Calculation Utilities');

  const nights = calculateNights('2026-10-10', '2026-10-15');
  assert(nights === 5, `Calculated 5 nights correctly (got ${nights})`);

  const sameDayNights = calculateNights('2026-10-10', '2026-10-10');
  assert(sameDayNights === 1, `Minimum nights boundary is 1 (got ${sameDayNights})`);

  const codes = generateReferenceCodes();
  assert(codes.bookingReference.startsWith('AT-HTL-'), `Booking reference format is AT-HTL-* (${codes.bookingReference})`);
  assert(codes.confirmationNumber.startsWith('CNF-'), `Confirmation number format is CNF-* (${codes.confirmationNumber})`);

  const dubaiHotel = getCuratedFallback('Dubai');
  assert(dubaiHotel.hotelStars === 5, `Curated Dubai fallback has 5 stars (hotel: ${dubaiHotel.hotelName})`);

  // Test Suite 3: Hotel AI Generation Service
  console.log('\n🤖 Test Suite 3: Hotel AI Generation Service');

  const generated = await HotelService.generateAi({
    clientName: 'Mahmoud Hassan',
    country: 'Paris, France',
    checkIn: '2026-11-01',
    checkOut: '2026-11-06'
  });

  assert(Boolean(generated.hotelName), `Generated hotel name: "${generated.hotelName}"`);
  assert(generated.hotelStars >= 4, `Hotel stars rating is prestigious (got ${generated.hotelStars} stars)`);
  assert(generated.nights === 5, `Stay nights matched: ${generated.nights}`);
  assert(Boolean(generated.bookingReference), `Booking reference generated: ${generated.bookingReference}`);
  assert(Boolean(generated.confirmationNumber), `Confirmation number generated: ${generated.confirmationNumber}`);
  assert(generated.clientName === 'Mahmoud Hassan', `Client name preserved: ${generated.clientName}`);

  // Test Suite 4: Database Operations (CRUD)
  console.log('\n💾 Test Suite 4: Database Operations');

  let createdBookingId = null;

  try {
    const newBooking = await HotelService.createBooking({
      clientName: 'Mahmoud Hassan',
      country: 'France',
      city: 'Paris',
      hotelName: generated.hotelName,
      hotelStars: generated.hotelStars,
      hotelAddress: generated.hotelAddress,
      bookingReference: generated.bookingReference,
      confirmationNumber: generated.confirmationNumber,
      checkIn: generated.checkIn,
      checkOut: generated.checkOut,
      nights: generated.nights,
      roomType: generated.roomType,
      boardBasis: generated.boardBasis,
      guests: '1 Adult'
    }, { name: 'Admin Tester', id: null });

    createdBookingId = newBooking.id;
    assert(Boolean(newBooking.id), `Hotel booking created with ID: ${newBooking.id}`);
    assert(newBooking.bookingReference === generated.bookingReference, 'Booking reference persisted correctly');

    // List bookings
    const list = await HotelService.listBookings({ search: 'Mahmoud Hassan' });
    assert(list.items.some(b => b.id === createdBookingId), 'Created booking found in search list');

    // Get by ID
    const single = await HotelService.getBookingById(createdBookingId);
    assert(single.id === createdBookingId, 'Single booking retrieved by ID');

    // Delete booking
    await HotelService.deleteBooking(createdBookingId, { name: 'Admin Tester' });
    const listAfterDelete = await HotelService.listBookings({ search: 'Mahmoud Hassan' });
    assert(!listAfterDelete.items.some(b => b.id === createdBookingId), 'Soft-deleted booking excluded from active list');
  } catch (dbErr) {
    assert(false, `Database operations failed: ${dbErr.message}`);
  }

  // Summary
  console.log('\n========================================================');
  console.log(`Hotel Tests Completed: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runHotelTests().catch(err => {
  console.error('Fatal error during hotel tests:', err);
  process.exit(1);
});
