/**
 * AfricaTravel — Master Airlines & IATA Codes Registry
 *
 * Comprehensive registry of international and regional airlines,
 * 2-letter IATA codes, Arabic & English names, and search aliases.
 */

export const AIRLINES = [
  // --- North Africa & Middle East ---
  {
    code: 'MS',
    name: 'EgyptAir',
    nameAr: 'مصر للطيران',
    country: 'Egypt',
    countryAr: 'مصر',
    aliases: ['EgyptAir', 'Egypt Air', 'MS', 'مصر للطيران']
  },
  {
    code: 'SM',
    name: 'Air Cairo',
    nameAr: 'إير كايرو',
    country: 'Egypt',
    countryAr: 'مصر',
    aliases: ['Air Cairo', 'AirCairo', 'SM', 'اير كايرو', 'إير كايرو']
  },
  {
    code: 'NP',
    name: 'Nile Air',
    nameAr: 'النيل للطيران',
    country: 'Egypt',
    countryAr: 'مصر',
    aliases: ['Nile Air', 'NileAir', 'NP', 'النيل للطيران']
  },
  {
    code: 'SV',
    name: 'Saudi Arabian Airlines',
    nameAr: 'الخطوط السعودية',
    country: 'Saudi Arabia',
    countryAr: 'السعودية',
    aliases: ['Saudia', 'Saudi Arabian Airlines', 'Saudi Airlines', 'SV', 'الخطوط السعودية', 'السعودية']
  },
  {
    code: 'XY',
    name: 'Flynas',
    nameAr: 'طيران ناس',
    country: 'Saudi Arabia',
    countryAr: 'السعودية',
    aliases: ['Flynas', 'Nas Air', 'XY', 'طيران ناس', 'ناس']
  },
  {
    code: 'F3',
    name: 'Flyadeal',
    nameAr: 'طيران أديل',
    country: 'Saudi Arabia',
    countryAr: 'السعودية',
    aliases: ['Flyadeal', 'Fly Adeal', 'F3', 'طيران أديل', 'اديل']
  },
  {
    code: 'EK',
    name: 'Emirates',
    nameAr: 'طيران الإمارات',
    country: 'United Arab Emirates',
    countryAr: 'الإمارات',
    aliases: ['Emirates', 'Emirates Airline', 'EK', 'طيران الإمارات', 'الإمارات']
  },
  {
    code: 'EY',
    name: 'Etihad Airways',
    nameAr: 'الاتحاد للطيران',
    country: 'United Arab Emirates',
    countryAr: 'الإمارات',
    aliases: ['Etihad', 'Etihad Airways', 'EY', 'الاتحاد للطيران', 'طيران الاتحاد']
  },
  {
    code: 'FZ',
    name: 'flydubai',
    nameAr: 'فلاي دبي',
    country: 'United Arab Emirates',
    countryAr: 'الإمارات',
    aliases: ['flydubai', 'Fly Dubai', 'FZ', 'فلاي دبي']
  },
  {
    code: 'G9',
    name: 'Air Arabia',
    nameAr: 'العربية للطيران',
    country: 'United Arab Emirates',
    countryAr: 'الإمارات',
    aliases: ['Air Arabia', 'AirArabia', 'G9', 'العربية للطيران', 'طيران العربية']
  },
  {
    code: 'QR',
    name: 'Qatar Airways',
    nameAr: 'الخطوط الجوية القطرية',
    country: 'Qatar',
    countryAr: 'قطر',
    aliases: ['Qatar Airways', 'Qatar', 'QR', 'الخطوط القطرية', 'القطرية']
  },
  {
    code: 'WY',
    name: 'Oman Air',
    nameAr: 'الطيران العماني',
    country: 'Oman',
    countryAr: 'عمان',
    aliases: ['Oman Air', 'WY', 'الطيران العماني', 'طيران عمان']
  },
  {
    code: 'GF',
    name: 'Gulf Air',
    nameAr: 'طيران الخليج',
    country: 'Bahrain',
    countryAr: 'البحرين',
    aliases: ['Gulf Air', 'GF', 'طيران الخليج']
  },
  {
    code: 'KU',
    name: 'Kuwait Airways',
    nameAr: 'الخطوط الجوية الكويتية',
    country: 'Kuwait',
    countryAr: 'الكويت',
    aliases: ['Kuwait Airways', 'KU', 'الخطوط الكويتية', 'الكويتية']
  },
  {
    code: 'ME',
    name: 'Middle East Airlines',
    nameAr: 'طيران الشرق الأوسط',
    country: 'Lebanon',
    countryAr: 'لبنان',
    aliases: ['MEA', 'Middle East Airlines', 'ME', 'طيران الشرق الأوسط']
  },
  {
    code: 'RJ',
    name: 'Royal Jordanian',
    nameAr: 'الملكية الأردنية',
    country: 'Jordan',
    countryAr: 'الأردن',
    aliases: ['Royal Jordanian', 'RJ', 'الملكية الأردنية', 'الأردنية']
  },
  {
    code: 'AT',
    name: 'Royal Air Maroc',
    nameAr: 'الخطوط الملكية المغربية',
    country: 'Morocco',
    countryAr: 'المغرب',
    aliases: ['Royal Air Maroc', 'RAM', 'AT', 'الخطوط المغربية', 'الخطوط الملكية المغربية']
  },
  {
    code: 'TU',
    name: 'Tunisair',
    nameAr: 'الخطوط التونسية',
    country: 'Tunisia',
    countryAr: 'تونس',
    aliases: ['Tunisair', 'Tunis Air', 'TU', 'الخطوط التونسية', 'التونسية']
  },
  {
    code: 'AH',
    name: 'Air Algérie',
    nameAr: 'الخطوط الجوية الجزائرية',
    country: 'Algeria',
    countryAr: 'الجزائر',
    aliases: ['Air Algérie', 'Air Algerie', 'Algerie', 'AH', 'الخطوط الجزائرية', 'الجزائرية']
  },

  // --- Sub-Saharan Africa ---
  {
    code: 'ET',
    name: 'Ethiopian Airlines',
    nameAr: 'الخطوط الجوية الإثيوبية',
    country: 'Ethiopia',
    countryAr: 'إثيوبيا',
    aliases: ['Ethiopian Airlines', 'Ethiopian', 'ET', 'الخطوط الإثيوبية', 'الإثيوبية']
  },
  {
    code: 'KQ',
    name: 'Kenya Airways',
    nameAr: 'الخطوط الجوية الكينية',
    country: 'Kenya',
    countryAr: 'كينيا',
    aliases: ['Kenya Airways', 'KQ', 'الخطوط الكينية', 'الكينية']
  },
  {
    code: 'J4',
    name: 'Badr Airlines',
    nameAr: 'بدر للطيران',
    country: 'Sudan',
    countryAr: 'السودان',
    aliases: ['Badr Airlines', 'Badr', 'J4', 'بدر للطيران', 'طيران بدر']
  },
  {
    code: '3T',
    name: 'Tarco Aviation',
    nameAr: 'تاركو للطيران',
    country: 'Sudan',
    countryAr: 'السودان',
    aliases: ['Tarco Aviation', 'Tarco', '3T', 'تاركو للطيران', 'طيران تاركو']
  },

  // --- Europe & Mediterranean ---
  {
    code: 'TK',
    name: 'Turkish Airlines',
    nameAr: 'الخطوط الجوية التركية',
    country: 'Turkey',
    countryAr: 'تركيا',
    aliases: ['Turkish Airlines', 'Turkish', 'TK', 'الخطوط التركية', 'التركية']
  },
  {
    code: 'BA',
    name: 'British Airways',
    nameAr: 'الخطوط الجوية البريطانية',
    country: 'United Kingdom',
    countryAr: 'بريطانيا',
    aliases: ['British Airways', 'BA', 'الخطوط البريطانية', 'البريطانية']
  },
  {
    code: 'AF',
    name: 'Air France',
    nameAr: 'الخطوط الجوية الفرنسية',
    country: 'France',
    countryAr: 'فرنسا',
    aliases: ['Air France', 'AF', 'طيران فرنسا', 'الفرنسية']
  },
  {
    code: 'LH',
    name: 'Lufthansa',
    nameAr: 'لوفتهانزا',
    country: 'Germany',
    countryAr: 'ألمانيا',
    aliases: ['Lufthansa', 'LH', 'لوفتهانزا']
  },
  {
    code: 'KL',
    name: 'KLM',
    nameAr: 'الخطوط الجوية الملكية الهولندية',
    country: 'Netherlands',
    countryAr: 'هولندا',
    aliases: ['KLM', 'KLM Royal Dutch Airlines', 'KL', 'الخطوط الهولندية', 'كي إل إم']
  },
  {
    code: 'IB',
    name: 'Iberia',
    nameAr: 'إيبيريا',
    country: 'Spain',
    countryAr: 'إسبانيا',
    aliases: ['Iberia', 'IB', 'إيبيريا', 'ايبيريا']
  },
  {
    code: 'AZ',
    name: 'ITA Airways',
    nameAr: 'إيتا إيروايز',
    country: 'Italy',
    countryAr: 'إيطاليا',
    aliases: ['ITA Airways', 'ITA', 'Alitalia', 'AZ', 'إيتا إيروايز', 'طيران إيطاليا']
  },
  {
    code: 'A3',
    name: 'Aegean Airlines',
    nameAr: 'خطوط إيجين الجوية',
    country: 'Greece',
    countryAr: 'اليونان',
    aliases: ['Aegean Airlines', 'Aegean', 'A3', 'إيجين للطيران', 'الخطوط اليونانية']
  },

  // --- North America ---
  {
    code: 'AA',
    name: 'American Airlines',
    nameAr: 'الخطوط الجوية الأمريكية',
    country: 'United States',
    countryAr: 'الولايات المتحدة',
    aliases: ['American Airlines', 'AA', 'الخطوط الأمريكية', 'الأمريكية']
  },
  {
    code: 'DL',
    name: 'Delta Air Lines',
    nameAr: 'دلتا إيرلاينز',
    country: 'United States',
    countryAr: 'الولايات المتحدة',
    aliases: ['Delta Air Lines', 'Delta', 'DL', 'دلتا إيرلاينز', 'دلتا']
  },
  {
    code: 'UA',
    name: 'United Airlines',
    nameAr: 'يونايتد إيرلاينز',
    country: 'United States',
    countryAr: 'الولايات المتحدة',
    aliases: ['United Airlines', 'United', 'UA', 'يونايتد إيرلاينز', 'يونايتد']
  },
  {
    code: 'AC',
    name: 'Air Canada',
    nameAr: 'طيران كندا',
    country: 'Canada',
    countryAr: 'كندا',
    aliases: ['Air Canada', 'AC', 'طيران كندا', 'الخطوط الكندية']
  },

  // --- Asia & Pacific ---
  {
    code: 'CA',
    name: 'Air China',
    nameAr: 'طيران الصين',
    country: 'China',
    countryAr: 'الصين',
    aliases: ['Air China', 'CA', 'طيران الصين', 'الخطوط الصينية']
  },
  {
    code: 'MU',
    name: 'China Eastern',
    nameAr: 'الخطوط الجوية الشرقية الصينية',
    country: 'China',
    countryAr: 'الصين',
    aliases: ['China Eastern', 'China Eastern Airlines', 'MU', 'شرق الصين للطيران']
  },
  {
    code: 'CZ',
    name: 'China Southern',
    nameAr: 'الخطوط الجوية الجنوبية الصينية',
    country: 'China',
    countryAr: 'الصين',
    aliases: ['China Southern', 'China Southern Airlines', 'CZ', 'جنوب الصين للطيران']
  },
  {
    code: 'SQ',
    name: 'Singapore Airlines',
    nameAr: 'الخطوط الجوية السنغافورية',
    country: 'Singapore',
    countryAr: 'سنغافورة',
    aliases: ['Singapore Airlines', 'Singapore Air', 'SQ', 'الخطوط السنغافورية', 'السنغافورية']
  }
];

/**
 * Fast lookup map by 2-letter IATA code (uppercase).
 */
const AIRLINE_BY_CODE = new Map(AIRLINES.map(a => [a.code.toUpperCase(), a]));

/**
 * Finds an airline by IATA code, English name, Arabic name, or alias.
 * @param {string} query
 * @returns {object|undefined}
 */
export function findAirline(query) {
  if (!query || typeof query !== 'string') return undefined;
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  // Direct code match (case-insensitive)
  const byCode = AIRLINE_BY_CODE.get(q.toUpperCase());
  if (byCode) return byCode;

  // Exact name or nameAr match
  const exact = AIRLINES.find(a =>
    a.name.toLowerCase() === q ||
    a.nameAr.toLowerCase() === q ||
    a.code.toLowerCase() === q
  );
  if (exact) return exact;

  // Alias match
  const aliasMatch = AIRLINES.find(a =>
    a.aliases?.some(alias => alias.toLowerCase() === q || alias.toLowerCase().includes(q) || q.includes(alias.toLowerCase()))
  );
  if (aliasMatch) return aliasMatch;

  // Substring match
  return AIRLINES.find(a =>
    a.name.toLowerCase().includes(q) ||
    a.nameAr.toLowerCase().includes(q) ||
    q.includes(a.name.toLowerCase()) ||
    q.includes(a.nameAr.toLowerCase())
  );
}

/**
 * Retrieves an airline by exact 2-letter IATA code.
 * @param {string} code
 * @returns {object|undefined}
 */
export function getAirlineByCode(code) {
  if (!code || typeof code !== 'string') return undefined;
  return AIRLINE_BY_CODE.get(code.trim().toUpperCase());
}

/**
 * Formats a localized label for an airline.
 * @param {object} airline
 * @param {string} [lang='ar']
 * @returns {string}
 */
export function getAirlineLabel(airline, lang = 'ar') {
  if (!airline) return '';
  if (lang === 'ar') {
    return `${airline.nameAr} (${airline.name}) [${airline.code}]`;
  }
  return `${airline.name} (${airline.nameAr}) [${airline.code}]`;
}

/**
 * Generates `<option>` elements HTML for a select element.
 * @param {string} [selectedValue=''] - Selected airline name or code
 * @param {string} [lang='ar'] - Language locale ('ar' or 'en')
 * @returns {string}
 */
export function renderAirlineOptionsHtml(selectedValue = '', lang = 'ar') {
  const normSelected = String(selectedValue || '').trim().toLowerCase();

  return AIRLINES.map(airline => {
    const isSelected =
      normSelected === airline.code.toLowerCase() ||
      normSelected === airline.name.toLowerCase() ||
      normSelected === airline.nameAr.toLowerCase();

    const label = getAirlineLabel(airline, lang);
    return `<option value="${airline.name}" data-code="${airline.code}" ${isSelected ? 'selected' : ''}>${label}</option>`;
  }).join('\n');
}
