// Curated, real IATA airport codes used to validate AI suggestions. The list
// intentionally favours the agency's common routes and can be extended safely.
export const VALID_IATA_AIRPORT_CODES = new Set([
  'ABJ', 'ABV', 'ACC', 'ADD', 'ADJ', 'ALG', 'AMM', 'AMS', 'ARN', 'ASM',
  'ATH', 'AUH', 'BAH', 'BCN', 'BEY', 'BGF', 'BJM', 'BKK', 'BKO', 'BOM',
  'BRU', 'BSL', 'BUD', 'CAI', 'CAN', 'CDG', 'CKY', 'CMN', 'COO', 'CPT',
  'DAR', 'DEL', 'DEN', 'DFW', 'DLA', 'DMM', 'DOH', 'DSS', 'DUB', 'DXB',
  'EBB', 'EDI', 'FCO', 'FIH', 'FNA', 'FRA', 'GBE', 'GIG', 'GVA', 'HAM',
  'HBE', 'HEL', 'HKG', 'HND', 'HRE', 'IAD', 'IAH', 'IST', 'JED', 'JFK',
  'JIB', 'JNB', 'JRO', 'JUB', 'KAN', 'KGL', 'KHI', 'KRT', 'KUL', 'KWI',
  'LAX', 'LBV', 'LCA', 'LED', 'LFW', 'LHE', 'LHR', 'LIS', 'LOS', 'LUN',
  'LUX', 'MAD', 'MAN', 'MBA', 'MCT', 'MEL', 'MGQ', 'MIA', 'MIL', 'MNL',
  'MOW', 'MPM', 'MRS', 'MSQ', 'MUC', 'MXP', 'NBO', 'NDJ', 'NKC', 'NRT',
  'NSI', 'NUE', 'ORD', 'OSL', 'OTP', 'OUA', 'PAR', 'PEK', 'PER', 'PHC',
  'PHL', 'PRG', 'PTY', 'ROB', 'RUH', 'SAW', 'SEZ', 'SFO', 'SIN', 'SKG',
  'SOF', 'SSH', 'STN', 'SYD', 'THR', 'TIA', 'TIP', 'TLV', 'TNR', 'TUN',
  'VIE', 'WAW', 'WDH', 'YYZ', 'ZNZ', 'ZRH'
]);

export function normalizeValidatedAirportCode(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().toUpperCase().match(/\b([A-Z]{3})\b/);
  return match && VALID_IATA_AIRPORT_CODES.has(match[1]) ? match[1] : null;
}
