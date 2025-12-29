import { z } from "zod"

// ============================================================================
// REPORT TYPES (TIER 7)
// ============================================================================

export const REPORT_TYPES = [
  "custom_date_range",
  "year_over_year",
  "merchant",
  "category_deep_dive",
  "tax_summary",
  "monthly_summary",
  "savings_rate",
] as const

export type ReportType = (typeof REPORT_TYPES)[number]

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  custom_date_range: "Custom Date Range",
  year_over_year: "Year-Over-Year Comparison",
  merchant: "Merchant Spending",
  category_deep_dive: "Category Deep Dive",
  tax_summary: "Tax Summary",
  monthly_summary: "Monthly Summary",
  savings_rate: "Savings Rate",
}

// ============================================================================
// TAX TYPES
// ============================================================================

export const TAX_TYPES = [
  "income",
  "deductible",
  "non_taxable",
  "capital_gains",
  "business_expense",
  "charitable",
] as const

export type TaxType = (typeof TAX_TYPES)[number]

export const TAX_TYPE_LABELS: Record<TaxType, string> = {
  income: "Taxable Income",
  deductible: "Tax Deductible",
  non_taxable: "Non-Taxable",
  capital_gains: "Capital Gains",
  business_expense: "Business Expense",
  charitable: "Charitable Donation",
}

// ============================================================================
// REPORT REQUEST SCHEMAS
// ============================================================================

// Custom Date Range Report
export const customDateRangeReportSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format"),
  include_categories: z.boolean().default(true),
  include_accounts: z.boolean().default(true),
  include_tags: z.boolean().default(false),
  category_ids: z.array(z.string().uuid()).optional(),
  account_ids: z.array(z.string().uuid()).optional(),
})

// Year-Over-Year Report
export const yearOverYearReportSchema = z.object({
  year1: z.number().int().min(2000).max(2100),
  year2: z.number().int().min(2000).max(2100),
  compare_by: z.enum(["month", "quarter"]).default("month"),
})

// Merchant Spending Report
export const merchantReportSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format"),
  min_transactions: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
})

// Category Deep Dive Report
export const categoryDeepDiveSchema = z.object({
  category_id: z.string().uuid("Please select a category"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format").optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format").optional(),
  months: z.number().int().min(1).max(24).default(12),
})

// Monthly Summary Report
export const monthlySummarySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
})

// Tax Summary Report
export const taxSummarySchema = z.object({
  tax_year: z.number().int().min(2000).max(2100),
  include_deductions: z.boolean().default(true),
  include_income: z.boolean().default(true),
})

// Savings Rate Report
export const savingsRateSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format").optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format").optional(),
  months: z.number().int().min(1).max(24).default(12),
})

// Saved Report Schema
export const savedReportSchema = z.object({
  name: z.string().min(1, "Report name is required").max(100),
  report_type: z.enum(REPORT_TYPES),
  parameters: z.record(z.string(), z.unknown()),
})

// ============================================================================
// REPORT RESPONSE TYPES
// ============================================================================

// Custom Date Range Report Response
export type CustomDateRangeReport = {
  start_date: string
  end_date: string
  summary: {
    total_income: number
    total_expenses: number
    net_flow: number
    transaction_count: number
    avg_daily_spending: number
  }
  by_category: Array<{
    category_id: string | null
    category_name: string
    total: number
    transaction_count: number
    percentage: number
  }>
  by_account: Array<{
    account_id: string
    account_name: string
    income: number
    expenses: number
    net: number
  }>
  daily_spending: Array<{
    date: string
    amount: number
  }>
}

// Year-Over-Year Report Response
export type YearOverYearReport = {
  year1: number
  year2: number
  compare_by: "month" | "quarter"
  summary: {
    year1_income: number
    year1_expenses: number
    year2_income: number
    year2_expenses: number
    income_change: number
    income_change_percent: number
    expenses_change: number
    expenses_change_percent: number
  }
  periods: Array<{
    period: string
    period_label: string
    year1_income: number
    year1_expenses: number
    year2_income: number
    year2_expenses: number
  }>
  categories: Array<{
    category_id: string | null
    category_name: string
    year1_total: number
    year2_total: number
    change: number
    change_percent: number
  }>
}

// Merchant Spending Report Response
export type MerchantReport = {
  start_date: string
  end_date: string
  total_spending: number
  merchants: Array<{
    merchant_name: string
    total: number
    transaction_count: number
    avg_transaction: number
    percentage: number
    first_transaction: string
    last_transaction: string
    category_id: string | null
    category_name: string | null
  }>
}

// Category Deep Dive Report Response
export type CategoryDeepDiveReport = {
  category_id: string
  category_name: string
  category_type: "income" | "expense"
  period: {
    start_date: string
    end_date: string
  }
  summary: {
    total: number
    transaction_count: number
    avg_transaction: number
    min_transaction: number
    max_transaction: number
    std_deviation: number
  }
  monthly_trend: Array<{
    month: string
    total: number
    transaction_count: number
    avg_transaction: number
  }>
  by_merchant: Array<{
    merchant_name: string
    total: number
    transaction_count: number
    percentage: number
  }>
  anomalies: Array<{
    transaction_id: string
    date: string
    amount: number
    description: string
    deviation_factor: number
  }>
  insights: {
    trend: "increasing" | "decreasing" | "stable"
    trend_percentage: number
    avg_monthly: number
    projected_annual: number
    peak_month: string
    low_month: string
  }
}

// Monthly Summary Report Response
export type MonthlySummaryReport = {
  year: number
  month: number
  month_name: string
  days_in_month: number
  days_elapsed: number
  summary: {
    total_income: number
    total_expenses: number
    net_flow: number
    savings_rate: number
    transaction_count: number
    avg_daily_spending: number
  }
  comparison_to_previous: {
    income_change: number
    income_change_percent: number
    expenses_change: number
    expenses_change_percent: number
    net_change: number
  }
  top_categories: Array<{
    category_id: string | null
    category_name: string
    total: number
    percentage: number
    vs_budget: number | null
  }>
  budget_status: Array<{
    category_id: string
    category_name: string
    budget_amount: number
    spent: number
    remaining: number
    percentage_used: number
  }>
  daily_spending: Array<{
    date: string
    amount: number
    day_of_week: string
  }>
  goal_progress: Array<{
    goal_id: string
    goal_name: string
    contributed_this_month: number
    current_amount: number
    target_amount: number
    percentage: number
  }>
  bills_summary: {
    paid: number
    upcoming: number
    overdue: number
    total_paid_amount: number
  }
}

// Tax Summary Report Response
export type TaxSummaryReport = {
  tax_year: number
  income: {
    total: number
    by_category: Array<{
      category_id: string | null
      category_name: string
      total: number
      tax_type: TaxType
    }>
  }
  deductions: {
    total: number
    by_category: Array<{
      category_id: string | null
      category_name: string
      total: number
      tax_type: TaxType
    }>
  }
  business_expenses: {
    total: number
    by_category: Array<{
      category_id: string | null
      category_name: string
      total: number
    }>
  }
  charitable_donations: {
    total: number
    transactions: Array<{
      date: string
      description: string
      amount: number
      category_name: string | null
    }>
  }
  quarterly_breakdown: Array<{
    quarter: string
    income: number
    deductions: number
    net: number
  }>
  disclaimer: string
}

// Savings Rate Report Response
export type SavingsRateReport = {
  period: {
    start_date: string
    end_date: string
  }
  overall: {
    total_income: number
    total_expenses: number
    total_savings: number
    savings_rate: number
  }
  monthly: Array<{
    month: string
    income: number
    expenses: number
    savings: number
    savings_rate: number
  }>
  trend: {
    direction: "improving" | "declining" | "stable"
    change_rate: number
    avg_savings_rate: number
    best_month: string
    best_rate: number
    worst_month: string
    worst_rate: number
  }
  goals_impact: {
    total_goal_contributions: number
    goal_contribution_rate: number
  }
}

// Saved Report Type
export type SavedReport = {
  id: string
  user_id: string
  name: string
  report_type: ReportType
  parameters: Record<string, unknown>
  created_at: string
  last_run_at: string | null
}

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type CustomDateRangeReportParams = z.infer<typeof customDateRangeReportSchema>
export type YearOverYearReportParams = z.infer<typeof yearOverYearReportSchema>
export type MerchantReportParams = z.infer<typeof merchantReportSchema>
export type CategoryDeepDiveParams = z.infer<typeof categoryDeepDiveSchema>
export type MonthlySummaryParams = z.infer<typeof monthlySummarySchema>
export type TaxSummaryParams = z.infer<typeof taxSummarySchema>
export type SavingsRateParams = z.infer<typeof savingsRateSchema>
export type SavedReportFormData = z.infer<typeof savedReportSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
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
 * Format month for display
 */
export function formatMonth(dateString: string): string {
  return new Date(dateString + "-01").toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
  })
}

/**
 * Get month name from number
 */
export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  return months[month - 1] ?? ""
}

/**
 * Get quarter label
 */
export function getQuarterLabel(quarter: number): string {
  return `Q${quarter}`
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100
}

/**
 * Get trend color classes
 */
export function getTrendColor(trend: "improving" | "declining" | "stable" | "increasing" | "decreasing"): {
  bg: string
  text: string
  border: string
} {
  switch (trend) {
    case "improving":
    case "increasing":
      return {
        bg: "bg-green-50 dark:bg-green-950/30",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
      }
    case "declining":
    case "decreasing":
      return {
        bg: "bg-red-50 dark:bg-red-950/30",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
      }
    default:
      return {
        bg: "bg-gray-50 dark:bg-gray-950/30",
        text: "text-gray-600 dark:text-gray-400",
        border: "border-gray-200 dark:border-gray-800",
      }
  }
}

/**
 * Get savings rate color based on rate
 */
export function getSavingsRateColor(rate: number): {
  bg: string
  text: string
  border: string
} {
  if (rate >= 20) {
    return {
      bg: "bg-green-50 dark:bg-green-950/30",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
    }
  }
  if (rate >= 10) {
    return {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    }
  }
  if (rate >= 0) {
    return {
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      text: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-800",
    }
  }
  return {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  }
}

/**
 * Get default date range for reports (last 12 months)
 */
export function getDefaultDateRange(): { start_date: string; end_date: string } {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 11)
  start.setDate(1)

  return {
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
  }
}

/**
 * Get current and previous year for YoY reports
 */
export function getDefaultYears(): { year1: number; year2: number } {
  const currentYear = new Date().getFullYear()
  return {
    year1: currentYear - 1,
    year2: currentYear,
  }
}
