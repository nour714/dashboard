// Curated, real IATA airport codes used to validate AI suggestions. The list
// intentionally favours the agency's common routes and can be extended safely.
export const VALID_IATA_AIRPORT_CODES = new Set([
  'ABV', 'ADD', 'ADJ', 'ALG', 'AMM', 'AMS', 'ARN', 'ATH', 'AUH', 'BAH',
  'BCN', 'BEY', 'BKK', 'BOM', 'BRU', 'BSL', 'BUD', 'CAI', 'CAN', 'CDG',
  'CMN', 'CPT', 'DAR', 'DEL', 'DEN', 'DFW', 'DMM', 'DOH', 'DSS', 'DUB',
  'DXB', 'EBB', 'EDI', 'FCO', 'FRA', 'GIG', 'GVA', 'HAM', 'HBE', 'HEL',
  'HKG', 'HND', 'IAD', 'IAH', 'IST', 'JED', 'JFK', 'JNB', 'KGL', 'KHI',
  'KUL', 'KWI', 'LAX', 'LCA', 'LED', 'LHE', 'LHR', 'LIS', 'LOS', 'LUX',
  'MAD', 'MAN', 'MCT', 'MEL', 'MIA', 'MIL', 'MNL', 'MOW', 'MRS', 'MSQ',
  'MUC', 'MXP', 'NBO', 'NRT', 'NUE', 'ORD', 'OSL', 'OTP', 'PAR', 'PEK',
  'PER', 'PHL', 'PRG', 'PTY', 'RUH', 'SAW', 'SFO', 'SIN', 'SKG', 'SOF',
  'SSH', 'STN', 'SYD', 'THR', 'TIA', 'TLV', 'TUN', 'VIE', 'WAW', 'YYZ',
  'ZRH'
]);

export function normalizeValidatedAirportCode(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().toUpperCase().match(/\b([A-Z]{3})\b/);
  return match && VALID_IATA_AIRPORT_CODES.has(match[1]) ? match[1] : null;
}
