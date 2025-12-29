import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  updateBudgetTemplateSchema,
  type BudgetTemplateWithItems,
} from "@/lib/validators/budget-template"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/budget-templates/[id]
 * Get a single template with its items
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Fetch template (must be system or user's own)
  const { data: template, error: templateError } = await supabaseAdmin
    .from("budget_templates")
    .select("*")
    .eq("id", id)
    .or(`is_system.eq.true,user_id.eq.${session.user.id}`)
    .single()

  if (templateError) {
    if (templateError.code === "PGRST116") {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }
    console.error("Failed to fetch template:", templateError)
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    )
  }

  // Fetch template items
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("budget_template_items")
    .select("*")
    .eq("template_id", id)
    .order("created_at", { ascending: true })

  if (itemsError) {
    console.error("Failed to fetch template items:", itemsError)
    return NextResponse.json(
      { error: "Failed to fetch template items" },
      { status: 500 }
    )
  }

  const templateWithItems: BudgetTemplateWithItems = {
    ...template,
    items: items || [],
  }

  return NextResponse.json(templateWithItems)
}

/**
 * PUT /api/budget-templates/[id]
 * Update a custom template (not system templates)
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

  const validationResult = updateBudgetTemplateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  // Verify the template belongs to the user and is not a system template
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("budget_templates")
    .select("id, is_system")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  if (existing.is_system) {
    return NextResponse.json(
      { error: "Cannot modify system templates" },
      { status: 403 }
    )
  }

  const { name, description, items } = validationResult.data

  // Update template fields
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description

  const { error: updateError } = await supabaseAdmin
    .from("budget_templates")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (updateError) {
    console.error("Failed to update template:", updateError)
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }

  // If items provided, replace all items
  if (items) {
    // Delete existing items
    await supabaseAdmin
      .from("budget_template_items")
      .delete()
      .eq("template_id", id)

    // Insert new items
    const itemsToInsert = items.map((item) => ({
      template_id: id,
      category_name: item.category_name,
      percentage: item.percentage ?? null,
      fixed_amount: item.fixed_amount ?? null,
      notes: item.notes ?? null,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from("budget_template_items")
      .insert(itemsToInsert)

    if (itemsError) {
      console.error("Failed to update template items:", itemsError)
      return NextResponse.json(
        { error: "Failed to update template items" },
        { status: 500 }
      )
    }
  }

  // Fetch updated template with items
  const { data: template } = await supabaseAdmin
    .from("budget_templates")
    .select("*")
    .eq("id", id)
    .single()

  const { data: updatedItems } = await supabaseAdmin
    .from("budget_template_items")
    .select("*")
    .eq("template_id", id)
    .order("created_at", { ascending: true })

  const templateWithItems: BudgetTemplateWithItems = {
    ...template,
    items: updatedItems || [],
  }

  return NextResponse.json(templateWithItems)
}

/**
 * DELETE /api/budget-templates/[id]
 * Delete a custom template (not system templates)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify the template belongs to the user and is not a system template
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("budget_templates")
    .select("id, is_system")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  if (existing.is_system) {
    return NextResponse.json(
      { error: "Cannot delete system templates" },
      { status: 403 }
    )
  }

  // Delete template (items will be deleted via CASCADE)
  const { error } = await supabaseAdmin
    .from("budget_templates")
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

  return NextResponse.json({ success: true, message: "Template deleted" })
}
