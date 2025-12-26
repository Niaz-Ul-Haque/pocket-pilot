import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { contributionSchema, calculateGoalDetails } from "@/lib/validators/goal"

// GET /api/goals/contributions - List all contributions for the current user
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get("goal_id")

    let query = supabaseAdmin
      .from("goal_contributions")
      .select(`
        *,
        goals!inner(name)
      `)
      .eq("user_id", session.user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })

    if (goalId) {
      query = query.eq("goal_id", goalId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching contributions:", error)
      return NextResponse.json(
        { error: "Failed to fetch contributions" },
        { status: 500 }
      )
    }

    // Transform to include goal_name
    const contributions = (data ?? []).map((c) => ({
      id: c.id,
      user_id: c.user_id,
      goal_id: c.goal_id,
      amount: parseFloat(c.amount),
      date: c.date,
      note: c.note,
      created_at: c.created_at,
      goal_name: (c.goals as { name: string }).name,
    }))

    return NextResponse.json(contributions)
  } catch (error) {
    console.error("Error in GET /api/goals/contributions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/goals/contributions - Add a contribution to a goal
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = contributionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { goal_id, amount, date, note } = validation.data

    // Verify the goal exists and belongs to the user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("id", goal_id)
      .eq("user_id", session.user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    // Create the contribution
    const { data: contribution, error: contributionError } = await supabaseAdmin
      .from("goal_contributions")
      .insert({
        user_id: session.user.id,
        goal_id,
        amount,
        date,
        note: note || null,
      })
      .select()
      .single()

    if (contributionError) {
      console.error("Error creating contribution:", contributionError)
      return NextResponse.json(
        { error: "Failed to create contribution" },
        { status: 500 }
      )
    }

    // Update the goal's current_amount
    const newCurrentAmount = parseFloat(goal.current_amount) + amount
    const targetAmount = parseFloat(goal.target_amount)
    const is_completed = newCurrentAmount >= targetAmount

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from("goals")
      .update({
        current_amount: newCurrentAmount,
        is_completed,
        completed_at: is_completed && !goal.is_completed 
          ? new Date().toISOString().split("T")[0] 
          : goal.completed_at,
      })
      .eq("id", goal_id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating goal amount:", updateError)
      // Contribution was still created, so we don't return an error
    }

    // Return both the contribution and updated goal
    return NextResponse.json({
      contribution: {
        ...contribution,
        amount: parseFloat(contribution.amount),
        goal_name: goal.name,
      },
      goal: updatedGoal ? calculateGoalDetails({
        ...updatedGoal,
        target_amount: parseFloat(updatedGoal.target_amount),
        current_amount: parseFloat(updatedGoal.current_amount),
      }) : null,
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/goals/contributions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
