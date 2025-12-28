import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export type NotificationType = "bill" | "budget"
export type NotificationPriority = "critical" | "warning" | "info"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  route: string
  createdAt: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  counts: {
    total: number
    critical: number
    warning: number
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications: Notification[] = []

    // Fetch active bills
    const { data: bills } = await supabaseAdmin
      .from("bills")
      .select("id, name, amount, next_due_date, frequency")
      .eq("user_id", session.user.id)
      .eq("is_active", true)

    if (bills) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const bill of bills) {
        const dueDate = new Date(bill.next_due_date)
        dueDate.setHours(0, 0, 0, 0)
        const diffTime = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (daysUntilDue < 0) {
          // Overdue
          notifications.push({
            id: `bill-${bill.id}`,
            type: "bill",
            title: "Overdue Bill",
            message: `${bill.name} was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""} ago`,
            priority: "critical",
            route: "/dashboard/bills",
            createdAt: new Date().toISOString(),
          })
        } else if (daysUntilDue === 0) {
          // Due today
          notifications.push({
            id: `bill-${bill.id}`,
            type: "bill",
            title: "Bill Due Today",
            message: `${bill.name}${bill.amount ? ` ($${bill.amount})` : ""} is due today`,
            priority: "critical",
            route: "/dashboard/bills",
            createdAt: new Date().toISOString(),
          })
        } else if (daysUntilDue <= 3) {
          // Due soon
          notifications.push({
            id: `bill-${bill.id}`,
            type: "bill",
            title: "Bill Due Soon",
            message: `${bill.name} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
            priority: "warning",
            route: "/dashboard/bills",
            createdAt: new Date().toISOString(),
          })
        }
      }
    }

    // Fetch budgets with spending
    const { data: budgets } = await supabaseAdmin
      .from("budgets")
      .select(`
        id,
        amount,
        categories:category_id (
          id,
          name
        )
      `)
      .eq("user_id", session.user.id)

    if (budgets) {
      // Get current month date range
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

      for (const budget of budgets) {
        // Handle Supabase joined data (can be object or array)
        const categoryData = budget.categories as unknown
        const category = Array.isArray(categoryData)
          ? (categoryData[0] as { id: string; name: string } | undefined)
          : (categoryData as { id: string; name: string } | null)
        if (!category) continue

        // Get spending for this category this month
        const { data: transactions } = await supabaseAdmin
          .from("transactions")
          .select("amount")
          .eq("user_id", session.user.id)
          .eq("category_id", category.id)
          .lt("amount", 0) // Only expenses (negative amounts)
          .gte("date", startOfMonth)
          .lte("date", endOfMonth)

        const spent = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) ?? 0
        const percentage = (spent / budget.amount) * 100

        if (percentage >= 100) {
          // Over budget
          notifications.push({
            id: `budget-${budget.id}`,
            type: "budget",
            title: "Over Budget",
            message: `${category.name}: $${spent.toFixed(0)} of $${budget.amount} (${percentage.toFixed(0)}%)`,
            priority: "critical",
            route: "/dashboard/budgets",
            createdAt: new Date().toISOString(),
          })
        } else if (percentage >= 90) {
          // Warning
          notifications.push({
            id: `budget-${budget.id}`,
            type: "budget",
            title: "Budget Warning",
            message: `${category.name}: ${percentage.toFixed(0)}% spent ($${(budget.amount - spent).toFixed(0)} left)`,
            priority: "warning",
            route: "/dashboard/budgets",
            createdAt: new Date().toISOString(),
          })
        }
      }
    }

    // Sort by priority (critical first) then by type
    notifications.sort((a, b) => {
      const priorityOrder = { critical: 0, warning: 1, info: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    const counts = {
      total: notifications.length,
      critical: notifications.filter((n) => n.priority === "critical").length,
      warning: notifications.filter((n) => n.priority === "warning").length,
    }

    return NextResponse.json({ notifications, counts } as NotificationsResponse)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
