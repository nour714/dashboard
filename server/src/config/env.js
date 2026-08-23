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
  DEFAULT_ADMIN_PASSWORD: z.string().default('password123')
});

// Construct DATABASE_URL from individual Vercel/Supabase integration variables if available
if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
  const db = process.env.POSTGRES_DATABASE || 'postgres';
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:5432/${db}?sslmode=require`;
} else {
  // Prioritize remote Supabase integration URLs over local defaults
  const candidateUrls = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.SUPABASE_DATABASE_URL
  ].filter(Boolean);

  const remoteDbUrl = candidateUrls.find(u => !u.includes('localhost') && !u.includes('127.0.0.1'));
  if (remoteDbUrl) {
    process.env.DATABASE_URL = remoteDbUrl;
  } else if (candidateUrls.length > 0) {
    process.env.DATABASE_URL = candidateUrls[0];
  }
}

const parsedEnv = envSchema.safeParse(process.env);
let envData;

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:', parsedEnv.error.format());
  if (process.env.VERCEL || process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    envData = envSchema.parse({});
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

export const env = envData;
