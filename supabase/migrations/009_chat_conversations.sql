-- Migration: 009_chat_conversations.sql
-- Description: Create chat_conversations table for grouping chat messages with titles
-- This enables the chat history sidebar feature

-- ============================================================================
-- CHAT_CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS chat_conversations_updated_idx ON public.chat_conversations(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "chat_conversations_select_own" ON public.chat_conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "chat_conversations_insert_own" ON public.chat_conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_conversations_update_own" ON public.chat_conversations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "chat_conversations_delete_own" ON public.chat_conversations
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- UPDATE CHAT_MESSAGES TO REFERENCE CONVERSATIONS
-- ============================================================================

-- Add foreign key constraint to chat_messages if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_messages_conversation_fk'
    ) THEN
        ALTER TABLE public.chat_messages
        ADD CONSTRAINT chat_messages_conversation_fk
        FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.chat_conversations IS 'AI assistant chat conversations metadata';
COMMENT ON COLUMN public.chat_conversations.title IS 'Auto-generated or user-set conversation title';
COMMENT ON COLUMN public.chat_conversations.updated_at IS 'Last message timestamp for sorting';
