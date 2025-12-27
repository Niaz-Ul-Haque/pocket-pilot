import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { billSchema, calculateBillStatus } from "@/lib/validators/bill"

// GET /api/bills - List all bills for the current user
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeParam = searchParams.get("active")
    const activeOnly = activeParam === "true" // Only filter if explicitly set to "true"
    const upcoming = searchParams.get("upcoming") === "true"
    const days = parseInt(searchParams.get("days") || "30", 10)

    let query = supabaseAdmin
      .from("bills")
      .select(`
        *,
        categories(name)
      `)
      .eq("user_id", session.user.id)
      .order("next_due_date", { ascending: true })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    if (upcoming) {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + days)
      query = query.lte("next_due_date", futureDate.toISOString().split("T")[0])
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching bills:", error)
      return NextResponse.json(
        { error: "Failed to fetch bills" },
        { status: 500 }
      )
    }

    // Transform and add status
    const billsWithStatus = (data ?? []).map((bill) => {
      const billData = {
        ...bill,
        amount: bill.amount ? parseFloat(bill.amount) : null,
        category_name: bill.categories?.name ?? null,
      }
      // Remove the nested categories object
      const { categories, ...rest } = billData
      return calculateBillStatus(rest)
    })

    return NextResponse.json(billsWithStatus)
  } catch (error) {
    console.error("Error in GET /api/bills:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/bills - Create a new bill
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = billSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, amount, frequency, next_due_date, category_id, auto_pay, notes } =
      validation.data

    const { data, error } = await supabaseAdmin
      .from("bills")
      .insert({
        user_id: session.user.id,
        name,
        amount: amount ?? null,
        frequency,
        next_due_date,
        category_id: category_id ?? null,
        auto_pay: auto_pay ?? false,
        notes: notes ?? null,
      })
      .select(`
        *,
        categories(name)
      `)
      .single()

    if (error) {
      console.error("Error creating bill:", error)
      return NextResponse.json(
        { error: "Failed to create bill" },
        { status: 500 }
      )
    }

    // Transform and add status
    const billData = {
      ...data,
      amount: data.amount ? parseFloat(data.amount) : null,
      category_name: data.categories?.name ?? null,
    }
    const { categories, ...rest } = billData

    return NextResponse.json(calculateBillStatus(rest), { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/bills:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
