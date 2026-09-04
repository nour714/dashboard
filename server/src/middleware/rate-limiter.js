/**
 * AfricaTravel - Rate Limiting Middleware
 *
 * Implements strict rate limiting for authentication and general API abuse prevention.
 *
 * Uses @upstash/ratelimit with @upstash/redis when Upstash credentials are configured.
 * This ensures rate budgets are accurately shared across serverless instances in production.
 * Local development and Redis failure scenarios gracefully fall back to an in-memory sliding store
 * so the server never returns 500 or crashes when Redis is unavailable.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { env } from '../config/env.js';

let upstashRedis = null;

try {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    upstashRedis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN
    });
    console.log('✅ [RateLimiter] Shared Redis rate limiting ENABLED (Upstash) — budgets synced across serverless instances.');
  } else {
    console.warn('⚠️  [RateLimiter] Redis NOT configured — using in-memory rate limiting fallback. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable shared limiting across serverless instances.');
  }
} catch (err) {
  console.error('🔥 [RateLimiter] Failed to initialize Upstash Redis client, falling back to in-memory store:', err.message);
  upstashRedis = null;
}

// In-memory fallback map for local development or Redis downtime
export const memoryFallbackMap = new Map();

// Periodic cleanup of expired memory entries to prevent unbounded growth in long-running processes
if (typeof setInterval !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryFallbackMap.entries()) {
      if (now > entry.resetAt) {
        memoryFallbackMap.delete(key);
      }
    }
  }, 60000);
  if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }
}

/**
 * Creates an Express rate limiting middleware instance.
 *
 * @param {Object} options
 * @param {string} options.name - Name prefix for this limiter bucket (e.g., 'auth', 'api')
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests allowed per window
 * @param {string} [options.message] - Custom error message on rate limit exceeded
 * @returns {import('express').RequestHandler}
 */
export function createLimiter(optionsOrName, windowMsArg, maxArg, messageArg) {
  let name, windowMs, max, message;

  if (typeof optionsOrName === 'object' && optionsOrName !== null) {
    name = optionsOrName.name;
    windowMs = optionsOrName.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
    max = optionsOrName.max ?? env.RATE_LIMIT_MAX_API;
    message = optionsOrName.message;
  } else {
    name = optionsOrName;
    windowMs = windowMsArg ?? env.RATE_LIMIT_WINDOW_MS;
    max = maxArg ?? env.RATE_LIMIT_MAX_API;
    message = messageArg;
  }

  const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));
  let upstashLimiter = null;

  if (upstashRedis) {
    try {
      upstashLimiter = new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
        prefix: `africatravel:rate-limit:${name}`
      });
    } catch (err) {
      console.error(`🔥 [RateLimiter:${name}] Failed to instantiate Ratelimit, falling back to in-memory:`, err.message);
      upstashLimiter = null;
    }
  }

  const defaultMessage = message || 'Too many requests, please try again later.';

  return async function rateLimitMiddleware(req, res, next) {
    const identifier = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    // 1. Upstash Redis Rate Limiting (Serverless Distributed)
    if (upstashLimiter) {
      try {
        const { success, limit, remaining, reset } = await upstashLimiter.limit(identifier);
        res.setHeader('RateLimit-Limit', limit);
        res.setHeader('RateLimit-Remaining', remaining);
        res.setHeader('RateLimit-Reset', reset);

        if (!success) {
          const retryAfter = Math.ceil((reset - Date.now()) / 1000);
          res.setHeader('Retry-After', retryAfter > 0 ? retryAfter : 1);
          return res.status(429).json({
            success: false,
            error: {
              message: defaultMessage,
              code: 'RATE_LIMIT_EXCEEDED'
            }
          });
        }
        return next();
      } catch (err) {
        // Fail-open strategy on transient Redis errors so legitimate requests are not blocked
        console.error(`⚠️  [RateLimiter:${name}] Upstash request failed (${err.message}), falling back to in-memory check.`);
      }
    }

    // 2. In-Memory Fallback Rate Limiting (Local development or Redis fail-open)
    const now = Date.now();
    const key = `${name}:${identifier}`;
    let entry = memoryFallbackMap.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count += 1;
    memoryFallbackMap.set(key, entry);

    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', entry.resetAt);

    if (entry.count > max) {
      res.setHeader('Retry-After', resetSeconds > 0 ? resetSeconds : 1);
      return res.status(429).json({
        success: false,
        error: {
          message: defaultMessage,
          code: 'RATE_LIMIT_EXCEEDED'
        }
      });
    }

    return next();
  };
}

export const authRateLimiter = createLimiter({
  name: 'auth',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AUTH,
  message: 'Too many authentication attempts. Please try again later.'
});

export const apiRateLimiter = createLimiter({
  name: 'api',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_API,
  message: 'API rate limit exceeded. Please slow down.'
});

export const uploadRateLimiter = createLimiter({
  name: 'upload',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AUTH,
  message: 'Too many file uploads. Please try again later.'
});

export const refreshRateLimiter = createLimiter({
  name: 'refresh',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REFRESH,
  message: 'Too many token refresh attempts. Please try again later.'
});
