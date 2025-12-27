import { z } from "zod"

// Budgeting frameworks
export const BUDGETING_FRAMEWORKS = ["basic", "50-30-20", "tracking-only"] as const
export type BudgetingFramework = (typeof BUDGETING_FRAMEWORKS)[number]

// Framework labels for display
export const FRAMEWORK_LABELS: Record<BudgetingFramework, string> = {
  "basic": "Basic Budget",
  "50-30-20": "50/30/20 Rule",
  "tracking-only": "Just Track Spending",
}

// Framework descriptions
export const FRAMEWORK_DESCRIPTIONS: Record<BudgetingFramework, string> = {
  "basic": "Set custom budgets for each category",
  "50-30-20": "50% Needs, 30% Wants, 20% Savings",
  "tracking-only": "Track spending without budget limits",
}

// Schema for onboarding
export const onboardingSchema = z.object({
  budgeting_framework: z.enum(BUDGETING_FRAMEWORKS, {
    message: "Please select a budgeting approach",
  }),
  display_name: z.string().min(1, "Name is required").max(100),
  create_default_account: z.boolean().optional(),
  default_account_name: z.string().max(100).optional(),
  default_account_type: z.string().optional(),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>

// Schema for profile update
export const profileUpdateSchema = z.object({
  display_name: z.string().min(1, "Name is required").max(100).optional(),
  budgeting_framework: z.enum(BUDGETING_FRAMEWORKS).optional(),
})

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>

// Full user profile type
export type UserProfile = {
  id: string
  user_id: string
  has_completed_onboarding: boolean
  budgeting_framework: BudgetingFramework | null
  display_name: string | null
  currency: string
  created_at: string
  updated_at: string
}

// Default categories by framework
export const DEFAULT_CATEGORIES_BY_FRAMEWORK: Record<BudgetingFramework, Array<{ name: string; type: "expense" | "income" }>> = {
  "basic": [
    { name: "Housing", type: "expense" },
    { name: "Utilities", type: "expense" },
    { name: "Groceries", type: "expense" },
    { name: "Transportation", type: "expense" },
    { name: "Dining Out", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Healthcare", type: "expense" },
    { name: "Personal Care", type: "expense" },
    { name: "Subscriptions", type: "expense" },
    { name: "Salary", type: "income" },
    { name: "Other Income", type: "income" },
  ],
  "50-30-20": [
    // Needs (50%)
    { name: "Housing", type: "expense" },
    { name: "Utilities", type: "expense" },
    { name: "Groceries", type: "expense" },
    { name: "Transportation", type: "expense" },
    { name: "Insurance", type: "expense" },
    { name: "Healthcare", type: "expense" },
    // Wants (30%)
    { name: "Dining Out", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Subscriptions", type: "expense" },
    { name: "Travel", type: "expense" },
    // Savings (20%)
    { name: "Savings", type: "expense" },
    { name: "Investments", type: "expense" },
    // Income
    { name: "Salary", type: "income" },
    { name: "Other Income", type: "income" },
  ],
  "tracking-only": [
    { name: "Housing", type: "expense" },
    { name: "Utilities", type: "expense" },
    { name: "Groceries", type: "expense" },
    { name: "Transportation", type: "expense" },
    { name: "Dining Out", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Healthcare", type: "expense" },
    { name: "Other", type: "expense" },
    { name: "Salary", type: "income" },
    { name: "Other Income", type: "income" },
  ],
}
