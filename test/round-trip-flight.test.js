/**
 * AfricaTravel - Flight Number, Arrival Date Label, Cabin Class, and Round Trip Integration Tests
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
  console.log('   Flight Number, Cabin Class & Round Trip Tests');
  console.log('========================================================\n');

  // --- 1. Zod Schema Validation: Flight Number & PNR ---
  console.log('--- 1. Backend Schema Validation: Flight Number & PNR ---');

  const validOneWay = {
    passengerName: 'Hassan Ali',
    pnr: 'AB12CD',
    airline: 'EgyptAir',
    airlineCode: 'MS',
    flightNumber: 'MS 986',
    origin: 'CAI',
    destination: 'DXB',
    departureDate: '2026-09-15T08:00',
    arrivalDate: '2026-09-15T13:30',
    tripType: 'One Way',
    cabinClass: 'Economy (Y)',
    ticketPrice: 12500,
    costPrice: 10000
  };

  const oneWayResult = createTicketSchema.safeParse(validOneWay);
  assert(oneWayResult.success === true, 'One Way ticket with flightNumber and pnr passes validation');

  // Missing flightNumber
  const missingFlightNum = { ...validOneWay, flightNumber: undefined };
  const missingFlightNumResult = createTicketSchema.safeParse(missingFlightNum);
  assert(missingFlightNumResult.success === false, 'Ticket without flightNumber fails validation');
  assert(
    missingFlightNumResult.error?.issues.some(i => i.path.includes('flightNumber')),
    'Zod error issue path includes flightNumber'
  );

  // Empty flightNumber
  const emptyFlightNum = { ...validOneWay, flightNumber: '' };
  const emptyFlightNumResult = createTicketSchema.safeParse(emptyFlightNum);
  assert(emptyFlightNumResult.success === false, 'Ticket with empty flightNumber fails validation');

  // Missing pnr
  const missingPnr = { ...validOneWay, pnr: undefined };
  const missingPnrResult = createTicketSchema.safeParse(missingPnr);
  assert(missingPnrResult.success === false, 'Ticket without pnr fails validation');

  // Cabin Class Enum Validation
  const validBusinessTicket = { ...validOneWay, cabinClass: 'Business (J)' };
  assert(createTicketSchema.safeParse(validBusinessTicket).success === true, 'Ticket with Business (J) cabinClass passes validation');

  const validFirstTicket = { ...validOneWay, cabinClass: 'First (F)' };
  assert(createTicketSchema.safeParse(validFirstTicket).success === true, 'Ticket with First (F) cabinClass passes validation');

  // --- 2. Zod Schema Validation: Flexible Round Trip superRefine ---
  console.log('\n--- 2. Backend Schema: Flexible Round Trip superRefine Enforcement ---');

  // Test 2.1: Ticket with empty returnDepartureDate -> passes as One Way
  const oneWayEmptyReturn = {
    ...validOneWay,
    returnDepartureDate: undefined,
    returnFlightNumber: undefined,
    returnArrivalDate: undefined
  };
  const oneWayEmptyReturnResult = createTicketSchema.safeParse(oneWayEmptyReturn);
  assert(oneWayEmptyReturnResult.success === true, 'Ticket with empty returnDepartureDate passes validation as One Way');

  // Test 2.2: Ticket with returnDepartureDate 1 week after departureDate (same year) -> succeeds without year rejection
  const validRoundTripSameYear = {
    ...validOneWay,
    tripType: 'Round Trip',
    departureDate: '2026-09-15T08:00',
    returnFlightNumber: 'MS 987',
    returnDepartureDate: '2026-09-22T14:00',
    returnArrivalDate: '2026-09-22T17:30'
  };
  const validRoundTripSameYearResult = createTicketSchema.safeParse(validRoundTripSameYear);
  assert(validRoundTripSameYearResult.success === true, 'Round Trip ticket with returnDepartureDate 1 week after departureDate (same year) passes');

  // Test 2.3: Ticket with returnDepartureDate BEFORE departureDate -> rejected with correct error
  const invalidReturnBeforeDeparture = {
    ...validOneWay,
    departureDate: '2026-09-15T08:00',
    returnFlightNumber: 'MS 987',
    returnDepartureDate: '2026-09-10T14:00',
    returnArrivalDate: '2026-09-10T17:30'
  };
  const invalidReturnBeforeDepartureResult = createTicketSchema.safeParse(invalidReturnBeforeDeparture);
  assert(invalidReturnBeforeDepartureResult.success === false, 'Ticket with returnDepartureDate before departureDate is rejected');
  assert(
    invalidReturnBeforeDepartureResult.error?.issues.some(i => i.path.includes('returnDepartureDate') && i.message.includes('Return departure date must be after')),
    'Issue reported for returnDepartureDate before departureDate with correct message'
  );

  // Test 2.4: Ticket with returnDepartureDate provided but returnFlightNumber empty/missing -> rejected
  const missingReturnFlightNum = {
    ...validOneWay,
    departureDate: '2026-09-15T08:00',
    returnDepartureDate: '2026-09-22T14:00',
    returnArrivalDate: '2026-09-22T17:30',
    returnFlightNumber: ''
  };
  const missingReturnFlightNumResult = createTicketSchema.safeParse(missingReturnFlightNum);
  assert(missingReturnFlightNumResult.success === false, 'Ticket with returnDepartureDate but empty returnFlightNumber is rejected');
  assert(
    missingReturnFlightNumResult.error?.issues.some(i => i.path.includes('returnFlightNumber')),
    'Issue reported for missing returnFlightNumber when returnDepartureDate is set'
  );

  // Test 2.5: Ticket with returnDepartureDate provided but returnArrivalDate missing -> rejected
  const missingReturnArrDate = {
    ...validOneWay,
    departureDate: '2026-09-15T08:00',
    returnFlightNumber: 'MS 987',
    returnDepartureDate: '2026-09-22T14:00',
    returnArrivalDate: undefined
  };
  const missingReturnArrDateResult = createTicketSchema.safeParse(missingReturnArrDate);
  assert(missingReturnArrDateResult.success === false, 'Ticket with returnDepartureDate but missing returnArrivalDate is rejected');
  assert(
    missingReturnArrDateResult.error?.issues.some(i => i.path.includes('returnArrivalDate')),
    'Issue reported for missing returnArrivalDate when returnDepartureDate is set'
  );

  // --- 3. Frontend HTML Template Verification ---
  console.log('\n--- 3. Frontend Form Structure (ticket-create.js) ---');

  const formHtml = TicketCreatePage.render();

  assert(formHtml.includes('id="flight-number"'), 'Form contains #flight-number input field');
  assert(!formHtml.includes('id="trip-type"'), 'Form does NOT contain #trip-type dropdown (removed)');
  assert(!formHtml.includes('id="return-flight-section"'), 'Form does NOT have hidden #return-flight-section id');
  assert(formHtml.includes('id="flight-cabin-class"'), 'Form contains #flight-cabin-class select dropdown');
  assert(formHtml.includes('value="Economy (Y)"'), 'Cabin class options include Economy (Y)');
  assert(formHtml.includes('value="Business (J)"'), 'Cabin class options include Business (J)');
  assert(formHtml.includes('value="First (F)"'), 'Cabin class options include First (F)');
  assert(formHtml.includes('id="return-flight-number"'), 'Return flight section contains #return-flight-number input');
  assert(formHtml.includes('id="return-dep-date"'), 'Return flight section contains #return-dep-date input');
  assert(formHtml.includes('id="return-arr-date"'), 'Return flight section contains #return-arr-date input');
  assert(formHtml.includes('id="flight-arr-date"'), 'Form contains #flight-arr-date input');
  assert(
    formHtml.includes(escapeHtml(en.ticketCreate.flightInfo.arrivalDate)),
    'Label for #flight-arr-date matches Arrival Date & Time'
  );
  assert(
    formHtml.includes(escapeHtml(en.ticketCreate.returnFlight.optionalHint)),
    'Return flight card contains optional hint text'
  );

  // --- 4. Ticket Details Overview Tab Verification ---
  console.log('\n--- 4. Ticket Details Overview Tab Round Trip Rendering ---');

  const roundTripTicket = {
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
    cabinClass: 'Economy (Y)',
    ticketPrice: 24000,
    currency: 'EGP',
    status: 'CONFIRMED'
  };

  const roundTripHtml = renderOverviewTab(roundTripTicket);
  assert(roundTripHtml.includes('MS 778'), 'Overview tab renders returnFlightNumber for Round Trip ticket');
  assert(roundTripHtml.includes('Return Flight'), 'Overview tab renders Return Flight section title for Round Trip ticket');

  const oneWayTicket = {
    ...roundTripTicket,
    tripType: 'One Way',
    returnFlightNumber: null,
    returnDepartureDate: null,
    returnArrivalDate: null
  };

  const oneWayHtml = renderOverviewTab(oneWayTicket);
  assert(!oneWayHtml.includes('MS 778'), 'Overview tab does NOT render return leg for One Way ticket');

  // --- 5. i18n Bilingual Verification ---
  console.log('\n--- 5. i18n Bilingual Translations Verification ---');

  assert(en.ticketCreate.flightInfo.arrivalDate === 'Arrival Date & Time', 'EN flightInfo.arrivalDate is defined');
  assert(ar.ticketCreate.flightInfo.arrivalDate === 'تاريخ ووقت الوصول', 'AR flightInfo.arrivalDate is defined');

  assert(en.ticketCreate.flightInfo.cabinClass === 'Cabin Class', 'EN flightInfo.cabinClass is defined');
  assert(ar.ticketCreate.flightInfo.cabinClass === 'درجة السفر', 'AR flightInfo.cabinClass is defined');

  assert(en.ticketCreate.returnFlight.title === 'Return Flight', 'EN returnFlight.title is defined');
  assert(ar.ticketCreate.returnFlight.title === 'رحلة العودة', 'AR returnFlight.title is defined');

  assert(en.ticketCreate.returnFlight.optionalHint === 'Leave blank for a one-way ticket', 'EN returnFlight.optionalHint is defined');
  assert(ar.ticketCreate.returnFlight.optionalHint === 'اتركها فارغة لتذكرة ذهاب فقط', 'AR returnFlight.optionalHint is defined');

  assert(en.ticketCreate.returnFlight.flightNumber === 'Return Flight Number', 'EN returnFlight.flightNumber is defined');
  assert(ar.ticketCreate.returnFlight.flightNumber === 'رقم رحلة العودة', 'AR returnFlight.flightNumber is defined');

  assert(en.ticketCreate.returnFlight.departureDate === 'Return Departure Date & Time', 'EN returnFlight.departureDate is defined');
  assert(ar.ticketCreate.returnFlight.departureDate === 'تاريخ ووقت المغادرة للعودة', 'AR returnFlight.departureDate is defined');

  assert(en.ticketCreate.returnFlight.arrivalDate === 'Return Arrival Date & Time', 'EN returnFlight.arrivalDate is defined');
  assert(ar.ticketCreate.returnFlight.arrivalDate === 'تاريخ ووقت الوصول للعودة', 'AR returnFlight.arrivalDate is defined');

  assert(en.validation.returnDateAfterDeparture && en.validation.returnDateAfterDeparture.length > 0, 'EN validation.returnDateAfterDeparture is defined');
  assert(ar.validation.returnDateAfterDeparture && ar.validation.returnDateAfterDeparture.length > 0, 'AR validation.returnDateAfterDeparture is defined');

  assert(en.validation.returnFlightIncomplete && en.validation.returnFlightIncomplete.length > 0, 'EN validation.returnFlightIncomplete is defined');
  assert(ar.validation.returnFlightIncomplete && ar.validation.returnFlightIncomplete.length > 0, 'AR validation.returnFlightIncomplete is defined');

  console.log('\n========================================================');
  console.log(`Round Trip & Flight Number Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runRoundTripTests();
