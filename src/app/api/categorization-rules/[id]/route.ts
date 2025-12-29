import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { categorizationRuleUpdateSchema } from "@/lib/validators/categorization-rule"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/categorization-rules/[id]
 * Get a single categorization rule
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("categorization_rules")
    .select(`
      *,
      categories(name)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  const rule = {
    ...data,
    category_name: data.categories?.name,
    categories: undefined,
  }

  return NextResponse.json(rule)
}

/**
 * PUT /api/categorization-rules/[id]
 * Update a categorization rule
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

  const validationResult = categorizationRuleUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Verify rule exists and belongs to user
  const { data: existing, error: existError } = await supabaseAdmin
    .from("categorization_rules")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (existError || !existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  // If updating category, verify it belongs to user
  if (validationResult.data.target_category_id) {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("id", validationResult.data.target_category_id)
      .eq("user_id", session.user.id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from("categorization_rules")
    .update({
      ...validationResult.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select(`
      *,
      categories(name)
    `)
    .single()

  if (error) {
    console.error("Failed to update rule:", error)
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    )
  }

  const rule = {
    ...data,
    category_name: data.categories?.name,
    categories: undefined,
  }

  return NextResponse.json(rule)
}

/**
 * DELETE /api/categorization-rules/[id]
 * Delete a categorization rule
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify rule exists and belongs to user
  const { data: existing, error: existError } = await supabaseAdmin
    .from("categorization_rules")
    .select("id, rule_order")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (existError || !existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from("categorization_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to delete rule:", error)
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    )
  }

  // Reorder remaining rules to fill the gap (optional - ignore errors)
  try {
    await supabaseAdmin.rpc("reorder_categorization_rules_after_delete", {
      p_user_id: session.user.id,
      p_deleted_order: existing.rule_order,
    })
  } catch {
    // Ignore if the function doesn't exist, ordering is still valid
  }

  return NextResponse.json({ success: true })
}
