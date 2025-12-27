-- Migration: Tags system for transaction labeling
-- Allows users to add custom tags to transactions for flexible categorization

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6b7280', -- Default gray color
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: each user can only have one tag with a given name
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name_unique
ON public.tags(user_id, lower(name));

-- Index for user's tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Users can view their own tags"
    ON public.tags FOR SELECT
    USING (user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create their own tags"
    ON public.tags FOR INSERT
    WITH CHECK (user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own tags"
    ON public.tags FOR UPDATE
    USING (user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own tags"
    ON public.tags FOR DELETE
    USING (user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid()));

-- Create transaction_tags junction table
CREATE TABLE IF NOT EXISTS public.transaction_tags (
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (transaction_id, tag_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction
ON public.transaction_tags(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag
ON public.transaction_tags(tag_id);

-- Enable RLS
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_tags
-- Users can only manage tags on their own transactions
CREATE POLICY "Users can view tags on their transactions"
    ON public.transaction_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND t.user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can add tags to their transactions"
    ON public.transaction_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND t.user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid())
        )
        AND
        EXISTS (
            SELECT 1 FROM public.tags tg
            WHERE tg.id = tag_id
            AND tg.user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can remove tags from their transactions"
    ON public.transaction_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND t.user_id = (SELECT id FROM next_auth.users WHERE id = auth.uid())
        )
    );

-- Add comments
COMMENT ON TABLE public.tags IS 'User-defined tags for labeling transactions';
COMMENT ON TABLE public.transaction_tags IS 'Junction table linking transactions to tags (many-to-many)';
COMMENT ON COLUMN public.tags.color IS 'Hex color code for tag display, e.g., #ef4444 for red';
