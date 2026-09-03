import Decimal from 'decimal.js';

/** Convert Prisma Decimal, strings, and numbers without binary floating-point math. */
export function asDecimal(value = 0) {
  try {
    return new Decimal(value ?? 0);
  } catch {
    return new Decimal(0);
  }
}

/** Serialize an already-calculated money value for API display. */
export function toMoney(value = 0) {
  return asDecimal(value).toDecimalPlaces(2).toFixed(2);
}

/** Compatibility boundary for existing numeric API consumers. Never use for aggregation. */
export function moneyNumber(value = 0) {
  return asDecimal(value).toDecimalPlaces(2).toNumber();
}
