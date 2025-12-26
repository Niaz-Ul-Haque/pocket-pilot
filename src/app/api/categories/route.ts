import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { categorySchema } from "@/lib/validators/category"

/**
 * GET /api/categories
 * List all categories for the authenticated user (excluding archived by default)
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check for ?includeArchived=true query param
  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get("includeArchived") === "true"

  let query = supabaseAdmin
    .from("categories")
    .select("*")
    .eq("user_id", session.user.id)
    .order("type", { ascending: true })
    .order("name", { ascending: true })

  // By default, exclude archived categories
  if (!includeArchived) {
    query = query.eq("is_archived", false)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/**
 * POST /api/categories
 * Create a new category
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

  const validationResult = categorySchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      user_id: session.user.id,
      ...validationResult.data,
      is_archived: false,
    })
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
    console.error("Failed to create category:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}
