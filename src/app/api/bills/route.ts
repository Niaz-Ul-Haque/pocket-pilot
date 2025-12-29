import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { billSchema, calculateBillStatus, type Bill, type BillType } from "@/lib/validators/bill"

// Helper function to parse bill data
function parseBillData(data: Record<string, unknown>): Bill {
  return {
    ...data,
    amount: data.amount ? parseFloat(data.amount as string) : null,
    bill_type: (data.bill_type as BillType) || "other",
    current_streak: (data.current_streak as number) || 0,
    longest_streak: (data.longest_streak as number) || 0,
    total_payments: (data.total_payments as number) || 0,
    on_time_payments: (data.on_time_payments as number) || 0,
  } as Bill
}

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
    const billType = searchParams.get("bill_type")

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

    if (billType) {
      query = query.eq("bill_type", billType)
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
      const billData = parseBillData({
        ...bill,
        category_name: bill.categories?.name ?? null,
      })
      // Remove the nested categories object
      const { categories, ...rest } = billData as Record<string, unknown>
      return calculateBillStatus(rest as Bill)
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

    const { name, amount, frequency, next_due_date, category_id, bill_type, auto_pay, notes } =
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
        bill_type: bill_type || "other",
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
    const billData = parseBillData({
      ...data,
      category_name: data.categories?.name ?? null,
    })
    const { categories, ...rest } = billData as Record<string, unknown>

    return NextResponse.json(calculateBillStatus(rest as Bill), { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/bills:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
