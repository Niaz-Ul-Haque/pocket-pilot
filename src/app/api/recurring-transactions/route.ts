import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  recurringTransactionSchema,
  toSignedAmount,
} from "@/lib/validators/recurring-transaction"

// GET /api/recurring-transactions - List all recurring transactions
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") === "true"

    let query = supabaseAdmin
      .from("recurring_transactions")
      .select(`
        *,
        accounts(name),
        categories(name)
      `)
      .eq("user_id", session.user.id)
      .order("next_occurrence_date", { ascending: true })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching recurring transactions:", error)
      return NextResponse.json(
        { error: "Failed to fetch recurring transactions" },
        { status: 500 }
      )
    }

    // Transform to include related names
    const transformed = data.map((rt) => ({
      ...rt,
      account_name: (rt.accounts as { name: string } | null)?.name || null,
      category_name: (rt.categories as { name: string } | null)?.name || null,
      accounts: undefined,
      categories: undefined,
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error("Error in GET /api/recurring-transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/recurring-transactions - Create a new recurring transaction
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = recurringTransactionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { type, amount, notes, ...rest } = validationResult.data
    const signedAmount = toSignedAmount(amount, type)

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("id", rest.account_id)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found or doesn't belong to you" },
        { status: 400 }
      )
    }

    // Verify category belongs to user if provided
    if (rest.category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("id", rest.category_id)
        .eq("user_id", session.user.id)
        .single()

      if (categoryError || !category) {
        return NextResponse.json(
          { error: "Category not found or doesn't belong to you" },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("recurring_transactions")
      .insert({
        user_id: session.user.id,
        ...rest,
        amount: signedAmount,
        notes: notes || null,
      })
      .select(`
        *,
        accounts(name),
        categories(name)
      `)
      .single()

    if (error) {
      console.error("Error creating recurring transaction:", error)
      return NextResponse.json(
        { error: "Failed to create recurring transaction" },
        { status: 500 }
      )
    }

    const transformed = {
      ...data,
      account_name: (data.accounts as { name: string } | null)?.name || null,
      category_name: (data.categories as { name: string } | null)?.name || null,
      accounts: undefined,
      categories: undefined,
    }

    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/recurring-transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
