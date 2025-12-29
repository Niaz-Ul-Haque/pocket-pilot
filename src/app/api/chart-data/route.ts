import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, parseISO, differenceInMonths } from "date-fns"

// Types for chart data responses
export type SpendingTrendData = {
  month: string
  label: string
  income: number
  expenses: number
  net: number
}

export type CategoryBreakdownData = {
  name: string
  value: number
  percentage: number
  color: string
}

export type DailySpendingData = {
  date: string
  amount: number
}

export type NetWorthData = {
  month: string
  label: string
  balance: number
}

export type BudgetComparisonData = {
  category: string
  thisMonth: number
  lastMonth: number
  budget: number
}

export type HeatmapData = {
  date: string
  amount: number
  level: number // 0-4 for intensity
}

export type GoalTimelineData = {
  id: string
  name: string
  current: number
  target: number
  percentage: number
  projectedDate: string | null
  daysRemaining: number | null
}

export type ContributionData = {
  month: string
  label: string
  amount: number
  goalId?: string
}

export type BillCalendarData = {
  date: string
  bills: Array<{
    id: string
    name: string
    amount: number | null
    status: string
  }>
}

export type WaterfallData = {
  name: string
  value: number
  type: "income" | "expense" | "net"
  fill: string
}

export type CategoryTrendData = {
  month: string
  label: string
  [category: string]: string | number
}

// Color palette for charts
const CHART_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#84cc16", // lime
]

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const months = parseInt(searchParams.get("months") || "6")
    const goalId = searchParams.get("goalId")

    const userId = session.user.id
    const now = new Date()

    switch (type) {
      case "spending-trend":
        return NextResponse.json(await getSpendingTrend(userId, months))

      case "category-breakdown":
        return NextResponse.json(await getCategoryBreakdown(userId))

      case "daily-spending":
        return NextResponse.json(await getDailySpending(userId))

      case "net-worth":
        return NextResponse.json(await getNetWorthHistory(userId, months))

      case "budget-comparison":
        return NextResponse.json(await getBudgetComparison(userId))

      case "spending-heatmap":
        return NextResponse.json(await getSpendingHeatmap(userId))

      case "goal-timeline":
        return NextResponse.json(await getGoalTimeline(userId))

      case "goal-contributions":
        return NextResponse.json(await getGoalContributions(userId, goalId, months))

      case "bill-calendar":
        return NextResponse.json(await getBillCalendar(userId))

      case "bills-summary":
        return NextResponse.json(await getBillsSummary(userId))

      case "cash-flow-waterfall":
        return NextResponse.json(await getCashFlowWaterfall(userId))

      case "category-trends":
        const categories = searchParams.get("categories")?.split(",") || []
        return NextResponse.json(await getCategoryTrends(userId, months, categories))

      default:
        return NextResponse.json({ error: "Invalid chart type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Chart data error:", error)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}

// Get spending trend for the last N months
async function getSpendingTrend(userId: string, months: number): Promise<SpendingTrendData[]> {
  const now = new Date()
  const data: SpendingTrendData[] = []

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const start = startOfMonth(date)
    const end = endOfMonth(date)

    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .gte("date", format(start, "yyyy-MM-dd"))
      .lte("date", format(end, "yyyy-MM-dd"))

    const income = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
    const expenses = Math.abs(transactions?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0)

    data.push({
      month: format(date, "yyyy-MM"),
      label: format(date, "MMM"),
      income,
      expenses,
      net: income - expenses,
    })
  }

  return data
}

// Get category breakdown for current month
async function getCategoryBreakdown(userId: string): Promise<CategoryBreakdownData[]> {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)

  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select(`
      amount,
      categories (
        id,
        name
      )
    `)
    .eq("user_id", userId)
    .lt("amount", 0) // Only expenses
    .gte("date", format(start, "yyyy-MM-dd"))
    .lte("date", format(end, "yyyy-MM-dd"))

  // Aggregate by category
  const categoryTotals: Record<string, { name: string; value: number }> = {}
  let total = 0

  transactions?.forEach(t => {
    const categoryName = (t.categories as unknown as { name: string })?.name || "Uncategorized"
    const amount = Math.abs(t.amount)
    total += amount
    if (!categoryTotals[categoryName]) {
      categoryTotals[categoryName] = { name: categoryName, value: 0 }
    }
    categoryTotals[categoryName].value += amount
  })

  // Convert to array and sort by value
  const result = Object.values(categoryTotals)
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

  return result
}

// Get daily spending for current month
async function getDailySpending(userId: string): Promise<DailySpendingData[]> {
  const now = new Date()
  const start = startOfMonth(now)
  const end = now // Only up to today

  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("date, amount")
    .eq("user_id", userId)
    .lt("amount", 0) // Only expenses
    .gte("date", format(start, "yyyy-MM-dd"))
    .lte("date", format(end, "yyyy-MM-dd"))

  // Create a map of daily totals
  const dailyTotals: Record<string, number> = {}
  transactions?.forEach(t => {
    dailyTotals[t.date] = (dailyTotals[t.date] || 0) + Math.abs(t.amount)
  })

  // Generate data for each day
  const days = eachDayOfInterval({ start, end })
  return days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd")
    return {
      date: dateStr,
      amount: dailyTotals[dateStr] || 0,
    }
  })
}

// Get net worth history (running balance over time)
async function getNetWorthHistory(userId: string, months: number): Promise<NetWorthData[]> {
  const now = new Date()
  const data: NetWorthData[] = []

  // Get all transactions up to now
  const { data: allTransactions } = await supabaseAdmin
    .from("transactions")
    .select("date, amount")
    .eq("user_id", userId)
    .order("date", { ascending: true })

  if (!allTransactions?.length) {
    return data
  }

  // Calculate running balance for each month
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const endOfMonthDate = endOfMonth(date)
    const endDateStr = format(endOfMonthDate, "yyyy-MM-dd")

    // Sum all transactions up to and including this month
    const balance = allTransactions
      .filter(t => t.date <= endDateStr)
      .reduce((sum, t) => sum + t.amount, 0)

    data.push({
      month: format(date, "yyyy-MM"),
      label: format(date, "MMM"),
      balance,
    })
  }

  return data
}

// Get budget comparison (this month vs last month)
async function getBudgetComparison(userId: string): Promise<BudgetComparisonData[]> {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Get budgets with category info
  const { data: budgets } = await supabaseAdmin
    .from("budgets")
    .select(`
      amount,
      categories (
        id,
        name
      )
    `)
    .eq("user_id", userId)

  if (!budgets?.length) return []

  // Get this month's transactions
  const { data: thisMonthTransactions } = await supabaseAdmin
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", userId)
    .lt("amount", 0)
    .gte("date", format(thisMonthStart, "yyyy-MM-dd"))
    .lte("date", format(thisMonthEnd, "yyyy-MM-dd"))

  // Get last month's transactions
  const { data: lastMonthTransactions } = await supabaseAdmin
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", userId)
    .lt("amount", 0)
    .gte("date", format(lastMonthStart, "yyyy-MM-dd"))
    .lte("date", format(lastMonthEnd, "yyyy-MM-dd"))

  // Aggregate spending by category
  const thisMonthSpending: Record<string, number> = {}
  const lastMonthSpending: Record<string, number> = {}

  thisMonthTransactions?.forEach(t => {
    if (t.category_id) {
      thisMonthSpending[t.category_id] = (thisMonthSpending[t.category_id] || 0) + Math.abs(t.amount)
    }
  })

  lastMonthTransactions?.forEach(t => {
    if (t.category_id) {
      lastMonthSpending[t.category_id] = (lastMonthSpending[t.category_id] || 0) + Math.abs(t.amount)
    }
  })

  // Build comparison data
  return budgets.map(b => {
    const category = b.categories as unknown as { id: string; name: string }
    return {
      category: category.name,
      thisMonth: thisMonthSpending[category.id] || 0,
      lastMonth: lastMonthSpending[category.id] || 0,
      budget: b.amount,
    }
  })
}

// Get spending heatmap for current month
async function getSpendingHeatmap(userId: string): Promise<HeatmapData[]> {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)

  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("date, amount")
    .eq("user_id", userId)
    .lt("amount", 0)
    .gte("date", format(start, "yyyy-MM-dd"))
    .lte("date", format(end, "yyyy-MM-dd"))

  // Create daily totals
  const dailyTotals: Record<string, number> = {}
  transactions?.forEach(t => {
    dailyTotals[t.date] = (dailyTotals[t.date] || 0) + Math.abs(t.amount)
  })

  // Calculate max for level scaling
  const values = Object.values(dailyTotals)
  const max = values.length > 0 ? Math.max(...values) : 0

  // Generate heatmap data for each day
  const days = eachDayOfInterval({ start, end })
  return days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd")
    const amount = dailyTotals[dateStr] || 0
    const level = max > 0 ? Math.min(Math.floor((amount / max) * 4), 4) : 0
    return {
      date: dateStr,
      amount,
      level,
    }
  })
}

// Get goal timeline data
async function getGoalTimeline(userId: string): Promise<GoalTimelineData[]> {
  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .order("target_date", { ascending: true, nullsFirst: false })

  if (!goals?.length) return []

  // Get contribution history to calculate average rate
  const { data: contributions } = await supabaseAdmin
    .from("goal_contributions")
    .select("goal_id, amount, date")
    .eq("user_id", userId)
    .order("date", { ascending: true })

  const now = new Date()

  return goals.map(goal => {
    const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    const remaining = goal.target_amount - goal.current_amount

    // Calculate projected completion date based on contribution rate
    let projectedDate: string | null = null
    let daysRemaining: number | null = null

    if (goal.target_date) {
      const targetDate = parseISO(goal.target_date)
      daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    }

    // Calculate contribution rate for this goal
    const goalContributions = contributions?.filter(c => c.goal_id === goal.id) || []
    if (goalContributions.length >= 2) {
      const firstDate = parseISO(goalContributions[0].date)
      const lastDate = parseISO(goalContributions[goalContributions.length - 1].date)
      const totalContributed = goalContributions.reduce((sum, c) => sum + c.amount, 0)
      const monthsDiff = Math.max(1, differenceInMonths(lastDate, firstDate))
      const monthlyRate = totalContributed / monthsDiff

      if (monthlyRate > 0) {
        const monthsToComplete = remaining / monthlyRate
        const projected = new Date(now)
        projected.setMonth(projected.getMonth() + Math.ceil(monthsToComplete))
        projectedDate = format(projected, "yyyy-MM-dd")
      }
    }

    return {
      id: goal.id,
      name: goal.name,
      current: goal.current_amount,
      target: goal.target_amount,
      percentage: Math.round(percentage * 10) / 10,
      projectedDate,
      daysRemaining,
    }
  })
}

// Get goal contribution history
async function getGoalContributions(
  userId: string,
  goalId: string | null,
  months: number
): Promise<ContributionData[]> {
  const now = new Date()
  const startDate = subMonths(now, months - 1)

  let query = supabaseAdmin
    .from("goal_contributions")
    .select("goal_id, amount, date")
    .eq("user_id", userId)
    .gte("date", format(startOfMonth(startDate), "yyyy-MM-dd"))
    .order("date", { ascending: true })

  if (goalId) {
    query = query.eq("goal_id", goalId)
  }

  const { data: contributions } = await query

  // Aggregate by month
  const monthlyData: Record<string, number> = {}

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const key = format(date, "yyyy-MM")
    monthlyData[key] = 0
  }

  contributions?.forEach(c => {
    const month = c.date.substring(0, 7)
    if (monthlyData[month] !== undefined) {
      monthlyData[month] += c.amount
    }
  })

  return Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    label: format(parseISO(month + "-01"), "MMM"),
    amount,
  }))
}

// Get bill calendar data
async function getBillCalendar(userId: string): Promise<BillCalendarData[]> {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)

  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select("id, name, amount, next_due_date")
    .eq("user_id", userId)
    .eq("is_active", true)
    .gte("next_due_date", format(start, "yyyy-MM-dd"))
    .lte("next_due_date", format(end, "yyyy-MM-dd"))
    .order("next_due_date", { ascending: true })

  // Group bills by date
  const billsByDate: Record<string, BillCalendarData["bills"]> = {}
  const today = format(now, "yyyy-MM-dd")

  bills?.forEach(bill => {
    const date = bill.next_due_date
    if (!billsByDate[date]) {
      billsByDate[date] = []
    }

    let status = "upcoming"
    if (date < today) status = "overdue"
    else if (date === today) status = "due-today"
    else {
      const daysUntil = Math.ceil((parseISO(date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil <= 3) status = "due-soon"
    }

    billsByDate[date].push({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      status,
    })
  })

  // Generate calendar data for each day
  const days = eachDayOfInterval({ start, end })
  return days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd")
    return {
      date: dateStr,
      bills: billsByDate[dateStr] || [],
    }
  })
}

// Get bills summary (pie chart data)
async function getBillsSummary(userId: string): Promise<CategoryBreakdownData[]> {
  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select(`
      amount,
      frequency,
      categories (
        name
      )
    `)
    .eq("user_id", userId)
    .eq("is_active", true)

  // Calculate monthly equivalent for all bills
  const categoryTotals: Record<string, number> = {}
  let total = 0

  bills?.forEach(bill => {
    if (bill.amount === null) return

    // Convert to monthly amount
    let monthlyAmount = bill.amount
    switch (bill.frequency) {
      case "weekly":
        monthlyAmount = bill.amount * 4.33
        break
      case "biweekly":
        monthlyAmount = bill.amount * 2.17
        break
      case "yearly":
        monthlyAmount = bill.amount / 12
        break
    }

    const categoryName = (bill.categories as unknown as { name: string })?.name || "Uncategorized"
    categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + monthlyAmount
    total += monthlyAmount
  })

  return Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value: Math.round(value * 100) / 100,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
}

// Get cash flow waterfall data
async function getCashFlowWaterfall(userId: string): Promise<WaterfallData[]> {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)

  // Get transactions with categories
  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select(`
      amount,
      categories (
        name
      )
    `)
    .eq("user_id", userId)
    .gte("date", format(start, "yyyy-MM-dd"))
    .lte("date", format(end, "yyyy-MM-dd"))

  // Calculate totals
  const income = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {}
  transactions?.filter(t => t.amount < 0).forEach(t => {
    const categoryName = (t.categories as unknown as { name: string })?.name || "Other"
    expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Math.abs(t.amount)
  })

  // Sort categories by amount (descending)
  const sortedExpenses = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 expense categories

  const totalExpenses = Object.values(expensesByCategory).reduce((sum, v) => sum + v, 0)
  const otherExpenses = totalExpenses - sortedExpenses.reduce((sum, [, v]) => sum + v, 0)

  const data: WaterfallData[] = [
    { name: "Income", value: income, type: "income", fill: "#22c55e" },
  ]

  // Add expense categories
  sortedExpenses.forEach(([name, value]) => {
    data.push({ name, value: -value, type: "expense", fill: "#ef4444" })
  })

  // Add "Other" if there are more categories
  if (otherExpenses > 0) {
    data.push({ name: "Other", value: -otherExpenses, type: "expense", fill: "#f97316" })
  }

  // Add net
  data.push({
    name: "Net",
    value: income - totalExpenses,
    type: "net",
    fill: income - totalExpenses >= 0 ? "#22c55e" : "#ef4444",
  })

  return data
}

// Get category trends over time
async function getCategoryTrends(
  userId: string,
  months: number,
  categoryNames: string[]
): Promise<CategoryTrendData[]> {
  const now = new Date()
  const startDate = subMonths(now, months - 1)

  // Get categories
  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .eq("type", "expense")

  if (!categories?.length) return []

  // Filter to requested categories or top 5
  let targetCategories = categories
  if (categoryNames.length > 0) {
    targetCategories = categories.filter(c => categoryNames.includes(c.name))
  } else {
    targetCategories = categories.slice(0, 5)
  }

  // Get transactions
  const { data: transactions } = await supabaseAdmin
    .from("transactions")
    .select("category_id, amount, date")
    .eq("user_id", userId)
    .lt("amount", 0)
    .gte("date", format(startOfMonth(startDate), "yyyy-MM-dd"))

  // Initialize monthly data structure
  const monthlyData: Record<string, CategoryTrendData> = {}

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const key = format(date, "yyyy-MM")
    monthlyData[key] = {
      month: key,
      label: format(date, "MMM"),
    }
    targetCategories.forEach(c => {
      monthlyData[key][c.name] = 0
    })
  }

  // Aggregate transactions by category and month
  transactions?.forEach(t => {
    const month = t.date.substring(0, 7)
    const category = targetCategories.find(c => c.id === t.category_id)
    if (category && monthlyData[month]) {
      monthlyData[month][category.name] =
        ((monthlyData[month][category.name] as number) || 0) + Math.abs(t.amount)
    }
  })

  return Object.values(monthlyData)
}
