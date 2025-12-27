import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { transferSchema } from "@/lib/validators/transaction"

/**
 * POST /api/transactions/transfer
 * Create a transfer between two accounts
 * Creates two linked transactions: one negative (from), one positive (to)
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

  const validationResult = transferSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { from_account_id, to_account_id, amount, date, description } = validationResult.data

  // Verify both accounts belong to the user
  const { data: accounts, error: accountsError } = await supabaseAdmin
    .from("accounts")
    .select("id, name")
    .eq("user_id", session.user.id)
    .in("id", [from_account_id, to_account_id])

  if (accountsError || !accounts || accounts.length !== 2) {
    return NextResponse.json(
      { error: "One or both accounts not found" },
      { status: 404 }
    )
  }

  const fromAccount = accounts.find((a) => a.id === from_account_id)
  const toAccount = accounts.find((a) => a.id === to_account_id)

  // Find or create a "Transfer" category
  let transferCategoryId: string | null = null
  const { data: transferCategory } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("type", "transfer")
    .limit(1)
    .single()

  if (transferCategory) {
    transferCategoryId = transferCategory.id
  }

  // Create the transfer description
  const transferDescription = description || `Transfer: ${fromAccount?.name} → ${toAccount?.name}`

  // Create the "from" transaction (negative amount - money leaving)
  const { data: fromTransaction, error: fromError } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: session.user.id,
      account_id: from_account_id,
      category_id: transferCategoryId,
      date,
      amount: -Math.abs(amount), // Negative: money leaving
      description: transferDescription,
      is_transfer: true,
    })
    .select()
    .single()

  if (fromError) {
    console.error("Failed to create from transaction:", fromError)
    return NextResponse.json(
      { error: "Failed to create transfer" },
      { status: 500 }
    )
  }

  // Create the "to" transaction (positive amount - money arriving)
  const { data: toTransaction, error: toError } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: session.user.id,
      account_id: to_account_id,
      category_id: transferCategoryId,
      date,
      amount: Math.abs(amount), // Positive: money arriving
      description: transferDescription,
      is_transfer: true,
      linked_transaction_id: fromTransaction.id, // Link to the from transaction
    })
    .select()
    .single()

  if (toError) {
    // Rollback the from transaction if to fails
    await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("id", fromTransaction.id)

    console.error("Failed to create to transaction:", toError)
    return NextResponse.json(
      { error: "Failed to create transfer" },
      { status: 500 }
    )
  }

  // Update the from transaction with the linked_transaction_id
  await supabaseAdmin
    .from("transactions")
    .update({ linked_transaction_id: toTransaction.id })
    .eq("id", fromTransaction.id)

  return NextResponse.json(
    {
      success: true,
      message: `Transferred $${amount.toFixed(2)} from ${fromAccount?.name} to ${toAccount?.name}`,
      from_transaction: fromTransaction,
      to_transaction: toTransaction,
    },
    { status: 201 }
  )
}
