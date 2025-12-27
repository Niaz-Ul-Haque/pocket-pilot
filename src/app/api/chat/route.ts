import { streamText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { suggestCategoryFromDescription } from "@/lib/validators/chat"

// Create Z.AI client using OpenAI-compatible provider
const zai = createOpenAICompatible({
  name: "zai",
  baseURL: "https://api.z.ai/api/paas/v4",
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
})

export const maxDuration = 30

// Helper function to parse date strings like "today", "tomorrow", "next monday", etc.
function parseDateString(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString().split("T")[0]
  
  const lower = dateStr.toLowerCase().trim()
  const today = new Date()
  
  if (lower === "today") {
    return today.toISOString().split("T")[0]
  }
  
  if (lower === "tomorrow") {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }
  
  if (lower === "yesterday") {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return yesterday.toISOString().split("T")[0]
  }
  
  // Check if it matches YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Try to parse other date formats
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0]
  }
  
  // Default to today if we can't parse
  return today.toISOString().split("T")[0]
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages: rawMessages } = await req.json()

  // Debug: Log raw messages
  console.log("[Z.AI API] Raw messages received:", JSON.stringify(rawMessages, null, 2))

  // Convert messages from UI format (parts) to API format (content)
  const messages = rawMessages.map((msg: { role: string; parts?: Array<{ type: string; text?: string }>; content?: string }) => {
    // If message has parts array (new UI format), convert to content string
    if (msg.parts && Array.isArray(msg.parts)) {
      const textContent = msg.parts
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("")
      return { role: msg.role, content: textContent }
    }
    // Already in correct format
    return { role: msg.role, content: msg.content || "" }
  }).filter((msg: { role: string; content: string }) => msg.content && msg.content.trim() !== "")

  // Debug: Log converted messages
  console.log("[Z.AI API] Converted messages:", JSON.stringify(messages, null, 2))

  // If no valid messages, return error
  if (messages.length === 0) {
    return new Response("No valid messages provided", { status: 400 })
  }

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
    model: zai.chatModel("glm-4-32b-0414-128k"),
    system: `You are Pocket Pilot, a helpful personal finance assistant. You help users manage their money by:
- Adding one-time TRANSACTIONS (expenses and income) - use add_transaction tool
- Adding recurring BILLS (rent, phone, utilities, subscriptions) - use add_bill tool
- Adding recurring TRANSACTIONS (salary, regular income, scheduled expenses) - use add_recurring_transaction tool
- Checking how much they've spent - use get_spending_summary tool
- Getting budget status updates - use get_budget_status tool
- Contributing to savings goals - use add_goal_contribution tool
- Analyzing spending trends over time - use get_spending_trends tool
- Forecasting end-of-month spending - use get_forecast tool
- Getting personalized financial suggestions - use get_suggestions tool

IMPORTANT DISTINCTIONS:
- TRANSACTION: A one-time expense or income (groceries, coffee, contract work income)
- BILL: A recurring expense that needs tracking with due dates and reminders (phone bill, rent, Netflix, utilities)
- RECURRING TRANSACTION: A transaction that automatically repeats on a schedule (salary, regular income, scheduled transfers)

Use add_bill for bills with due dates that need tracking (you'll mark them as paid).
Use add_recurring_transaction for income or expenses that auto-generate (like salary).

When the user says "add a bill" or mentions recurring payments, use the add_bill tool.
When the user says "add an expense" or "add income" or mentions one-time purchases, use add_transaction tool.

User's available categories: ${categoryNames || "None yet"}
User's accounts: ${accountNames || "None yet"}
Today's date: ${new Date().toISOString().split("T")[0]}

CRITICAL WORKFLOW FOR ADDING ITEMS:
1. When user asks to add something, first confirm the details with them
2. When user confirms, you MUST IMMEDIATELY call the appropriate tool
3. After the tool executes successfully, respond with: "Perfect! I've added [description] for you."
4. If the tool fails, explain the error and ask if they want to try again

*** CONFIRMATION DETECTION - EXTREMELY IMPORTANT ***
When the user responds with ANY of these confirmation words or phrases, you MUST IMMEDIATELY call the tool WITHOUT asking more questions:
- "yes", "yep", "yeah", "yup", "y"
- "correct", "right", "exactly"
- "looks good", "sounds good", "that's right", "that works"
- "add it", "do it", "go ahead", "proceed"
- "please do", "please", "sure", "ok", "okay", "k"
- "confirmed", "confirm", "perfect", "great"
- Any similar affirmative response

When you see a confirmation, ALWAYS:
1. Call the tool FIRST
2. Then respond with acknowledgement AFTER the tool succeeds
3. NEVER just respond with text without calling the tool
4. NEVER ask for more confirmation - just execute

Example:
User: "Add $50 for groceries"
Assistant: "I'll add a $50 expense for groceries today. Does that look correct?"
User: "yes"
Assistant: [MUST call add_transaction tool] -> "Perfect! I've added $50 for groceries."

RESPONSE GUIDELINES:
- Be concise and friendly
- Use Canadian dollars (CAD)
- Parse natural language dates: "today", "tomorrow", "yesterday", specific dates
- When asked about spending, USE the get_spending_summary tool to get real data
- When user confirms an action, ALWAYS call the tool - don't just respond with text
- Always acknowledge after completing an action

IMPORTANT: Never provide investment advice, tax advice, or financial planning recommendations.
If asked about investments or taxes, politely decline and suggest consulting a professional.`,
    messages,
    tools: {
      add_transaction: {
        description: "Add a one-time transaction (expense or income). Use this for groceries, coffee, one-time purchases, salary, contract work, etc. NOT for recurring bills. CALL THIS TOOL when user confirms they want to add a transaction.",
        inputSchema: z.object({
          amount: z.number().positive().describe("Transaction amount (always positive)"),
          type: z.enum(["expense", "income"]).describe("Whether this is an expense or income"),
          description: z.string().describe("Description of the transaction"),
          category_name: z.string().optional().describe("Category name for the transaction"),
          date: z.string().optional().describe("Date - can be 'today', 'tomorrow', 'yesterday', or YYYY-MM-DD format"),
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
          
          // Parse the date properly
          const parsedDate = parseDateString(date)

          const { data, error } = await supabaseAdmin
            .from("transactions")
            .insert({
              user_id: session.user.id,
              account_id,
              category_id,
              date: parsedDate,
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
            message: `Done! I've added a ${type} of $${amount.toFixed(2)} for "${description}" on ${parsedDate}.`,
            transaction: {
              id: data.id,
              amount: Math.abs(amount),
              type,
              description,
              category: categoryUsed,
              account: accountUsed,
              date: parsedDate,
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
            message: `Done! I've added $${amount.toFixed(2)} to your "${goal.name}" goal.`,
            goal: goal.name,
            contributed: amount,
            newTotal: newAmount,
            target: goal.target_amount,
            percentage: Math.round((newAmount / goal.target_amount) * 100),
            isCompleted,
          }
        },
      },

      add_bill: {
        description: "Add a recurring bill (rent, phone, electricity, utilities, subscriptions, etc.). CALL THIS TOOL when user confirms they want to add a bill. Use this for anything that recurs on a schedule.",
        inputSchema: z.object({
          name: z.string().describe("Name of the bill (e.g., 'Phone Bill', 'Electricity Bill', 'Netflix', 'Rent')"),
          amount: z.number().positive().describe("Bill amount"),
          frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]).default("monthly").describe("How often the bill recurs"),
          due_date: z.string().describe("Next due date - can be 'today', 'tomorrow', or a specific date"),
          category_name: z.string().optional().describe("Category name for the bill"),
          is_auto_pay: z.boolean().optional().default(false).describe("Whether this bill is on auto-pay"),
        }),
        execute: async ({ name, amount, frequency, due_date, category_name, is_auto_pay }: {
          name: string
          amount: number
          frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
          due_date: string
          category_name?: string
          is_auto_pay?: boolean
        }) => {
          // Find category
          let category_id: string | null = null
          if (category_name) {
            const cat = categories.find(
              (c) => c.name.toLowerCase() === category_name.toLowerCase()
            )
            category_id = cat?.id || null
          }

          // If no category, try to suggest based on bill name
          if (!category_id) {
            const lowerName = name.toLowerCase()
            if (lowerName.includes("phone") || lowerName.includes("internet") || lowerName.includes("electric") || lowerName.includes("gas") || lowerName.includes("water")) {
              const utilityCat = categories.find((c) => c.name.toLowerCase() === "utilities")
              category_id = utilityCat?.id || null
            } else if (lowerName.includes("rent") || lowerName.includes("mortgage")) {
              const housingCat = categories.find((c) => c.name.toLowerCase() === "housing")
              category_id = housingCat?.id || null
            } else if (lowerName.includes("netflix") || lowerName.includes("spotify") || lowerName.includes("subscription")) {
              const entCat = categories.find((c) => c.name.toLowerCase() === "entertainment")
              category_id = entCat?.id || null
            }
          }

          // Parse the due date
          const parsedDueDate = parseDateString(due_date)

          const { data, error } = await supabaseAdmin
            .from("bills")
            .insert({
              user_id: session.user.id,
              name,
              amount,
              frequency,
              next_due_date: parsedDueDate,
              category_id,
              auto_pay: is_auto_pay || false,
            })
            .select()
            .single()

          if (error) {
            return { success: false, error: error.message }
          }

          const categoryUsed = categories.find((c) => c.id === category_id)?.name || "Uncategorized"

          return {
            success: true,
            message: `Done! I've added your "${name}" bill for $${amount.toFixed(2)} (${frequency}), next due on ${parsedDueDate}.`,
            bill: {
              id: data.id,
              name,
              amount,
              frequency,
              due_date: parsedDueDate,
              category: categoryUsed,
              is_auto_pay: is_auto_pay || false,
            },
          }
        },
      },

      get_spending_trends: {
        description: "Analyze spending trends over time. Shows month-over-month comparison and trend direction. Use when user asks about spending patterns, trends, or how their spending has changed.",
        inputSchema: z.object({
          category_name: z.string().optional().describe("Filter by category name"),
          months: z.number().int().min(1).max(12).default(3).describe("Number of months to analyze (1-12)"),
        }),
        execute: async ({ category_name, months = 3 }: { category_name?: string; months?: number }) => {
          const today = new Date()
          const monthlyData: Array<{ month: string; total: number; count: number }> = []

          // Get data for each month
          for (let i = 0; i < months; i++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const startDate = monthDate.toISOString().split("T")[0]
            const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split("T")[0]
            const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })

            let query = supabaseAdmin
              .from("transactions")
              .select("amount, category_id")
              .eq("user_id", session.user.id)
              .lt("amount", 0) // Only expenses
              .gte("date", startDate)
              .lte("date", endDate)

            if (category_name) {
              const cat = categories.find((c) => c.name.toLowerCase() === category_name.toLowerCase())
              if (cat) {
                query = query.eq("category_id", cat.id)
              }
            }

            const { data } = await query

            const total = data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
            const count = data?.length || 0

            monthlyData.unshift({ month: monthLabel, total, count })
          }

          // Calculate trends
          const currentMonth = monthlyData[monthlyData.length - 1]
          const previousMonth = monthlyData[monthlyData.length - 2]
          let percentChange = 0
          let trendDirection: "up" | "down" | "stable" = "stable"

          if (previousMonth && previousMonth.total > 0) {
            percentChange = Math.round(((currentMonth.total - previousMonth.total) / previousMonth.total) * 100)
            if (percentChange > 5) trendDirection = "up"
            else if (percentChange < -5) trendDirection = "down"
          }

          const avgMonthly = monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length

          return {
            success: true,
            category: category_name || "All Categories",
            monthsAnalyzed: months,
            monthlyData,
            currentMonth: currentMonth.total,
            previousMonth: previousMonth?.total || 0,
            percentChange,
            trendDirection,
            averageMonthly: Math.round(avgMonthly * 100) / 100,
            insight: trendDirection === "up"
              ? `Spending is up ${Math.abs(percentChange)}% compared to last month.`
              : trendDirection === "down"
              ? `Spending is down ${Math.abs(percentChange)}% compared to last month.`
              : "Spending is stable compared to last month.",
          }
        },
      },

      get_forecast: {
        description: "Forecast end-of-month spending based on current pace. Shows projected total and comparison to budget. Use when user asks about projections, forecasts, or if they'll stay within budget.",
        inputSchema: z.object({
          category_name: z.string().optional().describe("Filter by category name"),
        }),
        execute: async ({ category_name }: { category_name?: string }) => {
          const today = new Date()
          const currentDay = today.getDate()
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
          const daysRemaining = daysInMonth - currentDay
          const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
          const todayStr = today.toISOString().split("T")[0]

          // Get spending so far this month
          let query = supabaseAdmin
            .from("transactions")
            .select("amount, category_id")
            .eq("user_id", session.user.id)
            .lt("amount", 0) // Only expenses
            .gte("date", startOfMonth)
            .lte("date", todayStr)

          let category_id: string | null = null
          if (category_name) {
            const cat = categories.find((c) => c.name.toLowerCase() === category_name.toLowerCase())
            if (cat) {
              category_id = cat.id
              query = query.eq("category_id", cat.id)
            }
          }

          const { data: transactions } = await query

          const spentSoFar = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
          const dailyAverage = currentDay > 0 ? spentSoFar / currentDay : 0
          const projectedTotal = spentSoFar + (dailyAverage * daysRemaining)

          // Get budget if available
          let budgetAmount = 0
          let budgetStatus = "no_budget"
          if (category_id) {
            const { data: budget } = await supabaseAdmin
              .from("budgets")
              .select("amount")
              .eq("user_id", session.user.id)
              .eq("category_id", category_id)
              .single()

            if (budget) {
              budgetAmount = budget.amount
              if (projectedTotal > budgetAmount) {
                budgetStatus = "will_exceed"
              } else if (projectedTotal > budgetAmount * 0.9) {
                budgetStatus = "close_to_limit"
              } else {
                budgetStatus = "on_track"
              }
            }
          } else {
            // Get total budget across all categories
            const { data: budgets } = await supabaseAdmin
              .from("budgets")
              .select("amount")
              .eq("user_id", session.user.id)

            if (budgets && budgets.length > 0) {
              budgetAmount = budgets.reduce((sum, b) => sum + b.amount, 0)
              if (projectedTotal > budgetAmount) {
                budgetStatus = "will_exceed"
              } else if (projectedTotal > budgetAmount * 0.9) {
                budgetStatus = "close_to_limit"
              } else {
                budgetStatus = "on_track"
              }
            }
          }

          const projectedOverUnder = budgetAmount > 0 ? projectedTotal - budgetAmount : 0

          return {
            success: true,
            category: category_name || "All Categories",
            currentDay,
            daysInMonth,
            daysRemaining,
            spentSoFar: Math.round(spentSoFar * 100) / 100,
            dailyAverage: Math.round(dailyAverage * 100) / 100,
            projectedTotal: Math.round(projectedTotal * 100) / 100,
            budget: budgetAmount,
            budgetStatus,
            projectedOverUnder: Math.round(projectedOverUnder * 100) / 100,
            insight: budgetStatus === "will_exceed"
              ? `At your current pace, you'll exceed your budget by $${Math.abs(projectedOverUnder).toFixed(2)}.`
              : budgetStatus === "close_to_limit"
              ? `You're close to your budget limit. Consider slowing down spending.`
              : budgetStatus === "on_track"
              ? `You're on track to stay within budget with $${Math.abs(projectedOverUnder).toFixed(2)} to spare.`
              : `You're spending about $${dailyAverage.toFixed(2)} per day.`,
          }
        },
      },

      get_suggestions: {
        description: "Get personalized financial suggestions based on spending patterns, budget status, and goals. Use when user asks for advice, tips, or recommendations on improving their finances.",
        inputSchema: z.object({}),
        execute: async () => {
          const today = new Date()
          const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
          const todayStr = today.toISOString().split("T")[0]
          const suggestions: Array<{ type: string; priority: "high" | "medium" | "low"; message: string }> = []

          // 1. Check budget status
          const { data: budgets } = await supabaseAdmin
            .from("budgets")
            .select("amount, category_id, categories(name)")
            .eq("user_id", session.user.id)

          if (budgets && budgets.length > 0) {
            for (const budget of budgets) {
              const { data: transactions } = await supabaseAdmin
                .from("transactions")
                .select("amount")
                .eq("user_id", session.user.id)
                .eq("category_id", budget.category_id)
                .lt("amount", 0)
                .gte("date", startOfMonth)
                .lte("date", todayStr)

              const spent = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
              const percentage = (spent / budget.amount) * 100
              const categoryName = (budget.categories as unknown as { name: string })?.name || "Unknown"

              if (percentage >= 100) {
                suggestions.push({
                  type: "budget_exceeded",
                  priority: "high",
                  message: `You've exceeded your ${categoryName} budget by $${(spent - budget.amount).toFixed(2)}. Consider reducing spending in this category.`,
                })
              } else if (percentage >= 90) {
                suggestions.push({
                  type: "budget_warning",
                  priority: "medium",
                  message: `You're at ${Math.round(percentage)}% of your ${categoryName} budget. Only $${(budget.amount - spent).toFixed(2)} remaining.`,
                })
              }
            }
          } else {
            suggestions.push({
              type: "no_budgets",
              priority: "medium",
              message: "Consider setting up budgets to track your spending limits.",
            })
          }

          // 2. Check goals progress
          const { data: goals } = await supabaseAdmin
            .from("goals")
            .select("name, target_amount, current_amount, target_date")
            .eq("user_id", session.user.id)
            .eq("is_completed", false)

          if (goals && goals.length > 0) {
            for (const goal of goals) {
              const progress = (goal.current_amount / goal.target_amount) * 100
              const remaining = goal.target_amount - goal.current_amount

              if (goal.target_date) {
                const targetDate = new Date(goal.target_date)
                const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const dailyNeeded = daysUntilTarget > 0 ? remaining / daysUntilTarget : remaining

                if (daysUntilTarget <= 30 && progress < 90) {
                  suggestions.push({
                    type: "goal_deadline",
                    priority: "high",
                    message: `Your "${goal.name}" goal deadline is in ${daysUntilTarget} days. You need to save $${dailyNeeded.toFixed(2)}/day to reach it.`,
                  })
                }
              }

              if (progress < 25) {
                suggestions.push({
                  type: "goal_progress",
                  priority: "low",
                  message: `Your "${goal.name}" goal is at ${Math.round(progress)}%. Consider making a contribution to get closer to your $${goal.target_amount.toFixed(2)} target.`,
                })
              }
            }
          } else {
            suggestions.push({
              type: "no_goals",
              priority: "low",
              message: "Setting savings goals can help you build financial discipline. Consider creating one!",
            })
          }

          // 3. Check for upcoming bills
          const nextWeek = new Date(today)
          nextWeek.setDate(today.getDate() + 7)
          const nextWeekStr = nextWeek.toISOString().split("T")[0]

          const { data: upcomingBills } = await supabaseAdmin
            .from("bills")
            .select("name, amount, next_due_date")
            .eq("user_id", session.user.id)
            .eq("is_active", true)
            .gte("next_due_date", todayStr)
            .lte("next_due_date", nextWeekStr)

          if (upcomingBills && upcomingBills.length > 0) {
            const totalDue = upcomingBills.reduce((sum, b) => sum + (b.amount || 0), 0)
            suggestions.push({
              type: "upcoming_bills",
              priority: "medium",
              message: `You have ${upcomingBills.length} bill(s) due in the next 7 days totaling $${totalDue.toFixed(2)}.`,
            })
          }

          // 4. Check spending patterns
          const { data: thisMonthTx } = await supabaseAdmin
            .from("transactions")
            .select("amount")
            .eq("user_id", session.user.id)
            .lt("amount", 0)
            .gte("date", startOfMonth)
            .lte("date", todayStr)

          const thisMonthTotal = thisMonthTx?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

          // Get last month's total for comparison
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0]
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0]

          const { data: lastMonthTx } = await supabaseAdmin
            .from("transactions")
            .select("amount")
            .eq("user_id", session.user.id)
            .lt("amount", 0)
            .gte("date", lastMonthStart)
            .lte("date", lastMonthEnd)

          const lastMonthTotal = lastMonthTx?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

          if (lastMonthTotal > 0) {
            const percentChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
            if (percentChange > 20) {
              suggestions.push({
                type: "spending_increase",
                priority: "medium",
                message: `Your spending is up ${Math.round(percentChange)}% compared to last month. Review your expenses to identify areas to cut back.`,
              })
            }
          }

          // Sort by priority
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

          return {
            success: true,
            suggestionsCount: suggestions.length,
            suggestions: suggestions.slice(0, 5), // Top 5 suggestions
            summary: suggestions.length > 0
              ? `I found ${suggestions.length} suggestions to help improve your finances.`
              : "Your finances look good! Keep up the great work.",
          }
        },
      },

      add_recurring_transaction: {
        description: "Add a recurring transaction that auto-generates on a schedule (like salary, regular income, or scheduled expenses). Use this for transactions that repeat automatically. CALL THIS TOOL when user confirms they want to add a recurring transaction.",
        inputSchema: z.object({
          description: z.string().describe("Description of the recurring transaction (e.g., 'Salary', 'Rent', 'Gym membership')"),
          amount: z.number().positive().describe("Transaction amount (always positive)"),
          type: z.enum(["expense", "income"]).describe("Whether this is an expense or income"),
          frequency: z.enum(["weekly", "biweekly", "monthly", "yearly"]).default("monthly").describe("How often the transaction occurs"),
          next_occurrence_date: z.string().optional().describe("Next date this should occur - can be 'today', 'tomorrow', or YYYY-MM-DD format"),
          category_name: z.string().optional().describe("Category name for the transaction"),
          account_name: z.string().optional().describe("Account name, defaults to first account"),
        }),
        execute: async ({ description, amount, type, frequency, next_occurrence_date, category_name, account_name }: {
          description: string
          amount: number
          type: "expense" | "income"
          frequency: "weekly" | "biweekly" | "monthly" | "yearly"
          next_occurrence_date?: string
          category_name?: string
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

          // Parse the date properly
          const parsedDate = parseDateString(next_occurrence_date)

          const { data, error } = await supabaseAdmin
            .from("recurring_transactions")
            .insert({
              user_id: session.user.id,
              account_id,
              category_id,
              description,
              amount: dbAmount,
              frequency,
              next_occurrence_date: parsedDate,
              is_active: true,
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
            message: `Done! I've set up a recurring ${type} of $${amount.toFixed(2)} for "${description}" (${frequency}), starting ${parsedDate}.`,
            recurring_transaction: {
              id: data.id,
              amount: Math.abs(amount),
              type,
              description,
              frequency,
              next_occurrence_date: parsedDate,
              category: categoryUsed,
              account: accountUsed,
            },
          }
        },
      },
    },
  })

  return result.toTextStreamResponse()
}
