-- =====================================================
-- TIER 4: Transaction Power Features
-- =====================================================

-- =====================================================
-- 1. Auto-Categorization Rules
-- =====================================================

CREATE TABLE IF NOT EXISTS public.categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_order INTEGER NOT NULL DEFAULT 0,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('contains', 'starts_with', 'ends_with', 'exact', 'regex')),
  pattern TEXT NOT NULL,
  case_sensitive BOOLEAN NOT NULL DEFAULT false,
  target_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for categorization_rules
CREATE INDEX idx_categorization_rules_user ON public.categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_user_order ON public.categorization_rules(user_id, rule_order);
CREATE INDEX idx_categorization_rules_active ON public.categorization_rules(user_id, is_active) WHERE is_active = true;

-- Unique constraint on rule order per user
CREATE UNIQUE INDEX idx_categorization_rules_user_order_unique ON public.categorization_rules(user_id, rule_order);

-- RLS for categorization_rules
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categorization rules"
ON public.categorization_rules FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own categorization rules"
ON public.categorization_rules FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categorization rules"
ON public.categorization_rules FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own categorization rules"
ON public.categorization_rules FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 2. Transaction Templates
-- =====================================================

CREATE TABLE IF NOT EXISTS public.transaction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  description TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for transaction_templates
CREATE INDEX idx_transaction_templates_user ON public.transaction_templates(user_id);
CREATE INDEX idx_transaction_templates_favorites ON public.transaction_templates(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_transaction_templates_usage ON public.transaction_templates(user_id, usage_count DESC);

-- Unique constraint on template name per user
CREATE UNIQUE INDEX idx_transaction_templates_user_name ON public.transaction_templates(user_id, lower(name));

-- RLS for transaction_templates
ALTER TABLE public.transaction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transaction templates"
ON public.transaction_templates FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transaction templates"
ON public.transaction_templates FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transaction templates"
ON public.transaction_templates FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transaction templates"
ON public.transaction_templates FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 3. Template Tags (many-to-many)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.template_tags (
  template_id UUID NOT NULL REFERENCES public.transaction_templates(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, tag_id)
);

-- RLS for template_tags (inherits from parent tables via FKs)
ALTER TABLE public.template_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template tags"
ON public.template_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transaction_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own template tags"
ON public.template_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transaction_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own template tags"
ON public.template_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.transaction_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);

-- =====================================================
-- 4. Transaction Links (for refunds, related transactions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.transaction_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  source_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  target_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('refund', 'related', 'partial_refund', 'chargeback')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_transactions CHECK (source_transaction_id != target_transaction_id)
);

-- Indexes for transaction_links
CREATE INDEX idx_transaction_links_user ON public.transaction_links(user_id);
CREATE INDEX idx_transaction_links_source ON public.transaction_links(source_transaction_id);
CREATE INDEX idx_transaction_links_target ON public.transaction_links(target_transaction_id);

-- Unique constraint to prevent duplicate links
CREATE UNIQUE INDEX idx_transaction_links_unique ON public.transaction_links(source_transaction_id, target_transaction_id, link_type);

-- RLS for transaction_links
ALTER TABLE public.transaction_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transaction links"
ON public.transaction_links FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transaction links"
ON public.transaction_links FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transaction links"
ON public.transaction_links FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transaction links"
ON public.transaction_links FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 5. Split Transactions
-- Add columns to transactions table for split support
-- =====================================================

-- Add split-related columns to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS split_group_id UUID,
ADD COLUMN IF NOT EXISTS is_split_parent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS split_parent_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE;

-- Index for split transactions
CREATE INDEX IF NOT EXISTS idx_transactions_split_group ON public.transactions(split_group_id) WHERE split_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_split_parent ON public.transactions(split_parent_id) WHERE split_parent_id IS NOT NULL;

-- =====================================================
-- Helper function to auto-categorize a transaction
-- =====================================================

CREATE OR REPLACE FUNCTION apply_categorization_rules(
  p_user_id UUID,
  p_description TEXT
) RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_rule RECORD;
BEGIN
  -- Loop through active rules in order
  FOR v_rule IN
    SELECT * FROM public.categorization_rules
    WHERE user_id = p_user_id AND is_active = true
    ORDER BY rule_order ASC
  LOOP
    -- Check if the description matches the pattern
    CASE v_rule.rule_type
      WHEN 'contains' THEN
        IF v_rule.case_sensitive THEN
          IF p_description LIKE '%' || v_rule.pattern || '%' THEN
            RETURN v_rule.target_category_id;
          END IF;
        ELSE
          IF lower(p_description) LIKE '%' || lower(v_rule.pattern) || '%' THEN
            RETURN v_rule.target_category_id;
          END IF;
        END IF;
      WHEN 'starts_with' THEN
        IF v_rule.case_sensitive THEN
          IF p_description LIKE v_rule.pattern || '%' THEN
            RETURN v_rule.target_category_id;
          END IF;
        ELSE
          IF lower(p_description) LIKE lower(v_rule.pattern) || '%' THEN
            RETURN v_rule.target_category_id;
          END IF;
        END IF;
      WHEN 'ends_with' THEN
        IF v_rule.case_sensitive THEN
          IF p_description LIKE '%' || v_rule.pattern THEN
            RETURN v_rule.target_category_id;
          END IF;
        ELSE
          IF lower(p_description) LIKE '%' || lower(v_rule.pattern) THEN
            RETURN v_rule.target_category_id;
          END IF;
        END IF;
      WHEN 'exact' THEN
        IF v_rule.case_sensitive THEN
          IF p_description = v_rule.pattern THEN
            RETURN v_rule.target_category_id;
          END IF;
        ELSE
          IF lower(p_description) = lower(v_rule.pattern) THEN
            RETURN v_rule.target_category_id;
          END IF;
        END IF;
      WHEN 'regex' THEN
        IF p_description ~ v_rule.pattern THEN
          RETURN v_rule.target_category_id;
        END IF;
    END CASE;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
