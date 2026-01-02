import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { conversationTemplateSchema } from "@/lib/validators/chat"
import { unauthorized, badRequest, internalError } from "@/lib/errors"

// GET /api/chat/templates - Get all templates (system + user's custom)
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")

    let query = supabaseAdmin
      .from("conversation_templates")
      .select("*")
      .or(`is_system.eq.true,user_id.eq.${session.user.id}`)
      .order("is_system", { ascending: false })
      .order("usage_count", { ascending: false })

    if (category) {
      query = query.eq("category", category)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching templates:", error)
      return internalError("Failed to fetch templates")
    }

    return Response.json(data || [])
  } catch (error) {
    console.error("Templates GET error:", error)
    return internalError()
  }
}

// POST /api/chat/templates - Create a custom template
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const body = await req.json()
    const result = conversationTemplateSchema.safeParse(body)

    if (!result.success) {
      return badRequest(result.error.issues[0]?.message || "Invalid input")
    }

    const { data, error } = await supabaseAdmin
      .from("conversation_templates")
      .insert({
        user_id: session.user.id,
        ...result.data,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating template:", error)
      return internalError("Failed to create template")
    }

    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error("Templates POST error:", error)
    return internalError()
  }
}
