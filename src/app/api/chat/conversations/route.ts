import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/chat/conversations - List all conversations
export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch conversations:", error)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/chat/conversations - Create new conversation
export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title = "New Conversation" } = body

    const { data, error } = await supabaseAdmin
      .from("chat_conversations")
      .insert({
        user_id: session.user.id,
        title,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to create conversation:", error)
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Invalid request body:", error)
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
