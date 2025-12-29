import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { budgetCopyForwardSchema } from "@/lib/validators/budget"

/**
 * POST /api/budgets/copy-forward
 * Copy budgets from one month to another
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

  const validationResult = budgetCopyForwardSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const {
    source_year,
    source_month,
    target_year,
    target_month,
    include_amounts,
    include_notes,
  } = validationResult.data

  // Prevent copying to the same month
  if (source_year === target_year && source_month === target_month) {
    return NextResponse.json(
      { error: "Cannot copy to the same month" },
      { status: 400 }
    )
  }

  // Fetch source budgets
  // For non-month-specific budgets (year and month are null), they apply to all months
  // For month-specific budgets, we look for matching year/month
  const { data: sourceBudgets, error: fetchError } = await supabaseAdmin
    .from("budgets")
    .select(`
      *,
      categories!inner(name, type)
    `)
    .eq("user_id", session.user.id)

  if (fetchError) {
    console.error("Failed to fetch source budgets:", fetchError)
    return NextResponse.json(
      { error: "Failed to fetch source budgets" },
      { status: 500 }
    )
  }

  // Filter budgets that apply to the source month
  // A budget applies if: (year IS NULL) OR (year = source_year AND (month IS NULL OR month = source_month))
  const applicableBudgets = (sourceBudgets || []).filter((b) => {
    if (b.year === null) return true // Non-year-specific budget
    if (b.year === source_year) {
      if (b.month === null) return true // Year-specific but not month-specific
      return b.month === source_month // Month-specific
    }
    return false
  })

  if (applicableBudgets.length === 0) {
    return NextResponse.json(
      { error: "No budgets found for the source period" },
      { status: 404 }
    )
  }

  // Get existing target month budgets to avoid duplicates
  const { data: existingTargetBudgets } = await supabaseAdmin
    .from("budgets")
    .select("category_id")
    .eq("user_id", session.user.id)
    .or(`year.is.null,and(year.eq.${target_year},or(month.is.null,month.eq.${target_month}))`)

  const existingCategoryIds = new Set(
    (existingTargetBudgets || []).map((b) => b.category_id)
  )

  // Prepare new budgets for target month
  const budgetsToCreate: Array<{
    user_id: string
    category_id: string
    amount: number
    period: string
    rollover: boolean
    alert_threshold: number
    notes: string | null
    year: number
    month: number
  }> = []
  const skippedCategories: string[] = []
  const copiedCategories: string[] = []

  for (const budget of applicableBudgets) {
    // Skip if budget already exists in target month
    if (existingCategoryIds.has(budget.category_id)) {
      skippedCategories.push(
        `${budget.categories?.name || "Unknown"} (already exists)`
      )
      continue
    }

    budgetsToCreate.push({
      user_id: session.user.id,
      category_id: budget.category_id,
      amount: include_amounts ? budget.amount : 0,
      period: budget.period,
      rollover: budget.rollover,
      alert_threshold: budget.alert_threshold ?? 90,
      notes: include_notes ? budget.notes : null,
      year: target_year,
      month: target_month,
    })
    existingCategoryIds.add(budget.category_id)
    copiedCategories.push(budget.categories?.name || "Unknown")
  }

  if (budgetsToCreate.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "All budgets already exist in target month",
        skipped: skippedCategories,
      },
      { status: 400 }
    )
  }

  // Insert new budgets
  const { data: createdBudgets, error: insertError } = await supabaseAdmin
    .from("budgets")
    .insert(budgetsToCreate)
    .select()

  if (insertError) {
    console.error("Failed to copy budgets:", insertError)
    return NextResponse.json(
      { error: "Failed to copy budgets" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `Copied ${createdBudgets.length} budget(s) from ${source_month}/${source_year} to ${target_month}/${target_year}`,
    copied: copiedCategories,
    skipped: skippedCategories,
    count: createdBudgets.length,
  })
}
