-- Migration: 005_goals.sql
-- Description: Create goals and goal_contributions tables for savings goals tracking
-- Milestone 4: Story 9 (Savings Goals) & Story 10 (Goal Contributions)

-- ============================================================================
-- GOALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    target_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS goals_active_idx ON public.goals(user_id) WHERE is_completed = false;

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "goals_select_own" ON public.goals
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "goals_insert_own" ON public.goals
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "goals_update_own" ON public.goals
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "goals_delete_own" ON public.goals
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- GOAL_CONTRIBUTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS goal_contributions_user_id_idx ON public.goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS goal_contributions_goal_id_idx ON public.goal_contributions(goal_id);

-- Enable RLS
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "goal_contributions_select_own" ON public.goal_contributions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "goal_contributions_insert_own" ON public.goal_contributions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "goal_contributions_delete_own" ON public.goal_contributions
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.goals IS 'Savings goals with target amounts and optional deadlines';
COMMENT ON COLUMN public.goals.target_amount IS 'Target amount to save';
COMMENT ON COLUMN public.goals.current_amount IS 'Amount saved so far, updated via contributions';
COMMENT ON COLUMN public.goals.target_date IS 'Optional deadline for the goal';
COMMENT ON COLUMN public.goals.is_completed IS 'True when current_amount >= target_amount';

COMMENT ON TABLE public.goal_contributions IS 'Audit log of contributions to savings goals';
COMMENT ON COLUMN public.goal_contributions.amount IS 'Contribution amount (always positive)';
COMMENT ON COLUMN public.goal_contributions.note IS 'Optional note about the contribution';
