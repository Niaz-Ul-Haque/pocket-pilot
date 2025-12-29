import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { aiMemorySchema, type AIMemory } from "@/lib/validators/ai-features"

// GET - Retrieve AI memories
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const memoryType = searchParams.get("type")
  const key = searchParams.get("key")

  let query = supabaseAdmin
    .from("ai_memory")
    .select("*")
    .eq("user_id", session.user.id)
    .order("importance", { ascending: false })

  if (memoryType) {
    query = query.eq("memory_type", memoryType)
  }
  if (key) {
    query = query.eq("key", key)
  }

  // Filter out expired memories
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  const { data, error } = await query

  if (error) {
    console.error("[AI Memory] Error fetching memories:", error)
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 })
  }

  return NextResponse.json({ memories: data as AIMemory[] })
}

// POST - Create or update AI memory
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const validation = aiMemorySchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid data", details: validation.error.issues }, { status: 400 })
  }

  const { memory_type, key, value, importance, expires_at } = validation.data

  // Upsert memory (update if exists, insert if not)
  const { data, error } = await supabaseAdmin
    .from("ai_memory")
    .upsert(
      {
        user_id: session.user.id,
        memory_type,
        key,
        value,
        importance,
        expires_at,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,memory_type,key",
      }
    )
    .select()
    .single()

  if (error) {
    console.error("[AI Memory] Error saving memory:", error)
    return NextResponse.json({ error: "Failed to save memory" }, { status: 500 })
  }

  return NextResponse.json({ memory: data })
}

// DELETE - Remove AI memory
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const memoryType = searchParams.get("type")
  const key = searchParams.get("key")
  const id = searchParams.get("id")

  if (!id && (!memoryType || !key)) {
    return NextResponse.json({ error: "Either id or type+key is required" }, { status: 400 })
  }

  let query = supabaseAdmin.from("ai_memory").delete().eq("user_id", session.user.id)

  if (id) {
    query = query.eq("id", id)
  } else {
    query = query.eq("memory_type", memoryType!).eq("key", key!)
  }

  const { error } = await query

  if (error) {
    console.error("[AI Memory] Error deleting memory:", error)
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
