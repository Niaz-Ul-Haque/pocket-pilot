import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { transactionLinkUpdateSchema } from "@/lib/validators/transaction-link"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/transaction-links/[id]
 * Get a single transaction link
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("transaction_links")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  // Fetch transaction details
  const [sourceRes, targetRes] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select(`
        id, date, description, amount,
        accounts(name),
        categories(name)
      `)
      .eq("id", data.source_transaction_id)
      .single(),
    supabaseAdmin
      .from("transactions")
      .select(`
        id, date, description, amount,
        accounts(name),
        categories(name)
      `)
      .eq("id", data.target_transaction_id)
      .single(),
  ])

  // Handle Supabase joined data (can be object or array depending on relation)
  const getAccountName = (accounts: unknown) => {
    if (!accounts) return undefined
    if (Array.isArray(accounts)) return accounts[0]?.name
    return (accounts as { name?: string })?.name
  }
  const getCategoryName = (categories: unknown) => {
    if (!categories) return undefined
    if (Array.isArray(categories)) return categories[0]?.name
    return (categories as { name?: string })?.name
  }

  const linkWithDetails = {
    ...data,
    source_transaction: sourceRes.data
      ? {
          id: sourceRes.data.id,
          date: sourceRes.data.date,
          description: sourceRes.data.description,
          amount: sourceRes.data.amount,
          account_name: getAccountName(sourceRes.data.accounts),
          category_name: getCategoryName(sourceRes.data.categories),
        }
      : null,
    target_transaction: targetRes.data
      ? {
          id: targetRes.data.id,
          date: targetRes.data.date,
          description: targetRes.data.description,
          amount: targetRes.data.amount,
          account_name: getAccountName(targetRes.data.accounts),
          category_name: getCategoryName(targetRes.data.categories),
        }
      : null,
  }

  return NextResponse.json(linkWithDetails)
}

/**
 * PUT /api/transaction-links/[id]
 * Update a transaction link
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

  const validationResult = transactionLinkUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Verify link exists and belongs to user
  const { data: existing, error: existError } = await supabaseAdmin
    .from("transaction_links")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (existError || !existing) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from("transaction_links")
    .update(validationResult.data)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    console.error("Failed to update link:", error)
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/transaction-links/[id]
 * Delete a transaction link
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify link exists and belongs to user
  const { data: existing, error: existError } = await supabaseAdmin
    .from("transaction_links")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (existError || !existing) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("transaction_links")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to delete link:", error)
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
