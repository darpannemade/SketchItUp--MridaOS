/**
 * MridaOS Rate Limiter — Supabase Table-Based (replaces broken redis.ts dependency)
 *
 * SEC-03 FIX: The original rateLimit.ts imported from './redis.ts' which does not exist,
 * causing the module to throw on load and the catch block to always return { allowed: true }.
 * This implementation uses the Supabase `rate_limit_counters` table for persistent,
 * cross-instance sliding window rate limiting.
 *
 * Required table (add to supabase_schema.sql):
 *   CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
 *     key TEXT PRIMARY KEY,
 *     count INTEGER DEFAULT 1 NOT NULL,
 *     window_start TIMESTAMPTZ DEFAULT now() NOT NULL,
 *     window_seconds INTEGER NOT NULL
 *   );
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

export interface RateLimitConfig {
  window: number; // Time window in seconds
  max: number;    // Max requests allowed in that window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in milliseconds
  current: number;
}

// Predefined rate limit rules for different operations
export const RATE_LIMITS = {
  // Authentication endpoints
  login_ip: { window: 60, max: 5 },                 // 5 login attempts per minute per IP
  login_email: { window: 900, max: 10 },             // 10 login attempts per 15 min per email
  refresh_token: { window: 60, max: 20 },            // 20 token refreshes per minute per user
  password_reset_request: { window: 3600, max: 3 },  // 3 reset requests per hour per email
  password_change: { window: 3600, max: 5 },         // 5 password changes per hour per user

  // API endpoints (per authenticated user)
  api_read: { window: 60, max: 100 },
  api_write: { window: 60, max: 30 },
  api_delete: { window: 60, max: 10 },

  // Global fallback
  global_ip: { window: 60, max: 200 },

  // Admin operations
  admin_user_create: { window: 300, max: 10 },
  admin_user_delete: { window: 3600, max: 5 },
} as const;

/**
 * Check and increment rate limit counter using Supabase upsert.
 * Uses a fixed window: counter resets when window_start is older than window_seconds.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.window * 1000);

    // Fetch existing counter
    const { data: existing } = await supabase
      .from('rate_limit_counters')
      .select('count, window_start')
      .eq('key', key)
      .maybeSingle();

    let current = 1;
    let resetAt: number;

    if (!existing || new Date(existing.window_start) < windowStart) {
      // Window expired or no record — start fresh
      await supabase.from('rate_limit_counters').upsert({
        key,
        count: 1,
        window_start: now.toISOString(),
        window_seconds: config.window,
      }, { onConflict: 'key' });
      resetAt = now.getTime() + config.window * 1000;
    } else {
      // Within window — increment
      current = (existing.count || 0) + 1;
      await supabase
        .from('rate_limit_counters')
        .update({ count: current })
        .eq('key', key);
      resetAt = new Date(existing.window_start).getTime() + config.window * 1000;
    }

    return {
      allowed: current <= config.max,
      remaining: Math.max(0, config.max - current),
      resetAt,
      current,
    };
  } catch (error) {
    // Fail open with logging — never block users due to rate limiter infrastructure issues
    console.error('[RateLimit] checkRateLimit failed:', error);
    return {
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + config.window * 1000,
      current: 0,
    };
  }
}

/**
 * Reset a rate limit counter (e.g., after successful login)
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('rate_limit_counters').delete().eq('key', key);
  } catch (error) {
    console.error('[RateLimit] resetRateLimit failed:', error);
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('rate_limit_counters')
      .select('count, window_start')
      .eq('key', key)
      .maybeSingle();

    if (!existing) {
      return { allowed: true, remaining: config.max, resetAt: Date.now() + config.window * 1000, current: 0 };
    }

    const windowStart = new Date(existing.window_start);
    const resetAt = windowStart.getTime() + config.window * 1000;
    const isExpired = Date.now() > resetAt;
    const current = isExpired ? 0 : (existing.count || 0);

    return {
      allowed: current < config.max,
      remaining: Math.max(0, config.max - current),
      resetAt,
      current,
    };
  } catch (error) {
    console.error('[RateLimit] getRateLimitStatus failed:', error);
    return { allowed: true, remaining: 999, resetAt: Date.now() + config.window * 1000, current: 0 };
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  config: RateLimitConfig
): void {
  headers.set('X-RateLimit-Limit', config.max.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.floor(result.resetAt / 1000).toString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Create HTTP 429 rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return new Response(
    JSON.stringify({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retry_after: retryAfter,
        reset_at: new Date(result.resetAt).toISOString(),
      },
      data: null,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}
