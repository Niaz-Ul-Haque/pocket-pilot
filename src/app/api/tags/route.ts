import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { tagSchema } from "@/lib/validators/tag"

/**
 * GET /api/tags
 * List all tags for the current user
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch tags with usage count
  const { data: tags, error } = await supabaseAdmin
    .from("tags")
    .select(`
      *,
      transaction_tags(count)
    `)
    .eq("user_id", session.user.id)
    .order("name", { ascending: true })

  if (error) {
    console.error("Failed to fetch tags:", error)
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    )
  }

  // Transform to include transaction count
  const tagsWithCount = tags.map((tag) => ({
    ...tag,
    transaction_count: tag.transaction_tags?.[0]?.count || 0,
    transaction_tags: undefined,
  }))

  return NextResponse.json(tagsWithCount)
}

/**
 * POST /api/tags
 * Create a new tag
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

  const validationResult = tagSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, color } = validationResult.data

  // Check for duplicate tag name
  const { data: existing } = await supabaseAdmin
    .from("tags")
    .select("id")
    .eq("user_id", session.user.id)
    .ilike("name", name)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: "A tag with this name already exists" },
      { status: 409 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("tags")
    .insert({
      user_id: session.user.id,
      name,
      color,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create tag:", error)
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    )
  }

  return NextResponse.json({ ...data, transaction_count: 0 }, { status: 201 })
}
