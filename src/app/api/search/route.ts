import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { unauthorized, internalError, handleApiError } from "@/lib/errors"

type SearchResult = {
  id: string
  type: "transaction" | "goal" | "bill" | "category" | "account" | "budget"
  title: string
  subtitle: string
}

// GET /api/search - Global search across all entities
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase().trim()

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const results: SearchResult[] = []

    // Search transactions
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("id, description, amount, date")
      .eq("user_id", session.user.id)
      .ilike("description", `%${query}%`)
      .limit(5)

    if (transactions) {
      results.push(
        ...transactions.map((t) => ({
          id: t.id,
          type: "transaction" as const,
          title: t.description || "No description",
          subtitle: `$${Math.abs(t.amount).toFixed(2)} on ${new Date(t.date).toLocaleDateString()}`,
        }))
      )
    }

    // Search goals
    const { data: goals } = await supabaseAdmin
      .from("goals")
      .select("id, name, target_amount, current_amount")
      .eq("user_id", session.user.id)
      .ilike("name", `%${query}%`)
      .limit(5)

    if (goals) {
      results.push(
        ...goals.map((g) => ({
          id: g.id,
          type: "goal" as const,
          title: g.name,
          subtitle: `$${g.current_amount.toFixed(2)} / $${g.target_amount.toFixed(2)}`,
        }))
      )
    }

    // Search bills
    const { data: bills } = await supabaseAdmin
      .from("bills")
      .select("id, name, amount, due_date")
      .eq("user_id", session.user.id)
      .ilike("name", `%${query}%`)
      .limit(5)

    if (bills) {
      results.push(
        ...bills.map((b) => ({
          id: b.id,
          type: "bill" as const,
          title: b.name,
          subtitle: b.amount ? `$${b.amount.toFixed(2)}` : "Variable amount",
        }))
      )
    }

    // Search categories
    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("id, name, type")
      .eq("user_id", session.user.id)
      .ilike("name", `%${query}%`)
      .limit(5)

    if (categories) {
      results.push(
        ...categories.map((c) => ({
          id: c.id,
          type: "category" as const,
          title: c.name,
          subtitle: `${c.type} category`,
        }))
      )
    }

    // Search accounts
    const { data: accounts } = await supabaseAdmin
      .from("accounts")
      .select("id, name, type")
      .eq("user_id", session.user.id)
      .ilike("name", `%${query}%`)
      .limit(5)

    if (accounts) {
      results.push(
        ...accounts.map((a) => ({
          id: a.id,
          type: "account" as const,
          title: a.name,
          subtitle: `${a.type} account`,
        }))
      )
    }

    // Search budgets by category name
    const { data: budgets } = await supabaseAdmin
      .from("budgets")
      .select("id, amount, categories(name)")
      .eq("user_id", session.user.id)
      .limit(10)

    if (budgets) {
      const matchingBudgets = budgets.filter((b) => {
        // Handle both single object and array responses from Supabase
        const categories = b.categories as unknown
        let categoryName = ""
        if (Array.isArray(categories) && categories.length > 0) {
          categoryName = (categories[0] as { name: string })?.name || ""
        } else if (categories && typeof categories === "object") {
          categoryName = (categories as { name: string })?.name || ""
        }
        return categoryName.toLowerCase().includes(query)
      })

      results.push(
        ...matchingBudgets.slice(0, 5).map((b) => {
          const categories = b.categories as unknown
          let categoryName = "Unknown"
          if (Array.isArray(categories) && categories.length > 0) {
            categoryName = (categories[0] as { name: string })?.name || "Unknown"
          } else if (categories && typeof categories === "object") {
            categoryName = (categories as { name: string })?.name || "Unknown"
          }
          return {
            id: b.id,
            type: "budget" as const,
            title: categoryName,
            subtitle: `Budget: $${b.amount.toFixed(2)}`,
          }
        })
      )
    }

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query
      const bExact = b.title.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      const aStarts = a.title.toLowerCase().startsWith(query)
      const bStarts = b.title.toLowerCase().startsWith(query)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    })

    return NextResponse.json(results.slice(0, 15))
  } catch (error) {
    return handleApiError(error, "GET /api/search")
  }
}
