/**
 * AfricaTravel - Backend Environment Configuration & Validation
 */

import dotenv from 'dotenv';
import crypto from 'crypto';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/africatravel?schema=public'),
  JWT_SECRET: z.string().default('africatravel_super_secret_jwt_access_key_2026_dev_key'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('africatravel_super_secret_jwt_refresh_key_2026_dev_key'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://127.0.0.1:3000,https://africiatravel.vercel.app'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_AUTH: z.coerce.number().default(10),
  RATE_LIMIT_MAX_API: z.coerce.number().default(500),
  DEFAULT_ADMIN_PASSWORD: z.string().default('password123'),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('customer-documents')
});

function resolveDatabaseUrl() {
  let url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

  // If URL contains [YOUR-PASSWORD] placeholder, replace it from env
  if (url && url.includes('[YOUR-PASSWORD]') && process.env.POSTGRES_PASSWORD) {
    url = url.replace('[YOUR-PASSWORD]', encodeURIComponent(process.env.POSTGRES_PASSWORD));
  }

  // In cloud environments, a real DATABASE_URL must be configured
  if ((!url || url.includes('localhost') || url.includes('127.0.0.1') || url.includes('[YOUR-PASSWORD]')) && (process.env.VERCEL || process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
    throw new Error(
      'DATABASE_URL is not configured. Set it in your deployment environment variables.'
    );
  }

  return url || 'postgresql://postgres:postgres@localhost:5432/africatravel?schema=public';
}

process.env.DATABASE_URL = resolveDatabaseUrl();

const parsedEnv = envSchema.safeParse(process.env);
let envData;

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:', parsedEnv.error.format());
  if (process.env.VERCEL || process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Only fall back to defaults for the SPECIFIC keys that failed validation.
    // Falling back to envSchema.parse({}) here would silently discard every
    // other correctly-configured variable (e.g. a valid DATABASE_URL) just
    // because one unrelated key (e.g. NODE_ENV) was malformed.
    const invalidKeys = new Set(Object.keys(parsedEnv.error.flatten().fieldErrors));
    const sanitizedEnv = { ...process.env };
    for (const key of invalidKeys) {
      delete sanitizedEnv[key];
      console.warn(`⚠️ Ignoring invalid value for ${key}; falling back to its default.`);
    }
    envData = envSchema.parse(sanitizedEnv);
  } else {
    process.exit(1);
  }
} else {
  envData = parsedEnv.data;
}

// Prevent production startup with well-known insecure default secrets
const INSECURE_DEFAULTS = [
  'africatravel_super_secret_jwt_access_key_2026_dev_key',
  'africatravel_super_secret_jwt_refresh_key_2026_dev_key',
  'africatravel_production_super_secret_jwt_key_2026',
  'africatravel_production_super_secret_refresh_key_2026'
];

if (
  envData.NODE_ENV === 'production' &&
  (INSECURE_DEFAULTS.includes(envData.JWT_SECRET) || INSECURE_DEFAULTS.includes(envData.JWT_REFRESH_SECRET))
) {
  if (process.env.VERCEL || process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.warn('⚠️ WARNING: JWT_SECRET/JWT_REFRESH_SECRET were using insecure defaults. Auto-generating secure random keys.');
    if (INSECURE_DEFAULTS.includes(envData.JWT_SECRET)) {
      envData.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    }
    if (INSECURE_DEFAULTS.includes(envData.JWT_REFRESH_SECRET)) {
      envData.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
    }
  } else {
    console.error('❌ FATAL: JWT_SECRET/JWT_REFRESH_SECRET are using insecure default values in production. Set real secrets in your .env file.');
    process.exit(1);
  }
}

if (envData.NODE_ENV === 'production' && (!envData.DEFAULT_ADMIN_PASSWORD || envData.DEFAULT_ADMIN_PASSWORD === 'password123')) {
  console.error('❌ FATAL: DEFAULT_ADMIN_PASSWORD is using insecure default "password123" in production. Set a strong password in your .env file.');
  if (typeof process.exit === 'function' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.exit(1);
  }
  throw new Error('FATAL: DEFAULT_ADMIN_PASSWORD is using insecure default "password123" in production.');
}

if (
  envData.NODE_ENV === 'production' &&
  (!envData.SUPABASE_URL || !envData.SUPABASE_SERVICE_ROLE_KEY)
) {
  if (process.env.VERCEL || process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.error('❌ FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in production deployment environment variables.');
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured. Set them in your deployment environment variables.');
  }
}

export const env = envData;
