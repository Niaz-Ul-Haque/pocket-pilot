import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { accountSchema } from "@/lib/validators/account"

// GET /api/accounts - List all accounts for the current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching accounts:", error)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input with Zod
    const validationResult = accountSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { name, type } = validationResult.data

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .insert({
        user_id: session.user.id,
        name,
        type,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating account:", error)
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
