-- Migration: 014_tier5_budget_features
-- Description: TIER 5 Budgeting Enhancements - Templates, Annual Budgets, Notes, Custom Alerts, Flexible Periods
-- Date: 2024-12-28

-- 1. Add new columns to budgets table for enhanced features
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 90 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month >= 1 AND month <= 12);

-- Update period column to support more periods
-- Note: We're not changing the constraint since TEXT allows any value
COMMENT ON COLUMN public.budgets.period IS 'Budget period - MONTHLY, WEEKLY, BIWEEKLY, YEARLY';
COMMENT ON COLUMN public.budgets.notes IS 'Optional notes/reminders for the budget';
COMMENT ON COLUMN public.budgets.alert_threshold IS 'Custom percentage threshold for budget alerts (0-100)';
COMMENT ON COLUMN public.budgets.year IS 'Specific year for annual budgets (NULL for recurring monthly)';
COMMENT ON COLUMN public.budgets.month IS 'Specific month for month-specific budgets (NULL for recurring)';

-- 2. Create budget_templates table for pre-built budget configurations
CREATE TABLE IF NOT EXISTS public.budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES next_auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  template_type TEXT NOT NULL DEFAULT 'CUSTOM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add check constraint for template_type
ALTER TABLE public.budget_templates
ADD CONSTRAINT template_type_check
CHECK (template_type IN ('FIFTY_THIRTY_TWENTY', 'ENVELOPE', 'ZERO_BASED', 'CUSTOM'));

-- 3. Create budget_template_items table for template budget allocations
CREATE TABLE IF NOT EXISTS public.budget_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.budget_templates(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  percentage NUMERIC(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  fixed_amount NUMERIC(12,2) CHECK (fixed_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure either percentage or fixed_amount is set, not both
ALTER TABLE public.budget_template_items
ADD CONSTRAINT amount_type_check
CHECK (
  (percentage IS NOT NULL AND fixed_amount IS NULL) OR
  (percentage IS NULL AND fixed_amount IS NOT NULL)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_budget_templates_user_id ON public.budget_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_templates_system ON public.budget_templates(is_system) WHERE is_system = true;
CREATE INDEX IF NOT EXISTS idx_budget_template_items_template ON public.budget_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON public.budgets(user_id, year, month) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(user_id, period);

-- 5. Enable RLS on new tables
ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_template_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for budget_templates
-- Users can view their own templates and system templates
CREATE POLICY "budget_templates_select" ON public.budget_templates
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);

CREATE POLICY "budget_templates_insert_own" ON public.budget_templates
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "budget_templates_update_own" ON public.budget_templates
  FOR UPDATE USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY "budget_templates_delete_own" ON public.budget_templates
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- 7. RLS Policies for budget_template_items
-- Users can view items from their templates or system templates
CREATE POLICY "budget_template_items_select" ON public.budget_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budget_templates t
      WHERE t.id = template_id AND (t.user_id = auth.uid() OR t.is_system = true)
    )
  );

CREATE POLICY "budget_template_items_insert" ON public.budget_template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid() AND t.is_system = false
    )
  );

CREATE POLICY "budget_template_items_update" ON public.budget_template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.budget_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid() AND t.is_system = false
    )
  );

CREATE POLICY "budget_template_items_delete" ON public.budget_template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.budget_templates t
      WHERE t.id = template_id AND t.user_id = auth.uid() AND t.is_system = false
    )
  );

-- 8. Insert system budget templates (50/30/20, Envelope Method, Zero-Based)

-- 50/30/20 Budget Template
INSERT INTO public.budget_templates (id, user_id, name, description, is_system, template_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  '50/30/20 Rule',
  'A simple budgeting method: 50% needs, 30% wants, 20% savings. Ideal for beginners.',
  true,
  'FIFTY_THIRTY_TWENTY'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.budget_template_items (template_id, category_name, percentage, notes)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Housing', 25, 'Rent, mortgage, property taxes'),
  ('00000000-0000-0000-0000-000000000001', 'Utilities', 5, 'Electric, gas, water, internet'),
  ('00000000-0000-0000-0000-000000000001', 'Groceries', 10, 'Food and household essentials'),
  ('00000000-0000-0000-0000-000000000001', 'Transportation', 10, 'Car payment, gas, transit'),
  ('00000000-0000-0000-0000-000000000001', 'Entertainment', 10, 'Movies, streaming, hobbies'),
  ('00000000-0000-0000-0000-000000000001', 'Dining Out', 10, 'Restaurants and takeout'),
  ('00000000-0000-0000-0000-000000000001', 'Shopping', 10, 'Clothing, electronics, misc'),
  ('00000000-0000-0000-0000-000000000001', 'Savings', 15, 'Emergency fund, investments'),
  ('00000000-0000-0000-0000-000000000001', 'Debt Repayment', 5, 'Credit cards, loans');

-- Envelope Method Template
INSERT INTO public.budget_templates (id, user_id, name, description, is_system, template_type)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  NULL,
  'Envelope Method',
  'Cash-based budgeting with specific envelopes for each category. Great for controlling spending.',
  true,
  'ENVELOPE'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.budget_template_items (template_id, category_name, percentage, notes)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Rent/Mortgage', 30, 'Fixed housing costs'),
  ('00000000-0000-0000-0000-000000000002', 'Utilities', 8, 'All utility bills'),
  ('00000000-0000-0000-0000-000000000002', 'Groceries', 12, 'Weekly grocery budget'),
  ('00000000-0000-0000-0000-000000000002', 'Transportation', 10, 'Gas and transit'),
  ('00000000-0000-0000-0000-000000000002', 'Personal', 5, 'Haircuts, toiletries'),
  ('00000000-0000-0000-0000-000000000002', 'Entertainment', 5, 'Fun money'),
  ('00000000-0000-0000-0000-000000000002', 'Clothing', 5, 'Seasonal clothing budget'),
  ('00000000-0000-0000-0000-000000000002', 'Medical', 5, 'Health expenses, prescriptions'),
  ('00000000-0000-0000-0000-000000000002', 'Savings', 10, 'Pay yourself first'),
  ('00000000-0000-0000-0000-000000000002', 'Miscellaneous', 10, 'Buffer for unexpected');

-- Zero-Based Budget Template
INSERT INTO public.budget_templates (id, user_id, name, description, is_system, template_type)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  NULL,
  'Zero-Based Budget',
  'Every dollar has a job. Income minus expenses equals zero. Best for detailed tracking.',
  true,
  'ZERO_BASED'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.budget_template_items (template_id, category_name, percentage, notes)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'Housing', 28, 'All housing costs'),
  ('00000000-0000-0000-0000-000000000003', 'Utilities', 6, 'All utilities'),
  ('00000000-0000-0000-0000-000000000003', 'Groceries', 10, 'Food only'),
  ('00000000-0000-0000-0000-000000000003', 'Transportation', 12, 'All transport costs'),
  ('00000000-0000-0000-0000-000000000003', 'Insurance', 8, 'Health, car, life'),
  ('00000000-0000-0000-0000-000000000003', 'Debt Payments', 10, 'Minimum payments + extra'),
  ('00000000-0000-0000-0000-000000000003', 'Savings', 10, 'Emergency + retirement'),
  ('00000000-0000-0000-0000-000000000003', 'Entertainment', 5, 'Fun and recreation'),
  ('00000000-0000-0000-0000-000000000003', 'Personal Care', 3, 'Grooming and self-care'),
  ('00000000-0000-0000-0000-000000000003', 'Gifts/Donations', 3, 'Giving back'),
  ('00000000-0000-0000-0000-000000000003', 'Miscellaneous', 5, 'Catch-all category');

-- 9. Add comments
COMMENT ON TABLE public.budget_templates IS 'Pre-built and custom budget templates';
COMMENT ON TABLE public.budget_template_items IS 'Individual budget allocations within a template';
