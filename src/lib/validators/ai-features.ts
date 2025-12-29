import { z } from "zod"

// AI Memory Types
export const AI_MEMORY_TYPES = ["preference", "context", "learning", "custom"] as const
export type AIMemoryType = (typeof AI_MEMORY_TYPES)[number]

export const aiMemorySchema = z.object({
  memory_type: z.enum(AI_MEMORY_TYPES),
  key: z.string().min(1).max(255),
  value: z.record(z.string(), z.unknown()),
  importance: z.number().min(1).max(10).optional().default(5),
  expires_at: z.string().datetime().optional(),
})

export type AIMemoryInput = z.infer<typeof aiMemorySchema>

export type AIMemory = {
  id: string
  user_id: string
  memory_type: AIMemoryType
  key: string
  value: Record<string, unknown>
  importance: number
  expires_at: string | null
  created_at: string
  updated_at: string
}

// Merchant Mapping Types
export const merchantMappingSchema = z.object({
  raw_merchant: z.string().min(1).max(500),
  normalized_name: z.string().min(1).max(255),
  category_id: z.string().uuid().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().default(1),
  is_user_defined: z.boolean().optional().default(false),
})

export type MerchantMappingInput = z.infer<typeof merchantMappingSchema>

export type MerchantMapping = {
  id: string
  user_id: string
  raw_merchant: string
  normalized_name: string
  category_id: string | null
  confidence: number
  is_user_defined: boolean
  usage_count: number
  last_used_at: string
  created_at: string
}

// Prediction Tracking Types
export const PREDICTION_TYPES = ["category", "amount", "date", "merchant", "budget", "spending"] as const
export type PredictionType = (typeof PREDICTION_TYPES)[number]

export const CORRECTION_SOURCES = ["user", "system", "auto"] as const
export type CorrectionSource = (typeof CORRECTION_SOURCES)[number]

export const predictionTrackingSchema = z.object({
  prediction_type: z.enum(PREDICTION_TYPES),
  predicted_value: z.record(z.string(), z.unknown()),
  actual_value: z.record(z.string(), z.unknown()).optional(),
  is_correct: z.boolean().optional(),
  correction_source: z.enum(CORRECTION_SOURCES).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

export type PredictionTrackingInput = z.infer<typeof predictionTrackingSchema>

export type PredictionTracking = {
  id: string
  user_id: string
  prediction_type: PredictionType
  predicted_value: Record<string, unknown>
  actual_value: Record<string, unknown> | null
  is_correct: boolean | null
  correction_source: CorrectionSource | null
  context: Record<string, unknown> | null
  created_at: string
  resolved_at: string | null
}

// AI Summary Types
export const SUMMARY_TYPES = ["weekly", "monthly"] as const
export type SummaryType = (typeof SUMMARY_TYPES)[number]

export const aiSummarySchema = z.object({
  summary_type: z.enum(SUMMARY_TYPES),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.record(z.string(), z.unknown()),
  highlights: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  health_score: z.number().min(0).max(100).optional(),
})

export type AISummaryInput = z.infer<typeof aiSummarySchema>

export type AISummary = {
  id: string
  user_id: string
  summary_type: SummaryType
  period_start: string
  period_end: string
  content: Record<string, unknown>
  highlights: string[] | null
  recommendations: string[] | null
  health_score: number | null
  is_read: boolean
  pdf_url: string | null
  created_at: string
}

// AI Notification Types
export const AI_NOTIFICATION_TYPES = [
  "spending_alert",
  "budget_warning",
  "goal_reminder",
  "bill_reminder",
  "savings_opportunity",
  "unusual_activity",
  "weekly_insight",
  "monthly_insight",
  "achievement",
  "recommendation",
  "prediction_alert",
] as const
export type AINotificationType = (typeof AI_NOTIFICATION_TYPES)[number]

export const AI_NOTIFICATION_PRIORITIES = ["low", "medium", "high", "critical"] as const
export type AINotificationPriority = (typeof AI_NOTIFICATION_PRIORITIES)[number]

export const aiNotificationSchema = z.object({
  notification_type: z.enum(AI_NOTIFICATION_TYPES),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  priority: z.enum(AI_NOTIFICATION_PRIORITIES).optional().default("medium"),
  data: z.record(z.string(), z.unknown()).optional(),
  action_url: z.string().url().optional(),
  action_label: z.string().max(50).optional(),
  expires_at: z.string().datetime().optional(),
})

export type AINotificationInput = z.infer<typeof aiNotificationSchema>

export type AINotification = {
  id: string
  user_id: string
  notification_type: AINotificationType
  title: string
  message: string
  priority: AINotificationPriority
  data: Record<string, unknown> | null
  action_url: string | null
  action_label: string | null
  is_read: boolean
  is_dismissed: boolean
  expires_at: string | null
  created_at: string
}

// AI Learning Rules Types
export const RULE_TYPES = ["categorization", "merchant", "amount_threshold", "custom"] as const
export type RuleType = (typeof RULE_TYPES)[number]

export const aiLearningRuleSchema = z.object({
  rule_type: z.enum(RULE_TYPES),
  pattern: z.string().min(1).max(500),
  action: z.record(z.string(), z.unknown()),
  priority: z.number().min(1).max(10).optional().default(5),
  is_active: z.boolean().optional().default(true),
})

export type AILearningRuleInput = z.infer<typeof aiLearningRuleSchema>

export type AILearningRule = {
  id: string
  user_id: string
  rule_type: RuleType
  pattern: string
  action: Record<string, unknown>
  priority: number
  is_active: boolean
  match_count: number
  last_matched_at: string | null
  created_at: string
  updated_at: string
}

// Natural Language Search Types
export const naturalLanguageSearchSchema = z.object({
  query: z.string().min(1).max(500),
})

export type NaturalLanguageSearchInput = z.infer<typeof naturalLanguageSearchSchema>

export type SearchHistory = {
  id: string
  user_id: string
  query: string
  parsed_filters: Record<string, unknown> | null
  result_count: number | null
  created_at: string
}

// Parsed search filters from natural language
export interface ParsedSearchFilters {
  merchant?: string
  category?: string
  min_amount?: number
  max_amount?: number
  start_date?: string
  end_date?: string
  description_contains?: string
  account?: string
  type?: "expense" | "income"
  tags?: string[]
}

// Common patterns for natural language parsing
export const NATURAL_LANGUAGE_PATTERNS = {
  // Time patterns
  last_month: /\b(last month)\b/i,
  this_month: /\b(this month)\b/i,
  last_week: /\b(last week)\b/i,
  this_week: /\b(this week)\b/i,
  last_year: /\b(last year)\b/i,
  this_year: /\b(this year)\b/i,
  yesterday: /\b(yesterday)\b/i,
  today: /\b(today)\b/i,
  last_n_days: /\blast (\d+) days?\b/i,

  // Amount patterns
  over: /\b(?:over|more than|above|greater than)\s*\$?(\d+(?:\.\d{2})?)\b/i,
  under: /\b(?:under|less than|below)\s*\$?(\d+(?:\.\d{2})?)\b/i,
  exactly: /\b(?:exactly|for)\s*\$?(\d+(?:\.\d{2})?)\b/i,
  between: /\bbetween\s*\$?(\d+(?:\.\d{2})?)\s*(?:and|-)\s*\$?(\d+(?:\.\d{2})?)\b/i,

  // Type patterns
  expenses: /\b(expense[s]?|spending|spent|paid|bought)\b/i,
  income: /\b(income|earned|received|got paid|salary)\b/i,

  // Merchant patterns
  at_merchant: /\b(?:at|from|to)\s+([A-Za-z\s]+?)(?:\s+(?:last|this|in|for|over|under)|\s*$)/i,

  // Category patterns
  category: /\b(?:in|for|on)\s+([A-Za-z\s]+?)(?:\s+(?:last|this|in|for|over|under|category)|\s*$)/i,
}

// AI Summary Content Structure
export interface WeeklySummaryContent {
  period: {
    start: string
    end: string
  }
  spending: {
    total: number
    byCategory: Array<{ name: string; amount: number; change: number }>
    dailyAverage: number
    peakDay: { date: string; amount: number }
  }
  income: {
    total: number
    sources: Array<{ name: string; amount: number }>
  }
  budgets: {
    onTrack: number
    warning: number
    exceeded: number
    details: Array<{ name: string; spent: number; budget: number; percentage: number }>
  }
  goals: {
    totalProgress: number
    contributions: number
    activeCount: number
    nearCompletion: Array<{ name: string; percentage: number }>
  }
  bills: {
    paid: number
    upcoming: number
    overdue: number
    nextDue: Array<{ name: string; amount: number; dueDate: string }>
  }
  insights: string[]
  healthScore: number
  comparison: {
    vsLastWeek: number
    trend: "up" | "down" | "stable"
  }
}

export interface MonthlySummaryContent extends WeeklySummaryContent {
  savings: {
    rate: number
    amount: number
    trend: "improving" | "declining" | "stable"
  }
  topMerchants: Array<{ name: string; amount: number; count: number }>
  categoryTrends: Array<{ name: string; thisMonth: number; lastMonth: number; change: number }>
  yearToDate: {
    totalSpending: number
    totalIncome: number
    averageMonthlySpending: number
  }
  predictions: {
    nextMonthSpending: number
    endOfYearSavings: number
  }
}

// AI Voice Command Types
export interface VoiceCommand {
  type: "add_expense" | "add_income" | "check_balance" | "check_budget" | "ask_question"
  parameters: Record<string, unknown>
  confidence: number
  rawText: string
}

// AI Export/Import Types
export interface AIExportData {
  version: string
  exportedAt: string
  memory: AIMemory[]
  learningRules: AILearningRule[]
  merchantMappings: MerchantMapping[]
  preferences: Record<string, unknown>
}

export const aiImportSchema = z.object({
  version: z.string(),
  exportedAt: z.string().datetime(),
  memory: z.array(aiMemorySchema).optional(),
  learningRules: z.array(aiLearningRuleSchema).optional(),
  merchantMappings: z.array(merchantMappingSchema).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

export type AIImportInput = z.infer<typeof aiImportSchema>
