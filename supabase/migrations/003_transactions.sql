-- Migration: 003_transactions
-- Description: Create transactions table for financial ledger (Story 4)
-- Date: 2024-12-26

-- 1. Create table in public schema
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  is_transfer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for common queries
-- Index on user_id for basic filtering
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- Index on (user_id, date) for chronological queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);

-- Index on (user_id, account_id, date) for account statements
CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date ON public.transactions(user_id, account_id, date DESC);

-- Index on (user_id, category_id, date) for budget calculations
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date ON public.transactions(user_id, category_id, date DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for CRUD operations
-- Note: These use auth.uid() for Supabase Auth. Since we use NextAuth with supabaseAdmin,
-- RLS is bypassed and we filter by user_id in application code instead.
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE USING (user_id = auth.uid());

-- 5. Add comment for amount convention
COMMENT ON COLUMN public.transactions.amount IS 'Positive = money IN (income/deposits), Negative = money OUT (expenses/withdrawals)';
