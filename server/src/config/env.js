/**
 * AfricaTravel - Backend Environment Configuration & Validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000').transform(val => parseInt(val, 10)),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/africatravel?schema=public'),
  JWT_SECRET: z.string().default('africatravel_super_secret_jwt_access_key_2026_dev_key'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('africatravel_super_secret_jwt_refresh_key_2026_dev_key'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(val => parseInt(val, 10)),
  RATE_LIMIT_MAX_AUTH: z.string().default('10').transform(val => parseInt(val, 10)),
  RATE_LIMIT_MAX_API: z.string().default('500').transform(val => parseInt(val, 10)),
  DEFAULT_ADMIN_PASSWORD: z.string().default('password123')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:', parsedEnv.error.format());
  process.exit(1);
}

// Prevent production startup with well-known insecure default secrets
const INSECURE_DEFAULTS = [
  'africatravel_super_secret_jwt_access_key_2026_dev_key',
  'africatravel_super_secret_jwt_refresh_key_2026_dev_key',
  'africatravel_production_super_secret_jwt_key_2026',
  'africatravel_production_super_secret_refresh_key_2026'
];

if (
  parsedEnv.data.NODE_ENV === 'production' &&
  (INSECURE_DEFAULTS.includes(parsedEnv.data.JWT_SECRET) || INSECURE_DEFAULTS.includes(parsedEnv.data.JWT_REFRESH_SECRET))
) {
  console.error('❌ FATAL: JWT_SECRET/JWT_REFRESH_SECRET are using insecure default values in production. Set real secrets in your .env file.');
  process.exit(1);
}

export const env = parsedEnv.data;
