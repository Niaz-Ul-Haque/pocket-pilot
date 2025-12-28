import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { transactionTemplateUpdateSchema } from "@/lib/validators/transaction-template"

interface RouteParams {
  params: Promise<{ id: string }>
}

interface TagData {
  id: string
  name: string
  color: string
}

// Helper to extract tag from Supabase joined data (can be object or array)
function extractTag(tags: unknown): TagData | null {
  if (!tags) return null
  if (Array.isArray(tags)) {
    const first = tags[0]
    if (first && typeof first === "object" && "id" in first) {
      return first as TagData
    }
    return null
  }
  if (typeof tags === "object" && "id" in tags) {
    return tags as TagData
  }
  return null
}

/**
 * GET /api/transaction-templates/[id]
 * Get a single transaction template
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("transaction_templates")
    .select(`
      *,
      accounts(name),
      categories(name)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  // Fetch tags
  const { data: tags } = await supabaseAdmin
    .from("template_tags")
    .select("tag_id, tags(id, name, color)")
    .eq("template_id", id)

  const template = {
    ...data,
    account_name: data.accounts?.name,
    category_name: data.categories?.name,
    tags: tags?.map((t) => extractTag(t.tags)).filter((t): t is TagData => t !== null) || [],
    accounts: undefined,
    categories: undefined,
  }

  return NextResponse.json(template)
}

/**
 * PUT /api/transaction-templates/[id]
 * Update a transaction template
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

  const validationResult = transactionTemplateUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Verify template exists and belongs to user
  const { data: existing, error: existError } = await supabaseAdmin
    .from("transaction_templates")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (existError || !existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  const { tag_ids, ...updateData } = validationResult.data

  // Verify account if updating
  if (updateData.account_id) {
    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("id", updateData.account_id)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
  }

  // Verify category if updating
  if (updateData.category_id) {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("id", updateData.category_id)
      .eq("user_id", session.user.id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from("transaction_templates")
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select(`
      *,
      accounts(name),
      categories(name)
    `)
    .single()

  if (error) {
    console.error("Failed to update template:", error)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }

  // Update tags if provided
  let tags: Array<{ id: string; name: string; color: string }> = []
  if (tag_ids !== undefined) {
    // Remove existing tags
    await supabaseAdmin.from("template_tags").delete().eq("template_id", id)

    // Add new tags
    if (tag_ids.length > 0) {
      const { data: validTags } = await supabaseAdmin
        .from("tags")
        .select("id, name, color")
        .eq("user_id", session.user.id)
        .in("id", tag_ids)

      if (validTags && validTags.length > 0) {
        const tagAssociations = validTags.map((tag) => ({
          template_id: id,
          tag_id: tag.id,
        }))

        await supabaseAdmin.from("template_tags").insert(tagAssociations)
        tags = validTags
      }
    }
  } else {
    // Fetch existing tags
    const { data: existingTags } = await supabaseAdmin
      .from("template_tags")
      .select("tag_id, tags(id, name, color)")
      .eq("template_id", id)

    tags = existingTags?.map((t) => extractTag(t.tags)).filter((t): t is TagData => t !== null) || []
  }

  const template = {
    ...data,
    account_name: data.accounts?.name,
    category_name: data.categories?.name,
    tags,
    accounts: undefined,
    categories: undefined,
  }

  return NextResponse.json(template)
}

/**
 * DELETE /api/transaction-templates/[id]
 * Delete a transaction template
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify template exists and belongs to user
  const { data: existing, error: existError } = await supabaseAdmin
    .from("transaction_templates")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (existError || !existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("transaction_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to delete template:", error)
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
