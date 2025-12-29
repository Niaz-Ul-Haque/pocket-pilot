import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { aiNotificationSchema, type AINotification } from "@/lib/validators/ai-features"

export const maxDuration = 30

// GET - Retrieve AI notifications
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unread") === "true"
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  let query = supabaseAdmin
    .from("ai_notifications")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("is_dismissed", false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq("is_read", false)
  }

  const { data, error } = await query

  if (error) {
    console.error("[AI Notifications] Error fetching:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }

  const notifications = data as AINotification[]
  const counts = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    critical: notifications.filter((n) => n.priority === "critical" && !n.is_read).length,
    high: notifications.filter((n) => n.priority === "high" && !n.is_read).length,
  }

  return NextResponse.json({ notifications, counts })
}

// POST - Create notification or generate proactive notifications
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  // Generate proactive notifications
  if (action === "generate") {
    return generateProactiveNotifications(session.user.id)
  }

  // Create single notification
  const body = await request.json()
  const validation = aiNotificationSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid data", details: validation.error.issues }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("ai_notifications")
    .insert({
      user_id: session.user.id,
      ...validation.data,
    })
    .select()
    .single()

  if (error) {
    console.error("[AI Notifications] Error creating:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }

  return NextResponse.json({ notification: data })
}

// PUT - Mark notifications as read/dismissed
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { ids, action } = body as { ids: string[]; action: "read" | "dismiss" | "unread" }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 })
  }

  const updates: Record<string, boolean> = {}
  if (action === "read") updates.is_read = true
  if (action === "dismiss") updates.is_dismissed = true
  if (action === "unread") updates.is_read = false

  const { error } = await supabaseAdmin
    .from("ai_notifications")
    .update(updates)
    .eq("user_id", session.user.id)
    .in("id", ids)

  if (error) {
    console.error("[AI Notifications] Error updating:", error)
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// Generate proactive notifications based on user data
async function generateProactiveNotifications(userId: string) {
  const today = new Date()
  const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [transactionsRes, budgetsRes, goalsRes, billsRes, existingNotifications] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("amount, category_id, date, categories(name)")
      .eq("user_id", userId)
      .gte("date", startOfMonth),
    supabaseAdmin.from("budgets").select("*, categories(name)").eq("user_id", userId),
    supabaseAdmin.from("goals").select("*").eq("user_id", userId).eq("is_completed", false),
    supabaseAdmin.from("bills").select("*").eq("user_id", userId).eq("is_active", true),
    // Get recent notifications to avoid duplicates
    supabaseAdmin
      .from("ai_notifications")
      .select("notification_type, data")
      .eq("user_id", userId)
      .gte("created_at", new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  const transactions = transactionsRes.data || []
  const budgets = budgetsRes.data || []
  const goals = goalsRes.data || []
  const bills = billsRes.data || []
  const recentNotificationTypes = new Set(
    (existingNotifications.data || []).map((n) => `${n.notification_type}-${JSON.stringify(n.data)}`)
  )

  const notifications: Array<{
    user_id: string
    notification_type: string
    title: string
    message: string
    priority: string
    data: Record<string, unknown>
    action_url?: string
    action_label?: string
    expires_at?: string
  }> = []

  // Helper to check if notification already exists
  const notificationExists = (type: string, data: Record<string, unknown>) => {
    return recentNotificationTypes.has(`${type}-${JSON.stringify(data)}`)
  }

  // 1. Budget warnings
  for (const budget of budgets) {
    const spent = transactions
      .filter((t) => t.amount < 0 && t.category_id === budget.category_id)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const percentage = (spent / budget.amount) * 100
    const catName = (budget.categories as unknown as { name: string } | null)?.name || "Unknown"

    const data = { budget_id: budget.id, category: catName }

    if (percentage >= 100 && !notificationExists("budget_warning", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "budget_warning",
        title: `Budget Exceeded: ${catName}`,
        message: `You've spent $${spent.toFixed(2)} of your $${budget.amount.toFixed(2)} ${catName} budget (${Math.round(percentage)}%).`,
        priority: "critical",
        data,
        action_url: "/dashboard/budgets",
        action_label: "View Budgets",
      })
    } else if (percentage >= 90 && percentage < 100 && !notificationExists("budget_warning", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "budget_warning",
        title: `Budget Alert: ${catName}`,
        message: `You've used ${Math.round(percentage)}% of your ${catName} budget. Only $${(budget.amount - spent).toFixed(2)} remaining.`,
        priority: "high",
        data,
        action_url: "/dashboard/budgets",
        action_label: "View Budgets",
      })
    }
  }

  // 2. Bill reminders
  for (const bill of bills) {
    const dueDate = new Date(bill.next_due_date)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const data = { bill_id: bill.id, bill_name: bill.name }

    if (daysUntilDue < 0 && !notificationExists("bill_reminder", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "bill_reminder",
        title: `Overdue: ${bill.name}`,
        message: `${bill.name} was due ${Math.abs(daysUntilDue)} days ago. Amount: $${bill.amount?.toFixed(2) || "variable"}.`,
        priority: "critical",
        data,
        action_url: "/dashboard/bills",
        action_label: "Pay Now",
      })
    } else if (daysUntilDue === 0 && !notificationExists("bill_reminder", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "bill_reminder",
        title: `Due Today: ${bill.name}`,
        message: `${bill.name} is due today! Amount: $${bill.amount?.toFixed(2) || "variable"}.`,
        priority: "critical",
        data,
        action_url: "/dashboard/bills",
        action_label: "Pay Now",
      })
    } else if (daysUntilDue > 0 && daysUntilDue <= 3 && !notificationExists("bill_reminder", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "bill_reminder",
        title: `Upcoming: ${bill.name}`,
        message: `${bill.name} is due in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}. Amount: $${bill.amount?.toFixed(2) || "variable"}.`,
        priority: "high",
        data,
        action_url: "/dashboard/bills",
        action_label: "View Bills",
      })
    }
  }

  // 3. Goal reminders
  for (const goal of goals) {
    const progress = (goal.current_amount / goal.target_amount) * 100
    const data = { goal_id: goal.id, goal_name: goal.name }

    if (progress >= 90 && progress < 100 && !notificationExists("goal_reminder", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "goal_reminder",
        title: `Almost There: ${goal.name}`,
        message: `You're ${Math.round(progress)}% of the way to ${goal.name}! Only $${(goal.target_amount - goal.current_amount).toFixed(2)} to go.`,
        priority: "medium",
        data,
        action_url: "/dashboard/goals",
        action_label: "Contribute",
      })
    }

    // Check if goal has a target date and is falling behind
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date)
      const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysRemaining > 0) {
        const remaining = goal.target_amount - goal.current_amount
        const requiredDaily = remaining / daysRemaining
        const averageDaily = goal.current_amount / Math.max(1, Math.ceil((today.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)))

        if (requiredDaily > averageDaily * 1.5 && !notificationExists("goal_reminder", { ...data, type: "behind" })) {
          notifications.push({
            user_id: userId,
            notification_type: "goal_reminder",
            title: `Goal Behind Schedule: ${goal.name}`,
            message: `To reach ${goal.name} by ${goal.target_date}, you need to save $${requiredDaily.toFixed(2)}/day. Consider increasing contributions.`,
            priority: "medium",
            data: { ...data, type: "behind" },
            action_url: "/dashboard/goals",
            action_label: "Adjust Goal",
          })
        }
      }
    }
  }

  // 4. Spending insights
  const thisMonthSpending = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const projectedMonthly = (thisMonthSpending / dayOfMonth) * daysInMonth

  // Calculate total budget
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)

  if (projectedMonthly > totalBudget * 1.2 && totalBudget > 0) {
    const data = { projected: projectedMonthly, budget: totalBudget }
    if (!notificationExists("spending_alert", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "spending_alert",
        title: "Spending Projection Warning",
        message: `At current pace, you'll spend $${projectedMonthly.toFixed(2)} this month, exceeding your total budget of $${totalBudget.toFixed(2)} by ${Math.round(((projectedMonthly - totalBudget) / totalBudget) * 100)}%.`,
        priority: "high",
        data,
        action_url: "/dashboard/analytics",
        action_label: "View Spending",
        expires_at: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString(),
      })
    }
  }

  // 5. Savings opportunities
  const spendingByCategory: Record<string, number> = {}
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    const catName = (t.categories as unknown as { name: string } | null)?.name || "Uncategorized"
    spendingByCategory[catName] = (spendingByCategory[catName] || 0) + Math.abs(t.amount)
  })

  const topCategory = Object.entries(spendingByCategory).sort((a, b) => b[1] - a[1])[0]
  if (topCategory && topCategory[1] > thisMonthSpending * 0.3) {
    const data = { category: topCategory[0], amount: topCategory[1] }
    if (!notificationExists("savings_opportunity", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "savings_opportunity",
        title: `Savings Opportunity: ${topCategory[0]}`,
        message: `You've spent $${topCategory[1].toFixed(2)} on ${topCategory[0]} this month (${Math.round((topCategory[1] / thisMonthSpending) * 100)}% of total). Consider ways to reduce this category.`,
        priority: "low",
        data,
        action_url: "/dashboard/analytics",
        action_label: "Analyze",
        expires_at: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString(),
      })
    }
  }

  // 6. Weekly insight (only on Mondays)
  if (today.getDay() === 1) {
    const lastWeekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekTransactions = transactions.filter((t) => new Date(t.date) >= lastWeekStart)
    const lastWeekSpending = lastWeekTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const data = { week: lastWeekStart.toISOString().split("T")[0] }
    if (!notificationExists("weekly_insight", data)) {
      notifications.push({
        user_id: userId,
        notification_type: "weekly_insight",
        title: "Your Weekly Spending Summary",
        message: `Last week you spent $${lastWeekSpending.toFixed(2)}. Check your weekly summary for insights and tips.`,
        priority: "low",
        data,
        action_url: "/dashboard",
        action_label: "View Summary",
        expires_at: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }
  }

  // Insert notifications
  if (notifications.length > 0) {
    const { error } = await supabaseAdmin.from("ai_notifications").insert(notifications)
    if (error) {
      console.error("[AI Notifications] Error inserting:", error)
      return NextResponse.json({ error: "Failed to generate notifications" }, { status: 500 })
    }
  }

  return NextResponse.json({
    generated: notifications.length,
    notifications: notifications.map((n) => ({
      notification_type: n.notification_type,
      title: n.title,
      priority: n.priority,
    })),
  })
}
