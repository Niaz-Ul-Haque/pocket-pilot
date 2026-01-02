-- TIER 11: AI Chat UX Enhancements
-- Migration for conversation templates, message reactions, chat settings, pinning, and export

-- =====================================================
-- 1. ADD PINNING SUPPORT TO CONVERSATIONS
-- =====================================================
ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Index for pinned conversations (sorted first)
CREATE INDEX IF NOT EXISTS chat_conversations_pinned_idx
ON public.chat_conversations(user_id, is_pinned DESC, updated_at DESC);


-- =====================================================
-- 2. MESSAGE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'thumbs_down')),
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(message_id) -- One reaction per message
);

-- Indexes
CREATE INDEX IF NOT EXISTS message_reactions_user_idx ON public.message_reactions(user_id);
CREATE INDEX IF NOT EXISTS message_reactions_message_idx ON public.message_reactions(message_id);

-- RLS Policies
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reactions"
ON public.message_reactions FOR SELECT
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can insert own reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can update own reactions"
ON public.message_reactions FOR UPDATE
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can delete own reactions"
ON public.message_reactions FOR DELETE
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));


-- =====================================================
-- 3. CHAT SETTINGS TABLE (per-user AI preferences)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    -- Response settings
    response_speed TEXT NOT NULL DEFAULT 'balanced' CHECK (response_speed IN ('fast', 'balanced', 'detailed')),
    -- Language preference
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi')),
    -- Personality style
    personality TEXT NOT NULL DEFAULT 'balanced' CHECK (personality IN ('formal', 'balanced', 'casual')),
    -- Other preferences
    show_templates BOOLEAN NOT NULL DEFAULT true,
    auto_speak BOOLEAN NOT NULL DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_settings_user_idx ON public.chat_settings(user_id);

-- RLS Policies
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat settings"
ON public.chat_settings FOR SELECT
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can insert own chat settings"
ON public.chat_settings FOR INSERT
WITH CHECK (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can update own chat settings"
ON public.chat_settings FOR UPDATE
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can delete own chat settings"
ON public.chat_settings FOR DELETE
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));


-- =====================================================
-- 4. CONVERSATION TEMPLATES TABLE (system + user templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES next_auth.users(id) ON DELETE CASCADE, -- NULL for system templates
    title TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'transactions', 'budgets', 'goals', 'bills', 'reports', 'analysis')),
    icon TEXT, -- Lucide icon name
    is_system BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS conversation_templates_user_idx ON public.conversation_templates(user_id);
CREATE INDEX IF NOT EXISTS conversation_templates_category_idx ON public.conversation_templates(category);
CREATE INDEX IF NOT EXISTS conversation_templates_system_idx ON public.conversation_templates(is_system);

-- RLS Policies
ALTER TABLE public.conversation_templates ENABLE ROW LEVEL SECURITY;

-- Users can view system templates OR their own templates
CREATE POLICY "Users can view system or own templates"
ON public.conversation_templates FOR SELECT
USING (is_system = true OR user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

-- Users can only insert their own templates
CREATE POLICY "Users can insert own templates"
ON public.conversation_templates FOR INSERT
WITH CHECK (user_id = (SELECT id FROM next_auth.users WHERE id = user_id) AND is_system = false);

CREATE POLICY "Users can update own templates"
ON public.conversation_templates FOR UPDATE
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id) AND is_system = false);

CREATE POLICY "Users can delete own templates"
ON public.conversation_templates FOR DELETE
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id) AND is_system = false);


-- =====================================================
-- 5. INSERT DEFAULT SYSTEM TEMPLATES
-- =====================================================
INSERT INTO public.conversation_templates (title, description, prompt, category, icon, is_system) VALUES
-- Transaction Templates
('Add an expense', 'Quickly add a new expense transaction', 'Add an expense for $', 'transactions', 'CreditCard', true),
('Add income', 'Record income or earnings', 'Add income of $', 'transactions', 'Wallet', true),
('Recent transactions', 'View your recent transactions', 'Show me my recent transactions', 'transactions', 'List', true),
('Spending by category', 'See spending breakdown by category', 'How much have I spent on each category this month?', 'transactions', 'PieChart', true),

-- Budget Templates
('Check my budgets', 'View all budget status', 'What''s my budget status?', 'budgets', 'Target', true),
('Create a budget', 'Set up a new budget', 'Create a budget for ', 'budgets', 'Plus', true),
('Budget warnings', 'Check which budgets are close to limit', 'Which budgets am I close to exceeding?', 'budgets', 'AlertTriangle', true),

-- Goal Templates
('Goal progress', 'Check savings goal progress', 'How are my savings goals doing?', 'goals', 'TrendingUp', true),
('Add to savings', 'Contribute to a savings goal', 'Add $50 to my savings goal', 'goals', 'PiggyBank', true),
('Goal prediction', 'When will I reach my goal?', 'When will I reach my savings goal at the current rate?', 'goals', 'Calendar', true),

-- Bill Templates
('Upcoming bills', 'See bills due soon', 'What bills do I have coming up?', 'bills', 'Receipt', true),
('Add a bill', 'Create a new recurring bill', 'Add a new bill for ', 'bills', 'Plus', true),
('Bill summary', 'Get a summary of all bills', 'Give me a summary of all my recurring bills', 'bills', 'FileText', true),

-- Analysis Templates
('Monthly summary', 'Get a monthly financial summary', 'Give me a summary of this month', 'reports', 'BarChart', true),
('Spending trends', 'Analyze spending patterns', 'What are my spending trends?', 'analysis', 'LineChart', true),
('Find savings', 'Identify savings opportunities', 'Where can I save money?', 'analysis', 'Search', true),
('Compare periods', 'Compare spending between periods', 'Compare my spending this month vs last month', 'analysis', 'ArrowLeftRight', true),

-- General Templates
('Financial health', 'Check overall financial health', 'How am I doing financially?', 'general', 'Heart', true),
('Quick tips', 'Get personalized tips', 'Give me some tips to improve my finances', 'general', 'Lightbulb', true)
ON CONFLICT DO NOTHING;


-- =====================================================
-- 6. CHAT EXPORTS TABLE (track export history)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
    export_type TEXT NOT NULL CHECK (export_type IN ('text', 'pdf', 'json')),
    file_name TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_exports_user_idx ON public.chat_exports(user_id);
CREATE INDEX IF NOT EXISTS chat_exports_conversation_idx ON public.chat_exports(conversation_id);

-- RLS Policies
ALTER TABLE public.chat_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
ON public.chat_exports FOR SELECT
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can insert own exports"
ON public.chat_exports FOR INSERT
WITH CHECK (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));

CREATE POLICY "Users can delete own exports"
ON public.chat_exports FOR DELETE
USING (user_id = (SELECT id FROM next_auth.users WHERE id = user_id));


-- =====================================================
-- 7. UPDATE FUNCTION FOR CHAT SETTINGS
-- =====================================================
CREATE OR REPLACE FUNCTION update_chat_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chat_settings_updated_at ON public.chat_settings;
CREATE TRIGGER update_chat_settings_updated_at
    BEFORE UPDATE ON public.chat_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_settings_updated_at();


-- =====================================================
-- SUMMARY
-- =====================================================
-- Added:
-- 1. is_pinned column to chat_conversations for pinning
-- 2. message_reactions table for thumbs up/down feedback
-- 3. chat_settings table for AI preferences (speed, language, personality)
-- 4. conversation_templates table with 18 system templates
-- 5. chat_exports table for export tracking
