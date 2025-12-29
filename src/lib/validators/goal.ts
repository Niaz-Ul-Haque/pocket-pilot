import { z } from "zod"

// ============================================================================
// GOAL CATEGORIES (TIER 6)
// ============================================================================

export const GOAL_CATEGORIES = [
  "emergency",
  "vacation",
  "education",
  "retirement",
  "home",
  "vehicle",
  "wedding",
  "debt_payoff",
  "investment",
  "other",
] as const

export type GoalCategory = (typeof GOAL_CATEGORIES)[number]

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  emergency: "Emergency Fund",
  vacation: "Vacation",
  education: "Education",
  retirement: "Retirement",
  home: "Home",
  vehicle: "Vehicle",
  wedding: "Wedding",
  debt_payoff: "Debt Payoff",
  investment: "Investment",
  other: "Other",
}

export const GOAL_CATEGORY_ICONS: Record<GoalCategory, string> = {
  emergency: "shield",
  vacation: "plane",
  education: "graduation-cap",
  retirement: "sunset",
  home: "home",
  vehicle: "car",
  wedding: "heart",
  debt_payoff: "trending-down",
  investment: "trending-up",
  other: "target",
}

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
  category: z.enum(GOAL_CATEGORIES).default("other"),
  auto_contribute_amount: z
    .number()
    .positive("Auto-contribute amount must be positive")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .nullable()
    .optional(),
  auto_contribute_day: z
    .number()
    .int()
    .min(1, "Day must be between 1 and 28")
    .max(28, "Day must be between 1 and 28")
    .nullable()
    .optional(),
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
  category: z.enum(GOAL_CATEGORIES).optional(),
  auto_contribute_amount: z
    .number()
    .positive("Auto-contribute amount must be positive")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .nullable()
    .optional(),
  auto_contribute_day: z
    .number()
    .int()
    .min(1, "Day must be between 1 and 28")
    .max(28, "Day must be between 1 and 28")
    .nullable()
    .optional(),
  is_shared: z.boolean().optional(),
})

// Type inferred from create schema (form input - with optional fields before defaults)
export type GoalFormInput = z.input<typeof goalSchema>
// Type inferred from create schema (form data - after defaults applied)
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
  category: GoalCategory
  auto_contribute_amount: number | null
  auto_contribute_day: number | null
  share_token: string | null
  is_shared: boolean
  created_at: string
}

// Goal with calculated fields
export type GoalWithDetails = Goal & {
  percentage: number
  remaining: number
  monthly_required: number | null
  is_overdue: boolean
  milestones?: GoalMilestone[]
}

// ============================================================================
// MILESTONE SCHEMAS (TIER 6)
// ============================================================================

export const milestoneSchema = z.object({
  goal_id: z.string().uuid("Please select a goal"),
  name: z
    .string()
    .min(1, "Milestone name is required")
    .max(100, "Milestone name must be 100 characters or less"),
  target_percentage: z
    .number()
    .int()
    .min(1, "Percentage must be between 1 and 100")
    .max(100, "Percentage must be between 1 and 100"),
})

export const milestoneUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Milestone name is required")
    .max(100, "Milestone name must be 100 characters or less")
    .optional(),
  target_percentage: z
    .number()
    .int()
    .min(1, "Percentage must be between 1 and 100")
    .max(100, "Percentage must be between 1 and 100")
    .optional(),
  celebration_shown: z.boolean().optional(),
})

export type MilestoneFormData = z.infer<typeof milestoneSchema>

export type GoalMilestone = {
  id: string
  user_id: string
  goal_id: string
  name: string
  target_amount: number
  target_percentage: number
  is_reached: boolean
  reached_at: string | null
  celebration_shown: boolean
  created_at: string
}

// ============================================================================
// SHARING SCHEMAS (TIER 6)
// ============================================================================

export const shareGoalSchema = z.object({
  is_shared: z.boolean(),
})

export type ShareGoalFormData = z.infer<typeof shareGoalSchema>

// Public goal view (for sharing)
export type PublicGoalView = {
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  category: GoalCategory
  percentage: number
  remaining: number
  is_completed: boolean
  milestones: Array<{
    name: string
    target_percentage: number
    is_reached: boolean
  }>
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
 * Get category color classes
 */
export function getGoalCategoryColor(category: GoalCategory): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<GoalCategory, { bg: string; text: string; border: string }> = {
    emergency: {
      bg: "bg-red-50 dark:bg-red-950/30",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
    },
    vacation: {
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-800",
    },
    education: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
    retirement: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
    },
    home: {
      bg: "bg-green-50 dark:bg-green-950/30",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
    },
    vehicle: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    },
    wedding: {
      bg: "bg-pink-50 dark:bg-pink-950/30",
      text: "text-pink-600 dark:text-pink-400",
      border: "border-pink-200 dark:border-pink-800",
    },
    debt_payoff: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-800",
    },
    investment: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    other: {
      bg: "bg-gray-50 dark:bg-gray-950/30",
      text: "text-gray-600 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-800",
    },
  }
  return colors[category]
}

/**
 * Calculate milestone details
 */
export function calculateMilestoneStatus(
  milestone: GoalMilestone,
  goalCurrentAmount: number,
  goalTargetAmount: number
): GoalMilestone & { currentProgress: number } {
  const milestoneTarget = (milestone.target_percentage / 100) * goalTargetAmount
  const currentProgress = Math.min((goalCurrentAmount / milestoneTarget) * 100, 100)

  return {
    ...milestone,
    target_amount: milestoneTarget,
    currentProgress,
    is_reached: goalCurrentAmount >= milestoneTarget,
  }
}

/**
 * Generate default milestones for a goal
 */
export function generateDefaultMilestones(goalName: string): Array<{ name: string; target_percentage: number }> {
  return [
    { name: "25% Milestone", target_percentage: 25 },
    { name: "Halfway There!", target_percentage: 50 },
    { name: "75% - Almost Done!", target_percentage: 75 },
  ]
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
