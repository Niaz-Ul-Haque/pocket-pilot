import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { predictionTrackingSchema } from "@/lib/validators/ai-features"

// GET - Retrieve prediction history and accuracy stats
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const predictionType = searchParams.get("type")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  // Get accuracy statistics
  if (action === "stats") {
    const { data: predictions } = await supabaseAdmin
      .from("prediction_tracking")
      .select("prediction_type, is_correct")
      .eq("user_id", session.user.id)
      .not("is_correct", "is", null)

    if (!predictions) {
      return NextResponse.json({
        stats: {},
        overall: { total: 0, correct: 0, accuracy: 0 },
      })
    }

    // Calculate accuracy by type
    const byType: Record<string, { total: number; correct: number }> = {}
    predictions.forEach((p) => {
      if (!byType[p.prediction_type]) {
        byType[p.prediction_type] = { total: 0, correct: 0 }
      }
      byType[p.prediction_type].total++
      if (p.is_correct) {
        byType[p.prediction_type].correct++
      }
    })

    const stats = Object.entries(byType).map(([type, data]) => ({
      type,
      total: data.total,
      correct: data.correct,
      accuracy: Math.round((data.correct / data.total) * 100),
    }))

    const overall = {
      total: predictions.length,
      correct: predictions.filter((p) => p.is_correct).length,
      accuracy: Math.round(
        (predictions.filter((p) => p.is_correct).length / predictions.length) * 100
      ),
    }

    return NextResponse.json({ stats, overall })
  }

  // Get recent predictions
  let query = supabaseAdmin
    .from("prediction_tracking")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (predictionType) {
    query = query.eq("prediction_type", predictionType)
  }

  const { data, error } = await query

  if (error) {
    console.error("[Prediction Tracking] Error:", error)
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 })
  }

  return NextResponse.json({ predictions: data })
}

// POST - Record a new prediction
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const validation = predictionTrackingSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid data", details: validation.error.issues }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("prediction_tracking")
    .insert({
      user_id: session.user.id,
      ...validation.data,
    })
    .select()
    .single()

  if (error) {
    console.error("[Prediction Tracking] Error:", error)
    return NextResponse.json({ error: "Failed to record prediction" }, { status: 500 })
  }

  return NextResponse.json({ prediction: data })
}

// PUT - Update prediction with actual value (resolve prediction)
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, actual_value, is_correct, correction_source } = body

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    resolved_at: new Date().toISOString(),
  }

  if (actual_value !== undefined) updates.actual_value = actual_value
  if (is_correct !== undefined) updates.is_correct = is_correct
  if (correction_source) updates.correction_source = correction_source

  const { data, error } = await supabaseAdmin
    .from("prediction_tracking")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    console.error("[Prediction Tracking] Error:", error)
    return NextResponse.json({ error: "Failed to update prediction" }, { status: 500 })
  }

  // If this was a category prediction, update merchant mappings for learning
  if (data.prediction_type === "category" && correction_source === "user") {
    const predictedCategory = (data.predicted_value as { category_id?: string })?.category_id
    const actualCategory = (actual_value as { category_id?: string })?.category_id
    const merchant = (data.context as { merchant?: string })?.merchant

    if (merchant && actualCategory && predictedCategory !== actualCategory) {
      // User corrected a category prediction - learn from this
      await supabaseAdmin.from("merchant_mappings").upsert(
        {
          user_id: session.user.id,
          raw_merchant: merchant.toUpperCase(),
          normalized_name: merchant,
          category_id: actualCategory,
          confidence: 1.0,
          is_user_defined: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,raw_merchant" }
      )
    }
  }

  return NextResponse.json({ prediction: data })
}
