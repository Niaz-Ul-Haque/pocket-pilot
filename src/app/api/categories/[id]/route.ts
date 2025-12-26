import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { categoryUpdateSchema } from "@/lib/validators/category"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/categories/[id]
 * Get a single category by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    console.error("Failed to fetch category:", error)
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/categories/[id]
 * Update a category
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

  const validationResult = categoryUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Ensure the category belongs to the user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .update(validationResult.data)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    // Check for unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      )
    }
    console.error("Failed to update category:", error)
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/categories/[id]
 * Archive a category (soft delete) instead of hard delete
 * This preserves referential integrity with transactions
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Ensure the category belongs to the user
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("categories")
    .select("id, is_archived")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  if (existing.is_archived) {
    return NextResponse.json(
      { error: "Category is already archived" },
      { status: 400 }
    )
  }

  // Soft delete: set is_archived to true
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to archive category:", error)
    return NextResponse.json(
      { error: "Failed to archive category" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: "Category archived" })
}
