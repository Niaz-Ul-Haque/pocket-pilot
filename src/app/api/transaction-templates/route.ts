import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { transactionTemplateSchema } from "@/lib/validators/transaction-template"

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
 * GET /api/transaction-templates
 * List all transaction templates for the authenticated user
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("transaction_templates")
    .select(`
      *,
      accounts(name),
      categories(name)
    `)
    .eq("user_id", session.user.id)
    .order("is_favorite", { ascending: false })
    .order("usage_count", { ascending: false })

  if (error) {
    console.error("Failed to fetch templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }

  // Fetch tags for each template
  const templatesWithTags = await Promise.all(
    data.map(async (template) => {
      const { data: tags } = await supabaseAdmin
        .from("template_tags")
        .select("tag_id, tags(id, name, color)")
        .eq("template_id", template.id)

      return {
        ...template,
        account_name: template.accounts?.name,
        category_name: template.categories?.name,
        tags: tags?.map((t) => extractTag(t.tags)).filter((t): t is TagData => t !== null) || [],
        accounts: undefined,
        categories: undefined,
      }
    })
  )

  return NextResponse.json(templatesWithTags)
}

/**
 * POST /api/transaction-templates
 * Create a new transaction template
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

  const validationResult = transactionTemplateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, account_id, category_id, amount, type, description, is_favorite, tag_ids } =
    validationResult.data

  // Verify account belongs to user
  const { data: account, error: accountError } = await supabaseAdmin
    .from("accounts")
    .select("id, name")
    .eq("id", account_id)
    .eq("user_id", session.user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // Verify category belongs to user (if provided)
  let categoryName: string | null = null
  if (category_id) {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("id", category_id)
      .eq("user_id", session.user.id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    categoryName = category.name
  }

  // Create the template
  const { data, error } = await supabaseAdmin
    .from("transaction_templates")
    .insert({
      user_id: session.user.id,
      name,
      account_id,
      category_id: category_id || null,
      amount,
      type,
      description: description || null,
      is_favorite,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create template:", error)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }

  // Add tags if provided
  let tags: Array<{ id: string; name: string; color: string }> = []
  if (tag_ids && tag_ids.length > 0) {
    // Verify tags belong to user
    const { data: validTags } = await supabaseAdmin
      .from("tags")
      .select("id, name, color")
      .eq("user_id", session.user.id)
      .in("id", tag_ids)

    if (validTags && validTags.length > 0) {
      const tagAssociations = validTags.map((tag) => ({
        template_id: data.id,
        tag_id: tag.id,
      }))

      await supabaseAdmin.from("template_tags").insert(tagAssociations)
      tags = validTags
    }
  }

  const template = {
    ...data,
    account_name: account.name,
    category_name: categoryName,
    tags,
  }

  return NextResponse.json(template, { status: 201 })
}
