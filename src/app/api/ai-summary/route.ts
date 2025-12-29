import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import type { WeeklySummaryContent, MonthlySummaryContent } from "@/lib/validators/ai-features"

export const maxDuration = 30

// Helper to get date ranges
function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

// GET - Retrieve existing summaries
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") as "weekly" | "monthly" | null
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)

  let query = supabaseAdmin
    .from("ai_summaries")
    .select("*")
    .eq("user_id", session.user.id)
    .order("period_start", { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq("summary_type", type)
  }

  const { data, error } = await query

  if (error) {
    console.error("[AI Summary] Error fetching summaries:", error)
    return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 })
  }

  return NextResponse.json({ summaries: data })
}

// POST - Generate new summary
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") as "weekly" | "monthly"

  if (!type || !["weekly", "monthly"].includes(type)) {
    return NextResponse.json({ error: "Invalid summary type. Use 'weekly' or 'monthly'" }, { status: 400 })
  }

  const now = new Date()
  const range = type === "weekly" ? getWeekRange(now) : getMonthRange(now)
  const periodStart = formatDate(range.start)
  const periodEnd = formatDate(range.end)

  // Check if summary already exists for this period
  const { data: existing } = await supabaseAdmin
    .from("ai_summaries")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("summary_type", type)
    .eq("period_start", periodStart)
    .single()

  if (existing) {
    // Return existing summary
    const { data } = await supabaseAdmin
      .from("ai_summaries")
      .select("*")
      .eq("id", existing.id)
      .single()

    return NextResponse.json({ summary: data, cached: true })
  }

  // Fetch all necessary data
  const previousRange =
    type === "weekly"
      ? getWeekRange(new Date(range.start.getTime() - 7 * 24 * 60 * 60 * 1000))
      : getMonthRange(new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1))

  const [
    transactionsRes,
    previousTransactionsRes,
    budgetsRes,
    goalsRes,
    billsRes,
    contributionsRes,
  ] = await Promise.all([
    // Current period transactions
    supabaseAdmin
      .from("transactions")
      .select("*, categories(name, type)")
      .eq("user_id", session.user.id)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .order("date"),
    // Previous period transactions
    supabaseAdmin
      .from("transactions")
      .select("amount, categories(name)")
      .eq("user_id", session.user.id)
      .gte("date", formatDate(previousRange.start))
      .lte("date", formatDate(previousRange.end)),
    // Budgets
    supabaseAdmin
      .from("budgets")
      .select("*, categories(name)")
      .eq("user_id", session.user.id),
    // Goals
    supabaseAdmin
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_completed", false),
    // Bills
    supabaseAdmin
      .from("bills")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true),
    // Goal contributions for period
    supabaseAdmin
      .from("goal_contributions")
      .select("*, goals(name)")
      .eq("user_id", session.user.id)
      .gte("date", periodStart)
      .lte("date", periodEnd),
  ])

  const transactions = transactionsRes.data || []
  const previousTransactions = previousTransactionsRes.data || []
  const budgets = budgetsRes.data || []
  const goals = goalsRes.data || []
  const bills = billsRes.data || []
  const contributions = contributionsRes.data || []

  // Calculate spending breakdown
  const expenses = transactions.filter((t) => t.amount < 0)
  const income = transactions.filter((t) => t.amount > 0)
  const totalSpending = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)

  // Previous period totals
  const previousSpending = previousTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Spending by category
  const spendingByCategory: Record<string, { amount: number; previousAmount: number }> = {}
  expenses.forEach((t) => {
    const catName = (t.categories as unknown as { name: string } | null)?.name || "Uncategorized"
    if (!spendingByCategory[catName]) {
      spendingByCategory[catName] = { amount: 0, previousAmount: 0 }
    }
    spendingByCategory[catName].amount += Math.abs(t.amount)
  })

  // Previous spending by category
  previousTransactions
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const catName = (t.categories as unknown as { name: string } | null)?.name || "Uncategorized"
      if (!spendingByCategory[catName]) {
        spendingByCategory[catName] = { amount: 0, previousAmount: 0 }
      }
      spendingByCategory[catName].previousAmount += Math.abs(t.amount)
    })

  const categoryBreakdown = Object.entries(spendingByCategory)
    .map(([name, data]) => ({
      name,
      amount: data.amount,
      change: data.previousAmount > 0 ? ((data.amount - data.previousAmount) / data.previousAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Daily spending for peak day
  const dailySpending: Record<string, number> = {}
  expenses.forEach((t) => {
    dailySpending[t.date] = (dailySpending[t.date] || 0) + Math.abs(t.amount)
  })
  const peakDay = Object.entries(dailySpending).sort((a, b) => b[1] - a[1])[0] || [periodStart, 0]

  // Budget status
  const budgetDetails = budgets.map((b) => {
    const catName = (b.categories as unknown as { name: string } | null)?.name || "Unknown"
    const spent = expenses
      .filter((t) => t.category_id === b.category_id)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return {
      name: catName,
      spent,
      budget: b.amount,
      percentage: Math.round((spent / b.amount) * 100),
    }
  })

  const budgetsOnTrack = budgetDetails.filter((b) => b.percentage < 80).length
  const budgetsWarning = budgetDetails.filter((b) => b.percentage >= 80 && b.percentage < 100).length
  const budgetsExceeded = budgetDetails.filter((b) => b.percentage >= 100).length

  // Goals status
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0)
  const goalsNearCompletion = goals
    .map((g) => ({
      name: g.name,
      percentage: Math.round((g.current_amount / g.target_amount) * 100),
    }))
    .filter((g) => g.percentage >= 75)
    .sort((a, b) => b.percentage - a.percentage)

  // Bills status
  const today = new Date()
  const billsPaid = bills.filter((b) => new Date(b.last_paid_date || 0) >= range.start).length
  const upcomingBills = bills.filter((b) => {
    const dueDate = new Date(b.next_due_date)
    return dueDate >= today && dueDate <= range.end
  })
  const overdueBills = bills.filter((b) => new Date(b.next_due_date) < today).length

  // Generate insights
  const insights: string[] = []
  const spendingChange = previousSpending > 0 ? ((totalSpending - previousSpending) / previousSpending) * 100 : 0

  if (spendingChange > 20) {
    insights.push(`Spending increased by ${Math.abs(spendingChange).toFixed(0)}% compared to last ${type === "weekly" ? "week" : "month"}.`)
  } else if (spendingChange < -20) {
    insights.push(`Great job! Spending decreased by ${Math.abs(spendingChange).toFixed(0)}% compared to last ${type === "weekly" ? "week" : "month"}.`)
  }

  if (budgetsExceeded > 0) {
    insights.push(`${budgetsExceeded} budget${budgetsExceeded > 1 ? "s" : ""} exceeded. Consider reviewing your spending in ${budgetDetails.filter((b) => b.percentage >= 100).map((b) => b.name).join(", ")}.`)
  }

  if (goalsNearCompletion.length > 0) {
    insights.push(`${goalsNearCompletion[0].name} is ${goalsNearCompletion[0].percentage}% complete - you're almost there!`)
  }

  if (overdueBills > 0) {
    insights.push(`You have ${overdueBills} overdue bill${overdueBills > 1 ? "s" : ""}. Consider paying them soon to avoid late fees.`)
  }

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0
  if (savingsRate >= 20) {
    insights.push(`Excellent savings rate of ${savingsRate.toFixed(0)}%! You're building wealth effectively.`)
  } else if (savingsRate < 10 && totalIncome > 0) {
    insights.push(`Your savings rate is ${savingsRate.toFixed(0)}%. Try to save at least 20% of your income.`)
  }

  // Calculate health score
  let healthScore = 0
  // Budget adherence (25 points)
  healthScore += Math.round(((budgets.length - budgetsExceeded) / Math.max(budgets.length, 1)) * 25)
  // Savings rate (25 points)
  healthScore += Math.min(25, Math.round(savingsRate * 1.25))
  // Bill payments (25 points)
  healthScore += Math.round(((bills.length - overdueBills) / Math.max(bills.length, 1)) * 25)
  // Goal progress (25 points)
  const avgGoalProgress = goals.length > 0
    ? goals.reduce((sum, g) => sum + (g.current_amount / g.target_amount) * 100, 0) / goals.length
    : 100
  healthScore += Math.round(Math.min(25, avgGoalProgress / 4))

  // Build content
  const baseContent: WeeklySummaryContent = {
    period: { start: periodStart, end: periodEnd },
    spending: {
      total: totalSpending,
      byCategory: categoryBreakdown,
      dailyAverage: totalSpending / (type === "weekly" ? 7 : 30),
      peakDay: { date: peakDay[0], amount: peakDay[1] as number },
    },
    income: {
      total: totalIncome,
      sources: income.map((t) => ({
        name: t.description || (t.categories as unknown as { name: string } | null)?.name || "Income",
        amount: t.amount,
      })),
    },
    budgets: {
      onTrack: budgetsOnTrack,
      warning: budgetsWarning,
      exceeded: budgetsExceeded,
      details: budgetDetails,
    },
    goals: {
      totalProgress: avgGoalProgress,
      contributions: totalContributions,
      activeCount: goals.length,
      nearCompletion: goalsNearCompletion,
    },
    bills: {
      paid: billsPaid,
      upcoming: upcomingBills.length,
      overdue: overdueBills,
      nextDue: upcomingBills.slice(0, 5).map((b) => ({
        name: b.name,
        amount: b.amount || 0,
        dueDate: b.next_due_date,
      })),
    },
    insights,
    healthScore,
    comparison: {
      vsLastWeek: spendingChange,
      trend: spendingChange > 5 ? "up" : spendingChange < -5 ? "down" : "stable",
    },
  }

  // Add monthly-specific content
  let content: WeeklySummaryContent | MonthlySummaryContent = baseContent
  if (type === "monthly") {
    // Get year-to-date transactions
    const yearStart = `${now.getFullYear()}-01-01`
    const { data: ytdTransactions } = await supabaseAdmin
      .from("transactions")
      .select("amount, date")
      .eq("user_id", session.user.id)
      .gte("date", yearStart)
      .lte("date", periodEnd)

    const ytdSpending = (ytdTransactions || [])
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const ytdIncome = (ytdTransactions || [])
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    // Top merchants
    const merchantSpending: Record<string, { amount: number; count: number }> = {}
    expenses.forEach((t) => {
      const merchant = t.description || "Unknown"
      if (!merchantSpending[merchant]) {
        merchantSpending[merchant] = { amount: 0, count: 0 }
      }
      merchantSpending[merchant].amount += Math.abs(t.amount)
      merchantSpending[merchant].count++
    })

    const topMerchants = Object.entries(merchantSpending)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    const monthlyContent: MonthlySummaryContent = {
      ...baseContent,
      savings: {
        rate: savingsRate,
        amount: totalIncome - totalSpending,
        trend:
          savingsRate > 20 ? "improving" : savingsRate < 10 ? "declining" : "stable",
      },
      topMerchants,
      categoryTrends: categoryBreakdown.map((c) => ({
        name: c.name,
        thisMonth: c.amount,
        lastMonth: spendingByCategory[c.name]?.previousAmount || 0,
        change: c.change,
      })),
      yearToDate: {
        totalSpending: ytdSpending,
        totalIncome: ytdIncome,
        averageMonthlySpending: ytdSpending / (now.getMonth() + 1),
      },
      predictions: {
        nextMonthSpending: totalSpending * (1 + spendingChange / 100 * 0.5),
        endOfYearSavings: (ytdIncome - ytdSpending) + (totalIncome - totalSpending) * (12 - now.getMonth() - 1),
      },
    }
    content = monthlyContent
  }

  // Generate recommendations
  const recommendations: string[] = []
  if (budgetsExceeded > 0) {
    recommendations.push("Review and adjust budgets for categories that consistently exceed limits.")
  }
  if (savingsRate < 20) {
    recommendations.push("Try to increase your savings rate by identifying non-essential expenses.")
  }
  if (overdueBills > 0) {
    recommendations.push("Set up automatic payments to avoid missing bill due dates.")
  }
  if (categoryBreakdown.length > 0 && categoryBreakdown[0].change > 50) {
    recommendations.push(`Consider reducing spending in ${categoryBreakdown[0].name} which has increased significantly.`)
  }

  // Save summary
  const { data: summary, error } = await supabaseAdmin
    .from("ai_summaries")
    .insert({
      user_id: session.user.id,
      summary_type: type,
      period_start: periodStart,
      period_end: periodEnd,
      content,
      highlights: insights.slice(0, 5),
      recommendations,
      health_score: healthScore,
    })
    .select()
    .single()

  if (error) {
    console.error("[AI Summary] Error saving summary:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }

  return NextResponse.json({ summary, cached: false })
}
