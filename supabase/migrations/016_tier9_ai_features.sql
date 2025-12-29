-- Migration: 016_tier9_ai_features.sql
-- Description: Add Tier 9 Advanced AI Capabilities
-- Features: AI Memory (Cross-Session), Smart Merchant Recognition, Prediction Tracking,
--          AI Summaries (Weekly/Monthly), Proactive AI Notifications, AI Learning Mode

-- ============================================================================
-- AI MEMORY TABLE (Cross-Session Memory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'context', 'learning', 'custom')),
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, memory_type, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ai_memory_user_id_idx ON public.ai_memory(user_id);
CREATE INDEX IF NOT EXISTS ai_memory_type_idx ON public.ai_memory(user_id, memory_type);
CREATE INDEX IF NOT EXISTS ai_memory_key_idx ON public.ai_memory(user_id, key);

-- Enable RLS
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ai_memory_select_own" ON public.ai_memory
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_memory_insert_own" ON public.ai_memory
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_memory_update_own" ON public.ai_memory
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ai_memory_delete_own" ON public.ai_memory
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- MERCHANT MAPPINGS TABLE (Smart Merchant Recognition)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.merchant_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    raw_merchant TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    confidence NUMERIC(3, 2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    is_user_defined BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, raw_merchant)
);

-- Indexes
CREATE INDEX IF NOT EXISTS merchant_mappings_user_id_idx ON public.merchant_mappings(user_id);
CREATE INDEX IF NOT EXISTS merchant_mappings_raw_idx ON public.merchant_mappings(user_id, raw_merchant);
CREATE INDEX IF NOT EXISTS merchant_mappings_normalized_idx ON public.merchant_mappings(user_id, normalized_name);

-- Enable RLS
ALTER TABLE public.merchant_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "merchant_mappings_select_own" ON public.merchant_mappings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "merchant_mappings_insert_own" ON public.merchant_mappings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "merchant_mappings_update_own" ON public.merchant_mappings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "merchant_mappings_delete_own" ON public.merchant_mappings
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PREDICTION TRACKING TABLE (Accuracy Tracking for AI Predictions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prediction_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    prediction_type TEXT NOT NULL CHECK (prediction_type IN ('category', 'amount', 'date', 'merchant', 'budget', 'spending')),
    predicted_value JSONB NOT NULL,
    actual_value JSONB,
    is_correct BOOLEAN,
    correction_source TEXT CHECK (correction_source IN ('user', 'system', 'auto')),
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS prediction_tracking_user_id_idx ON public.prediction_tracking(user_id);
CREATE INDEX IF NOT EXISTS prediction_tracking_type_idx ON public.prediction_tracking(user_id, prediction_type);
CREATE INDEX IF NOT EXISTS prediction_tracking_created_idx ON public.prediction_tracking(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.prediction_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "prediction_tracking_select_own" ON public.prediction_tracking
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "prediction_tracking_insert_own" ON public.prediction_tracking
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "prediction_tracking_update_own" ON public.prediction_tracking
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "prediction_tracking_delete_own" ON public.prediction_tracking
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- AI SUMMARIES TABLE (Weekly and Monthly Summaries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    summary_type TEXT NOT NULL CHECK (summary_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    content JSONB NOT NULL,
    highlights TEXT[],
    recommendations TEXT[],
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    is_read BOOLEAN DEFAULT false,
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, summary_type, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ai_summaries_user_id_idx ON public.ai_summaries(user_id);
CREATE INDEX IF NOT EXISTS ai_summaries_type_idx ON public.ai_summaries(user_id, summary_type);
CREATE INDEX IF NOT EXISTS ai_summaries_period_idx ON public.ai_summaries(user_id, period_start DESC);

-- Enable RLS
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ai_summaries_select_own" ON public.ai_summaries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_summaries_insert_own" ON public.ai_summaries
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_summaries_update_own" ON public.ai_summaries
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ai_summaries_delete_own" ON public.ai_summaries
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PROACTIVE AI NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'spending_alert', 'budget_warning', 'goal_reminder', 'bill_reminder',
        'savings_opportunity', 'unusual_activity', 'weekly_insight', 'monthly_insight',
        'achievement', 'recommendation', 'prediction_alert'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    data JSONB,
    action_url TEXT,
    action_label TEXT,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS ai_notifications_user_id_idx ON public.ai_notifications(user_id);
CREATE INDEX IF NOT EXISTS ai_notifications_unread_idx ON public.ai_notifications(user_id, is_read, is_dismissed) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX IF NOT EXISTS ai_notifications_created_idx ON public.ai_notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ai_notifications_select_own" ON public.ai_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_notifications_insert_own" ON public.ai_notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_notifications_update_own" ON public.ai_notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ai_notifications_delete_own" ON public.ai_notifications
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- AI LEARNING RULES TABLE (User-taught categorization rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_learning_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('categorization', 'merchant', 'amount_threshold', 'custom')),
    pattern TEXT NOT NULL,
    action JSONB NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    is_active BOOLEAN DEFAULT true,
    match_count INTEGER DEFAULT 0,
    last_matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS ai_learning_rules_user_id_idx ON public.ai_learning_rules(user_id);
CREATE INDEX IF NOT EXISTS ai_learning_rules_type_idx ON public.ai_learning_rules(user_id, rule_type);
CREATE INDEX IF NOT EXISTS ai_learning_rules_active_idx ON public.ai_learning_rules(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.ai_learning_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ai_learning_rules_select_own" ON public.ai_learning_rules
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ai_learning_rules_insert_own" ON public.ai_learning_rules
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_learning_rules_update_own" ON public.ai_learning_rules
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "ai_learning_rules_delete_own" ON public.ai_learning_rules
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- AI SETTINGS TABLE (User AI preferences - extends user_profiles)
-- ============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS ai_voice_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_auto_speak BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_personality TEXT CHECK (ai_personality IN ('formal', 'casual', 'friendly')) DEFAULT 'friendly',
ADD COLUMN IF NOT EXISTS ai_response_length TEXT CHECK (ai_response_length IN ('brief', 'detailed', 'auto')) DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS weekly_summary_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_summary_day INTEGER CHECK (weekly_summary_day >= 0 AND weekly_summary_day <= 6) DEFAULT 1,
ADD COLUMN IF NOT EXISTS monthly_report_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS proactive_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_language TEXT DEFAULT 'en';

-- ============================================================================
-- NATURAL LANGUAGE SEARCH HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    parsed_filters JSONB,
    result_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_created_idx ON public.search_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "search_history_select_own" ON public.search_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "search_history_insert_own" ON public.search_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "search_history_delete_own" ON public.search_history
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.ai_memory IS 'Persistent AI memory for cross-session context and user preferences';
COMMENT ON COLUMN public.ai_memory.memory_type IS 'Type: preference (user prefs), context (conversation context), learning (learned patterns), custom';
COMMENT ON COLUMN public.ai_memory.importance IS 'Importance score 1-10, higher = more important to remember';
COMMENT ON COLUMN public.ai_memory.expires_at IS 'Optional expiration for temporary memories';

COMMENT ON TABLE public.merchant_mappings IS 'Maps raw merchant strings to normalized names for smart recognition';
COMMENT ON COLUMN public.merchant_mappings.raw_merchant IS 'Original merchant string as it appears in transactions (e.g., AMZN*123, UBER* TRIP)';
COMMENT ON COLUMN public.merchant_mappings.normalized_name IS 'Clean merchant name (e.g., Amazon, Uber)';
COMMENT ON COLUMN public.merchant_mappings.confidence IS 'Confidence score 0-1, higher = more confident in mapping';
COMMENT ON COLUMN public.merchant_mappings.is_user_defined IS 'True if user explicitly defined this mapping';

COMMENT ON TABLE public.prediction_tracking IS 'Tracks AI prediction accuracy for continuous improvement';
COMMENT ON COLUMN public.prediction_tracking.prediction_type IS 'Type of prediction: category, amount, date, merchant, budget, spending';
COMMENT ON COLUMN public.prediction_tracking.is_correct IS 'True if prediction matched actual, NULL if unresolved';

COMMENT ON TABLE public.ai_summaries IS 'Generated weekly and monthly AI financial summaries';
COMMENT ON COLUMN public.ai_summaries.content IS 'JSON containing full summary data (spending, budgets, goals, etc.)';
COMMENT ON COLUMN public.ai_summaries.pdf_url IS 'URL to generated PDF report (for monthly reports)';

COMMENT ON TABLE public.ai_notifications IS 'Proactive AI-generated notifications and alerts';
COMMENT ON COLUMN public.ai_notifications.notification_type IS 'Type of AI notification: spending_alert, budget_warning, goal_reminder, etc.';
COMMENT ON COLUMN public.ai_notifications.priority IS 'Priority level: low, medium, high, critical';
COMMENT ON COLUMN public.ai_notifications.action_url IS 'Optional URL for notification action button';

COMMENT ON TABLE public.ai_learning_rules IS 'User-taught rules for AI categorization and recognition';
COMMENT ON COLUMN public.ai_learning_rules.pattern IS 'Pattern to match (regex or keyword)';
COMMENT ON COLUMN public.ai_learning_rules.action IS 'JSON action to take when pattern matches';

COMMENT ON TABLE public.search_history IS 'Natural language search history for learning and autocomplete';
COMMENT ON COLUMN public.search_history.parsed_filters IS 'JSON containing parsed search filters from natural language';
