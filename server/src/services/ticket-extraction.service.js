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

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    passengerName: { type: 'string' },
    pnr: { type: 'string' },
    ticketNumber: { type: 'string' },
    airline: { type: 'string' },
    airlineCode: { type: 'string' },
    flightNumber: { type: 'string' },
    origin: { type: 'string' },
    destination: { type: 'string' },
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
    const prompt = `Extract flight ticket booking details from this document. Return ONLY the fields you can clearly identify — omit any field you cannot confidently read. Dates must be in YYYY-MM-DD format. If no return flight is present, omit all return* fields and set tripType to "One Way".`;

    const modelName = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: EXTRACTION_SCHEMA
          }
        })
      });
    } catch (networkErr) {
      console.error('[TicketExtraction] Network error contacting Gemini API:', networkErr.message);
      throw new BusinessRuleError('Unable to connect to AI extraction service. Please fill the form manually.', 'AI_EXTRACTION_FAILED', 502);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[TicketExtraction] Gemini API error:', response.status, errBody);
      throw new BusinessRuleError('Failed to extract data from document. Please fill the form manually.', 'AI_EXTRACTION_FAILED', 502);
    }

    const result = await response.json();
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
    }

    return parsed;
  }
};
