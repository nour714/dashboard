/**
 * AfricaTravel — AI-Powered Ticket Data Extraction Service
 *
 * Integrates with Google Gemini API to extract flight reservation details from uploaded
 * documents (PDF / JPG / PNG) and return structured suggestion data for user review.
 *
 * NOTE: Extracted data is strictly advisory and NEVER saved directly to the database.
 * Internal fields like costPrice are NEVER extracted.
 */

import { env } from '../config/env.js';
import { BusinessRuleError } from '../domain/errors.js';
import { findAirline } from '../constants/airlines.js';
import { normalizeValidatedAirportCode } from '../constants/airports.js';

const GEMINI_REQUEST_TIMEOUT_MS = 14000;

export function toAirportCode(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const clean = raw.trim();

  // 1. Try extracting from parentheses: "Dubai (DXB)" → "DXB"
  const parenMatch = clean.match(/\(([A-Za-z]{3})\)/);
  if (parenMatch) return parenMatch[1].toUpperCase();

  // 2. Exact 3-letter string: "CAI" → "CAI"
  if (/^[A-Za-z]{3}$/.test(clean)) return clean.toUpperCase();

  // 3. Leading 3-letter code before separator: "DXB - Dubai International" → "DXB"
  const leadingMatch = clean.match(/^([A-Za-z]{3})\s*[-–—/]/);
  if (leadingMatch) return leadingMatch[1].toUpperCase();

  // 4. Fallback: first 3-letter word boundary match
  const codeMatch = clean.match(/\b[A-Za-z]{3}\b/);
  return codeMatch ? codeMatch[0].toUpperCase() : clean.toUpperCase();
}

export function toSingleFlightNumber(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const first = raw.split(/[,/;]|\band\b/i)[0].trim();
  return first || raw.trim();
}

export function cleanPassengerName(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  let name = raw.trim();

  // 1. Remove airline title prefixes or suffixes (MR, MRS, MS, MISS, MSTR, DR, CHD, INF)
  name = name.replace(/\b(MR|MRS|MS|MISS|MSTR|DR|CHD|INF)\b\.?/gi, '').trim();

  // 2. Handle GDS slash format: "SURNAME/GIVENNAME [MIDDLE]" -> "Givenname [Middle] Surname"
  if (name.includes('/')) {
    const parts = name.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const [surname, givenname] = parts;
      name = `${givenname} ${surname}`;
    }
  }

  // 3. Remove multiple spaces
  name = name.replace(/\s+/g, ' ').trim();

  // 4. Proper Case if ALL CAPS (e.g. "TAREK MAHMOUD" -> "Tarek Mahmoud")
  if (/^[A-Z\s'-]+$/.test(name) && name.length > 3) {
    name = name
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return name || raw.trim();
}

export function cleanTicketNumber(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const clean = raw.trim();

  // Standard e-ticket 13 or 14 digits with optional dash after 3rd digit
  const match = clean.match(/\b(\d{3})[- ]?(\d{10})\b/);
  if (match) {
    return `${match[1]}${match[2]}`;
  }

  const digitMatch = clean.match(/\b\d{10,14}\b/);
  if (digitMatch) {
    return digitMatch[0];
  }

  return clean;
}

let cachedWorkingModel = null;
let cachedApiVersion = 'v1beta';

export function clearModelCache() {
  cachedWorkingModel = null;
  cachedApiVersion = 'v1beta';
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    passengerName: { type: 'string' },
    pnr: { type: 'string' },
    ticketNumber: { type: 'string' },
    airline: { type: 'string' },
    airlineCode: { type: 'string' },
    flightNumber: { type: 'string', description: 'The flight number of the FIRST outbound segment ONLY (e.g. "ET 0453" or "MS 986"). If the trip has layovers or connections, extract ONLY the first flight number departing from origin — do NOT combine multiple flight numbers or separate them by commas.' },
    origin: { type: 'string', description: 'The 3-letter IATA airport code of the departure airport of the FIRST outbound segment ONLY (e.g. "CAI"). Never include the city or country name.' },
    destination: { type: 'string', description: 'The 3-letter IATA airport code of the arrival airport of the LAST outbound segment ONLY — i.e. the true final destination (e.g. "DXB"). This must NEVER be an intermediate transit/layover/connection airport, even if it is the first arrival airport mentioned in the document. Never include the city or country name.' },
    departureDate: { type: 'string', description: 'YYYY-MM-DD format. The departure date of the FIRST outbound segment.' },
    tripType: { type: 'string', enum: ['One Way', 'Round Trip'] },
    returnFlightNumber: { type: 'string', description: 'The flight number of the FIRST return segment ONLY (e.g. "MS 987"). Extract ONLY one single flight number — do NOT combine multiple flight numbers or separate them by commas.' },
    returnDepartureDate: { type: 'string', description: 'YYYY-MM-DD format, or omit if one-way' },
    ticketPrice: { type: 'number' },
    currency: { type: 'string' },
    nationality: { type: 'string' },
    dob: { type: 'string' },
    email: { type: 'string' }
  }
};

export async function discoverAvailableModels(apiKey) {
  if (!apiKey) return [];
  const versions = ['v1', 'v1beta'];
  const EXCLUDED_PATTERNS = ['tts', 'image-generation', 'audio', 'embedding'];

  for (const ver of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        headers: { 'x-goog-api-key': apiKey }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const models = (data.models || [])
        .filter(m => {
          if (!Array.isArray(m.supportedGenerationMethods) || !m.supportedGenerationMethods.includes('generateContent')) {
            return false;
          }
          const lowerName = (m.name || '').toLowerCase();
          return !EXCLUDED_PATTERNS.some(pat => lowerName.includes(pat));
        })
        .map(m => ({
          version: ver,
          modelName: m.name.replace(/^models\//, '')
        }));
      if (models.length > 0) return models;
    } catch {
      // Ignore and try next version
    }
  }
  return [];
}

export const TicketExtractionService = {
  /**
   * Extracts ticket details from an uploaded document buffer using Google Gemini API.
   * @param {Buffer} fileBuffer
   * @param {string} mimeType
   * @returns {Promise<object>}
   */
  async extractFromDocument(fileBuffer, mimeType) {
    if (!env.GEMINI_API_KEY) {
      throw new BusinessRuleError('AI extraction is not configured on this server', 'AI_EXTRACTION_UNAVAILABLE', 503);
    }

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw new BusinessRuleError('No valid file buffer provided for extraction', 'FILE_REQUIRED', 400);
    }

    const base64Data = fileBuffer.toString('base64');
    const prompt = `You are extracting flight ticket booking details from this document. Read the ENTIRE document first and identify every flight segment (each segment has its own flight number, its own departure airport/time, and its own arrival airport/time), then sort the segments chronologically.

PASSENGER NAME — read carefully: airline tickets typically format the passenger name as "SURNAME/GIVENNAME" or "SURNAME/GIVENNAME MR/MRS/MS" (surname first, before the slash). Convert this to natural reading order: "Givenname Surname". Do NOT confuse the passenger's name with the travel agency name, booking agent name, or airline staff name that may also appear on the document — only extract the name explicitly labeled as the passenger/traveler. If there are multiple passengers listed and it's unclear which one this ticket is for, omit passengerName entirely rather than guessing.

CRITICAL — connecting flights / layovers / transit stops:
Many tickets include one or more stopovers, e.g. CAI → IST → LHR as a single outbound trip made of two segments (CAI→IST, then IST→LHR).
Rule: an airport is a TRANSIT/LAYOVER stop — never the "destination" — whenever it appears as the arrival ("to") of one outbound segment AND also as the departure ("from") of a later outbound segment on the same ticket. This is true regardless of how long or short the layover is. Only the arrival airport of the very LAST outbound segment (chronologically) can be the true "destination". Never treat the first arrival airport mentioned in the document as the destination just because it appears first — always check whether a later segment departs from that same airport.
- "origin" = the departure airport of the FIRST outbound segment.
- "destination" = the arrival airport of the LAST outbound segment (the true final destination) — never an intermediate transit airport.
- "flightNumber" = the flight number of the FIRST outbound segment ONLY (e.g. "ET 0453" or "TK123"). Even if the outbound trip has connections, layovers, or multiple segments, extract ONLY the single first flight number departing from the origin airport — NEVER return multiple flight numbers or comma-separated lists.
- If this is a round trip, apply the exact same segment/transit logic independently to the return leg: "returnFlightNumber" is the single flight number of the FIRST return segment ONLY (never return multiple flight numbers), and "returnDepartureDate" is the departure date of the FIRST return segment.
- Do not confuse a connecting outbound trip with a round trip. "tripType" is "Round Trip" ONLY when there is a genuine separate return flight heading back toward the origin on a later date. A one-way trip that merely has a layover (e.g. CAI → IST → LHR, no flight back) is still "tripType": "One Way".

Worked example: outbound segments are TK123 CAI→IST departing 10 Jan, then TK456 IST→LHR departing 10 Jan (same day, connecting). IST is a transit stop because it is both an arrival and a later departure. Correct extraction: "origin": "CAI", "destination": "LHR" (NOT "IST"), "flightNumber": "TK123" (ONLY the first flight number departing from CAI, do NOT include TK456).

Return ONLY the fields you can clearly identify — omit any field you cannot confidently read. Standardize airline names and their 2-letter IATA codes (e.g., EgyptAir MS, Air Cairo SM, Emirates EK, Etihad Airways EY, Qatar Airways QR, Turkish Airlines TK, Saudia SV, Flynas XY, flydubai FZ, Air Arabia G9, British Airways BA, Air France AF, Lufthansa LH, KLM KL, Iberia IB, ITA Airways AZ, Aegean Airlines A3, American Airlines AA, Delta Air Lines DL, United Airlines UA, Air Canada AC, Air China CA, China Eastern MU, China Southern CZ, Singapore Airlines SQ, Ethiopian Airlines ET, Kenya Airways KQ, Royal Air Maroc AT, Tunisair TU, Air Algérie AH). For "origin" and "destination", return ONLY the 3-letter IATA airport code (e.g. "CAI", "DXB") — never the city name, country name, or full airport name. Dates must be in YYYY-MM-DD format. If no return flight is present, omit all return* fields and set tripType to "One Way".`;

    const primaryModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const fallbackModel = env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-pro';
    const candidateModels = Array.from(new Set([
      primaryModel,
      fallbackModel,
      'gemini-2.0-flash',
      'gemini-3.5-flash-lite'
    ])).filter(Boolean);

    const MAX_EXTRACTION_ATTEMPTS = 4;
    let attemptCount = 0;
    let lastError = null;
    let result = null;

    const requestPayload = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: EXTRACTION_SCHEMA,
        temperature: 0.0,
        maxOutputTokens: 2000
      }
    });

    const tryCallEndpoint = async (apiVersion, modelName) => {
      if (attemptCount >= MAX_EXTRACTION_ATTEMPTS) {
        return { ok: false, exhausted: true };
      }
      attemptCount++;

      const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(modelName)}:generateContent`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY
          },
          signal: controller.signal,
          body: requestPayload
        });

        if (response.ok) {
          const json = await response.json();
          console.log(`[TicketExtraction] Extraction succeeded using ${apiVersion}/${modelName}`);
          if (process.env.NODE_ENV !== 'test') {
            cachedWorkingModel = modelName;
            cachedApiVersion = apiVersion;
          }
          return { ok: true, json };
        }

        const errBody = await response.text().catch(() => '');
        console.error(`[TicketExtraction] Gemini API error with ${apiVersion}/${modelName}:`, response.status, errBody);

        let googleErrMsg = '';
        try {
          const parsed = JSON.parse(errBody);
          googleErrMsg = parsed?.error?.message || '';
        } catch {
          googleErrMsg = errBody ? errBody.slice(0, 150) : '';
        }

        const friendlyMsg = googleErrMsg
          ? `Gemini API (${modelName}): ${googleErrMsg}`
          : 'الاستخراج مش متاح دلوقتي، إملى النموذج يدويًا';
        lastError = new BusinessRuleError(friendlyMsg, 'AI_EXTRACTION_FAILED', 502);
        return { ok: false, status: response.status };
      } catch (networkErr) {
        console.error(`[TicketExtraction] Network error with ${apiVersion}/${modelName}:`, networkErr.message);
        lastError = new BusinessRuleError('الاستخراج مش متاح دلوقتي، إملى النموذج يدويًا', 'AI_EXTRACTION_FAILED', 502);
        return { ok: false, status: 0 };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Phase 0: If in-memory model cache exists (production), hit verified model directly
    if (process.env.NODE_ENV !== 'test' && cachedWorkingModel) {
      const res = await tryCallEndpoint(cachedApiVersion, cachedWorkingModel);
      if (res.ok) {
        result = res.json;
      } else {
        clearModelCache();
      }
    }

    // Phase 1: Try candidate models on v1 (GA path first)
    if (!result) {
      for (const modelName of candidateModels) {
        if (attemptCount >= MAX_EXTRACTION_ATTEMPTS) break;
        const res = await tryCallEndpoint('v1', modelName);
        if (res.ok) {
          result = res.json;
          break;
        }
      }
    }

    // Phase 2: If candidate models on v1 failed, try candidate models on v1beta
    if (!result && attemptCount < MAX_EXTRACTION_ATTEMPTS) {
      for (const modelName of candidateModels) {
        if (attemptCount >= MAX_EXTRACTION_ATTEMPTS) break;
        const res = await tryCallEndpoint('v1beta', modelName);
        if (res.ok) {
          result = res.json;
          break;
        }
      }
    }

    // Phase 3: If still not resolved and attempts remain, discover active models via ListModels
    if (!result && attemptCount < MAX_EXTRACTION_ATTEMPTS) {
      try {
        const discovered = await discoverAvailableModels(env.GEMINI_API_KEY);
        for (const { version, modelName } of discovered) {
          if (attemptCount >= MAX_EXTRACTION_ATTEMPTS) break;
          if (candidateModels.includes(modelName)) continue;
          const res = await tryCallEndpoint(version, modelName);
          if (res.ok) {
            result = res.json;
            break;
          }
        }
      } catch (discoverErr) {
        console.warn('[TicketExtraction] Automatic model discovery failed:', discoverErr.message);
      }
    }

    if (!result) {
      if (attemptCount >= MAX_EXTRACTION_ATTEMPTS) {
        throw new BusinessRuleError('الاستخراج مش متاح دلوقتي، إملى النموذج يدويًا', 'AI_EXTRACTION_FAILED', 502);
      }
      throw lastError || new BusinessRuleError('الاستخراج مش متاح دلوقتي، إملى النموذج يدويًا', 'AI_EXTRACTION_FAILED', 502);
    }
    const textPart = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) {
      throw new BusinessRuleError('AI extraction returned no readable data', 'AI_EXTRACTION_EMPTY', 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(textPart);
    } catch {
      throw new BusinessRuleError('AI extraction returned malformed data', 'AI_EXTRACTION_PARSE_ERROR', 502);
    }

    // Security & Domain Rule: Never allow costPrice to be extracted or populated from AI
    if (parsed && typeof parsed === 'object') {
      delete parsed.costPrice;

      if (parsed.passengerName) parsed.passengerName = cleanPassengerName(parsed.passengerName);
      if (parsed.ticketNumber) parsed.ticketNumber = cleanTicketNumber(parsed.ticketNumber);
      if (parsed.flightNumber) parsed.flightNumber = toSingleFlightNumber(parsed.flightNumber);
      if (parsed.returnFlightNumber) parsed.returnFlightNumber = toSingleFlightNumber(parsed.returnFlightNumber);

      if (parsed.origin) parsed.origin = toAirportCode(parsed.origin);
      if (parsed.destination) parsed.destination = toAirportCode(parsed.destination);

      // Smart Dual Pipeline Escalation: If essential flight details are incomplete and not in test mode,
      // perform a targeted second pass with the high-precision Pro fallback model.
      const isMissingEssential = !parsed.passengerName || !parsed.flightNumber || !parsed.origin || !parsed.destination || (!parsed.ticketNumber && !parsed.pnr);
      if (isMissingEssential && process.env.NODE_ENV !== 'test' && attemptCount < MAX_EXTRACTION_ATTEMPTS) {
        try {
          console.log('[TicketExtraction] Essential fields incomplete, escalating to Pro model:', fallbackModel);
          const proRes = await tryCallEndpoint('v1beta', fallbackModel);
          if (proRes.ok && proRes.json?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const proParsed = JSON.parse(proRes.json.candidates[0].content.parts[0].text);
            if (proParsed && typeof proParsed === 'object') {
              for (const [key, val] of Object.entries(proParsed)) {
                if (key !== 'costPrice' && (!parsed[key] || String(parsed[key]).trim() === '')) {
                  parsed[key] = val;
                }
              }
              if (parsed.passengerName) parsed.passengerName = cleanPassengerName(parsed.passengerName);
              if (parsed.ticketNumber) parsed.ticketNumber = cleanTicketNumber(parsed.ticketNumber);
              if (parsed.flightNumber) parsed.flightNumber = toSingleFlightNumber(parsed.flightNumber);
              if (parsed.returnFlightNumber) parsed.returnFlightNumber = toSingleFlightNumber(parsed.returnFlightNumber);
              if (parsed.origin) parsed.origin = toAirportCode(parsed.origin);
              if (parsed.destination) parsed.destination = toAirportCode(parsed.destination);
            }
          }
        } catch (proErr) {
          console.warn('[TicketExtraction] Pro model escalation skipped:', proErr.message);
        }
      }

      // Standardize airline name and IATA 2-letter code if present
      if (parsed.airline || parsed.airlineCode) {
        const matched = findAirline(parsed.airlineCode || parsed.airline) || findAirline(parsed.airline);
        if (matched) {
          parsed.airline = matched.name;
          parsed.airlineCode = matched.code;
        }
      }

      // Log raw AI values before normalization so any future extraction mismatch
      // (e.g. a correct code rejected by the curated allowlist) is diagnosable from server logs.
      if (parsed.origin || parsed.destination) {
        console.log('[TicketExtraction] Raw origin/destination from Gemini:', parsed.origin, '/', parsed.destination);
      }

      // Validate origin/destination against the curated allowlist, but NEVER silently blank
      // a field the model did extract — an agent reviewing a pre-filled (if unverified)
      // suggestion like "ACC" is far better than facing an empty required field with no
      // explanation. Fields outside the curated list are still flagged via unrecognizedFields
      // so the UI can visually mark them for confirmation.
      const unrecognizedFields = [];
      for (const field of ['origin', 'destination']) {
        if (!parsed[field]) continue;
        const code = normalizeValidatedAirportCode(parsed[field]);
        if (code) {
          parsed[field] = code;
        } else {
          unrecognizedFields.push(field);
        }
      }
      if (unrecognizedFields.length) parsed.unrecognizedFields = unrecognizedFields;

      // If no return flight is present, omit all return* fields and set tripType to "One Way"
      if (!parsed.returnDepartureDate && !parsed.returnFlightNumber) {
        parsed.tripType = 'One Way';
        delete parsed.returnFlightNumber;
        delete parsed.returnDepartureDate;
        delete parsed.returnArrivalDate;
      } else {
        parsed.tripType = 'Round Trip';
      }
    }

    return parsed;
  }
};
