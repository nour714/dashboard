/**
 * AfricaTravel — Master Airlines & IATA Codes Catalog Tests
 *
 * Validates the complete registry of 30+ international and regional airlines,
 * 2-letter IATA codes, Arabic & English names, lookup utilities,
 * and UI select/option generators.
 */

import { AIRLINES as FRONTEND_AIRLINES, findAirline, getAirlineByCode, getAirlineLabel, renderAirlineOptionsHtml } from '../js/data/airlines.js';
import { AIRLINES as SERVER_AIRLINES, findAirline as serverFindAirline, getAirlineByCode as serverGetAirlineByCode } from '../server/src/constants/airlines.js';

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

console.log('\n✈️  ========================================================');
console.log('   AfricaTravel Master Airlines & IATA Catalog Tests');
console.log('========================================================\n');

// --- 1. User Requirement Checklist Validation ---
console.log('--- 1. User Prompt Airlines & IATA Codes Mapping ---');

const REQUIRED_AIRLINES = [
  { name: 'EgyptAir', code: 'MS' },
  { name: 'Air Cairo', code: 'SM' },
  { name: 'Emirates', code: 'EK' },
  { name: 'Etihad Airways', code: 'EY' },
  { name: 'Qatar Airways', code: 'QR' },
  { name: 'Turkish Airlines', code: 'TK' },
  { name: 'Saudi Arabian Airlines', code: 'SV' },
  { name: 'Flynas', code: 'XY' },
  { name: 'flydubai', code: 'FZ' },
  { name: 'Air Arabia', code: 'G9' },
  { name: 'British Airways', code: 'BA' },
  { name: 'Air France', code: 'AF' },
  { name: 'Lufthansa', code: 'LH' },
  { name: 'KLM', code: 'KL' },
  { name: 'Iberia', code: 'IB' },
  { name: 'ITA Airways', code: 'AZ' },
  { name: 'Aegean Airlines', code: 'A3' },
  { name: 'American Airlines', code: 'AA' },
  { name: 'Delta Air Lines', code: 'DL' },
  { name: 'United Airlines', code: 'UA' },
  { name: 'Air Canada', code: 'AC' },
  { name: 'Air China', code: 'CA' },
  { name: 'China Eastern', code: 'MU' },
  { name: 'China Southern', code: 'CZ' },
  { name: 'Singapore Airlines', code: 'SQ' },
  { name: 'Ethiopian Airlines', code: 'ET' },
  { name: 'Kenya Airways', code: 'KQ' },
  { name: 'Royal Air Maroc', code: 'AT' },
  { name: 'Tunisair', code: 'TU' },
  { name: 'Air Algérie', code: 'AH' }
];

REQUIRED_AIRLINES.forEach(({ name, code }) => {
  const airline = findAirline(code);
  assert(airline !== undefined, `Airline code ${code} found in registry`);
  assert(airline?.code === code, `Airline ${name} has correct IATA code ${code}`);
  assert(Boolean(airline?.nameAr), `Airline ${name} (${code}) has non-empty Arabic name: ${airline?.nameAr}`);
});

// --- 2. Registry Structure & Integrity ---
console.log('\n--- 2. Registry Structure & Integrity ---');
assert(FRONTEND_AIRLINES.length >= 30, `Registry contains at least 30 airlines (total: ${FRONTEND_AIRLINES.length})`);
assert(SERVER_AIRLINES.length === FRONTEND_AIRLINES.length, `Server and frontend registries are synchronized in count (${SERVER_AIRLINES.length})`);

const seenCodes = new Set();
FRONTEND_AIRLINES.forEach(a => {
  assert(a.code && a.code.length === 2 && a.code === a.code.toUpperCase(), `Code ${a.code} is exactly 2 uppercase chars`);
  assert(a.name && typeof a.name === 'string', `Airline ${a.code} has valid name`);
  assert(a.nameAr && typeof a.nameAr === 'string', `Airline ${a.code} has valid Arabic name`);
  assert(a.country && typeof a.country === 'string', `Airline ${a.code} has country`);
  assert(Array.isArray(a.aliases) && a.aliases.length > 0, `Airline ${a.code} has search aliases`);
  assert(!seenCodes.has(a.code), `No duplicate IATA code: ${a.code}`);
  seenCodes.add(a.code);
});

// --- 3. Lookup & Fuzzy Search (findAirline) ---
console.log('\n--- 3. Lookup & Fuzzy Search (findAirline) ---');
assert(findAirline('MS')?.name === 'EgyptAir', 'findAirline("MS") returns EgyptAir');
assert(findAirline('ms')?.name === 'EgyptAir', 'findAirline("ms") lowercase returns EgyptAir');
assert(findAirline('SM')?.name === 'Air Cairo', 'findAirline("SM") returns Air Cairo');
assert(findAirline('Air Cairo')?.code === 'SM', 'findAirline("Air Cairo") returns SM');
assert(findAirline('إير كايرو')?.code === 'SM', 'findAirline("إير كايرو") Arabic returns SM');
assert(findAirline('مصر للطيران')?.code === 'MS', 'findAirline("مصر للطيران") Arabic returns MS');
assert(findAirline('Saudia')?.code === 'SV', 'findAirline("Saudia") alias returns SV');
assert(findAirline('الخطوط السعودية')?.code === 'SV', 'findAirline("الخطوط السعودية") returns SV');
assert(findAirline('الجزائرية')?.code === 'AH', 'findAirline("الجزائرية") returns AH');
assert(findAirline('Algerie')?.code === 'AH', 'findAirline("Algerie") alias returns AH');
assert(findAirline('KQ')?.name === 'Kenya Airways', 'findAirline("KQ") returns Kenya Airways');
assert(findAirline('ET')?.name === 'Ethiopian Airlines', 'findAirline("ET") returns Ethiopian Airlines');
assert(findAirline('XY')?.name === 'Flynas', 'findAirline("XY") returns Flynas');
assert(findAirline('طيران ناس')?.code === 'XY', 'findAirline("طيران ناس") returns XY');
assert(findAirline('G9')?.name === 'Air Arabia', 'findAirline("G9") returns Air Arabia');
assert(findAirline('FZ')?.name === 'flydubai', 'findAirline("FZ") returns flydubai');
assert(findAirline('TK')?.name === 'Turkish Airlines', 'findAirline("TK") returns Turkish Airlines');
assert(findAirline('BA')?.name === 'British Airways', 'findAirline("BA") returns British Airways');
assert(findAirline('AF')?.name === 'Air France', 'findAirline("AF") returns Air France');
assert(findAirline('LH')?.name === 'Lufthansa', 'findAirline("LH") returns Lufthansa');
assert(findAirline('KL')?.name === 'KLM', 'findAirline("KL") returns KLM');
assert(findAirline('IB')?.name === 'Iberia', 'findAirline("IB") returns Iberia');
assert(findAirline('AZ')?.name === 'ITA Airways', 'findAirline("AZ") returns ITA Airways');
assert(findAirline('A3')?.name === 'Aegean Airlines', 'findAirline("A3") returns Aegean Airlines');
assert(findAirline('AA')?.name === 'American Airlines', 'findAirline("AA") returns American Airlines');
assert(findAirline('DL')?.name === 'Delta Air Lines', 'findAirline("DL") returns Delta Air Lines');
assert(findAirline('UA')?.name === 'United Airlines', 'findAirline("UA") returns United Airlines');
assert(findAirline('AC')?.name === 'Air Canada', 'findAirline("AC") returns Air Canada');
assert(findAirline('CA')?.name === 'Air China', 'findAirline("CA") returns Air China');
assert(findAirline('MU')?.name === 'China Eastern', 'findAirline("MU") returns China Eastern');
assert(findAirline('CZ')?.name === 'China Southern', 'findAirline("CZ") returns China Southern');
assert(findAirline('SQ')?.name === 'Singapore Airlines', 'findAirline("SQ") returns Singapore Airlines');
assert(findAirline('AT')?.name === 'Royal Air Maroc', 'findAirline("AT") returns Royal Air Maroc');
assert(findAirline('TU')?.name === 'Tunisair', 'findAirline("TU") returns Tunisair');
assert(findAirline('') === undefined, 'findAirline("") returns undefined');
assert(findAirline(null) === undefined, 'findAirline(null) returns undefined');

// --- 4. Server-Side Lookup Utilities ---
console.log('\n--- 4. Server-Side Lookup Utilities ---');
assert(serverFindAirline('MS')?.name === 'EgyptAir', 'serverFindAirline("MS") returns EgyptAir');
assert(serverFindAirline('Air Cairo')?.code === 'SM', 'serverFindAirline("Air Cairo") returns SM');
assert(serverFindAirline('AH')?.name === 'Air Algérie', 'serverFindAirline("AH") returns Air Algérie');
assert(serverGetAirlineByCode('SV')?.name === 'Saudi Arabian Airlines', 'serverGetAirlineByCode("SV") returns Saudi Arabian Airlines');

// --- 5. HTML Option Rendering ---
console.log('\n--- 5. HTML Option Rendering ---');
const optionsHtmlAr = renderAirlineOptionsHtml('MS', 'ar');
assert(optionsHtmlAr.includes('value="EgyptAir"'), 'HTML contains value="EgyptAir"');
assert(optionsHtmlAr.includes('data-code="MS"'), 'HTML contains data-code="MS"');
assert(optionsHtmlAr.includes('selected'), 'HTML marks selected airline');
assert(optionsHtmlAr.includes('مصر للطيران'), 'Arabic option label includes Arabic name');
assert(optionsHtmlAr.includes('value="Air Cairo"'), 'HTML includes Air Cairo option');
assert(optionsHtmlAr.includes('data-code="SM"'), 'HTML includes data-code="SM"');

const optionsHtmlEn = renderAirlineOptionsHtml('EK', 'en');
assert(optionsHtmlEn.includes('value="Emirates"'), 'English HTML contains Emirates');
assert(optionsHtmlEn.includes('data-code="EK"'), 'English HTML contains data-code="EK"');
assert(optionsHtmlEn.includes('selected'), 'English HTML marks Emirates as selected');

// --- Summary ---
console.log('\n========================================================');
console.log(`Airlines Catalog Tests: ${passed} passed, ${failed} failed`);
console.log('========================================================\n');

if (failed > 0) {
  console.error('Failed tests:', failures);
  process.exit(1);
}
