-- Migration: 008_chat_messages.sql
-- Description: Create chat_messages table for AI assistant conversation history
-- Story 5: Add Transaction via Chat

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON public.chat_messages(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON public.chat_messages(conversation_id, created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "chat_messages_select_own" ON public.chat_messages
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert_own" ON public.chat_messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_messages_delete_own" ON public.chat_messages
    FOR DELETE USING (user_id = auth.uid());

-- No UPDATE policy - messages are immutable

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.chat_messages IS 'AI assistant chat message history per user';
COMMENT ON COLUMN public.chat_messages.conversation_id IS 'Groups messages into conversations';
COMMENT ON COLUMN public.chat_messages.role IS 'Message author: user, assistant, or system';
COMMENT ON COLUMN public.chat_messages.content IS 'Message content (text)';
