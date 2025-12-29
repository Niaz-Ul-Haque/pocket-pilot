import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { bulkAddTagsSchema } from "@/lib/validators/bulk-operations"

/**
 * POST /api/transactions/bulk/add-tags
 * Add tags to multiple transactions at once
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

  const validationResult = bulkAddTagsSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { transaction_ids, tag_ids, replace_existing } = validationResult.data

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

  // Verify all tags belong to user
  const { data: existingTags, error: tagsError } = await supabaseAdmin
    .from("tags")
    .select("id")
    .eq("user_id", session.user.id)
    .in("id", tag_ids)

  if (tagsError) {
    console.error("Failed to verify tags:", tagsError)
    return NextResponse.json(
      { error: "Failed to verify tags" },
      { status: 500 }
    )
  }

  const existingTagIds = new Set(existingTags?.map((t) => t.id) || [])
  const invalidTagIds = tag_ids.filter((id) => !existingTagIds.has(id))

  if (invalidTagIds.length > 0) {
    return NextResponse.json(
      {
        error: "Some tags not found or don't belong to you",
        invalid_tag_ids: invalidTagIds,
      },
      { status: 404 }
    )
  }

  // If replacing existing tags, delete all current tags first
  if (replace_existing) {
    const { error: deleteError } = await supabaseAdmin
      .from("transaction_tags")
      .delete()
      .in("transaction_id", transaction_ids)

    if (deleteError) {
      console.error("Failed to remove existing tags:", deleteError)
      return NextResponse.json(
        { error: "Failed to remove existing tags" },
        { status: 500 }
      )
    }
  }

  // Create tag associations for all transactions
  const tagAssociations = transaction_ids.flatMap((transactionId) =>
    tag_ids.map((tagId) => ({
      transaction_id: transactionId,
      tag_id: tagId,
    }))
  )

  // Use upsert to avoid duplicates
  const { error: insertError } = await supabaseAdmin
    .from("transaction_tags")
    .upsert(tagAssociations, {
      onConflict: "transaction_id,tag_id",
      ignoreDuplicates: true,
    })

  if (insertError) {
    console.error("Failed to add tags:", insertError)
    return NextResponse.json(
      { error: "Failed to add tags" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    affected_count: transaction_ids.length,
    tags_added: tag_ids.length,
    message: `Successfully added ${tag_ids.length} tag(s) to ${transaction_ids.length} transaction(s)`,
  })
}
