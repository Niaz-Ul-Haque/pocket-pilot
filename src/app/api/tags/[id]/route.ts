import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { tagUpdateSchema } from "@/lib/validators/tag"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tags/[id]
 * Get a single tag by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("tags")
    .select(`
      *,
      transaction_tags(count)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }
    console.error("Failed to fetch tag:", error)
    return NextResponse.json(
      { error: "Failed to fetch tag" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ...data,
    transaction_count: data.transaction_tags?.[0]?.count || 0,
    transaction_tags: undefined,
  })
}

/**
 * PUT /api/tags/[id]
 * Update a tag
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

  const validationResult = tagUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Verify tag belongs to user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("tags")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 })
  }

  // Check for duplicate name if updating name
  if (validationResult.data.name) {
    const { data: duplicate } = await supabaseAdmin
      .from("tags")
      .select("id")
      .eq("user_id", session.user.id)
      .ilike("name", validationResult.data.name)
      .neq("id", id)
      .single()

    if (duplicate) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabaseAdmin
    .from("tags")
    .update(validationResult.data)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    console.error("Failed to update tag:", error)
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/tags/[id]
 * Delete a tag (also removes from all transactions)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify tag belongs to user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("tags")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to delete tag:", error)
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: "Tag deleted" })
}
