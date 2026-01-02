import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { chatSettingsSchema } from "@/lib/validators/chat"
import { unauthorized, badRequest, internalError } from "@/lib/errors"

// GET /api/chat/settings - Get user's chat settings
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { data, error } = await supabaseAdmin
      .from("chat_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching chat settings:", error)
      return internalError("Failed to fetch chat settings")
    }

    // Return default settings if none exist
    if (!data) {
      return Response.json({
        response_speed: "balanced",
        language: "en",
        personality: "balanced",
        show_templates: true,
        auto_speak: false,
      })
    }

    return Response.json(data)
  } catch (error) {
    console.error("Chat settings GET error:", error)
    return internalError()
  }
}

// POST /api/chat/settings - Create chat settings
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const body = await req.json()
    const result = chatSettingsSchema.safeParse(body)

    if (!result.success) {
      return badRequest(result.error.issues[0]?.message || "Invalid input")
    }

    const { data, error } = await supabaseAdmin
      .from("chat_settings")
      .upsert({
        user_id: session.user.id,
        ...result.data,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating chat settings:", error)
      return internalError("Failed to create chat settings")
    }

    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error("Chat settings POST error:", error)
    return internalError()
  }
}

// PUT /api/chat/settings - Update chat settings
export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const body = await req.json()
    const result = chatSettingsSchema.partial().safeParse(body)

    if (!result.success) {
      return badRequest(result.error.issues[0]?.message || "Invalid input")
    }

    // Check if settings exist
    const { data: existing } = await supabaseAdmin
      .from("chat_settings")
      .select("id")
      .eq("user_id", session.user.id)
      .single()

    let data
    let error

    if (existing) {
      // Update existing
      const updateResult = await supabaseAdmin
        .from("chat_settings")
        .update(result.data)
        .eq("user_id", session.user.id)
        .select()
        .single()
      data = updateResult.data
      error = updateResult.error
    } else {
      // Create new with defaults
      const insertResult = await supabaseAdmin
        .from("chat_settings")
        .insert({
          user_id: session.user.id,
          response_speed: "balanced",
          language: "en",
          personality: "balanced",
          show_templates: true,
          auto_speak: false,
          ...result.data,
        })
        .select()
        .single()
      data = insertResult.data
      error = insertResult.error
    }

    if (error) {
      console.error("Error updating chat settings:", error)
      return internalError("Failed to update chat settings")
    }

    return Response.json(data)
  } catch (error) {
    console.error("Chat settings PUT error:", error)
    return internalError()
  }
}
