import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  onboardingSchema,
  profileUpdateSchema,
  DEFAULT_CATEGORIES_BY_FRAMEWORK,
  type BudgetingFramework,
} from "@/lib/validators/user-profile"

/**
 * GET /api/profile
 * Get the current user's profile
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (profile doesn't exist yet)
    console.error("Failed to fetch profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }

  // Return profile with session user info
  return NextResponse.json({
    profile: profile || null,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
  })
}

/**
 * POST /api/profile
 * Complete onboarding - creates profile, default categories, and optionally an account
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const validationResult = onboardingSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { budgeting_framework, display_name, create_default_account, default_account_name, default_account_type } =
    validationResult.data

  // Check if profile already exists
  const { data: existingProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("user_id", session.user.id)
    .single()

  if (existingProfile) {
    return NextResponse.json({ error: "Profile already exists" }, { status: 409 })
  }

  // Start creating resources
  try {
    // 1. Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: session.user.id,
        has_completed_onboarding: true,
        budgeting_framework,
        display_name,
      })
      .select()
      .single()

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    // 2. Create default categories based on framework
    const defaultCategories = DEFAULT_CATEGORIES_BY_FRAMEWORK[budgeting_framework as BudgetingFramework]
    const categoryInserts = defaultCategories.map((cat) => ({
      user_id: session.user.id,
      name: cat.name,
      type: cat.type,
      is_tax_related: false,
      is_archived: false,
    }))

    const { error: categoriesError } = await supabaseAdmin
      .from("categories")
      .insert(categoryInserts)

    if (categoriesError) {
      console.error("Failed to create categories:", categoriesError)
      // Don't fail onboarding if categories fail - user can create them manually
    }

    // 3. Create default account if requested
    let account = null
    if (create_default_account) {
      const { data: accountData, error: accountError } = await supabaseAdmin
        .from("accounts")
        .insert({
          user_id: session.user.id,
          name: default_account_name || "Main Account",
          type: default_account_type || "Checking",
        })
        .select()
        .single()

      if (accountError) {
        console.error("Failed to create account:", accountError)
      } else {
        account = accountData
      }
    }

    return NextResponse.json({ profile, account }, { status: 201 })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding failed" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/profile
 * Update user profile settings
 */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const validationResult = profileUpdateSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const updates = validationResult.data

  const { data: profile, error } = await supabaseAdmin
    .from("user_profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }

  return NextResponse.json(profile)
}
