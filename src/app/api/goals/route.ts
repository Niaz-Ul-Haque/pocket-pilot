import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { goalSchema, calculateGoalDetails, type Goal } from "@/lib/validators/goal"

// GET /api/goals - List all goals for the current user
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const includeCompleted = searchParams.get("include_completed") !== "false"

    let query = supabaseAdmin
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      .order("is_completed", { ascending: true })
      .order("created_at", { ascending: false })

    if (category) {
      query = query.eq("category", category)
    }

    if (!includeCompleted) {
      query = query.eq("is_completed", false)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching goals:", error)
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 }
      )
    }

    // Calculate details for each goal
    const goalsWithDetails = (data ?? []).map((goal) => {
      // Convert numeric strings to numbers and handle new fields
      const goalData: Goal = {
        ...goal,
        target_amount: parseFloat(goal.target_amount),
        current_amount: parseFloat(goal.current_amount),
        auto_contribute_amount: goal.auto_contribute_amount ? parseFloat(goal.auto_contribute_amount) : null,
        category: goal.category || "other",
        is_shared: goal.is_shared || false,
        share_token: goal.share_token || null,
        auto_contribute_day: goal.auto_contribute_day || null,
      }
      return calculateGoalDetails(goalData)
    })

    return NextResponse.json(goalsWithDetails)
  } catch (error) {
    console.error("Error in GET /api/goals:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = goalSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      name,
      target_amount,
      current_amount,
      target_date,
      category,
      auto_contribute_amount,
      auto_contribute_day,
    } = validation.data

    // Check if goal is already completed (initial amount >= target)
    const is_completed = (current_amount ?? 0) >= target_amount

    const { data, error } = await supabaseAdmin
      .from("goals")
      .insert({
        user_id: session.user.id,
        name,
        target_amount,
        current_amount: current_amount ?? 0,
        target_date: target_date || null,
        category: category || "other",
        auto_contribute_amount: auto_contribute_amount || null,
        auto_contribute_day: auto_contribute_day || null,
        is_completed,
        completed_at: is_completed ? new Date().toISOString().split("T")[0] : null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating goal:", error)
      return NextResponse.json(
        { error: "Failed to create goal" },
        { status: 500 }
      )
    }

    // Return with calculated details
    const goalData: Goal = {
      ...data,
      target_amount: parseFloat(data.target_amount),
      current_amount: parseFloat(data.current_amount),
      auto_contribute_amount: data.auto_contribute_amount ? parseFloat(data.auto_contribute_amount) : null,
      category: data.category || "other",
      is_shared: data.is_shared || false,
      share_token: data.share_token || null,
      auto_contribute_day: data.auto_contribute_day || null,
    }

    return NextResponse.json(calculateGoalDetails(goalData), { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/goals:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
