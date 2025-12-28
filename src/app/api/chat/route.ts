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
- Smart categorization for transactions - use smart_categorize tool
- Running "what if" financial scenarios - use what_if_scenario tool
- Generating financial reports - use get_report tool
- Comparing spending between periods - use compare_periods tool
- Finding savings opportunities - use find_savings_opportunities tool
- Getting bill negotiation tips - use get_bill_negotiation_tips tool
- Checking underutilized budgets - use check_unused_budgets tool
- Tracking financial habits - use track_financial_habits tool

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

      smart_categorize: {
        description: "Suggest categories for uncategorized transactions or help categorize a new transaction based on description. Use when user asks about categorization or has uncategorized transactions.",
        inputSchema: z.object({
          description: z.string().optional().describe("Transaction description to categorize"),
          get_uncategorized: z.boolean().optional().describe("Set to true to get list of uncategorized transactions"),
        }),
        execute: async ({ description, get_uncategorized }: { description?: string; get_uncategorized?: boolean }) => {
          if (get_uncategorized) {
            const { data: uncategorized } = await supabaseAdmin
              .from("transactions")
              .select("id, description, amount, date")
              .eq("user_id", session.user.id)
              .is("category_id", null)
              .order("date", { ascending: false })
              .limit(10)

            if (!uncategorized || uncategorized.length === 0) {
              return { success: true, message: "All your transactions are categorized!", uncategorized: [] }
            }

            const suggestions = uncategorized.map(t => {
              const suggested = suggestCategoryFromDescription(t.description || "")
              const matchedCat = suggested ? categories.find(c => c.name.toLowerCase() === suggested.toLowerCase()) : null
              return {
                id: t.id,
                description: t.description,
                amount: t.amount,
                date: t.date,
                suggestedCategory: matchedCat?.name || "Uncategorized",
              }
            })

            return {
              success: true,
              count: suggestions.length,
              uncategorized: suggestions,
              message: `Found ${suggestions.length} uncategorized transaction(s) with suggested categories.`
            }
          }

          if (description) {
            const suggested = suggestCategoryFromDescription(description)
            const matchedCat = suggested ? categories.find(c => c.name.toLowerCase() === suggested.toLowerCase()) : null

            return {
              success: true,
              description,
              suggestedCategory: matchedCat?.name || "Uncategorized",
              confidence: matchedCat ? "high" : "low",
              availableCategories: categories.filter(c => c.type === "expense").map(c => c.name).slice(0, 10)
            }
          }

          return { success: false, error: "Please provide a description or set get_uncategorized to true" }
        },
      },

      what_if_scenario: {
        description: "Run 'what if' financial scenarios. Example: 'What if I cut dining out by 50%?' or 'What if I save $200 more each month?'. Use to project future financial outcomes.",
        inputSchema: z.object({
          scenario_type: z.enum(["reduce_spending", "increase_savings", "cut_category", "add_income"]).describe("Type of scenario"),
          category_name: z.string().optional().describe("Category to modify (for reduce/cut scenarios)"),
          amount: z.number().optional().describe("Amount to change (absolute dollars)"),
          percentage: z.number().optional().describe("Percentage to change (0-100)"),
          months: z.number().int().min(1).max(24).default(12).describe("Months to project"),
        }),
        execute: async ({ scenario_type, category_name, amount, percentage, months = 12 }: {
          scenario_type: "reduce_spending" | "increase_savings" | "cut_category" | "add_income"
          category_name?: string
          amount?: number
          percentage?: number
          months?: number
        }) => {
          const today = new Date()
          const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`

          // Get current monthly spending
          const { data: txns } = await supabaseAdmin
            .from("transactions")
            .select("amount, category_id, categories(name)")
            .eq("user_id", session.user.id)
            .lt("amount", 0)
            .gte("date", startOfMonth)

          const currentMonthlySpending = txns?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

          let monthlySavings = 0
          let explanation = ""
          let categorySpending = 0

          if (category_name) {
            const cat = categories.find(c => c.name.toLowerCase() === category_name.toLowerCase())
            if (cat) {
              categorySpending = txns?.filter(t => t.category_id === cat.id).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
            }
          }

          switch (scenario_type) {
            case "reduce_spending":
              if (percentage) {
                monthlySavings = currentMonthlySpending * (percentage / 100)
                explanation = `Reducing overall spending by ${percentage}% would save $${monthlySavings.toFixed(2)}/month.`
              } else if (amount) {
                monthlySavings = amount
                explanation = `Reducing spending by $${amount.toFixed(2)}/month.`
              }
              break

            case "cut_category":
              if (category_name && categorySpending > 0) {
                if (percentage) {
                  monthlySavings = categorySpending * (percentage / 100)
                  explanation = `Cutting ${category_name} spending by ${percentage}% (from $${categorySpending.toFixed(2)}) saves $${monthlySavings.toFixed(2)}/month.`
                } else if (amount) {
                  monthlySavings = Math.min(amount, categorySpending)
                  explanation = `Cutting $${monthlySavings.toFixed(2)} from ${category_name} spending.`
                } else {
                  monthlySavings = categorySpending
                  explanation = `Eliminating ${category_name} entirely saves $${categorySpending.toFixed(2)}/month.`
                }
              } else {
                return { success: false, error: `No spending found for category "${category_name}"` }
              }
              break

            case "increase_savings":
              monthlySavings = amount || 0
              explanation = `Saving an additional $${monthlySavings.toFixed(2)}/month.`
              break

            case "add_income":
              monthlySavings = amount || 0
              explanation = `Adding $${monthlySavings.toFixed(2)}/month in income.`
              break
          }

          const projectedTotalSavings = monthlySavings * months
          const yearlyImpact = monthlySavings * 12

          // Check impact on goals
          const { data: goals } = await supabaseAdmin
            .from("goals")
            .select("name, target_amount, current_amount, target_date")
            .eq("user_id", session.user.id)
            .eq("is_completed", false)

          const goalImpacts = goals?.map(g => {
            const remaining = g.target_amount - g.current_amount
            const monthsToComplete = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null
            return {
              goal: g.name,
              remaining,
              monthsToComplete,
              couldCompleteIn: monthsToComplete ? `${monthsToComplete} months` : "N/A"
            }
          }) || []

          return {
            success: true,
            scenario: scenario_type,
            explanation,
            monthlySavings: Math.round(monthlySavings * 100) / 100,
            projectedMonths: months,
            projectedTotalSavings: Math.round(projectedTotalSavings * 100) / 100,
            yearlyImpact: Math.round(yearlyImpact * 100) / 100,
            goalImpacts: goalImpacts.slice(0, 3),
            insight: monthlySavings >= 200
              ? `This change would significantly boost your savings!`
              : monthlySavings > 0
              ? `Every bit helps! This adds up to $${yearlyImpact.toFixed(2)} per year.`
              : `No impact calculated. Try specifying an amount or percentage.`
          }
        },
      },

      get_report: {
        description: "Generate a natural language financial report for a specific period. Use when user asks for spending reports, summaries, or financial overviews.",
        inputSchema: z.object({
          period: z.enum(["this_week", "this_month", "last_month", "this_year", "custom"]).describe("Report period"),
          start_date: z.string().optional().describe("Start date for custom period (YYYY-MM-DD)"),
          end_date: z.string().optional().describe("End date for custom period (YYYY-MM-DD)"),
          include_categories: z.boolean().optional().default(true).describe("Include category breakdown"),
          include_comparison: z.boolean().optional().default(true).describe("Include period-over-period comparison"),
        }),
        execute: async ({ period, start_date, end_date, include_categories = true, include_comparison = true }: {
          period: "this_week" | "this_month" | "last_month" | "this_year" | "custom"
          start_date?: string
          end_date?: string
          include_categories?: boolean
          include_comparison?: boolean
        }) => {
          const today = new Date()
          let startDate: string
          let endDate: string = today.toISOString().split("T")[0]
          let periodLabel = ""
          let comparisonStartDate: string | null = null
          let comparisonEndDate: string | null = null

          switch (period) {
            case "this_week":
              const weekStart = new Date(today)
              weekStart.setDate(today.getDate() - today.getDay())
              startDate = weekStart.toISOString().split("T")[0]
              periodLabel = "This Week"
              const lastWeekStart = new Date(weekStart)
              lastWeekStart.setDate(lastWeekStart.getDate() - 7)
              comparisonStartDate = lastWeekStart.toISOString().split("T")[0]
              comparisonEndDate = weekStart.toISOString().split("T")[0]
              break
            case "this_month":
              startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
              periodLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" })
              const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
              comparisonStartDate = lastMonthDate.toISOString().split("T")[0]
              comparisonEndDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0]
              break
            case "last_month":
              const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1)
              startDate = lm.toISOString().split("T")[0]
              endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0]
              periodLabel = lm.toLocaleDateString("en-US", { month: "long", year: "numeric" })
              const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)
              comparisonStartDate = twoMonthsAgo.toISOString().split("T")[0]
              comparisonEndDate = new Date(today.getFullYear(), today.getMonth() - 1, 0).toISOString().split("T")[0]
              break
            case "this_year":
              startDate = `${today.getFullYear()}-01-01`
              periodLabel = `${today.getFullYear()}`
              comparisonStartDate = `${today.getFullYear() - 1}-01-01`
              comparisonEndDate = `${today.getFullYear() - 1}-12-31`
              break
            case "custom":
              startDate = start_date || today.toISOString().split("T")[0]
              endDate = end_date || today.toISOString().split("T")[0]
              periodLabel = `${startDate} to ${endDate}`
              break
            default:
              startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
              periodLabel = "This Month"
          }

          // Get transactions for period
          const { data: txns } = await supabaseAdmin
            .from("transactions")
            .select("amount, category_id, categories(name), date, description")
            .eq("user_id", session.user.id)
            .gte("date", startDate)
            .lte("date", endDate)

          const income = txns?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
          const expenses = txns?.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
          const netChange = income - expenses
          const transactionCount = txns?.length || 0

          // Category breakdown
          const categoryBreakdown: Record<string, number> = {}
          txns?.filter(t => t.amount < 0).forEach(t => {
            const categories = t.categories as unknown as { name: string } | null
            const catName = categories?.name || "Uncategorized"
            categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + Math.abs(t.amount)
          })

          const topCategories = Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount, percentage: expenses > 0 ? Math.round((amount / expenses) * 100) : 0 }))

          // Comparison data
          let comparison = null
          if (include_comparison && comparisonStartDate && comparisonEndDate) {
            const { data: compTxns } = await supabaseAdmin
              .from("transactions")
              .select("amount")
              .eq("user_id", session.user.id)
              .gte("date", comparisonStartDate)
              .lte("date", comparisonEndDate)

            const compIncome = compTxns?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
            const compExpenses = compTxns?.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

            comparison = {
              previousIncome: compIncome,
              previousExpenses: compExpenses,
              incomeChange: compIncome > 0 ? Math.round(((income - compIncome) / compIncome) * 100) : 0,
              expenseChange: compExpenses > 0 ? Math.round(((expenses - compExpenses) / compExpenses) * 100) : 0,
            }
          }

          return {
            success: true,
            period: periodLabel,
            startDate,
            endDate,
            summary: {
              income,
              expenses,
              netChange,
              transactionCount,
              savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0
            },
            topCategories: include_categories ? topCategories : undefined,
            comparison: include_comparison ? comparison : undefined,
            narrative: `In ${periodLabel}, you earned $${income.toFixed(2)} and spent $${expenses.toFixed(2)}, resulting in a ${netChange >= 0 ? "surplus" : "deficit"} of $${Math.abs(netChange).toFixed(2)}. ${topCategories.length > 0 ? `Your top spending category was ${topCategories[0].name} at $${topCategories[0].amount.toFixed(2)} (${topCategories[0].percentage}% of expenses).` : ""}`
          }
        },
      },

      compare_periods: {
        description: "Compare spending between two time periods. Use when user asks 'How does this month compare to last month?' or similar comparison questions.",
        inputSchema: z.object({
          period1: z.enum(["this_month", "last_month", "this_week", "last_week"]).describe("First period to compare"),
          period2: z.enum(["last_month", "two_months_ago", "last_week", "same_month_last_year"]).describe("Second period to compare"),
          category_name: z.string().optional().describe("Filter comparison to specific category"),
        }),
        execute: async ({ period1, period2, category_name }: {
          period1: "this_month" | "last_month" | "this_week" | "last_week"
          period2: "last_month" | "two_months_ago" | "last_week" | "same_month_last_year"
          category_name?: string
        }) => {
          const today = new Date()

          const getDateRange = (period: string) => {
            switch (period) {
              case "this_month":
                return {
                  start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
                  end: today.toISOString().split("T")[0],
                  label: today.toLocaleDateString("en-US", { month: "long" })
                }
              case "last_month":
                const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                return {
                  start: lm.toISOString().split("T")[0],
                  end: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0],
                  label: lm.toLocaleDateString("en-US", { month: "long" })
                }
              case "two_months_ago":
                const tm = new Date(today.getFullYear(), today.getMonth() - 2, 1)
                return {
                  start: tm.toISOString().split("T")[0],
                  end: new Date(today.getFullYear(), today.getMonth() - 1, 0).toISOString().split("T")[0],
                  label: tm.toLocaleDateString("en-US", { month: "long" })
                }
              case "this_week":
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - today.getDay())
                return {
                  start: weekStart.toISOString().split("T")[0],
                  end: today.toISOString().split("T")[0],
                  label: "This Week"
                }
              case "last_week":
                const lwStart = new Date(today)
                lwStart.setDate(today.getDate() - today.getDay() - 7)
                const lwEnd = new Date(lwStart)
                lwEnd.setDate(lwStart.getDate() + 6)
                return {
                  start: lwStart.toISOString().split("T")[0],
                  end: lwEnd.toISOString().split("T")[0],
                  label: "Last Week"
                }
              case "same_month_last_year":
                const smly = new Date(today.getFullYear() - 1, today.getMonth(), 1)
                return {
                  start: smly.toISOString().split("T")[0],
                  end: new Date(today.getFullYear() - 1, today.getMonth() + 1, 0).toISOString().split("T")[0],
                  label: smly.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                }
              default:
                return { start: today.toISOString().split("T")[0], end: today.toISOString().split("T")[0], label: "Unknown" }
            }
          }

          const range1 = getDateRange(period1)
          const range2 = getDateRange(period2)

          let category_id: string | null = null
          if (category_name) {
            const cat = categories.find(c => c.name.toLowerCase() === category_name.toLowerCase())
            category_id = cat?.id || null
          }

          const buildQuery = (start: string, end: string) => {
            let query = supabaseAdmin
              .from("transactions")
              .select("amount, category_id, categories(name)")
              .eq("user_id", session.user.id)
              .gte("date", start)
              .lte("date", end)

            if (category_id) {
              query = query.eq("category_id", category_id)
            }
            return query
          }

          const [res1, res2] = await Promise.all([
            buildQuery(range1.start, range1.end),
            buildQuery(range2.start, range2.end)
          ])

          const calcStats = (txns: typeof res1.data) => ({
            income: txns?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0,
            expenses: txns?.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0,
            count: txns?.length || 0
          })

          const stats1 = calcStats(res1.data)
          const stats2 = calcStats(res2.data)

          const expenseChange = stats2.expenses > 0 ? ((stats1.expenses - stats2.expenses) / stats2.expenses) * 100 : 0
          const incomeChange = stats2.income > 0 ? ((stats1.income - stats2.income) / stats2.income) * 100 : 0

          return {
            success: true,
            period1: {
              label: range1.label,
              ...stats1,
              net: stats1.income - stats1.expenses
            },
            period2: {
              label: range2.label,
              ...stats2,
              net: stats2.income - stats2.expenses
            },
            comparison: {
              expenseChange: Math.round(expenseChange),
              incomeChange: Math.round(incomeChange),
              expenseDifference: Math.round((stats1.expenses - stats2.expenses) * 100) / 100,
              incomeDifference: Math.round((stats1.income - stats2.income) * 100) / 100
            },
            category: category_name || "All Categories",
            insight: expenseChange > 10
              ? `Spending is up ${Math.round(expenseChange)}% compared to ${range2.label}.`
              : expenseChange < -10
              ? `Great job! Spending is down ${Math.abs(Math.round(expenseChange))}% compared to ${range2.label}.`
              : `Spending is relatively stable compared to ${range2.label}.`
          }
        },
      },

      find_savings_opportunities: {
        description: "Analyze spending patterns to find specific opportunities to save money. Looks at discretionary spending, recurring expenses, and category overages.",
        inputSchema: z.object({}),
        execute: async () => {
          const today = new Date()
          const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
          const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split("T")[0]

          // Get recent transactions
          const { data: txns } = await supabaseAdmin
            .from("transactions")
            .select("amount, category_id, description, date, categories(name, type)")
            .eq("user_id", session.user.id)
            .lt("amount", 0)
            .gte("date", threeMonthsAgo)

          // Get budgets
          const { data: budgets } = await supabaseAdmin
            .from("budgets")
            .select("amount, category_id, categories(name)")
            .eq("user_id", session.user.id)

          const opportunities: Array<{ type: string; category: string; potentialSavings: number; suggestion: string }> = []

          // 1. Find categories consistently over budget
          budgets?.forEach(budget => {
            const budgetCategory = budget.categories as unknown as { name: string } | null
            const catName = budgetCategory?.name || "Unknown"
            const thisMonthSpending = txns
              ?.filter(t => t.category_id === budget.category_id && t.date >= startOfMonth)
              .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

            if (thisMonthSpending > budget.amount) {
              const overage = thisMonthSpending - budget.amount
              opportunities.push({
                type: "over_budget",
                category: catName,
                potentialSavings: overage,
                suggestion: `You're $${overage.toFixed(2)} over budget in ${catName}. Consider reducing spending here.`
              })
            }
          })

          // 2. Find frequent small purchases that add up
          const merchantSpending = new Map<string, { total: number; count: number }>()
          txns?.forEach(t => {
            const desc = (t.description || "").toLowerCase()
            if (desc) {
              const data = merchantSpending.get(desc) || { total: 0, count: 0 }
              data.total += Math.abs(t.amount)
              data.count++
              merchantSpending.set(desc, data)
            }
          })

          merchantSpending.forEach((data, merchant) => {
            if (data.count >= 10 && data.total >= 50) { // Frequent purchases
              const monthlyAvg = data.total / 3
              if (monthlyAvg >= 30) {
                opportunities.push({
                  type: "frequent_purchase",
                  category: merchant,
                  potentialSavings: monthlyAvg * 0.5, // Assume 50% reduction is possible
                  suggestion: `You spend ~$${monthlyAvg.toFixed(2)}/month on "${merchant}" across ${data.count} purchases. Cutting back could save you money.`
                })
              }
            }
          })

          // 3. Find discretionary categories with high spending
          const discretionaryCategories = ["entertainment", "dining", "shopping", "subscriptions", "restaurants", "dining out"]
          const categoryTotals = new Map<string, number>()

          txns?.forEach(t => {
            const categories = t.categories as unknown as { name: string; type: string } | null
            if (categories && t.date >= startOfMonth) {
              const catName = categories.name.toLowerCase()
              categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + Math.abs(t.amount))
            }
          })

          discretionaryCategories.forEach(cat => {
            const total = categoryTotals.get(cat) || 0
            if (total >= 100) {
              opportunities.push({
                type: "discretionary",
                category: cat.charAt(0).toUpperCase() + cat.slice(1),
                potentialSavings: total * 0.3, // Assume 30% reduction
                suggestion: `You've spent $${total.toFixed(2)} on ${cat} this month. This is discretionary spending that could be reduced.`
              })
            }
          })

          const totalPotentialSavings = opportunities.reduce((sum, o) => sum + o.potentialSavings, 0)

          return {
            success: true,
            opportunities: opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 5),
            totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
            yearlyImpact: Math.round(totalPotentialSavings * 12 * 100) / 100,
            summary: opportunities.length > 0
              ? `Found ${opportunities.length} savings opportunities totaling up to $${totalPotentialSavings.toFixed(2)}/month potential.`
              : "Your spending looks optimized! No major savings opportunities found."
          }
        },
      },

      get_bill_negotiation_tips: {
        description: "Analyze bills and provide negotiation tips based on bill types and amounts. Use when user asks about reducing bills or negotiating better rates.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data: bills } = await supabaseAdmin
            .from("bills")
            .select("name, amount, frequency, category_id, categories(name)")
            .eq("user_id", session.user.id)
            .eq("is_active", true)

          if (!bills || bills.length === 0) {
            return { success: true, tips: [], message: "No bills found to analyze." }
          }

          const tips: Array<{ bill: string; amount: number; tip: string; potentialSavings: string }> = []

          bills.forEach(bill => {
            const name = bill.name.toLowerCase()
            const amount = bill.amount || 0

            // Internet/Cable
            if (name.includes("internet") || name.includes("cable") || name.includes("wifi")) {
              tips.push({
                bill: bill.name,
                amount,
                tip: "Call your provider and ask about promotional rates. Mention competitor offers. Many providers offer 10-30% discounts to retain customers.",
                potentialSavings: "$10-30/month"
              })
            }

            // Phone/Mobile
            if (name.includes("phone") || name.includes("mobile") || name.includes("cellular")) {
              tips.push({
                bill: bill.name,
                amount,
                tip: "Review your data usage - you might be paying for more than you need. Consider switching to a prepaid or MVNO carrier for significant savings.",
                potentialSavings: "$20-50/month"
              })
            }

            // Insurance
            if (name.includes("insurance")) {
              tips.push({
                bill: bill.name,
                amount,
                tip: "Shop around annually and get quotes from 3-5 providers. Bundle policies for discounts. Ask about safe driver or good student discounts.",
                potentialSavings: "10-25% annually"
              })
            }

            // Subscriptions
            if (name.includes("netflix") || name.includes("spotify") || name.includes("subscription") ||
                name.includes("hulu") || name.includes("disney") || name.includes("amazon")) {
              tips.push({
                bill: bill.name,
                amount,
                tip: "Consider sharing family plans. Look for annual payment discounts. Cancel and re-subscribe for new user promotions.",
                potentialSavings: "$5-15/month"
              })
            }

            // Gym
            if (name.includes("gym") || name.includes("fitness")) {
              tips.push({
                bill: bill.name,
                amount,
                tip: "Negotiate during slow months (January after the rush). Ask about corporate or student discounts. Consider annual payment for lower rates.",
                potentialSavings: "$10-30/month"
              })
            }

            // Utilities
            if (name.includes("electric") || name.includes("gas") || name.includes("hydro") || name.includes("utility")) {
              tips.push({
                bill: bill.name,
                amount,
                tip: "Enroll in budget billing for predictable payments. Check for off-peak rates. Look into energy-saving programs and rebates.",
                potentialSavings: "5-15%"
              })
            }
          })

          // Add general tips if we found negotiable bills
          const totalBillAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0)

          return {
            success: true,
            tips: tips.slice(0, 6),
            generalTips: [
              "Always ask if there are any current promotions or discounts",
              "Be polite but firm - customer retention teams have authority to offer deals",
              "Mention you're considering switching to a competitor",
              "Ask to speak with a supervisor or retention specialist if needed",
              "Time your calls for early morning or late evening when wait times are shorter"
            ],
            totalMonthlyBills: Math.round(totalBillAmount * 100) / 100,
            summary: tips.length > 0
              ? `Found ${tips.length} bills with negotiation potential out of ${bills.length} total.`
              : "Review your bills for potential negotiation opportunities."
          }
        },
      },

      check_unused_budgets: {
        description: "Find budgets that are consistently underutilized, suggesting reallocation opportunities. Use when user wants to optimize their budget allocation.",
        inputSchema: z.object({}),
        execute: async () => {
          const today = new Date()
          const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
          const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0]
          const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0]

          const { data: budgets } = await supabaseAdmin
            .from("budgets")
            .select("id, amount, category_id, rollover, categories(name)")
            .eq("user_id", session.user.id)

          if (!budgets || budgets.length === 0) {
            return { success: true, underutilized: [], message: "No budgets set up yet." }
          }

          const underutilized: Array<{
            category: string
            budget: number
            thisMonthSpent: number
            lastMonthSpent: number
            utilizationPercent: number
            suggestion: string
          }> = []

          for (const budget of budgets) {
            const budgetCategory = budget.categories as unknown as { name: string } | null
            const catName = budgetCategory?.name || "Unknown"

            // Get this month's spending
            const { data: thisMonthTxns } = await supabaseAdmin
              .from("transactions")
              .select("amount")
              .eq("user_id", session.user.id)
              .eq("category_id", budget.category_id)
              .lt("amount", 0)
              .gte("date", startOfMonth)

            // Get last month's spending
            const { data: lastMonthTxns } = await supabaseAdmin
              .from("transactions")
              .select("amount")
              .eq("user_id", session.user.id)
              .eq("category_id", budget.category_id)
              .lt("amount", 0)
              .gte("date", startOfLastMonth)
              .lte("date", endOfLastMonth)

            const thisMonthSpent = thisMonthTxns?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
            const lastMonthSpent = lastMonthTxns?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
            const avgSpent = (thisMonthSpent + lastMonthSpent) / 2
            const utilizationPercent = (avgSpent / budget.amount) * 100

            if (utilizationPercent < 50) {
              const unusedAmount = budget.amount - avgSpent
              underutilized.push({
                category: catName,
                budget: budget.amount,
                thisMonthSpent,
                lastMonthSpent,
                utilizationPercent: Math.round(utilizationPercent),
                suggestion: utilizationPercent < 25
                  ? `Only using ${Math.round(utilizationPercent)}% of your ${catName} budget. Consider reallocating $${unusedAmount.toFixed(2)} to savings or other categories.`
                  : `${catName} budget is ${Math.round(utilizationPercent)}% utilized. You could reduce this budget or move funds elsewhere.`
              })
            }
          }

          const totalUnused = underutilized.reduce((sum, u) => sum + (u.budget - (u.thisMonthSpent + u.lastMonthSpent) / 2), 0)

          return {
            success: true,
            underutilized: underutilized.sort((a, b) => a.utilizationPercent - b.utilizationPercent),
            totalBudgets: budgets.length,
            underutilizedCount: underutilized.length,
            totalUnusedAmount: Math.round(totalUnused * 100) / 100,
            recommendations: underutilized.length > 0
              ? [
                  `Consider reducing budgets for: ${underutilized.map(u => u.category).join(", ")}`,
                  `Potential to reallocate up to $${totalUnused.toFixed(2)}/month`,
                  "Put unused budget towards savings goals or debt payoff"
                ]
              : ["Your budgets are well-utilized. Keep up the good work!"],
            summary: underutilized.length > 0
              ? `Found ${underutilized.length} underutilized budget(s) with $${totalUnused.toFixed(2)} potential reallocation.`
              : "All budgets are being utilized effectively."
          }
        },
      },

      track_financial_habits: {
        description: "Track and score financial habits - both positive (saving, staying under budget) and negative (overspending, missed bills). Use to encourage good financial behavior.",
        inputSchema: z.object({
          period: z.enum(["this_month", "last_month", "last_3_months"]).default("this_month").describe("Period to analyze"),
        }),
        execute: async ({ period = "this_month" }: { period?: "this_month" | "last_month" | "last_3_months" }) => {
          const today = new Date()
          let startDate: string
          let endDate: string = today.toISOString().split("T")[0]

          switch (period) {
            case "this_month":
              startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
              break
            case "last_month":
              const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1)
              startDate = lm.toISOString().split("T")[0]
              endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0]
              break
            case "last_3_months":
              startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split("T")[0]
              break
            default:
              startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
          }

          const positiveHabits: Array<{ habit: string; count: number; impact: string }> = []
          const negativeHabits: Array<{ habit: string; count: number; impact: string }> = []
          let habitScore = 50 // Start at neutral

          // Check budget adherence
          const { data: budgets } = await supabaseAdmin
            .from("budgets")
            .select("id, amount, category_id, categories(name)")
            .eq("user_id", session.user.id)

          if (budgets && budgets.length > 0) {
            let underBudgetCount = 0
            let overBudgetCount = 0

            for (const budget of budgets) {
              const { data: txns } = await supabaseAdmin
                .from("transactions")
                .select("amount")
                .eq("user_id", session.user.id)
                .eq("category_id", budget.category_id)
                .lt("amount", 0)
                .gte("date", startDate)
                .lte("date", endDate)

              const spent = txns?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
              if (spent <= budget.amount) {
                underBudgetCount++
              } else {
                overBudgetCount++
              }
            }

            if (underBudgetCount > 0) {
              positiveHabits.push({
                habit: "Stayed under budget",
                count: underBudgetCount,
                impact: `${underBudgetCount} of ${budgets.length} categories under budget`
              })
              habitScore += underBudgetCount * 5
            }

            if (overBudgetCount > 0) {
              negativeHabits.push({
                habit: "Exceeded budget",
                count: overBudgetCount,
                impact: `${overBudgetCount} categories over budget`
              })
              habitScore -= overBudgetCount * 5
            }
          }

          // Check savings (goal contributions)
          const { data: contributions } = await supabaseAdmin
            .from("goal_contributions")
            .select("amount")
            .eq("user_id", session.user.id)
            .gte("date", startDate)
            .lte("date", endDate)

          if (contributions && contributions.length > 0) {
            const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0)
            positiveHabits.push({
              habit: "Made goal contributions",
              count: contributions.length,
              impact: `$${totalContributed.toFixed(2)} saved toward goals`
            })
            habitScore += Math.min(contributions.length * 3, 15)
          }

          // Check for consistent income tracking
          const { data: incomeTxns } = await supabaseAdmin
            .from("transactions")
            .select("amount")
            .eq("user_id", session.user.id)
            .gt("amount", 0)
            .gte("date", startDate)
            .lte("date", endDate)

          if (incomeTxns && incomeTxns.length > 0) {
            positiveHabits.push({
              habit: "Tracked income",
              count: incomeTxns.length,
              impact: "Good record keeping!"
            })
            habitScore += 5
          }

          // Check bill payment (based on last_paid_date)
          const { data: bills } = await supabaseAdmin
            .from("bills")
            .select("name, last_paid_date, next_due_date")
            .eq("user_id", session.user.id)
            .eq("is_active", true)

          const paidOnTime = bills?.filter(b => b.last_paid_date && b.last_paid_date >= startDate).length || 0
          const overdue = bills?.filter(b => b.next_due_date < today.toISOString().split("T")[0]).length || 0

          if (paidOnTime > 0) {
            positiveHabits.push({
              habit: "Paid bills on time",
              count: paidOnTime,
              impact: `${paidOnTime} bills paid on schedule`
            })
            habitScore += paidOnTime * 3
          }

          if (overdue > 0) {
            negativeHabits.push({
              habit: "Overdue bills",
              count: overdue,
              impact: `${overdue} bills past due`
            })
            habitScore -= overdue * 10
          }

          // Check for large impulse purchases
          const { data: largeTxns } = await supabaseAdmin
            .from("transactions")
            .select("amount, description")
            .eq("user_id", session.user.id)
            .lt("amount", -200) // Large expenses
            .gte("date", startDate)
            .lte("date", endDate)

          if (largeTxns && largeTxns.length > 3) {
            negativeHabits.push({
              habit: "Multiple large purchases",
              count: largeTxns.length,
              impact: "Consider if all were necessary"
            })
            habitScore -= 5
          }

          // Normalize score to 0-100
          habitScore = Math.max(0, Math.min(100, habitScore))

          return {
            success: true,
            period,
            habitScore,
            grade: habitScore >= 80 ? "A" : habitScore >= 60 ? "B" : habitScore >= 40 ? "C" : "D",
            positiveHabits,
            negativeHabits,
            streak: positiveHabits.length > negativeHabits.length ? "positive" : negativeHabits.length > positiveHabits.length ? "negative" : "neutral",
            encouragement: habitScore >= 70
              ? "Great financial habits! Keep it up!"
              : habitScore >= 50
              ? "You're on the right track. Focus on reducing overspending."
              : "There's room for improvement. Start with one habit at a time.",
            nextSteps: negativeHabits.length > 0
              ? [`Focus on: ${negativeHabits[0].habit}`, "Set up budget alerts to stay on track", "Review spending before making large purchases"]
              : ["Maintain your great habits!", "Consider increasing savings goals", "Look for new ways to optimize spending"]
          }
        },
      },
    },
  })

  return result.toTextStreamResponse()
}
