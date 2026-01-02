import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { chatExportSchema } from "@/lib/validators/chat"
import { unauthorized, badRequest, notFound, internalError } from "@/lib/errors"
import { format } from "date-fns"

// POST /api/chat/export - Export conversation(s)
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const body = await req.json()
    const result = chatExportSchema.safeParse(body)

    if (!result.success) {
      return badRequest(result.error.issues[0]?.message || "Invalid input")
    }

    const { conversation_id, export_type } = result.data
    let messages: Array<{
      role: string
      content: string
      created_at: string
    }> = []
    let conversationTitle = "All Conversations"

    if (conversation_id) {
      // Export single conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("chat_conversations")
        .select("*")
        .eq("id", conversation_id)
        .eq("user_id", session.user.id)
        .single()

      if (convError || !conversation) {
        return notFound("Conversation not found")
      }

      conversationTitle = conversation.title

      const { data: msgs, error: msgError } = await supabaseAdmin
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversation_id)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })

      if (msgError) {
        console.error("Error fetching messages:", msgError)
        return internalError("Failed to fetch messages")
      }

      messages = msgs || []
    } else {
      // Export all conversations
      const { data: conversations, error: convsError } = await supabaseAdmin
        .from("chat_conversations")
        .select("id, title")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })

      if (convsError) {
        console.error("Error fetching conversations:", convsError)
        return internalError("Failed to fetch conversations")
      }

      for (const conv of conversations || []) {
        const { data: msgs } = await supabaseAdmin
          .from("chat_messages")
          .select("role, content, created_at")
          .eq("conversation_id", conv.id)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })

        if (msgs && msgs.length > 0) {
          messages.push({
            role: "system",
            content: `--- ${conv.title} ---`,
            created_at: msgs[0].created_at,
          })
          messages.push(...msgs)
        }
      }
    }

    if (messages.length === 0) {
      return badRequest("No messages to export")
    }

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm")
    let content: string
    let contentType: string
    let fileName: string

    switch (export_type) {
      case "json": {
        content = JSON.stringify({
          exported_at: new Date().toISOString(),
          title: conversationTitle,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
          })),
        }, null, 2)
        contentType = "application/json"
        fileName = `chat_export_${timestamp}.json`
        break
      }

      case "text": {
        const lines = [
          `Chat Export: ${conversationTitle}`,
          `Exported: ${format(new Date(), "PPpp")}`,
          "=".repeat(50),
          "",
        ]

        for (const msg of messages) {
          if (msg.role === "system" && msg.content.startsWith("---")) {
            lines.push("")
            lines.push(msg.content)
            lines.push("")
          } else {
            const roleLabel = msg.role === "user" ? "You" : "Pocket Pilot"
            const time = format(new Date(msg.created_at), "MMM d, h:mm a")
            lines.push(`[${time}] ${roleLabel}:`)
            lines.push(msg.content)
            lines.push("")
          }
        }

        content = lines.join("\n")
        contentType = "text/plain"
        fileName = `chat_export_${timestamp}.txt`
        break
      }

      case "pdf": {
        // For PDF, we'll generate a simple HTML that can be converted to PDF on client
        // Or return structured data for client-side PDF generation
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chat Export: ${conversationTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .meta { color: #666; margin-bottom: 20px; }
    .message { margin-bottom: 16px; padding: 12px; border-radius: 8px; }
    .user { background: #e3f2fd; margin-left: 40px; }
    .assistant { background: #f5f5f5; margin-right: 40px; }
    .system { text-align: center; font-weight: bold; color: #666; margin: 20px 0; }
    .role { font-weight: bold; margin-bottom: 4px; }
    .time { font-size: 12px; color: #888; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${conversationTitle}</h1>
  <p class="meta">Exported: ${format(new Date(), "PPpp")}</p>
  ${messages.map(msg => {
    if (msg.role === "system" && msg.content.startsWith("---")) {
      return `<div class="message system">${msg.content}</div>`
    }
    const roleLabel = msg.role === "user" ? "You" : "Pocket Pilot"
    const time = format(new Date(msg.created_at), "MMM d, h:mm a")
    return `
      <div class="message ${msg.role}">
        <div class="role">${roleLabel} <span class="time">${time}</span></div>
        <div class="content">${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>
    `
  }).join("")}
</body>
</html>`

        content = htmlContent
        contentType = "text/html"
        fileName = `chat_export_${timestamp}.html`
        break
      }

      default:
        return badRequest("Invalid export type")
    }

    // Record the export
    await supabaseAdmin
      .from("chat_exports")
      .insert({
        user_id: session.user.id,
        conversation_id: conversation_id || null,
        export_type,
        file_name: fileName,
        file_size: content.length,
      })

    // Return the file content
    return new Response(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Chat export POST error:", error)
    return internalError()
  }
}

// GET /api/chat/export - Get export history
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }

    const { data, error } = await supabaseAdmin
      .from("chat_exports")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching exports:", error)
      return internalError("Failed to fetch export history")
    }

    return Response.json(data || [])
  } catch (error) {
    console.error("Chat export GET error:", error)
    return internalError()
  }
}
