import { generateHotelPhone, formatDdmCoordinates } from './rapidapi-booking.service.js';

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

const ROOM_TYPES = [
  'Deluxe King Room', 'Superior Double Room', 'Executive Suite', 
  'Grand Deluxe Room', 'Premium King Room', 'Luxury Suite', 
  'Deluxe Twin Room', 'Junior Suite', 'Club Room', 'Presidential Suite'
];

function getPriceEstimation(destination) {
  const destLower = destination.toLowerCase();
  
  const middleEast = ['dubai', 'uae', 'emirates', 'abu dhabi', 'riyadh', 'saudi', 'ksa', 'jeddah', 'makkah', 'medina', 'qatar', 'doha', 'kuwait', 'bahrain', 'oman', 'muscat', 'jordan', 'amman'];
  if (middleEast.some(p => destLower.includes(p))) return 'US$ 280-550';
  
  const europe = ['paris', 'france', 'london', 'uk', 'united kingdom', 'rome', 'italy', 'milan', 'madrid', 'spain', 'barcelona', 'berlin', 'germany', 'munich'];
  if (europe.some(p => destLower.includes(p))) return 'EUR 320-680';
  
  const southeastAsia = ['kuala lumpur', 'malaysia', 'bangkok', 'thailand', 'phuket', 'singapore', 'indonesia', 'bali'];
  if (southeastAsia.some(p => destLower.includes(p))) return 'US$ 180-380';
  
  return 'US$ 250-450';
}

export const OpenHotelService = {
  /**
   * Search real live hotel from OpenStreetMap (Nominatim & OSM Tourism Database)
   * @param {Object} params
   * @param {string} params.destination
   * @param {string} params.checkIn YYYY-MM-DD
   * @param {string} params.checkOut YYYY-MM-DD
   * @returns {Promise<Object|null>} Structured hotel data or null
   */
  async fetchHotel({ destination, _checkIn, _checkOut }) {
    try {
      const normalizedDest = normalizeDestination(destination);
      const cleanCity = normalizedDest.split(',')[0].trim() || normalizedDest;
      const cleanCountry = normalizedDest.includes(',') ? normalizedDest.split(',')[1].trim() : normalizedDest;
      const userAgent = 'AfricaTravelApp/1.0 (contact@africiatravel.com)';

      // 1. Query OpenStreetMap directly for hotels in this city/country
      const searchQueries = [
        `hotel ${cleanCity} ${cleanCountry}`,
        `hotels in ${cleanCity}`,
        `resort ${cleanCity}`,
        cleanCity
      ];

      let rawHotels = [];

      for (const q of searchQueries) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&extratags=1&limit=8`;
          const nomRes = await fetch(nominatimUrl, {
            headers: { 'User-Agent': userAgent },
            signal: AbortSignal.timeout(3500)
          });

          if (nomRes.ok) {
            const data = await nomRes.json();
            if (Array.isArray(data) && data.length > 0) {
              const hotels = data.filter(item => {
                const isTourism = item.class === 'tourism' || item.type === 'hotel' || item.type === 'resort' || item.type === 'guest_house';
                const hasHotelName = (item.name || item.display_name || '').toLowerCase().includes('hotel') ||
                                     (item.name || item.display_name || '').toLowerCase().includes('resort') ||
                                     (item.name || item.display_name || '').toLowerCase().includes('palace') ||
                                     (item.name || item.display_name || '').toLowerCase().includes('inn');
                return isTourism || hasHotelName;
              });

              if (hotels.length > 0) {
                rawHotels = hotels;
                break;
              }
            }
          }
        } catch {
          // Continue to next query if timeout
        }
      }

      if (rawHotels.length === 0) {
        return null;
      }

      // 2. Pick top-tier hotel, prioritizing those with 5 stars or recognized luxury names
      const luxuryKeywords = ['ritz', 'hilton', 'hyatt', 'four seasons', 'marriott', 'kempinski', 'intercontinental', 'sheraton', 'sofitel', 'radisson', 'fairmont', 'palace'];
      const topHotels = rawHotels.filter(h => {
        const nameLower = (h.name || h.display_name || '').toLowerCase();
        const stars = parseInt(h.extratags?.stars || '0', 10);
        return stars >= 4 || luxuryKeywords.some(k => nameLower.includes(k));
      });

      const candidates = topHotels.length > 0 ? topHotels : rawHotels;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      const rawName = chosen.name || chosen.display_name.split(',')[0].trim();
      const hotelName = rawName.replace(/\(.*?\)/g, '').trim() || `Grand Hotel ${cleanCity}`;

      let stars = 5;
      if (chosen.extratags?.stars) {
        const parsed = parseInt(chosen.extratags.stars, 10);
        if (!isNaN(parsed) && parsed >= 3 && parsed <= 5) stars = parsed;
      }

      const elementLat = parseFloat(chosen.lat);
      const elementLon = parseFloat(chosen.lon);
      const gpsCoordinates = formatDdmCoordinates(elementLat, elementLon);

      // Extract address parts
      const addr = chosen.address || {};
      const street = addr.road || addr.street || chosen.extratags?.['contact:street'] || '';
      const houseNumber = addr.house_number || chosen.extratags?.['contact:housenumber'] || '';
      let hotelAddress = street ? `${houseNumber ? houseNumber + ' ' : ''}${street}, ${cleanCity}, ${cleanCountry}` : chosen.display_name;
      if (hotelAddress.length > 120) {
        hotelAddress = hotelAddress.split(',').slice(0, 3).join(', ');
      }

      // Phone resolution: Extratags -> Real catalog -> Dialer fallback
      const hotelPhone = chosen.extratags?.phone ||
                         chosen.extratags?.['contact:phone'] ||
                         chosen.extratags?.telephone ||
                         generateHotelPhone(normalizedDest, hotelName);

      // Realistic Booking confirmation numbers
      const r1 = Math.floor(1000 + Math.random() * 9000);
      const r2 = Math.floor(100 + Math.random() * 900);
      const r3 = Math.floor(100 + Math.random() * 900);
      const bookingNumber = `${r1}.${r2}.${r3}`;
      const pinCode = `${Math.floor(1000 + Math.random() * 9000)}`;

      const roomType = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
      const priceText = getPriceEstimation(normalizedDest);

      const scoreNum = (8.8 + Math.random() * 0.9).toFixed(1);
      const scoreWord = scoreNum >= 9.3 ? 'Exceptional' : scoreNum >= 9.0 ? 'Superb' : 'Fabulous';
      const reviewCount = Math.floor(1200 + Math.random() * 2500);
      const reviewScore = `${scoreNum} ${scoreWord} · ${reviewCount} reviews`;

      // Collect amenities from OSM tags if available
      const amenities = ['Free high-speed WiFi', 'Air conditioning', 'Private bathroom', 'Flat-screen TV'];
      if (chosen.extratags?.bar === 'yes') amenities.push('Bar & Lounge');
      if (chosen.extratags?.swimming_pool === 'yes') amenities.push('Swimming pool');
      if (chosen.extratags?.wheelchair === 'yes') amenities.push('Wheelchair accessible');
      if (chosen.extratags?.internet_access === 'yes' || chosen.extratags?.internet_access === 'wlan') amenities.push('High-speed Internet');
      amenities.push('Free luxury toiletries', '24h Room Service');

      return {
        hotelName,
        hotelStars: stars,
        city: cleanCity,
        country: cleanCountry,
        hotelAddress,
        hotelPhone,
        latitude: elementLat,
        longitude: elementLon,
        gpsCoordinates,
        roomType,
        boardBasis: 'Breakfast included',
        price: priceText,
        reviewScore,
        hotelImage: chosen.extratags?.image || '',
        bookingNumber,
        pinCode,
        checkInTime: '15:00',
        checkOutTime: '12:00',
        amenities: Array.from(new Set(amenities)),
        specialRequests: 'Non-smoking room, high floor requested',
        cancellationPolicy: 'Free cancellation anytime up to 48 hours before check-in.',
        paymentStatus: 'Paid online',
        source: 'OPENSTREETMAP',
        provider: 'OSM_NOMINATIM',
        generatedByAi: false
      };
    } catch (err) {
      console.warn('[OpenHotelService] Error querying OpenStreetMap API:', err.message);
      return null;
    }
  }
};
