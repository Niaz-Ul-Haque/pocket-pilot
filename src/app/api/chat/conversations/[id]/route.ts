import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/chat/conversations/:id - Get single conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    console.error("Failed to fetch conversation:", error)
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PUT /api/chat/conversations/:id - Update conversation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { title, is_pinned } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (title !== undefined) updateData.title = title
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned

    const { data, error } = await supabaseAdmin
      .from("chat_conversations")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Failed to update conversation:", error)
      return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Invalid request body:", error)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

// DELETE /api/chat/conversations/:id - Delete conversation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Messages will be deleted automatically via CASCADE
  const { error } = await supabaseAdmin
    .from("chat_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to delete conversation:", error)
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
