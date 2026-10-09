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
import { generateHotelPhone } from './rapidapi-booking.service.js';
import { normalizeGeminiModel } from './ticket-extraction.service.js';

const GEMINI_REQUEST_TIMEOUT_MS = 12000;

// Curated authentic hotel catalog for high-precision instant fallback
const CURATED_HOTELS = {
  // Malaysia & Summer Suites
  malaysia: {
    hotelName: 'Klcc Stay At Summer Suites',
    hotelStars: 5,
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    hotelAddress: '8, Jalan Cendana, 50250 Kuala Lumpur, Malaysia',
    hotelPhone: '+60 11 6450 6138',
    gpsCoordinates: 'N 003° 09.552, E 101° 42.293',
    roomType: 'Studio with Balcony',
    boardBasis: 'Room Only (No meal included)',
    price: 'MYR 1,280',
    reviewScore: '8.1 Very Good · 26 reviews',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    amenities: ['Kitchen', 'Balcony', 'City view', 'Air conditioning', 'Flat-screen TV', 'Soundproofing', 'Free WiFi', 'Private bathroom']
  },
  'kuala lumpur': {
    hotelName: 'Klcc Stay At Summer Suites',
    hotelStars: 5,
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    hotelAddress: '8, Jalan Cendana, 50250 Kuala Lumpur, Malaysia',
    hotelPhone: '+60 11 6450 6138',
    gpsCoordinates: 'N 003° 09.552, E 101° 42.293',
    roomType: 'Studio with Balcony',
    boardBasis: 'Room Only (No meal included)',
    price: 'MYR 1,280',
    reviewScore: '8.1 Very Good · 26 reviews',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    amenities: ['Kitchen', 'Balcony', 'City view', 'Air conditioning', 'Flat-screen TV', 'Soundproofing', 'Free WiFi', 'Private bathroom']
  },
  'summer suites': {
    hotelName: 'Klcc Stay At Summer Suites',
    hotelStars: 5,
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    hotelAddress: '8, Jalan Cendana, 50250 Kuala Lumpur, Malaysia',
    hotelPhone: '+60 11 6450 6138',
    gpsCoordinates: 'N 003° 09.552, E 101° 42.293',
    roomType: 'Studio with Balcony',
    boardBasis: 'Room Only (No meal included)',
    price: 'MYR 1,280',
    reviewScore: '8.1 Very Good · 26 reviews',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    amenities: ['Kitchen', 'Balcony', 'City view', 'Air conditioning', 'Flat-screen TV', 'Soundproofing', 'Free WiFi', 'Private bathroom']
  },
  // UAE
  dubai: {
    hotelName: 'Atlantis The Royal, Palm Jumeirah',
    hotelStars: 5,
    city: 'Dubai',
    country: 'United Arab Emirates',
    hotelAddress: 'Crescent Road, Palm Jumeirah, Dubai, United Arab Emirates',
    hotelPhone: '+971 4 426 3000',
    gpsCoordinates: 'N 025° 08.230, E 055° 07.120',
    roomType: 'Luxury King Skyline Room',
    boardBasis: 'Bed & Breakfast (Buffet Included)',
    price: 'AED 3,450',
    reviewScore: '9.3 Superb · 4,820 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/438349275.webp?k=55a3068e1c31252033cff06eef1e6878b6be575c8be08b1a4a496b8641ba4328&o=',
    amenities: ['Private Beach Access', 'Infinity Sky Pool', 'Complimentary Wi-Fi', 'World-Class Spa', 'Valet Parking']
  },
  uae: {
    hotelName: 'Burj Al Arab Jumeirah',
    hotelStars: 5,
    city: 'Dubai',
    country: 'United Arab Emirates',
    hotelAddress: 'Umm Suqeim 3, Jumeirah Beach Road, Dubai, UAE',
    hotelPhone: '+971 4 301 7777',
    gpsCoordinates: 'N 025° 08.480, E 055° 11.100',
    roomType: 'Deluxe One-Bedroom Suite',
    boardBasis: 'Bed & Breakfast',
    price: 'AED 5,200',
    reviewScore: '9.5 Exceptional · 2,140 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/438349275.webp?k=55a3068e1c31252033cff06eef1e6878b6be575c8be08b1a4a496b8641ba4328&o=',
    amenities: ['Butler Service', 'Private Beach', 'Talise Spa', 'Helipad Access', 'Complimentary Luxury Toiletries']
  },
  // Saudi Arabia
  saudi: {
    hotelName: 'The Ritz-Carlton, Riyadh',
    hotelStars: 5,
    city: 'Riyadh',
    country: 'Saudi Arabia',
    hotelAddress: 'Al Hada Area, Makkah Road, Riyadh 11493, Saudi Arabia',
    hotelPhone: '+966 11 802 8020',
    gpsCoordinates: 'N 024° 40.060, E 046° 37.890',
    roomType: 'Deluxe King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'SAR 2,800',
    reviewScore: '9.2 Superb · 3,450 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Indoor Heated Pool', 'Gentlemen\'s Spa', 'High-speed Wi-Fi', 'Fine Dining Restaurants', 'Concierge Service']
  },
  makkah: {
    hotelName: 'Makkah Clock Royal Tower, A Fairmont Hotel',
    hotelStars: 5,
    city: 'Makkah',
    country: 'Saudi Arabia',
    hotelAddress: 'King Abdul Aziz Endowment, Abraj Al Bait, Makkah, Saudi Arabia',
    hotelPhone: '+966 12 571 7777',
    gpsCoordinates: 'N 021° 25.130, E 039° 49.520',
    roomType: 'Kaaba View Deluxe Room',
    boardBasis: 'Bed & Breakfast',
    price: 'SAR 1,950',
    reviewScore: '9.1 Superb · 6,800 reviews',
    checkInTime: '16:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Direct Haram Access', 'High-speed Wi-Fi', 'Prayer Rooms', 'Shopping Mall Access', '24h Room Service']
  },
  // Egypt
  egypt: {
    hotelName: 'Four Seasons Hotel Cairo at Nile Plaza',
    hotelStars: 5,
    city: 'Cairo',
    country: 'Egypt',
    hotelAddress: '1089 Corniche El Nil, Garden City, Cairo 11519, Egypt',
    hotelPhone: '+20 2 2791 7000',
    gpsCoordinates: 'N 030° 02.150, E 031° 13.910',
    roomType: 'Superior Nile-View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 380',
    reviewScore: '9.2 Superb · 3,100 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/47372861.webp?k=b4e9f73eb156821262d1033230a1bf6f7b0559f9361a8684ad4dbff36bcda7aa&o=',
    amenities: ['Panoramic Nile Views', 'Outdoor & Indoor Pools', 'Full-service Spa', 'Free Wi-Fi', 'Fine Dining']
  },
  cairo: {
    hotelName: 'The St. Regis Cairo',
    hotelStars: 5,
    city: 'Cairo',
    country: 'Egypt',
    hotelAddress: '1189 Nile Corniche, Boulaq, Cairo Governorate 11221, Egypt',
    hotelPhone: '+20 2 2597 9000',
    gpsCoordinates: 'N 030° 03.420, E 031° 13.840',
    roomType: 'Grand Deluxe River View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 420',
    reviewScore: '9.4 Exceptional · 1,890 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/47372861.webp?k=b4e9f73eb156821262d1033230a1bf6f7b0559f9361a8684ad4dbff36bcda7aa&o=',
    amenities: ['St. Regis Butler Service', 'Iridium Spa', 'Indoor & Outdoor Pools', 'Complimentary Wi-Fi', 'Valet Parking']
  },
  // Spain
  spain: {
    hotelName: 'The Westin Palace, Madrid',
    hotelStars: 5,
    city: 'Madrid',
    country: 'Spain',
    hotelAddress: 'Plaza de las Cortes 7, Centro, 28014 Madrid, Spain',
    hotelPhone: '+34 91 360 8000',
    gpsCoordinates: 'N 040° 24.930, W 003° 41.760',
    roomType: 'Deluxe King Palace Room',
    boardBasis: 'Bed & Breakfast (Buffet Included)',
    price: 'EUR 480',
    reviewScore: '9.3 Superb · 2,650 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Historical Architecture', 'Opera Lounge', 'Fitness Studio', 'Free High-speed Wi-Fi', 'Concierge Service']
  },
  madrid: {
    hotelName: 'Four Seasons Hotel Madrid',
    hotelStars: 5,
    city: 'Madrid',
    country: 'Spain',
    hotelAddress: 'Calle de Sevilla 3, Centro, 28014 Madrid, Spain',
    hotelPhone: '+34 91 088 3333',
    gpsCoordinates: 'N 040° 25.040, W 003° 42.060',
    roomType: 'Superior Courtyard King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 750',
    reviewScore: '9.6 Exceptional · 1,840 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Four-level Wellness Spa', 'Rooftop Restaurant Dani Garcia', 'Indoor Swimming Pool', 'Valet Parking']
  },
  barcelona: {
    hotelName: 'Hotel Arts Barcelona',
    hotelStars: 5,
    city: 'Barcelona',
    country: 'Spain',
    hotelAddress: 'Marina 19-21, Port Olimpic, 08005 Barcelona, Spain',
    hotelPhone: '+34 93 221 1000',
    gpsCoordinates: 'N 041° 23.140, E 002° 11.780',
    roomType: 'Deluxe Mediterranean Sea View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 580',
    reviewScore: '9.2 Superb · 3,420 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Panoramic Sea Views', 'Michelin-starred Enoteca', '43 The Spa', 'Two Outdoor Pools']
  },
  // Turkey
  turkey: {
    hotelName: 'Ciragan Palace Kempinski Istanbul',
    hotelStars: 5,
    city: 'Istanbul',
    country: 'Turkey',
    hotelAddress: 'Yildiz, Ciragan Cd. No:32, 34349 Besiktas/Istanbul, Turkey',
    hotelPhone: '+90 212 326 4646',
    gpsCoordinates: 'N 041° 02.580, E 029° 01.120',
    roomType: 'Grand Bosphorus View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 490',
    reviewScore: '9.3 Superb · 2,750 reviews',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/29283749.webp?k=7b649dcf466ecf7b6058079dbe39f6920b72cbb242eb0e527d754b232e01dfd6&o=',
    amenities: ['Infinity Bosphorus Pool', 'Historical Ottoman Palace', 'Spa & Wellness Center', 'Free High-speed Wi-Fi']
  },
  istanbul: {
    hotelName: 'Four Seasons Hotel Istanbul at the Bosphorus',
    hotelStars: 5,
    city: 'Istanbul',
    country: 'Turkey',
    hotelAddress: 'Ciragan Cad. No: 28, Besiktas, 34349 Istanbul, Turkey',
    hotelPhone: '+90 212 381 4000',
    gpsCoordinates: 'N 041° 02.620, E 029° 01.180',
    roomType: 'Courtyard Palace King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 520',
    reviewScore: '9.5 Exceptional · 1,940 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/29283749.webp?k=7b649dcf466ecf7b6058079dbe39f6920b72cbb242eb0e527d754b232e01dfd6&o=',
    amenities: ['Waterfront Terrace', 'Heated Outdoor Pool', 'Turkish Hammam', '24h Concierge', 'Complimentary Wi-Fi']
  },
  // United Kingdom
  uk: {
    hotelName: 'The Savoy London',
    hotelStars: 5,
    city: 'London',
    country: 'United Kingdom',
    hotelAddress: 'Strand, London WC2R 0EZ, United Kingdom',
    hotelPhone: '+44 20 7836 4343',
    gpsCoordinates: 'N 051° 30.580, W 000° 07.240',
    roomType: 'Luxury King River View Room',
    boardBasis: 'Continental Breakfast Included',
    price: 'GBP 580',
    reviewScore: '9.4 Exceptional · 3,400 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/58291048.webp?k=83a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    amenities: ['Gordon Ramsay Dining', 'Indoor Swimming Pool', '24h Butler Service', 'Valet Parking', 'Free Wi-Fi']
  },
  london: {
    hotelName: 'The Ritz London',
    hotelStars: 5,
    city: 'London',
    country: 'United Kingdom',
    hotelAddress: '150 Piccadilly, St. James\'s, London W1J 9BR, United Kingdom',
    hotelPhone: '+44 20 7493 8181',
    gpsCoordinates: 'N 051° 30.400, W 000° 08.520',
    roomType: 'Superior Queen Room',
    boardBasis: 'Traditional English Breakfast',
    price: 'GBP 650',
    reviewScore: '9.5 Exceptional · 2,890 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/58291048.webp?k=83a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    amenities: ['Michelin-starred Restaurant', 'Afternoon Tea Lounge', 'Concierge Service', 'Complimentary High-speed Wi-Fi']
  },
  // France
  france: {
    hotelName: 'Hotel Plaza Athénée Paris',
    hotelStars: 5,
    city: 'Paris',
    country: 'France',
    hotelAddress: '25 Avenue Montaigne, 75008 Paris, France',
    hotelPhone: '+33 1 53 67 66 65',
    gpsCoordinates: 'N 048° 52.010, E 002° 18.230',
    roomType: 'Deluxe Avenue View Room',
    boardBasis: 'Parisian Breakfast Included',
    price: 'EUR 780',
    reviewScore: '9.6 Exceptional · 1,760 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/38294710.webp?k=12a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    amenities: ['Eiffel Tower Views', 'Dior Spa', 'Courtyard Garden', 'Michelin Dining', 'Complimentary High-speed Wi-Fi']
  },
  paris: {
    hotelName: 'Le Bristol Paris - an Oetker Collection Hotel',
    hotelStars: 5,
    city: 'Paris',
    country: 'France',
    hotelAddress: '112 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
    hotelPhone: '+33 1 53 43 43 00',
    gpsCoordinates: 'N 048° 52.260, E 002° 18.890',
    roomType: 'Deluxe Junior Suite',
    boardBasis: 'American Breakfast Included',
    price: 'EUR 850',
    reviewScore: '9.7 Exceptional · 1,520 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/38294710.webp?k=12a938c2de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    amenities: ['Rooftop Swimming Pool', 'Spa Le Bristol by La Prairie', 'French Courtyard Garden', 'Complimentary Wi-Fi']
  },
  // Italy
  italy: {
    hotelName: 'Hotel de Russie, a Rocco Forte Hotel',
    hotelStars: 5,
    city: 'Rome',
    country: 'Italy',
    hotelAddress: 'Via del Babuino 9, Spagna, 00187 Rome, Italy',
    hotelPhone: '+39 06 32 88 81',
    gpsCoordinates: 'N 041° 54.320, E 012° 28.720',
    roomType: 'Classic King Room with Secret Garden View',
    boardBasis: 'Buffet Breakfast Included',
    price: 'EUR 620',
    reviewScore: '9.3 Superb · 2,400 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Secret Terraced Gardens', 'De Russie Spa', 'Fine Italian Dining', 'Central Location near Spanish Steps']
  },
  // Qatar
  qatar: {
    hotelName: 'Marsa Malaz Kempinski, The Pearl',
    hotelStars: 5,
    city: 'Doha',
    country: 'Qatar',
    hotelAddress: 'Costa Malaz Bay, The Pearl, Doha, Qatar',
    hotelPhone: '+974 4035 5555',
    gpsCoordinates: 'N 025° 22.150, E 051° 33.240',
    roomType: 'Deluxe Pearl King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'QAR 1,450',
    reviewScore: '9.1 Superb · 2,100 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Private Beach', 'Outdoor Pools', 'Clarins Spa', 'Tennis Courts', 'Free High-speed Wi-Fi']
  },
  // Thailand
  thailand: {
    hotelName: 'Mandarin Oriental, Bangkok',
    hotelStars: 5,
    city: 'Bangkok',
    country: 'Thailand',
    hotelAddress: '48 Oriental Avenue, Bang Rak, Bangkok 10500, Thailand',
    hotelPhone: '+66 2 659 9000',
    gpsCoordinates: 'N 013° 43.340, E 100° 30.820',
    roomType: 'Deluxe Chao Phraya River Room',
    boardBasis: 'Bed & Breakfast',
    price: 'THB 14,500',
    reviewScore: '9.6 Exceptional · 3,120 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=',
    amenities: ['Chao Phraya River Views', 'The Oriental Spa', 'Multiple Award-winning Restaurants', 'Private Boat Shuttle']
  },
  // Saudi Arabia - Jeddah & Medina
  jeddah: {
    hotelName: 'Rosewood Jeddah',
    hotelStars: 5,
    city: 'Jeddah',
    country: 'Saudi Arabia',
    hotelAddress: 'Corniche Road, Al Shatie District, Jeddah 21453, Saudi Arabia',
    hotelPhone: '+966 12 260 7111',
    gpsCoordinates: 'N 021° 34.620, E 039° 06.540',
    roomType: 'Superior King Sea View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'SAR 1,850',
    reviewScore: '9.2 Superb · 2,450 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Red Sea Panorama', 'Rooftop Swimming Pool', '24h Dedicated Butler', 'Health & Fitness Club']
  },
  medina: {
    hotelName: 'The Oberoi, Madina',
    hotelStars: 5,
    city: 'Medina',
    country: 'Saudi Arabia',
    hotelAddress: 'Northern Central Area, Medina 41442, Saudi Arabia',
    hotelPhone: '+966 14 828 2222',
    gpsCoordinates: 'N 024° 28.210, E 039° 36.650',
    roomType: 'Grand Deluxe Prophet Mosque View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'SAR 2,100',
    reviewScore: '9.4 Exceptional · 4,120 reviews',
    checkInTime: '16:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Direct Haram Proximity', 'Fine Dining Moghul Room', 'Concierge Service', 'High-Speed Wi-Fi']
  },
  madinah: {
    hotelName: 'Dar Al Taqwa Hotel Medina',
    hotelStars: 5,
    city: 'Medina',
    country: 'Saudi Arabia',
    hotelAddress: 'Off Al Sitteen Street, Facing Al Masjid Al Nabawi, Medina, Saudi Arabia',
    hotelPhone: '+966 14 829 1111',
    gpsCoordinates: 'N 024° 28.190, E 039° 36.610',
    roomType: 'Deluxe Courtyard King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'SAR 1,750',
    reviewScore: '9.2 Superb · 3,890 reviews',
    checkInTime: '16:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Direct Courtyard Access', 'Al Marwa Restaurant', 'Executive Tea Lounge', '24h Room Service']
  },
  riyadh: {
    hotelName: 'Four Seasons Hotel Riyadh at Kingdom Centre',
    hotelStars: 5,
    city: 'Riyadh',
    country: 'Saudi Arabia',
    hotelAddress: 'Kingdom Centre, Olaya Street, Riyadh 11321, Saudi Arabia',
    hotelPhone: '+966 11 211 5000',
    gpsCoordinates: 'N 024° 42.680, E 046° 40.480',
    roomType: 'Deluxe King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'SAR 2,600',
    reviewScore: '9.3 Superb · 2,980 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Kingdom Tower Views', 'Spa & Wellness Sanctuary', 'Outdoor Heated Pool', 'Fine Dining Grill']
  },
  // UAE - Abu Dhabi
  'abu dhabi': {
    hotelName: 'Emirates Palace Mandarin Oriental, Abu Dhabi',
    hotelStars: 5,
    city: 'Abu Dhabi',
    country: 'United Arab Emirates',
    hotelAddress: 'West Corniche Road, Abu Dhabi, United Arab Emirates',
    hotelPhone: '+971 2 690 9000',
    gpsCoordinates: 'N 024° 27.750, E 054° 19.120',
    roomType: 'Deluxe Palace King Room',
    boardBasis: 'Bed & Breakfast (Buffet Included)',
    price: 'AED 2,950',
    reviewScore: '9.5 Exceptional · 5,200 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['1.3 km Private Beach', 'Marina Access', 'Palatial Gardens', 'Luxury Spa']
  },
  abudhabi: {
    hotelName: 'Emirates Palace Mandarin Oriental, Abu Dhabi',
    hotelStars: 5,
    city: 'Abu Dhabi',
    country: 'United Arab Emirates',
    hotelAddress: 'West Corniche Road, Abu Dhabi, United Arab Emirates',
    hotelPhone: '+971 2 690 9000',
    gpsCoordinates: 'N 024° 27.750, E 054° 19.120',
    roomType: 'Deluxe Palace King Room',
    boardBasis: 'Bed & Breakfast (Buffet Included)',
    price: 'AED 2,950',
    reviewScore: '9.5 Exceptional · 5,200 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['1.3 km Private Beach', 'Marina Access', 'Palatial Gardens', 'Luxury Spa']
  },
  // Qatar - Doha
  doha: {
    hotelName: 'Four Seasons Hotel Doha',
    hotelStars: 5,
    city: 'Doha',
    country: 'Qatar',
    hotelAddress: 'The Corniche, P.O. Box 24665, Doha, Qatar',
    hotelPhone: '+974 4494 8888',
    gpsCoordinates: 'N 025° 19.450, E 051° 32.180',
    roomType: 'Deluxe Arabian Gulf View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'QAR 1,650',
    reviewScore: '9.3 Superb · 2,780 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Beach & Marina', 'Nobu Restaurant', 'Multi-tiered Grotto Pools', 'Full-service Spa']
  },
  // Kuwait & Bahrain & Oman
  kuwait: {
    hotelName: 'Four Seasons Hotel Kuwait at Burj Alshaya',
    hotelStars: 5,
    city: 'Kuwait City',
    country: 'Kuwait',
    hotelAddress: 'Al Soor Street, Al Mirqab, Kuwait City, Kuwait',
    hotelPhone: '+965 2200 6000',
    gpsCoordinates: 'N 029° 21.650, E 047° 58.750',
    roomType: 'Superior King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'KWD 165',
    reviewScore: '9.3 Superb · 1,940 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Indoor & Outdoor Pools', 'Dai Forni Italian Dining', 'Sintoho Pan-Asian', 'Holistic Spa']
  },
  bahrain: {
    hotelName: 'Four Seasons Hotel Bahrain Bay',
    hotelStars: 5,
    city: 'Manama',
    country: 'Bahrain',
    hotelAddress: 'Bahrain Bay, P.O. Box 1669, Manama, Bahrain',
    hotelPhone: '+973 1711 5000',
    gpsCoordinates: 'N 026° 14.780, E 050° 34.920',
    roomType: 'Deluxe King Sea View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'BHD 195',
    reviewScore: '9.4 Exceptional · 2,630 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Island Setting', 'Wolfgang Puck Dining', 'Dhow Waterpark', 'Luxury Spa Complex']
  },
  oman: {
    hotelName: 'Al Bustan Palace, a Ritz-Carlton Hotel',
    hotelStars: 5,
    city: 'Muscat',
    country: 'Oman',
    hotelAddress: 'Muttrah Beach, P.O. Box 1998, Muscat 114, Oman',
    hotelPhone: '+968 2479 9666',
    gpsCoordinates: 'N 023° 34.520, E 058° 38.650',
    roomType: 'Deluxe Mountain View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'OMR 180',
    reviewScore: '9.5 Exceptional · 3,140 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['1 km Private Beach', 'Al Hajar Mountains Backdrop', 'Six Senses Spa', 'Five Outdoor Pools']
  },
  muscat: {
    hotelName: 'Al Bustan Palace, a Ritz-Carlton Hotel',
    hotelStars: 5,
    city: 'Muscat',
    country: 'Oman',
    hotelAddress: 'Muttrah Beach, P.O. Box 1998, Muscat 114, Oman',
    hotelPhone: '+968 2479 9666',
    gpsCoordinates: 'N 023° 34.520, E 058° 38.650',
    roomType: 'Deluxe Mountain View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'OMR 180',
    reviewScore: '9.5 Exceptional · 3,140 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['1 km Private Beach', 'Al Hajar Mountains Backdrop', 'Six Senses Spa', 'Five Outdoor Pools']
  },
  // Jordan
  jordan: {
    hotelName: 'Four Seasons Hotel Amman',
    hotelStars: 5,
    city: 'Amman',
    country: 'Jordan',
    hotelAddress: 'Al-Kindi Street, 5th Circle, Jabal Amman, Amman 11195, Jordan',
    hotelPhone: '+962 6 550 5555',
    gpsCoordinates: 'N 031° 57.850, E 035° 52.620',
    roomType: 'Deluxe King City View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'JOD 230',
    reviewScore: '9.3 Superb · 2,120 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Panoramic Amman Views', 'Heated Indoor & Outdoor Pools', 'The Spa', 'Fine Levantine Dining']
  },
  amman: {
    hotelName: 'Four Seasons Hotel Amman',
    hotelStars: 5,
    city: 'Amman',
    country: 'Jordan',
    hotelAddress: 'Al-Kindi Street, 5th Circle, Jabal Amman, Amman 11195, Jordan',
    hotelPhone: '+962 6 550 5555',
    gpsCoordinates: 'N 031° 57.850, E 035° 52.620',
    roomType: 'Deluxe King City View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'JOD 230',
    reviewScore: '9.3 Superb · 2,120 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Panoramic Amman Views', 'Heated Indoor & Outdoor Pools', 'The Spa', 'Fine Levantine Dining']
  },
  // Morocco
  morocco: {
    hotelName: 'Four Seasons Hotel Casablanca',
    hotelStars: 5,
    city: 'Casablanca',
    country: 'Morocco',
    hotelAddress: 'Anfa Place, Boulevard de la Corniche, Ain Diab, Casablanca 20050, Morocco',
    hotelPhone: '+212 529 07 37 00',
    gpsCoordinates: 'N 033° 35.840, W 007° 40.120',
    roomType: 'Superior Ocean View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'MAD 3,400',
    reviewScore: '9.2 Superb · 1,890 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Atlantic Ocean Views', 'Outdoor Pool Sanctuary', 'Traditional Moroccan Hammam', 'Bleu Seafood Restaurant']
  },
  casablanca: {
    hotelName: 'Four Seasons Hotel Casablanca',
    hotelStars: 5,
    city: 'Casablanca',
    country: 'Morocco',
    hotelAddress: 'Anfa Place, Boulevard de la Corniche, Ain Diab, Casablanca 20050, Morocco',
    hotelPhone: '+212 529 07 37 00',
    gpsCoordinates: 'N 033° 35.840, W 007° 40.120',
    roomType: 'Superior Ocean View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'MAD 3,400',
    reviewScore: '9.2 Superb · 1,890 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Atlantic Ocean Views', 'Outdoor Pool Sanctuary', 'Traditional Moroccan Hammam', 'Bleu Seafood Restaurant']
  },
  marrakech: {
    hotelName: 'La Mamounia Marrakech',
    hotelStars: 5,
    city: 'Marrakech',
    country: 'Morocco',
    hotelAddress: 'Avenue Bab Jdid, Marrakech 40040, Morocco',
    hotelPhone: '+212 524 38 86 00',
    gpsCoordinates: 'N 031° 37.280, W 007° 59.850',
    roomType: 'Classic Koutoubia View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'MAD 6,500',
    reviewScore: '9.6 Exceptional · 3,400 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Historic Royal Gardens', 'Jean-Georges Dining', 'World-Famous Hammam Spa', 'Iconic Luxury Pools']
  },
  // Egypt Destinations
  'sharm el sheikh': {
    hotelName: 'Four Seasons Resort Sharm El Sheikh',
    hotelStars: 5,
    city: 'Sharm El Sheikh',
    country: 'Egypt',
    hotelAddress: '1 Four Seasons Boulevard, Sharks Bay, Sharm El Sheikh, Egypt',
    hotelPhone: '+20 69 360 3555',
    gpsCoordinates: 'N 027° 58.120, E 034° 23.450',
    roomType: 'Deluxe Sea View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 420',
    reviewScore: '9.5 Exceptional · 4,120 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Fringing Coral Reef', 'Dive Center', 'Four Swimming Pools', 'Nine World-class Restaurants']
  },
  sharm: {
    hotelName: 'Four Seasons Resort Sharm El Sheikh',
    hotelStars: 5,
    city: 'Sharm El Sheikh',
    country: 'Egypt',
    hotelAddress: '1 Four Seasons Boulevard, Sharks Bay, Sharm El Sheikh, Egypt',
    hotelPhone: '+20 69 360 3555',
    gpsCoordinates: 'N 027° 58.120, E 034° 23.450',
    roomType: 'Deluxe Sea View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 420',
    reviewScore: '9.5 Exceptional · 4,120 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Fringing Coral Reef', 'Dive Center', 'Four Swimming Pools', 'Nine World-class Restaurants']
  },
  hurghada: {
    hotelName: 'Steigenberger ALDAU Beach Hotel',
    hotelStars: 5,
    city: 'Hurghada',
    country: 'Egypt',
    hotelAddress: 'Yussif Afifi Road, Hurghada, Red Sea Governorate, Egypt',
    hotelPhone: '+20 65 346 5400',
    gpsCoordinates: 'N 027° 09.780, E 033° 49.320',
    roomType: 'Deluxe Sea Front King Room',
    boardBasis: 'All Inclusive',
    price: 'US$ 280',
    reviewScore: '9.3 Superb · 5,600 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Sandy Beach', 'Lazy River Pool', '9-hole Golf Course', 'Aqua Spa Wellness']
  },
  alexandria: {
    hotelName: 'Four Seasons Hotel Alexandria at San Stefano',
    hotelStars: 5,
    city: 'Alexandria',
    country: 'Egypt',
    hotelAddress: '399 El Geish Road, San Stefano, Alexandria, Egypt',
    hotelPhone: '+20 3 581 8000',
    gpsCoordinates: 'N 031° 14.650, E 029° 57.920',
    roomType: 'Superior Mediterranean Sea View King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 320',
    reviewScore: '9.2 Superb · 2,890 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Beach Access', 'Infinity Pool on Corniche', 'Spa with Sea View', 'Italian Fine Dining']
  },
  luxor: {
    hotelName: 'Sofitel Winter Palace Luxor',
    hotelStars: 5,
    city: 'Luxor',
    country: 'Egypt',
    hotelAddress: 'Corniche El Nile Street, Luxor, Egypt',
    hotelPhone: '+20 95 238 0422',
    gpsCoordinates: 'N 025° 41.820, E 032° 38.250',
    roomType: 'Classic Nile View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 260',
    reviewScore: '9.1 Superb · 2,340 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Historic Victorian Architecture', 'Century-old Botanical Gardens', 'Outdoor Heated Pool', 'Nile Views']
  },
  aswan: {
    hotelName: 'Sofitel Legend Old Cataract Aswan',
    hotelStars: 5,
    city: 'Aswan',
    country: 'Egypt',
    hotelAddress: 'Abtal El Tahrir Street, Aswan, Egypt',
    hotelPhone: '+20 97 231 6000',
    gpsCoordinates: 'N 024° 04.850, E 032° 53.420',
    roomType: 'Luxury Nile Wing King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 480',
    reviewScore: '9.6 Exceptional · 2,980 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Historic 1899 Palace', 'Iconic Nile Terrace', 'Elephantine Island Views', 'So SPA by L\'Occitane']
  },
  // Germany
  germany: {
    hotelName: 'Hotel Adlon Kempinski Berlin',
    hotelStars: 5,
    city: 'Berlin',
    country: 'Germany',
    hotelAddress: 'Unter den Linden 77, 10117 Berlin, Germany',
    hotelPhone: '+49 30 22610',
    gpsCoordinates: 'N 052° 30.980, E 013° 22.780',
    roomType: 'Deluxe King Room Brandenburg Gate View',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 460',
    reviewScore: '9.4 Exceptional · 3,820 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Direct Brandenburg Gate Views', '2 Michelin Star Restaurant Lorenz Adlon', 'Adlon Spa by Resense', 'Pool']
  },
  berlin: {
    hotelName: 'The Ritz-Carlton, Berlin',
    hotelStars: 5,
    city: 'Berlin',
    country: 'Germany',
    hotelAddress: 'Potsdamer Platz 3, 10785 Berlin, Germany',
    hotelPhone: '+49 30 337777',
    gpsCoordinates: 'N 052° 30.620, E 013° 22.540',
    roomType: 'Deluxe King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 420',
    reviewScore: '9.3 Superb · 2,750 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Art Deco 1920s Glamour', 'Curtain Club Bar', 'Fragrances Cocktail Bar', 'Wellness & Pool Lounge']
  },
  munich: {
    hotelName: 'Mandarin Oriental, Munich',
    hotelStars: 5,
    city: 'Munich',
    country: 'Germany',
    hotelAddress: 'Neuturmstraße 1, 80331 Munich, Germany',
    hotelPhone: '+49 89 290980',
    gpsCoordinates: 'N 048° 08.210, E 011° 34.820',
    roomType: 'Superior King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 620',
    reviewScore: '9.5 Exceptional · 1,840 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Rooftop Pool with Alps Views', 'Matsuhisa Munich by Nobu', 'Central Old Town', 'Fitness Center']
  },
  // Italy Destinations
  rome: {
    hotelName: 'Hotel Eden, Dorchester Collection',
    hotelStars: 5,
    city: 'Rome',
    country: 'Italy',
    hotelAddress: 'Via Ludovisi 49, Via Veneto, 00187 Rome, Italy',
    hotelPhone: '+39 06 478 121',
    gpsCoordinates: 'N 041° 54.380, E 012° 29.210',
    roomType: 'Classic King Room with City View',
    boardBasis: 'Italian Buffet Breakfast Included',
    price: 'EUR 690',
    reviewScore: '9.4 Exceptional · 1,720 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Panoramic Rome Rooftop', 'La Terrazza Fine Dining', 'The Eden Spa', 'Steps from Spanish Steps']
  },
  milan: {
    hotelName: 'Armani Hotel Milano',
    hotelStars: 5,
    city: 'Milan',
    country: 'Italy',
    hotelAddress: 'Via Manzoni 31, Milan City Center, 20121 Milan, Italy',
    hotelPhone: '+39 02 8883 8888',
    gpsCoordinates: 'N 045° 28.250, E 009° 11.520',
    roomType: 'Armani Deluxe King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 780',
    reviewScore: '9.3 Superb · 2,150 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Fashion District Location', 'Armani/SPA with Panoramic Relaxation Pool', 'Armani/Ristorante', 'Lifestyle Manager']
  },
  venice: {
    hotelName: 'The Gritti Palace, a Luxury Collection Hotel, Venice',
    hotelStars: 5,
    city: 'Venice',
    country: 'Italy',
    hotelAddress: 'Campo Santa Maria Del Giglio, San Marco, 30124 Venice, Italy',
    hotelPhone: '+39 041 794611',
    gpsCoordinates: 'N 045° 25.850, E 012° 20.020',
    roomType: 'Grand Canal View Deluxe King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 950',
    reviewScore: '9.6 Exceptional · 2,240 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Grand Canal Waterfront', 'Club del Doge Restaurant', 'Bar Longhi', 'Sisley Paris Spa']
  },
  florence: {
    hotelName: 'Four Seasons Hotel Firenze',
    hotelStars: 5,
    city: 'Florence',
    country: 'Italy',
    hotelAddress: 'Borgo Pinti 99, San Marco, 50121 Florence, Italy',
    hotelPhone: '+39 055 26261',
    gpsCoordinates: 'N 043° 46.620, E 011° 16.120',
    roomType: 'Four Seasons Superior King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 890',
    reviewScore: '9.7 Exceptional · 1,980 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Largest Private Botanical Garden in Florence', 'Michelin-starred Il Palagio', 'Outdoor Heated Pool', 'Spa Sanctuary']
  },
  // Other European Capitals
  amsterdam: {
    hotelName: 'Waldorf Astoria Amsterdam',
    hotelStars: 5,
    city: 'Amsterdam',
    country: 'Netherlands',
    hotelAddress: 'Herengracht 542-556, 1017 CG Amsterdam, Netherlands',
    hotelPhone: '+31 20 718 4600',
    gpsCoordinates: 'N 052° 21.840, E 04° 53.750',
    roomType: 'King Grand Premier Canal View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 720',
    reviewScore: '9.6 Exceptional · 2,410 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['UNESCO Canal Views', 'Guerlain Spa', 'Private Courtyard Garden', 'Indoor Heated Pool']
  },
  vienna: {
    hotelName: 'Hotel Sacher Wien',
    hotelStars: 5,
    city: 'Vienna',
    country: 'Austria',
    hotelAddress: 'Philharmoniker Straße 4, 1010 Vienna, Austria',
    hotelPhone: '+43 1 514560',
    gpsCoordinates: 'N 048° 12.250, E 016° 22.180',
    roomType: 'Deluxe King Room Opera View',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 580',
    reviewScore: '9.5 Exceptional · 3,120 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Adjacent to Vienna State Opera', 'Original Sacher-Torte', 'Sacher Boutique Spa', 'Fine Dining Restaurant Rote Bar']
  },
  zurich: {
    hotelName: 'Baur au Lac Zurich',
    hotelStars: 5,
    city: 'Zurich',
    country: 'Switzerland',
    hotelAddress: 'Talstrasse 1, 8001 Zurich, Switzerland',
    hotelPhone: '+41 44 220 5020',
    gpsCoordinates: 'N 047° 22.050, E 008° 32.320',
    roomType: 'Deluxe King Lake & Park View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'CHF 850',
    reviewScore: '9.6 Exceptional · 1,940 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Lake Zurich & Alps Views', 'Private Park Setting', 'Pavillon 2-Michelin Star Dining', 'Rooftop Fitness']
  },
  prague: {
    hotelName: 'Four Seasons Hotel Prague',
    hotelStars: 5,
    city: 'Prague',
    country: 'Czech Republic',
    hotelAddress: 'Veleslavinova 1098/2a, Prague 1, 110 00 Prague, Czech Republic',
    hotelPhone: '+420 221 427 000',
    gpsCoordinates: 'N 050° 05.210, E 014° 24.880',
    roomType: 'Deluxe Vltava River & Castle View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 450',
    reviewScore: '9.5 Exceptional · 2,680 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Steps from Charles Bridge', 'Prague Castle Panorama', 'AVA Spa with Vitality Pool', 'CottoCrudo Italian Restaurant']
  },
  athens: {
    hotelName: 'Hotel Grande Bretagne, a Luxury Collection Hotel, Athens',
    hotelStars: 5,
    city: 'Athens',
    country: 'Greece',
    hotelAddress: '1 Vasileos Georgiou A\' str., Syntagma Square, 105 64 Athens, Greece',
    hotelPhone: '+30 210 333 0000',
    gpsCoordinates: 'N 037° 58.550, E 023° 44.180',
    roomType: 'Deluxe King Acropolis View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 520',
    reviewScore: '9.4 Exceptional · 3,450 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Direct Acropolis & Parthenon Views', 'GB Roof Garden', 'Outdoor & Indoor Pools', 'GB Spa Thermal Suite']
  },
  lisbon: {
    hotelName: 'Four Seasons Hotel Ritz Lisbon',
    hotelStars: 5,
    city: 'Lisbon',
    country: 'Portugal',
    hotelAddress: 'Rua Rodrigo da Fonseca 88, 1099-039 Lisbon, Portugal',
    hotelPhone: '+351 21 381 1400',
    gpsCoordinates: 'N 038° 43.520, W 009° 09.320',
    roomType: 'Premier King Balcony Room',
    boardBasis: 'Bed & Breakfast',
    price: 'EUR 620',
    reviewScore: '9.5 Exceptional · 2,380 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Eduardo VII Park Panorama', 'Rooftop Running Track', 'Michelin-starred CURA', 'Outdoor Heated Pool']
  },
  // Asia Destinations
  bangkok: {
    hotelName: 'Mandarin Oriental, Bangkok',
    hotelStars: 5,
    city: 'Bangkok',
    country: 'Thailand',
    hotelAddress: '48 Oriental Avenue, Bang Rak, Bangkok 10500, Thailand',
    hotelPhone: '+66 2 659 9000',
    gpsCoordinates: 'N 013° 43.340, E 100° 30.820',
    roomType: 'Deluxe Chao Phraya River Room',
    boardBasis: 'Bed & Breakfast',
    price: 'THB 14,500',
    reviewScore: '9.6 Exceptional · 3,120 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Chao Phraya River Views', 'The Oriental Spa', 'Multiple Award-winning Restaurants', 'Private Boat Shuttle']
  },
  phuket: {
    hotelName: 'Amanpuri Phuket',
    hotelStars: 5,
    city: 'Phuket',
    country: 'Thailand',
    hotelAddress: 'Pansea Beach, Cherngtalay, Thalang District, Phuket 83110, Thailand',
    hotelPhone: '+66 76 324 333',
    gpsCoordinates: 'N 007° 59.250, E 098° 16.520',
    roomType: 'Ocean Pavilion King',
    boardBasis: 'Bed & Breakfast',
    price: 'THB 32,000',
    reviewScore: '9.7 Exceptional · 1,450 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Secluded Beach', 'Holistic Wellness Centre', 'Eco-Discovery Club', 'Watersports Fleet']
  },
  singapore: {
    hotelName: 'Marina Bay Sands Singapore',
    hotelStars: 5,
    city: 'Singapore',
    country: 'Singapore',
    hotelAddress: '10 Bayfront Avenue, Marina Bay, 018956 Singapore',
    hotelPhone: '+65 6688 8868',
    gpsCoordinates: 'N 001° 17.020, E 103° 51.650',
    roomType: 'Premier King Sands Harbour View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'SGD 850',
    reviewScore: '9.2 Superb · 12,400 reviews',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    hotelImage: '',
    amenities: ['World\'s Largest Rooftop Infinity Pool', 'SkyPark Observation Deck', 'Banyan Tree Spa', 'Celebrity Chef Dining']
  },
  tokyo: {
    hotelName: 'The Peninsula Tokyo',
    hotelStars: 5,
    city: 'Tokyo',
    country: 'Japan',
    hotelAddress: '1-8-1 Yurakucho, Chiyoda-ku, Tokyo 100-0006, Japan',
    hotelPhone: '+81 3 6270 2888',
    gpsCoordinates: 'N 035° 40.420, E 139° 45.650',
    roomType: 'Deluxe King Imperial Palace View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'JPY 120,000',
    reviewScore: '9.5 Exceptional · 3,180 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Opposite Imperial Palace Gardens', 'The Peninsula Spa & Pool', 'Peter Grill Rooftop', 'Rolls-Royce Chauffeur']
  },
  bali: {
    hotelName: 'Four Seasons Resort Bali at Sayan',
    hotelStars: 5,
    city: 'Bali (Ubud)',
    country: 'Indonesia',
    hotelAddress: 'Sayan, Ubud, Gianyar Regency, Bali 80571, Indonesia',
    hotelPhone: '+62 361 977577',
    gpsCoordinates: 'S 008° 29.850, E 115° 14.520',
    roomType: 'One-Bedroom Riverfront Villa with Private Pool',
    boardBasis: 'Bed & Breakfast',
    price: 'IDR 14,500,000',
    reviewScore: '9.7 Exceptional · 2,420 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Ayung River Valley Setting', 'Iconic Suspension Bridge Entry', 'Sacred River Spa', 'Two-tier Cascading Pools']
  },
  maldives: {
    hotelName: 'Soneva Fushi Maldives',
    hotelStars: 5,
    city: 'Baa Atoll',
    country: 'Maldives',
    hotelAddress: 'Kunfunadhoo Island, Baa Atoll, Maldives',
    hotelPhone: '+960 660 0304',
    gpsCoordinates: 'N 005° 06.850, E 073° 04.520',
    roomType: 'Water Reserve with Slide & Private Pool',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 1,850',
    reviewScore: '9.8 Exceptional · 1,620 reviews',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['UNESCO Biosphere Reserve', 'Barefoot Luxury Experience', 'Observatory with Telescope', 'Overwater Cinema Paradiso']
  },
  india: {
    hotelName: 'The Taj Mahal Palace, Mumbai',
    hotelStars: 5,
    city: 'Mumbai',
    country: 'India',
    hotelAddress: 'Apollo Bunder, Colaba, Mumbai, Maharashtra 400001, India',
    hotelPhone: '+91 22 6665 3366',
    gpsCoordinates: 'N 018° 55.320, E 072° 50.050',
    roomType: 'Luxury Grande Room Sea View',
    boardBasis: 'Bed & Breakfast',
    price: 'INR 28,000',
    reviewScore: '9.5 Exceptional · 5,800 reviews',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Gateway of India Landmark', 'Jiva Spa & Outdoor Pool', 'Wasabi by Morimoto', 'Heritage Butler Service']
  },
  mumbai: {
    hotelName: 'The Taj Mahal Palace, Mumbai',
    hotelStars: 5,
    city: 'Mumbai',
    country: 'India',
    hotelAddress: 'Apollo Bunder, Colaba, Mumbai, Maharashtra 400001, India',
    hotelPhone: '+91 22 6665 3366',
    gpsCoordinates: 'N 018° 55.320, E 072° 50.050',
    roomType: 'Luxury Grande Room Sea View',
    boardBasis: 'Bed & Breakfast',
    price: 'INR 28,000',
    reviewScore: '9.5 Exceptional · 5,800 reviews',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Gateway of India Landmark', 'Jiva Spa & Outdoor Pool', 'Wasabi by Morimoto', 'Heritage Butler Service']
  },
  'hong kong': {
    hotelName: 'The Peninsula Hong Kong',
    hotelStars: 5,
    city: 'Hong Kong',
    country: 'Hong Kong',
    hotelAddress: 'Salisbury Road, Tsim Sha Tsui, Kowloon, Hong Kong',
    hotelPhone: '+852 2920 2888',
    gpsCoordinates: 'N 022° 17.720, E 114° 10.350',
    roomType: 'Grand Deluxe King Victoria Harbour View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'HKD 5,800',
    reviewScore: '9.5 Exceptional · 3,650 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Victoria Harbour Panorama', 'Roman-style Indoor Pool', 'Helipad Access', 'The Peninsula Spa']
  },
  // Americas
  'new york': {
    hotelName: 'The Plaza, A Fairmont Managed Hotel, New York',
    hotelStars: 5,
    city: 'New York',
    country: 'United States',
    hotelAddress: '768 5th Ave, New York, NY 10019, United States',
    hotelPhone: '+1 212 759 3000',
    gpsCoordinates: 'N 040° 45.850, W 073° 58.450',
    roomType: 'Deluxe King Central Park View Room',
    boardBasis: 'American Breakfast Included',
    price: 'US$ 950',
    reviewScore: '9.2 Superb · 4,200 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Fifth Avenue & Central Park South', 'The Palm Court Afternoon Tea', 'Guerlain Spa', 'Plaza Butler Service']
  },
  newyork: {
    hotelName: 'The Plaza, A Fairmont Managed Hotel, New York',
    hotelStars: 5,
    city: 'New York',
    country: 'United States',
    hotelAddress: '768 5th Ave, New York, NY 10019, United States',
    hotelPhone: '+1 212 759 3000',
    gpsCoordinates: 'N 040° 45.850, W 073° 58.450',
    roomType: 'Deluxe King Central Park View Room',
    boardBasis: 'American Breakfast Included',
    price: 'US$ 950',
    reviewScore: '9.2 Superb · 4,200 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Fifth Avenue & Central Park South', 'The Palm Court Afternoon Tea', 'Guerlain Spa', 'Plaza Butler Service']
  },
  miami: {
    hotelName: 'Faena Hotel Miami Beach',
    hotelStars: 5,
    city: 'Miami Beach',
    country: 'United States',
    hotelAddress: '3201 Collins Ave, Miami Beach, FL 33140, United States',
    hotelPhone: '+1 305 534 8800',
    gpsCoordinates: 'N 025° 48.350, W 080° 07.420',
    roomType: 'Oceanfront King Balcony Room',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 850',
    reviewScore: '9.3 Superb · 2,640 reviews',
    checkInTime: '16:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Private Beach Service', 'Tierra Santa Healing House Spa', 'Los Fuegos by Francis Mallmann', 'Faena Theater']
  },
  'los angeles': {
    hotelName: 'The Beverly Hills Hotel, Dorchester Collection',
    hotelStars: 5,
    city: 'Beverly Hills, Los Angeles',
    country: 'United States',
    hotelAddress: '9641 Sunset Blvd, Beverly Hills, CA 90210, United States',
    hotelPhone: '+1 310 276 2251',
    gpsCoordinates: 'N 034° 04.950, W 118° 24.850',
    roomType: 'Superior King Room with Garden View',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 1,150',
    reviewScore: '9.5 Exceptional · 2,190 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Iconic Pink Palace Pool & Cabanas', 'Polo Lounge Celebrity Dining', '12 Acres of Tropical Gardens', 'Luxury Spa']
  },
  // Africa
  'cape town': {
    hotelName: 'One&Only Cape Town',
    hotelStars: 5,
    city: 'Cape Town',
    country: 'South Africa',
    hotelAddress: 'Dock Road, Victoria & Alfred Waterfront, Cape Town 8001, South Africa',
    hotelPhone: '+27 21 431 5888',
    gpsCoordinates: 'S 033° 54.520, E 018° 25.120',
    roomType: 'Marina King Table Mountain View Room',
    boardBasis: 'Bed & Breakfast',
    price: 'ZAR 12,500',
    reviewScore: '9.5 Exceptional · 2,870 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['V&A Waterfront Marina Setting', 'Table Mountain Backdrop', 'Nobu Cape Town', 'Private Spa Island']
  },
  nairobi: {
    hotelName: 'Hemingways Nairobi',
    hotelStars: 5,
    city: 'Nairobi',
    country: 'Kenya',
    hotelAddress: 'Mbagathi Ridge, Karen, Nairobi, Kenya',
    hotelPhone: '+254 709 188 000',
    gpsCoordinates: 'S 001° 20.850, E 036° 42.650',
    roomType: 'Deluxe King Suite with Ngong Hills View',
    boardBasis: 'Bed & Breakfast',
    price: 'US$ 450',
    reviewScore: '9.6 Exceptional · 1,780 reviews',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    hotelImage: '',
    amenities: ['Ngong Hills Panorama', 'Dedicated Butler Service', 'Heated Outdoor Pool', 'Spa & Wellness Center']
  },
  // Georgia & Caucasus
  georgia: {
    hotelName: 'Rooms Hotel Tbilisi',
    hotelStars: 5,
    city: 'Tbilisi',
    country: 'Georgia',
    hotelAddress: '14 Merab Kostava St, Vera, Tbilisi 0108, Georgia',
    hotelPhone: '+995 32 202 0099',
    gpsCoordinates: 'N 041° 42.450, E 044° 47.320',
    roomType: 'Signature King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'GEL 520',
    reviewScore: '9.3 Superb · 2,450 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Vera Historic Neighborhood', 'The Kitchen Restaurant', 'Lounge Bar & Garden Terrace', 'High-Speed Wi-Fi']
  },
  tbilisi: {
    hotelName: 'Rooms Hotel Tbilisi',
    hotelStars: 5,
    city: 'Tbilisi',
    country: 'Georgia',
    hotelAddress: '14 Merab Kostava St, Vera, Tbilisi 0108, Georgia',
    hotelPhone: '+995 32 202 0099',
    gpsCoordinates: 'N 041° 42.450, E 044° 47.320',
    roomType: 'Signature King Room',
    boardBasis: 'Bed & Breakfast',
    price: 'GEL 520',
    reviewScore: '9.3 Superb · 2,450 reviews',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    hotelImage: '',
    amenities: ['Vera Historic Neighborhood', 'The Kitchen Restaurant', 'Lounge Bar & Garden Terrace', 'High-Speed Wi-Fi']
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
  const fallbackHotelName = `Grand Palace Hotel & Resort ${cleanDest}`;
  return {
    hotelName: fallbackHotelName,
    hotelStars: 5,
    city: cleanDest,
    country: cleanDest,
    hotelAddress: `Central Boulevard, City Center, ${cleanDest}`,
    hotelPhone: generateHotelPhone(cleanDest, fallbackHotelName),
    gpsCoordinates: null,
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
      price: fallbackData.price || 'US$ 450',
      reviewScore: fallbackData.reviewScore || '9.1 Superb · 3,120 reviews',
      hotelPhone: fallbackData.hotelPhone || generateHotelPhone(fallbackData.country, fallbackData.hotelName),
      gpsCoordinates: fallbackData.gpsCoordinates || null,
      hotelImage: fallbackData.hotelImage || 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
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

    const modelName = normalizeGeminiModel(env.GEMINI_MODEL, 'gemini-3.8-flash');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
      price: parsed.price || fallbackData.price || 'US$ 450',
      reviewScore: parsed.reviewScore || fallbackData.reviewScore || '9.0 Superb · 2,800 reviews',
      hotelPhone: parsed.hotelPhone || fallbackData.hotelPhone || generateHotelPhone(fallbackData.country, fallbackData.hotelName),
      gpsCoordinates: fallbackData.gpsCoordinates || null,
      hotelImage: fallbackData.hotelImage || 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
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
    hotelPhone: fallback.hotelPhone || generateHotelPhone(fallback.country, fallback.hotelName),
    gpsCoordinates: fallback.gpsCoordinates || null,
    hotelImage: fallback.hotelImage || 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=',
    city: fallback.city,
    country: fallback.country,
    checkIn: new Date(meta.checkIn).toISOString(),
    checkOut: new Date(meta.checkOut).toISOString(),
    nights: meta.nights,
    roomType: fallback.roomType,
    boardBasis: fallback.boardBasis,
    price: fallback.price || 'US$ 450',
    reviewScore: fallback.reviewScore || '9.1 Superb · 2,900 reviews',
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
