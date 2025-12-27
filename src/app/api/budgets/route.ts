import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { budgetSchema, calculateBudgetDetails } from "@/lib/validators/budget"

/**
 * GET /api/budgets
 * List all budgets with spent amounts for the current month
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get current month boundaries
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0]
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .split("T")[0]

  // Get previous month boundaries (for rollover calculation)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0]

  // Fetch budgets with category info
  const { data: budgets, error: budgetsError } = await supabaseAdmin
    .from("budgets")
    .select(`
      *,
      categories!inner(name, type)
    `)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: true })

  if (budgetsError) {
    console.error("Failed to fetch budgets:", budgetsError)
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    )
  }

  // Fetch spending for each category this month
  const { data: spending, error: spendingError } = await supabaseAdmin
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", session.user.id)
    .lt("amount", 0) // Only expenses
    .gte("date", startOfMonth)
    .lt("date", startOfNextMonth)

  if (spendingError) {
    console.error("Failed to fetch spending:", spendingError)
    return NextResponse.json(
      { error: "Failed to fetch spending" },
      { status: 500 }
    )
  }

  // Fetch previous month spending (for rollover calculation)
  const { data: prevSpending } = await supabaseAdmin
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", session.user.id)
    .lt("amount", 0) // Only expenses
    .gte("date", startOfPrevMonth)
    .lt("date", startOfMonth)

  // Calculate spent per category this month
  const spentByCategory: Record<string, number> = {}
  for (const t of spending || []) {
    if (t.category_id) {
      spentByCategory[t.category_id] =
        (spentByCategory[t.category_id] || 0) + Math.abs(t.amount)
    }
  }

  // Calculate spent per category previous month (for rollover)
  const prevSpentByCategory: Record<string, number> = {}
  for (const t of prevSpending || []) {
    if (t.category_id) {
      prevSpentByCategory[t.category_id] =
        (prevSpentByCategory[t.category_id] || 0) + Math.abs(t.amount)
    }
  }

  // Transform budgets with calculated details
  const budgetsWithDetails = budgets.map((b) => {
    const spent = spentByCategory[b.category_id] || 0

    // Calculate rollover amount if enabled
    // Rollover = previous month budget - previous month spent (only if positive)
    let rolloverAmount: number | undefined
    if (b.rollover) {
      const prevSpent = prevSpentByCategory[b.category_id] || 0
      const surplus = b.amount - prevSpent
      rolloverAmount = surplus > 0 ? surplus : 0
    }

    return calculateBudgetDetails(
      {
        ...b,
        category_name: b.categories?.name || "Unknown",
        category_type: b.categories?.type || "expense",
        categories: undefined,
      },
      spent,
      rolloverAmount
    )
  })

  return NextResponse.json(budgetsWithDetails)
}

/**
 * POST /api/budgets
 * Create a new budget for a category
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const validationResult = budgetSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { category_id, amount, rollover } = validationResult.data

  // Verify category belongs to user and is an expense category
  const { data: category, error: categoryError } = await supabaseAdmin
    .from("categories")
    .select("id, name, type")
    .eq("id", category_id)
    .eq("user_id", session.user.id)
    .single()

  if (categoryError || !category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  // Only allow budgets for expense categories
  if (category.type !== "expense") {
    return NextResponse.json(
      { error: "Budgets can only be set for expense categories" },
      { status: 400 }
    )
  }

  // Check if budget already exists for this category
  const { data: existing } = await supabaseAdmin
    .from("budgets")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("category_id", category_id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: "A budget already exists for this category" },
      { status: 409 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("budgets")
    .insert({
      user_id: session.user.id,
      category_id,
      amount,
      period: "MONTHLY",
      rollover: rollover ?? false,
    })
    .select(`
      *,
      categories!inner(name, type)
    `)
    .single()

  if (error) {
    console.error("Failed to create budget:", error)
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    )
  }

  // Return with 0 spent since it's new
  const budgetWithDetails = calculateBudgetDetails(
    {
      ...data,
      category_name: data.categories?.name || "Unknown",
      category_type: data.categories?.type || "expense",
      categories: undefined,
    },
    0
  )

  return NextResponse.json(budgetWithDetails, { status: 201 })
}
