/**
 * AfricaTravel - Common Validation Schemas & Helpers
 *
 * Implements strict, reusable financial and boolean parsers conforming to audit standards.
 */

import { z } from 'zod';

/**
 * Creates a strict boolean validator where:
 * - true, "true", 1, "1" => true
 * - false, "false", 0, "0" => false
 * - Everything else rejected
 *
 * Prevents JavaScript's native Boolean("false") === true coercion bug.
 */
export function strictBoolean() {
  return z.preprocess((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    if (val === 1) return true;
    if (val === 0) return false;
    return val;
  }, z.boolean({ invalid_type_error: 'Must be a valid boolean' }));
}

/**
 * Shared money validator:
 * - Range: min (default 0) to max 9,999,999,999.99
 * - Precision: maximum 2 decimal places
 * - Supports positive-only amounts (amount > 0)
 *
 * @param {object} [options]
 * @param {boolean} [options.positive=false] - Whether amount must be strictly > 0
 * @param {number} [options.min=0] - Minimum allowed value if not strictly positive
 * @param {number} [options.max=9999999999.99] - Maximum allowed value
 */
export function money({ positive = false, min = 0, max = 9999999999.99 } = {}) {
  return z.preprocess((raw) => (raw === '' ? undefined : raw),
    z.union([z.number(), z.string(), z.undefined()], { invalid_type_error: 'Amount must be a numeric value' })
      .refine((raw) => {
        if (raw === undefined) return true;
        const s = String(raw).trim();
        if (!/^-?\d+(\.\d+)?$/.test(s)) return false;
        const parts = s.split('.');
        return !(parts.length === 2 && parts[1].length > 2);
      }, { message: 'Amount must be a valid number with at most 2 decimal places' })
      .transform(v => (v !== undefined ? Number(v) : undefined))
      .pipe(
        (positive
          ? z.number().positive('Amount must be greater than zero').max(max, `Amount cannot exceed ${max}`)
          : z.number().min(min, `Amount cannot be less than ${min}`).max(max, `Amount cannot exceed ${max}`)
        ).optional()
      )
  );
}
