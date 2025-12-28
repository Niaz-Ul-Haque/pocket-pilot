import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { applyTemplateSchema } from "@/lib/validators/transaction-template"
import { formToDbAmount } from "@/lib/validators/transaction"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/transaction-templates/[id]/apply
 * Create a transaction from a template
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

  const validationResult = applyTemplateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { date, amount_override, description_override } = validationResult.data

  // Fetch the template
  const { data: template, error: templateError } = await supabaseAdmin
    .from("transaction_templates")
    .select(`
      *,
      accounts(id, name),
      categories(id, name)
    `)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  // Verify account still exists
  if (!template.accounts) {
    return NextResponse.json(
      { error: "Template account no longer exists" },
      { status: 400 }
    )
  }

  // Use override values or template defaults
  const amount = amount_override ?? template.amount
  const description = description_override !== undefined
    ? description_override
    : template.description

  // Convert amount to signed database format
  const dbAmount = formToDbAmount(amount, template.type)

  // Create the transaction
  const { data: transaction, error: createError } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: session.user.id,
      account_id: template.account_id,
      category_id: template.category_id,
      date,
      amount: dbAmount,
      description,
      is_transfer: false,
    })
    .select(`
      *,
      accounts!inner(name),
      categories(name, type)
    `)
    .single()

  if (createError) {
    console.error("Failed to create transaction:", createError)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }

  // Add tags from template
  const { data: templateTags } = await supabaseAdmin
    .from("template_tags")
    .select("tag_id")
    .eq("template_id", id)

  if (templateTags && templateTags.length > 0) {
    const transactionTags = templateTags.map((t) => ({
      transaction_id: transaction.id,
      tag_id: t.tag_id,
    }))

    await supabaseAdmin.from("transaction_tags").insert(transactionTags)
  }

  // Update template usage count
  await supabaseAdmin
    .from("transaction_templates")
    .update({
      usage_count: template.usage_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", id)

  // Transform response
  const result = {
    ...transaction,
    account_name: transaction.accounts?.name,
    category_name: transaction.categories?.name,
    category_type: transaction.categories?.type,
    accounts: undefined,
    categories: undefined,
  }

  return NextResponse.json(result, { status: 201 })
}
