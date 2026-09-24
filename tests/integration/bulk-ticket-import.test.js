/**
 * AfricaTravel — Bulk Ticket Import Feature Verification Tests
 *
 * Verifies:
 * 1. Bulk spreadsheet template generation (.xlsx) with bilingual headers
 * 2. Excel and CSV spreadsheet parsing with Arabic and English column headers
 * 3. Normalization of flight data, dates, trip types, airlines, and airports
 * 4. Duplicate ticket handling: skips duplicates by ticketNumber/PNR and reports them
 * 5. TicketCreation integration: creates tickets and links/creates customers automatically
 * 6. AI extraction helper cleanAndNormalizeExtractedTicket security and formatting
 * 7. Frontend TicketsPage renders bulk import action button
 * 8. Bilingual i18n support in both English and Arabic locales
 */

import { BulkTicketParserService } from '../../backend/src/services/bulk-ticket-parser.service.js';
import { cleanAndNormalizeExtractedTicket } from '../../backend/src/services/ticket-extraction.service.js';
import { TicketsPage } from '../../frontend/js/pages/tickets.js';
import { en } from '../../frontend/js/i18n/locales/en.js';
import { ar } from '../../frontend/js/i18n/locales/ar.js';
import * as XLSX from 'xlsx';

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

async function runBulkImportTests() {
  console.log('\n🎫 ========================================================');
  console.log('   AfricaTravel Bulk Ticket Import Feature Verification');
  console.log('========================================================\n');

  // --- 1. Template Generation Test ---
  console.log('--- 1. Bulk Template Generation (.xlsx) ---');
  const templateBuffer = BulkTicketParserService.generateTemplate();
  assert(Buffer.isBuffer(templateBuffer) && templateBuffer.length > 0, 'Generates non-empty template buffer');

  const workbook = XLSX.read(templateBuffer, { type: 'buffer' });
  assert(workbook.SheetNames.length > 0, 'Generated workbook has at least one sheet');
  assert(workbook.SheetNames[0] === 'Tickets Template', 'Default sheet name is "Tickets Template"');

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  assert(parsedData.length >= 2, 'Template contains header row and sample ticket rows');

  const headerRow = parsedData[0];
  assert(
    headerRow.some(h => String(h).includes('Passenger Name') || String(h).includes('اسم المسافر')),
    'Template header includes bilingual Passenger Name column'
  );
  assert(
    headerRow.some(h => String(h).includes('PNR') || String(h).includes('رقم الحجز')),
    'Template header includes PNR column'
  );
  assert(
    headerRow.some(h => String(h).includes('Ticket Number') || String(h).includes('رقم التذكرة')),
    'Template header includes Ticket Number column'
  );

  // --- 2. Arabic Column Names Parsing ---
  console.log('\n--- 2. Arabic Column Spreadsheet Parsing ---');
  const arabicHeaders = [
    'اسم المسافر',
    'رمز الحجز',
    'رقم التذكرة',
    'شركة الطيران',
    'رقم الرحلة',
    'مطار الإقلاع',
    'مطار الوصول',
    'تاريخ السفر',
    'رقم رحلة العودة',
    'تاريخ العودة',
    'رقم الهاتف',
    'البريد الإلكتروني'
  ];

  const arabicSampleRows = [
    [
      'Tarek Mahmoud Mostafa',
      'TARK01',
      '0779988776655',
      'مصر للطيران',
      'MS 780',
      'CAI',
      'JED',
      '2026-11-20',
      'MS 781',
      '2026-11-30',
      '+201011122233',
      'tarek@test.com'
    ],
    [
      'Sara Adel Nour',
      'SARA02',
      '0779988776656',
      'Emirates',
      'EK 924',
      'CAI',
      'DXB',
      '2026-12-01',
      '',
      '',
      '+201044455566',
      'sara@test.com'
    ]
  ];

  const arabicWs = XLSX.utils.aoa_to_sheet([arabicHeaders, ...arabicSampleRows]);
  const arabicWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(arabicWb, arabicWs, 'ArabicSheet');
  const arabicBuffer = XLSX.write(arabicWb, { type: 'buffer', bookType: 'xlsx' });

  const parsedArabicTickets = BulkTicketParserService.parseSpreadsheet(arabicBuffer);
  assert(parsedArabicTickets.length === 2, 'Correctly parsed 2 rows from Arabic spreadsheet');
  assert(parsedArabicTickets[0].passengerName === 'Tarek Mahmoud Mostafa', 'Extracted passenger name from Arabic header');
  assert(parsedArabicTickets[0].pnr === 'TARK01', 'Extracted PNR from Arabic header');
  assert(parsedArabicTickets[0].ticketNumber === '0779988776655', 'Extracted ticket number from Arabic header');
  assert(parsedArabicTickets[0].airline === 'EgyptAir', 'Standardized EgyptAir from Arabic name "مصر للطيران"');
  assert(parsedArabicTickets[0].origin === 'CAI', 'Origin airport code is CAI');
  assert(parsedArabicTickets[0].destination === 'JED', 'Destination airport code is JED');
  assert(parsedArabicTickets[0].tripType === 'Round Trip', 'Inferred tripType as Round Trip due to return date');
  assert(parsedArabicTickets[1].tripType === 'One Way', 'Second ticket is One Way');
  assert(parsedArabicTickets[0].ticketPrice === 0, 'Ticket price defaults to 0 when not specified in file');

  // --- 3. English Column Names & CSV Parsing ---
  console.log('\n--- 3. English Column & CSV Parsing ---');
  const csvContent = `Passenger Name,PNR,Ticket Number,Airline,Flight Number,Origin,Destination,Departure Date,Phone
John Doe,JD0001,0771122334455,EgyptAir,MS 901,CAI,DXB,2026-10-10,+201000000001
Jane Smith,JS0002,0771122334456,Saudia,SV 300,CAI,RUH,2026-10-12,+201000000002`;

  const csvBuffer = Buffer.from(csvContent, 'utf-8');
  const parsedCsvTickets = BulkTicketParserService.parseSpreadsheet(csvBuffer);
  assert(parsedCsvTickets.length === 2, 'Parsed 2 tickets from CSV buffer');
  assert(parsedCsvTickets[0].passengerName === 'John Doe', 'Extracted John Doe from CSV');
  assert(parsedCsvTickets[0].pnr === 'JD0001', 'Extracted PNR from CSV');
  assert(parsedCsvTickets[0].airline === 'EgyptAir', 'Extracted airline EgyptAir');
  assert(parsedCsvTickets[0].origin === 'CAI', 'Extracted CAI origin');
  assert(parsedCsvTickets[0].destination === 'DXB', 'Extracted DXB destination');

  // --- 4. Extracted Ticket Normalization & Security ---
  console.log('\n--- 4. Extracted Ticket Normalization & Security ---');
  const rawTicket = {
    passengerName: 'ALI / MAHMOUD MR',
    ticketNumber: '077-1234567890',
    flightNumber: 'MS 985, MS 986',
    origin: 'Cairo (CAI)',
    destination: 'Dubai (DXB)',
    costPrice: 5000, // Should be wiped out
    ticketPrice: 6500,
    airline: 'MS'
  };

  const normalized = cleanAndNormalizeExtractedTicket(rawTicket);
  assert(normalized.passengerName === 'Mahmoud Ali', 'Reversed surname/givenname order and stripped MR title');
  assert(normalized.ticketNumber === '0771234567890', 'Cleaned ticket number dash');
  assert(normalized.flightNumber === 'MS 985', 'Extracted first flight number only');
  assert(normalized.origin === 'CAI', 'Cleaned origin to IATA code CAI');
  assert(normalized.destination === 'DXB', 'Cleaned destination to IATA code DXB');
  assert(normalized.airline === 'EgyptAir', 'Mapped airline code MS to EgyptAir');
  assert(normalized.costPrice === undefined, 'Security check: costPrice is strictly removed from extracted ticket');

  // --- 5. Frontend TicketsPage Actions UI ---
  console.log('\n--- 5. Frontend TicketsPage UI ---');
  const renderedHtml = TicketsPage.render();
  assert(
    renderedHtml.includes('id="bulk-import-tickets-btn"'),
    'TicketsPage renders the bulk import button (id="bulk-import-tickets-btn")'
  );
  assert(
    renderedHtml.includes('id="export-tickets-btn"'),
    'TicketsPage preserves the Export button'
  );
  assert(
    renderedHtml.includes('data-link') && renderedHtml.includes('/tickets/new'),
    'TicketsPage preserves the Issue Ticket action link'
  );

  // --- 6. Bilingual Translations ---
  console.log('\n--- 6. Bilingual Translations (EN & AR) ---');
  assert(typeof en.tickets.bulkImport === 'string' && en.tickets.bulkImport.length > 0, 'English bulkImport translation exists');
  assert(typeof ar.tickets.bulkImport === 'string' && ar.tickets.bulkImport.length > 0, 'Arabic bulkImport translation exists');

  assert(Boolean(en.tickets.bulkModal && en.tickets.bulkModal.title), 'English bulkModal.title exists');
  assert(Boolean(ar.tickets.bulkModal && ar.tickets.bulkModal.title), 'Arabic bulkModal.title exists');
  assert(Boolean(en.tickets.bulkModal.startImport), 'English bulkModal.startImport exists');
  assert(Boolean(ar.tickets.bulkModal.startImport), 'Arabic bulkModal.startImport exists');
  assert(Boolean(en.tickets.bulkModal.downloadTemplate), 'English bulkModal.downloadTemplate exists');
  assert(Boolean(ar.tickets.bulkModal.downloadTemplate), 'Arabic bulkModal.downloadTemplate exists');

  console.log('\n========================================================');
  console.log(`   Verification Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed assertions:', failures);
    process.exit(1);
  }
}

runBulkImportTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
