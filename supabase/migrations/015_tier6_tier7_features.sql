-- Migration: 015_tier6_tier7_features.sql
-- Description: Add Tier 6 (Goals & Bills Enhancements) and Tier 7 (Reports & Analytics) features
-- TIER 6: Goal Categories, Goal Milestones, Goal Auto-Contribute, Goal Sharing, Bill Payment Streaks
-- TIER 7: Custom Date Range Reports, Year-Over-Year, Merchant Reports, Category Deep Dive, Tax Summary

-- ============================================================================
-- GOAL CATEGORIES
-- ============================================================================

-- Create goal_categories enum type for predefined categories
DO $$ BEGIN
    CREATE TYPE goal_category AS ENUM (
        'emergency',
        'vacation',
        'education',
        'retirement',
        'home',
        'vehicle',
        'wedding',
        'debt_payoff',
        'investment',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add category column to goals table
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS category goal_category DEFAULT 'other';

-- Add auto_contribute_amount for automatic monthly contributions
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS auto_contribute_amount NUMERIC(12, 2) DEFAULT NULL;

-- Add auto_contribute_day (day of month for auto contribution)
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS auto_contribute_day INTEGER DEFAULT NULL CHECK (auto_contribute_day >= 1 AND auto_contribute_day <= 28);

-- Add share_token for shareable progress links
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL UNIQUE;

-- Add is_shared flag
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Create index for share_token lookups
CREATE INDEX IF NOT EXISTS goals_share_token_idx ON public.goals(share_token) WHERE share_token IS NOT NULL;

-- ============================================================================
-- GOAL MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    target_percentage INTEGER NOT NULL CHECK (target_percentage > 0 AND target_percentage <= 100),
    is_reached BOOLEAN NOT NULL DEFAULT false,
    reached_at DATE,
    celebration_shown BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS goal_milestones_user_id_idx ON public.goal_milestones(user_id);
CREATE INDEX IF NOT EXISTS goal_milestones_goal_id_idx ON public.goal_milestones(goal_id);

-- Enable RLS
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "goal_milestones_select_own" ON public.goal_milestones
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "goal_milestones_insert_own" ON public.goal_milestones
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "goal_milestones_update_own" ON public.goal_milestones
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "goal_milestones_delete_own" ON public.goal_milestones
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- BILL PAYMENT HISTORY TABLE (for payment streak tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12, 2),
    was_on_time BOOLEAN NOT NULL DEFAULT true,
    days_early INTEGER DEFAULT 0,
    days_late INTEGER DEFAULT 0,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS bill_payments_user_id_idx ON public.bill_payments(user_id);
CREATE INDEX IF NOT EXISTS bill_payments_bill_id_idx ON public.bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS bill_payments_date_idx ON public.bill_payments(payment_date);

-- Enable RLS
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "bill_payments_select_own" ON public.bill_payments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "bill_payments_insert_own" ON public.bill_payments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "bill_payments_delete_own" ON public.bill_payments
    FOR DELETE USING (user_id = auth.uid());

-- Add streak columns to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS total_payments INTEGER DEFAULT 0;

ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS on_time_payments INTEGER DEFAULT 0;

-- ============================================================================
-- BILL CATEGORIES (Predefined for better organization)
-- ============================================================================

-- Create bill_category_type enum
DO $$ BEGIN
    CREATE TYPE bill_category_type AS ENUM (
        'utilities',
        'subscriptions',
        'insurance',
        'rent_mortgage',
        'loans',
        'phone_internet',
        'memberships',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add bill_type column for categorization
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS bill_type bill_category_type DEFAULT 'other';

-- ============================================================================
-- SAVED REPORTS TABLE (for custom reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('custom_date_range', 'year_over_year', 'merchant', 'category_deep_dive', 'tax_summary', 'monthly_summary')),
    parameters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_run_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS saved_reports_user_id_idx ON public.saved_reports(user_id);
CREATE INDEX IF NOT EXISTS saved_reports_type_idx ON public.saved_reports(user_id, report_type);

-- Enable RLS
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "saved_reports_select_own" ON public.saved_reports
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "saved_reports_insert_own" ON public.saved_reports
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_reports_update_own" ON public.saved_reports
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "saved_reports_delete_own" ON public.saved_reports
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- TAX CATEGORIES TABLE (for enhanced tax summaries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tax_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('income', 'deductible', 'non_taxable', 'capital_gains', 'business_expense', 'charitable')),
    tax_year INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, category_id, tax_year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS tax_categories_user_id_idx ON public.tax_categories(user_id);
CREATE INDEX IF NOT EXISTS tax_categories_year_idx ON public.tax_categories(user_id, tax_year);

-- Enable RLS
ALTER TABLE public.tax_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tax_categories_select_own" ON public.tax_categories
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tax_categories_insert_own" ON public.tax_categories
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tax_categories_update_own" ON public.tax_categories
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "tax_categories_delete_own" ON public.tax_categories
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.goal_milestones IS 'Sub-goals within larger savings goals for milestone tracking';
COMMENT ON COLUMN public.goal_milestones.target_percentage IS 'Percentage of main goal target (e.g., 25%, 50%, 75%)';
COMMENT ON COLUMN public.goal_milestones.celebration_shown IS 'Whether celebration UI was shown when milestone reached';

COMMENT ON TABLE public.bill_payments IS 'Payment history for bills, used for streak tracking';
COMMENT ON COLUMN public.bill_payments.was_on_time IS 'True if paid on or before due date';
COMMENT ON COLUMN public.bill_payments.days_early IS 'Number of days paid before due date (positive)';
COMMENT ON COLUMN public.bill_payments.days_late IS 'Number of days paid after due date (positive)';

COMMENT ON COLUMN public.bills.current_streak IS 'Current consecutive on-time payments';
COMMENT ON COLUMN public.bills.longest_streak IS 'Longest streak of on-time payments ever';
COMMENT ON COLUMN public.bills.bill_type IS 'Bill category type for organization';

COMMENT ON TABLE public.saved_reports IS 'User-saved report configurations';
COMMENT ON COLUMN public.saved_reports.parameters IS 'JSON object containing report parameters (date ranges, filters, etc.)';

COMMENT ON TABLE public.tax_categories IS 'Category-to-tax-type mappings for tax summary reports';
COMMENT ON COLUMN public.tax_categories.tax_type IS 'Tax classification: income, deductible, non_taxable, capital_gains, business_expense, charitable';
