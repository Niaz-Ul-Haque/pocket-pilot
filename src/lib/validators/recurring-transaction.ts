import { z } from "zod"

// ============================================================================
// RECURRING TRANSACTION FREQUENCY
// ============================================================================

export const RECURRING_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
] as const
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  yearly: "Yearly",
}

// ============================================================================
// RECURRING TRANSACTION SCHEMAS
// ============================================================================

// Schema for creating a recurring transaction
export const recurringTransactionSchema = z.object({
  account_id: z.string().uuid("Please select an account"),
  category_id: z.string().uuid().nullable().optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be 255 characters or less"),
  amount: z
    .number()
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  type: z.enum(["expense", "income"], {
    message: "Please select a transaction type",
  }),
  frequency: z.enum(RECURRING_FREQUENCIES, {
    message: "Please select a frequency",
  }),
  next_occurrence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
})

// Schema for updating a recurring transaction
export const recurringTransactionUpdateSchema = z.object({
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be 255 characters or less")
    .optional(),
  amount: z
    .number()
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .optional(),
  frequency: z.enum(RECURRING_FREQUENCIES).optional(),
  next_occurrence_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
  is_active: z.boolean().optional(),
})

// Type inferred from create schema (form input)
export type RecurringTransactionFormInput = z.input<typeof recurringTransactionSchema>
// Type inferred from create schema (form output)
export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>

// Full recurring transaction type including database fields
export type RecurringTransaction = {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  description: string
  amount: number  // Signed: negative = expense, positive = income
  frequency: RecurringFrequency
  next_occurrence_date: string
  last_created_date: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

// Recurring transaction with related names for display
export type RecurringTransactionWithDetails = RecurringTransaction & {
  account_name: string | null
  category_name: string | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate next occurrence date based on frequency
 */
export function calculateNextOccurrence(
  currentDate: string,
  frequency: RecurringFrequency
): string {
  const date = new Date(currentDate)

  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7)
      break
    case "biweekly":
      date.setDate(date.getDate() + 14)
      break
    case "monthly":
      date.setMonth(date.getMonth() + 1)
      break
    case "yearly":
      date.setFullYear(date.getFullYear() + 1)
      break
  }

  return date.toISOString().split("T")[0]
}

/**
 * Check if a recurring transaction is due for generation
 */
export function isDueForGeneration(nextOccurrenceDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const occurrenceDate = new Date(nextOccurrenceDate)
  occurrenceDate.setHours(0, 0, 0, 0)

  return occurrenceDate <= today
}

/**
 * Get days until next occurrence
 */
export function getDaysUntilOccurrence(nextOccurrenceDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const occurrenceDate = new Date(nextOccurrenceDate)
  occurrenceDate.setHours(0, 0, 0, 0)

  const diffTime = occurrenceDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Math.abs(amount))
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Get transaction type from signed amount
 */
export function getTransactionType(amount: number): "expense" | "income" {
  return amount < 0 ? "expense" : "income"
}

/**
 * Convert form amount to signed database amount
 */
export function toSignedAmount(amount: number, type: "expense" | "income"): number {
  return type === "expense" ? -Math.abs(amount) : Math.abs(amount)
}
