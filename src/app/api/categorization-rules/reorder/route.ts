import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { reorderRulesSchema } from "@/lib/validators/categorization-rule"

/**
 * POST /api/categorization-rules/reorder
 * Reorder categorization rules
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

  const validationResult = reorderRulesSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { rule_ids } = validationResult.data

  // Verify all rules belong to the user
  const { data: existingRules, error: checkError } = await supabaseAdmin
    .from("categorization_rules")
    .select("id")
    .eq("user_id", session.user.id)
    .in("id", rule_ids)

  if (checkError) {
    console.error("Failed to verify rules:", checkError)
    return NextResponse.json(
      { error: "Failed to verify rules" },
      { status: 500 }
    )
  }

  const existingIds = new Set(existingRules?.map((r) => r.id) || [])
  const invalidIds = rule_ids.filter((id) => !existingIds.has(id))

  if (invalidIds.length > 0) {
    return NextResponse.json(
      {
        error: "Some rules not found or don't belong to you",
        invalid_ids: invalidIds,
      },
      { status: 404 }
    )
  }

  // Update rule orders - use negative temporary values to avoid unique constraint violations
  for (let i = 0; i < rule_ids.length; i++) {
    const { error } = await supabaseAdmin
      .from("categorization_rules")
      .update({ rule_order: -(i + 1) })
      .eq("id", rule_ids[i])
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Failed to update rule order:", error)
      return NextResponse.json(
        { error: "Failed to reorder rules" },
        { status: 500 }
      )
    }
  }

  // Convert negative values to positive
  for (let i = 0; i < rule_ids.length; i++) {
    const { error } = await supabaseAdmin
      .from("categorization_rules")
      .update({ rule_order: i })
      .eq("id", rule_ids[i])
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Failed to finalize rule order:", error)
      return NextResponse.json(
        { error: "Failed to finalize rule order" },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    success: true,
    message: "Rules reordered successfully",
  })
}
