import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { bulkDeleteSchema } from "@/lib/validators/bulk-operations"

/**
 * POST /api/transactions/bulk/delete
 * Delete multiple transactions at once
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

  const validationResult = bulkDeleteSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { transaction_ids } = validationResult.data

  // Verify all transactions belong to the user
  const { data: existingTransactions, error: checkError } = await supabaseAdmin
    .from("transactions")
    .select("id, linked_transaction_id")
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

  // Collect linked transaction IDs (for transfers)
  const linkedIds = existingTransactions
    ?.filter((t) => t.linked_transaction_id)
    .map((t) => t.linked_transaction_id as string)
    .filter((id) => !transaction_ids.includes(id)) || []

  // Delete all transactions (including linked ones for transfers)
  const allIdsToDelete = [...transaction_ids, ...linkedIds]

  const { error: deleteError } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("user_id", session.user.id)
    .in("id", allIdsToDelete)

  if (deleteError) {
    console.error("Failed to delete transactions:", deleteError)
    return NextResponse.json(
      { error: "Failed to delete transactions" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    affected_count: allIdsToDelete.length,
    message: `Successfully deleted ${allIdsToDelete.length} transaction(s)`,
  })
}
