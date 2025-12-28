-- ============================================================================
-- RECURRING TRANSACTIONS TABLE
-- ============================================================================
-- Stores recurring transaction templates that auto-generate transactions
-- Similar pattern to bills but for any type of recurring transaction

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,  -- Signed: negative = expense, positive = income
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    next_occurrence_date DATE NOT NULL,
    last_created_date DATE,  -- Track when last transaction was auto-generated
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS recurring_transactions_user_id_idx ON public.recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS recurring_transactions_next_occurrence_idx ON public.recurring_transactions(next_occurrence_date);
CREATE INDEX IF NOT EXISTS recurring_transactions_active_idx ON public.recurring_transactions(is_active) WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recurring transactions
CREATE POLICY "Users can view own recurring transactions"
    ON public.recurring_transactions
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can only insert their own recurring transactions
CREATE POLICY "Users can insert own recurring transactions"
    ON public.recurring_transactions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own recurring transactions
CREATE POLICY "Users can update own recurring transactions"
    ON public.recurring_transactions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own recurring transactions
CREATE POLICY "Users can delete own recurring transactions"
    ON public.recurring_transactions
    FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- LINK TRANSACTIONS TO RECURRING SOURCE
-- ============================================================================
-- Add column to track which recurring transaction generated a transaction

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS recurring_transaction_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- Index for finding transactions generated from a recurring template
CREATE INDEX IF NOT EXISTS transactions_recurring_id_idx ON public.transactions(recurring_transaction_id) WHERE recurring_transaction_id IS NOT NULL;
