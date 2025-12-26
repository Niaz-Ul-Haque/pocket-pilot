import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { accountUpdateSchema } from "@/lib/validators/account"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounts/[id] - Get a single account
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
      console.error("Error fetching account:", error)
      return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/accounts/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/accounts/[id] - Update an account
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Validate input with Zod (partial schema for updates)
    const validationResult = accountUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .update(validationResult.data)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
      console.error("Error updating account:", error)
      return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/accounts/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/accounts/[id] - Delete an account
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting account:", error)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error in DELETE /api/accounts/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
