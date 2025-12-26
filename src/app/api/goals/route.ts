import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { goalSchema, calculateGoalDetails } from "@/lib/validators/goal"

// GET /api/goals - List all goals for the current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      .order("is_completed", { ascending: true })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching goals:", error)
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 }
      )
    }

    // Calculate details for each goal
    const goalsWithDetails = (data ?? []).map((goal) => {
      // Convert numeric strings to numbers
      const goalData = {
        ...goal,
        target_amount: parseFloat(goal.target_amount),
        current_amount: parseFloat(goal.current_amount),
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

    const { name, target_amount, current_amount, target_date } = validation.data

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
    const goalData = {
      ...data,
      target_amount: parseFloat(data.target_amount),
      current_amount: parseFloat(data.current_amount),
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
