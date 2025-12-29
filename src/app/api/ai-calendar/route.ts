import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const maxDuration = 30

interface BillPaymentSuggestion {
  bill_id: string
  bill_name: string
  amount: number
  due_date: string
  suggested_pay_date: string
  reason: string
  priority: "high" | "medium" | "low"
  savings_tip?: string
}

interface FinancialCalendarEvent {
  date: string
  type: "bill" | "recurring_transaction" | "goal_contribution" | "payday" | "budget_reset"
  title: string
  amount?: number
  category?: string
  priority: "high" | "medium" | "low"
  is_upcoming: boolean
  days_away: number
}

// GET - Get AI-powered financial calendar
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const startDate = searchParams.get("start") || new Date().toISOString().split("T")[0]
  const endDateParam = searchParams.get("end")
  const endDate = endDateParam || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  // Get optimal payment schedule
  if (action === "payment-schedule") {
    return getOptimalPaymentSchedule(session.user.id)
  }

  // Get financial calendar events
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [billsRes, recurringRes, goalsRes, transactionsRes] = await Promise.all([
    supabaseAdmin
      .from("bills")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .gte("next_due_date", startDate)
      .lte("next_due_date", endDate)
      .order("next_due_date"),
    supabaseAdmin
      .from("recurring_transactions")
      .select("*, categories(name)")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .gte("next_occurrence", startDate)
      .lte("next_occurrence", endDate),
    supabaseAdmin
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_completed", false),
    // Get recent income transactions to detect payday patterns
    supabaseAdmin
      .from("transactions")
      .select("amount, date, description")
      .eq("user_id", session.user.id)
      .gt("amount", 0)
      .gte("date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(50),
  ])

  const bills = billsRes.data || []
  const recurring = recurringRes.data || []
  const goals = goalsRes.data || []
  const incomeTransactions = transactionsRes.data || []

  const events: FinancialCalendarEvent[] = []

  // Add bill events
  for (const bill of bills) {
    const dueDate = new Date(bill.next_due_date)
    const daysAway = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    events.push({
      date: bill.next_due_date,
      type: "bill",
      title: bill.name,
      amount: bill.amount || 0,
      priority: daysAway <= 3 ? "high" : daysAway <= 7 ? "medium" : "low",
      is_upcoming: daysAway >= 0,
      days_away: daysAway,
    })
  }

  // Add recurring transaction events
  for (const rec of recurring) {
    const occDate = new Date(rec.next_occurrence)
    const daysAway = Math.ceil((occDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const catName = (rec.categories as unknown as { name: string } | null)?.name

    events.push({
      date: rec.next_occurrence,
      type: "recurring_transaction",
      title: rec.description,
      amount: rec.amount,
      category: catName || undefined,
      priority: "low",
      is_upcoming: daysAway >= 0,
      days_away: daysAway,
    })
  }

  // Add goal auto-contribution events
  for (const goal of goals) {
    if (goal.auto_contribute_amount && goal.auto_contribute_day) {
      // Find next contribution date in the range
      const start = new Date(startDate)
      const end = new Date(endDate)
      let current = new Date(start.getFullYear(), start.getMonth(), goal.auto_contribute_day)

      while (current <= end) {
        if (current >= start) {
          const daysAway = Math.ceil((current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          events.push({
            date: current.toISOString().split("T")[0],
            type: "goal_contribution",
            title: `${goal.name} contribution`,
            amount: goal.auto_contribute_amount,
            priority: "medium",
            is_upcoming: daysAway >= 0,
            days_away: daysAway,
          })
        }
        current.setMonth(current.getMonth() + 1)
      }
    }
  }

  // Detect payday patterns and add to calendar
  const paydays = detectPaydayPattern(incomeTransactions)
  for (const payday of paydays) {
    if (payday.date >= startDate && payday.date <= endDate) {
      const payDate = new Date(payday.date)
      const daysAway = Math.ceil((payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      events.push({
        date: payday.date,
        type: "payday",
        title: payday.description || "Payday",
        amount: payday.amount,
        priority: "medium",
        is_upcoming: daysAway >= 0,
        days_away: daysAway,
      })
    }
  }

  // Add budget reset events (1st of each month)
  const start = new Date(startDate)
  const end = new Date(endDate)
  let current = new Date(start.getFullYear(), start.getMonth(), 1)
  if (current < start) {
    current.setMonth(current.getMonth() + 1)
  }
  while (current <= end) {
    const daysAway = Math.ceil((current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    events.push({
      date: current.toISOString().split("T")[0],
      type: "budget_reset",
      title: "Budget Reset",
      priority: "low",
      is_upcoming: daysAway >= 0,
      days_away: daysAway,
    })
    current.setMonth(current.getMonth() + 1)
  }

  // Sort events by date
  events.sort((a, b) => a.date.localeCompare(b.date))

  // Group events by date
  const calendar: Record<string, FinancialCalendarEvent[]> = {}
  for (const event of events) {
    if (!calendar[event.date]) {
      calendar[event.date] = []
    }
    calendar[event.date].push(event)
  }

  // Calculate summary
  const summary = {
    total_events: events.length,
    upcoming_bills: events.filter((e) => e.type === "bill" && e.is_upcoming).length,
    total_upcoming_amount: events
      .filter((e) => e.is_upcoming && e.type === "bill")
      .reduce((sum, e) => sum + (e.amount || 0), 0),
    next_payday: events.find((e) => e.type === "payday" && e.is_upcoming),
    high_priority: events.filter((e) => e.priority === "high").length,
  }

  return NextResponse.json({ calendar, events, summary })
}

// Get optimal payment schedule for bills
async function getOptimalPaymentSchedule(userId: string) {
  const today = new Date()
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const [billsRes, accountsRes, transactionsRes] = await Promise.all([
    supabaseAdmin
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("next_due_date", today.toISOString().split("T")[0])
      .lte("next_due_date", thirtyDaysLater.toISOString().split("T")[0])
      .order("next_due_date"),
    supabaseAdmin.from("accounts").select("id, name").eq("user_id", userId),
    // Get recent transactions for balance estimation
    supabaseAdmin
      .from("transactions")
      .select("amount, account_id")
      .eq("user_id", userId),
  ])

  const bills = billsRes.data || []
  const accounts = accountsRes.data || []
  const transactions = transactionsRes.data || []

  // Calculate current balance
  const accountBalances: Record<string, number> = {}
  accounts.forEach((acc) => {
    accountBalances[acc.id] = 0
  })
  transactions.forEach((t) => {
    if (accountBalances[t.account_id] !== undefined) {
      accountBalances[t.account_id] += t.amount
    }
  })
  const totalBalance = Object.values(accountBalances).reduce((sum, b) => sum + b, 0)

  // Detect income pattern
  const incomeTransactions = transactions.filter((t) => t.amount > 0)
  const avgMonthlyIncome =
    incomeTransactions.length > 0
      ? (incomeTransactions.reduce((sum, t) => sum + t.amount, 0) / 3) // Assume 3 months of data
      : 0

  // Generate payment suggestions
  const suggestions: BillPaymentSuggestion[] = []

  for (const bill of bills) {
    const dueDate = new Date(bill.next_due_date)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let suggestedPayDate = bill.next_due_date
    let reason = "Pay on due date"
    let priority: "high" | "medium" | "low" = "medium"
    let savingsTip: string | undefined

    // Logic for optimal payment timing
    if (daysUntilDue <= 0) {
      // Overdue - pay immediately
      suggestedPayDate = today.toISOString().split("T")[0]
      reason = "Bill is overdue - pay immediately to avoid late fees"
      priority = "high"
    } else if (daysUntilDue <= 3) {
      // Due soon - pay now
      suggestedPayDate = today.toISOString().split("T")[0]
      reason = "Due in 3 days or less - pay now to avoid missing deadline"
      priority = "high"
    } else if (bill.is_auto_pay) {
      // Auto-pay enabled
      reason = "Auto-pay enabled - will be paid automatically"
      priority = "low"
    } else if (totalBalance < (bill.amount || 0) * 1.5) {
      // Low balance - wait for income if possible
      const safeDays = Math.min(daysUntilDue - 2, 7)
      if (safeDays > 0) {
        const newPayDate = new Date(today.getTime() + safeDays * 24 * 60 * 60 * 1000)
        suggestedPayDate = newPayDate.toISOString().split("T")[0]
        reason = `Low balance detected - wait ${safeDays} days for potential income while maintaining safety buffer`
        priority = "medium"
      }
    } else if (daysUntilDue > 14) {
      // Not urgent - can wait
      const payDateDays = Math.floor(daysUntilDue / 2)
      const newPayDate = new Date(today.getTime() + payDateDays * 24 * 60 * 60 * 1000)
      suggestedPayDate = newPayDate.toISOString().split("T")[0]
      reason = "Not urgent - can pay mid-way through the period"
      priority = "low"
    }

    // Add savings tips based on bill type
    if (bill.bill_type === "subscriptions") {
      savingsTip = "Consider reviewing if you're using this subscription. Many subscriptions go unused."
    } else if (bill.bill_type === "phone_internet" && (bill.amount || 0) > 100) {
      savingsTip = "Phone/internet bills over $100/month may have room for negotiation."
    } else if (bill.bill_type === "insurance") {
      savingsTip = "Consider shopping around for insurance quotes annually to ensure you have the best rate."
    }

    suggestions.push({
      bill_id: bill.id,
      bill_name: bill.name,
      amount: bill.amount || 0,
      due_date: bill.next_due_date,
      suggested_pay_date: suggestedPayDate,
      reason,
      priority,
      savings_tip: savingsTip,
    })
  }

  // Sort by priority and suggested date
  suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return a.suggested_pay_date.localeCompare(b.suggested_pay_date)
  })

  return NextResponse.json({
    suggestions,
    summary: {
      total_bills: bills.length,
      total_amount: bills.reduce((sum, b) => sum + (b.amount || 0), 0),
      current_balance: totalBalance,
      high_priority: suggestions.filter((s) => s.priority === "high").length,
      avg_monthly_income: avgMonthlyIncome,
    },
  })
}

// Detect payday pattern from income transactions
function detectPaydayPattern(
  transactions: Array<{ amount: number; date: string; description: string }>
): Array<{ date: string; amount: number; description: string }> {
  if (transactions.length < 2) return []

  // Group by similar amounts (likely same income source)
  const amountGroups: Record<string, typeof transactions> = {}
  for (const t of transactions) {
    // Round to nearest 100 for grouping
    const roundedAmount = Math.round(t.amount / 100) * 100
    const key = String(roundedAmount)
    if (!amountGroups[key]) {
      amountGroups[key] = []
    }
    amountGroups[key].push(t)
  }

  const predictedPaydays: Array<{ date: string; amount: number; description: string }> = []

  for (const [, group] of Object.entries(amountGroups)) {
    if (group.length < 2) continue

    // Get days of month for this group
    const daysOfMonth = group.map((t) => new Date(t.date).getDate())
    const uniqueDays = [...new Set(daysOfMonth)]

    if (uniqueDays.length <= 2) {
      // Likely a regular payday
      const avgAmount = group.reduce((sum, t) => sum + t.amount, 0) / group.length
      const mostRecentDate = new Date(group[0].date)

      // Predict next payday
      const dayOfMonth = uniqueDays[0]
      let nextPayday = new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth(), dayOfMonth)

      // If already passed, move to next month
      if (nextPayday <= new Date()) {
        nextPayday.setMonth(nextPayday.getMonth() + 1)
      }

      predictedPaydays.push({
        date: nextPayday.toISOString().split("T")[0],
        amount: avgAmount,
        description: group[0].description || "Payday",
      })
    }
  }

  return predictedPaydays
}
