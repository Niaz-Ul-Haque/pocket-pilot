import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  calculateAnnualCost,
  calculateMonthlyAverage,
  type AnnualBillCost,
  type AnnualCostSummary,
  type BillFrequency,
  type BillType,
  BILL_TYPES,
  BILL_FREQUENCIES,
} from "@/lib/validators/bill"

// GET /api/bills/annual-cost - Calculate annual cost of all bills
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active_only") !== "false"

    let query = supabaseAdmin
      .from("bills")
      .select("id, name, amount, frequency, bill_type")
      .eq("user_id", session.user.id)

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data: bills, error } = await query

    if (error) {
      console.error("Error fetching bills:", error)
      return NextResponse.json(
        { error: "Failed to fetch bills" },
        { status: 500 }
      )
    }

    // Calculate annual cost for each bill
    const billCosts: AnnualBillCost[] = (bills ?? []).map((bill) => {
      const amount = bill.amount ? parseFloat(bill.amount) : null
      const frequency = bill.frequency as BillFrequency
      const billType = (bill.bill_type || "other") as BillType

      return {
        bill_id: bill.id,
        bill_name: bill.name,
        bill_type: billType,
        frequency,
        amount,
        annual_cost: calculateAnnualCost(amount, frequency),
        monthly_average: calculateMonthlyAverage(amount, frequency),
      }
    })

    // Calculate totals
    const totalAnnualCost = billCosts.reduce((sum, b) => sum + b.annual_cost, 0)
    const totalMonthlyAverage = billCosts.reduce((sum, b) => sum + b.monthly_average, 0)

    // Group by type
    const byType = BILL_TYPES.map((type) => {
      const typeBills = billCosts.filter((b) => b.bill_type === type)
      return {
        type,
        count: typeBills.length,
        annual_cost: typeBills.reduce((sum, b) => sum + b.annual_cost, 0),
      }
    }).filter((t) => t.count > 0)

    // Group by frequency
    const byFrequency = BILL_FREQUENCIES.map((frequency) => {
      const freqBills = billCosts.filter((b) => b.frequency === frequency)
      return {
        frequency,
        count: freqBills.length,
        annual_cost: freqBills.reduce((sum, b) => sum + b.annual_cost, 0),
      }
    }).filter((f) => f.count > 0)

    const summary: AnnualCostSummary = {
      total_annual_cost: totalAnnualCost,
      total_monthly_average: totalMonthlyAverage,
      by_type: byType,
      by_frequency: byFrequency,
      bills: billCosts.sort((a, b) => b.annual_cost - a.annual_cost),
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error("Error in GET /api/bills/annual-cost:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
