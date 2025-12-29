import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { applyRulesSchema, testRule, type ApplyRulesResult } from "@/lib/validators/categorization-rule"

/**
 * POST /api/categorization-rules/apply
 * Apply categorization rules to existing transactions
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

  const validationResult = applyRulesSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { uncategorized_only, dry_run } = validationResult.data

  // Fetch all active rules
  const { data: rules, error: rulesError } = await supabaseAdmin
    .from("categorization_rules")
    .select(`
      *,
      categories(name)
    `)
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("rule_order", { ascending: true })

  if (rulesError) {
    console.error("Failed to fetch rules:", rulesError)
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    )
  }

  if (!rules || rules.length === 0) {
    return NextResponse.json({
      total_checked: 0,
      total_matched: 0,
      matches: [],
      message: "No active rules found",
    })
  }

  // Fetch transactions to check
  let transactionQuery = supabaseAdmin
    .from("transactions")
    .select("id, description")
    .eq("user_id", session.user.id)
    .not("description", "is", null)

  if (uncategorized_only) {
    transactionQuery = transactionQuery.is("category_id", null)
  }

  const { data: transactions, error: transError } = await transactionQuery

  if (transError) {
    console.error("Failed to fetch transactions:", transError)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({
      total_checked: 0,
      total_matched: 0,
      matches: [],
      message: "No transactions to process",
    })
  }

  // Apply rules to transactions
  const matches: ApplyRulesResult["matches"] = []
  const updates: Array<{ id: string; category_id: string }> = []

  for (const transaction of transactions) {
    if (!transaction.description) continue

    // Find the first matching rule
    for (const rule of rules) {
      if (
        testRule(
          transaction.description,
          rule.rule_type,
          rule.pattern,
          rule.case_sensitive
        )
      ) {
        matches.push({
          transaction_id: transaction.id,
          description: transaction.description,
          rule_name: rule.name,
          category_name: rule.categories?.name || "Unknown",
        })
        updates.push({
          id: transaction.id,
          category_id: rule.target_category_id,
        })
        break // Only apply the first matching rule
      }
    }
  }

  // If not a dry run, apply the updates
  if (!dry_run && updates.length > 0) {
    // Update transactions in batches
    const batchSize = 50
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)

      for (const update of batch) {
        await supabaseAdmin
          .from("transactions")
          .update({ category_id: update.category_id })
          .eq("id", update.id)
          .eq("user_id", session.user.id)
      }
    }
  }

  const result: ApplyRulesResult = {
    total_checked: transactions.length,
    total_matched: matches.length,
    matches: dry_run ? matches : matches.slice(0, 10), // Limit matches in response for non-dry-run
  }

  return NextResponse.json({
    ...result,
    applied: !dry_run,
    message: dry_run
      ? `Found ${matches.length} matches out of ${transactions.length} transactions (dry run)`
      : `Applied categories to ${matches.length} transaction(s)`,
  })
}
