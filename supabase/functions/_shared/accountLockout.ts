import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const LOCKOUT_THRESHOLD = 5;          // Lock after 5 failed attempts
const LOCKOUT_DURATION_MINUTES = 15;  // Lock for 15 minutes
const LOCKOUT_RESET_HOURS = 24;       // Reset counter after 24 hours of no attempts

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  remainingAttempts: number;
}

// In-memory fallback ONLY when database connection is down
const inMemoryFallbackStore = new Map<
  string,
  { failedCount: number; lockedUntil: number | null; lastFailedAt: number }
>();

/**
 * AUTH-04 FIX: Database is the single source of truth across all Edge Function instances.
 * In-memory store is strictly a temporary fallback if the database cannot be reached.
 */
export async function checkAccountLockout(
  supabase: SupabaseClient,
  email: string
): Promise<LockoutStatus> {
  const normEmail = email.toLowerCase().trim();
  const now = new Date();

  // 1. Primary: Database check
  try {
    const { data: user, error } = await supabase
      .from('user_accounts')
      .select('failed_login_count, locked_until, last_failed_login_at')
      .eq('email', normEmail)
      .maybeSingle();

    if (!error && user) {
      const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
      const isLocked = lockedUntil !== null && lockedUntil > now;

      let failedAttempts = user.failed_login_count || 0;
      const lastFailedLogin = user.last_failed_login_at
        ? new Date(user.last_failed_login_at)
        : null;

      if (lastFailedLogin) {
        const hoursSince = (now.getTime() - lastFailedLogin.getTime()) / (1000 * 60 * 60);
        if (hoursSince > LOCKOUT_RESET_HOURS) {
          failedAttempts = 0;
        }
      }

      return {
        isLocked,
        lockedUntil,
        failedAttempts,
        remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - failedAttempts),
      };
    }
  } catch (err) {
    console.warn('[AUTH-04] DB lockout check unavailable, using fallback:', err);
  }

  // 2. Secondary fallback
  const memRecord = inMemoryFallbackStore.get(normEmail);
  if (memRecord) {
    const isLocked = memRecord.lockedUntil !== null && memRecord.lockedUntil > now.getTime();
    return {
      isLocked,
      lockedUntil: memRecord.lockedUntil ? new Date(memRecord.lockedUntil) : null,
      failedAttempts: memRecord.failedCount,
      remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - memRecord.failedCount),
    };
  }

  return {
    isLocked: false,
    lockedUntil: null,
    failedAttempts: 0,
    remainingAttempts: LOCKOUT_THRESHOLD,
  };
}

/**
 * AUTH-04 FIX: Record failed login directly to database as primary store.
 */
export async function recordFailedLogin(
  supabase: SupabaseClient,
  email: string
): Promise<LockoutStatus> {
  const normEmail = email.toLowerCase().trim();
  const now = new Date();

  // 1. Primary: Update in database
  try {
    const { data: user } = await supabase
      .from('user_accounts')
      .select('id, failed_login_count, last_failed_login_at')
      .eq('email', normEmail)
      .maybeSingle();

    if (user) {
      let failedCount = (user.failed_login_count || 0);
      const lastFailed = user.last_failed_login_at ? new Date(user.last_failed_login_at) : null;

      if (lastFailed && (now.getTime() - lastFailed.getTime()) > (LOCKOUT_RESET_HOURS * 3600 * 1000)) {
        failedCount = 1;
      } else {
        failedCount += 1;
      }

      const shouldLock = failedCount >= LOCKOUT_THRESHOLD;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

      await supabase
        .from('user_accounts')
        .update({
          failed_login_count: failedCount,
          locked_until: lockedUntil ? lockedUntil.toISOString() : null,
          last_failed_login_at: now.toISOString(),
        })
        .eq('id', user.id);

      return {
        isLocked: shouldLock,
        lockedUntil,
        failedAttempts: failedCount,
        remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - failedCount),
      };
    }
  } catch (err) {
    console.warn('[AUTH-04] Failed to record login in DB, using fallback:', err);
  }

  // 2. Fallback memory tracking if DB is down
  let mem = inMemoryFallbackStore.get(normEmail) || {
    failedCount: 0,
    lockedUntil: null,
    lastFailedAt: now.getTime(),
  };

  const hoursSince = (now.getTime() - mem.lastFailedAt) / (1000 * 60 * 60);
  if (hoursSince > LOCKOUT_RESET_HOURS) {
    mem.failedCount = 1;
  } else {
    mem.failedCount += 1;
  }
  mem.lastFailedAt = now.getTime();

  const shouldLock = mem.failedCount >= LOCKOUT_THRESHOLD;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : null;

  mem.lockedUntil = lockedUntil ? lockedUntil.getTime() : null;
  inMemoryFallbackStore.set(normEmail, mem);

  return {
    isLocked: shouldLock,
    lockedUntil,
    failedAttempts: mem.failedCount,
    remainingAttempts: Math.max(0, LOCKOUT_THRESHOLD - mem.failedCount),
  };
}

/**
 * Reset lockout and failed login counter on successful login
 */
export async function resetLockout(
  supabase: SupabaseClient,
  userIdOrEmail: string
): Promise<void> {
  const norm = userIdOrEmail.toLowerCase().trim();
  inMemoryFallbackStore.delete(norm);

  try {
    await supabase
      .from('user_accounts')
      .update({
        failed_login_count: 0,
        locked_until: null,
        last_failed_login_at: null,
      })
      .or(`id.eq.${userIdOrEmail},email.eq.${norm}`);
  } catch (err) {
    console.warn('[AUTH-04] DB reset lockout warning:', err);
  }
}

/**
 * Admin function: Manually unlock an account
 */
export async function unlockAccount(
  supabase: SupabaseClient,
  userIdOrEmail: string
): Promise<void> {
  const norm = userIdOrEmail.toLowerCase().trim();
  inMemoryFallbackStore.delete(norm);

  try {
    await supabase
      .from('user_accounts')
      .update({
        failed_login_count: 0,
        locked_until: null,
      })
      .or(`id.eq.${userIdOrEmail},email.eq.${norm}`);
  } catch (err) {
    console.warn('[AUTH-04] DB unlock account warning:', err);
  }
}
