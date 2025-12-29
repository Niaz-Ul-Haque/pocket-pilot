import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { transactionSchema, formToDbAmount } from "@/lib/validators/transaction"
import { testRule, type RuleType } from "@/lib/validators/categorization-rule"

/**
 * GET /api/transactions
 * List transactions for the authenticated user with optional filters
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")
  const categoryId = searchParams.get("categoryId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const search = searchParams.get("search")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")
  const withCount = searchParams.get("withCount") === "true"

  // Build base query with count option
  let query = supabaseAdmin
    .from("transactions")
    .select(
      `
      *,
      accounts!inner(name),
      categories(name, type)
    `,
      { count: withCount ? "exact" : undefined }
    )
    .eq("user_id", session.user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
  if (accountId) {
    query = query.eq("account_id", accountId)
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }
  if (startDate) {
    query = query.gte("date", startDate)
  }
  if (endDate) {
    query = query.lte("date", endDate)
  }
  if (search) {
    query = query.ilike("description", `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error("Failed to fetch transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }

  // Get linked account names for transfers
  const linkedTransactionIds = data
    .filter((t) => t.is_transfer && t.linked_transaction_id)
    .map((t) => t.linked_transaction_id)

  let linkedAccountMap: Record<string, string> = {}
  if (linkedTransactionIds.length > 0) {
    const { data: linkedTx } = await supabaseAdmin
      .from("transactions")
      .select("id, account_id, accounts!inner(name)")
      .in("id", linkedTransactionIds)
      .eq("user_id", session.user.id)

    if (linkedTx) {
      linkedAccountMap = linkedTx.reduce((acc, t) => {
        const accountData = t.accounts as unknown
        const account = Array.isArray(accountData)
          ? (accountData[0] as { name: string } | undefined)
          : (accountData as { name: string } | null)
        acc[t.id] = account?.name || "Unknown"
        return acc
      }, {} as Record<string, string>)
    }
  }

  // Transform data to flatten joined fields
  const transactions = data.map((t) => ({
    ...t,
    account_name: t.accounts?.name,
    category_name: t.categories?.name,
    category_type: t.categories?.type,
    linked_account_name: t.linked_transaction_id
      ? linkedAccountMap[t.linked_transaction_id]
      : undefined,
    accounts: undefined,
    categories: undefined,
  }))

  // Return paginated response when withCount is true
  if (withCount) {
    return NextResponse.json({
      transactions,
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (count ?? 0),
      },
    })
  }

  return NextResponse.json(transactions)
}

/**
 * POST /api/transactions
 * Create a new transaction
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

  const validationResult = transactionSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { account_id, category_id, date, amount, description, type } =
    validationResult.data

  // Verify account belongs to user
  const { data: account, error: accountError } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("id", account_id)
    .eq("user_id", session.user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // Verify category belongs to user (if provided)
  let finalCategoryId = category_id || null

  if (category_id) {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("id", category_id)
      .eq("user_id", session.user.id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
  }

  // Auto-categorize if no category provided and description exists
  if (!finalCategoryId && description) {
    // First, try categorization rules (from auto-categorization page)
    const { data: rules } = await supabaseAdmin
      .from("categorization_rules")
      .select("id, rule_type, pattern, case_sensitive, target_category_id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .order("rule_order", { ascending: true })

    if (rules) {
      for (const rule of rules) {
        if (testRule(description, rule.rule_type as RuleType, rule.pattern, rule.case_sensitive)) {
          finalCategoryId = rule.target_category_id
          break
        }
      }
    }

    // If still no category, try AI learning rules
    if (!finalCategoryId) {
      const { data: aiRules } = await supabaseAdmin
        .from("ai_learning_rules")
        .select("id, rule_type, pattern, action")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .eq("rule_type", "categorization")
        .order("priority", { ascending: false })

      if (aiRules) {
        for (const rule of aiRules) {
          // AI learning rules use 'contains' matching by default
          const lowerDesc = description.toLowerCase()
          const lowerPattern = (rule.pattern || "").toLowerCase()

          if (lowerDesc.includes(lowerPattern)) {
            // Get category by name from action
            const categoryName = rule.action?.category_name
            if (categoryName) {
              const { data: category } = await supabaseAdmin
                .from("categories")
                .select("id")
                .eq("user_id", session.user.id)
                .ilike("name", categoryName)
                .single()

              if (category) {
                finalCategoryId = category.id
                break
              }
            }
          }
        }
      }
    }
  }

  // Convert form amount to signed database amount
  const dbAmount = formToDbAmount(amount, type)

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: session.user.id,
      account_id,
      category_id: finalCategoryId,
      date,
      amount: dbAmount,
      description: description || null,
      is_transfer: type === "transfer",
    })
    .select(`
      *,
      accounts!inner(name),
      categories(name, type)
    `)
    .single()

  if (error) {
    console.error("Failed to create transaction:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }

  // Transform to include joined fields
  const transaction = {
    ...data,
    account_name: data.accounts?.name,
    category_name: data.categories?.name,
    category_type: data.categories?.type,
    accounts: undefined,
    categories: undefined,
  }

  return NextResponse.json(transaction, { status: 201 })
}
