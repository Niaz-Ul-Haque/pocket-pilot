-- Migration: Add linked_transaction_id for transfer linking
-- This allows tracking paired transfer transactions

-- Add linked_transaction_id column to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Create index for efficient lookup of linked transactions
CREATE INDEX IF NOT EXISTS idx_transactions_linked
ON public.transactions(linked_transaction_id)
WHERE linked_transaction_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.transactions.linked_transaction_id IS
'References the paired transaction for transfers. When transferring from Account A to Account B, two transactions are created (one negative, one positive) and linked via this column.';
