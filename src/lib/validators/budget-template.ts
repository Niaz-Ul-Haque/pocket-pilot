import { z } from "zod"

// Budget template types
export const TEMPLATE_TYPES = [
  "FIFTY_THIRTY_TWENTY",
  "ENVELOPE",
  "ZERO_BASED",
  "CUSTOM",
] as const
export type TemplateType = (typeof TEMPLATE_TYPES)[number]

// Template type display names
export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  FIFTY_THIRTY_TWENTY: "50/30/20 Rule",
  ENVELOPE: "Envelope Method",
  ZERO_BASED: "Zero-Based Budget",
  CUSTOM: "Custom Template",
}

// Template type descriptions
export const TEMPLATE_TYPE_DESCRIPTIONS: Record<TemplateType, string> = {
  FIFTY_THIRTY_TWENTY:
    "Allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment.",
  ENVELOPE:
    "Assign specific amounts to spending categories like physical cash envelopes.",
  ZERO_BASED:
    "Assign every dollar a purpose. Income minus expenses equals zero.",
  CUSTOM: "Create your own budget allocation strategy.",
}

// Schema for a template item (allocation)
export const budgetTemplateItemSchema = z.object({
  category_name: z.string().min(1, "Category name is required").max(100),
  percentage: z
    .number()
    .min(0, "Percentage must be 0 or greater")
    .max(100, "Percentage cannot exceed 100")
    .optional()
    .nullable(),
  fixed_amount: z
    .number()
    .min(0, "Amount must be 0 or greater")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
})

// Ensure either percentage or fixed_amount is provided
export const budgetTemplateItemWithValidation = budgetTemplateItemSchema.refine(
  (data) => {
    const hasPercentage = data.percentage !== null && data.percentage !== undefined
    const hasFixedAmount = data.fixed_amount !== null && data.fixed_amount !== undefined
    return hasPercentage !== hasFixedAmount // XOR - exactly one must be set
  },
  {
    message: "Provide either a percentage or a fixed amount, not both",
  }
)

// Schema for creating a template
export const createBudgetTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  template_type: z.enum(TEMPLATE_TYPES).default("CUSTOM"),
  items: z.array(budgetTemplateItemSchema).min(1, "At least one budget item is required"),
})

// Schema for updating a template
export const updateBudgetTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  items: z.array(budgetTemplateItemSchema).min(1).optional(),
})

// Schema for applying a template
export const applyBudgetTemplateSchema = z.object({
  template_id: z.string().uuid("Invalid template ID"),
  monthly_income: z
    .number()
    .positive("Monthly income must be greater than 0")
    .optional(),
  category_mappings: z
    .record(z.string(), z.string().uuid())
    .optional()
    .describe("Map template category names to actual category IDs"),
  period: z.enum(["MONTHLY", "WEEKLY", "BIWEEKLY", "YEARLY"]).default("MONTHLY"),
  replace_existing: z.boolean().default(false),
})

// Types
export type BudgetTemplateItem = {
  id: string
  template_id: string
  category_name: string
  percentage: number | null
  fixed_amount: number | null
  notes: string | null
  created_at: string
}

export type BudgetTemplate = {
  id: string
  user_id: string | null
  name: string
  description: string | null
  is_system: boolean
  template_type: TemplateType
  created_at: string
  updated_at: string
}

export type BudgetTemplateWithItems = BudgetTemplate & {
  items: BudgetTemplateItem[]
}

export type CreateBudgetTemplateData = z.infer<typeof createBudgetTemplateSchema>
export type UpdateBudgetTemplateData = z.infer<typeof updateBudgetTemplateSchema>
export type ApplyBudgetTemplateData = z.infer<typeof applyBudgetTemplateSchema>

// Utility function to calculate budget amount from percentage
export function calculateBudgetFromPercentage(
  percentage: number,
  monthlyIncome: number
): number {
  return Math.round((percentage / 100) * monthlyIncome * 100) / 100
}

// Utility function to validate template items total percentage
export function validateTemplatePercentageTotal(
  items: Array<{ percentage?: number | null }>
): { valid: boolean; total: number; message?: string } {
  const total = items.reduce((sum, item) => sum + (item.percentage ?? 0), 0)

  if (total > 100) {
    return {
      valid: false,
      total,
      message: `Total percentage (${total}%) exceeds 100%`,
    }
  }

  return { valid: true, total }
}
