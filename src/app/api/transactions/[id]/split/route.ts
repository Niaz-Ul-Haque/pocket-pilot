import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { splitTransactionSchema, validateSplitAmounts } from "@/lib/validators/split-transaction"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to extract name from Supabase joined data (can be object or array)
function getAccountName(accounts: unknown): string | undefined {
  if (!accounts) return undefined
  if (Array.isArray(accounts)) return accounts[0]?.name
  return (accounts as { name?: string })?.name
}

function getCategoryData(categories: unknown): { name?: string; type?: string } | undefined {
  if (!categories) return undefined
  if (Array.isArray(categories)) return categories[0] as { name?: string; type?: string }
  return categories as { name?: string; type?: string }
}

/**
 * POST /api/transactions/[id]/split
 * Split a transaction into multiple parts
 */
export async function POST(request: Request, { params }: RouteParams) {
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

  const validationResult = splitTransactionSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { splits } = validationResult.data

  // Fetch the parent transaction
  const { data: parent, error: parentError } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (parentError || !parent) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  // Check if already split
  if (parent.is_split_parent || parent.split_parent_id) {
    return NextResponse.json(
      { error: "Transaction is already split or is a split child" },
      { status: 400 }
    )
  }

  // Check if it's a transfer
  if (parent.is_transfer) {
    return NextResponse.json(
      { error: "Transfers cannot be split" },
      { status: 400 }
    )
  }

  // Validate that splits sum to parent amount
  const amountValidation = validateSplitAmounts(parent.amount, splits)
  if (!amountValidation.valid) {
    return NextResponse.json(
      { error: amountValidation.message },
      { status: 400 }
    )
  }

  // Verify all categories belong to user (if provided)
  const categoryIds = splits
    .map((s) => s.category_id)
    .filter((id): id is string => id !== null && id !== undefined)

  if (categoryIds.length > 0) {
    const { data: categories, error: catError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("user_id", session.user.id)
      .in("id", categoryIds)

    if (catError) {
      console.error("Failed to verify categories:", catError)
      return NextResponse.json(
        { error: "Failed to verify categories" },
        { status: 500 }
      )
    }

    const existingCatIds = new Set(categories?.map((c) => c.id) || [])
    const invalidCatIds = categoryIds.filter((id) => !existingCatIds.has(id))

    if (invalidCatIds.length > 0) {
      return NextResponse.json(
        { error: "Some categories not found" },
        { status: 404 }
      )
    }
  }

  // Generate a split group ID
  const splitGroupId = crypto.randomUUID()

  // Update parent to mark as split parent
  const { error: updateParentError } = await supabaseAdmin
    .from("transactions")
    .update({
      is_split_parent: true,
      split_group_id: splitGroupId,
    })
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (updateParentError) {
    console.error("Failed to update parent transaction:", updateParentError)
    return NextResponse.json(
      { error: "Failed to update parent transaction" },
      { status: 500 }
    )
  }

  // Create split child transactions
  const isExpense = parent.amount < 0
  const splitTransactions = splits.map((split) => ({
    user_id: session.user.id,
    account_id: parent.account_id,
    category_id: split.category_id || null,
    date: parent.date,
    amount: isExpense ? -Math.abs(split.amount) : Math.abs(split.amount),
    description: split.description || parent.description,
    is_transfer: false,
    split_group_id: splitGroupId,
    split_parent_id: id,
  }))

  const { data: createdSplits, error: createError } = await supabaseAdmin
    .from("transactions")
    .insert(splitTransactions)
    .select(`
      *,
      accounts!inner(name),
      categories(name, type)
    `)

  if (createError) {
    console.error("Failed to create split transactions:", createError)
    // Rollback parent update
    await supabaseAdmin
      .from("transactions")
      .update({
        is_split_parent: false,
        split_group_id: null,
      })
      .eq("id", id)

    return NextResponse.json(
      { error: "Failed to create split transactions" },
      { status: 500 }
    )
  }

  // Transform response
  const result = {
    parent_id: id,
    split_group_id: splitGroupId,
    splits: createdSplits?.map((t) => {
      const catData = getCategoryData(t.categories)
      return {
        ...t,
        account_name: getAccountName(t.accounts),
        category_name: catData?.name,
        category_type: catData?.type,
        accounts: undefined,
        categories: undefined,
      }
    }),
  }

  return NextResponse.json(result, { status: 201 })
}

/**
 * GET /api/transactions/[id]/split
 * Get split details for a transaction
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Fetch the transaction
  const { data: transaction, error: txError } = await supabaseAdmin
    .from("transactions")
    .select(`
      *,
      accounts!inner(name),
      categories(name)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (txError || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  // If this is a split parent, get the children
  if (transaction.is_split_parent && transaction.split_group_id) {
    const { data: splits } = await supabaseAdmin
      .from("transactions")
      .select(`
        id, amount, description, category_id,
        categories(name)
      `)
      .eq("split_parent_id", id)
      .eq("user_id", session.user.id)

    return NextResponse.json({
      parent_id: id,
      split_group_id: transaction.split_group_id,
      parent_amount: transaction.amount,
      parent_description: transaction.description,
      parent_date: transaction.date,
      account_name: getAccountName(transaction.accounts),
      splits: splits?.map((s) => ({
        id: s.id,
        amount: s.amount,
        description: s.description,
        category_id: s.category_id,
        category_name: getCategoryData(s.categories)?.name || null,
      })) || [],
    })
  }

  // If this is a split child, get the parent and siblings
  if (transaction.split_parent_id) {
    const { data: parent } = await supabaseAdmin
      .from("transactions")
      .select(`
        id, amount, description, date,
        accounts!inner(name)
      `)
      .eq("id", transaction.split_parent_id)
      .eq("user_id", session.user.id)
      .single()

    const { data: siblings } = await supabaseAdmin
      .from("transactions")
      .select(`
        id, amount, description, category_id,
        categories(name)
      `)
      .eq("split_parent_id", transaction.split_parent_id)
      .eq("user_id", session.user.id)

    return NextResponse.json({
      parent_id: transaction.split_parent_id,
      split_group_id: transaction.split_group_id,
      parent_amount: parent?.amount,
      parent_description: parent?.description,
      parent_date: parent?.date,
      account_name: parent ? getAccountName(parent.accounts) : undefined,
      current_split_id: id,
      splits: siblings?.map((s) => ({
        id: s.id,
        amount: s.amount,
        description: s.description,
        category_id: s.category_id,
        category_name: getCategoryData(s.categories)?.name || null,
      })) || [],
    })
  }

  // Not a split transaction
  return NextResponse.json({
    is_split: false,
    message: "This transaction is not split",
  })
}
