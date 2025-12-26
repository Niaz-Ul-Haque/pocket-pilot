-- Migration: 004_budgets
-- Description: Create budgets table for monthly budget limits per category (Story 7/8)
-- Date: 2024-12-26

-- 1. Create table in public schema
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL DEFAULT 'MONTHLY',
  rollover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes
-- Index on user_id for basic filtering
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);

-- Unique index to ensure one budget per category per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_unique 
  ON public.budgets(user_id, category_id);

-- 3. Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for CRUD operations
CREATE POLICY "budgets_select_own" ON public.budgets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "budgets_insert_own" ON public.budgets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "budgets_update_own" ON public.budgets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "budgets_delete_own" ON public.budgets
  FOR DELETE USING (user_id = auth.uid());

-- 5. Add comments
COMMENT ON TABLE public.budgets IS 'Monthly budget limits per category';
COMMENT ON COLUMN public.budgets.amount IS 'Monthly budget limit in CAD';
COMMENT ON COLUMN public.budgets.period IS 'Budget period - MVP only supports MONTHLY';
COMMENT ON COLUMN public.budgets.rollover IS 'Future feature: carry unused budget to next month';
