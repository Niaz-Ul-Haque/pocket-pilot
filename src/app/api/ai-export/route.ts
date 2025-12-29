import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { aiImportSchema, type AIExportData } from "@/lib/validators/ai-features"

// GET - Export AI data (memories, learning rules, merchant mappings, preferences)
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") || "json"
  const includeMemory = searchParams.get("memory") !== "false"
  const includeLearning = searchParams.get("learning") !== "false"
  const includeMerchants = searchParams.get("merchants") !== "false"

  // Fetch all AI-related data
  const promises = []

  if (includeMemory) {
    promises.push(
      supabaseAdmin
        .from("ai_memory")
        .select("memory_type, key, value, importance, expires_at")
        .eq("user_id", session.user.id)
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  if (includeLearning) {
    promises.push(
      supabaseAdmin
        .from("ai_learning_rules")
        .select("rule_type, pattern, action, priority, is_active")
        .eq("user_id", session.user.id)
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  if (includeMerchants) {
    promises.push(
      supabaseAdmin
        .from("merchant_mappings")
        .select("raw_merchant, normalized_name, category_id, confidence, is_user_defined")
        .eq("user_id", session.user.id)
        .eq("is_user_defined", true) // Only export user-defined mappings
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  // Get user preferences
  promises.push(
    supabaseAdmin
      .from("user_profiles")
      .select(
        "ai_voice_enabled, ai_auto_speak, ai_personality, ai_response_length, weekly_summary_enabled, weekly_summary_day, monthly_report_enabled, proactive_notifications_enabled, ai_language"
      )
      .eq("user_id", session.user.id)
      .single()
  )

  const [memoryRes, learningRes, merchantsRes, preferencesRes] = await Promise.all(promises)

  const exportData: AIExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    memory: (memoryRes.data || []) as AIExportData["memory"],
    learningRules: (learningRes.data || []) as AIExportData["learningRules"],
    merchantMappings: (merchantsRes.data || []) as AIExportData["merchantMappings"],
    preferences: (preferencesRes.data as Record<string, unknown>) || {},
  }

  if (format === "json") {
    return NextResponse.json(exportData)
  }

  // Return as downloadable file
  const filename = `pocket-pilot-ai-export-${new Date().toISOString().split("T")[0]}.json`
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

// POST - Import AI data
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const validation = aiImportSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid import data", details: validation.error.issues }, { status: 400 })
  }

  const importData = validation.data
  const results = {
    memory: { imported: 0, skipped: 0 },
    learningRules: { imported: 0, skipped: 0 },
    merchantMappings: { imported: 0, skipped: 0 },
    preferences: { imported: false },
  }

  // Import memories
  if (importData.memory && importData.memory.length > 0) {
    for (const mem of importData.memory) {
      const { error } = await supabaseAdmin.from("ai_memory").upsert(
        {
          user_id: session.user.id,
          memory_type: mem.memory_type,
          key: mem.key,
          value: mem.value,
          importance: mem.importance,
          expires_at: mem.expires_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,memory_type,key" }
      )
      if (error) {
        results.memory.skipped++
      } else {
        results.memory.imported++
      }
    }
  }

  // Import learning rules
  if (importData.learningRules && importData.learningRules.length > 0) {
    for (const rule of importData.learningRules) {
      // Check for duplicate pattern
      const { data: existing } = await supabaseAdmin
        .from("ai_learning_rules")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("rule_type", rule.rule_type)
        .eq("pattern", rule.pattern)
        .single()

      if (existing) {
        results.learningRules.skipped++
        continue
      }

      const { error } = await supabaseAdmin.from("ai_learning_rules").insert({
        user_id: session.user.id,
        rule_type: rule.rule_type,
        pattern: rule.pattern,
        action: rule.action,
        priority: rule.priority,
        is_active: rule.is_active ?? true,
      })

      if (error) {
        results.learningRules.skipped++
      } else {
        results.learningRules.imported++
      }
    }
  }

  // Import merchant mappings
  if (importData.merchantMappings && importData.merchantMappings.length > 0) {
    for (const mapping of importData.merchantMappings) {
      // Try to find matching category by name if category_id is provided
      let category_id = null
      if (mapping.category_id) {
        // Note: category_id from export might not match, but we keep it for reference
        category_id = mapping.category_id
      }

      const { error } = await supabaseAdmin.from("merchant_mappings").upsert(
        {
          user_id: session.user.id,
          raw_merchant: mapping.raw_merchant,
          normalized_name: mapping.normalized_name,
          category_id,
          confidence: mapping.confidence,
          is_user_defined: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,raw_merchant" }
      )

      if (error) {
        results.merchantMappings.skipped++
      } else {
        results.merchantMappings.imported++
      }
    }
  }

  // Import preferences
  if (importData.preferences && Object.keys(importData.preferences).length > 0) {
    const allowedPrefs = [
      "ai_voice_enabled",
      "ai_auto_speak",
      "ai_personality",
      "ai_response_length",
      "weekly_summary_enabled",
      "weekly_summary_day",
      "monthly_report_enabled",
      "proactive_notifications_enabled",
      "ai_language",
    ]

    const prefsToUpdate: Record<string, unknown> = {}
    for (const key of allowedPrefs) {
      if (key in importData.preferences) {
        prefsToUpdate[key] = importData.preferences[key]
      }
    }

    if (Object.keys(prefsToUpdate).length > 0) {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update(prefsToUpdate)
        .eq("user_id", session.user.id)

      results.preferences.imported = !error
    }
  }

  return NextResponse.json({
    success: true,
    results,
    summary: `Imported ${results.memory.imported} memories, ${results.learningRules.imported} rules, ${results.merchantMappings.imported} merchant mappings`,
  })
}
