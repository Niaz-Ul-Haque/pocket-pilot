import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { merchantMappingSchema, type MerchantMapping } from "@/lib/validators/ai-features"

// Common merchant patterns for normalization
const MERCHANT_PATTERNS: Array<{ pattern: RegExp; normalized: string; category?: string }> = [
  // Amazon variations
  { pattern: /\bAMZN\b|\bAMAZON\b|\bAMZ\b/i, normalized: "Amazon", category: "Shopping" },
  // Uber variations
  { pattern: /\bUBER[\s*]*(?:EATS|TRIP)?\b/i, normalized: "Uber", category: "Transportation" },
  { pattern: /\bUBER[\s*]*EATS\b/i, normalized: "Uber Eats", category: "Dining Out" },
  // Netflix
  { pattern: /\bNETFLIX\b/i, normalized: "Netflix", category: "Subscriptions" },
  // Spotify
  { pattern: /\bSPOTIFY\b/i, normalized: "Spotify", category: "Subscriptions" },
  // Apple
  { pattern: /\bAPPLE\.COM\b|\bAPPLE\s+(?:MUSIC|TV|ONE)\b/i, normalized: "Apple", category: "Subscriptions" },
  // Google
  { pattern: /\bGOOGLE[\s*]*(?:PLAY|ONE|STORAGE)?\b/i, normalized: "Google", category: "Subscriptions" },
  // Starbucks
  { pattern: /\bSTARBUCKS?\b|\bSBUX\b/i, normalized: "Starbucks", category: "Dining Out" },
  // McDonald's
  { pattern: /\bMCDONALD'?S?\b|\bMCD\b/i, normalized: "McDonald's", category: "Dining Out" },
  // Tim Hortons
  { pattern: /\bTIM\s+HORTON'?S?\b|\bTIMS?\b/i, normalized: "Tim Hortons", category: "Dining Out" },
  // Walmart
  { pattern: /\bWALMART\b|\bWAL[\s-]*MART\b/i, normalized: "Walmart", category: "Groceries" },
  // Costco
  { pattern: /\bCOSTCO\b/i, normalized: "Costco", category: "Groceries" },
  // Gas stations
  { pattern: /\bPETRO[\s-]*CAN(?:ADA)?\b/i, normalized: "Petro-Canada", category: "Transportation" },
  { pattern: /\bSHELL\b/i, normalized: "Shell", category: "Transportation" },
  { pattern: /\bESSO\b/i, normalized: "Esso", category: "Transportation" },
  // Skip The Dishes
  { pattern: /\bSKIP\s*(?:THE)?\s*DISHES?\b/i, normalized: "SkipTheDishes", category: "Dining Out" },
  // DoorDash
  { pattern: /\bDOORDASH\b/i, normalized: "DoorDash", category: "Dining Out" },
  // Disney+
  { pattern: /\bDISNEY[\s+]*(?:PLUS)?\b/i, normalized: "Disney+", category: "Subscriptions" },
  // HBO
  { pattern: /\bHBO\s*(?:MAX)?\b/i, normalized: "HBO Max", category: "Subscriptions" },
]

// GET - Retrieve merchant mappings
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)

  let query = supabaseAdmin
    .from("merchant_mappings")
    .select("*, categories(name)")
    .eq("user_id", session.user.id)
    .order("usage_count", { ascending: false })
    .limit(limit)

  if (search) {
    query = query.or(`raw_merchant.ilike.%${search}%,normalized_name.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("[Merchants] Error fetching mappings:", error)
    return NextResponse.json({ error: "Failed to fetch merchant mappings" }, { status: 500 })
  }

  return NextResponse.json({ mappings: data })
}

// POST - Create or update merchant mapping
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  // Normalize a raw merchant string
  if (action === "normalize") {
    const body = await request.json()
    const { raw_merchant } = body

    if (!raw_merchant) {
      return NextResponse.json({ error: "raw_merchant is required" }, { status: 400 })
    }

    // First check user's custom mappings
    const { data: existing } = await supabaseAdmin
      .from("merchant_mappings")
      .select("normalized_name, category_id, categories(name)")
      .eq("user_id", session.user.id)
      .eq("raw_merchant", raw_merchant.toUpperCase())
      .single()

    if (existing) {
      // Update usage count - get current count with raw SQL increment
      await supabaseAdmin
        .from("merchant_mappings")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", session.user.id)
        .eq("raw_merchant", raw_merchant.toUpperCase())

      return NextResponse.json({
        normalized_name: existing.normalized_name,
        category_id: existing.category_id,
        category_name: (existing.categories as unknown as { name: string } | null)?.name,
        source: "user",
      })
    }

    // Try pattern matching
    for (const { pattern, normalized, category } of MERCHANT_PATTERNS) {
      if (pattern.test(raw_merchant)) {
        // Get category ID if available
        let category_id: string | null = null
        if (category) {
          const { data: cat } = await supabaseAdmin
            .from("categories")
            .select("id")
            .eq("user_id", session.user.id)
            .ilike("name", category)
            .single()
          category_id = cat?.id || null
        }

        // Save mapping for future use
        await supabaseAdmin.from("merchant_mappings").upsert(
          {
            user_id: session.user.id,
            raw_merchant: raw_merchant.toUpperCase(),
            normalized_name: normalized,
            category_id,
            confidence: 0.9,
            is_user_defined: false,
          },
          { onConflict: "user_id,raw_merchant" }
        )

        return NextResponse.json({
          normalized_name: normalized,
          category_id,
          category_name: category,
          source: "pattern",
        })
      }
    }

    // No match found - return cleaned version
    const cleaned = raw_merchant
      .replace(/[\*#\d]+/g, " ") // Remove special chars and numbers
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
      .split(" ")
      .slice(0, 3) // Keep first 3 words
      .join(" ")

    return NextResponse.json({
      normalized_name: cleaned || raw_merchant,
      category_id: null,
      category_name: null,
      source: "cleaned",
    })
  }

  // Create/update mapping
  const body = await request.json()
  const validation = merchantMappingSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid data", details: validation.error.issues }, { status: 400 })
  }

  const { raw_merchant, normalized_name, category_id, confidence, is_user_defined } = validation.data

  const { data, error } = await supabaseAdmin
    .from("merchant_mappings")
    .upsert(
      {
        user_id: session.user.id,
        raw_merchant: raw_merchant.toUpperCase(),
        normalized_name,
        category_id,
        confidence,
        is_user_defined: is_user_defined ?? true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,raw_merchant" }
    )
    .select()
    .single()

  if (error) {
    console.error("[Merchants] Error saving mapping:", error)
    return NextResponse.json({ error: "Failed to save merchant mapping" }, { status: 500 })
  }

  return NextResponse.json({ mapping: data })
}

// DELETE - Remove merchant mapping
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const raw_merchant = searchParams.get("raw_merchant")

  if (!id && !raw_merchant) {
    return NextResponse.json({ error: "id or raw_merchant is required" }, { status: 400 })
  }

  let query = supabaseAdmin.from("merchant_mappings").delete().eq("user_id", session.user.id)

  if (id) {
    query = query.eq("id", id)
  } else {
    query = query.eq("raw_merchant", raw_merchant!.toUpperCase())
  }

  const { error } = await query

  if (error) {
    console.error("[Merchants] Error deleting mapping:", error)
    return NextResponse.json({ error: "Failed to delete merchant mapping" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PUT - Batch update merchant mappings (for learning)
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  // Learn from transaction corrections
  if (action === "learn") {
    const body = await request.json()
    const { transaction_id, corrected_category_id, corrected_merchant } = body

    if (!transaction_id) {
      return NextResponse.json({ error: "transaction_id is required" }, { status: 400 })
    }

    // Get the transaction
    const { data: transaction } = await supabaseAdmin
      .from("transactions")
      .select("description, category_id")
      .eq("id", transaction_id)
      .eq("user_id", session.user.id)
      .single()

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Update merchant mapping
    if (transaction.description) {
      await supabaseAdmin.from("merchant_mappings").upsert(
        {
          user_id: session.user.id,
          raw_merchant: transaction.description.toUpperCase(),
          normalized_name: corrected_merchant || transaction.description,
          category_id: corrected_category_id || transaction.category_id,
          confidence: 1.0,
          is_user_defined: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,raw_merchant" }
      )
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
