import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { categorizationRuleSchema } from "@/lib/validators/categorization-rule"

/**
 * GET /api/categorization-rules
 * List all categorization rules for the authenticated user
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("categorization_rules")
    .select(`
      *,
      categories(name)
    `)
    .eq("user_id", session.user.id)
    .order("rule_order", { ascending: true })

  if (error) {
    console.error("Failed to fetch categorization rules:", error)
    return NextResponse.json(
      { error: "Failed to fetch categorization rules" },
      { status: 500 }
    )
  }

  // Transform to include category name
  const rules = data.map((r) => ({
    ...r,
    category_name: r.categories?.name,
    categories: undefined,
  }))

  return NextResponse.json(rules)
}

/**
 * POST /api/categorization-rules
 * Create a new categorization rule
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

  const validationResult = categorizationRuleSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, rule_type, pattern, case_sensitive, target_category_id, is_active } =
    validationResult.data

  // Verify category belongs to user
  const { data: category, error: categoryError } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("id", target_category_id)
    .eq("user_id", session.user.id)
    .single()

  if (categoryError || !category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  // Get the next rule order
  const { data: maxOrderResult } = await supabaseAdmin
    .from("categorization_rules")
    .select("rule_order")
    .eq("user_id", session.user.id)
    .order("rule_order", { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrderResult?.rule_order ?? -1) + 1

  const { data, error } = await supabaseAdmin
    .from("categorization_rules")
    .insert({
      user_id: session.user.id,
      name,
      rule_order: nextOrder,
      rule_type,
      pattern,
      case_sensitive,
      target_category_id,
      is_active,
    })
    .select(`
      *,
      categories(name)
    `)
    .single()

  if (error) {
    console.error("Failed to create categorization rule:", error)
    return NextResponse.json(
      { error: "Failed to create categorization rule" },
      { status: 500 }
    )
  }

  const rule = {
    ...data,
    category_name: data.categories?.name,
    categories: undefined,
  }

  return NextResponse.json(rule, { status: 201 })
}
