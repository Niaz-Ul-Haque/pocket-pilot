import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { DEFAULT_CATEGORIES } from "@/lib/validators/category"

/**
 * POST /api/categories/seed
 * Seeds default categories for a user if they don't have any.
 * Idempotent: safe to call multiple times.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // Check if user already has categories
  const { count, error: countError } = await supabaseAdmin
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (countError) {
    console.error("Failed to check categories:", countError)
    return NextResponse.json(
      { error: "Failed to check existing categories" },
      { status: 500 }
    )
  }

  // If user already has categories, skip seeding
  if (count && count > 0) {
    return NextResponse.json({
      seeded: false,
      message: "Categories already exist",
      count,
    })
  }

  // Insert default categories
  const categoriesToInsert = DEFAULT_CATEGORIES.map((category) => ({
    user_id: userId,
    name: category.name,
    type: category.type,
    is_tax_related: category.is_tax_related,
    tax_tag: category.tax_tag,
    is_archived: false,
  }))

  const { data, error: insertError } = await supabaseAdmin
    .from("categories")
    .insert(categoriesToInsert)
    .select()

  if (insertError) {
    console.error("Failed to seed categories:", insertError)
    return NextResponse.json(
      { error: "Failed to seed categories" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    seeded: true,
    message: "Default categories created",
    count: data.length,
  })
}
