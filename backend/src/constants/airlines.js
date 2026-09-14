/**
 * AfricaTravel — Server-Side Master Airlines & IATA Codes Registry
 */

export const AIRLINES = [
  { code: 'MS', name: 'EgyptAir', nameAr: 'مصر للطيران', country: 'Egypt', aliases: ['EgyptAir', 'Egypt Air', 'MS', 'مصر للطيران'] },
  { code: 'SM', name: 'Air Cairo', nameAr: 'إير كايرو', country: 'Egypt', aliases: ['Air Cairo', 'AirCairo', 'SM', 'اير كايرو', 'إير كايرو'] },
  { code: 'NP', name: 'Nile Air', nameAr: 'النيل للطيران', country: 'Egypt', aliases: ['Nile Air', 'NileAir', 'NP', 'النيل للطيران'] },
  { code: 'SV', name: 'Saudi Arabian Airlines', nameAr: 'الخطوط السعودية', country: 'Saudi Arabia', aliases: ['Saudia', 'Saudi Arabian Airlines', 'Saudi Airlines', 'SV', 'الخطوط السعودية', 'السعودية'] },
  { code: 'XY', name: 'Flynas', nameAr: 'طيران ناس', country: 'Saudi Arabia', aliases: ['Flynas', 'Nas Air', 'XY', 'طيران ناس', 'ناس'] },
  { code: 'F3', name: 'Flyadeal', nameAr: 'طيران أديل', country: 'Saudi Arabia', aliases: ['Flyadeal', 'Fly Adeal', 'F3', 'طيران أديل', 'اديل'] },
  { code: 'EK', name: 'Emirates', nameAr: 'طيران الإمارات', country: 'United Arab Emirates', aliases: ['Emirates', 'Emirates Airline', 'EK', 'طيران الإمارات', 'الإمارات'] },
  { code: 'EY', name: 'Etihad Airways', nameAr: 'الاتحاد للطيران', country: 'United Arab Emirates', aliases: ['Etihad', 'Etihad Airways', 'EY', 'الاتحاد للطيران', 'طيران الاتحاد'] },
  { code: 'FZ', name: 'flydubai', nameAr: 'فلاي دبي', country: 'United Arab Emirates', aliases: ['flydubai', 'Fly Dubai', 'FZ', 'فلاي دبي'] },
  { code: 'G9', name: 'Air Arabia', nameAr: 'العربية للطيران', country: 'United Arab Emirates', aliases: ['Air Arabia', 'AirArabia', 'G9', 'العربية للطيران', 'طيران العربية'] },
  { code: 'QR', name: 'Qatar Airways', nameAr: 'الخطوط الجوية القطرية', country: 'Qatar', aliases: ['Qatar Airways', 'Qatar', 'QR', 'الخطوط القطرية', 'القطرية'] },
  { code: 'WY', name: 'Oman Air', nameAr: 'الطيران العماني', country: 'Oman', aliases: ['Oman Air', 'WY', 'الطيران العماني', 'طيران عمان'] },
  { code: 'GF', name: 'Gulf Air', nameAr: 'طيران الخليج', country: 'Bahrain', aliases: ['Gulf Air', 'GF', 'طيران الخليج'] },
  { code: 'KU', name: 'Kuwait Airways', nameAr: 'الخطوط الجوية الكويتية', country: 'Kuwait', aliases: ['Kuwait Airways', 'KU', 'الخطوط الكويتية', 'الكويتية'] },
  { code: 'ME', name: 'Middle East Airlines', nameAr: 'طيران الشرق الأوسط', country: 'Lebanon', aliases: ['MEA', 'Middle East Airlines', 'ME', 'طيران الشرق الأوسط'] },
  { code: 'RJ', name: 'Royal Jordanian', nameAr: 'الملكية الأردنية', country: 'Jordan', aliases: ['Royal Jordanian', 'RJ', 'الملكية الأردنية', 'الأردنية'] },
  { code: 'AT', name: 'Royal Air Maroc', nameAr: 'الخطوط الملكية المغربية', country: 'Morocco', aliases: ['Royal Air Maroc', 'RAM', 'AT', 'الخطوط المغربية', 'الخطوط الملكية المغربية'] },
  { code: 'TU', name: 'Tunisair', nameAr: 'الخطوط التونسية', country: 'Tunisia', aliases: ['Tunisair', 'Tunis Air', 'TU', 'الخطوط التونسية', 'التونسية'] },
  { code: 'AH', name: 'Air Algérie', nameAr: 'الخطوط الجوية الجزائرية', country: 'Algeria', aliases: ['Air Algérie', 'Air Algerie', 'Algerie', 'AH', 'الخطوط الجزائرية', 'الجزائرية'] },
  { code: 'ET', name: 'Ethiopian Airlines', nameAr: 'الخطوط الجوية الإثيوبية', country: 'Ethiopia', aliases: ['Ethiopian Airlines', 'Ethiopian', 'ET', 'الخطوط الإثيوبية', 'الإثيوبية'] },
  { code: 'KQ', name: 'Kenya Airways', nameAr: 'الخطوط الجوية الكينية', country: 'Kenya', aliases: ['Kenya Airways', 'KQ', 'الخطوط الكينية', 'الكينية'] },
  { code: 'J4', name: 'Badr Airlines', nameAr: 'بدر للطيران', country: 'Sudan', aliases: ['Badr Airlines', 'Badr', 'J4', 'بدر للطيران', 'طيران بدر'] },
  { code: '3T', name: 'Tarco Aviation', nameAr: 'تاركو للطيران', country: 'Sudan', aliases: ['Tarco Aviation', 'Tarco', '3T', 'تاركو للطيران', 'طيران تاركو'] },
  { code: 'TK', name: 'Turkish Airlines', nameAr: 'الخطوط الجوية التركية', country: 'Turkey', aliases: ['Turkish Airlines', 'Turkish', 'TK', 'الخطوط التركية', 'التركية'] },
  { code: 'BA', name: 'British Airways', nameAr: 'الخطوط الجوية البريطانية', country: 'United Kingdom', aliases: ['British Airways', 'BA', 'الخطوط البريطانية', 'البريطانية'] },
  { code: 'AF', name: 'Air France', nameAr: 'الخطوط الجوية الفرنسية', country: 'France', aliases: ['Air France', 'AF', 'طيران فرنسا', 'الفرنسية'] },
  { code: 'LH', name: 'Lufthansa', nameAr: 'لوفتهانزا', country: 'Germany', aliases: ['Lufthansa', 'LH', 'لوفتهانزا'] },
  { code: 'KL', name: 'KLM', nameAr: 'الخطوط الجوية الملكية الهولندية', country: 'Netherlands', aliases: ['KLM', 'KLM Royal Dutch Airlines', 'KL', 'الخطوط الهولندية', 'كي إل إم'] },
  { code: 'IB', name: 'Iberia', nameAr: 'إيبيريا', country: 'Spain', aliases: ['Iberia', 'IB', 'إيبيريا', 'ايبيريا'] },
  { code: 'AZ', name: 'ITA Airways', nameAr: 'إيتا إيروايز', country: 'Italy', aliases: ['ITA Airways', 'ITA', 'Alitalia', 'AZ', 'إيتا إيروايز', 'طيران إيطاليا'] },
  { code: 'A3', name: 'Aegean Airlines', nameAr: 'خطوط إيجين الجوية', country: 'Greece', aliases: ['Aegean Airlines', 'Aegean', 'A3', 'إيجين للطيران', 'الخطوط اليونانية'] },
  { code: 'AA', name: 'American Airlines', nameAr: 'الخطوط الجوية الأمريكية', country: 'United States', aliases: ['American Airlines', 'AA', 'الخطوط الأمريكية', 'الأمريكية'] },
  { code: 'DL', name: 'Delta Air Lines', nameAr: 'دلتا إيرلاينز', country: 'United States', aliases: ['Delta Air Lines', 'Delta', 'DL', 'دلتا إيرلاينز', 'دلتا'] },
  { code: 'UA', name: 'United Airlines', nameAr: 'يونايتد إيرلاينز', country: 'United States', aliases: ['United Airlines', 'United', 'UA', 'يونايتد إيرلاينز', 'يونايتد'] },
  { code: 'AC', name: 'Air Canada', nameAr: 'طيران كندا', country: 'Canada', aliases: ['Air Canada', 'AC', 'طيران كندا', 'الخطوط الكندية'] },
  { code: 'CA', name: 'Air China', nameAr: 'طيران الصين', country: 'China', aliases: ['Air China', 'CA', 'طيران الصين', 'الخطوط الصينية'] },
  { code: 'MU', name: 'China Eastern', nameAr: 'الخطوط الجوية الشرقية الصينية', country: 'China', aliases: ['China Eastern', 'China Eastern Airlines', 'MU', 'شرق الصين للطيران'] },
  { code: 'CZ', name: 'China Southern', nameAr: 'الخطوط الجوية الجنوبية الصينية', country: 'China', aliases: ['China Southern', 'China Southern Airlines', 'CZ', 'جنوب الصين للطيران'] },
  { code: 'SQ', name: 'Singapore Airlines', nameAr: 'الخطوط الجوية السنغافورية', country: 'Singapore', aliases: ['Singapore Airlines', 'Singapore Air', 'SQ', 'الخطوط السنغافورية', 'السنغافورية'] }
];

const AIRLINE_BY_CODE = new Map(AIRLINES.map(a => [a.code.toUpperCase(), a]));

export function findAirline(query) {
  if (!query || typeof query !== 'string') return undefined;
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  const byCode = AIRLINE_BY_CODE.get(q.toUpperCase());
  if (byCode) return byCode;

  const exact = AIRLINES.find(a =>
    a.name.toLowerCase() === q ||
    a.nameAr.toLowerCase() === q ||
    a.code.toLowerCase() === q
  );
  if (exact) return exact;

  const aliasMatch = AIRLINES.find(a =>
    a.aliases?.some(alias => alias.toLowerCase() === q || alias.toLowerCase().includes(q) || q.includes(alias.toLowerCase()))
  );
  if (aliasMatch) return aliasMatch;

  return AIRLINES.find(a =>
    a.name.toLowerCase().includes(q) ||
    a.nameAr.toLowerCase().includes(q) ||
    q.includes(a.name.toLowerCase()) ||
    q.includes(a.nameAr.toLowerCase())
  );
}

export function getAirlineByCode(code) {
  if (!code || typeof code !== 'string') return undefined;
  return AIRLINE_BY_CODE.get(code.trim().toUpperCase());
}
