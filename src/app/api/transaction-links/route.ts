import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { transactionLinkSchema } from "@/lib/validators/transaction-link"

/**
 * GET /api/transaction-links
 * List all transaction links for the authenticated user
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const transactionId = searchParams.get("transactionId")

  let query = supabaseAdmin
    .from("transaction_links")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })

  // Filter by transaction if provided
  if (transactionId) {
    query = query.or(`source_transaction_id.eq.${transactionId},target_transaction_id.eq.${transactionId}`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch transaction links:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction links" },
      { status: 500 }
    )
  }

  // Helper to extract name from Supabase joined data (can be object or array)
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

  // Fetch transaction details for each link
  const linksWithDetails = await Promise.all(
    data.map(async (link) => {
      const [sourceRes, targetRes] = await Promise.all([
        supabaseAdmin
          .from("transactions")
          .select(`
            id, date, description, amount,
            accounts(name),
            categories(name)
          `)
          .eq("id", link.source_transaction_id)
          .single(),
        supabaseAdmin
          .from("transactions")
          .select(`
            id, date, description, amount,
            accounts(name),
            categories(name)
          `)
          .eq("id", link.target_transaction_id)
          .single(),
      ])

      return {
        ...link,
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
    })
  )

  return NextResponse.json(linksWithDetails)
}

/**
 * POST /api/transaction-links
 * Create a new transaction link
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

  const validationResult = transactionLinkSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { source_transaction_id, target_transaction_id, link_type, notes } =
    validationResult.data

  // Verify both transactions belong to user
  const { data: transactions, error: checkError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("user_id", session.user.id)
    .in("id", [source_transaction_id, target_transaction_id])

  if (checkError) {
    console.error("Failed to verify transactions:", checkError)
    return NextResponse.json(
      { error: "Failed to verify transactions" },
      { status: 500 }
    )
  }

  if (!transactions || transactions.length !== 2) {
    return NextResponse.json(
      { error: "One or both transactions not found" },
      { status: 404 }
    )
  }

  // Check for existing link
  const { data: existingLink } = await supabaseAdmin
    .from("transaction_links")
    .select("id")
    .eq("source_transaction_id", source_transaction_id)
    .eq("target_transaction_id", target_transaction_id)
    .eq("link_type", link_type)
    .single()

  if (existingLink) {
    return NextResponse.json(
      { error: "This link already exists" },
      { status: 409 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("transaction_links")
    .insert({
      user_id: session.user.id,
      source_transaction_id,
      target_transaction_id,
      link_type,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create transaction link:", error)
    return NextResponse.json(
      { error: "Failed to create transaction link" },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}
