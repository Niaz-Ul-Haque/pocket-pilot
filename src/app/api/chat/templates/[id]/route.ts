import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { conversationTemplateSchema } from "@/lib/validators/chat"
import { unauthorized, badRequest, notFound, forbidden, internalError } from "@/lib/errors"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/chat/templates/[id] - Get a specific template
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from("conversation_templates")
      .select("*")
      .eq("id", id)
      .or(`is_system.eq.true,user_id.eq.${session.user.id}`)
      .single()

    if (error || !data) {
      return notFound("Template not found")
    }

    return Response.json(data)
  } catch (error) {
    console.error("Template GET error:", error)
    return internalError()
  }
}

// PUT /api/chat/templates/[id] - Update a custom template (not system templates)
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { id } = await params
    const body = await req.json()
    const result = conversationTemplateSchema.partial().safeParse(body)

    if (!result.success) {
      return badRequest(result.error.issues[0]?.message || "Invalid input")
    }

    // Check if template exists and belongs to user (not system)
    const { data: existing, error: findError } = await supabaseAdmin
      .from("conversation_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (findError || !existing) {
      return notFound("Template not found")
    }

    if (existing.is_system) {
      return forbidden("Cannot modify system templates")
    }

    if (existing.user_id !== session.user.id) {
      return forbidden("You can only modify your own templates")
    }

    const { data, error } = await supabaseAdmin
      .from("conversation_templates")
      .update(result.data)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating template:", error)
      return internalError("Failed to update template")
    }

    return Response.json(data)
  } catch (error) {
    console.error("Template PUT error:", error)
    return internalError()
  }
}

// DELETE /api/chat/templates/[id] - Delete a custom template
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { id } = await params

    // Check if template exists and belongs to user (not system)
    const { data: existing, error: findError } = await supabaseAdmin
      .from("conversation_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (findError || !existing) {
      return notFound("Template not found")
    }

    if (existing.is_system) {
      return forbidden("Cannot delete system templates")
    }

    if (existing.user_id !== session.user.id) {
      return forbidden("You can only delete your own templates")
    }

    const { error } = await supabaseAdmin
      .from("conversation_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting template:", error)
      return internalError("Failed to delete template")
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Template DELETE error:", error)
    return internalError()
  }
}

// POST /api/chat/templates/[id] - Track template usage
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { id } = await params

    // Increment usage count
    const { error } = await supabaseAdmin.rpc("increment_template_usage", {
      template_id: id,
    })

    // If RPC doesn't exist, do it manually
    if (error) {
      await supabaseAdmin
        .from("conversation_templates")
        .update({ usage_count: supabaseAdmin.rpc("increment", { row_id: id }) })
        .eq("id", id)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Template usage POST error:", error)
    return internalError()
  }
}
