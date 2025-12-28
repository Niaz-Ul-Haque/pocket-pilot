import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  applyBudgetTemplateSchema,
  calculateBudgetFromPercentage,
} from "@/lib/validators/budget-template"
import { DEFAULT_ALERT_THRESHOLD } from "@/lib/validators/budget"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/budget-templates/[id]/apply
 * Apply a template to create budgets
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

  // Add template_id from params
  body.template_id = id

  const validationResult = applyBudgetTemplateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { monthly_income, category_mappings, period, replace_existing } =
    validationResult.data

  // Fetch template with items
  const { data: template, error: templateError } = await supabaseAdmin
    .from("budget_templates")
    .select("*")
    .eq("id", id)
    .or(`is_system.eq.true,user_id.eq.${session.user.id}`)
    .single()

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("budget_template_items")
    .select("*")
    .eq("template_id", id)

  if (itemsError) {
    console.error("Failed to fetch template items:", itemsError)
    return NextResponse.json(
      { error: "Failed to fetch template items" },
      { status: 500 }
    )
  }

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "Template has no budget items" },
      { status: 400 }
    )
  }

  // Fetch user's expense categories
  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("user_id", session.user.id)
    .eq("type", "expense")

  if (categoriesError) {
    console.error("Failed to fetch categories:", categoriesError)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }

  // Create a map of category name -> category id (case-insensitive)
  const categoryMap: Record<string, string> = {}
  for (const cat of categories || []) {
    categoryMap[cat.name.toLowerCase()] = cat.id
  }

  // If replace_existing, delete all current budgets
  if (replace_existing) {
    await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("user_id", session.user.id)
  }

  // Get existing budget category IDs to avoid duplicates
  const { data: existingBudgets } = await supabaseAdmin
    .from("budgets")
    .select("category_id")
    .eq("user_id", session.user.id)

  const existingCategoryIds = new Set(
    (existingBudgets || []).map((b) => b.category_id)
  )

  // Prepare budgets to create
  const budgetsToCreate: Array<{
    user_id: string
    category_id: string
    amount: number
    period: string
    rollover: boolean
    alert_threshold: number
    notes: string | null
  }> = []
  const skippedItems: string[] = []
  const createdItems: string[] = []

  for (const item of items) {
    // Try to find matching category
    let categoryId: string | undefined

    // First check explicit mappings
    if (category_mappings && category_mappings[item.category_name]) {
      categoryId = category_mappings[item.category_name] as string
    } else {
      // Try to match by name (case-insensitive)
      categoryId = categoryMap[item.category_name.toLowerCase()]
    }

    if (!categoryId) {
      skippedItems.push(`${item.category_name} (no matching category)`)
      continue
    }

    // Check if budget already exists for this category
    if (existingCategoryIds.has(categoryId)) {
      skippedItems.push(`${item.category_name} (budget already exists)`)
      continue
    }

    // Calculate amount
    let amount: number
    if (item.fixed_amount !== null && item.fixed_amount !== undefined) {
      amount = item.fixed_amount
    } else if (
      item.percentage !== null &&
      item.percentage !== undefined &&
      monthly_income
    ) {
      amount = calculateBudgetFromPercentage(item.percentage, monthly_income)
    } else if (item.percentage !== null && item.percentage !== undefined) {
      // Default to percentage of $5000 if no income provided
      amount = calculateBudgetFromPercentage(item.percentage, 5000)
    } else {
      skippedItems.push(`${item.category_name} (no amount could be calculated)`)
      continue
    }

    budgetsToCreate.push({
      user_id: session.user.id,
      category_id: categoryId,
      amount,
      period,
      rollover: false,
      alert_threshold: DEFAULT_ALERT_THRESHOLD,
      notes: item.notes,
    })
    existingCategoryIds.add(categoryId) // Prevent duplicates in same batch
    createdItems.push(item.category_name)
  }

  if (budgetsToCreate.length === 0) {
    return NextResponse.json(
      {
        error: "No budgets could be created",
        details: {
          skipped: skippedItems,
          message:
            "Ensure you have matching expense categories for the template items",
        },
      },
      { status: 400 }
    )
  }

  // Insert all budgets
  const { data: createdBudgets, error: insertError } = await supabaseAdmin
    .from("budgets")
    .insert(budgetsToCreate)
    .select()

  if (insertError) {
    console.error("Failed to create budgets:", insertError)
    return NextResponse.json(
      { error: "Failed to create budgets" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `Created ${createdBudgets.length} budget(s) from template`,
    created: createdItems,
    skipped: skippedItems,
    budgets: createdBudgets,
  })
}
