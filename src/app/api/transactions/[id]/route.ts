import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { transactionUpdateSchema, formToDbAmount } from "@/lib/validators/transaction"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/transactions/[id]
 * Get a single transaction by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select(`
      *,
      accounts!inner(name),
      categories(name, type)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }
    console.error("Failed to fetch transaction:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    )
  }

  // Transform to include joined fields
  const transaction = {
    ...data,
    account_name: data.accounts?.name,
    category_name: data.categories?.name,
    category_type: data.categories?.type,
    accounts: undefined,
    categories: undefined,
  }

  return NextResponse.json(transaction)
}

/**
 * PUT /api/transactions/[id]
 * Update a transaction
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

  const validationResult = transactionUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Verify the transaction belongs to the user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  const { account_id, category_id, date, amount, description, type } =
    validationResult.data

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (account_id !== undefined) {
    // Verify account belongs to user
    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("id", account_id)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    updateData.account_id = account_id
  }

  if (category_id !== undefined) {
    if (category_id) {
      // Verify category belongs to user
      const { data: category, error: categoryError } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("id", category_id)
        .eq("user_id", session.user.id)
        .single()

      if (categoryError || !category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
    }
    updateData.category_id = category_id || null
  }

  if (date !== undefined) {
    updateData.date = date
  }

  if (description !== undefined) {
    updateData.description = description || null
  }

  // Handle amount and type together (they're related)
  if (amount !== undefined && type !== undefined) {
    updateData.amount = formToDbAmount(amount, type)
    updateData.is_transfer = type === "transfer"
  }

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select(`
      *,
      accounts!inner(name),
      categories(name, type)
    `)
    .single()

  if (error) {
    console.error("Failed to update transaction:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }

  // Transform to include joined fields
  const transaction = {
    ...data,
    account_name: data.accounts?.name,
    category_name: data.categories?.name,
    category_type: data.categories?.type,
    accounts: undefined,
    categories: undefined,
  }

  return NextResponse.json(transaction)
}

/**
 * DELETE /api/transactions/[id]
 * Delete a transaction
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify the transaction belongs to the user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to delete transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: "Transaction deleted" })
}
