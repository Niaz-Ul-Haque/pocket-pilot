import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { messageReactionSchema } from "@/lib/validators/chat"
import { unauthorized, badRequest, internalError } from "@/lib/errors"

// GET /api/chat/reactions - Get user's reactions (for analytics)
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get("message_id")

    let query = supabaseAdmin
      .from("message_reactions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (messageId) {
      query = query.eq("message_id", messageId)
    }

    const { data, error } = await query.limit(100)

    if (error) {
      console.error("Error fetching reactions:", error)
      return internalError("Failed to fetch reactions")
    }

    return Response.json(data || [])
  } catch (error) {
    console.error("Reactions GET error:", error)
    return internalError()
  }
}

// POST /api/chat/reactions - Add or update a reaction
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const body = await req.json()
    const result = messageReactionSchema.safeParse(body)

    if (!result.success) {
      return badRequest(result.error.issues[0]?.message || "Invalid input")
    }

    // Verify the message belongs to the user
    const { data: message, error: messageError } = await supabaseAdmin
      .from("chat_messages")
      .select("id, user_id")
      .eq("id", result.data.message_id)
      .single()

    if (messageError || !message) {
      return badRequest("Message not found")
    }

    if (message.user_id !== session.user.id) {
      return badRequest("You can only react to messages in your conversations")
    }

    // Upsert the reaction (one reaction per message)
    const { data, error } = await supabaseAdmin
      .from("message_reactions")
      .upsert({
        user_id: session.user.id,
        message_id: result.data.message_id,
        reaction_type: result.data.reaction_type,
        feedback_text: result.data.feedback_text || null,
      }, {
        onConflict: "message_id",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating reaction:", error)
      return internalError("Failed to create reaction")
    }

    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error("Reactions POST error:", error)
    return internalError()
  }
}

// DELETE /api/chat/reactions - Remove a reaction
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get("message_id")

    if (!messageId) {
      return badRequest("message_id is required")
    }

    const { error } = await supabaseAdmin
      .from("message_reactions")
      .delete()
      .eq("user_id", session.user.id)
      .eq("message_id", messageId)

    if (error) {
      console.error("Error deleting reaction:", error)
      return internalError("Failed to delete reaction")
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Reactions DELETE error:", error)
    return internalError()
  }
}
