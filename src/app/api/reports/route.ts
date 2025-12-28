import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  customDateRangeReportSchema,
  yearOverYearReportSchema,
  merchantReportSchema,
  categoryDeepDiveSchema,
  monthlySummarySchema,
  taxSummarySchema,
  savingsRateSchema,
  type CustomDateRangeReport,
  type YearOverYearReport,
  type MerchantReport,
  type CategoryDeepDiveReport,
  type MonthlySummaryReport,
  type SavingsRateReport,
  type TaxSummaryReport,
  getMonthName,
  calculatePercentageChange,
} from "@/lib/validators/reports"

// Helper to get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// Helper to safely extract name from Supabase join result (handles both array and object)
function getJoinedName(
  data: unknown,
  fallback: string = ""
): string {
  if (!data) return fallback
  if (Array.isArray(data)) {
    return (data[0] as { name?: string })?.name ?? fallback
  }
  return (data as { name?: string })?.name ?? fallback
}

// POST /api/reports - Generate a report
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const reportType = body.report_type as string

    switch (reportType) {
      case "custom_date_range":
        return await generateCustomDateRangeReport(session.user.id, body)
      case "year_over_year":
        return await generateYearOverYearReport(session.user.id, body)
      case "merchant":
        return await generateMerchantReport(session.user.id, body)
      case "category_deep_dive":
        return await generateCategoryDeepDiveReport(session.user.id, body)
      case "monthly_summary":
        return await generateMonthlySummaryReport(session.user.id, body)
      case "tax_summary":
        return await generateTaxSummaryReport(session.user.id, body)
      case "savings_rate":
        return await generateSavingsRateReport(session.user.id, body)
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST /api/reports:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Custom Date Range Report
async function generateCustomDateRangeReport(userId: string, params: unknown) {
  const validation = customDateRangeReportSchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
  }

  const { start_date, end_date, include_categories, include_accounts } = validation.data

  // Fetch transactions in date range
  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select(`
      id, amount, date, description,
      category_id, categories(name),
      account_id, accounts(name)
    `)
    .eq("user_id", userId)
    .gte("date", start_date)
    .lte("date", end_date)
    .order("date", { ascending: true })

  if (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const txns = transactions ?? []
  const totalIncome = txns.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0)
  const totalExpenses = Math.abs(txns.filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + parseFloat(t.amount), 0))
  const netFlow = totalIncome - totalExpenses

  // Calculate days in range
  const daysDiff = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const avgDailySpending = daysDiff > 0 ? totalExpenses / daysDiff : 0

  // Group by category
  const categoryMap = new Map<string, { total: number; count: number; name: string }>()
  for (const t of txns) {
    if (parseFloat(t.amount) >= 0) continue // Only expenses
    const catId = t.category_id || "uncategorized"
    const catName = getJoinedName(t.categories, "Uncategorized")
    const existing = categoryMap.get(catId) || { total: 0, count: 0, name: catName }
    existing.total += Math.abs(parseFloat(t.amount))
    existing.count++
    categoryMap.set(catId, existing)
  }

  const byCategory = include_categories ? Array.from(categoryMap.entries()).map(([id, data]) => ({
    category_id: id === "uncategorized" ? null : id,
    category_name: data.name,
    total: data.total,
    transaction_count: data.count,
    percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
  })).sort((a, b) => b.total - a.total) : []

  // Group by account
  const accountMap = new Map<string, { income: number; expenses: number; name: string }>()
  for (const t of txns) {
    const accId = t.account_id || "unknown"
    const accName = getJoinedName(t.accounts, "Unknown")
    const existing = accountMap.get(accId) || { income: 0, expenses: 0, name: accName }
    const amount = parseFloat(t.amount)
    if (amount > 0) existing.income += amount
    else existing.expenses += Math.abs(amount)
    accountMap.set(accId, existing)
  }

  const byAccount = include_accounts ? Array.from(accountMap.entries()).map(([id, data]) => ({
    account_id: id,
    account_name: data.name,
    income: data.income,
    expenses: data.expenses,
    net: data.income - data.expenses,
  })) : []

  // Daily spending
  const dailyMap = new Map<string, number>()
  for (const t of txns) {
    if (parseFloat(t.amount) >= 0) continue
    const existing = dailyMap.get(t.date) || 0
    dailyMap.set(t.date, existing + Math.abs(parseFloat(t.amount)))
  }

  const dailySpending = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const report: CustomDateRangeReport = {
    start_date,
    end_date,
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_flow: netFlow,
      transaction_count: txns.length,
      avg_daily_spending: avgDailySpending,
    },
    by_category: byCategory,
    by_account: byAccount,
    daily_spending: dailySpending,
  }

  return NextResponse.json(report)
}

// Year-Over-Year Report
async function generateYearOverYearReport(userId: string, params: unknown) {
  const validation = yearOverYearReportSchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
  }

  const { year1, year2, compare_by } = validation.data

  // Fetch transactions for both years
  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select("amount, date, category_id, categories(name)")
    .eq("user_id", userId)
    .gte("date", `${Math.min(year1, year2)}-01-01`)
    .lte("date", `${Math.max(year1, year2)}-12-31`)

  if (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const txns = transactions ?? []

  // Helper to get period key
  const getPeriodKey = (date: string) => {
    const d = new Date(date)
    const month = d.getMonth() + 1
    if (compare_by === "quarter") {
      return `Q${Math.ceil(month / 3)}`
    }
    return month.toString().padStart(2, "0")
  }

  // Group by year and period
  const year1Data = new Map<string, { income: number; expenses: number }>()
  const year2Data = new Map<string, { income: number; expenses: number }>()
  const categoryData = new Map<string, { year1: number; year2: number; name: string }>()

  let year1Income = 0, year1Expenses = 0, year2Income = 0, year2Expenses = 0

  for (const t of txns) {
    const year = new Date(t.date).getFullYear()
    const period = getPeriodKey(t.date)
    const amount = parseFloat(t.amount)
    const isYear1 = year === year1
    const isYear2 = year === year2

    const dataMap = isYear1 ? year1Data : isYear2 ? year2Data : null
    if (!dataMap) continue

    const existing = dataMap.get(period) || { income: 0, expenses: 0 }
    if (amount > 0) {
      existing.income += amount
      if (isYear1) year1Income += amount
      else year2Income += amount
    } else {
      existing.expenses += Math.abs(amount)
      if (isYear1) year1Expenses += Math.abs(amount)
      else year2Expenses += Math.abs(amount)
    }
    dataMap.set(period, existing)

    // Category tracking
    if (amount < 0) {
      const catId = t.category_id || "uncategorized"
      const catName = getJoinedName(t.categories, "Uncategorized")
      const catData = categoryData.get(catId) || { year1: 0, year2: 0, name: catName }
      if (isYear1) catData.year1 += Math.abs(amount)
      else catData.year2 += Math.abs(amount)
      categoryData.set(catId, catData)
    }
  }

  // Build periods array
  const periodKeys = compare_by === "quarter" ? ["Q1", "Q2", "Q3", "Q4"] :
    ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]

  const periods = periodKeys.map(period => {
    const y1 = year1Data.get(period) || { income: 0, expenses: 0 }
    const y2 = year2Data.get(period) || { income: 0, expenses: 0 }
    return {
      period,
      period_label: compare_by === "quarter" ? period : getMonthName(parseInt(period)),
      year1_income: y1.income,
      year1_expenses: y1.expenses,
      year2_income: y2.income,
      year2_expenses: y2.expenses,
    }
  })

  const categories = Array.from(categoryData.entries()).map(([id, data]) => ({
    category_id: id === "uncategorized" ? null : id,
    category_name: data.name,
    year1_total: data.year1,
    year2_total: data.year2,
    change: data.year2 - data.year1,
    change_percent: calculatePercentageChange(data.year1, data.year2),
  })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  const report: YearOverYearReport = {
    year1,
    year2,
    compare_by,
    summary: {
      year1_income: year1Income,
      year1_expenses: year1Expenses,
      year2_income: year2Income,
      year2_expenses: year2Expenses,
      income_change: year2Income - year1Income,
      income_change_percent: calculatePercentageChange(year1Income, year2Income),
      expenses_change: year2Expenses - year1Expenses,
      expenses_change_percent: calculatePercentageChange(year1Expenses, year2Expenses),
    },
    periods,
    categories,
  }

  return NextResponse.json(report)
}

// Merchant Spending Report
async function generateMerchantReport(userId: string, params: unknown) {
  const validation = merchantReportSchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
  }

  const { start_date, end_date, min_transactions, limit } = validation.data

  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select("id, amount, date, description, category_id, categories(name)")
    .eq("user_id", userId)
    .lt("amount", 0) // Expenses only
    .gte("date", start_date)
    .lte("date", end_date)

  if (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const txns = transactions ?? []
  const totalSpending = txns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

  // Group by merchant
  const merchantMap = new Map<string, {
    total: number
    count: number
    first: string
    last: string
    category_id: string | null
    category_name: string | null
  }>()

  for (const t of txns) {
    const merchant = t.description?.trim() || "Unknown"
    const amount = Math.abs(parseFloat(t.amount))
    const existing = merchantMap.get(merchant) || {
      total: 0,
      count: 0,
      first: t.date,
      last: t.date,
      category_id: t.category_id,
      category_name: getJoinedName(t.categories) || null,
    }
    existing.total += amount
    existing.count++
    if (t.date < existing.first) existing.first = t.date
    if (t.date > existing.last) existing.last = t.date
    merchantMap.set(merchant, existing)
  }

  const merchants = Array.from(merchantMap.entries())
    .filter(([, data]) => data.count >= min_transactions)
    .map(([name, data]) => ({
      merchant_name: name,
      total: data.total,
      transaction_count: data.count,
      avg_transaction: data.total / data.count,
      percentage: totalSpending > 0 ? (data.total / totalSpending) * 100 : 0,
      first_transaction: data.first,
      last_transaction: data.last,
      category_id: data.category_id,
      category_name: data.category_name,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  const report: MerchantReport = {
    start_date,
    end_date,
    total_spending: totalSpending,
    merchants,
  }

  return NextResponse.json(report)
}

// Category Deep Dive Report
async function generateCategoryDeepDiveReport(userId: string, params: unknown) {
  const validation = categoryDeepDiveSchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
  }

  const { category_id, months } = validation.data

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months + 1)
  startDate.setDate(1)

  // Fetch category info
  const { data: category, error: catError } = await supabaseAdmin
    .from("categories")
    .select("id, name, type")
    .eq("id", category_id)
    .single()

  if (catError || !category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  // Fetch transactions
  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select("id, amount, date, description")
    .eq("user_id", userId)
    .eq("category_id", category_id)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])

  if (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const txns = transactions ?? []
  const amounts = txns.map(t => Math.abs(parseFloat(t.amount)))
  const total = amounts.reduce((sum, a) => sum + a, 0)
  const avgTransaction = amounts.length > 0 ? total / amounts.length : 0
  const minTransaction = amounts.length > 0 ? Math.min(...amounts) : 0
  const maxTransaction = amounts.length > 0 ? Math.max(...amounts) : 0

  // Calculate standard deviation
  const variance = amounts.length > 0
    ? amounts.reduce((acc, a) => acc + Math.pow(a - avgTransaction, 2), 0) / amounts.length
    : 0
  const stdDeviation = Math.sqrt(variance)

  // Monthly trend
  const monthlyMap = new Map<string, { total: number; count: number }>()
  for (const t of txns) {
    const monthKey = t.date.substring(0, 7)
    const existing = monthlyMap.get(monthKey) || { total: 0, count: 0 }
    existing.total += Math.abs(parseFloat(t.amount))
    existing.count++
    monthlyMap.set(monthKey, existing)
  }

  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      total: data.total,
      transaction_count: data.count,
      avg_transaction: data.total / data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // By merchant
  const merchantMap = new Map<string, { total: number; count: number }>()
  for (const t of txns) {
    const merchant = t.description?.trim() || "Unknown"
    const existing = merchantMap.get(merchant) || { total: 0, count: 0 }
    existing.total += Math.abs(parseFloat(t.amount))
    existing.count++
    merchantMap.set(merchant, existing)
  }

  const byMerchant = Array.from(merchantMap.entries())
    .map(([name, data]) => ({
      merchant_name: name,
      total: data.total,
      transaction_count: data.count,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Detect anomalies (transactions > 2 std deviations from mean)
  const anomalyThreshold = avgTransaction + 2 * stdDeviation
  const anomalies = txns
    .filter(t => Math.abs(parseFloat(t.amount)) > anomalyThreshold)
    .map(t => ({
      transaction_id: t.id,
      date: t.date,
      amount: Math.abs(parseFloat(t.amount)),
      description: t.description || "",
      deviation_factor: stdDeviation > 0 ? (Math.abs(parseFloat(t.amount)) - avgTransaction) / stdDeviation : 0,
    }))
    .sort((a, b) => b.deviation_factor - a.deviation_factor)

  // Calculate trend
  let trend: "increasing" | "decreasing" | "stable" = "stable"
  let trendPercentage = 0
  if (monthlyTrend.length >= 2) {
    const firstHalf = monthlyTrend.slice(0, Math.floor(monthlyTrend.length / 2))
    const secondHalf = monthlyTrend.slice(Math.floor(monthlyTrend.length / 2))
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.total, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.total, 0) / secondHalf.length
    trendPercentage = calculatePercentageChange(firstAvg, secondAvg)
    if (trendPercentage > 10) trend = "increasing"
    else if (trendPercentage < -10) trend = "decreasing"
  }

  const avgMonthly = monthlyTrend.length > 0
    ? monthlyTrend.reduce((sum, m) => sum + m.total, 0) / monthlyTrend.length
    : 0

  const sortedMonths = [...monthlyTrend].sort((a, b) => b.total - a.total)
  const peakMonth = sortedMonths[0]?.month || ""
  const lowMonth = sortedMonths[sortedMonths.length - 1]?.month || ""

  const report: CategoryDeepDiveReport = {
    category_id,
    category_name: category.name,
    category_type: category.type as "income" | "expense",
    period: {
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    },
    summary: {
      total,
      transaction_count: txns.length,
      avg_transaction: avgTransaction,
      min_transaction: minTransaction,
      max_transaction: maxTransaction,
      std_deviation: stdDeviation,
    },
    monthly_trend: monthlyTrend,
    by_merchant: byMerchant,
    anomalies,
    insights: {
      trend,
      trend_percentage: trendPercentage,
      avg_monthly: avgMonthly,
      projected_annual: avgMonthly * 12,
      peak_month: peakMonth,
      low_month: lowMonth,
    },
  }

  return NextResponse.json(report)
}

// Monthly Summary Report
async function generateMonthlySummaryReport(userId: string, params: unknown) {
  const validation = monthlySummarySchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
  }

  const { year, month } = validation.data
  const daysInMonth = getDaysInMonth(year, month)
  const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
  const endDate = `${year}-${month.toString().padStart(2, "0")}-${daysInMonth}`

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth

  // Fetch transactions
  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select("amount, date, category_id, categories(name)")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const txns = transactions ?? []
  const totalIncome = txns.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0)
  const totalExpenses = Math.abs(txns.filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + parseFloat(t.amount), 0))
  const netFlow = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // Previous month comparison
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevDays = getDaysInMonth(prevYear, prevMonth)
  const prevStart = `${prevYear}-${prevMonth.toString().padStart(2, "0")}-01`
  const prevEnd = `${prevYear}-${prevMonth.toString().padStart(2, "0")}-${prevDays}`

  const { data: prevTransactions } = await supabaseAdmin
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", prevStart)
    .lte("date", prevEnd)

  const prevIncome = (prevTransactions ?? []).filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0)
  const prevExpenses = Math.abs((prevTransactions ?? []).filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + parseFloat(t.amount), 0))

  // Top categories
  const categoryMap = new Map<string, { total: number; name: string }>()
  for (const t of txns) {
    if (parseFloat(t.amount) >= 0) continue
    const catId = t.category_id || "uncategorized"
    const catName = getJoinedName(t.categories, "Uncategorized")
    const existing = categoryMap.get(catId) || { total: 0, name: catName }
    existing.total += Math.abs(parseFloat(t.amount))
    categoryMap.set(catId, existing)
  }

  const topCategories = Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      category_id: id === "uncategorized" ? null : id,
      category_name: data.name,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      vs_budget: null,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Budget status
  const { data: budgets } = await supabaseAdmin
    .from("budgets")
    .select("id, amount, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)

  const budgetStatus = (budgets ?? []).map(b => {
    const spent = categoryMap.get(b.category_id)?.total || 0
    const budgetAmount = parseFloat(b.amount)
    return {
      category_id: b.category_id,
      category_name: getJoinedName(b.categories, "Unknown"),
      budget_amount: budgetAmount,
      spent,
      remaining: budgetAmount - spent,
      percentage_used: budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0,
    }
  })

  // Daily spending
  const dailyMap = new Map<string, number>()
  for (const t of txns) {
    if (parseFloat(t.amount) >= 0) continue
    const existing = dailyMap.get(t.date) || 0
    dailyMap.set(t.date, existing + Math.abs(parseFloat(t.amount)))
  }

  const dailySpending = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({
      date,
      amount,
      day_of_week: new Date(date).toLocaleDateString("en-CA", { weekday: "long" }),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Goal progress
  const { data: contributions } = await supabaseAdmin
    .from("goal_contributions")
    .select("goal_id, amount, goals(name, target_amount, current_amount)")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)

  const goalMap = new Map<string, { contributed: number; name: string; target: number; current: number }>()
  for (const c of contributions ?? []) {
    // Handle both array and object response from Supabase join
    const goalsData = c.goals as { name: string; target_amount: string; current_amount: string } | { name: string; target_amount: string; current_amount: string }[] | null
    const goal = Array.isArray(goalsData) ? goalsData[0] : goalsData
    if (!goal) continue
    const existing = goalMap.get(c.goal_id) || {
      contributed: 0,
      name: goal.name,
      target: parseFloat(goal.target_amount),
      current: parseFloat(goal.current_amount),
    }
    existing.contributed += parseFloat(c.amount)
    goalMap.set(c.goal_id, existing)
  }

  const goalProgress = Array.from(goalMap.entries()).map(([id, data]) => ({
    goal_id: id,
    goal_name: data.name,
    contributed_this_month: data.contributed,
    current_amount: data.current,
    target_amount: data.target,
    percentage: data.target > 0 ? (data.current / data.target) * 100 : 0,
  }))

  // Bills summary
  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select("id, amount, next_due_date, last_paid_date")
    .eq("user_id", userId)
    .eq("is_active", true)

  let paidBills = 0, upcomingBills = 0, overdueBills = 0, totalPaidAmount = 0
  for (const b of bills ?? []) {
    const dueDate = new Date(b.next_due_date)
    const lastPaid = b.last_paid_date ? new Date(b.last_paid_date) : null

    if (lastPaid && lastPaid >= new Date(startDate) && lastPaid <= new Date(endDate)) {
      paidBills++
      totalPaidAmount += b.amount ? parseFloat(b.amount) : 0
    } else if (dueDate < new Date()) {
      overdueBills++
    } else {
      upcomingBills++
    }
  }

  const report: MonthlySummaryReport = {
    year,
    month,
    month_name: getMonthName(month),
    days_in_month: daysInMonth,
    days_elapsed: daysElapsed,
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_flow: netFlow,
      savings_rate: savingsRate,
      transaction_count: txns.length,
      avg_daily_spending: daysElapsed > 0 ? totalExpenses / daysElapsed : 0,
    },
    comparison_to_previous: {
      income_change: totalIncome - prevIncome,
      income_change_percent: calculatePercentageChange(prevIncome, totalIncome),
      expenses_change: totalExpenses - prevExpenses,
      expenses_change_percent: calculatePercentageChange(prevExpenses, totalExpenses),
      net_change: netFlow - (prevIncome - prevExpenses),
    },
    top_categories: topCategories,
    budget_status: budgetStatus,
    daily_spending: dailySpending,
    goal_progress: goalProgress,
    bills_summary: {
      paid: paidBills,
      upcoming: upcomingBills,
      overdue: overdueBills,
      total_paid_amount: totalPaidAmount,
    },
  }

  return NextResponse.json(report)
}

// Tax Summary Report
async function generateTaxSummaryReport(userId: string, params: unknown) {
  const validation = taxSummarySchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
  }

  const { tax_year } = validation.data
  const startDate = `${tax_year}-01-01`
  const endDate = `${tax_year}-12-31`

  // Fetch transactions with categories
  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select("amount, date, description, category_id, categories(name, type)")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const txns = transactions ?? []

  // Income
  const incomeByCategory = new Map<string, { total: number; name: string }>()
  let totalIncome = 0

  for (const t of txns) {
    if (parseFloat(t.amount) <= 0) continue
    const amount = parseFloat(t.amount)
    totalIncome += amount
    const catId = t.category_id || "uncategorized"
    const catName = getJoinedName(t.categories, "Uncategorized")
    const existing = incomeByCategory.get(catId) || { total: 0, name: catName }
    existing.total += amount
    incomeByCategory.set(catId, existing)
  }

  // Expenses (potential deductions)
  const deductionKeywords = ["business", "office", "work", "professional", "medical", "education"]
  const deductionsByCategory = new Map<string, { total: number; name: string }>()
  let totalDeductions = 0

  // Charitable donations
  const charityKeywords = ["charity", "donation", "non-profit", "nonprofit", "church", "temple", "mosque"]
  const charitableTransactions: Array<{ date: string; description: string; amount: number; category_name: string | null }> = []
  let totalCharitable = 0

  for (const t of txns) {
    if (parseFloat(t.amount) >= 0) continue
    const amount = Math.abs(parseFloat(t.amount))
    const catName = getJoinedName(t.categories)
    const desc = t.description?.toLowerCase() || ""
    const searchText = `${catName} ${desc}`.toLowerCase()

    // Check for charitable
    if (charityKeywords.some(k => searchText.includes(k))) {
      totalCharitable += amount
      charitableTransactions.push({
        date: t.date,
        description: t.description || "",
        amount,
        category_name: catName || null,
      })
    }

    // Check for deductions
    if (deductionKeywords.some(k => searchText.includes(k))) {
      totalDeductions += amount
      const catId = t.category_id || "uncategorized"
      const existing = deductionsByCategory.get(catId) || { total: 0, name: catName || "Uncategorized" }
      existing.total += amount
      deductionsByCategory.set(catId, existing)
    }
  }

  // Quarterly breakdown
  const quarters = [
    { label: "Q1", start: `${tax_year}-01-01`, end: `${tax_year}-03-31` },
    { label: "Q2", start: `${tax_year}-04-01`, end: `${tax_year}-06-30` },
    { label: "Q3", start: `${tax_year}-07-01`, end: `${tax_year}-09-30` },
    { label: "Q4", start: `${tax_year}-10-01`, end: `${tax_year}-12-31` },
  ]

  const quarterlyBreakdown = quarters.map(q => {
    const qTxns = txns.filter(t => t.date >= q.start && t.date <= q.end)
    const qIncome = qTxns.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const qDeductions = qTxns.filter(t => {
      if (parseFloat(t.amount) >= 0) return false
      const catName = getJoinedName(t.categories)
      const desc = t.description?.toLowerCase() || ""
      return deductionKeywords.some(k => `${catName} ${desc}`.toLowerCase().includes(k))
    }).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

    return {
      quarter: q.label,
      income: qIncome,
      deductions: qDeductions,
      net: qIncome - qDeductions,
    }
  })

  const report: TaxSummaryReport = {
    tax_year,
    income: {
      total: totalIncome,
      by_category: Array.from(incomeByCategory.entries()).map(([id, data]) => ({
        category_id: id === "uncategorized" ? null : id,
        category_name: data.name,
        total: data.total,
        tax_type: "income" as const,
      })),
    },
    deductions: {
      total: totalDeductions,
      by_category: Array.from(deductionsByCategory.entries()).map(([id, data]) => ({
        category_id: id === "uncategorized" ? null : id,
        category_name: data.name,
        total: data.total,
        tax_type: "deductible" as const,
      })),
    },
    business_expenses: {
      total: totalDeductions, // Same as deductions for now
      by_category: Array.from(deductionsByCategory.entries()).map(([id, data]) => ({
        category_id: id === "uncategorized" ? null : id,
        category_name: data.name,
        total: data.total,
      })),
    },
    charitable_donations: {
      total: totalCharitable,
      transactions: charitableTransactions,
    },
    quarterly_breakdown: quarterlyBreakdown,
    disclaimer: "This summary is for informational purposes only and should not be considered tax advice. Please consult a qualified tax professional for actual tax filing. Amounts may not include all taxable income or deductible expenses.",
  }

  return NextResponse.json(report)
}

// Savings Rate Report
async function generateSavingsRateReport(userId: string, params: unknown) {
  const validation = savingsRateSchema.safeParse(params)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
  }

  const { months } = validation.data

  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months + 1)
  startDate.setDate(1)

  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select("amount, date")
    .eq("user_id", userId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])

  if (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const txns = transactions ?? []

  // Monthly breakdown
  const monthlyMap = new Map<string, { income: number; expenses: number }>()
  let totalIncome = 0, totalExpenses = 0

  for (const t of txns) {
    const monthKey = t.date.substring(0, 7)
    const amount = parseFloat(t.amount)
    const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 }

    if (amount > 0) {
      existing.income += amount
      totalIncome += amount
    } else {
      existing.expenses += Math.abs(amount)
      totalExpenses += Math.abs(amount)
    }
    monthlyMap.set(monthKey, existing)
  }

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      savings: data.income - data.expenses,
      savings_rate: data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const totalSavings = totalIncome - totalExpenses
  const overallSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0

  // Trend analysis
  let trend: "improving" | "declining" | "stable" = "stable"
  let changeRate = 0

  if (monthly.length >= 2) {
    const firstHalf = monthly.slice(0, Math.floor(monthly.length / 2))
    const secondHalf = monthly.slice(Math.floor(monthly.length / 2))
    const firstAvgRate = firstHalf.reduce((sum, m) => sum + m.savings_rate, 0) / firstHalf.length
    const secondAvgRate = secondHalf.reduce((sum, m) => sum + m.savings_rate, 0) / secondHalf.length
    changeRate = secondAvgRate - firstAvgRate

    if (changeRate > 3) trend = "improving"
    else if (changeRate < -3) trend = "declining"
  }

  const avgSavingsRate = monthly.length > 0
    ? monthly.reduce((sum, m) => sum + m.savings_rate, 0) / monthly.length
    : 0

  const sortedByRate = [...monthly].sort((a, b) => b.savings_rate - a.savings_rate)
  const bestMonth = sortedByRate[0] || { month: "", savings_rate: 0 }
  const worstMonth = sortedByRate[sortedByRate.length - 1] || { month: "", savings_rate: 0 }

  // Goal contributions
  const { data: contributions } = await supabaseAdmin
    .from("goal_contributions")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])

  const totalGoalContributions = (contributions ?? []).reduce((sum, c) => sum + parseFloat(c.amount), 0)
  const goalContributionRate = totalIncome > 0 ? (totalGoalContributions / totalIncome) * 100 : 0

  const report: SavingsRateReport = {
    period: {
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    },
    overall: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_savings: totalSavings,
      savings_rate: overallSavingsRate,
    },
    monthly,
    trend: {
      direction: trend,
      change_rate: changeRate,
      avg_savings_rate: avgSavingsRate,
      best_month: bestMonth.month,
      best_rate: bestMonth.savings_rate,
      worst_month: worstMonth.month,
      worst_rate: worstMonth.savings_rate,
    },
    goals_impact: {
      total_goal_contributions: totalGoalContributions,
      goal_contribution_rate: goalContributionRate,
    },
  }

  return NextResponse.json(report)
}
