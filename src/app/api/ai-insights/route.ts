import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const maxDuration = 30

interface TransactionRaw {
  id: string
  amount: number
  date: string
  description: string | null
  category_id: string | null
  account_id: string
  is_transfer: boolean
  categories?: { name: string; type: string } | { name: string; type: string }[] | null
}

interface Transaction {
  id: string
  amount: number
  date: string
  description: string | null
  category_id: string | null
  account_id: string
  is_transfer: boolean
  categories?: { name: string; type: string } | null
}

interface BudgetRaw {
  id: string
  amount: number
  category_id: string
  categories?: { name: string } | { name: string }[] | null
}

interface Budget {
  id: string
  amount: number
  category_id: string
  categories?: { name: string } | null
}

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  is_completed: boolean
}

interface Bill {
  id: string
  name: string
  amount: number | null
  frequency: string
  next_due_date: string
  is_active: boolean
}

interface RecurringTransaction {
  id: string
  description: string
  amount: number
  frequency: string
}

// Helper to get date ranges
function getDateRanges() {
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0]

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const endOfMonthStr = endOfMonth.toISOString().split("T")[0]

  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const startOfLastMonthStr = startOfLastMonth.toISOString().split("T")[0]

  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
  const endOfLastMonthStr = endOfLastMonth.toISOString().split("T")[0]

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0]

  const daysInMonth = endOfMonth.getDate()
  const currentDay = today.getDate()
  const daysRemaining = daysInMonth - currentDay

  return {
    today,
    todayStr,
    startOfMonthStr,
    endOfMonthStr,
    startOfLastMonthStr,
    endOfLastMonthStr,
    startOfWeekStr,
    daysInMonth,
    currentDay,
    daysRemaining,
  }
}

// Calculate Financial Health Score (0-100)
function calculateHealthScore(data: {
  budgets: Budget[]
  budgetSpending: Map<string, number>
  savingsRate: number
  hasEmergencyFund: boolean
  billsPaidOnTime: number
  totalBills: number
  goalsProgress: number
  hasActiveGoals: boolean
}): { score: number; breakdown: Record<string, number>; factors: string[] } {
  const breakdown: Record<string, number> = {}
  const factors: string[] = []

  // 1. Budget Adherence (25 points max)
  let budgetScore = 25
  if (data.budgets.length > 0) {
    let overBudgetCount = 0
    let totalCategories = data.budgets.length

    data.budgets.forEach(budget => {
      const spent = data.budgetSpending.get(budget.category_id) || 0
      if (spent > budget.amount) {
        overBudgetCount++
      }
    })

    const adherenceRate = (totalCategories - overBudgetCount) / totalCategories
    budgetScore = Math.round(adherenceRate * 25)

    if (overBudgetCount > 0) {
      factors.push(`${overBudgetCount} budget(s) exceeded`)
    } else if (data.budgets.length > 0) {
      factors.push("All budgets on track")
    }
  } else {
    budgetScore = 15 // Neutral score if no budgets set
    factors.push("Consider setting up budgets")
  }
  breakdown.budgetAdherence = budgetScore

  // 2. Savings Rate (25 points max)
  let savingsScore = 0
  if (data.savingsRate >= 20) {
    savingsScore = 25
    factors.push(`Excellent savings rate: ${data.savingsRate.toFixed(1)}%`)
  } else if (data.savingsRate >= 10) {
    savingsScore = 20
    factors.push(`Good savings rate: ${data.savingsRate.toFixed(1)}%`)
  } else if (data.savingsRate > 0) {
    savingsScore = Math.round(data.savingsRate * 2)
    factors.push(`Savings rate: ${data.savingsRate.toFixed(1)}% (aim for 20%)`)
  } else {
    savingsScore = 0
    factors.push("Not saving this month")
  }
  breakdown.savingsRate = savingsScore

  // 3. Bill Payment (25 points max)
  let billScore = 25
  if (data.totalBills > 0) {
    const paidRate = data.billsPaidOnTime / data.totalBills
    billScore = Math.round(paidRate * 25)
    if (paidRate < 1) {
      factors.push(`${data.totalBills - data.billsPaidOnTime} bill(s) overdue or due soon`)
    } else {
      factors.push("All bills on track")
    }
  } else {
    billScore = 20 // Neutral if no bills tracked
  }
  breakdown.billPayment = billScore

  // 4. Goal Progress (25 points max)
  let goalScore = 15 // Default neutral
  if (data.hasActiveGoals) {
    goalScore = Math.min(Math.round(data.goalsProgress / 4), 25) // Max 25 at 100% progress
    if (data.goalsProgress >= 50) {
      factors.push(`Goals ${data.goalsProgress.toFixed(0)}% complete`)
    } else {
      factors.push(`Goals at ${data.goalsProgress.toFixed(0)}% - keep contributing!`)
    }
  } else {
    factors.push("Set savings goals to improve score")
  }
  breakdown.goalProgress = goalScore

  // Emergency fund bonus
  if (data.hasEmergencyFund) {
    breakdown.goalProgress = Math.min(breakdown.goalProgress + 5, 25)
    factors.push("Emergency fund on track")
  }

  const score = Math.min(
    breakdown.budgetAdherence +
    breakdown.savingsRate +
    breakdown.billPayment +
    breakdown.goalProgress,
    100
  )

  return { score, breakdown, factors }
}

// Detect anomalies in transactions
function detectAnomalies(
  transactions: Transaction[],
  categoryAverages: Map<string, { avg: number; stdDev: number }>
): Array<{ transaction: Transaction; reason: string; severity: "high" | "medium" | "low" }> {
  const anomalies: Array<{ transaction: Transaction; reason: string; severity: "high" | "medium" | "low" }> = []

  transactions.forEach(t => {
    if (t.is_transfer || t.amount >= 0) return // Skip transfers and income

    const absAmount = Math.abs(t.amount)
    const categoryId = t.category_id

    if (categoryId && categoryAverages.has(categoryId)) {
      const stats = categoryAverages.get(categoryId)!
      const zScore = (absAmount - stats.avg) / (stats.stdDev || 1)

      if (zScore > 3) {
        anomalies.push({
          transaction: t,
          reason: `$${absAmount.toFixed(2)} is significantly higher than average ($${stats.avg.toFixed(2)}) for ${t.categories?.name || "this category"}`,
          severity: "high"
        })
      } else if (zScore > 2) {
        anomalies.push({
          transaction: t,
          reason: `$${absAmount.toFixed(2)} is above average for ${t.categories?.name || "this category"}`,
          severity: "medium"
        })
      }
    }

    // Check for large transactions (absolute threshold)
    if (absAmount > 500) {
      const existing = anomalies.find(a => a.transaction.id === t.id)
      if (!existing) {
        anomalies.push({
          transaction: t,
          reason: `Large transaction of $${absAmount.toFixed(2)}`,
          severity: absAmount > 1000 ? "high" : "medium"
        })
      }
    }
  })

  return anomalies.slice(0, 10) // Return top 10
}

// Detect duplicate transactions
function detectDuplicates(transactions: Transaction[]): Array<{ transactions: Transaction[]; reason: string }> {
  const duplicates: Array<{ transactions: Transaction[]; reason: string }> = []
  const seen = new Map<string, Transaction[]>()

  transactions.forEach(t => {
    // Create a key based on amount, date, and description
    const key = `${t.amount}_${t.date}_${(t.description || "").toLowerCase().trim()}`

    if (seen.has(key)) {
      seen.get(key)!.push(t)
    } else {
      seen.set(key, [t])
    }
  })

  seen.forEach((txns, key) => {
    if (txns.length > 1) {
      duplicates.push({
        transactions: txns,
        reason: `${txns.length} transactions with same amount ($${Math.abs(txns[0].amount).toFixed(2)}) on ${txns[0].date}`
      })
    }
  })

  return duplicates.slice(0, 5) // Return top 5
}

// Analyze spending patterns
function analyzeSpendingPatterns(transactions: Transaction[]): {
  dayOfWeek: Record<string, number>
  timeOfMonth: { early: number; mid: number; late: number }
  peakDay: string
  insight: string
} {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const dayOfWeek: Record<string, number> = {}
  dayNames.forEach(d => dayOfWeek[d] = 0)

  const timeOfMonth = { early: 0, mid: 0, late: 0 }

  transactions.forEach(t => {
    if (t.amount >= 0 || t.is_transfer) return // Only expenses

    const date = new Date(t.date)
    const dayName = dayNames[date.getDay()]
    const dayOfMonthNum = date.getDate()

    dayOfWeek[dayName] += Math.abs(t.amount)

    if (dayOfMonthNum <= 10) {
      timeOfMonth.early += Math.abs(t.amount)
    } else if (dayOfMonthNum <= 20) {
      timeOfMonth.mid += Math.abs(t.amount)
    } else {
      timeOfMonth.late += Math.abs(t.amount)
    }
  })

  const peakDay = Object.entries(dayOfWeek).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

  let insight = ""
  if (peakDay !== "N/A") {
    insight = `You spend most on ${peakDay}s. `
  }

  const maxPeriod = Object.entries(timeOfMonth).sort((a, b) => b[1] - a[1])[0]
  if (maxPeriod) {
    const periodName = maxPeriod[0] === "early" ? "start" : maxPeriod[0] === "mid" ? "middle" : "end"
    insight += `Most spending happens at the ${periodName} of the month.`
  }

  return { dayOfWeek, timeOfMonth, peakDay, insight }
}

// Identify subscriptions from recurring patterns
function auditSubscriptions(
  transactions: Transaction[],
  recurringTransactions: RecurringTransaction[]
): {
  identified: Array<{ name: string; amount: number; frequency: string; annualCost: number }>
  totalMonthly: number
  totalAnnual: number
  suggestions: string[]
} {
  const subscriptions: Array<{ name: string; amount: number; frequency: string; annualCost: number }> = []
  const suggestions: string[] = []

  // Add known recurring transactions
  recurringTransactions.forEach(rt => {
    if (rt.amount < 0) { // Only expenses
      const monthlyAmount = Math.abs(rt.amount)
      let annualCost = monthlyAmount * 12

      if (rt.frequency === "yearly") {
        annualCost = monthlyAmount
      } else if (rt.frequency === "weekly") {
        annualCost = monthlyAmount * 52
      } else if (rt.frequency === "biweekly") {
        annualCost = monthlyAmount * 26
      }

      subscriptions.push({
        name: rt.description,
        amount: monthlyAmount,
        frequency: rt.frequency,
        annualCost
      })
    }
  })

  // Detect potential subscriptions from transaction patterns
  const merchantCounts = new Map<string, { amount: number; count: number; dates: string[] }>()

  transactions.forEach(t => {
    if (t.amount >= 0 || t.is_transfer || !t.description) return

    const desc = t.description.toLowerCase().trim()
    if (merchantCounts.has(desc)) {
      const data = merchantCounts.get(desc)!
      data.count++
      data.dates.push(t.date)
    } else {
      merchantCounts.set(desc, { amount: Math.abs(t.amount), count: 1, dates: [t.date] })
    }
  })

  // Find recurring merchants (appears at least 2 times in last 3 months)
  merchantCounts.forEach((data, merchant) => {
    if (data.count >= 2) {
      // Check if amounts are consistent
      const existing = subscriptions.find(s => s.name.toLowerCase() === merchant)
      if (!existing) {
        subscriptions.push({
          name: merchant,
          amount: data.amount,
          frequency: "monthly",
          annualCost: data.amount * 12
        })
      }
    }
  })

  const totalMonthly = subscriptions.reduce((sum, s) => {
    if (s.frequency === "yearly") return sum + s.amount / 12
    if (s.frequency === "weekly") return sum + s.amount * 4.33
    if (s.frequency === "biweekly") return sum + s.amount * 2.17
    return sum + s.amount
  }, 0)

  const totalAnnual = subscriptions.reduce((sum, s) => sum + s.annualCost, 0)

  // Generate suggestions
  if (subscriptions.length > 5) {
    suggestions.push(`You have ${subscriptions.length} recurring expenses. Review for unused subscriptions.`)
  }

  const highCostSubs = subscriptions.filter(s => s.annualCost > 200)
  if (highCostSubs.length > 0) {
    suggestions.push(`${highCostSubs.length} subscription(s) cost over $200/year. Consider if they're worth it.`)
  }

  return {
    identified: subscriptions.sort((a, b) => b.annualCost - a.annualCost).slice(0, 10),
    totalMonthly: Math.round(totalMonthly * 100) / 100,
    totalAnnual: Math.round(totalAnnual * 100) / 100,
    suggestions
  }
}

// Calculate expense predictions
function predictExpenses(
  transactions: Transaction[],
  dates: ReturnType<typeof getDateRanges>
): {
  projectedMonthlyTotal: number
  projectedByCategory: Array<{ category: string; projected: number; trend: "up" | "down" | "stable" }>
  dailyAverage: number
  weeklyPrediction: number
} {
  // Get spending so far this month
  const thisMonthTxns = transactions.filter(t =>
    t.date >= dates.startOfMonthStr &&
    t.date <= dates.todayStr &&
    t.amount < 0 &&
    !t.is_transfer
  )

  const spentSoFar = thisMonthTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const dailyAverage = dates.currentDay > 0 ? spentSoFar / dates.currentDay : 0
  const projectedMonthlyTotal = spentSoFar + (dailyAverage * dates.daysRemaining)
  const weeklyPrediction = dailyAverage * 7

  // By category analysis
  const categoryTotals = new Map<string, number>()
  thisMonthTxns.forEach(t => {
    const catName = t.categories?.name || "Uncategorized"
    categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + Math.abs(t.amount))
  })

  // Get last month data for trend comparison
  const lastMonthTxns = transactions.filter(t =>
    t.date >= dates.startOfLastMonthStr &&
    t.date <= dates.endOfLastMonthStr &&
    t.amount < 0 &&
    !t.is_transfer
  )

  const lastMonthTotals = new Map<string, number>()
  lastMonthTxns.forEach(t => {
    const catName = t.categories?.name || "Uncategorized"
    lastMonthTotals.set(catName, (lastMonthTotals.get(catName) || 0) + Math.abs(t.amount))
  })

  const projectedByCategory: Array<{ category: string; projected: number; trend: "up" | "down" | "stable" }> = []
  categoryTotals.forEach((amount, category) => {
    const projectedCat = amount + (amount / dates.currentDay) * dates.daysRemaining
    const lastMonthAmount = lastMonthTotals.get(category) || 0

    let trend: "up" | "down" | "stable" = "stable"
    if (lastMonthAmount > 0) {
      const change = ((projectedCat - lastMonthAmount) / lastMonthAmount) * 100
      if (change > 10) trend = "up"
      else if (change < -10) trend = "down"
    }

    projectedByCategory.push({ category, projected: Math.round(projectedCat * 100) / 100, trend })
  })

  return {
    projectedMonthlyTotal: Math.round(projectedMonthlyTotal * 100) / 100,
    projectedByCategory: projectedByCategory.sort((a, b) => b.projected - a.projected).slice(0, 5),
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    weeklyPrediction: Math.round(weeklyPrediction * 100) / 100
  }
}

// Cash flow forecasting
function forecastCashFlow(
  transactions: Transaction[],
  bills: Bill[],
  recurringTransactions: RecurringTransaction[],
  currentBalance: number,
  dates: ReturnType<typeof getDateRanges>
): {
  projectedBalance30Days: number
  upcomingInflows: number
  upcomingOutflows: number
  criticalDates: Array<{ date: string; description: string; impact: number }>
  insight: string
} {
  const next30Days = new Date(dates.today)
  next30Days.setDate(next30Days.getDate() + 30)
  const next30DaysStr = next30Days.toISOString().split("T")[0]

  let upcomingInflows = 0
  let upcomingOutflows = 0
  const criticalDates: Array<{ date: string; description: string; impact: number }> = []

  // Add recurring income
  recurringTransactions.forEach(rt => {
    if (rt.amount > 0) {
      // Estimate monthly income
      if (rt.frequency === "monthly") {
        upcomingInflows += rt.amount
        criticalDates.push({
          date: "Monthly",
          description: rt.description,
          impact: rt.amount
        })
      } else if (rt.frequency === "biweekly") {
        upcomingInflows += rt.amount * 2.17 // ~2 payments in 30 days
      }
    }
  })

  // Add upcoming bills
  bills.forEach(bill => {
    if (bill.is_active && bill.next_due_date <= next30DaysStr && bill.amount) {
      upcomingOutflows += bill.amount
      criticalDates.push({
        date: bill.next_due_date,
        description: bill.name,
        impact: -bill.amount
      })
    }
  })

  // Estimate regular expenses based on last month
  const lastMonthExpenses = transactions
    .filter(t =>
      t.date >= dates.startOfLastMonthStr &&
      t.date <= dates.endOfLastMonthStr &&
      t.amount < 0 &&
      !t.is_transfer
    )
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Daily discretionary spending estimate
  const dailyDiscretionary = lastMonthExpenses / 30
  const remainingDays = dates.daysRemaining
  upcomingOutflows += dailyDiscretionary * remainingDays

  const projectedBalance30Days = currentBalance + upcomingInflows - upcomingOutflows

  let insight = ""
  if (projectedBalance30Days < 0) {
    insight = `Warning: Projected negative balance in 30 days. Consider reducing expenses.`
  } else if (projectedBalance30Days < currentBalance * 0.2) {
    insight = `Your balance may drop significantly. Plan for upcoming expenses.`
  } else {
    insight = `Cash flow looks healthy for the next 30 days.`
  }

  return {
    projectedBalance30Days: Math.round(projectedBalance30Days * 100) / 100,
    upcomingInflows: Math.round(upcomingInflows * 100) / 100,
    upcomingOutflows: Math.round(upcomingOutflows * 100) / 100,
    criticalDates: criticalDates.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    insight
  }
}

// Goal achievement predictions
function predictGoalAchievement(goals: Goal[]): Array<{
  goal: Goal
  predictedCompletionDate: string | null
  monthsRemaining: number | null
  requiredMonthly: number
  onTrack: boolean
  insight: string
}> {
  const predictions: Array<{
    goal: Goal
    predictedCompletionDate: string | null
    monthsRemaining: number | null
    requiredMonthly: number
    onTrack: boolean
    insight: string
  }> = []

  const today = new Date()

  goals.filter(g => !g.is_completed).forEach(goal => {
    const remaining = goal.target_amount - goal.current_amount
    const progress = (goal.current_amount / goal.target_amount) * 100

    let predictedCompletionDate: string | null = null
    let monthsRemaining: number | null = null
    let requiredMonthly = 0
    let onTrack = true
    let insight = ""

    if (goal.target_date) {
      const targetDate = new Date(goal.target_date)
      const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      monthsRemaining = Math.ceil(daysUntilTarget / 30)

      if (monthsRemaining > 0) {
        requiredMonthly = remaining / monthsRemaining

        // Assume average monthly contribution based on current progress and time elapsed
        const goalAgeMonths = Math.max(1, (today.getTime() - new Date(goal.target_date).getTime() + (daysUntilTarget * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000))
        const avgMonthlyContribution = goal.current_amount / goalAgeMonths

        if (avgMonthlyContribution >= requiredMonthly * 0.9) {
          onTrack = true
          insight = `On track to reach goal by ${goal.target_date}`
        } else {
          onTrack = false
          insight = `Need to increase contributions to $${requiredMonthly.toFixed(2)}/month`
        }

        // Predict actual completion date based on current pace
        if (avgMonthlyContribution > 0) {
          const monthsNeeded = remaining / avgMonthlyContribution
          const predictedDate = new Date(today)
          predictedDate.setMonth(predictedDate.getMonth() + Math.ceil(monthsNeeded))
          predictedCompletionDate = predictedDate.toISOString().split("T")[0]
        }
      } else {
        onTrack = false
        insight = `Target date passed. ${remaining.toFixed(2)} still needed.`
      }
    } else {
      // No target date - just predict based on any contributions
      insight = `${progress.toFixed(0)}% complete. $${remaining.toFixed(2)} remaining.`
      requiredMonthly = remaining / 12 // Suggest 1-year target
    }

    predictions.push({
      goal,
      predictedCompletionDate,
      monthsRemaining,
      requiredMonthly: Math.round(requiredMonthly * 100) / 100,
      onTrack,
      insight
    })
  })

  return predictions
}

// Bill impact analysis
function analyzeBillImpact(
  bills: Bill[],
  currentBalance: number,
  monthlyIncome: number
): {
  totalMonthlyBills: number
  percentageOfIncome: number
  upcomingImpact: Array<{ bill: Bill; impact: number; percentOfBalance: number }>
  recommendations: string[]
} {
  const today = new Date()
  const next7Days = new Date(today)
  next7Days.setDate(today.getDate() + 7)
  const next7DaysStr = next7Days.toISOString().split("T")[0]
  const todayStr = today.toISOString().split("T")[0]

  // Calculate total monthly bills
  let totalMonthlyBills = 0
  bills.forEach(bill => {
    if (!bill.is_active || !bill.amount) return

    let monthlyEquivalent = bill.amount
    if (bill.frequency === "yearly") {
      monthlyEquivalent = bill.amount / 12
    } else if (bill.frequency === "weekly") {
      monthlyEquivalent = bill.amount * 4.33
    } else if (bill.frequency === "biweekly") {
      monthlyEquivalent = bill.amount * 2.17
    } else if (bill.frequency === "quarterly") {
      monthlyEquivalent = bill.amount / 3
    }

    totalMonthlyBills += monthlyEquivalent
  })

  const percentageOfIncome = monthlyIncome > 0 ? (totalMonthlyBills / monthlyIncome) * 100 : 0

  // Analyze upcoming bills impact
  const upcomingImpact = bills
    .filter(b => b.is_active && b.next_due_date >= todayStr && b.next_due_date <= next7DaysStr && b.amount)
    .map(bill => ({
      bill,
      impact: bill.amount!,
      percentOfBalance: currentBalance > 0 ? (bill.amount! / currentBalance) * 100 : 0
    }))
    .sort((a, b) => b.impact - a.impact)

  // Generate recommendations
  const recommendations: string[] = []

  if (percentageOfIncome > 50) {
    recommendations.push(`Bills consume ${percentageOfIncome.toFixed(0)}% of income. Consider reducing fixed expenses.`)
  }

  const largeBills = upcomingImpact.filter(b => b.percentOfBalance > 20)
  if (largeBills.length > 0) {
    recommendations.push(`${largeBills.length} upcoming bill(s) will take over 20% of your current balance.`)
  }

  const totalUpcoming = upcomingImpact.reduce((sum, b) => sum + b.impact, 0)
  if (totalUpcoming > currentBalance * 0.5) {
    recommendations.push(`Upcoming bills total $${totalUpcoming.toFixed(2)} - ensure sufficient funds.`)
  }

  return {
    totalMonthlyBills: Math.round(totalMonthlyBills * 100) / 100,
    percentageOfIncome: Math.round(percentageOfIncome * 100) / 100,
    upcomingImpact: upcomingImpact.slice(0, 5),
    recommendations
  }
}

// Generate proactive insights
function generateProactiveInsights(data: {
  healthScore: number
  budgetStatus: Array<{ category: string; percentage: number }>
  spendingTrend: "up" | "down" | "stable"
  goalsProgress: number
  upcomingBillsTotal: number
  anomalyCount: number
  savingsRate: number
}): Array<{ type: string; priority: "high" | "medium" | "low"; message: string; action?: string }> {
  const insights: Array<{ type: string; priority: "high" | "medium" | "low"; message: string; action?: string }> = []

  // Health score insight
  if (data.healthScore < 50) {
    insights.push({
      type: "health_score",
      priority: "high",
      message: `Your financial health score is ${data.healthScore}. Focus on budgeting and saving to improve.`,
      action: "Review budgets"
    })
  } else if (data.healthScore >= 80) {
    insights.push({
      type: "health_score",
      priority: "low",
      message: `Excellent! Your financial health score is ${data.healthScore}. Keep it up!`
    })
  }

  // Budget warnings
  const overBudget = data.budgetStatus.filter(b => b.percentage >= 100)
  const nearLimit = data.budgetStatus.filter(b => b.percentage >= 80 && b.percentage < 100)

  if (overBudget.length > 0) {
    insights.push({
      type: "budget_exceeded",
      priority: "high",
      message: `${overBudget.length} category(s) over budget: ${overBudget.map(b => b.category).join(", ")}`,
      action: "Adjust spending"
    })
  }

  if (nearLimit.length > 0) {
    insights.push({
      type: "budget_warning",
      priority: "medium",
      message: `${nearLimit.length} category(s) approaching limit: ${nearLimit.map(b => b.category).join(", ")}`
    })
  }

  // Spending trend
  if (data.spendingTrend === "up") {
    insights.push({
      type: "spending_trend",
      priority: "medium",
      message: "Your spending is trending upward this month compared to last month."
    })
  }

  // Savings rate
  if (data.savingsRate < 10 && data.savingsRate >= 0) {
    insights.push({
      type: "savings",
      priority: "medium",
      message: `Your savings rate is ${data.savingsRate.toFixed(1)}%. Aim for at least 20% to build wealth faster.`,
      action: "Set savings goal"
    })
  }

  // Anomalies
  if (data.anomalyCount > 0) {
    insights.push({
      type: "anomalies",
      priority: "medium",
      message: `${data.anomalyCount} unusual transaction(s) detected. Review for accuracy.`,
      action: "Review transactions"
    })
  }

  // Upcoming bills
  if (data.upcomingBillsTotal > 0) {
    insights.push({
      type: "bills",
      priority: "low",
      message: `$${data.upcomingBillsTotal.toFixed(2)} in bills due in the next 7 days.`
    })
  }

  return insights.sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 }
    return priority[a.priority] - priority[b.priority]
  }).slice(0, 6)
}

// Predictive spending alerts
function generatePredictiveAlerts(
  projectedMonthlyTotal: number,
  budgets: Budget[],
  budgetSpending: Map<string, number>,
  dates: ReturnType<typeof getDateRanges>
): Array<{ category: string; currentSpent: number; projectedTotal: number; budget: number; daysUntilExceed: number | null }> {
  const alerts: Array<{ category: string; currentSpent: number; projectedTotal: number; budget: number; daysUntilExceed: number | null }> = []

  budgets.forEach(budget => {
    const currentSpent = budgetSpending.get(budget.category_id) || 0
    const dailyAverage = dates.currentDay > 0 ? currentSpent / dates.currentDay : 0
    const projectedTotal = currentSpent + (dailyAverage * dates.daysRemaining)

    if (projectedTotal > budget.amount && currentSpent < budget.amount) {
      // Will exceed but hasn't yet
      const remaining = budget.amount - currentSpent
      const daysUntilExceed = dailyAverage > 0 ? Math.ceil(remaining / dailyAverage) : null

      alerts.push({
        category: budget.categories?.name || "Unknown",
        currentSpent,
        projectedTotal: Math.round(projectedTotal * 100) / 100,
        budget: budget.amount,
        daysUntilExceed
      })
    }
  })

  return alerts.sort((a, b) => (a.daysUntilExceed || 999) - (b.daysUntilExceed || 999))
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const dates = getDateRanges()
    const userId = session.user.id

    // Fetch all necessary data in parallel
    const [
      transactionsRes,
      budgetsRes,
      goalsRes,
      billsRes,
      accountsRes,
      recurringRes,
      threeMonthTxnsRes
    ] = await Promise.all([
      // Recent transactions (last 3 months for pattern analysis)
      supabaseAdmin
        .from("transactions")
        .select("id, amount, date, description, category_id, account_id, is_transfer, categories(name, type)")
        .eq("user_id", userId)
        .gte("date", dates.startOfLastMonthStr)
        .order("date", { ascending: false }),

      // Budgets
      supabaseAdmin
        .from("budgets")
        .select("id, amount, category_id, categories(name)")
        .eq("user_id", userId),

      // Goals
      supabaseAdmin
        .from("goals")
        .select("id, name, target_amount, current_amount, target_date, is_completed")
        .eq("user_id", userId),

      // Bills
      supabaseAdmin
        .from("bills")
        .select("id, name, amount, frequency, next_due_date, is_active")
        .eq("user_id", userId),

      // Accounts for balance
      supabaseAdmin
        .from("accounts")
        .select("id, name, type, balance")
        .eq("user_id", userId),

      // Recurring transactions
      supabaseAdmin
        .from("recurring_transactions")
        .select("id, description, amount, frequency")
        .eq("user_id", userId)
        .eq("is_active", true),

      // Extended transaction history (3 months) for patterns
      supabaseAdmin
        .from("transactions")
        .select("id, amount, date, description, category_id, account_id, is_transfer, categories(name, type)")
        .eq("user_id", userId)
        .gte("date", new Date(dates.today.getFullYear(), dates.today.getMonth() - 3, 1).toISOString().split("T")[0])
        .order("date", { ascending: false })
    ])

    // Helper to normalize categories from Supabase (can be array or object)
    const normalizeCategory = (cat: { name: string; type: string } | { name: string; type: string }[] | null | undefined): { name: string; type: string } | null => {
      if (!cat) return null
      if (Array.isArray(cat)) return cat[0] || null
      return cat
    }

    const transactionsRaw = (transactionsRes.data || []) as TransactionRaw[]
    const transactions: Transaction[] = transactionsRaw.map(t => ({
      ...t,
      categories: normalizeCategory(t.categories)
    }))

    // Helper to normalize budget categories
    const normalizeBudgetCategory = (cat: { name: string } | { name: string }[] | null | undefined): { name: string } | null => {
      if (!cat) return null
      if (Array.isArray(cat)) return cat[0] || null
      return cat
    }

    const budgetsRaw = (budgetsRes.data || []) as BudgetRaw[]
    const budgets: Budget[] = budgetsRaw.map(b => ({
      ...b,
      categories: normalizeBudgetCategory(b.categories)
    }))

    const goals = (goalsRes.data || []) as Goal[]
    const bills = (billsRes.data || []) as Bill[]
    const accounts = accountsRes.data || []
    const recurringTransactions = (recurringRes.data || []) as RecurringTransaction[]

    const threeMonthTxnsRaw = (threeMonthTxnsRes.data || []) as TransactionRaw[]
    const threeMonthTxns: Transaction[] = threeMonthTxnsRaw.map(t => ({
      ...t,
      categories: normalizeCategory(t.categories)
    }))

    // Calculate current balance
    const currentBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)

    // Calculate budget spending for current month
    const budgetSpending = new Map<string, number>()
    const thisMonthTxns = transactions.filter(t =>
      t.date >= dates.startOfMonthStr &&
      t.date <= dates.todayStr &&
      t.amount < 0 &&
      !t.is_transfer
    )

    thisMonthTxns.forEach(t => {
      if (t.category_id) {
        budgetSpending.set(t.category_id, (budgetSpending.get(t.category_id) || 0) + Math.abs(t.amount))
      }
    })

    // Calculate monthly income and expenses
    const monthlyIncome = transactions
      .filter(t => t.date >= dates.startOfMonthStr && t.date <= dates.todayStr && t.amount > 0 && !t.is_transfer)
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyExpenses = thisMonthTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0

    // Check for emergency fund goal
    const hasEmergencyFund = goals.some(g =>
      g.name.toLowerCase().includes("emergency") &&
      g.current_amount >= g.target_amount * 0.5
    )

    // Calculate bills paid on time
    const activeBills = bills.filter(b => b.is_active)
    const overdueBills = activeBills.filter(b => b.next_due_date < dates.todayStr)
    const billsPaidOnTime = activeBills.length - overdueBills.length

    // Calculate goals progress
    const activeGoals = goals.filter(g => !g.is_completed)
    const goalsProgress = activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => sum + (g.current_amount / g.target_amount) * 100, 0) / activeGoals.length
      : 0

    // Calculate category averages for anomaly detection
    const categoryStats = new Map<string, { amounts: number[]; avg: number; stdDev: number }>()
    threeMonthTxns.forEach(t => {
      if (t.category_id && t.amount < 0 && !t.is_transfer) {
        if (!categoryStats.has(t.category_id)) {
          categoryStats.set(t.category_id, { amounts: [], avg: 0, stdDev: 0 })
        }
        categoryStats.get(t.category_id)!.amounts.push(Math.abs(t.amount))
      }
    })

    categoryStats.forEach((stats, catId) => {
      const avg = stats.amounts.reduce((a, b) => a + b, 0) / stats.amounts.length
      const variance = stats.amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / stats.amounts.length
      stats.avg = avg
      stats.stdDev = Math.sqrt(variance)
    })

    // 1. Calculate Financial Health Score
    const healthScoreResult = calculateHealthScore({
      budgets,
      budgetSpending,
      savingsRate,
      hasEmergencyFund,
      billsPaidOnTime,
      totalBills: activeBills.length,
      goalsProgress,
      hasActiveGoals: activeGoals.length > 0
    })

    // 2. Detect Anomalies
    const anomalies = detectAnomalies(thisMonthTxns, categoryStats)

    // 3. Detect Duplicates
    const duplicates = detectDuplicates(transactions)

    // 4. Spending Pattern Analysis
    const spendingPatterns = analyzeSpendingPatterns(threeMonthTxns)

    // 5. Subscription Audit
    const subscriptionAudit = auditSubscriptions(threeMonthTxns, recurringTransactions)

    // 6. Expense Predictions
    const expensePredictions = predictExpenses(transactions, dates)

    // 7. Cash Flow Forecasting
    const cashFlowForecast = forecastCashFlow(
      transactions,
      bills,
      recurringTransactions,
      currentBalance,
      dates
    )

    // 8. Goal Achievement Predictions
    const goalPredictions = predictGoalAchievement(goals)

    // 9. Bill Impact Analysis
    const billImpact = analyzeBillImpact(bills, currentBalance, monthlyIncome)

    // 10. Predictive Spending Alerts
    const predictiveAlerts = generatePredictiveAlerts(
      expensePredictions.projectedMonthlyTotal,
      budgets,
      budgetSpending,
      dates
    )

    // 11. Proactive Insights
    const budgetStatus = budgets.map(b => ({
      category: b.categories?.name || "Unknown",
      percentage: ((budgetSpending.get(b.category_id) || 0) / b.amount) * 100
    }))

    const lastMonthTotal = transactions
      .filter(t => t.date >= dates.startOfLastMonthStr && t.date <= dates.endOfLastMonthStr && t.amount < 0 && !t.is_transfer)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const spendingTrend = monthlyExpenses > lastMonthTotal * 1.1 ? "up" as const
      : monthlyExpenses < lastMonthTotal * 0.9 ? "down" as const
      : "stable" as const

    const upcomingBillsTotal = bills
      .filter(b => b.is_active && b.next_due_date >= dates.todayStr && b.next_due_date <= new Date(dates.today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .reduce((sum, b) => sum + (b.amount || 0), 0)

    const proactiveInsights = generateProactiveInsights({
      healthScore: healthScoreResult.score,
      budgetStatus,
      spendingTrend,
      goalsProgress,
      upcomingBillsTotal,
      anomalyCount: anomalies.length,
      savingsRate
    })

    return NextResponse.json({
      // Core metrics
      healthScore: {
        score: healthScoreResult.score,
        breakdown: healthScoreResult.breakdown,
        factors: healthScoreResult.factors,
        grade: healthScoreResult.score >= 80 ? "A" : healthScoreResult.score >= 60 ? "B" : healthScoreResult.score >= 40 ? "C" : "D"
      },

      // Proactive insights
      proactiveInsights,

      // Predictive alerts
      predictiveAlerts,

      // Anomaly detection
      anomalies: {
        items: anomalies,
        count: anomalies.length
      },

      // Duplicate detection
      duplicates: {
        items: duplicates,
        count: duplicates.length
      },

      // Spending patterns
      spendingPatterns,

      // Subscription audit
      subscriptionAudit,

      // Expense predictions
      expensePredictions,

      // Cash flow forecast
      cashFlowForecast,

      // Goal predictions
      goalPredictions,

      // Bill impact
      billImpact,

      // Summary stats
      summary: {
        currentBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate: Math.round(savingsRate * 100) / 100,
        spendingTrend,
        budgetsOverLimit: budgetStatus.filter(b => b.percentage >= 100).length,
        activeGoals: activeGoals.length,
        upcomingBills: activeBills.filter(b => b.next_due_date <= new Date(dates.today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]).length
      },

      // Metadata
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error generating AI insights:", error)
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    )
  }
}
