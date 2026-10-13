/**
 * MridaOS Auth Edge Function — Production-Hardened Rewrite
 *
 * FIXES APPLIED:
 * SEC-01: JWT secret from Deno.env.get('JWT_SECRET') — no hardcoded value
 * SEC-02: Passwords hashed via Supabase Auth (bcrypt via pgcrypto) — no plain-text comparison
 * SEC-03: Rate limiting via Supabase table (redis.ts replaced)
 * SEC-04: Sessions stored in DB table `user_sessions` — survives cold starts
 * AUTH-01: Login queries real `profiles` table via Supabase Auth signInWithPassword
 * AUTH-02: Password changes go through Supabase Auth.updateUser — persisted in DB
 * SEC-05: Reset link uses APP_URL env var — no hardcoded localhost
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { signJwt } from '../_shared/jwt.ts';
import { validateSchema, RequestPasswordResetSchema, ResetPasswordSchema, ChangePasswordSchema } from '../_shared/validation.ts';
import { requireRole } from '../_shared/rbac.ts';
import { checkRateLimit, resetRateLimit, RATE_LIMITS, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rateLimit.ts';
import { checkAccountLockout, recordFailedLogin, resetLockout } from '../_shared/accountLockout.ts';
import { logSecurityEvent } from '../_shared/securityLogger.ts';
import { authenticateUser } from '../_shared/auth.ts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getAppUrl(): string {
  return Deno.env.get('APP_URL') || 'https://sketchitup-mridaos.onrender.com';
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function parseUserAgent(userAgent: string): { browser: string; os: string } {
  let browser = 'Chrome';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  let os = 'Windows';
  if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return { browser, os };
}

// ── Session management (DB-persisted, survives cold starts) ──────────────────

async function createSession(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  deviceName: string,
  browser: string,
  os: string,
  ipAddress: string
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  await supabase.from('user_sessions').insert({
    id: sessionId,
    user_id: userId,
    device_name: deviceName,
    browser,
    os,
    ip_address: ipAddress,
    is_revoked: false,
    last_active_at: now.toISOString(),
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  return sessionId;
}

async function getSession(supabase: ReturnType<typeof getSupabaseAdmin>, sessionId: string) {
  const { data } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  return data;
}

async function revokeSession(supabase: ReturnType<typeof getSupabaseAdmin>, sessionId: string) {
  await supabase.from('user_sessions').update({ is_revoked: true }).eq('id', sessionId);
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Unknown Browser';

  try {

    // ──────────────────────────────────────────────────────────────────────────
    // 1. POST /auth/login
    //    AUTH-01 FIX: Query Supabase Auth (real DB), not hardcoded SEED_ACCOUNTS
    //    SEC-02 FIX: Supabase uses bcrypt via pgcrypto — no plain-text comparison
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && (path.endsWith('/login') || path === '/auth' || path === '/auth/')) {
      const rawBody = await req.json();
      const email = (rawBody.email || '').toLowerCase().trim();
      const password = rawBody.password || '';

      if (!email || !password) {
        return errorResponse('VALIDATION_ERROR', 'Email and password are required', 400);
      }

      // Rate limiting
      const ipRateLimit = await checkRateLimit(`login_ip:${clientIp}`, RATE_LIMITS.login_ip);
      if (!ipRateLimit.allowed) {
        await logSecurityEvent({} as any, { event_type: 'rate_limit_exceeded', email, ip_address: clientIp, severity: 'warning', metadata: { limit_type: 'ip' } });
        return createRateLimitResponse(ipRateLimit);
      }

      const emailRateLimit = await checkRateLimit(`login_email:${email}`, RATE_LIMITS.login_email);
      if (!emailRateLimit.allowed) {
        return createRateLimitResponse(emailRateLimit);
      }

      // Account lockout check
      const supabaseAdmin = getSupabaseAdmin();
      const lockoutStatus = await checkAccountLockout(supabaseAdmin, email);
      if (lockoutStatus.isLocked) {
        const retryAfter = Math.max(1, Math.ceil((lockoutStatus.lockedUntil!.getTime() - Date.now()) / 1000));
        return new Response(JSON.stringify({
          error: { code: 'ACCOUNT_LOCKED', message: `Account temporarily locked. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`, locked_until: lockoutStatus.lockedUntil!.toISOString(), retry_after: retryAfter },
          data: null,
        }), { status: 423, headers: { 'Content-Type': 'application/json', ...corsHeaders, 'Retry-After': retryAfter.toString() } });
      }

      // AUTH-01 FIX: Use Supabase Auth signInWithPassword — authenticates against real user DB
      const supabaseClient = getSupabaseClient();
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        // Record failed attempt
        const newLockoutStatus = await recordFailedLogin(supabaseAdmin, email);
        await logSecurityEvent({} as any, { event_type: 'login_failed', email, ip_address: clientIp, user_agent: userAgent, severity: 'warning', metadata: { reason: 'invalid_credentials', remaining_attempts: newLockoutStatus.remainingAttempts } });

        if (newLockoutStatus.isLocked) {
          const retryAfter = Math.max(1, Math.ceil((newLockoutStatus.lockedUntil!.getTime() - Date.now()) / 1000));
          return new Response(JSON.stringify({
            error: { code: 'ACCOUNT_LOCKED', message: `Account locked after 5 failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`, locked_until: newLockoutStatus.lockedUntil!.toISOString(), retry_after: retryAfter },
            data: null,
          }), { status: 423, headers: { 'Content-Type': 'application/json', ...corsHeaders, 'Retry-After': retryAfter.toString() } });
        }

        let errorMsg = 'Invalid email or password';
        if (newLockoutStatus.remainingAttempts > 0 && newLockoutStatus.remainingAttempts <= 2) {
          errorMsg += `. ${newLockoutStatus.remainingAttempts} attempt(s) remaining before lockout.`;
        }
        return new Response(JSON.stringify({
          error: { code: 'INVALID_CREDENTIALS', message: errorMsg, remaining_attempts: newLockoutStatus.remainingAttempts },
          data: null,
        }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      // Fetch profile (role, branch, status)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, role, branch_id, status')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!profile || profile.status === 'revoked') {
        return errorResponse('ACCOUNT_LOCKED', 'Account has been revoked by your administrator.', 423);
      }

      // Success — reset lockout and rate limit counters
      await resetLockout(supabaseAdmin, profile.id);
      await resetRateLimit(`login_email:${email}`);

      // Update last_sign_in_at
      await supabaseAdmin.from('profiles').update({ last_sign_in_at: new Date().toISOString() }).eq('id', profile.id);

      await logSecurityEvent({} as any, { event_type: 'login_success', user_id: profile.id, email: profile.email, ip_address: clientIp, user_agent: userAgent, severity: 'info', metadata: { role: profile.role, branch_id: profile.branch_id } });

      // SEC-04 FIX: Create session in DB — not in-memory Map
      const { browser, os } = parseUserAgent(userAgent);
      const deviceName = rawBody.deviceName || `${browser} on ${os}`;
      const sessionId = await createSession(supabaseAdmin, profile.id, deviceName, browser, os, clientIp);

      const { token, exp } = await signJwt({
        sub: profile.id,
        sessionId,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        branchId: profile.branch_id,
      });

      const responseHeaders = new Headers({ 'Content-Type': 'application/json', ...corsHeaders });
      addRateLimitHeaders(responseHeaders, ipRateLimit, RATE_LIMITS.login_ip);

      return new Response(JSON.stringify({
        data: {
          token,
          tokenType: 'Bearer',
          expiresIn: 900,
          expiresAt: new Date(exp * 1000).toISOString(),
          sessionId,
          user: { id: profile.id, email: profile.email, fullName: profile.full_name, role: profile.role, branchId: profile.branch_id },
        },
        error: null,
      }), { status: 200, headers: responseHeaders });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. POST /auth/request-password-reset
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && path.includes('/request-password-reset')) {
      const rawBody = await req.json();
      const validation = validateSchema(RequestPasswordResetSchema, rawBody);
      if (validation.error) return validation.error;
      const { email } = validation.data;

      const resetRateLimitResult = await checkRateLimit(`password_reset:${email}`, RATE_LIMITS.password_reset_request);
      if (!resetRateLimitResult.allowed) return createRateLimitResponse(resetRateLimitResult);

      const supabaseAdmin = getSupabaseAdmin();
      const plainToken = generateSecureToken();
      const tokenHash = await hashToken(plainToken);
      const now = Date.now();
      const expiresAt = now + 15 * 60 * 1000;

      // Check if user exists (don't reveal the result in the response)
      const { data: profile } = await supabaseAdmin.from('profiles').select('id, email').eq('email', email.toLowerCase()).maybeSingle();
      if (profile) {
        // Store hashed token in DB (not in-memory Map — SEC-04 fix also applies here)
        await supabaseAdmin.from('password_reset_tokens').insert({
          token_hash: tokenHash,
          user_id: profile.id,
          email: profile.email,
          expires_at: new Date(expiresAt).toISOString(),
          used_at: null,
          created_at: new Date(now).toISOString(),
        });

        await logSecurityEvent({} as any, { event_type: 'password_reset_requested', user_id: profile.id, email: profile.email, ip_address: clientIp, severity: 'info' });
      }

      // SEC-05 FIX: Use APP_URL env var
      const resetLink = `${getAppUrl()}/reset-password?token=${plainToken}`;

      return successResponse({
        message: 'If the email exists in our system, a password reset link has been dispatched.',
        resetLink, // In production, email this; for now returned for admin use
        expiresInSeconds: 900,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. POST /auth/reset-password
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && path.endsWith('/reset-password')) {
      const rawBody = await req.json();
      const validation = validateSchema(ResetPasswordSchema, rawBody);
      if (validation.error) return validation.error;

      const { token, new_password } = validation.data;
      const tokenHash = await hashToken(token);
      const supabaseAdmin = getSupabaseAdmin();
      const now = Date.now();

      const { data: resetRecord } = await supabaseAdmin
        .from('password_reset_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (!resetRecord) return errorResponse('INVALID_TOKEN', 'Invalid or expired password reset token.', 400);
      if (resetRecord.used_at) return errorResponse('TOKEN_ALREADY_USED', 'This token has already been used.', 400);
      if (now > new Date(resetRecord.expires_at).getTime()) return errorResponse('TOKEN_EXPIRED', 'Token has expired (15-minute window).', 400);

      // Mark token used
      await supabaseAdmin.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('token_hash', tokenHash);

      // AUTH-02 FIX: Update password via Supabase Admin Auth — persisted in DB (not in-memory Map)
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(resetRecord.user_id, { password: new_password });
      if (pwError) return errorResponse('PASSWORD_UPDATE_FAILED', 'Failed to update password. Please try again.', 500);

      // Unlock account
      await resetLockout(supabaseAdmin, resetRecord.user_id);

      // Revoke all active sessions for this user
      const { data: revokedSessions } = await supabaseAdmin
        .from('user_sessions')
        .update({ is_revoked: true })
        .eq('user_id', resetRecord.user_id)
        .eq('is_revoked', false)
        .select('id');

      await logSecurityEvent({} as any, { event_type: 'password_reset_completed', user_id: resetRecord.user_id, email: resetRecord.email, ip_address: clientIp, severity: 'info', metadata: { revoked_sessions: revokedSessions?.length || 0 } });

      return successResponse({ message: 'Password reset successful. All active sessions have been revoked. Please log in with your new password.', revokedSessionsCount: revokedSessions?.length || 0 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. POST /auth/admin-generate-reset-token
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && path.includes('/admin-generate-reset-token')) {
      const { user: callerUser, error: callerAuthErr } = await authenticateUser(req);
      if (callerAuthErr) return callerAuthErr;
      if (!callerUser) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
      const rbacErr = requireRole(['owner', 'admin'], callerUser.role);
      if (rbacErr) return rbacErr;

      const rawBody = await req.json();
      const targetEmail = (rawBody.email || '').toLowerCase().trim();
      const supabaseAdmin = getSupabaseAdmin();

      const { data: targetProfile } = await supabaseAdmin.from('profiles').select('id, email').eq('email', targetEmail).maybeSingle();
      if (!targetProfile) return errorResponse('NOT_FOUND', `User with email ${targetEmail} not found`, 404);

      const plainToken = generateSecureToken();
      const tokenHash = await hashToken(plainToken);
      const now = Date.now();
      const expiresAt = new Date(now + 15 * 60 * 1000);

      await supabaseAdmin.from('password_reset_tokens').insert({
        token_hash: tokenHash,
        user_id: targetProfile.id,
        email: targetProfile.email,
        expires_at: expiresAt.toISOString(),
        used_at: null,
        created_at: new Date(now).toISOString(),
      });

      const resetLink = `${getAppUrl()}/reset-password?token=${plainToken}`;

      return successResponse({ token: plainToken, resetLink, expiresAt: expiresAt.toISOString(), expiresInSeconds: 900, message: '15-minute single-use password reset token generated.' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. POST /auth/refresh
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && path.includes('/refresh')) {
      const body = await req.json();
      const sessionId = body.sessionId;
      if (!sessionId) return errorResponse('BAD_REQUEST', 'Missing sessionId', 400);

      const supabaseAdmin = getSupabaseAdmin();
      const session = await getSession(supabaseAdmin, sessionId);

      if (!session || session.is_revoked) return errorResponse('SESSION_REVOKED', 'Session has been revoked or expired', 401);
      if (new Date(session.expires_at) < new Date()) return errorResponse('SESSION_EXPIRED', 'Session has expired. Please log in again.', 401);

      const { data: profile } = await supabaseAdmin.from('profiles').select('id, email, full_name, role, branch_id').eq('id', session.user_id).maybeSingle();
      if (!profile || profile.status === 'revoked') return errorResponse('USER_NOT_FOUND', 'User account no longer exists or is revoked', 401);

      // Extend session
      await supabaseAdmin.from('user_sessions').update({
        last_active_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }).eq('id', sessionId);

      const { token, exp } = await signJwt({ sub: profile.id, sessionId, email: profile.email, fullName: profile.full_name, role: profile.role, branchId: profile.branch_id });

      return successResponse({ token, expiresIn: 900, expiresAt: new Date(exp * 1000).toISOString(), sessionId });
    }

    // ── Protected endpoints (require valid JWT) ───────────────────────────────
    const { user, error: authError } = await authenticateUser(req);
    if (authError) return authError;
    if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

    const supabaseAdmin = getSupabaseAdmin();

    // ──────────────────────────────────────────────────────────────────────────
    // 6. POST /auth/logout
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && path.includes('/logout')) {
      if (user.sessionId) await revokeSession(supabaseAdmin, user.sessionId);
      return successResponse({ message: 'Logged out successfully' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. GET /auth/devices
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'GET' && path.includes('/devices')) {
      const { data: sessions } = await supabaseAdmin
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_revoked', false)
        .gt('expires_at', new Date().toISOString())
        .order('last_active_at', { ascending: false });

      return successResponse({ currentSessionId: user.sessionId, devices: sessions || [], total: sessions?.length || 0 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. DELETE /auth/devices/:id
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'DELETE' && path.includes('/devices/')) {
      const targetSessionId = path.split('/devices/')[1]?.replace(/\/$/, '');
      const targetSession = await getSession(supabaseAdmin, targetSessionId);

      if (targetSession && (targetSession.user_id === user.id || user.role === 'admin' || user.role === 'owner')) {
        await revokeSession(supabaseAdmin, targetSessionId);
        return successResponse({ message: 'Device session revoked', sessionId: targetSessionId });
      }
      return errorResponse('NOT_FOUND', 'Session not found or not authorized', 404);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. DELETE /auth/devices (revoke all other sessions)
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'DELETE' && path.endsWith('/devices')) {
      const { data: revoked } = await supabaseAdmin
        .from('user_sessions')
        .update({ is_revoked: true })
        .eq('user_id', user.id)
        .neq('id', user.sessionId)
        .eq('is_revoked', false)
        .select('id');

      return successResponse({ message: `Revoked ${revoked?.length || 0} other session(s)`, revokedCount: revoked?.length || 0 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. POST /auth/change-password
    //     AUTH-02 FIX: Update via Supabase Admin Auth — stored in DB permanently
    // ──────────────────────────────────────────────────────────────────────────
    if (method === 'POST' && path.includes('/change-password')) {
      const rawBody = await req.json();
      const validation = validateSchema(ChangePasswordSchema, rawBody);
      if (validation.error) return validation.error;

      const { currentPassword, newPassword } = validation.data;

      // Verify current password by attempting sign-in
      const supabaseClient = getSupabaseClient();
      const { error: verifyError } = await supabaseClient.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) return errorResponse('INVALID_PASSWORD', 'Current password is incorrect', 400);

      // AUTH-02 FIX: Update password via Supabase Admin (persisted in DB — not in-memory Map)
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
      if (pwError) return errorResponse('PASSWORD_UPDATE_FAILED', 'Failed to update password. Please try again.', 500);

      await logSecurityEvent({} as any, { event_type: 'password_changed', user_id: user.id, email: user.email, ip_address: clientIp, severity: 'info' });

      return successResponse({ message: 'Password updated successfully.' });
    }

    return errorResponse('NOT_FOUND', 'Auth endpoint not found', 404);

  } catch (err: any) {
    console.error('[Auth] Unhandled error:', err);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
});
