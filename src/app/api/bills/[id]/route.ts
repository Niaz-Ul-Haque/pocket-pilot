import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  billUpdateSchema,
  markPaidSchema,
  calculateBillStatus,
  calculateNextDueDate,
} from "@/lib/validators/bill"

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/bills/[id] - Get a single bill
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const { data, error } = await supabaseAdmin
      .from("bills")
      .select(`
        *,
        categories(name)
      `)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    const billData = {
      ...data,
      amount: data.amount ? parseFloat(data.amount) : null,
      category_name: data.categories?.name ?? null,
    }
    const { categories, ...rest } = billData

    return NextResponse.json(calculateBillStatus(rest))
  } catch (error) {
    console.error("Error in GET /api/bills/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/bills/[id] - Update a bill
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const validation = billUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name
    }
    if (validation.data.amount !== undefined) {
      updateData.amount = validation.data.amount
    }
    if (validation.data.frequency !== undefined) {
      updateData.frequency = validation.data.frequency
    }
    if (validation.data.next_due_date !== undefined) {
      updateData.next_due_date = validation.data.next_due_date
    }
    if (validation.data.category_id !== undefined) {
      updateData.category_id = validation.data.category_id
    }
    if (validation.data.auto_pay !== undefined) {
      updateData.auto_pay = validation.data.auto_pay
    }
    if (validation.data.notes !== undefined) {
      updateData.notes = validation.data.notes || null
    }
    if (validation.data.is_active !== undefined) {
      updateData.is_active = validation.data.is_active
    }

    const { data, error } = await supabaseAdmin
      .from("bills")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select(`
        *,
        categories(name)
      `)
      .single()

    if (error) {
      console.error("Error updating bill:", error)
      return NextResponse.json(
        { error: "Failed to update bill" },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    const billData = {
      ...data,
      amount: data.amount ? parseFloat(data.amount) : null,
      category_name: data.categories?.name ?? null,
    }
    const { categories, ...rest } = billData

    return NextResponse.json(calculateBillStatus(rest))
  } catch (error) {
    console.error("Error in PUT /api/bills/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/bills/[id] - Delete a bill
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const { error } = await supabaseAdmin
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting bill:", error)
      return NextResponse.json(
        { error: "Failed to delete bill" },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error in DELETE /api/bills/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/bills/[id] - Mark bill as paid (custom action)
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const validation = markPaidSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get the current bill
    const { data: bill, error: fetchError } = await supabaseAdmin
      .from("bills")
      .select(`
        *,
        categories(name)
      `)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError || !bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    const { create_transaction, amount, account_id, payment_date } = validation.data
    const today = new Date().toISOString().split("T")[0]

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(bill.next_due_date, bill.frequency)

    // Update the bill
    const { data: updatedBill, error: updateError } = await supabaseAdmin
      .from("bills")
      .update({
        next_due_date: nextDueDate,
        last_paid_date: payment_date || today,
      })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select(`
        *,
        categories(name)
      `)
      .single()

    if (updateError) {
      console.error("Error updating bill:", updateError)
      return NextResponse.json(
        { error: "Failed to mark bill as paid" },
        { status: 500 }
      )
    }

    let transaction = null

    // Optionally create a transaction
    if (create_transaction && account_id) {
      const transactionAmount = amount ?? (bill.amount ? parseFloat(bill.amount) : null)
      
      if (transactionAmount) {
        const { data: newTransaction, error: transactionError } = await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: session.user.id,
            account_id,
            category_id: bill.category_id,
            date: payment_date || today,
            amount: -Math.abs(transactionAmount), // Negative for expense
            description: `${bill.name} payment`,
          })
          .select()
          .single()

        if (transactionError) {
          console.error("Error creating transaction:", transactionError)
          // Don't fail the whole request, just note the error
        } else {
          transaction = newTransaction
        }
      }
    }

    const billData = {
      ...updatedBill,
      amount: updatedBill.amount ? parseFloat(updatedBill.amount) : null,
      category_name: updatedBill.categories?.name ?? null,
    }
    const { categories, ...rest } = billData

    return NextResponse.json({
      bill: calculateBillStatus(rest),
      transaction,
    })
  } catch (error) {
    console.error("Error in POST /api/bills/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
