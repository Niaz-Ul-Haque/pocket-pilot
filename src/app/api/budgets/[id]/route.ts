import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { budgetUpdateSchema, calculateBudgetDetails } from "@/lib/validators/budget"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/budgets/[id]
 * Get a single budget by ID with spent amount
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Get current month boundaries
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0]
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .split("T")[0]

  const { data, error } = await supabaseAdmin
    .from("budgets")
    .select(`
      *,
      categories!inner(name, type)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 })
    }
    console.error("Failed to fetch budget:", error)
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    )
  }

  // Get spending for this category this month
  const { data: spending } = await supabaseAdmin
    .from("transactions")
    .select("amount")
    .eq("user_id", session.user.id)
    .eq("category_id", data.category_id)
    .lt("amount", 0)
    .gte("date", startOfMonth)
    .lt("date", startOfNextMonth)

  const spent = (spending || []).reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  )

  const budgetWithDetails = calculateBudgetDetails(
    {
      ...data,
      category_name: data.categories?.name || "Unknown",
      category_type: data.categories?.type || "expense",
      categories: undefined,
    },
    spent
  )

  return NextResponse.json(budgetWithDetails)
}

/**
 * PUT /api/budgets/[id]
 * Update a budget amount
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const validationResult = budgetUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Verify the budget belongs to the user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("budgets")
    .select("id, category_id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 })
  }

  const updateData: { amount: number; rollover?: boolean } = {
    amount: validationResult.data.amount,
  }
  if (validationResult.data.rollover !== undefined) {
    updateData.rollover = validationResult.data.rollover
  }

  const { data, error } = await supabaseAdmin
    .from("budgets")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select(`
      *,
      categories!inner(name, type)
    `)
    .single()

  if (error) {
    console.error("Failed to update budget:", error)
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    )
  }

  // Get current month spending
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0]
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .split("T")[0]

  const { data: spending } = await supabaseAdmin
    .from("transactions")
    .select("amount")
    .eq("user_id", session.user.id)
    .eq("category_id", data.category_id)
    .lt("amount", 0)
    .gte("date", startOfMonth)
    .lt("date", startOfNextMonth)

  const spent = (spending || []).reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  )

  const budgetWithDetails = calculateBudgetDetails(
    {
      ...data,
      category_name: data.categories?.name || "Unknown",
      category_type: data.categories?.type || "expense",
      categories: undefined,
    },
    spent
  )

  return NextResponse.json(budgetWithDetails)
}

/**
 * DELETE /api/budgets/[id]
 * Delete a budget
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify the budget belongs to the user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("budgets")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to delete budget:", error)
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: "Budget deleted" })
}
