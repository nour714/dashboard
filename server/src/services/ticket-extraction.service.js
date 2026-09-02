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

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    passengerName: { type: 'string' },
    pnr: { type: 'string' },
    ticketNumber: { type: 'string' },
    airline: { type: 'string' },
    airlineCode: { type: 'string' },
    flightNumber: { type: 'string' },
    origin: { type: 'string', description: '3-letter IATA airport code (e.g. CAI)' },
    destination: { type: 'string', description: '3-letter IATA airport code (e.g. DXB)' },
    departureDate: { type: 'string', description: 'YYYY-MM-DD format' },
    tripType: { type: 'string', enum: ['One Way', 'Round Trip'] },
    returnFlightNumber: { type: 'string' },
    returnDepartureDate: { type: 'string', description: 'YYYY-MM-DD format, or omit if one-way' },
    ticketPrice: { type: 'number' },
    currency: { type: 'string' },
    nationality: { type: 'string' },
    dob: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' }
  }
};

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
    const prompt = `Extract flight ticket booking details from this document. Return ONLY the fields you can clearly identify — omit any field you cannot confidently read. Standardize airline names and their 2-letter IATA codes (e.g., EgyptAir MS, Air Cairo SM, Emirates EK, Etihad Airways EY, Qatar Airways QR, Turkish Airlines TK, Saudia SV, Flynas XY, flydubai FZ, Air Arabia G9, British Airways BA, Air France AF, Lufthansa LH, KLM KL, Iberia IB, ITA Airways AZ, Aegean Airlines A3, American Airlines AA, Delta Air Lines DL, United Airlines UA, Air Canada AC, Air China CA, China Eastern MU, China Southern CZ, Singapore Airlines SQ, Ethiopian Airlines ET, Kenya Airways KQ, Royal Air Maroc AT, Tunisair TU, Air Algérie AH). For "origin" and "destination", return ONLY the 3-letter IATA airport code (e.g. "CAI", "DXB") — never the city name, country name, or full airport name. Dates must be in YYYY-MM-DD format. If no return flight is present, omit all return* fields and set tripType to "One Way".`;

    const primaryModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const candidateModels = Array.from(new Set([primaryModel, 'gemini-2.5-flash-lite']));

    let lastError = null;
    let result = null;

    for (const modelName of candidateModels) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } }
              ]
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: EXTRACTION_SCHEMA,
              thinkingConfig: {
                thinkingLevel: 'low'
              },
              maxOutputTokens: 1000
            }
          })
        });

        if (response.ok) {
          result = await response.json();
          break;
        }

        const errBody = await response.text().catch(() => '');
        console.error(`[TicketExtraction] Gemini API error with model ${modelName}:`, response.status, errBody);
        lastError = new BusinessRuleError('Failed to extract data from document. Please fill the form manually.', 'AI_EXTRACTION_FAILED', 502);
      } catch (networkErr) {
        console.error(`[TicketExtraction] Network error with model ${modelName}:`, networkErr.message);
        lastError = new BusinessRuleError('Unable to connect to AI extraction service. Please fill the form manually.', 'AI_EXTRACTION_FAILED', 502);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!result) {
      throw lastError || new BusinessRuleError('Failed to extract data from document. Please fill the form manually.', 'AI_EXTRACTION_FAILED', 502);
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

      // Standardize airline name and IATA 2-letter code if present
      if (parsed.airline || parsed.airlineCode) {
        const matched = findAirline(parsed.airlineCode || parsed.airline) || findAirline(parsed.airline);
        if (matched) {
          parsed.airline = matched.name;
          parsed.airlineCode = matched.code;
        }
      }

      // Standardize origin and destination to 3-letter uppercase IATA code if present
      if (parsed.origin && typeof parsed.origin === 'string') {
        const match = parsed.origin.trim().toUpperCase().match(/\b([A-Z]{3})\b/);
        parsed.origin = match ? match[1] : parsed.origin.trim().toUpperCase().slice(0, 3);
      }
      if (parsed.destination && typeof parsed.destination === 'string') {
        const match = parsed.destination.trim().toUpperCase().match(/\b([A-Z]{3})\b/);
        parsed.destination = match ? match[1] : parsed.destination.trim().toUpperCase().slice(0, 3);
      }

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
