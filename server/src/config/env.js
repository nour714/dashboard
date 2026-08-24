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
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
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

// Insecure defaults check
const INSECURE_DEFAULTS = [
  'africatravel_super_secret_jwt_access_key_2026_dev_key',
  'africatravel_super_secret_jwt_refresh_key_2026_dev_key',
  'africatravel_production_super_secret_jwt_key_2026',
  'africatravel_production_super_secret_refresh_key_2026',
  'secret',
  'jwt_secret',
  'change_me',
  'default_secret'
];

function isWeakSecret(secret) {
  if (!secret || typeof secret !== 'string') return true;
  if (secret.length < 32) return true;
  if (INSECURE_DEFAULTS.includes(secret)) return true;
  if (/^(\w)\1+$/.test(secret)) return true;
  return false;
}

const configErrors = [];
const isProduction = envData.NODE_ENV === 'production';
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (isProduction) {
  if (isWeakSecret(envData.JWT_SECRET)) {
    configErrors.push('[JWT_SECRET]: Missing or using an insecure/short default secret (minimum 32 characters required).');
  }
  if (isWeakSecret(envData.JWT_REFRESH_SECRET)) {
    configErrors.push('[JWT_REFRESH_SECRET]: Missing or using an insecure/short default secret (minimum 32 characters required).');
  }

  const effectiveAdminPassword = envData.BOOTSTRAP_ADMIN_PASSWORD || envData.DEFAULT_ADMIN_PASSWORD;
  if (!effectiveAdminPassword || effectiveAdminPassword === 'password123') {
    configErrors.push('[BOOTSTRAP_ADMIN_PASSWORD / DEFAULT_ADMIN_PASSWORD]: Missing or using insecure default "password123". Set a strong password in environment variables.');
  }

  const rawDbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!rawDbUrl || rawDbUrl.includes('localhost') || rawDbUrl.includes('127.0.0.1') || rawDbUrl.includes('[YOUR-PASSWORD]')) {
    configErrors.push('[DATABASE_URL]: Missing or pointing to a placeholder / localhost address in production. Set a valid PostgreSQL connection string.');
  }
}

if (configErrors.length > 0) {
  console.error('\n❌ ================= ENVIRONMENT CONFIGURATION ERROR =================');
  console.error('The server cannot start safely because required production environment variables are missing or insecure.');
  console.error('Variables needing attention:');
  configErrors.forEach(err => console.error(`  • ${err}`));
  console.error('Please configure these environment variables in your deployment settings (e.g. Vercel Dashboard -> Project Settings -> Environment Variables).');
  console.error('=======================================================================\n');

  if (!isServerless && typeof process.exit === 'function') {
    process.exit(1);
  }
}

export const env = envData;
export { configErrors };
