import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/chat/conversations/:id/messages - Get messages for a conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // First verify the conversation belongs to the user
  const { data: conversation } = await supabaseAdmin
    .from("chat_conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Failed to fetch messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/chat/conversations/:id/messages - Add message to conversation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // First verify the conversation belongs to the user
  const { data: conversation } = await supabaseAdmin
    .from("chat_conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { role, content } = body

    if (!role || !content) {
      return NextResponse.json({ error: "Role and content are required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        user_id: session.user.id,
        conversation_id: id,
        role,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to save message:", error)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    // Update conversation's updated_at
    await supabaseAdmin
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Invalid request body:", error)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
