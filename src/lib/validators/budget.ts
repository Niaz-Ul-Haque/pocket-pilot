import { z } from "zod"

// Budget periods (MVP: MONTHLY only)
export const BUDGET_PERIODS = ["MONTHLY"] as const
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number]

// Schema for creating a budget
export const budgetSchema = z.object({
  category_id: z.string().uuid("Please select a category"),
  amount: z
    .number({ message: "Budget amount is required" })
    .positive("Budget must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  rollover: z.boolean().default(false),
})

// Schema for updating a budget
export const budgetUpdateSchema = z.object({
  amount: z
    .number({ message: "Budget amount is required" })
    .positive("Budget must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  rollover: z.boolean().optional(),
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
  created_at: string
}

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

export function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 100) return "over"
  if (percentage >= 90) return "warning"
  return "safe"
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
