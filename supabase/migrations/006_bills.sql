-- Migration: 006_bills.sql
-- Description: Create bills table for recurring bills and subscriptions
-- Milestone 5: Story 11 (Recurring Bills), Story 12 (Bill Due Alerts), Story 13 (Mark Bill Paid)

-- ============================================================================
-- BILLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(12, 2), -- NULL means variable amount
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    next_due_date DATE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    auto_pay BOOLEAN NOT NULL DEFAULT false,
    last_paid_date DATE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS bills_user_id_idx ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS bills_user_due_date_idx ON public.bills(user_id, next_due_date);
CREATE INDEX IF NOT EXISTS bills_active_idx ON public.bills(user_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "bills_select_own" ON public.bills
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "bills_insert_own" ON public.bills
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "bills_update_own" ON public.bills
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "bills_delete_own" ON public.bills
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bills IS 'Recurring bills and subscriptions with due date tracking';
COMMENT ON COLUMN public.bills.amount IS 'Expected bill amount (NULL for variable amounts)';
COMMENT ON COLUMN public.bills.frequency IS 'Bill frequency: weekly, biweekly, monthly, yearly';
COMMENT ON COLUMN public.bills.next_due_date IS 'Next payment due date';
COMMENT ON COLUMN public.bills.category_id IS 'Default category for creating transactions when marking paid';
COMMENT ON COLUMN public.bills.auto_pay IS 'Whether the bill is set to auto-pay (informational only)';
COMMENT ON COLUMN public.bills.last_paid_date IS 'Date when the bill was last marked as paid';
COMMENT ON COLUMN public.bills.is_active IS 'Whether the bill is active (false = archived/cancelled)';
