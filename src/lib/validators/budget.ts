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
})

// Schema for updating a budget (only amount can be updated)
export const budgetUpdateSchema = z.object({
  amount: z
    .number({ message: "Budget amount is required" })
    .positive("Budget must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
})

// Type inferred from create schema (form data)
export type BudgetFormData = z.infer<typeof budgetSchema>

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
  spent: number
): BudgetWithDetails {
  const remaining = budget.amount - spent
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

  return {
    ...budget,
    spent,
    remaining,
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
  }
}
