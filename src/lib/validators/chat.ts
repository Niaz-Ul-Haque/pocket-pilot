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
