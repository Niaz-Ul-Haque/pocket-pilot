import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { bulkUpdateCategorySchema } from "@/lib/validators/bulk-operations"

/**
 * POST /api/transactions/bulk/update-category
 * Update the category of multiple transactions at once
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

  const validationResult = bulkUpdateCategorySchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { transaction_ids, category_id } = validationResult.data

  // Verify all transactions belong to the user
  const { data: existingTransactions, error: checkError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("user_id", session.user.id)
    .in("id", transaction_ids)

  if (checkError) {
    console.error("Failed to verify transactions:", checkError)
    return NextResponse.json(
      { error: "Failed to verify transactions" },
      { status: 500 }
    )
  }

  const existingIds = new Set(existingTransactions?.map((t) => t.id) || [])
  const invalidIds = transaction_ids.filter((id) => !existingIds.has(id))

  if (invalidIds.length > 0) {
    return NextResponse.json(
      {
        error: "Some transactions not found or don't belong to you",
        invalid_ids: invalidIds,
      },
      { status: 404 }
    )
  }

  // Verify category belongs to user (if provided)
  if (category_id) {
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

  // Update all transactions
  const { error: updateError } = await supabaseAdmin
    .from("transactions")
    .update({ category_id: category_id })
    .eq("user_id", session.user.id)
    .in("id", transaction_ids)

  if (updateError) {
    console.error("Failed to update transactions:", updateError)
    return NextResponse.json(
      { error: "Failed to update transactions" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    affected_count: transaction_ids.length,
    message: `Successfully updated ${transaction_ids.length} transaction(s)`,
  })
}
