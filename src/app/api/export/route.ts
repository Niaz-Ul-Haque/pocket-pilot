import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "csv"
    const type = searchParams.get("type") || "transactions"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (type !== "transactions") {
      return NextResponse.json(
        { error: "Only transaction export is currently supported" },
        { status: 400 }
      )
    }

    // Build query
    let query = supabaseAdmin
      .from("transactions")
      .select(`
        id,
        date,
        amount,
        description,
        is_transfer,
        created_at,
        accounts:account_id (name),
        categories:category_id (name, type)
      `)
      .eq("user_id", session.user.id)
      .order("date", { ascending: false })

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("date", startDate)
    }
    if (endDate) {
      query = query.lte("date", endDate)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error("Export error:", error)
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ error: "No transactions to export" }, { status: 404 })
    }

    // Transform data
    const exportData = transactions.map((t) => {
      // Handle Supabase joined data (can be object or array)
      const accountData = t.accounts as unknown
      const categoryData = t.categories as unknown

      const account = Array.isArray(accountData)
        ? (accountData[0] as { name: string } | undefined)
        : (accountData as { name: string } | null)
      const category = Array.isArray(categoryData)
        ? (categoryData[0] as { name: string; type: string } | undefined)
        : (categoryData as { name: string; type: string } | null)

      const transactionType = t.amount < 0 ? "expense" : "income"

      return {
        date: t.date,
        description: t.description || "",
        amount: Math.abs(t.amount),
        type: transactionType,
        category: category?.name || "Uncategorized",
        account: account?.name || "Unknown",
        is_transfer: t.is_transfer ? "Yes" : "No",
      }
    })

    if (format === "json") {
      // JSON export
      const jsonExport = {
        exported_at: new Date().toISOString(),
        currency: "CAD",
        total_transactions: exportData.length,
        transactions: exportData,
      }

      return new NextResponse(JSON.stringify(jsonExport, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="pocket-pilot-transactions-${new Date().toISOString().split("T")[0]}.json"`,
        },
      })
    } else {
      // CSV export
      const headers = ["Date", "Description", "Amount", "Type", "Category", "Account", "Is Transfer"]
      const csvRows = [headers.join(",")]

      for (const row of exportData) {
        const values = [
          row.date,
          `"${(row.description || "").replace(/"/g, '""')}"`, // Escape quotes in description
          row.amount.toFixed(2),
          row.type,
          `"${row.category}"`,
          `"${row.account}"`,
          row.is_transfer,
        ]
        csvRows.push(values.join(","))
      }

      const csvContent = csvRows.join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="pocket-pilot-transactions-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
