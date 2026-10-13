-- ==============================================================================
-- MridaOS Auth Migration — DB-Persisted Sessions & Password Reset Tokens
-- Fixes SEC-04 (in-memory sessions), AUTH-02 (password reset tokens in memory)
--
-- Run in Supabase Dashboard → SQL Editor AFTER auth_schema.sql
-- ==============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- user_sessions table (replaces in-memory activeSessions Map)
-- Persistent across edge function cold starts
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name    TEXT NOT NULL DEFAULT 'Unknown Device',
  browser        TEXT NOT NULL DEFAULT 'Unknown',
  os             TEXT NOT NULL DEFAULT 'Unknown',
  ip_address     TEXT NOT NULL DEFAULT '0.0.0.0',
  is_revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON public.user_sessions(user_id, is_revoked, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires
  ON public.user_sessions(expires_at) WHERE is_revoked = FALSE;

-- Auto-cleanup: delete sessions older than 24 hours
-- (Run periodically or via Supabase pg_cron)
-- DELETE FROM public.user_sessions WHERE expires_at < now() - interval '24 hours';

-- RLS: only service_role can manage sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages sessions"
  ON public.user_sessions
  USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────────────────────
-- password_reset_tokens table (replaces in-memory passwordResetTokens Map)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id
  ON public.password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_prt_expires
  ON public.password_reset_tokens(expires_at) WHERE used_at IS NULL;

-- RLS: only service_role
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages reset tokens"
  ON public.password_reset_tokens
  USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────────────────────
-- user_accounts table (used by accountLockout.ts for brute-force tracking)
-- If it already exists, this is a no-op.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  failed_login_count    INTEGER NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ DEFAULT NULL,
  last_failed_login_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email
  ON public.user_accounts(email);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages user_accounts"
  ON public.user_accounts
  USING (auth.role() = 'service_role');

-- Sync user_accounts row whenever a new auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_user_account()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_accounts (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_accounts ON auth.users;
CREATE TRIGGER on_auth_user_created_accounts
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_account();


-- ────────────────────────────────────────────────────────────────────────────
-- Backfill user_accounts for existing auth.users rows
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.user_accounts (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
