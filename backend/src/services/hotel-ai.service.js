/**
 * AfricaTravel — AI-Powered Hotel Booking Generation Service
 *
 * Integrates with Google Gemini API to generate authentic, realistic hotel reservation
 * confirmations and vouchers based on client name, destination, and stay period.
 *
 * Includes an extensive fallback database covering top worldwide destinations
 * for guaranteed 100% uptime and immediate response.
 */

import { env } from '../config/env.js';

const GEMINI_REQUEST_TIMEOUT_MS = 12000;

// Curated authentic hotel catalog for high-precision instant fallback
const CURATED_HOTELS = {
  // UAE
  dubai: {
    hotelName: 'Atlantis The Royal, Palm Jumeirah',
    hotelStars: 5,
    city: 'Dubai',
    country: 'United Arab Emirates',
    hotelAddress: 'Crescent Road, Palm Jumeirah, Dubai, United Arab Emirates',
    roomType: 'Luxury King Skyline Room',
    boardBasis: 'Bed & Breakfast (Buffet Included)',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Private Beach Access', 'Infinity Sky Pool', 'Complimentary Wi-Fi', 'World-Class Spa', 'Valet Parking']
  },
  uae: {
    hotelName: 'Burj Al Arab Jumeirah',
    hotelStars: 5,
    city: 'Dubai',
    country: 'United Arab Emirates',
    hotelAddress: 'Umm Suqeim 3, Jumeirah Beach Road, Dubai, UAE',
    roomType: 'Deluxe One-Bedroom Suite',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Butler Service', 'Private Beach', 'Talise Spa', 'Helipad Access', 'Complimentary Luxury Toiletries']
  },
  // Saudi Arabia
  saudi: {
    hotelName: 'The Ritz-Carlton, Riyadh',
    hotelStars: 5,
    city: 'Riyadh',
    country: 'Saudi Arabia',
    hotelAddress: 'Al Hada Area, Makkah Road, Riyadh 11493, Saudi Arabia',
    roomType: 'Deluxe King Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Indoor Heated Pool', 'Gentlemen\'s Spa', 'High-speed Wi-Fi', 'Fine Dining Restaurants', 'Concierge Service']
  },
  makkah: {
    hotelName: 'Makkah Clock Royal Tower, A Fairmont Hotel',
    hotelStars: 5,
    city: 'Makkah',
    country: 'Saudi Arabia',
    hotelAddress: 'King Abdul Aziz Endowment, Abraj Al Bait, Makkah, Saudi Arabia',
    roomType: 'Kaaba View Deluxe Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '16:00',
    checkOutTime: '12:00',
    amenities: ['Direct Haram Access', 'High-speed Wi-Fi', 'Prayer Rooms', 'Shopping Mall Access', '24h Room Service']
  },
  // Egypt
  egypt: {
    hotelName: 'Four Seasons Hotel Cairo at Nile Plaza',
    hotelStars: 5,
    city: 'Cairo',
    country: 'Egypt',
    hotelAddress: '1089 Corniche El Nil, Garden City, Cairo 11519, Egypt',
    roomType: 'Superior Nile-View King Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Panoramic Nile Views', 'Outdoor & Indoor Pools', 'Full-service Spa', 'Free Wi-Fi', 'Fine Dining']
  },
  cairo: {
    hotelName: 'The St. Regis Cairo',
    hotelStars: 5,
    city: 'Cairo',
    country: 'Egypt',
    hotelAddress: '1189 Nile Corniche, Boulaq, Cairo Governorate 11221, Egypt',
    roomType: 'Grand Deluxe River View Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['St. Regis Butler Service', 'Iridium Spa', 'Indoor & Outdoor Pools', 'Complimentary Wi-Fi', 'Valet Parking']
  },
  // Turkey
  turkey: {
    hotelName: 'Ciragan Palace Kempinski Istanbul',
    hotelStars: 5,
    city: 'Istanbul',
    country: 'Turkey',
    hotelAddress: 'Yildiz, Ciragan Cd. No:32, 34349 Besiktas/Istanbul, Turkey',
    roomType: 'Grand Bosphorus View King Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    amenities: ['Infinity Bosphorus Pool', 'Historical Ottoman Palace', 'Spa & Wellness Center', 'Free High-speed Wi-Fi']
  },
  istanbul: {
    hotelName: 'Four Seasons Hotel Istanbul at the Bosphorus',
    hotelStars: 5,
    city: 'Istanbul',
    country: 'Turkey',
    hotelAddress: 'Ciragan Cad. No: 28, Besiktas, 34349 Istanbul, Turkey',
    roomType: 'Courtyard Palace King Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Waterfront Terrace', 'Heated Outdoor Pool', 'Turkish Hammam', '24h Concierge', 'Complimentary Wi-Fi']
  },
  // United Kingdom
  uk: {
    hotelName: 'The Savoy London',
    hotelStars: 5,
    city: 'London',
    country: 'United Kingdom',
    hotelAddress: 'Strand, London WC2R 0EZ, United Kingdom',
    roomType: 'Luxury King River View Room',
    boardBasis: 'Continental Breakfast Included',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Gordon Ramsay Dining', 'Indoor Swimming Pool', '24h Butler Service', 'Valet Parking', 'Free Wi-Fi']
  },
  london: {
    hotelName: 'The Ritz London',
    hotelStars: 5,
    city: 'London',
    country: 'United Kingdom',
    hotelAddress: '150 Piccadilly, St. James\'s, London W1J 9BR, United Kingdom',
    roomType: 'Superior Queen Room',
    boardBasis: 'Traditional English Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Michelin-starred Restaurant', 'Afternoon Tea Lounge', 'Concierge Service', 'Complimentary High-speed Wi-Fi']
  },
  // France
  france: {
    hotelName: 'Hotel Plaza Athénée Paris',
    hotelStars: 5,
    city: 'Paris',
    country: 'France',
    hotelAddress: '25 Avenue Montaigne, 75008 Paris, France',
    roomType: 'Deluxe Avenue View Room',
    boardBasis: 'Parisian Breakfast Included',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Eiffel Tower Views', 'Dior Spa', 'Courtyard Garden', 'Michelin Dining', 'Complimentary High-speed Wi-Fi']
  },
  paris: {
    hotelName: 'Le Bristol Paris - an Oetker Collection Hotel',
    hotelStars: 5,
    city: 'Paris',
    country: 'France',
    hotelAddress: '112 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
    roomType: 'Deluxe Junior Suite',
    boardBasis: 'American Breakfast Included',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Rooftop Swimming Pool', 'Spa Le Bristol by La Prairie', 'French Courtyard Garden', 'Complimentary Wi-Fi']
  },
  // Italy
  italy: {
    hotelName: 'Hotel de Russie, a Rocco Forte Hotel',
    hotelStars: 5,
    city: 'Rome',
    country: 'Italy',
    hotelAddress: 'Via del Babuino 9, Spagna, 00187 Rome, Italy',
    roomType: 'Classic King Room with Secret Garden View',
    boardBasis: 'Buffet Breakfast Included',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Secret Terraced Gardens', 'De Russie Spa', 'Fine Italian Dining', 'Central Location near Spanish Steps']
  },
  // Qatar
  qatar: {
    hotelName: 'Marsa Malaz Kempinski, The Pearl',
    hotelStars: 5,
    city: 'Doha',
    country: 'Qatar',
    hotelAddress: 'Costa Malaz Bay, The Pearl, Doha, Qatar',
    roomType: 'Deluxe Pearl King Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Private Beach', 'Outdoor Pools', 'Clarins Spa', 'Tennis Courts', 'Free High-speed Wi-Fi']
  },
  // Thailand
  thailand: {
    hotelName: 'Mandarin Oriental, Bangkok',
    hotelStars: 5,
    city: 'Bangkok',
    country: 'Thailand',
    hotelAddress: '48 Oriental Avenue, Bang Rak, Bangkok 10500, Thailand',
    roomType: 'Deluxe Chao Phraya River Room',
    boardBasis: 'Bed & Breakfast',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['Chao Phraya River Views', 'The Oriental Spa', 'Multiple Award-winning Restaurants', 'Private Boat Shuttle']
  }
};

/**
 * Generate unique international booking & confirmation codes
 */
export function generateReferenceCodes() {
  const randNum = Math.floor(100000 + Math.random() * 900000);
  const confNum = Math.floor(10000000 + Math.random() * 90000000);
  return {
    bookingReference: `AT-HTL-${randNum}`,
    confirmationNumber: `CNF-${confNum}`
  };
}

/**
 * Calculate total nights between two ISO date strings
 */
export function calculateNights(checkInStr, checkOutStr) {
  const inDate = new Date(checkInStr);
  const outDate = new Date(checkOutStr);
  const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays || 1);
}

/**
 * Retrieve curated fallback hotel data matching the destination query
 */
export function getCuratedFallback(countryOrCity) {
  const query = (countryOrCity || '').toLowerCase().trim();
  for (const [key, hotel] of Object.entries(CURATED_HOTELS)) {
    if (query.includes(key) || key.includes(query)) {
      return { ...hotel };
    }
  }

  // Generic fallback if unknown destination
  const cleanDest = countryOrCity ? countryOrCity.trim() : 'International Destination';
  return {
    hotelName: `Grand Palace Hotel & Resort ${cleanDest}`,
    hotelStars: 5,
    city: cleanDest,
    country: cleanDest,
    hotelAddress: `Central Boulevard, City Center, ${cleanDest}`,
    roomType: 'Deluxe King Executive Room',
    boardBasis: 'Bed & Breakfast (Buffet Included)',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    amenities: ['High-speed Wi-Fi', 'Executive Lounge Access', 'Swimming Pool & Spa', '24-hour Room Service', 'Concierge']
  };
}

/**
 * Main AI generation function using Gemini API with automatic fallback
 */
export async function generateHotelBookingDetails({ clientName, country, checkIn, checkOut, customerId = null }) {
  const nights = calculateNights(checkIn, checkOut);
  const { bookingReference, confirmationNumber } = generateReferenceCodes();
  const apiKey = env.GEMINI_API_KEY;

  const fallbackData = getCuratedFallback(country);

  // If no API key configured, use our rich curated database directly
  if (!apiKey) {
    return {
      bookingReference,
      confirmationNumber,
      clientName: clientName.trim(),
      customerId: customerId || null,
      hotelName: fallbackData.hotelName,
      hotelStars: fallbackData.hotelStars,
      hotelAddress: fallbackData.hotelAddress,
      city: fallbackData.city,
      country: fallbackData.country,
      checkIn: new Date(checkIn).toISOString(),
      checkOut: new Date(checkOut).toISOString(),
      nights,
      roomType: fallbackData.roomType,
      boardBasis: fallbackData.boardBasis,
      guests: '1 Adult (Standard Single/Double Occupancy)',
      checkInTime: fallbackData.checkInTime,
      checkOutTime: fallbackData.checkOutTime,
      amenities: fallbackData.amenities,
      specialRequests: 'Non-smoking room, Quiet area, High floor requested',
      cancellationPolicy: 'Free cancellation anytime up to 48 hours before check-in.',
      paymentStatus: 'Paid online',
      price: 'US$ 450',
      reviewScore: '9.1 Superb · 3,120 reviews',
      hotelPhone: '+971 4 399 9999',
      bookingNumber: `${Math.floor(1000 + Math.random() * 9000)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}`,
      pinCode: `${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'CONFIRMED',
      source: 'CURATED_CATALOG',
      provider: 'CATALOG',
      generatedByAi: false
    };
  }

  // Construct structured prompt for Gemini
  const prompt = `You are a luxury travel agency reservation specialist at AfricaTravel.
A client needs an authentic, top-tier hotel booking confirmation voucher.
Generate realistic, verified hotel booking information for this request:
- Client / Lead Guest Name: "${clientName}"
- Destination (Country / City): "${country}"
- Check-in Date: ${checkIn}
- Check-out Date: ${checkOut}
- Total Stay: ${nights} Night(s)

CRITICAL INSTRUCTIONS:
1. Select a real, famous, highly prestigious 4-star or 5-star hotel in or near "${country}".
2. Provide the exact real address and city.
3. Choose an attractive room category (e.g. Deluxe Room, Executive Suite, Sea/City View).
4. Set the meal plan (e.g. Bed & Breakfast, All Inclusive, Half Board).
5. Output MUST be ONLY valid JSON matching this exact structure:
{
  "hotelName": "Real hotel name",
  "hotelStars": 5,
  "city": "City name",
  "country": "Country name",
  "hotelAddress": "Full realistic street address",
  "roomType": "Deluxe King Room",
  "boardBasis": "Bed & Breakfast (Buffet Included)",
  "guests": "1 Adult",
  "checkInTime": "15:00",
  "checkOutTime": "12:00",
  "amenities": ["High-speed Wi-Fi", "Swimming Pool", "Spa & Wellness", "24/7 Room Service"],
  "specialRequests": "Non-smoking room, high floor preferred",
  "cancellationPolicy": "Prepaid and guaranteed by AfricaTravel. Free cancellation up to 48 hours prior to arrival."
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[HotelAI] Gemini API responded with status ${response.status}. Using curated database.`);
      return buildFinalResult(fallbackData, {
        bookingReference,
        confirmationNumber,
        clientName,
        customerId,
        checkIn,
        checkOut,
        nights,
        generatedByAi: false
      });
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return buildFinalResult(fallbackData, {
        bookingReference,
        confirmationNumber,
        clientName,
        customerId,
        checkIn,
        checkOut,
        nights,
        generatedByAi: false
      });
    }

    const parsed = JSON.parse(textContent);

    return {
      bookingReference,
      confirmationNumber,
      clientName: clientName.trim(),
      customerId: customerId || null,
      hotelName: parsed.hotelName || fallbackData.hotelName,
      hotelStars: typeof parsed.hotelStars === 'number' ? parsed.hotelStars : 5,
      hotelAddress: parsed.hotelAddress || fallbackData.hotelAddress,
      city: parsed.city || fallbackData.city,
      country: parsed.country || fallbackData.country,
      checkIn: new Date(checkIn).toISOString(),
      checkOut: new Date(checkOut).toISOString(),
      nights,
      roomType: parsed.roomType || fallbackData.roomType,
      boardBasis: parsed.boardBasis || fallbackData.boardBasis,
      guests: parsed.guests || '1 Adult',
      checkInTime: parsed.checkInTime || '15:00',
      checkOutTime: parsed.checkOutTime || '12:00',
      amenities: Array.isArray(parsed.amenities) && parsed.amenities.length > 0 ? parsed.amenities : fallbackData.amenities,
      specialRequests: parsed.specialRequests || 'Non-smoking room, high floor requested',
      cancellationPolicy: parsed.cancellationPolicy || 'Free cancellation anytime up to 48 hours before check-in.',
      paymentStatus: 'Paid online',
      price: parsed.price || 'US$ 450',
      reviewScore: parsed.reviewScore || '9.0 Superb · 2,800 reviews',
      hotelPhone: parsed.hotelPhone || '+971 4 399 9999',
      bookingNumber: `${Math.floor(1000 + Math.random() * 9000)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}`,
      pinCode: `${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'CONFIRMED',
      source: 'GEMINI_AI',
      provider: 'AI',
      generatedByAi: true
    };
  } catch (err) {
    console.warn(`[HotelAI] Error calling Gemini: ${err.message}. Using high-quality curated data.`);
    return buildFinalResult(fallbackData, {
      bookingReference,
      confirmationNumber,
      clientName,
      customerId,
      checkIn,
      checkOut,
      nights,
      generatedByAi: false
    });
  }
}

function buildFinalResult(fallback, meta) {
  const p1 = Math.floor(1000 + Math.random() * 9000);
  const p2 = Math.floor(100 + Math.random() * 900);
  const p3 = Math.floor(100 + Math.random() * 900);
  const pin = Math.floor(1000 + Math.random() * 9000);

  return {
    bookingReference: meta.bookingReference,
    confirmationNumber: meta.confirmationNumber,
    bookingNumber: `${p1}.${p2}.${p3}`,
    pinCode: `${pin}`,
    clientName: meta.clientName.trim(),
    customerId: meta.customerId || null,
    hotelName: fallback.hotelName,
    hotelStars: fallback.hotelStars || 5,
    hotelAddress: fallback.hotelAddress,
    hotelPhone: fallback.hotelPhone || '+971 4 399 9999',
    city: fallback.city,
    country: fallback.country,
    checkIn: new Date(meta.checkIn).toISOString(),
    checkOut: new Date(meta.checkOut).toISOString(),
    nights: meta.nights,
    roomType: fallback.roomType,
    boardBasis: fallback.boardBasis,
    price: 'US$ 450',
    reviewScore: '9.1 Superb · 2,900 reviews',
    guests: '1 Adult',
    checkInTime: fallback.checkInTime,
    checkOutTime: fallback.checkOutTime,
    amenities: fallback.amenities,
    specialRequests: 'Non-smoking room, high floor requested',
    cancellationPolicy: 'Free cancellation anytime up to 48 hours before check-in.',
    paymentStatus: 'Paid online',
    status: 'CONFIRMED',
    source: meta.generatedByAi ? 'GEMINI_AI' : 'CURATED_CATALOG',
    provider: meta.generatedByAi ? 'AI' : 'CATALOG',
    generatedByAi: meta.generatedByAi ?? false
  };
}
