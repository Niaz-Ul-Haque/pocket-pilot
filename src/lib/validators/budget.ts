import { z } from "zod"

// Budget periods - now supporting flexible periods
export const BUDGET_PERIODS = ["MONTHLY", "WEEKLY", "BIWEEKLY", "YEARLY"] as const
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number]

// Budget period display labels
export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  MONTHLY: "Monthly",
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  YEARLY: "Yearly",
}

// Default alert thresholds
export const DEFAULT_ALERT_THRESHOLD = 90
export const ALERT_THRESHOLD_MIN = 0
export const ALERT_THRESHOLD_MAX = 100

// Schema for creating a budget
export const budgetSchema = z.object({
  category_id: z.string().uuid("Please select a category"),
  amount: z
    .number({ message: "Budget amount is required" })
    .positive("Budget must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  rollover: z.boolean().default(false),
  period: z.enum(BUDGET_PERIODS).default("MONTHLY"),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
  alert_threshold: z
    .number()
    .int("Alert threshold must be a whole number")
    .min(ALERT_THRESHOLD_MIN, `Alert threshold must be at least ${ALERT_THRESHOLD_MIN}%`)
    .max(ALERT_THRESHOLD_MAX, `Alert threshold cannot exceed ${ALERT_THRESHOLD_MAX}%`)
    .default(DEFAULT_ALERT_THRESHOLD),
  year: z.number().int().min(2000).max(2100).optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
})

// Schema for updating a budget
export const budgetUpdateSchema = z.object({
  amount: z
    .number({ message: "Budget amount is required" })
    .positive("Budget must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .optional(),
  rollover: z.boolean().optional(),
  period: z.enum(BUDGET_PERIODS).optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
  alert_threshold: z
    .number()
    .int("Alert threshold must be a whole number")
    .min(ALERT_THRESHOLD_MIN)
    .max(ALERT_THRESHOLD_MAX)
    .optional(),
  year: z.number().int().min(2000).max(2100).optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
})

// Schema for copying budgets forward
export const budgetCopyForwardSchema = z.object({
  source_year: z.number().int().min(2000).max(2100),
  source_month: z.number().int().min(1).max(12),
  target_year: z.number().int().min(2000).max(2100),
  target_month: z.number().int().min(1).max(12),
  include_amounts: z.boolean().default(true),
  include_notes: z.boolean().default(true),
})

// Schema for budget vs actual report
export const budgetReportSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  category_ids: z.array(z.string().uuid()).optional(),
  period: z.enum(BUDGET_PERIODS).optional(),
})

// Type inferred from create schema (form data)
// Use z.input for form data since we want the pre-default type
export type BudgetFormData = z.input<typeof budgetSchema>

// Full budget type including database fields
export type Budget = {
  id: string
  user_id: string
  category_id: string
  amount: number
  period: BudgetPeriod
  rollover: boolean
  notes: string | null
  alert_threshold: number
  year: number | null
  month: number | null
  created_at: string
}

// Budget copy forward form data
export type BudgetCopyForwardData = z.infer<typeof budgetCopyForwardSchema>

// Budget report form data
export type BudgetReportData = z.infer<typeof budgetReportSchema>

// Budget with joined category data and calculated spent
export type BudgetWithDetails = Budget & {
  category_name: string
  category_type: string
  spent: number
  remaining: number
  percentage: number
  rollover_amount?: number // Amount carried over from previous month
  effective_budget?: number // Budget + rollover
}

// Get budget status based on percentage
export type BudgetStatus = "safe" | "warning" | "over"

/**
 * Get budget status based on percentage and custom alert threshold
 * @param percentage - Current spending percentage
 * @param alertThreshold - Custom threshold for warning (default 90)
 */
export function getBudgetStatus(
  percentage: number,
  alertThreshold: number = DEFAULT_ALERT_THRESHOLD
): BudgetStatus {
  if (percentage >= 100) return "over"
  if (percentage >= alertThreshold) return "warning"
  return "safe"
}

// Budget vs Actual report types
export type BudgetVsActualItem = {
  category_id: string
  category_name: string
  budgeted: number
  actual: number
  variance: number
  variance_percentage: number
  status: BudgetStatus
}

export type BudgetVsActualReport = {
  period: {
    start: string
    end: string
  }
  summary: {
    total_budgeted: number
    total_actual: number
    total_variance: number
    overall_status: BudgetStatus
  }
  items: BudgetVsActualItem[]
}

// Get status color classes
export function getBudgetStatusColor(status: BudgetStatus): {
  bg: string
  text: string
  progress: string
} {
  switch (status) {
    case "over":
      return {
        bg: "bg-red-50 dark:bg-red-950/30",
        text: "text-red-600 dark:text-red-400",
        progress: "bg-red-500",
      }
    case "warning":
      return {
        bg: "bg-yellow-50 dark:bg-yellow-950/30",
        text: "text-yellow-600 dark:text-yellow-400",
        progress: "bg-yellow-500",
      }
    default:
      return {
        bg: "bg-green-50 dark:bg-green-950/30",
        text: "text-green-600 dark:text-green-400",
        progress: "bg-green-500",
      }
  }
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount)
}

// Calculate budget details from raw data
export function calculateBudgetDetails(
  budget: Budget & { category_name: string; category_type: string },
  spent: number,
  rolloverAmount?: number
): BudgetWithDetails {
  // If rollover is enabled and there's a rollover amount, add it to effective budget
  const effectiveBudget = budget.rollover && rolloverAmount
    ? budget.amount + rolloverAmount
    : budget.amount

  const remaining = effectiveBudget - spent
  const percentage = effectiveBudget > 0 ? (spent / effectiveBudget) * 100 : 0

  return {
    ...budget,
    spent,
    remaining,
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    rollover_amount: budget.rollover ? rolloverAmount : undefined,
    effective_budget: budget.rollover && rolloverAmount ? effectiveBudget : undefined,
  }
}
