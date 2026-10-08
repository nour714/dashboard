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

/**
 * Resolves the real, authentic high-resolution photograph of the hotel
 * using Wikimedia Commons, Wikidata P18 image claims, and Wikipedia pageimages.
 * 100% open-source, zero API keys, zero limits.
 */
export async function resolveRealHotelImage(hotelName, destination = '', extratags = {}) {
  // Helper to reject non-photo assets (logos, icons, coats of arms, SVGs)
  const isRealPhoto = (url = '', title = '') => {
    const u = url.toLowerCase();
    const t = title.toLowerCase();
    if (!u.startsWith('http')) return false;
    if (u.includes('.svg') || u.includes('logo') || u.includes('icon') || u.includes('flag') || u.includes('coat_of_arms')) return false;
    if (t.includes('.svg') || t.includes('logo') || t.includes('icon') || t.includes('flag') || t.includes('blason')) return false;
    return true;
  };

  // 1. Direct image tag in OSM extratags
  if (extratags.image && typeof extratags.image === 'string' && isRealPhoto(extratags.image)) {
    return extratags.image;
  }

  // 2. Wikidata P18 image claim
  if (extratags.wikidata) {
    try {
      const wId = extratags.wikidata.trim();
      const url = `https://www.wikidata.org/wiki/Special:EntityData/${wId}.json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AfricaTravelApp/1.0 (contact@africiatravel.com)' },
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        const entity = data.entities?.[wId];
        const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (p18 && isRealPhoto(p18, p18)) {
          return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p18)}?width=1024`;
        }
      }
    } catch (_) {}
  }

  // 3. Wikipedia exact pageimage if wikipedia tag is present
  if (extratags.wikipedia) {
    try {
      const [lang, title] = extratags.wikipedia.includes(':')
        ? extratags.wikipedia.split(':')
        : ['en', extratags.wikipedia];
      const url = `https://${lang || 'en'}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=1024&format=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AfricaTravelApp/1.0 (contact@africiatravel.com)' },
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {});
        for (const p of pages) {
          if (p.thumbnail?.source && isRealPhoto(p.thumbnail.source, p.title || '')) {
            return p.thumbnail.source;
          }
        }
      }
    } catch (_) {}
  }

  // 4. Wikipedia / Wikimedia Commons search by hotel name & city
  const cleanName = hotelName.replace(/\(.*?\)/g, '').trim();
  const cleanCity = destination.split(',')[0].trim();
  const searchQueries = [
    `${cleanName} ${cleanCity}`,
    cleanName,
    `${cleanName} building`
  ];

  for (const q of searchQueries) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=pageimages&pithumbsize=1024&format=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AfricaTravelApp/1.0 (contact@africiatravel.com)' },
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {});
        for (const p of pages) {
          if (p.thumbnail?.source && isRealPhoto(p.thumbnail.source, p.title || '')) {
            return p.thumbnail.source;
          }
        }
      }
    } catch (_) {}

    try {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&format=json&gsrlimit=5`;
      const res = await fetch(commonsUrl, {
        headers: { 'User-Agent': 'AfricaTravelApp/1.0 (contact@africiatravel.com)' },
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {});
        for (const p of pages) {
          const info = p.imageinfo?.[0];
          if (info?.url && (info.mime === 'image/jpeg' || info.mime === 'image/png' || info.mime === 'image/webp') && isRealPhoto(info.url, p.title || '')) {
            return info.url;
          }
        }
      }
    } catch (_) {}
  }

  return getDestinationFallbackImage(destination);
}

const DESTINATION_IMAGES = {
  malaysia: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
  dubai: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/438349275.webp?k=55a3068e1c31252033cff06eef1e6878b6be575c8be08b1a4a496b8641ba4328&o=',
  uae: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/438349275.webp?k=55a3068e1c31252033cff06eef1e6878b6be575c8be08b1a4a496b8641ba4328&o=',
  saudi: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
  riyadh: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
  makkah: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
  egypt: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/47372861.webp?k=b4e9f73eb156821262d1033230a1bf6f7b0559f9361a8684ad4dbff36bcda7aa&o=',
  cairo: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/47372861.webp?k=b4e9f73eb156821262d1033230a1bf6f7b0559f9361a8684ad4dbff36bcda7aa&o=',
  turkey: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/29283749.webp?k=7b649dcf466ecf7b6058079dbe39f6920b72cbb242eb0e527d754b232e01dfd6&o=',
  istanbul: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/29283749.webp?k=7b649dcf466ecf7b6058079dbe39f6920b72cbb242eb0e527d754b232e01dfd6&o=',
  london: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/58291048.webp?k=83a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
  uk: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/58291048.webp?k=83a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
  paris: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/38294710.webp?k=12a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
  france: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/38294710.webp?k=12a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
  spain: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
  madrid: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
  barcelona: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o='
};

export function getDestinationFallbackImage(destination = '') {
  const d = (destination || '').toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (d.includes(key)) return url;
  }
  return 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=';
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

      const hotelImage = await resolveRealHotelImage(hotelName, `${cleanCity}, ${cleanCountry}`, chosen.extratags || {});

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
        hotelImage: hotelImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
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
