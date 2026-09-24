/**
 * AfricaTravel — Bulk Ticket Spreadsheet Parser & Template Generator Service
 *
 * Handles parsing and normalization of Excel (.xlsx, .xls) and CSV spreadsheets
 * with smart bilingual (Arabic & English) column header detection.
 * Also provides standard downloadable template generation.
 */

import * as XLSX from 'xlsx';
import { cleanPassengerName, cleanTicketNumber, toSingleFlightNumber, toAirportCode } from './ticket-extraction.service.js';
import { findAirline } from '../constants/airlines.js';
import { normalizeValidatedAirportCode } from '../constants/airports.js';

// Canonical field name aliases across Arabic and English variations
const COLUMN_ALIASES = {
  passengerName: [
    'passengername', 'passenger_name', 'passenger name', 'passenger', 'name',
    'اسم المسافر', 'اسم الراكب', 'الاسم', 'مسافر', 'اسم العميل'
  ],
  pnr: [
    'pnr', 'bookingreference', 'booking reference', 'record locator', 'booking ref', 'pnr code',
    'رقم الحجز', 'الحجز', 'رمز الحجز', 'مرجع الحجز', 'بي ان ار'
  ],
  ticketNumber: [
    'ticketnumber', 'ticket_number', 'ticket number', 'ticket #', 'ticket no', 'tkt', 'tkt number', 'e-ticket',
    'رقم التذكرة', 'التذكرة', 'رقم التذكره', 'التذكره'
  ],
  airline: [
    'airline', 'airline_name', 'carrier', 'airline name',
    'شركة الطيران', 'طيران', 'الناقل', 'الخطوط', 'خطوط الطيران'
  ],
  airlineCode: [
    'airlinecode', 'airline_code', 'airline code', 'carrier code', 'iata code',
    'كود الطيران', 'رمز الطيران', 'رمز شركة الطيران'
  ],
  flightNumber: [
    'flightnumber', 'flight_number', 'flight number', 'flight #', 'flight no', 'flt no',
    'رقم الرحلة', 'الرحلة', 'رقم رحلة الذهاب', 'رحلة الذهاب'
  ],
  origin: [
    'origin', 'from', 'departure airport', 'dep airport', 'origin airport', 'from airport',
    'مطار الإقلاع', 'مطار المغادرة', 'محطة المغادرة', 'من', 'الاقلاع', 'الإقلاع'
  ],
  destination: [
    'destination', 'to', 'arrival airport', 'arr airport', 'dest airport', 'to airport',
    'مطار الوصول', 'محطة الوصول', 'إلى', 'الي', 'الوصول'
  ],
  departureDate: [
    'departuredate', 'departure_date', 'departure date', 'travel date', 'date', 'flight date',
    'تاريخ السفر', 'تاريخ الإقلاع', 'تاريخ الذهاب', 'التاريخ', 'تاريخ الرحلة', 'تاريخ الاقلاع'
  ],
  tripType: [
    'triptype', 'trip_type', 'trip type', 'journey type',
    'نوع الرحلة', 'نوع السفر'
  ],
  returnFlightNumber: [
    'returnflightnumber', 'return_flight_number', 'return flight number', 'return flight', 'return flt',
    'رقم رحلة العودة', 'رحلة العودة'
  ],
  returnDepartureDate: [
    'returndeparturedate', 'return_departure_date', 'return departure date', 'return date',
    'تاريخ العودة', 'تاريخ رحلة العودة'
  ],
  phone: [
    'phone', 'phone_number', 'phone number', 'mobile', 'tel', 'cell',
    'الهاتف', 'رقم الهاتف', 'الموبايل', 'الجوال', 'تليفون'
  ],
  email: [
    'email', 'e-mail', 'email address',
    'البريد', 'البريد الإلكتروني', 'ايميل', 'البريد الالكتروني'
  ],
  passport: [
    'passport', 'passport_number', 'passport number', 'passport no',
    'جواز السفر', 'رقم الجواز', 'الجواز', 'رقم جواز السفر'
  ],
  nationality: [
    'nationality',
    'الجنسية', 'البلد'
  ],
  ticketPrice: [
    'ticketprice', 'ticket_price', 'ticket price', 'price', 'selling price', 'selling_price', 'amount',
    'سعر البيع', 'السعر', 'سعر التذكرة', 'المبلغ'
  ],
  costPrice: [
    'costprice', 'cost_price', 'cost price', 'cost', 'net cost',
    'سعر التكلفة', 'التكلفة', 'تكلفة التذكرة'
  ],
  currency: [
    'currency',
    'العملة', 'عملة التذكرة'
  ]
};

function normalizeHeader(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[\r\n\t_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[#()\-:]/g, '')
    .trim();
}

function resolveCanonicalField(headerKey) {
  const norm = normalizeHeader(headerKey);
  if (!norm) return null;

  // Pass 1: Strict exact match
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (norm === normalizeHeader(alias)) {
        return canonical;
      }
    }
  }

  // Pass 2: Longest alias substring match (e.g. 'departure date' beats 'departure')
  let bestCanonical = null;
  let bestMatchLength = 0;

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const normAlias = normalizeHeader(alias);
      if (normAlias.length >= 2 && (norm.includes(normAlias) || normAlias.includes(norm))) {
        if (normAlias.length > bestMatchLength) {
          bestMatchLength = normAlias.length;
          bestCanonical = canonical;
        }
      }
    }
  }

  return bestCanonical;
}

function formatRawDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fallback
    }
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }
    // DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

export const BulkTicketParserService = {
  /**
   * Parses an Excel (.xlsx/.xls) or CSV buffer into normalized ticket objects.
   * @param {Buffer} buffer
   * @returns {Array<object>}
   */
  parseSpreadsheet(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return [];
    }

    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return [];
    }

    // Map column headers to canonical field names
    const headerMap = {};
    const sampleRow = rawRows[0] || {};
    for (const key of Object.keys(sampleRow)) {
      const canonical = resolveCanonicalField(key);
      if (canonical) {
        headerMap[key] = canonical;
      }
    }

    const tickets = [];

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2; // 1-based, header is line 1
      const item = {};

      for (const [key, val] of Object.entries(raw)) {
        const canonical = headerMap[key];
        if (canonical && val !== undefined && val !== null && val !== '') {
          item[canonical] = val;
        }
      }

      // Skip row if it has no recognizable ticket/passenger information
      const hasAny = Boolean(
        item.passengerName ||
        item.ticketNumber ||
        item.pnr ||
        (item.origin && item.destination) ||
        item.flightNumber
      );
      if (!hasAny) {
        continue;
      }

      // Normalization
      const passengerName = item.passengerName ? cleanPassengerName(String(item.passengerName)) : '';
      const ticketNumber = item.ticketNumber ? cleanTicketNumber(String(item.ticketNumber)) : null;
      const pnr = item.pnr ? String(item.pnr).trim().toUpperCase() : null;

      let airline = item.airline ? String(item.airline).trim() : 'EgyptAir';
      let airlineCode = item.airlineCode ? String(item.airlineCode).trim().toUpperCase() : 'MS';

      const matchedAirline = findAirline(airlineCode) || findAirline(airline);
      if (matchedAirline) {
        airline = matchedAirline.name;
        airlineCode = matchedAirline.code;
      }

      const flightNumber = item.flightNumber ? toSingleFlightNumber(String(item.flightNumber)) : `${airlineCode} 901`;
      const returnFlightNumber = item.returnFlightNumber ? toSingleFlightNumber(String(item.returnFlightNumber)) : null;

      let origin = item.origin ? toAirportCode(String(item.origin)) : 'CAI';
      let destination = item.destination ? toAirportCode(String(item.destination)) : 'DXB';

      const validatedOrigin = normalizeValidatedAirportCode(origin);
      if (validatedOrigin) origin = validatedOrigin;
      const validatedDest = normalizeValidatedAirportCode(destination);
      if (validatedDest) destination = validatedDest;

      const departureDate = formatRawDate(item.departureDate);
      const returnDepartureDate = formatRawDate(item.returnDepartureDate);

      let tripType = 'One Way';
      if (item.tripType) {
        const tt = String(item.tripType).toLowerCase();
        if (tt.includes('round') || tt.includes('عودة') || tt.includes('عوده') || tt.includes('ذهاب وعودة')) {
          tripType = 'Round Trip';
        } else if (tt.includes('multi') || tt.includes('وجهات')) {
          tripType = 'Multi City';
        }
      } else if (returnDepartureDate || returnFlightNumber) {
        tripType = 'Round Trip';
      }

      const ticketPrice = item.ticketPrice !== undefined && item.ticketPrice !== '' && !isNaN(Number(item.ticketPrice))
        ? Math.max(0, Number(item.ticketPrice))
        : 0;

      const costPrice = item.costPrice !== undefined && item.costPrice !== '' && !isNaN(Number(item.costPrice))
        ? Math.max(0, Number(item.costPrice))
        : null;

      tickets.push({
        rowNumber: rowNum,
        passengerName: passengerName || 'Guest',
        ticketNumber: ticketNumber || null,
        pnr: pnr || null,
        airline,
        airlineCode,
        flightNumber,
        origin,
        destination,
        departureDate,
        returnFlightNumber,
        returnDepartureDate,
        tripType,
        ticketPrice,
        costPrice,
        currency: item.currency ? String(item.currency).trim().toUpperCase() : 'EGP',
        phone: item.phone ? String(item.phone).trim() : null,
        email: item.email ? String(item.email).trim() : null,
        passport: item.passport ? String(item.passport).trim() : null,
        nationality: item.nationality ? String(item.nationality).trim() : 'Egyptian (EGY)'
      });
    }

    return tickets;
  },

  /**
   * Generates a sample Excel template (.xlsx) with bilingual Arabic/English headers.
   * @returns {Buffer}
   */
  generateTemplate() {
    const headers = [
      'اسم المسافر / Passenger Name',
      'رقم الحجز / PNR',
      'رقم التذكرة / Ticket Number',
      'شركة الطيران / Airline',
      'رمز الطيران / Airline Code',
      'رقم الرحلة / Flight Number',
      'مطار الإقلاع / Origin',
      'مطار الوصول / Destination',
      'تاريخ السفر / Departure Date (YYYY-MM-DD)',
      'نوع الرحلة / Trip Type',
      'رقم رحلة العودة / Return Flight',
      'تاريخ العودة / Return Date',
      'رقم الهاتف / Phone',
      'البريد الإلكتروني / Email',
      'رقم جواز السفر / Passport',
      'الجنسية / Nationality'
    ];

    const sampleRows = [
      [
        'Ahmed Mohamed Ali',
        'ABC123',
        '0771234567890',
        'EgyptAir',
        'MS',
        'MS 985',
        'CAI',
        'JED',
        '2026-10-15',
        'Round Trip',
        'MS 986',
        '2026-10-25',
        '+201012345678',
        'ahmed.ali@example.com',
        'A12345678',
        'Egyptian (EGY)'
      ],
      [
        'Fatima Hassan Ibrahim',
        'XYZ789',
        '0771234567891',
        'Saudia',
        'SV',
        'SV 302',
        'CAI',
        'RUH',
        '2026-11-01',
        'One Way',
        '',
        '',
        '+201098765432',
        'fatima@example.com',
        'A87654321',
        'Egyptian (EGY)'
      ],
      [
        'Omar Khaled Mahmoud',
        'KLM456',
        '0771234567892',
        'Emirates',
        'EK',
        'EK 924',
        'CAI',
        'DXB',
        '2026-12-05',
        'One Way',
        '',
        '',
        '+201123456789',
        'omar.khaled@example.com',
        'A45678912',
        'Egyptian (EGY)'
      ]
    ];

    const data = [headers, ...sampleRows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 25 }, // Passenger Name
      { wch: 15 }, // PNR
      { wch: 20 }, // Ticket #
      { wch: 18 }, // Airline
      { wch: 14 }, // Airline Code
      { wch: 16 }, // Flight #
      { wch: 14 }, // Origin
      { wch: 14 }, // Destination
      { wch: 26 }, // Departure Date
      { wch: 16 }, // Trip Type
      { wch: 18 }, // Return Flight
      { wch: 16 }, // Return Date
      { wch: 18 }, // Phone
      { wch: 25 }, // Email
      { wch: 18 }, // Passport
      { wch: 18 }  // Nationality
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets Template');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
};
