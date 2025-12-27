import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { suggestCategoryFromDescription } from "@/lib/validators/chat"

export const maxDuration = 30

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages } = await req.json()

  // Get user's categories and accounts for context
  const [categoriesRes, accountsRes] = await Promise.all([
    supabaseAdmin
      .from("categories")
      .select("id, name, type")
      .eq("user_id", session.user.id)
      .eq("is_archived", false),
    supabaseAdmin
      .from("accounts")
      .select("id, name, type")
      .eq("user_id", session.user.id),
  ])

  const categories = categoriesRes.data || []
  const accounts = accountsRes.data || []

  const categoryNames = categories.map((c) => c.name).join(", ")
  const accountNames = accounts.map((a) => a.name).join(", ")
  const defaultAccountId = accounts[0]?.id

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful personal finance assistant for a budget tracking app. You help users:
- Add transactions (expenses and income)
- Check spending summaries
- Contribute to savings goals
- Get budget status updates

User's available categories: ${categoryNames || "None yet"}
User's accounts: ${accountNames || "None yet"}

When adding transactions:
- Parse amounts, dates, and descriptions from natural language
- Suggest appropriate categories based on the description
- Default to today's date if not specified
- Default to the first account if not specified
- Always confirm what you're adding before saving

Be concise and helpful. Use Canadian dollars (CAD).

IMPORTANT: Never provide investment advice, tax advice, or financial planning recommendations.
If asked about investments or taxes, politely decline and suggest consulting a professional.`,
    messages,
    tools: {
      add_transaction: {
        description: "Add a new transaction (expense or income)",
        inputSchema: z.object({
          amount: z.number().positive().describe("Transaction amount (always positive)"),
          type: z.enum(["expense", "income"]).describe("Whether this is an expense or income"),
          description: z.string().describe("Description of the transaction"),
          category_name: z.string().optional().describe("Category name for the transaction"),
          date: z.string().optional().describe("Date in YYYY-MM-DD format, defaults to today"),
          account_name: z.string().optional().describe("Account name, defaults to first account"),
        }),
        execute: async ({ amount, type, description, category_name, date, account_name }: {
          amount: number
          type: "expense" | "income"
          description: string
          category_name?: string
          date?: string
          account_name?: string
        }) => {
          // Find category
          let category_id: string | null = null
          if (category_name) {
            const cat = categories.find(
              (c) => c.name.toLowerCase() === category_name.toLowerCase()
            )
            category_id = cat?.id || null
          }

          // If no category found, try to suggest one
          if (!category_id && description) {
            const suggestedName = suggestCategoryFromDescription(description)
            if (suggestedName) {
              const cat = categories.find(
                (c) => c.name.toLowerCase() === suggestedName.toLowerCase()
              )
              category_id = cat?.id || null
            }
          }

          // Find account
          let account_id = defaultAccountId
          if (account_name) {
            const acc = accounts.find(
              (a) => a.name.toLowerCase() === account_name.toLowerCase()
            )
            if (acc) account_id = acc.id
          }

          if (!account_id) {
            return { success: false, error: "No account found. Please create an account first." }
          }

          // Calculate signed amount
          const dbAmount = type === "expense" ? -Math.abs(amount) : Math.abs(amount)

          const { data, error } = await supabaseAdmin
            .from("transactions")
            .insert({
              user_id: session.user.id,
              account_id,
              category_id,
              date: date || new Date().toISOString().split("T")[0],
              amount: dbAmount,
              description,
              is_transfer: false,
            })
            .select()
            .single()

          if (error) {
            return { success: false, error: error.message }
          }

          const categoryUsed = categories.find((c) => c.id === category_id)?.name || "Uncategorized"
          const accountUsed = accounts.find((a) => a.id === account_id)?.name || "Unknown"

          return {
            success: true,
            transaction: {
              id: data.id,
              amount: Math.abs(amount),
              type,
              description,
              category: categoryUsed,
              account: accountUsed,
              date: data.date,
            },
          }
        },
      },

      get_spending_summary: {
        description: "Get spending summary for a time period",
        inputSchema: z.object({
          period: z.enum(["today", "this_week", "this_month", "last_month"]).describe("Time period"),
          category_name: z.string().optional().describe("Filter by category name"),
        }),
        execute: async ({ period, category_name }: { period: string; category_name?: string }) => {
          const today = new Date()
          let startDate: string
          let endDate: string = today.toISOString().split("T")[0]

          switch (period) {
            case "today":
              startDate = endDate
              break
            case "this_week":
              const weekStart = new Date(today)
              weekStart.setDate(today.getDate() - today.getDay())
              startDate = weekStart.toISOString().split("T")[0]
              break
            case "this_month":
              startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
              break
            case "last_month":
              const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
              startDate = lastMonth.toISOString().split("T")[0]
              const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
              endDate = lastMonthEnd.toISOString().split("T")[0]
              break
            default:
              startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
          }

          let query = supabaseAdmin
            .from("transactions")
            .select("amount, categories(name)")
            .eq("user_id", session.user.id)
            .lt("amount", 0) // Only expenses
            .gte("date", startDate)
            .lte("date", endDate)

          if (category_name) {
            const cat = categories.find(
              (c) => c.name.toLowerCase() === category_name.toLowerCase()
            )
            if (cat) {
              query = query.eq("category_id", cat.id)
            }
          }

          const { data, error } = await query

          if (error) {
            return { success: false, error: error.message }
          }

          const total = data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
          const count = data?.length || 0

          // Group by category
          const byCategory: Record<string, number> = {}
          data?.forEach((t) => {
            const categories = t.categories as unknown as { name: string } | null
            const catName = categories?.name || "Uncategorized"
            byCategory[catName] = (byCategory[catName] || 0) + Math.abs(t.amount)
          })

          return {
            success: true,
            period,
            startDate,
            endDate,
            total,
            count,
            byCategory,
          }
        },
      },

      get_budget_status: {
        description: "Get current budget status for categories",
        inputSchema: z.object({
          category_name: z.string().optional().describe("Filter by category name"),
        }),
        execute: async ({ category_name }: { category_name?: string }) => {
          const today = new Date()
          const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`

          let budgetQuery = supabaseAdmin
            .from("budgets")
            .select("amount, category_id, categories(name)")
            .eq("user_id", session.user.id)

          if (category_name) {
            const cat = categories.find(
              (c) => c.name.toLowerCase() === category_name.toLowerCase()
            )
            if (cat) {
              budgetQuery = budgetQuery.eq("category_id", cat.id)
            }
          }

          const { data: budgets, error } = await budgetQuery

          if (error) {
            return { success: false, error: error.message }
          }

          if (!budgets || budgets.length === 0) {
            return { success: true, budgets: [], message: "No budgets set up yet." }
          }

          // Get spending for each budget category
          const results = await Promise.all(
            budgets.map(async (budget) => {
              const categories = budget.categories as unknown as { name: string } | null
              const { data: transactions } = await supabaseAdmin
                .from("transactions")
                .select("amount")
                .eq("user_id", session.user.id)
                .eq("category_id", budget.category_id)
                .lt("amount", 0)
                .gte("date", startOfMonth)

              const spent = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
              const remaining = budget.amount - spent
              const percentage = Math.round((spent / budget.amount) * 100)

              return {
                category: categories?.name,
                budget: budget.amount,
                spent,
                remaining,
                percentage,
                status: percentage >= 100 ? "over" : percentage >= 90 ? "warning" : "ok",
              }
            })
          )

          return { success: true, budgets: results }
        },
      },

      add_goal_contribution: {
        description: "Add a contribution to a savings goal",
        inputSchema: z.object({
          goal_name: z.string().describe("Name of the goal to contribute to"),
          amount: z.number().positive().describe("Amount to contribute"),
        }),
        execute: async ({ goal_name, amount }: { goal_name: string; amount: number }) => {
          // Find the goal
          const { data: goals } = await supabaseAdmin
            .from("goals")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("is_completed", false)
            .ilike("name", `%${goal_name}%`)

          if (!goals || goals.length === 0) {
            return { success: false, error: `No active goal found matching "${goal_name}"` }
          }

          const goal = goals[0]

          // Add contribution
          const { error: contribError } = await supabaseAdmin
            .from("goal_contributions")
            .insert({
              user_id: session.user.id,
              goal_id: goal.id,
              amount,
              date: new Date().toISOString().split("T")[0],
            })

          if (contribError) {
            return { success: false, error: contribError.message }
          }

          // Update goal amount
          const newAmount = goal.current_amount + amount
          const isCompleted = newAmount >= goal.target_amount

          await supabaseAdmin
            .from("goals")
            .update({
              current_amount: newAmount,
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString().split("T")[0] : null,
            })
            .eq("id", goal.id)

          return {
            success: true,
            goal: goal.name,
            contributed: amount,
            newTotal: newAmount,
            target: goal.target_amount,
            percentage: Math.round((newAmount / goal.target_amount) * 100),
            isCompleted,
          }
        },
      },
    },
  })

  return result.toTextStreamResponse()
}
