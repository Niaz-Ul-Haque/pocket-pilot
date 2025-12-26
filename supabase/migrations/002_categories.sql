-- Migration: 002_categories
-- Description: Create categories table for expense/income categorization (Story 3)
-- Date: 2024-12-26

-- 1. Create table in public schema
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  is_tax_related BOOLEAN NOT NULL DEFAULT false,
  tax_tag TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- 3. Create unique index on (user_id, name) for non-archived categories only
-- This allows the same name to exist if one is archived
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_unique 
  ON public.categories(user_id, name) 
  WHERE NOT is_archived;

-- 4. Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for CRUD operations
-- Note: These use auth.uid() for Supabase Auth. Since we use NextAuth with supabaseAdmin,
-- RLS is bypassed and we filter by user_id in application code instead.
CREATE POLICY "categories_select_own" ON public.categories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "categories_insert_own" ON public.categories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories_update_own" ON public.categories
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "categories_delete_own" ON public.categories
  FOR DELETE USING (user_id = auth.uid());
