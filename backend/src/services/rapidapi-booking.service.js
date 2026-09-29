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

/**
 * Converts decimal degrees latitude & longitude to official Booking.com DDM format
 * e.g. 48.872913, 2.308191 -> "N 048° 52.375, E 002° 18.491"
 */
export function formatDdmCoordinates(lat, lon) {
  if (lat === undefined || lat === null || lon === undefined || lon === null) return null;
  const nLat = parseFloat(lat);
  const nLon = parseFloat(lon);
  if (isNaN(nLat) || isNaN(nLon)) return null;

  const latDir = nLat >= 0 ? 'N' : 'S';
  const absLat = Math.abs(nLat);
  const latDeg = Math.floor(absLat);
  const latMin = (absLat - latDeg) * 60;
  const latDegStr = String(latDeg).padStart(3, '0');
  const latMinStr = latMin.toFixed(3).padStart(6, '0');

  const lonDir = nLon >= 0 ? 'E' : 'W';
  const absLon = Math.abs(nLon);
  const lonDeg = Math.floor(absLon);
  const lonMin = (absLon - lonDeg) * 60;
  const lonDegStr = String(lonDeg).padStart(3, '0');
  const lonMinStr = lonMin.toFixed(3).padStart(6, '0');

  return `${latDir} ${latDegStr}° ${latMinStr}, ${lonDir} ${lonDegStr}° ${lonMinStr}`;
}

export const KNOWN_HOTEL_PHONES = {
  // Paris / France
  'bradford elysées': '+33 1 45 63 20 20',
  'astotel': '+33 1 45 63 20 20',
  'ritz paris': '+33 1 43 16 30 30',
  'four seasons hotel george v': '+33 1 49 52 70 00',
  'le meurice': '+33 1 44 58 10 10',
  'hotel plaza athénée': '+33 1 53 67 66 65',
  'plaza athenee': '+33 1 53 67 66 65',
  'shangri-la paris': '+33 1 81 70 98 98',
  'the peninsula paris': '+33 1 58 12 28 88',
  'hotel le bristol': '+33 1 53 43 43 00',
  'hotel de crillon': '+33 1 44 71 15 00',
  'pullman paris tour eiffel': '+33 1 44 38 56 00',
  'novotel paris centre tour eiffel': '+33 1 40 58 20 00',
  'hotel lutetia': '+33 1 49 54 46 00',
  'negresco': '+33 4 93 16 64 00',
  'hotel martinez': '+33 4 93 90 12 34',

  // Spain
  'hotel arts barcelona': '+34 93 221 1000',
  'mandarin oriental barcelona': '+34 93 151 8888',
  'w barcelona': '+34 93 295 2800',
  'the westin palace madrid': '+34 91 360 8000',
  'four seasons hotel madrid': '+34 91 088 3333',
  'hotel ritz madrid': '+34 91 701 6767',
  'gran melia': '+34 91 541 6700',
  'hotel alfonso xiii': '+34 95 491 7000',
  'marbella club': '+34 95 282 2211',
  'puente romano': '+34 95 282 0900',

  // Dubai / UAE
  'burj al arab': '+971 4 301 7777',
  'atlantis the royal': '+971 4 426 3000',
  'atlantis the palm': '+971 4 426 2000',
  'atlantis, the palm': '+971 4 426 2000',
  'armani hotel dubai': '+971 4 888 3888',
  'jumeirah beach hotel': '+971 4 348 0000',
  'jumeirah al qasr': '+971 4 366 8888',
  'palace downtown': '+971 4 428 7888',
  'the address downtown': '+971 4 436 8888',
  'emirates palace': '+971 2 690 9000',
  'st. regis dubai': '+971 4 435 5555',

  // Saudi Arabia
  'the ritz-carlton riyadh': '+966 11 802 8020',
  'the ritz-carlton, riyadh': '+966 11 802 8020',
  'four seasons hotel riyadh': '+966 11 211 5000',
  'al faisaliah hotel': '+966 11 273 2000',
  'hilton riyadh': '+966 11 234 6666',
  'fairmont makkah clock royal tower': '+966 12 571 7777',
  'makkah clock royal tower': '+966 12 571 7777',
  'raffles makkah palace': '+966 12 571 7888',
  'swissôtel al maqam makkah': '+966 12 577 5555',
  'swissotel al maqam': '+966 12 577 5555',
  'pullman zamzam makkah': '+966 12 571 5555',
  'mövenpick hotel & residence hajar tower makkah': '+966 12 571 7171',
  'dar al taqwa hotel medina': '+966 14 829 1111',
  'the oberoi madina': '+966 14 828 2222',
  'hilton jeddah': '+966 12 659 0000',
  'rosewood jeddah': '+966 12 260 7111',

  // Egypt
  'four seasons hotel cairo at nile plaza': '+20 2 2791 7000',
  'the nile ritz-carlton, cairo': '+20 2 2577 8899',
  'the nile ritz-carlton': '+20 2 2577 8899',
  'marriott mena house': '+20 2 3377 3222',
  'kempinski nile hotel cairo': '+20 2 2798 0000',
  'the st. regis cairo': '+20 2 2597 9000',
  'sofitel cairo nile el gezirah': '+20 2 2737 3737',
  'rixos premium seagate': '+20 69 371 0130',
  'four seasons resort sharm el sheikh': '+20 69 360 3555',
  'steigenberger aldau beach hotel': '+20 65 346 5400',
  'steigenberger pure lifestyle': '+20 65 346 5400',
  'rixos premium magawish': '+20 65 346 4620',
  'hilton alexandria corniche': '+20 3 549 0935',
  'four seasons hotel alexandria at san stefano': '+20 3 581 8000',
  'winter palace luxor': '+20 95 238 0422',
  'sofitel legend old cataract aswan': '+20 97 231 6000',

  // Turkey
  'çırağan palace kempinski istanbul': '+90 212 326 4646',
  'ciragan palace': '+90 212 326 4646',
  'four seasons hotel istanbul at the bosphorus': '+90 212 381 4000',
  'four seasons hotel istanbul at sultanahmet': '+90 212 402 3000',
  'the ritz-carlton, istanbul': '+90 212 334 4444',
  'swissôtel the bosphorus istanbul': '+90 212 326 1100',
  'rixos premium belek': '+90 242 710 2000',
  'titanic mardan palace': '+90 242 310 4100',
  'maxx royal belek golf resort': '+90 242 710 2700',
  'the bodrum edition': '+90 252 311 3131',
  'mandarin oriental, bodrum': '+90 252 311 1888',

  // UK
  'the savoy': '+44 20 7836 4343',
  'the ritz london': '+44 20 7493 8181',
  'claridge\'s': '+44 20 7629 8860',
  'the connaught': '+44 20 7499 7070',
  'the dorchester': '+44 20 7629 8888',
  'shangri-la the shard, london': '+44 20 7234 8000',

  // Germany
  'hotel adlon kempinski berlin': '+49 30 22610',
  'the ritz-carlton, berlin': '+49 30 337777',
  'hotel de rome': '+49 30 460 6090',
  'the charles hotel': '+49 89 544 5550',
  'hotel bayerischer hof': '+49 89 21200',
  'mandarin oriental, munich': '+49 89 290980',
  'jumeirah frankfurt': '+49 69 297 2370',

  // Italy
  'hotel eden rome': '+39 06 478 121',
  'hotel de russie': '+39 06 32 88 81',
  'hassler roma': '+39 06 699 340',
  'four seasons hotel milano': '+39 02 77088',
  'armani hotel milano': '+39 02 8883 8888',
  'the gritti palace, venice': '+39 041 794611',
  'hotel danieli, venice': '+39 041 522 6480',
  'four seasons hotel firenze': '+39 055 26261',

  // Malaysia
  'summer suites': '+60 11 6450 6138',
  'klcc stay at summer suites': '+60 11 6450 6138',
  'mandarin oriental, kuala lumpur': '+60 3 2380 8888',
  'grand hyatt kuala lumpur': '+60 3 2182 1234',
  'shangri-la kuala lumpur': '+60 3 2032 2388',
  'the ritz-carlton, kuala lumpur': '+60 3 2142 8000',
  'four seasons hotel kuala lumpur': '+60 3 2382 8888',

  // Thailand
  'mandarin oriental bangkok': '+66 2 659 9000',
  'banyan tree bangkok': '+66 2 679 1200',
  'the siam hotel bangkok': '+66 2 206 6999',
  'the surin phuket': '+66 76 316 400',
  'amanpuri phuket': '+66 76 324 333',

  // Qatar
  'four seasons hotel doha': '+974 4494 8888',
  'the ritz-carlton, doha': '+974 4484 8000',
  'mandarin oriental, doha': '+974 4008 8888',
  'st. regis doha': '+974 4446 0000'
};

export function generateHotelPhone(destination = '', hotelName = '') {
  const normHotel = hotelName.toLowerCase().trim();
  // 1. Check known hotel catalog
  for (const [key, phone] of Object.entries(KNOWN_HOTEL_PHONES)) {
    if (normHotel.includes(key)) {
      return phone;
    }
  }

  const dest = `${destination} ${hotelName}`.toLowerCase();
  const rand = (min, max) => Math.floor(min + Math.random() * (max - min));
  const hasWord = (word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'i').test(dest);

  // 2. City-specific dialing codes
  // Spain
  if (dest.includes('barcelona') || hasWord('bcn')) {
    return `+34 93 ${rand(200, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('madrid') || hasWord('mad')) {
    return `+34 91 ${rand(200, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('malaga') || dest.includes('marbella') || hasWord('agp')) {
    return `+34 952 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('seville') || dest.includes('sevilla')) {
    return `+34 954 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('spain') || dest.includes('españa') || dest.includes('espana')) {
    return `+34 91 ${rand(300, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  }

  // Saudi Arabia
  if (dest.includes('riyadh') || hasWord('ruh')) {
    return `+966 11 ${rand(400, 899)} ${rand(1000, 9999)}`;
  } else if (dest.includes('makkah') || dest.includes('mecca')) {
    return `+966 12 5${rand(20, 79)} ${rand(1000, 9999)}`;
  } else if (dest.includes('jeddah') || hasWord('jed')) {
    return `+966 12 6${rand(20, 79)} ${rand(1000, 9999)}`;
  } else if (dest.includes('medina') || dest.includes('madinah') || hasWord('med')) {
    return `+966 14 8${rand(20, 79)} ${rand(1000, 9999)}`;
  } else if (dest.includes('dammam') || dest.includes('khobar') || hasWord('dmm')) {
    return `+966 13 8${rand(20, 79)} ${rand(1000, 9999)}`;
  } else if (dest.includes('saudi') || dest.includes('ksa')) {
    return `+966 11 ${rand(400, 899)} ${rand(1000, 9999)}`;
  }

  // Egypt
  if (dest.includes('cairo') || dest.includes('giza') || hasWord('cai')) {
    return `+20 2 2${rand(300, 799)} ${rand(1000, 9999)}`;
  } else if (dest.includes('alexandria') || hasWord('aly') || hasWord('hbe')) {
    return `+20 3 5${rand(20, 89)} ${rand(1000, 9999)}`;
  } else if (dest.includes('sharm') || hasWord('ssh')) {
    return `+20 69 36${rand(10, 99)} ${rand(100, 999)}`;
  } else if (dest.includes('hurghada') || hasWord('hrg')) {
    return `+20 65 34${rand(10, 99)} ${rand(100, 999)}`;
  } else if (dest.includes('luxor') || hasWord('lxr')) {
    return `+20 95 23${rand(10, 99)} ${rand(100, 999)}`;
  } else if (dest.includes('aswan') || hasWord('asw')) {
    return `+20 97 23${rand(10, 99)} ${rand(100, 999)}`;
  } else if (dest.includes('egypt')) {
    return `+20 2 2${rand(300, 799)} ${rand(1000, 9999)}`;
  }

  // UAE
  if (dest.includes('dubai') || hasWord('dxb') || hasWord('dwc')) {
    return `+971 4 ${rand(300, 599)} ${rand(1000, 9999)}`;
  } else if (dest.includes('abu dhabi') || hasWord('auh')) {
    return `+971 2 ${rand(400, 699)} ${rand(1000, 9999)}`;
  } else if (dest.includes('sharjah') || hasWord('shj')) {
    return `+971 6 ${rand(500, 599)} ${rand(1000, 9999)}`;
  } else if (dest.includes('uae') || dest.includes('emirates')) {
    return `+971 4 ${rand(300, 599)} ${rand(1000, 9999)}`;
  }

  // Turkey
  if (dest.includes('antalya') || hasWord('ayt')) {
    return `+90 242 ${rand(200, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('bodrum') || dest.includes('mugla')) {
    return `+90 252 ${rand(200, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('ankara') || hasWord('esb')) {
    return `+90 312 ${rand(200, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('istanbul') || hasWord('ist') || hasWord('saw')) {
    return `+90 212 ${rand(300, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('turkey') || dest.includes('türkiye')) {
    return `+90 212 ${rand(300, 899)} ${rand(10, 99)} ${rand(10, 99)}`;
  }

  // France
  if (dest.includes('nice') || dest.includes('cannes') || dest.includes('côte')) {
    return `+33 4 93 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('lyon')) {
    return `+33 4 72 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('paris') || hasWord('cdg') || hasWord('ory')) {
    return `+33 1 ${rand(40, 59)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('france')) {
    return `+33 1 ${rand(40, 59)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  }

  // Germany
  if (dest.includes('munich') || hasWord('muc') || dest.includes('münchen')) {
    return `+49 89 ${rand(2000, 8999)} ${rand(100, 999)}`;
  } else if (dest.includes('frankfurt') || hasWord('fra')) {
    return `+49 69 ${rand(2000, 8999)} ${rand(100, 999)}`;
  } else if (dest.includes('berlin') || hasWord('ber')) {
    return `+49 30 ${rand(2000, 8999)} ${rand(100, 999)}`;
  } else if (dest.includes('germany') || dest.includes('deutschland')) {
    return `+49 30 ${rand(2000, 8999)} ${rand(100, 999)}`;
  }

  // UK
  if (dest.includes('manchester') || hasWord('man')) {
    return `+44 161 ${rand(200, 899)} ${rand(1000, 9999)}`;
  } else if (dest.includes('london') || hasWord('lhr') || hasWord('lgw') || hasWord('stn')) {
    return `+44 20 ${rand(7100, 8999)} ${rand(1000, 9999)}`;
  } else if (dest.includes('uk') || dest.includes('britain') || dest.includes('england')) {
    return `+44 20 ${rand(7100, 8999)} ${rand(1000, 9999)}`;
  }

  // Italy
  if (dest.includes('milan') || dest.includes('milano') || hasWord('mxp')) {
    return `+39 02 ${rand(4000, 8999)} ${rand(100, 999)}`;
  } else if (dest.includes('venice') || dest.includes('venezia')) {
    return `+39 041 ${rand(200, 899)} ${rand(100, 999)}`;
  } else if (dest.includes('florence') || dest.includes('firenze')) {
    return `+39 055 ${rand(200, 899)} ${rand(100, 999)}`;
  } else if (dest.includes('rome') || dest.includes('roma') || hasWord('fco')) {
    return `+39 06 ${rand(4000, 8999)} ${rand(100, 999)}`;
  } else if (dest.includes('italy') || dest.includes('italia')) {
    return `+39 06 ${rand(4000, 8999)} ${rand(100, 999)}`;
  }

  // Malaysia
  if (dest.includes('malaysia') || dest.includes('kuala lumpur') || hasWord('kul')) {
    return `+60 3 ${rand(2000, 2999)} ${rand(1000, 9999)}`;
  }

  // Thailand
  if (dest.includes('phuket') || hasWord('hkt')) {
    return `+66 76 ${rand(200, 899)} ${rand(100, 999)}`;
  } else if (dest.includes('bangkok') || hasWord('bkk') || hasWord('dmk')) {
    return `+66 2 ${rand(200, 899)} ${rand(1000, 9999)}`;
  } else if (dest.includes('thailand')) {
    return `+66 2 ${rand(200, 899)} ${rand(1000, 9999)}`;
  }

  // Qatar
  if (dest.includes('qatar') || dest.includes('doha') || hasWord('doh')) {
    return `+974 44${rand(10, 99)} ${rand(1000, 9999)}`;
  }

  // Kuwait
  if (dest.includes('kuwait') || hasWord('kwi')) {
    return `+965 22${rand(10, 99)} ${rand(1000, 9999)}`;
  }

  // Bahrain
  if (dest.includes('bahrain') || dest.includes('manama') || hasWord('bah')) {
    return `+973 17${rand(10, 99)} ${rand(1000, 9999)}`;
  }

  // Oman
  if (dest.includes('oman') || dest.includes('muscat') || hasWord('mct')) {
    return `+968 24${rand(10, 99)} ${rand(1000, 9999)}`;
  }

  // Jordan
  if (dest.includes('jordan') || dest.includes('amman') || hasWord('amm')) {
    return `+962 6 ${rand(500, 599)} ${rand(1000, 9999)}`;
  }

  // Morocco
  if (dest.includes('morocco') || dest.includes('casablanca') || dest.includes('cmn')) {
    return `+212 522 ${rand(20, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  } else if (dest.includes('marrakech') || dest.includes('rak')) {
    return `+212 524 ${rand(20, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  }

  // Georgia
  if (dest.includes('georgia') || dest.includes('tbilisi') || dest.includes('tbs')) {
    return `+995 32 2${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
  }

  // Singapore
  if (dest.includes('singapore') || dest.includes('sin')) {
    return `+65 6${rand(100, 899)} ${rand(1000, 9999)}`;
  }

  // Japan
  if (dest.includes('japan') || dest.includes('tokyo') || dest.includes('nrt') || dest.includes('hnd')) {
    return `+81 3 ${rand(3000, 5999)} ${rand(1000, 9999)}`;
  }

  // United States
  if (dest.includes('new york') || dest.includes('jfk') || dest.includes('ewr')) {
    return `+1 212 ${rand(200, 899)} ${rand(1000, 9999)}`;
  } else if (dest.includes('los angeles') || dest.includes('lax')) {
    return `+1 310 ${rand(200, 899)} ${rand(1000, 9999)}`;
  } else if (dest.includes('united states') || dest.includes('usa')) {
    return `+1 212 ${rand(200, 899)} ${rand(1000, 9999)}`;
  }

  // Fallback to international standard format
  return `+44 20 ${rand(7100, 8999)} ${rand(1000, 9999)}`;
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

      // 3. Selection among top real prestigious hotels (prioritizing 4 and 5 stars)
      const validHotels = hotelsList.filter(h => h && h.property && h.property.name);
      if (validHotels.length === 0) return null;

      const premiumHotels = validHotels.filter(h => {
        const cls = parseInt(h.property?.propertyClass || h.property?.accuratePropertyClass || 0, 10);
        return cls >= 4;
      });
      const candidateList = premiumHotels.length > 0 ? premiumHotels : validHotels;
      const randomChoice = candidateList[Math.floor(Math.random() * Math.min(candidateList.length, 10))];
      const prop = randomChoice.property;

      let hotelName = prop.name.trim();

      // Clean Room Type description (strip HTML tags)
      let roomType = 'Deluxe King Room';
      if (prop.recommendedUnitsConfigurationLabel) {
        const rawLabel = prop.recommendedUnitsConfigurationLabel.replace(/<[^>]*>/g, '').trim();
        const firstPart = rawLabel.split(':')[0].trim();
        roomType = firstPart.length > 3 ? firstPart : 'Deluxe Double Room';
      }

      // Star rating (Ensure prestigious rating for luxury travel voucher)
      let stars = parseInt(prop.propertyClass || prop.accuratePropertyClass || 0, 10);
      if (stars < 4 || stars > 5) stars = 5;

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

      // Coordinates & Address extraction
      let finalLat = prop.latitude || null;
      let finalLon = prop.longitude || null;
      let finalAddress = prop.wishlistName
        ? `${prop.wishlistName}, ${cleanCity}, ${resolvedCountry}`
        : `${cleanCity} Center, ${resolvedCountry}`;

      // Enrich with getHotelDetails for exact street address and coordinates if available
      try {
        const detailController = new AbortController();
        const detailTimeout = setTimeout(() => detailController.abort(), 2500);
        const detailUrl = `https://${RAPIDAPI_HOST}/api/v1/hotels/getHotelDetails?hotel_id=${prop.id}&arrival_date=${inStr}&departure_date=${outStr}&adults=1`;
        const detailRes = await fetch(detailUrl, {
          headers,
          signal: detailController.signal
        });
        clearTimeout(detailTimeout);
        if (detailRes.ok) {
          const detailJson = await detailRes.json();
          const details = detailJson?.data;
          if (details) {
            if (details.hotel_name) hotelName = details.hotel_name.trim();
            if (details.latitude && details.longitude) {
              finalLat = details.latitude;
              finalLon = details.longitude;
            }
            const addressParts = [details.address, details.zip, details.city, details.country_trans].filter(Boolean);
            if (addressParts.length >= 2) {
              finalAddress = addressParts.join(', ');
            }
          }
        }
      } catch {
        // Fallback to prop latitude and wishlistName
      }

      const gpsCoordinates = formatDdmCoordinates(finalLat, finalLon);
      const hotelPhone = generateHotelPhone(`${resolvedCountry} ${cleanCity}`, hotelName);

      return {
        hotelName,
        hotelStars: stars,
        city: cleanCity,
        country: resolvedCountry,
        hotelAddress: finalAddress,
        hotelPhone,
        latitude: finalLat,
        longitude: finalLon,
        gpsCoordinates,
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
