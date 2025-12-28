import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  createBudgetTemplateSchema,
  type BudgetTemplateWithItems,
} from "@/lib/validators/budget-template"

/**
 * GET /api/budget-templates
 * List all budget templates (system + user's custom templates)
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch all templates accessible to the user (system + their own)
  const { data: templates, error: templatesError } = await supabaseAdmin
    .from("budget_templates")
    .select("*")
    .or(`is_system.eq.true,user_id.eq.${session.user.id}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })

  if (templatesError) {
    console.error("Failed to fetch templates:", templatesError)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }

  // Fetch all template items
  const templateIds = templates.map((t) => t.id)
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("budget_template_items")
    .select("*")
    .in("template_id", templateIds)
    .order("created_at", { ascending: true })

  if (itemsError) {
    console.error("Failed to fetch template items:", itemsError)
    return NextResponse.json(
      { error: "Failed to fetch template items" },
      { status: 500 }
    )
  }

  // Group items by template
  const itemsByTemplate: Record<string, typeof items> = {}
  for (const item of items || []) {
    if (!itemsByTemplate[item.template_id]) {
      itemsByTemplate[item.template_id] = []
    }
    itemsByTemplate[item.template_id].push(item)
  }

  // Combine templates with their items
  const templatesWithItems: BudgetTemplateWithItems[] = templates.map((t) => ({
    ...t,
    items: itemsByTemplate[t.id] || [],
  }))

  return NextResponse.json(templatesWithItems)
}

/**
 * POST /api/budget-templates
 * Create a custom budget template
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

  const validationResult = createBudgetTemplateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, description, template_type, items } = validationResult.data

  // Create the template
  const { data: template, error: templateError } = await supabaseAdmin
    .from("budget_templates")
    .insert({
      user_id: session.user.id,
      name,
      description: description ?? null,
      template_type,
      is_system: false,
    })
    .select()
    .single()

  if (templateError) {
    console.error("Failed to create template:", templateError)
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }

  // Create template items
  const itemsToInsert = items.map((item) => ({
    template_id: template.id,
    category_name: item.category_name,
    percentage: item.percentage ?? null,
    fixed_amount: item.fixed_amount ?? null,
    notes: item.notes ?? null,
  }))

  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from("budget_template_items")
    .insert(itemsToInsert)
    .select()

  if (itemsError) {
    console.error("Failed to create template items:", itemsError)
    // Clean up the template
    await supabaseAdmin.from("budget_templates").delete().eq("id", template.id)
    return NextResponse.json(
      { error: "Failed to create template items" },
      { status: 500 }
    )
  }

  const templateWithItems: BudgetTemplateWithItems = {
    ...template,
    items: insertedItems || [],
  }

  return NextResponse.json(templateWithItems, { status: 201 })
}
