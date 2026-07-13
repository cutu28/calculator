-- ═══════════════════════════════════════════════════════════════════
-- CalcMaster — Complete Supabase Database Setup
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. CALCULATIONS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calculations (
    id          TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT '',
    expression  TEXT NOT NULL DEFAULT '',
    calc_type   TEXT NOT NULL DEFAULT 'derivative',
    result_latex TEXT NOT NULL DEFAULT '',
    steps_json  JSONB DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user queries (sorted by newest first)
CREATE INDEX IF NOT EXISTS idx_calc_user_created
    ON public.calculations(user_id, created_at DESC);

-- ── 2. ROW LEVEL SECURITY ─────────────────────────────────────────
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own calculations
CREATE POLICY "select_own_calculations" ON public.calculations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own calculations
CREATE POLICY "insert_own_calculations" ON public.calculations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own calculations
CREATE POLICY "update_own_calculations" ON public.calculations
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own calculations
CREATE POLICY "delete_own_calculations" ON public.calculations
    FOR DELETE
    USING (auth.uid() = user_id);

-- ── 3. USER PROFILES TABLE (optional — for username/streak) ────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE,
    streak      INTEGER DEFAULT 1,
    total_solved INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "insert_own_profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ── 4. AUTO-CREATE PROFILE ON SIGNUP (Trigger) ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        SPLIT_PART(NEW.email, '@', 1)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. HELPER VIEW: user stats ─────────────────────────────────────
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
    p.id,
    p.username,
    p.streak,
    COUNT(c.id) AS total_calculations,
    MAX(c.created_at) AS last_active
FROM public.profiles p
LEFT JOIN public.calculations c ON c.user_id = p.id
GROUP BY p.id, p.username, p.streak;

-- ── 6. VERIFY SETUP ────────────────────────────────────────────────
-- Run these SELECT statements to confirm tables and policies exist:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('calculations', 'profiles');
