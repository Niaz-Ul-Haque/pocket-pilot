import { z } from "zod"

// ============================================================================
// GOAL SCHEMAS
// ============================================================================

// Schema for creating a goal
export const goalSchema = z.object({
  name: z
    .string()
    .min(1, "Goal name is required")
    .max(100, "Goal name must be 100 characters or less"),
  target_amount: z
    .number({ message: "Target amount is required" })
    .positive("Target amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  current_amount: z
    .number()
    .min(0, "Current amount cannot be negative")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .optional(),
  target_date: z.string().nullable().optional(),
})

// Schema for updating a goal
export const goalUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Goal name is required")
    .max(100, "Goal name must be 100 characters or less")
    .optional(),
  target_amount: z
    .number()
    .positive("Target amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .optional(),
  target_date: z.string().nullable().optional(),
})

// Type inferred from create schema (form data)
export type GoalFormData = z.infer<typeof goalSchema>

// Full goal type including database fields
export type Goal = {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

// Goal with calculated fields
export type GoalWithDetails = Goal & {
  percentage: number
  remaining: number
  monthly_required: number | null
  is_overdue: boolean
}

// ============================================================================
// CONTRIBUTION SCHEMAS
// ============================================================================

// Schema for creating a contribution
export const contributionSchema = z.object({
  goal_id: z.string().uuid("Please select a goal"),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  note: z.string().max(255, "Note must be 255 characters or less").optional(),
})

// Type inferred from contribution schema
export type ContributionFormData = z.infer<typeof contributionSchema>

// Full contribution type including database fields
export type Contribution = {
  id: string
  user_id: string
  goal_id: string
  amount: number
  date: string
  note: string | null
  created_at: string
}

// Contribution with goal name for display
export type ContributionWithGoal = Contribution & {
  goal_name: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate goal details including percentage, remaining, and monthly required
 */
export function calculateGoalDetails(goal: Goal): GoalWithDetails {
  const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0)
  
  let monthly_required: number | null = null
  let is_overdue = false
  
  if (goal.target_date && !goal.is_completed) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(goal.target_date)
    
    if (targetDate < today) {
      is_overdue = true
    } else {
      // Calculate months remaining
      const monthsDiff = 
        (targetDate.getFullYear() - today.getFullYear()) * 12 +
        (targetDate.getMonth() - today.getMonth())
      
      if (monthsDiff > 0 && remaining > 0) {
        monthly_required = remaining / monthsDiff
      }
    }
  }
  
  return {
    ...goal,
    percentage,
    remaining,
    monthly_required,
    is_overdue,
  }
}

/**
 * Get status color based on goal progress
 */
export function getGoalStatusColor(goal: GoalWithDetails): string {
  if (goal.is_completed) {
    return "text-green-600 dark:text-green-400"
  }
  if (goal.is_overdue) {
    return "text-red-600 dark:text-red-400"
  }
  if (goal.percentage >= 75) {
    return "text-green-600 dark:text-green-400"
  }
  if (goal.percentage >= 50) {
    return "text-blue-600 dark:text-blue-400"
  }
  return "text-muted-foreground"
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount)
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
