import { z } from "zod"

// Message roles
export const MESSAGE_ROLES = ["user", "assistant", "system"] as const
export type MessageRole = (typeof MESSAGE_ROLES)[number]

// Schema for chat message
export const chatMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(10000),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>

// Full chat message type
export type ChatMessage = {
  id: string
  user_id: string
  conversation_id: string
  role: MessageRole
  content: string
  created_at: string
}

// Message for display (simplified)
export type DisplayMessage = {
  id: string
  role: MessageRole
  content: string
  created_at: string
}

// Parse natural language transaction
export interface ParsedTransaction {
  amount: number | null
  category: string | null
  description: string | null
  date: string | null
  type: "expense" | "income" | null
  confidence: "high" | "medium" | "low"
}

// Common merchant to category mappings
export const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  // Food & Dining
  "uber eats": "Dining Out",
  "doordash": "Dining Out",
  "skip the dishes": "Dining Out",
  "mcdonalds": "Dining Out",
  "starbucks": "Dining Out",
  "tim hortons": "Dining Out",
  // Transportation
  "uber": "Transportation",
  "lyft": "Transportation",
  "gas": "Transportation",
  "petro canada": "Transportation",
  "shell": "Transportation",
  "esso": "Transportation",
  // Shopping
  "amazon": "Shopping",
  "walmart": "Groceries",
  "costco": "Groceries",
  "loblaws": "Groceries",
  "no frills": "Groceries",
  "metro": "Groceries",
  // Subscriptions
  "netflix": "Subscriptions",
  "spotify": "Subscriptions",
  "disney": "Subscriptions",
  "apple": "Subscriptions",
  "google": "Subscriptions",
}

// Try to extract category from description
export function suggestCategoryFromDescription(description: string): string | null {
  const lowerDesc = description.toLowerCase()
  for (const [merchant, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (lowerDesc.includes(merchant)) {
      return category
    }
  }
  return null
}

// =====================================================
// TIER 11: AI Chat UX Enhancements
// =====================================================

// Response Speed Types
export const RESPONSE_SPEEDS = ["fast", "balanced", "detailed"] as const
export type ResponseSpeed = (typeof RESPONSE_SPEEDS)[number]

// Personality Types
export const PERSONALITIES = ["formal", "balanced", "casual"] as const
export type Personality = (typeof PERSONALITIES)[number]

// Supported Languages
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Espa\u00F1ol" },
  { code: "fr", name: "Fran\u00E7ais" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Portugu\u00EAs" },
  { code: "zh", name: "\u4E2D\u6587" },
  { code: "ja", name: "\u65E5\u672C\u8A9E" },
  { code: "ko", name: "\uD55C\uAD6D\uC5B4" },
  { code: "ar", name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { code: "hi", name: "\u0939\u093F\u0928\u094D\u0926\u0940" },
] as const
export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(l => l.code)
export type LanguageCode = (typeof LANGUAGE_CODES)[number]

// Chat Settings Schema
export const chatSettingsSchema = z.object({
  response_speed: z.enum(RESPONSE_SPEEDS).default("balanced"),
  language: z.string().default("en"),
  personality: z.enum(PERSONALITIES).default("balanced"),
  show_templates: z.boolean().default(true),
  auto_speak: z.boolean().default(false),
})

export type ChatSettingsInput = z.infer<typeof chatSettingsSchema>

export type ChatSettings = {
  id: string
  user_id: string
  response_speed: ResponseSpeed
  language: string
  personality: Personality
  show_templates: boolean
  auto_speak: boolean
  created_at: string
  updated_at: string
}

// Message Reaction Types
export const REACTION_TYPES = ["thumbs_up", "thumbs_down"] as const
export type ReactionType = (typeof REACTION_TYPES)[number]

export const messageReactionSchema = z.object({
  message_id: z.string().uuid(),
  reaction_type: z.enum(REACTION_TYPES),
  feedback_text: z.string().max(500).optional(),
})

export type MessageReactionInput = z.infer<typeof messageReactionSchema>

export type MessageReaction = {
  id: string
  user_id: string
  message_id: string
  reaction_type: ReactionType
  feedback_text: string | null
  created_at: string
}

// Template Categories
export const TEMPLATE_CATEGORIES = [
  "general",
  "transactions",
  "budgets",
  "goals",
  "bills",
  "reports",
  "analysis",
] as const
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

// Conversation Template Schema
export const conversationTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  prompt: z.string().min(1).max(1000),
  category: z.enum(TEMPLATE_CATEGORIES).default("general"),
  icon: z.string().max(50).optional(),
})

export type ConversationTemplateInput = z.infer<typeof conversationTemplateSchema>

export type ConversationTemplate = {
  id: string
  user_id: string | null
  title: string
  description: string | null
  prompt: string
  category: TemplateCategory
  icon: string | null
  is_system: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

// Chat Export Types
export const EXPORT_TYPES = ["text", "pdf", "json"] as const
export type ExportType = (typeof EXPORT_TYPES)[number]

export const chatExportSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  export_type: z.enum(EXPORT_TYPES),
})

export type ChatExportInput = z.infer<typeof chatExportSchema>

export type ChatExport = {
  id: string
  user_id: string
  conversation_id: string | null
  export_type: ExportType
  file_name: string
  file_size: number | null
  created_at: string
}

// Extended conversation type with pinning
export type ChatConversation = {
  id: string
  user_id: string
  title: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

// Prompt instruction templates by settings
export const RESPONSE_SPEED_INSTRUCTIONS: Record<ResponseSpeed, string> = {
  fast: "Be extremely concise. Use short sentences. Skip explanations unless asked. Get straight to the point.",
  balanced: "Provide clear, helpful responses with brief explanations when useful. Balance detail with brevity.",
  detailed: "Provide comprehensive, detailed responses. Include explanations, examples, and context. Be thorough.",
}

export const PERSONALITY_INSTRUCTIONS: Record<Personality, string> = {
  formal: "Use professional, formal language. Avoid casual expressions. Be polite and business-like.",
  balanced: "Be friendly and professional. Use conversational but appropriate language.",
  casual: "Be relaxed and friendly. Use casual language, contractions, and occasional humor. Keep it light.",
}

export const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "Respond in English.",
  es: "Responde en espa\u00F1ol.",
  fr: "R\u00E9pondez en fran\u00E7ais.",
  de: "Antworten Sie auf Deutsch.",
  pt: "Responda em portugu\u00EAs.",
  zh: "\u8BF7\u7528\u4E2D\u6587\u56DE\u590D\u3002",
  ja: "\u65E5\u672C\u8A9E\u3067\u8FD4\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  ko: "\uD55C\uAD6D\uC5B4\uB85C \uB2F5\uBCC0\uD574 \uC8FC\uC138\uC694.",
  ar: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u0644\u0631\u062F \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629.",
  hi: "\u0915\u0943\u092A\u092F\u093E \u0939\u093F\u0928\u094D\u0926\u0940 \u092E\u0947\u0902 \u0909\u0924\u094D\u0924\u0930 \u0926\u0947\u0902\u0964",
}
