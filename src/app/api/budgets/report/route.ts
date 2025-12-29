import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  budgetReportSchema,
  getBudgetStatus,
  type BudgetVsActualItem,
  type BudgetVsActualReport,
  DEFAULT_ALERT_THRESHOLD,
} from "@/lib/validators/budget"

/**
 * GET /api/budgets/report
 * Generate budget vs actual report for a date range
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const start_date = searchParams.get("start_date")
  const end_date = searchParams.get("end_date")
  const category_ids = searchParams.get("category_ids")
  const period = searchParams.get("period")

  // Validate parameters
  const validationResult = budgetReportSchema.safeParse({
    start_date,
    end_date,
    category_ids: category_ids ? category_ids.split(",") : undefined,
    period: period || undefined,
  })

  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const params = validationResult.data

  // Fetch budgets with category info
  let budgetsQuery = supabaseAdmin
    .from("budgets")
    .select(`
      *,
      categories!inner(id, name, type)
    `)
    .eq("user_id", session.user.id)

  if (params.category_ids && params.category_ids.length > 0) {
    budgetsQuery = budgetsQuery.in("category_id", params.category_ids)
  }

  if (params.period) {
    budgetsQuery = budgetsQuery.eq("period", params.period)
  }

  const { data: budgets, error: budgetsError } = await budgetsQuery

  if (budgetsError) {
    console.error("Failed to fetch budgets:", budgetsError)
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    )
  }

  if (!budgets || budgets.length === 0) {
    return NextResponse.json({
      period: { start: params.start_date, end: params.end_date },
      summary: {
        total_budgeted: 0,
        total_actual: 0,
        total_variance: 0,
        overall_status: "safe" as const,
      },
      items: [],
    })
  }

  // Fetch spending for the period
  const categoryIds = budgets.map((b) => b.category_id)
  const { data: transactions, error: transactionsError } = await supabaseAdmin
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", session.user.id)
    .in("category_id", categoryIds)
    .lt("amount", 0) // Only expenses
    .gte("date", params.start_date)
    .lte("date", params.end_date)

  if (transactionsError) {
    console.error("Failed to fetch transactions:", transactionsError)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }

  // Calculate spending by category
  const spentByCategory: Record<string, number> = {}
  for (const t of transactions || []) {
    if (t.category_id) {
      spentByCategory[t.category_id] =
        (spentByCategory[t.category_id] || 0) + Math.abs(t.amount)
    }
  }

  // Calculate number of months in the period for prorating yearly/monthly budgets
  const startDate = new Date(params.start_date)
  const endDate = new Date(params.end_date)
  const monthsDiff =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1

  // Build report items
  const items: BudgetVsActualItem[] = []
  let totalBudgeted = 0
  let totalActual = 0

  for (const budget of budgets) {
    // Calculate prorated budget based on period
    let budgeted = budget.amount
    if (budget.period === "YEARLY") {
      budgeted = (budget.amount / 12) * monthsDiff
    } else if (budget.period === "WEEKLY") {
      // Approximate weeks in the period
      const daysDiff =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
      const weeks = daysDiff / 7
      budgeted = budget.amount * weeks
    } else if (budget.period === "BIWEEKLY") {
      const daysDiff =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
      const biweeks = daysDiff / 14
      budgeted = budget.amount * biweeks
    } else {
      // MONTHLY - prorate by number of months
      budgeted = budget.amount * monthsDiff
    }

    budgeted = Math.round(budgeted * 100) / 100
    const actual = spentByCategory[budget.category_id] || 0
    const variance = budgeted - actual
    const variancePercentage =
      budgeted > 0 ? ((actual / budgeted) * 100) : actual > 0 ? 100 : 0

    totalBudgeted += budgeted
    totalActual += actual

    items.push({
      category_id: budget.category_id,
      category_name: budget.categories?.name || "Unknown",
      budgeted,
      actual,
      variance,
      variance_percentage: Math.round(variancePercentage * 10) / 10,
      status: getBudgetStatus(
        variancePercentage,
        budget.alert_threshold ?? DEFAULT_ALERT_THRESHOLD
      ),
    })
  }

  // Sort by variance percentage (highest overspending first)
  items.sort((a, b) => b.variance_percentage - a.variance_percentage)

  // Calculate overall status
  const overallPercentage =
    totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0

  const report: BudgetVsActualReport = {
    period: { start: params.start_date, end: params.end_date },
    summary: {
      total_budgeted: Math.round(totalBudgeted * 100) / 100,
      total_actual: Math.round(totalActual * 100) / 100,
      total_variance: Math.round((totalBudgeted - totalActual) * 100) / 100,
      overall_status: getBudgetStatus(overallPercentage),
    },
    items,
  }

  return NextResponse.json(report)
}
