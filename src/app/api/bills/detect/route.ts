import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { type BillType, type BillFrequency } from "@/lib/validators/bill"

type DetectedBill = {
  merchant_name: string
  suggested_amount: number
  suggested_frequency: BillFrequency
  confidence: number
  transaction_count: number
  last_transaction_date: string
  average_days_between: number
  suggested_bill_type: BillType
  category_id: string | null
  category_name: string | null
}

// Keywords to help identify bill types
const BILL_TYPE_KEYWORDS: Record<BillType, string[]> = {
  utilities: ["hydro", "electric", "gas", "water", "utility", "energy", "power"],
  subscriptions: ["netflix", "spotify", "amazon prime", "disney", "hulu", "apple", "youtube", "adobe", "microsoft 365", "dropbox"],
  insurance: ["insurance", "geico", "allstate", "progressive", "state farm", "coverage"],
  rent_mortgage: ["rent", "mortgage", "lease", "housing", "property"],
  loans: ["loan", "payment", "credit", "finance", "lending"],
  phone_internet: ["rogers", "bell", "telus", "fido", "koodo", "virgin", "internet", "mobile", "phone", "cell", "wireless"],
  memberships: ["gym", "fitness", "membership", "club", "costco", "amazon prime"],
  other: [],
}

function detectBillType(merchantName: string, categoryName: string | null): BillType {
  const searchText = `${merchantName} ${categoryName || ""}`.toLowerCase()

  for (const [type, keywords] of Object.entries(BILL_TYPE_KEYWORDS)) {
    if (type === "other") continue
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return type as BillType
      }
    }
  }

  return "other"
}

function detectFrequency(avgDays: number): { frequency: BillFrequency; confidence: number } {
  // Weekly: ~7 days
  if (avgDays >= 5 && avgDays <= 9) {
    return { frequency: "weekly", confidence: 1 - Math.abs(avgDays - 7) / 7 }
  }
  // Biweekly: ~14 days
  if (avgDays >= 12 && avgDays <= 16) {
    return { frequency: "biweekly", confidence: 1 - Math.abs(avgDays - 14) / 14 }
  }
  // Monthly: ~30 days
  if (avgDays >= 26 && avgDays <= 35) {
    return { frequency: "monthly", confidence: 1 - Math.abs(avgDays - 30) / 30 }
  }
  // Yearly: ~365 days
  if (avgDays >= 350 && avgDays <= 380) {
    return { frequency: "yearly", confidence: 1 - Math.abs(avgDays - 365) / 365 }
  }

  // Default to monthly with low confidence
  return { frequency: "monthly", confidence: 0.3 }
}

// GET /api/bills/detect - Detect potential bills from transaction patterns
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const minTransactions = parseInt(searchParams.get("min_transactions") || "3", 10)
    const monthsBack = parseInt(searchParams.get("months") || "6", 10)

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsBack)

    // Fetch transactions (expenses only)
    const { data: transactions, error } = await supabaseAdmin
      .from("transactions")
      .select(`
        id,
        description,
        amount,
        date,
        category_id,
        categories(name)
      `)
      .eq("user_id", session.user.id)
      .lt("amount", 0) // Expenses only
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: true })

    if (error) {
      console.error("Error fetching transactions:", error)
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      )
    }

    // Fetch existing bills to exclude
    const { data: existingBills } = await supabaseAdmin
      .from("bills")
      .select("name")
      .eq("user_id", session.user.id)

    const existingBillNames = new Set(
      (existingBills ?? []).map((b) => b.name.toLowerCase())
    )

    // Group transactions by merchant (description)
    const merchantGroups = new Map<
      string,
      Array<{ amount: number; date: string; category_id: string | null; category_name: string | null }>
    >()

    for (const t of transactions ?? []) {
      const description = t.description?.trim().toLowerCase() || "unknown"

      if (!merchantGroups.has(description)) {
        merchantGroups.set(description, [])
      }

      // Handle both array and object response from Supabase join
      const categories = t.categories as { name: string } | { name: string }[] | null
      const categoryName = Array.isArray(categories)
        ? categories[0]?.name ?? null
        : categories?.name ?? null

      merchantGroups.get(description)!.push({
        amount: Math.abs(parseFloat(t.amount)),
        date: t.date,
        category_id: t.category_id,
        category_name: categoryName,
      })
    }

    // Analyze each merchant group for recurring patterns
    const detectedBills: DetectedBill[] = []

    for (const [merchant, txns] of merchantGroups.entries()) {
      // Skip if not enough transactions
      if (txns.length < minTransactions) continue

      // Skip if already exists as a bill
      if (existingBillNames.has(merchant)) continue

      // Calculate average amount
      const amounts = txns.map((t) => t.amount)
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length

      // Check amount consistency (should be relatively similar)
      const amountVariance = amounts.reduce((acc, amt) => acc + Math.pow(amt - avgAmount, 2), 0) / amounts.length
      const amountStdDev = Math.sqrt(amountVariance)
      const amountConsistency = avgAmount > 0 ? 1 - amountStdDev / avgAmount : 0

      // Skip if amounts vary too much (more than 30% std dev)
      if (amountConsistency < 0.7) continue

      // Calculate days between transactions
      const dates = txns.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b)
      const daysBetween: number[] = []

      for (let i = 1; i < dates.length; i++) {
        const days = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24)
        daysBetween.push(days)
      }

      if (daysBetween.length === 0) continue

      const avgDaysBetween = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length

      // Check interval consistency
      const intervalVariance = daysBetween.reduce((acc, d) => acc + Math.pow(d - avgDaysBetween, 2), 0) / daysBetween.length
      const intervalStdDev = Math.sqrt(intervalVariance)
      const intervalConsistency = avgDaysBetween > 0 ? 1 - intervalStdDev / avgDaysBetween : 0

      // Skip if intervals vary too much
      if (intervalConsistency < 0.5) continue

      const { frequency, confidence: freqConfidence } = detectFrequency(avgDaysBetween)

      // Calculate overall confidence
      const confidence = Math.min(
        (amountConsistency * 0.3 + intervalConsistency * 0.4 + freqConfidence * 0.3) * 100,
        100
      )

      // Only include if confidence is reasonable
      if (confidence < 50) continue

      const lastTxn = txns[txns.length - 1]
      const billType = detectBillType(merchant, lastTxn.category_name)

      detectedBills.push({
        merchant_name: merchant.charAt(0).toUpperCase() + merchant.slice(1),
        suggested_amount: Math.round(avgAmount * 100) / 100,
        suggested_frequency: frequency,
        confidence: Math.round(confidence),
        transaction_count: txns.length,
        last_transaction_date: lastTxn.date,
        average_days_between: Math.round(avgDaysBetween),
        suggested_bill_type: billType,
        category_id: lastTxn.category_id,
        category_name: lastTxn.category_name,
      })
    }

    // Sort by confidence
    detectedBills.sort((a, b) => b.confidence - a.confidence)

    return NextResponse.json({
      detected_bills: detectedBills,
      analyzed_period: {
        start_date: startDate.toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
      },
      total_detected: detectedBills.length,
    })
  } catch (error) {
    console.error("Error in GET /api/bills/detect:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
