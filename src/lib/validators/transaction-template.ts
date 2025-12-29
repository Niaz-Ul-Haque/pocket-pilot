import { z } from "zod"
import { TRANSACTION_TYPES, type TransactionType } from "./transaction"

// Base fields for transaction template
const transactionTemplateBase = {
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name is too long")
    .trim(),
  account_id: z.string().uuid("Please select an account"),
  category_id: z.string().uuid("Please select a category").optional().nullable(),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  type: z.enum(["expense", "income"] as const, {
    message: "Please select a transaction type",
  }),
  description: z.string().max(255, "Description is too long").optional().nullable(),
}

// Schema for API requests (defaults applied server-side)
export const transactionTemplateSchema = z.object({
  ...transactionTemplateBase,
  is_favorite: z.boolean().default(false),
  tag_ids: z.array(z.string().uuid()).default([]),
})

// Schema for form with required fields (no defaults)
export const transactionTemplateFormSchema = z.object({
  ...transactionTemplateBase,
  is_favorite: z.boolean(),
  tag_ids: z.array(z.string().uuid()),
})

// Schema for updating a transaction template
export const transactionTemplateUpdateSchema = transactionTemplateSchema.partial()

// Type for form (all fields required)
export type TransactionTemplateFormData = z.infer<typeof transactionTemplateFormSchema>

// Full transaction template type including database fields
export type TransactionTemplate = {
  id: string
  user_id: string
  name: string
  account_id: string
  category_id: string | null
  amount: number
  type: "expense" | "income"
  description: string | null
  is_favorite: boolean
  usage_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

// Template with joined data for display
export type TransactionTemplateWithDetails = TransactionTemplate & {
  account_name?: string
  category_name?: string
  tags?: Array<{ id: string; name: string; color: string }>
}

// Schema for applying a template (creating a transaction from it)
export const applyTemplateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine(
      (date) => {
        const inputDate = new Date(date)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        return inputDate <= today
      },
      { message: "Future dates are not allowed" }
    ),
  amount_override: z
    .number()
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .optional()
    .nullable(),
  description_override: z
    .string()
    .max(255, "Description is too long")
    .optional()
    .nullable(),
})

export type ApplyTemplateFormData = z.infer<typeof applyTemplateSchema>

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayString(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * Get default values for the apply template form
 */
export function getDefaultApplyTemplateValues(): Partial<ApplyTemplateFormData> {
  return {
    date: getTodayString(),
  }
}
