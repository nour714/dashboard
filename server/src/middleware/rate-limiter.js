/**
 * AfricaTravel - Rate Limiting Middleware
 *
 * Implements strict rate limiting for authentication and general API abuse prevention.
 *
 * Uses Upstash Redis when its Vercel integration variables are configured. This makes
 * rate budgets shared across serverless instances; local development keeps a memory
 * fallback so it does not need a Redis service.
 */

import rateLimit from 'express-rate-limit';
import { Redis } from '@upstash/redis';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env.js';

const upstashRedis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
  : null;

const redisStore = upstashRedis
  ? new RedisStore({
      prefix: 'africatravel:rate-limit:',
      sendCommand: (...args) => upstashRedis.sendCommand(args)
    })
  : undefined;

if (redisStore) {
  console.log('✅ [RateLimiter] Shared Redis rate limiting ENABLED (Upstash) — budgets synced across serverless instances.');
} else {
  console.warn('⚠️  [RateLimiter] Redis NOT configured — falling back to in-memory rate limiting. This is NOT reliable across multiple serverless instances in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable shared limiting.');
}

function sharedRateLimit(options) {
  return rateLimit({ ...options, ...(redisStore ? { store: redisStore } : {}) });
}

export const authRateLimiter = sharedRateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT_MAX_AUTH, // default 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

export const apiRateLimiter = sharedRateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_API, // default 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'API rate limit exceeded. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

export const uploadRateLimiter = sharedRateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT_MAX_AUTH, // default 10 — same strict limit as auth routes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many file uploads. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

export const refreshRateLimiter = sharedRateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT_MAX_REFRESH, // default 30 refresh attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many token refresh attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});
