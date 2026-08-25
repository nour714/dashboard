/**
 * AfricaTravel - Flight Number, Arrival Date Label, and Round Trip Integration Tests
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
  console.log('   Flight Number, Arrival Date & Round Trip Tests');
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

  // --- 2. Zod Schema Validation: Round Trip superRefine ---
  console.log('\n--- 2. Backend Schema: Round Trip superRefine Enforcement ---');

  const invalidRoundTrip = {
    ...validOneWay,
    tripType: 'Round Trip'
    // returnFlightNumber, returnDepartureDate, returnArrivalDate missing
  };

  const invalidRoundTripResult = createTicketSchema.safeParse(invalidRoundTrip);
  assert(invalidRoundTripResult.success === false, 'Round Trip ticket without return details rejected by backend schema');
  const issues = invalidRoundTripResult.error?.issues || [];
  assert(issues.some(i => i.path.includes('returnFlightNumber')), 'Issue reported for missing returnFlightNumber');
  assert(issues.some(i => i.path.includes('returnDepartureDate')), 'Issue reported for missing returnDepartureDate');
  assert(issues.some(i => i.path.includes('returnArrivalDate')), 'Issue reported for missing returnArrivalDate');

  const validRoundTrip = {
    ...validOneWay,
    tripType: 'Round Trip',
    returnFlightNumber: 'MS 987',
    returnDepartureDate: '2026-09-25T14:00',
    returnArrivalDate: '2026-09-25T17:30'
  };

  const validRoundTripResult = createTicketSchema.safeParse(validRoundTrip);
  assert(validRoundTripResult.success === true, 'Complete Round Trip ticket passes validation');

  // --- 3. Frontend HTML Template Verification ---
  console.log('\n--- 3. Frontend Form Structure (ticket-create.js) ---');

  const formHtml = TicketCreatePage.render();

  assert(formHtml.includes('id="flight-number"'), 'Form contains #flight-number input field');
  assert(formHtml.includes('id="trip-type"'), 'Form contains #trip-type selector');
  assert(formHtml.includes('id="return-flight-section"'), 'Form contains #return-flight-section');
  assert(formHtml.includes('id="return-flight-number"'), 'Return flight section contains #return-flight-number input');
  assert(formHtml.includes('id="return-dep-date"'), 'Return flight section contains #return-dep-date input');
  assert(formHtml.includes('id="return-arr-date"'), 'Return flight section contains #return-arr-date input');
  assert(formHtml.includes('id="flight-arr-date"'), 'Form contains #flight-arr-date input');
  assert(
    formHtml.includes(escapeHtml(en.ticketCreate.flightInfo.arrivalDate)),
    'Label for #flight-arr-date matches Arrival Date & Time (not returnDate)'
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

  assert(en.ticketCreate.returnFlight.title === 'Return Flight', 'EN returnFlight.title is defined');
  assert(ar.ticketCreate.returnFlight.title === 'رحلة العودة', 'AR returnFlight.title is defined');

  assert(en.ticketCreate.returnFlight.flightNumber === 'Return Flight Number', 'EN returnFlight.flightNumber is defined');
  assert(ar.ticketCreate.returnFlight.flightNumber === 'رقم رحلة العودة', 'AR returnFlight.flightNumber is defined');

  assert(en.ticketCreate.returnFlight.departureDate === 'Return Departure Date & Time', 'EN returnFlight.departureDate is defined');
  assert(ar.ticketCreate.returnFlight.departureDate === 'تاريخ ووقت المغادرة للعودة', 'AR returnFlight.departureDate is defined');

  assert(en.ticketCreate.returnFlight.arrivalDate === 'Return Arrival Date & Time', 'EN returnFlight.arrivalDate is defined');
  assert(ar.ticketCreate.returnFlight.arrivalDate === 'تاريخ ووقت الوصول للعودة', 'AR returnFlight.arrivalDate is defined');

  assert(en.validation.returnFlightRequired && en.validation.returnFlightRequired.length > 0, 'EN validation.returnFlightRequired is defined');
  assert(ar.validation.returnFlightRequired && ar.validation.returnFlightRequired.length > 0, 'AR validation.returnFlightRequired is defined');

  console.log('\n========================================================');
  console.log(`Round Trip & Flight Number Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runRoundTripTests();
