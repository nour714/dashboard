/**
 * AfricaTravel - Flight Departure-Only, Automatic Round Trip & Simplified Fields Tests
 */

import { createTicketSchema, updateTicketSchema } from '../server/src/schemas/ticket.schema.js';
import { en } from '../js/i18n/locales/en.js';
import { ar } from '../js/i18n/locales/ar.js';
import { i18n } from '../js/i18n/i18n.js';
import { TicketCreatePage } from '../js/pages/ticket-create.js';
import { renderOverviewTab } from '../js/pages/ticket-details/overview-tab.js';
import { escapeHtml } from '../js/utils/security.js';

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

async function runRoundTripTests() {
  console.log('\n✈️ ========================================================');
  console.log('   Simplified Flight Fields & Automatic Round Trip Tests');
  console.log('========================================================\n');

  // --- 1. Backend Schema Validation: Flight Number & PNR ---
  console.log('--- 1. Backend Schema Validation: Flight Number & Departure Only ---');

  const validOneWayWithoutArrival = {
    passengerName: 'Hassan Ali',
    pnr: 'AB12CD',
    airline: 'EgyptAir',
    airlineCode: 'MS',
    flightNumber: 'MS 986',
    origin: 'CAI',
    destination: 'DXB',
    departureDate: '2026-09-15T08:00',
    // arrivalDate omitted completely
    tripType: 'One Way',
    ticketPrice: 12500,
    costPrice: 10000
  };

  const oneWayResult = createTicketSchema.safeParse(validOneWayWithoutArrival);
  assert(oneWayResult.success === true, 'One Way ticket WITHOUT arrivalDate passes validation');

  // Missing flightNumber is now optional and passes validation
  const missingFlightNum = { ...validOneWayWithoutArrival, flightNumber: undefined };
  const missingFlightNumResult = createTicketSchema.safeParse(missingFlightNum);
  assert(missingFlightNumResult.success === true, 'Ticket without flightNumber passes validation');

  // Empty flightNumber is permitted
  const emptyFlightNum = { ...validOneWayWithoutArrival, flightNumber: '' };
  const emptyFlightNumResult = createTicketSchema.safeParse(emptyFlightNum);
  assert(emptyFlightNumResult.success === true, 'Ticket with empty flightNumber passes validation');

  // Missing pnr is now optional and passes validation
  const missingPnr = { ...validOneWayWithoutArrival, pnr: undefined };
  const missingPnrResult = createTicketSchema.safeParse(missingPnr);
  assert(missingPnrResult.success === true, 'Ticket without pnr passes validation');

  // --- 2. Zod Schema Validation: Flexible Round Trip superRefine ---
  console.log('\n--- 2. Backend Schema: Flexible Round Trip superRefine Enforcement ---');

  // Test 2.1: Ticket with empty returnDepartureDate -> passes as One Way
  const oneWayEmptyReturn = {
    ...validOneWayWithoutArrival,
    returnDepartureDate: undefined,
    returnFlightNumber: undefined
  };
  const oneWayEmptyReturnResult = createTicketSchema.safeParse(oneWayEmptyReturn);
  assert(oneWayEmptyReturnResult.success === true, 'Ticket with empty returnDepartureDate passes validation as One Way');

  // Test 2.2: Ticket with returnDepartureDate (WITHOUT returnArrivalDate) -> succeeds
  const validRoundTripWithoutArrivals = {
    ...validOneWayWithoutArrival,
    tripType: 'Round Trip',
    departureDate: '2026-09-15T08:00',
    returnFlightNumber: 'MS 987',
    returnDepartureDate: '2026-09-22T14:00'
    // returnArrivalDate and arrivalDate both omitted
  };
  const validRoundTripResult = createTicketSchema.safeParse(validRoundTripWithoutArrivals);
  assert(validRoundTripResult.success === true, 'Round Trip ticket without returnArrivalDate passes validation');

  // Test 2.3: Ticket with returnDepartureDate BEFORE departureDate -> rejected with correct error
  const invalidReturnBeforeDeparture = {
    ...validOneWayWithoutArrival,
    departureDate: '2026-09-15T08:00',
    returnFlightNumber: 'MS 987',
    returnDepartureDate: '2026-09-10T14:00'
  };
  const invalidReturnBeforeDepartureResult = createTicketSchema.safeParse(invalidReturnBeforeDeparture);
  assert(invalidReturnBeforeDepartureResult.success === false, 'Ticket with returnDepartureDate before departureDate is rejected');
  assert(
    invalidReturnBeforeDepartureResult.error?.issues.some(i => i.path.includes('returnDepartureDate') && i.message.includes('Return departure date must be after')),
    'Issue reported for returnDepartureDate before departureDate with correct message'
  );

  // Test 2.4: Ticket with returnDepartureDate provided and returnFlightNumber empty/missing -> succeeds
  const missingReturnFlightNum = {
    ...validOneWayWithoutArrival,
    departureDate: '2026-09-15T08:00',
    returnDepartureDate: '2026-09-22T14:00',
    returnFlightNumber: ''
  };
  const missingReturnFlightNumResult = createTicketSchema.safeParse(missingReturnFlightNum);
  assert(missingReturnFlightNumResult.success === true, 'Ticket with returnDepartureDate and empty returnFlightNumber passes validation');

  // --- 3. Frontend HTML Template Verification ---
  console.log('\n--- 3. Frontend Form Structure (ticket-create.js) ---');

  const formHtml = TicketCreatePage.render();

  assert(formHtml.includes('id="flight-number"'), 'Form contains #flight-number input field');
  assert(!formHtml.includes('id="trip-type"'), 'Form does NOT contain #trip-type dropdown (removed)');
  assert(!formHtml.includes('id="flight-cabin-class"'), 'Form does NOT contain #flight-cabin-class select (removed)');
  assert(!formHtml.includes('id="flight-arr-date"'), 'Form does NOT contain #flight-arr-date input (removed)');
  assert(!formHtml.includes('id="return-arr-date"'), 'Form does NOT contain #return-arr-date input (removed)');
  assert(!formHtml.includes('id="flight-seat"'), 'Form does NOT contain #flight-seat input (removed)');
  assert(formHtml.includes('id="flight-dep-date"'), 'Form contains #flight-dep-date input field');
  assert(formHtml.includes('id="return-flight-number"'), 'Return flight section contains #return-flight-number input');
  assert(formHtml.includes('id="return-dep-date"'), 'Return flight section contains #return-dep-date input');
  assert(
    formHtml.includes(escapeHtml(en.ticketCreate.returnFlight.optionalHint)),
    'Return flight card contains optional hint text'
  );

  // --- 4. Ticket Details Overview Tab Verification & Backward Compatibility ---
  console.log('\n--- 4. Ticket Details Overview Tab Round Trip & Backward Compatibility ---');

  const oldRoundTripTicketWithArrivalAndCabin = {
    id: 'TK-10099',
    passengerName: 'Mona Youssef',
    tripType: 'Round Trip',
    origin: 'CAI',
    destination: 'LHR',
    flightNumber: 'MS 777',
    departureDate: '2026-10-01T09:00:00Z',
    arrivalDate: '2026-10-01T13:45:00Z',
    returnFlightNumber: 'MS 778',
    returnDepartureDate: '2026-10-10T15:00:00Z',
    returnArrivalDate: '2026-10-10T19:30:00Z',
    cabinClass: 'Business (J)',
    ticketPrice: 24000,
    currency: 'EGP',
    status: 'CONFIRMED'
  };

  const oldTicketHtml = renderOverviewTab(oldRoundTripTicketWithArrivalAndCabin);
  assert(oldTicketHtml.includes('MS 778'), 'Overview tab renders returnFlightNumber for old Round Trip ticket');
  assert(oldTicketHtml.includes('Return Flight'), 'Overview tab renders Return Flight section title');
  assert(oldTicketHtml.includes('Business (J)'), 'Overview tab correctly renders existing cabinClass');

  const newTicketWithoutArrivalAndCabin = {
    id: 'TK-10100',
    passengerName: 'Kareem Tarek',
    tripType: 'One Way',
    origin: 'CAI',
    destination: 'JED',
    flightNumber: 'MS 660',
    departureDate: '2026-10-05T10:00:00Z',
    arrivalDate: null,
    returnFlightNumber: null,
    returnDepartureDate: null,
    returnArrivalDate: null,
    cabinClass: null,
    ticketPrice: 8500,
    currency: 'EGP',
    status: 'CONFIRMED'
  };

  const newTicketHtml = renderOverviewTab(newTicketWithoutArrivalAndCabin);
  assert(newTicketHtml.includes('MS 660'), 'Overview tab renders flight number for new ticket');
  assert(!newTicketHtml.includes('MS 778'), 'Overview tab does not render return leg for one way');
  assert(newTicketHtml.includes('--:--'), 'Overview tab gracefully displays --:-- when arrivalDate is null');

  // --- 5. i18n Bilingual Verification ---
  console.log('\n--- 5. i18n Bilingual Translations Verification ---');

  assert(en.ticketCreate.flightInfo.departureDate === 'Departure Date', 'EN flightInfo.departureDate is defined');
  assert(ar.ticketCreate.flightInfo.departureDate === 'تاريخ المغادرة', 'AR flightInfo.departureDate is defined');

  assert(en.ticketCreate.returnFlight.title === 'Return Flight', 'EN returnFlight.title is defined');
  assert(ar.ticketCreate.returnFlight.title === 'رحلة العودة', 'AR returnFlight.title is defined');

  assert(en.ticketCreate.returnFlight.optionalHint === 'Leave blank for a one-way ticket', 'EN returnFlight.optionalHint is defined');
  assert(ar.ticketCreate.returnFlight.optionalHint === 'اتركها فارغة لتذكرة ذهاب فقط', 'AR returnFlight.optionalHint is defined');

  assert(en.ticketCreate.returnFlight.flightNumber === 'Return Flight Number', 'EN returnFlight.flightNumber is defined');
  assert(ar.ticketCreate.returnFlight.flightNumber === 'رقم رحلة العودة', 'AR returnFlight.flightNumber is defined');

  assert(en.ticketCreate.returnFlight.departureDate === 'Return Departure Date', 'EN returnFlight.departureDate is defined');
  assert(ar.ticketCreate.returnFlight.departureDate === 'تاريخ المغادرة للعودة', 'AR returnFlight.departureDate is defined');

  assert(en.validation.returnDateAfterDeparture && en.validation.returnDateAfterDeparture.length > 0, 'EN validation.returnDateAfterDeparture is defined');
  assert(ar.validation.returnDateAfterDeparture && ar.validation.returnDateAfterDeparture.length > 0, 'AR validation.returnDateAfterDeparture is defined');

  assert(en.validation.returnFlightIncomplete && en.validation.returnFlightIncomplete.length > 0, 'EN validation.returnFlightIncomplete is defined');
  assert(ar.validation.returnFlightIncomplete && ar.validation.returnFlightIncomplete.length > 0, 'AR validation.returnFlightIncomplete is defined');

  console.log('\n========================================================');
  console.log(`Simplified Flight Fields Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runRoundTripTests();
