-- Migration: 001_accounts
-- Description: Create accounts table for financial accounts (Story 2)
-- Date: 2024-12-26

-- Create accounts table in public schema
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User can only access their own accounts
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "accounts_delete_own" ON public.accounts
  FOR DELETE USING (user_id = auth.uid());
