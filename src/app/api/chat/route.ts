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
- Checking how much they've spent - use get_spending_summary tool
- Getting budget status updates - use get_budget_status tool
- Contributing to savings goals - use add_goal_contribution tool

IMPORTANT DISTINCTIONS:
- TRANSACTION: A one-time expense or income (groceries, coffee, salary payment, contract work income)
- BILL: A recurring expense that happens regularly (phone bill, rent, Netflix, utilities, electricity)

When the user says "add a bill" or mentions recurring payments, use the add_bill tool.
When the user says "add an expense" or "add income" or mentions one-time purchases, use add_transaction tool.

User's available categories: ${categoryNames || "None yet"}
User's accounts: ${accountNames || "None yet"}
Today's date: ${new Date().toISOString().split("T")[0]}

CRITICAL WORKFLOW FOR ADDING ITEMS:
1. When user asks to add something, first confirm the details with them
2. When user confirms (says "yes", "correct", "looks good", "add it", etc.), you MUST IMMEDIATELY call the appropriate tool (add_transaction, add_bill, or add_goal_contribution)
3. After the tool executes successfully, respond with: "Perfect! I've added [description] for you."
4. If the tool fails, explain the error and ask if they want to try again

RESPONSE GUIDELINES:
- Be concise and friendly
- Use Canadian dollars (CAD)
- Parse natural language dates: "today", "tomorrow", "yesterday", specific dates
- When asked about spending, USE the get_spending_summary tool to get real data
- When user confirms an action, ALWAYS call the tool - don't just respond with text

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
              due_date: parsedDueDate,
              category_id,
              is_auto_pay: is_auto_pay || false,
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
    },
  })

  return result.toTextStreamResponse()
}
