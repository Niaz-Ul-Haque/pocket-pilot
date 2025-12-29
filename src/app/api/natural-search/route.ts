import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  naturalLanguageSearchSchema,
  NATURAL_LANGUAGE_PATTERNS,
  type ParsedSearchFilters,
} from "@/lib/validators/ai-features"

export const maxDuration = 30

// Parse natural language query into structured filters
function parseNaturalLanguage(query: string): ParsedSearchFilters {
  const filters: ParsedSearchFilters = {}
  const lowerQuery = query.toLowerCase()
  const today = new Date()

  // Parse time ranges
  if (NATURAL_LANGUAGE_PATTERNS.last_month.test(lowerQuery)) {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    filters.start_date = lastMonth.toISOString().split("T")[0]
    filters.end_date = endOfLastMonth.toISOString().split("T")[0]
  } else if (NATURAL_LANGUAGE_PATTERNS.this_month.test(lowerQuery)) {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    filters.start_date = startOfMonth.toISOString().split("T")[0]
    filters.end_date = today.toISOString().split("T")[0]
  } else if (NATURAL_LANGUAGE_PATTERNS.last_week.test(lowerQuery)) {
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    filters.start_date = lastWeek.toISOString().split("T")[0]
    filters.end_date = today.toISOString().split("T")[0]
  } else if (NATURAL_LANGUAGE_PATTERNS.this_week.test(lowerQuery)) {
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    filters.start_date = startOfWeek.toISOString().split("T")[0]
    filters.end_date = today.toISOString().split("T")[0]
  } else if (NATURAL_LANGUAGE_PATTERNS.last_year.test(lowerQuery)) {
    const lastYear = new Date(today.getFullYear() - 1, 0, 1)
    const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31)
    filters.start_date = lastYear.toISOString().split("T")[0]
    filters.end_date = endOfLastYear.toISOString().split("T")[0]
  } else if (NATURAL_LANGUAGE_PATTERNS.this_year.test(lowerQuery)) {
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    filters.start_date = startOfYear.toISOString().split("T")[0]
    filters.end_date = today.toISOString().split("T")[0]
  } else if (NATURAL_LANGUAGE_PATTERNS.yesterday.test(lowerQuery)) {
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    filters.start_date = yesterday.toISOString().split("T")[0]
    filters.end_date = yesterday.toISOString().split("T")[0]
  } else if (NATURAL_LANGUAGE_PATTERNS.today.test(lowerQuery)) {
    filters.start_date = today.toISOString().split("T")[0]
    filters.end_date = today.toISOString().split("T")[0]
  } else {
    const lastNMatch = NATURAL_LANGUAGE_PATTERNS.last_n_days.exec(lowerQuery)
    if (lastNMatch) {
      const days = parseInt(lastNMatch[1])
      const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      filters.start_date = startDate.toISOString().split("T")[0]
      filters.end_date = today.toISOString().split("T")[0]
    }
  }

  // Parse amount ranges
  const overMatch = NATURAL_LANGUAGE_PATTERNS.over.exec(lowerQuery)
  if (overMatch) {
    filters.min_amount = parseFloat(overMatch[1])
  }

  const underMatch = NATURAL_LANGUAGE_PATTERNS.under.exec(lowerQuery)
  if (underMatch) {
    filters.max_amount = parseFloat(underMatch[1])
  }

  const exactlyMatch = NATURAL_LANGUAGE_PATTERNS.exactly.exec(lowerQuery)
  if (exactlyMatch) {
    const amount = parseFloat(exactlyMatch[1])
    filters.min_amount = amount - 0.01
    filters.max_amount = amount + 0.01
  }

  const betweenMatch = NATURAL_LANGUAGE_PATTERNS.between.exec(lowerQuery)
  if (betweenMatch) {
    filters.min_amount = parseFloat(betweenMatch[1])
    filters.max_amount = parseFloat(betweenMatch[2])
  }

  // Parse transaction type
  if (NATURAL_LANGUAGE_PATTERNS.expenses.test(lowerQuery)) {
    filters.type = "expense"
  } else if (NATURAL_LANGUAGE_PATTERNS.income.test(lowerQuery)) {
    filters.type = "income"
  }

  // Extract merchant mentions
  const merchantMatch = NATURAL_LANGUAGE_PATTERNS.at_merchant.exec(query)
  if (merchantMatch) {
    filters.merchant = merchantMatch[1].trim()
  }

  // Extract category mentions (common categories)
  const commonCategories = [
    "groceries",
    "dining",
    "food",
    "transportation",
    "gas",
    "shopping",
    "entertainment",
    "utilities",
    "subscriptions",
    "health",
    "insurance",
    "rent",
    "mortgage",
    "travel",
    "coffee",
    "restaurants",
  ]
  for (const cat of commonCategories) {
    if (lowerQuery.includes(cat)) {
      filters.category = cat
      break
    }
  }

  // Extract remaining description keywords
  const keywords = query
    .replace(NATURAL_LANGUAGE_PATTERNS.last_month, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.this_month, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.last_week, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.this_week, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.over, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.under, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.between, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.expenses, "")
    .replace(NATURAL_LANGUAGE_PATTERNS.income, "")
    .replace(/\b(show|me|my|all|find|search|get|list|transactions?|purchases?)\b/gi, "")
    .trim()

  if (keywords && keywords.length > 2 && !filters.merchant && !filters.category) {
    filters.description_contains = keywords
  }

  return filters
}

// POST - Search transactions with natural language
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const validation = naturalLanguageSearchSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid query", details: validation.error.issues }, { status: 400 })
  }

  const { query } = validation.data
  const filters = parseNaturalLanguage(query)

  // Build the database query
  let dbQuery = supabaseAdmin
    .from("transactions")
    .select("*, categories(id, name, type), accounts(id, name)")
    .eq("user_id", session.user.id)
    .order("date", { ascending: false })
    .limit(100)

  // Apply filters
  if (filters.start_date) {
    dbQuery = dbQuery.gte("date", filters.start_date)
  }
  if (filters.end_date) {
    dbQuery = dbQuery.lte("date", filters.end_date)
  }
  if (filters.type === "expense") {
    dbQuery = dbQuery.lt("amount", 0)
  } else if (filters.type === "income") {
    dbQuery = dbQuery.gt("amount", 0)
  }
  if (filters.min_amount !== undefined) {
    if (filters.type === "expense") {
      dbQuery = dbQuery.lte("amount", -filters.min_amount)
    } else {
      dbQuery = dbQuery.gte("amount", filters.min_amount)
    }
  }
  if (filters.max_amount !== undefined) {
    if (filters.type === "expense") {
      dbQuery = dbQuery.gte("amount", -filters.max_amount)
    } else {
      dbQuery = dbQuery.lte("amount", filters.max_amount)
    }
  }
  if (filters.merchant || filters.description_contains) {
    dbQuery = dbQuery.ilike("description", `%${filters.merchant || filters.description_contains}%`)
  }

  const { data: transactions, error } = await dbQuery

  if (error) {
    console.error("[Natural Search] Error:", error)
    return NextResponse.json({ error: "Failed to search transactions" }, { status: 500 })
  }

  // Post-filter by category name if needed
  let results = transactions || []
  if (filters.category) {
    results = results.filter((t) => {
      const catName = (t.categories as unknown as { name: string } | null)?.name?.toLowerCase() || ""
      return catName.includes(filters.category!.toLowerCase())
    })
  }

  // Calculate summary
  const summary = {
    total_count: results.length,
    total_amount: results.reduce((sum, t) => sum + t.amount, 0),
    total_expenses: results.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    total_income: results.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
  }

  // Save to search history
  await supabaseAdmin.from("search_history").insert({
    user_id: session.user.id,
    query,
    parsed_filters: filters,
    result_count: results.length,
  })

  return NextResponse.json({
    query,
    parsed_filters: filters,
    transactions: results,
    summary,
  })
}

// GET - Get search history and suggestions
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "history") {
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)
    const { data, error } = await supabaseAdmin
      .from("search_history")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[Natural Search] Error fetching history:", error)
      return NextResponse.json({ error: "Failed to fetch search history" }, { status: 500 })
    }

    return NextResponse.json({ history: data })
  }

  if (action === "suggestions") {
    // Get recent searches and common patterns
    const { data: history } = await supabaseAdmin
      .from("search_history")
      .select("query")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    // Get top categories
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("categories(name)")
      .eq("user_id", session.user.id)
      .lt("amount", 0)
      .limit(100)

    const categoryCounts: Record<string, number> = {}
    transactions?.forEach((t) => {
      const cat = (t.categories as unknown as { name: string } | null)?.name
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      }
    })
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    const suggestions = [
      ...topCategories.map((cat) => `Show me ${cat} expenses last month`),
      "Transactions over $100 this month",
      "Coffee purchases this week",
      "Income last month",
      "Subscriptions this year",
      ...(history?.map((h) => h.query) || []),
    ]

    // Remove duplicates
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10)

    return NextResponse.json({ suggestions: uniqueSuggestions })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
