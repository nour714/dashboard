/**
 * AfricaTravel — RapidAPI Booking.com Integration Service
 * Fetches authentic real-time hotel data and original Booking.com photos via RapidAPI.
 */

import { env } from '../config/env.js';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || env.RAPIDAPI_KEY || 'bba14b81b0msh883ec82fafa25afp1d0b9ajsnd3d771d2d3cf';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || env.RAPIDAPI_HOST || 'booking-com15.p.rapidapi.com';

const IATA_AIRPORT_CODES = {
  KUL: 'Kuala Lumpur, Malaysia',
  DXB: 'Dubai, United Arab Emirates',
  DWC: 'Dubai, United Arab Emirates',
  AUH: 'Abu Dhabi, United Arab Emirates',
  SHJ: 'Sharjah, United Arab Emirates',
  CAI: 'Cairo, Egypt',
  HBE: 'Alexandria, Egypt',
  ALY: 'Alexandria, Egypt',
  SSH: 'Sharm El Sheikh, Egypt',
  HRG: 'Hurghada, Egypt',
  LXR: 'Luxor, Egypt',
  ASW: 'Aswan, Egypt',
  RUH: 'Riyadh, Saudi Arabia',
  JED: 'Jeddah, Saudi Arabia',
  MED: 'Medina, Saudi Arabia',
  DMM: 'Dammam, Saudi Arabia',
  IST: 'Istanbul, Turkey',
  SAW: 'Istanbul, Turkey',
  AYT: 'Antalya, Turkey',
  ESB: 'Ankara, Turkey',
  CDG: 'Paris, France',
  ORY: 'Paris, France',
  LHR: 'London, United Kingdom',
  LGW: 'London, United Kingdom',
  STN: 'London, United Kingdom',
  LTN: 'London, United Kingdom',
  MAN: 'Manchester, United Kingdom',
  FCO: 'Rome, Italy',
  CIA: 'Rome, Italy',
  MXP: 'Milan, Italy',
  LIN: 'Milan, Italy',
  BGY: 'Milan, Italy',
  MAD: 'Madrid, Spain',
  BCN: 'Barcelona, Spain',
  AGP: 'Malaga, Spain',
  FRA: 'Frankfurt, Germany',
  MUC: 'Munich, Germany',
  BER: 'Berlin, Germany',
  BKK: 'Bangkok, Thailand',
  DMK: 'Bangkok, Thailand',
  HKT: 'Phuket, Thailand',
  CNX: 'Chiang Mai, Thailand',
  DOH: 'Doha, Qatar',
  KWI: 'Kuwait City, Kuwait',
  BAH: 'Manama, Bahrain',
  MCT: 'Muscat, Oman',
  TBS: 'Tbilisi, Georgia',
  AMM: 'Amman, Jordan',
  BEY: 'Beirut, Lebanon',
  CMN: 'Casablanca, Morocco',
  RAK: 'Marrakech, Morocco',
  TUN: 'Tunis, Tunisia',
  JFK: 'New York, United States',
  EWR: 'New York, United States',
  LAX: 'Los Angeles, United States',
  MIA: 'Miami, United States',
  ORD: 'Chicago, United States',
  SIN: 'Singapore',
  NRT: 'Tokyo, Japan',
  HND: 'Tokyo, Japan'
};

const ARABIC_TO_ENGLISH = {
  'ماليزيا': 'Kuala Lumpur, Malaysia',
  'كوالالمبور': 'Kuala Lumpur, Malaysia',
  'دبي': 'Dubai, United Arab Emirates',
  'الامارات': 'Dubai, United Arab Emirates',
  'الإمارات': 'Dubai, United Arab Emirates',
  'السعودية': 'Riyadh, Saudi Arabia',
  'المملكة العربية السعودية': 'Riyadh, Saudi Arabia',
  'الرياض': 'Riyadh, Saudi Arabia',
  'مكة': 'Makkah, Saudi Arabia',
  'المدينة': 'Medina, Saudi Arabia',
  'جدة': 'Jeddah, Saudi Arabia',
  'مصر': 'Cairo, Egypt',
  'القاهرة': 'Cairo, Egypt',
  'الإسكندرية': 'Alexandria, Egypt',
  'اسكندرية': 'Alexandria, Egypt',
  'شرم الشيخ': 'Sharm El Sheikh, Egypt',
  'الغردقة': 'Hurghada, Egypt',
  'تركيا': 'Istanbul, Turkey',
  'اسطنبول': 'Istanbul, Turkey',
  'إسطنبول': 'Istanbul, Turkey',
  'انطاليا': 'Antalya, Turkey',
  'فرنسا': 'Paris, France',
  'باريس': 'Paris, France',
  'بريطانيا': 'London, United Kingdom',
  'لندن': 'London, United Kingdom',
  'ايطاليا': 'Rome, Italy',
  'إيطاليا': 'Rome, Italy',
  'روما': 'Rome, Italy',
  'ميلانو': 'Milan, Italy',
  'اسبانيا': 'Madrid, Spain',
  'إسبانيا': 'Madrid, Spain',
  'مدريد': 'Madrid, Spain',
  'برشلونة': 'Barcelona, Spain',
  'المانيا': 'Berlin, Germany',
  'ألمانيا': 'Berlin, Germany',
  'برلين': 'Berlin, Germany',
  'ميونخ': 'Munich, Germany',
  'تايلاند': 'Bangkok, Thailand',
  'بانكوك': 'Bangkok, Thailand',
  'بوكيت': 'Phuket, Thailand',
  'قطر': 'Doha, Qatar',
  'الدوحة': 'Doha, Qatar',
  'الكويت': 'Kuwait City, Kuwait',
  'البحرين': 'Manama, Bahrain',
  'عمان': 'Muscat, Oman',
  'مسقط': 'Muscat, Oman',
  'جورجيا': 'Tbilisi, Georgia',
  'تبليسي': 'Tbilisi, Georgia'
};

function normalizeDestination(raw) {
  if (!raw) return 'Kuala Lumpur, Malaysia';
  const clean = raw.trim();
  const upper = clean.toUpperCase();

  if (IATA_AIRPORT_CODES[upper]) {
    return IATA_AIRPORT_CODES[upper];
  }

  for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH)) {
    if (clean.includes(ar)) {
      return clean.replace(ar, en);
    }
  }

  if (clean.toLowerCase() === 'malaysia') return 'Kuala Lumpur, Malaysia';
  if (clean.toLowerCase() === 'egypt') return 'Cairo, Egypt';
  if (clean.toLowerCase() === 'uae' || clean.toLowerCase() === 'emirates') return 'Dubai, United Arab Emirates';
  if (clean.toLowerCase() === 'saudi' || clean.toLowerCase() === 'ksa') return 'Riyadh, Saudi Arabia';

  return clean;
}

function generateHotelPhone(destination, hotelName = '') {
  const dest = `${destination} ${hotelName}`.toLowerCase();
  const rand = (min, max) => Math.floor(min + Math.random() * (max - min));

  if (dest.includes('malaysia') || dest.includes('kuala lumpur')) {
    return `+60 11 ${rand(600, 899)} ${rand(1000, 9999)}`;
  } else if (dest.includes('dubai') || dest.includes('uae') || dest.includes('emirates')) {
    return `+971 4 ${rand(300, 599)} ${rand(1000, 9999)}`;
  } else if (dest.includes('saudi') || dest.includes('riyadh') || dest.includes('makkah')) {
    return `+966 11 ${rand(400, 899)} ${rand(1000, 9999)}`;
  } else if (dest.includes('egypt') || dest.includes('cairo')) {
    return `+20 2 2${rand(300, 799)} ${rand(1000, 9999)}`;
  } else if (dest.includes('turkey') || dest.includes('istanbul')) {
    return `+90 212 ${rand(300, 599)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('france') || dest.includes('paris')) {
    return `+33 1 ${rand(40, 59)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('uk') || dest.includes('london')) {
    return `+44 20 ${rand(7100, 7999)} ${rand(1000, 9999)}`;
  } else if (dest.includes('germany') || dest.includes('berlin')) {
    return `+49 30 ${rand(2000, 8999)} ${rand(100, 999)}`;
  } else if (dest.includes('italy') || dest.includes('rome')) {
    return `+39 06 ${rand(4000, 8999)} ${rand(100, 999)}`;
  }
  return `+1 555 ${rand(200, 899)} ${rand(1000, 9999)}`;
}

export const RapidApiBookingService = {
  /**
   * Search real live hotel from Booking.com via RapidAPI
   * @param {Object} params
   * @param {string} params.destination
   * @param {string} params.checkIn YYYY-MM-DD
   * @param {string} params.checkOut YYYY-MM-DD
   * @returns {Promise<Object|null>} Structured hotel data or null
   */
  async fetchLiveHotel({ destination, checkIn, checkOut }) {
    if (!RAPIDAPI_KEY) {
      console.warn('[RapidApiBooking] RAPIDAPI_KEY is not configured.');
      return null;
    }

    try {
      const normalizedDest = normalizeDestination(destination);
      const cleanCity = normalizedDest.split(',')[0].trim() || normalizedDest;

      const headers = {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      };

      // 1. Search Destination ID
      const destUrl = `https://${RAPIDAPI_HOST}/api/v1/hotels/searchDestination?query=${encodeURIComponent(normalizedDest)}`;
      const destRes = await fetch(destUrl, { headers });
      if (!destRes.ok) {
        console.warn(`[RapidApiBooking] searchDestination returned status ${destRes.status}`);
        return null;
      }

      const destData = await destRes.json();
      if (!destData || !Array.isArray(destData.data) || destData.data.length === 0) {
        console.warn(`[RapidApiBooking] No destination found for "${normalizedDest}"`);
        return null;
      }

      const destMatch = destData.data[0];
      const destId = destMatch.dest_id;
      const searchType = destMatch.search_type || 'city';
      const resolvedCountry = destMatch.country || normalizedDest;

      // Format dates YYYY-MM-DD
      const inStr = new Date(checkIn).toISOString().split('T')[0];
      const outStr = new Date(checkOut).toISOString().split('T')[0];

      // 2. Search Hotels
      const hotelsUrl = `https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels?dest_id=${destId}&search_type=${searchType}&arrival_date=${inStr}&departure_date=${outStr}&adults=1&room_qty=1&page_number=1&currency_code=USD`;
      const hotelsRes = await fetch(hotelsUrl, { headers });
      if (!hotelsRes.ok) {
        console.warn(`[RapidApiBooking] searchHotels returned status ${hotelsRes.status}`);
        return null;
      }

      const hotelsData = await hotelsRes.json();
      const hotelsList = hotelsData?.data?.hotels;
      if (!Array.isArray(hotelsList) || hotelsList.length === 0) {
        console.warn(`[RapidApiBooking] No hotel listings returned for dest_id: ${destId}`);
        return null;
      }

      // 3. Random selection among top real hotels
      const validHotels = hotelsList.filter(h => h && h.property && h.property.name);
      if (validHotels.length === 0) return null;

      const randomChoice = validHotels[Math.floor(Math.random() * Math.min(validHotels.length, 12))];
      const prop = randomChoice.property;

      const hotelName = prop.name.trim();

      // Clean Room Type description (strip HTML tags)
      let roomType = 'Deluxe King Room';
      if (prop.recommendedUnitsConfigurationLabel) {
        const rawLabel = prop.recommendedUnitsConfigurationLabel.replace(/<[^>]*>/g, '').trim();
        const firstPart = rawLabel.split(':')[0].trim();
        roomType = firstPart.length > 3 ? firstPart : 'Deluxe Double Room';
      }

      // Star rating
      let stars = parseInt(prop.propertyClass || prop.accuratePropertyClass || 0, 10);
      if (stars < 1 || stars > 5) stars = 5;

      // Price
      const priceText = prop.priceBreakdown?.grossPrice?.amountRounded || 'US$ 350';

      // Review Score
      const scoreNum = prop.reviewScore ? Number(prop.reviewScore).toFixed(1) : '8.9';
      const scoreWord = prop.reviewScoreWord || 'Fabulous';
      const reviewCount = prop.reviewCount ? `${prop.reviewCount} reviews` : '1,500 reviews';
      const reviewScore = `${scoreNum} ${scoreWord} · ${reviewCount}`;

      // High-resolution image upgrade
      let photoUrl = '';
      if (Array.isArray(prop.photoUrls) && prop.photoUrls.length > 0) {
        photoUrl = prop.photoUrls[0];
        // Upgrade to highest resolution
        photoUrl = photoUrl.replace(/square(240|60|180|120|500)/, 'max1024x768');
      }

      // Realistic Booking.com confirmation & PIN
      const r1 = Math.floor(1000 + Math.random() * 9000);
      const r2 = Math.floor(100 + Math.random() * 900);
      const r3 = Math.floor(100 + Math.random() * 900);
      const bookingNumber = `${r1}.${r2}.${r3}`;
      const pinCode = `${Math.floor(1000 + Math.random() * 9000)}`;

      const hotelPhone = generateHotelPhone(normalizedDest, hotelName);
      const hotelAddress = prop.wishlistName
        ? `${prop.wishlistName}, ${cleanCity}, ${resolvedCountry}`
        : `${cleanCity} Center, ${resolvedCountry}`;

      return {
        hotelName,
        hotelStars: stars,
        city: cleanCity,
        country: resolvedCountry,
        hotelAddress,
        hotelPhone,
        roomType,
        boardBasis: 'Breakfast included',
        price: priceText,
        reviewScore,
        hotelImage: photoUrl || 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
        bookingNumber,
        pinCode,
        checkInTime: prop.checkin?.fromTime || '15:00',
        checkOutTime: prop.checkout?.untilTime || '12:00',
        amenities: [
          'Free high-speed WiFi',
          'Air conditioning',
          'Private bathroom',
          'Flat-screen TV',
          'Free toiletries',
          'Coffee/tea maker',
          'Soundproofing'
        ],
        specialRequests: 'Non-smoking room, high floor requested',
        cancellationPolicy: 'Free cancellation anytime up to 48 hours before check-in.',
        paymentStatus: 'Paid online',
        source: 'BOOKING_RAPIDAPI',
        provider: 'RAPIDAPI'
      };
    } catch (err) {
      console.warn('[RapidApiBooking] Error querying Booking.com API:', err.message);
      return null;
    }
  }
};
