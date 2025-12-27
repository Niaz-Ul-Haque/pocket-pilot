import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

const addTagSchema = z.object({
  tag_id: z.string().uuid("Invalid tag ID"),
})

const removeTagSchema = z.object({
  tag_id: z.string().uuid("Invalid tag ID"),
})

/**
 * GET /api/transactions/[id]/tags
 * Get all tags for a transaction
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify transaction belongs to user
  const { data: transaction, error: txError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (txError || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  // Fetch tags for this transaction
  const { data: transactionTags, error } = await supabaseAdmin
    .from("transaction_tags")
    .select(`
      tag_id,
      tags:tag_id (
        id,
        name,
        color
      )
    `)
    .eq("transaction_id", id)

  if (error) {
    console.error("Failed to fetch transaction tags:", error)
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    )
  }

  // Extract tag data - handle Supabase joined data (can be object or array)
  const tags = transactionTags
    .map((tt) => {
      const tagData = tt.tags as unknown
      return Array.isArray(tagData)
        ? (tagData[0] as { id: string; name: string; color: string } | undefined)
        : (tagData as { id: string; name: string; color: string } | null)
    })
    .filter((tag): tag is { id: string; name: string; color: string } => tag != null)

  return NextResponse.json(tags)
}

/**
 * POST /api/transactions/[id]/tags
 * Add a tag to a transaction
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

  const validationResult = addTagSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { tag_id } = validationResult.data

  // Verify transaction belongs to user
  const { data: transaction, error: txError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (txError || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  // Verify tag belongs to user
  const { data: tag, error: tagError } = await supabaseAdmin
    .from("tags")
    .select("id, name, color")
    .eq("id", tag_id)
    .eq("user_id", session.user.id)
    .single()

  if (tagError || !tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 })
  }

  // Check if already tagged
  const { data: existing } = await supabaseAdmin
    .from("transaction_tags")
    .select("transaction_id")
    .eq("transaction_id", id)
    .eq("tag_id", tag_id)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: "Tag already added to this transaction" },
      { status: 409 }
    )
  }

  // Add tag to transaction
  const { error } = await supabaseAdmin
    .from("transaction_tags")
    .insert({
      transaction_id: id,
      tag_id,
    })

  if (error) {
    console.error("Failed to add tag:", error)
    return NextResponse.json(
      { error: "Failed to add tag" },
      { status: 500 }
    )
  }

  return NextResponse.json(tag, { status: 201 })
}

/**
 * DELETE /api/transactions/[id]/tags
 * Remove a tag from a transaction
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

  const validationResult = removeTagSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { tag_id } = validationResult.data

  // Verify transaction belongs to user
  const { data: transaction, error: txError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (txError || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  // Remove tag from transaction
  const { error } = await supabaseAdmin
    .from("transaction_tags")
    .delete()
    .eq("transaction_id", id)
    .eq("tag_id", tag_id)

  if (error) {
    console.error("Failed to remove tag:", error)
    return NextResponse.json(
      { error: "Failed to remove tag" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: "Tag removed" })
}
