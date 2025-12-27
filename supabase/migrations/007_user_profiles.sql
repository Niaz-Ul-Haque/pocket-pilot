-- Migration: 007_user_profiles.sql
-- Description: Create user_profiles table for onboarding status and settings
-- Story 1: First-Time User Onboarding

-- ============================================================================
-- USER_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES next_auth.users(id) ON DELETE CASCADE,
    has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
    budgeting_framework TEXT CHECK (budgeting_framework IN ('basic', '50-30-20', 'tracking-only')),
    display_name TEXT,
    currency TEXT NOT NULL DEFAULT 'CAD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_update_own" ON public.user_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.user_profiles IS 'User profile and settings including onboarding status';
COMMENT ON COLUMN public.user_profiles.has_completed_onboarding IS 'Whether user has completed the onboarding flow';
COMMENT ON COLUMN public.user_profiles.budgeting_framework IS 'Selected budgeting framework: basic, 50-30-20, or tracking-only';
COMMENT ON COLUMN public.user_profiles.display_name IS 'User display name (can differ from Google name)';
COMMENT ON COLUMN public.user_profiles.currency IS 'Preferred currency (CAD only for MVP)';
