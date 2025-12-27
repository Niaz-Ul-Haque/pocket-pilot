import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { recurringTransactionUpdateSchema } from "@/lib/validators/recurring-transaction"

// GET /api/recurring-transactions/[id] - Get a single recurring transaction
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from("recurring_transactions")
      .select(`
        *,
        accounts(name),
        categories(name)
      `)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Recurring transaction not found" },
          { status: 404 }
        )
      }
      console.error("Error fetching recurring transaction:", error)
      return NextResponse.json(
        { error: "Failed to fetch recurring transaction" },
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

    return NextResponse.json(transformed)
  } catch (error) {
    console.error("Error in GET /api/recurring-transactions/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/recurring-transactions/[id] - Update a recurring transaction
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = recurringTransactionUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("recurring_transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Recurring transaction not found" },
        { status: 404 }
      )
    }

    const updateData = validationResult.data

    // Verify account belongs to user if updating
    if (updateData.account_id) {
      const { data: account, error: accountError } = await supabaseAdmin
        .from("accounts")
        .select("id")
        .eq("id", updateData.account_id)
        .eq("user_id", session.user.id)
        .single()

      if (accountError || !account) {
        return NextResponse.json(
          { error: "Account not found or doesn't belong to you" },
          { status: 400 }
        )
      }
    }

    // Verify category belongs to user if updating and not null
    if (updateData.category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("id", updateData.category_id)
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
      .update(updateData)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select(`
        *,
        accounts(name),
        categories(name)
      `)
      .single()

    if (error) {
      console.error("Error updating recurring transaction:", error)
      return NextResponse.json(
        { error: "Failed to update recurring transaction" },
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

    return NextResponse.json(transformed)
  } catch (error) {
    console.error("Error in PUT /api/recurring-transactions/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/recurring-transactions/[id] - Delete a recurring transaction
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("recurring_transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Recurring transaction not found" },
        { status: 404 }
      )
    }

    const { error } = await supabaseAdmin
      .from("recurring_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting recurring transaction:", error)
      return NextResponse.json(
        { error: "Failed to delete recurring transaction" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/recurring-transactions/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
