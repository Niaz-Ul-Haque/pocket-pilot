import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { aiLearningRuleSchema } from "@/lib/validators/ai-features"

// GET - Retrieve AI learning rules
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ruleType = searchParams.get("type")
  const activeOnly = searchParams.get("active") !== "false"

  let query = supabaseAdmin
    .from("ai_learning_rules")
    .select("*")
    .eq("user_id", session.user.id)
    .order("priority", { ascending: false })

  if (ruleType) {
    query = query.eq("rule_type", ruleType)
  }
  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query

  if (error) {
    console.error("[AI Learning] Error fetching rules:", error)
    return NextResponse.json({ error: "Failed to fetch learning rules" }, { status: 500 })
  }

  return NextResponse.json({ rules: data })
}

// POST - Create new learning rule or teach AI
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  // Teach AI from natural language
  if (action === "teach") {
    const body = await request.json()
    const { instruction } = body

    if (!instruction) {
      return NextResponse.json({ error: "instruction is required" }, { status: 400 })
    }

    // Parse teaching instruction
    const result = parseTeachingInstruction(instruction)

    if (!result) {
      return NextResponse.json({
        error: "Could not understand instruction",
        hint: "Try formats like: 'When I buy from Starbucks, categorize it as Dining Out' or 'Always mark transactions over $500 as needs review'",
      }, { status: 400 })
    }

    // Create rule from parsed instruction
    const { data, error } = await supabaseAdmin
      .from("ai_learning_rules")
      .insert({
        user_id: session.user.id,
        rule_type: result.rule_type,
        pattern: result.pattern,
        action: result.action,
        priority: result.priority || 5,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("[AI Learning] Error creating rule:", error)
      return NextResponse.json({ error: "Failed to create learning rule" }, { status: 500 })
    }

    return NextResponse.json({
      rule: data,
      message: `Got it! I'll ${describeRule(result)}`,
    })
  }

  // Create rule directly
  const body = await request.json()
  const validation = aiLearningRuleSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid data", details: validation.error.issues }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("ai_learning_rules")
    .insert({
      user_id: session.user.id,
      ...validation.data,
    })
    .select()
    .single()

  if (error) {
    console.error("[AI Learning] Error creating rule:", error)
    return NextResponse.json({ error: "Failed to create learning rule" }, { status: 500 })
  }

  return NextResponse.json({ rule: data })
}

// PUT - Update learning rule
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  // Add updated_at timestamp
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("ai_learning_rules")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    console.error("[AI Learning] Error updating rule:", error)
    return NextResponse.json({ error: "Failed to update learning rule" }, { status: 500 })
  }

  return NextResponse.json({ rule: data })
}

// DELETE - Remove learning rule
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("ai_learning_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("[AI Learning] Error deleting rule:", error)
    return NextResponse.json({ error: "Failed to delete learning rule" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// Parse natural language teaching instruction
function parseTeachingInstruction(instruction: string): {
  rule_type: string
  pattern: string
  action: Record<string, unknown>
  priority?: number
} | null {
  const lower = instruction.toLowerCase()

  // Pattern: "When I buy from X, categorize as Y"
  const buyFromPattern = /(?:when|if|whenever)\s+(?:i\s+)?(?:buy|purchase|shop|spend)\s+(?:from|at)\s+(.+?),?\s+(?:categorize|mark|set|put)\s+(?:it\s+)?(?:as|in|to)\s+(.+)/i
  const buyMatch = buyFromPattern.exec(instruction)
  if (buyMatch) {
    return {
      rule_type: "categorization",
      pattern: buyMatch[1].trim(),
      action: { category_name: buyMatch[2].trim() },
      priority: 7,
    }
  }

  // Pattern: "Mark X as Y category"
  const markAsPattern = /(?:mark|set|put)\s+(.+?)\s+(?:as|in|to)\s+(.+?)\s*(?:category)?$/i
  const markMatch = markAsPattern.exec(instruction)
  if (markMatch) {
    return {
      rule_type: "categorization",
      pattern: markMatch[1].trim(),
      action: { category_name: markMatch[2].trim() },
      priority: 6,
    }
  }

  // Pattern: "X is actually Y (merchant normalization)"
  const normalizePattern = /(.+?)\s+(?:is|means|equals|=)\s+(?:actually\s+)?(.+)/i
  const normalizeMatch = normalizePattern.exec(instruction)
  if (normalizeMatch) {
    return {
      rule_type: "merchant",
      pattern: normalizeMatch[1].trim(),
      action: { normalized_name: normalizeMatch[2].trim() },
      priority: 8,
    }
  }

  // Pattern: "Alert me when spending over $X"
  const alertPattern = /(?:alert|notify|warn|tell)\s+me\s+(?:when|if)\s+(?:i\s+)?(?:spend|spending)\s+(?:over|more than|above)\s+\$?(\d+)/i
  const alertMatch = alertPattern.exec(instruction)
  if (alertMatch) {
    return {
      rule_type: "amount_threshold",
      pattern: "expense",
      action: { threshold: parseFloat(alertMatch[1]), alert: true },
      priority: 5,
    }
  }

  // Pattern: "Ignore transactions from X"
  const ignorePattern = /(?:ignore|skip|hide)\s+(?:transactions?\s+)?(?:from|at)\s+(.+)/i
  const ignoreMatch = ignorePattern.exec(instruction)
  if (ignoreMatch) {
    return {
      rule_type: "custom",
      pattern: ignoreMatch[1].trim(),
      action: { ignore: true },
      priority: 4,
    }
  }

  // Pattern: "Always tag X transactions with Y"
  const tagPattern = /(?:always\s+)?tag\s+(.+?)\s+(?:transactions?\s+)?(?:with|as)\s+(.+)/i
  const tagMatch = tagPattern.exec(instruction)
  if (tagMatch) {
    return {
      rule_type: "custom",
      pattern: tagMatch[1].trim(),
      action: { add_tag: tagMatch[2].trim() },
      priority: 6,
    }
  }

  return null
}

// Describe rule in natural language
function describeRule(rule: { rule_type: string; pattern: string; action: Record<string, unknown> }): string {
  switch (rule.rule_type) {
    case "categorization":
      return `categorize "${rule.pattern}" transactions as "${rule.action.category_name}"`
    case "merchant":
      return `recognize "${rule.pattern}" as "${rule.action.normalized_name}"`
    case "amount_threshold":
      return `alert you when spending exceeds $${rule.action.threshold}`
    case "custom":
      if (rule.action.ignore) return `ignore transactions from "${rule.pattern}"`
      if (rule.action.add_tag) return `tag "${rule.pattern}" transactions with "${rule.action.add_tag}"`
      return `apply custom rule for "${rule.pattern}"`
    default:
      return `apply this rule for "${rule.pattern}"`
  }
}
