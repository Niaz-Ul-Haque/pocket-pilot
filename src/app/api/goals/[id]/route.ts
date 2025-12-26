import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { goalUpdateSchema, calculateGoalDetails } from "@/lib/validators/goal"

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/goals/[id] - Get a single goal
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const { data, error } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const goalData = {
      ...data,
      target_amount: parseFloat(data.target_amount),
      current_amount: parseFloat(data.current_amount),
    }

    return NextResponse.json(calculateGoalDetails(goalData))
  } catch (error) {
    console.error("Error in GET /api/goals/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/goals/[id] - Update a goal
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const validation = goalUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    // First, get the current goal to check completion status
    const { data: existingGoal, error: fetchError } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError || !existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name
    }
    if (validation.data.target_amount !== undefined) {
      updateData.target_amount = validation.data.target_amount
    }
    if (validation.data.target_date !== undefined) {
      updateData.target_date = validation.data.target_date || null
    }

    // Check if goal should be marked as completed
    const newTargetAmount = (updateData.target_amount as number | undefined) ?? parseFloat(existingGoal.target_amount)
    const currentAmount = parseFloat(existingGoal.current_amount)
    
    if (currentAmount >= newTargetAmount && !existingGoal.is_completed) {
      updateData.is_completed = true
      updateData.completed_at = new Date().toISOString().split("T")[0]
    } else if (currentAmount < newTargetAmount && existingGoal.is_completed) {
      updateData.is_completed = false
      updateData.completed_at = null
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating goal:", error)
      return NextResponse.json(
        { error: "Failed to update goal" },
        { status: 500 }
      )
    }

    const goalData = {
      ...data,
      target_amount: parseFloat(data.target_amount),
      current_amount: parseFloat(data.current_amount),
    }

    return NextResponse.json(calculateGoalDetails(goalData))
  } catch (error) {
    console.error("Error in PUT /api/goals/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/goals/[id] - Delete a goal
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    // First check if the goal exists and belongs to the user
    const { data: existingGoal, error: fetchError } = await supabaseAdmin
      .from("goals")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError || !existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    // Delete contributions first (cascade should handle this, but being explicit)
    await supabaseAdmin
      .from("goal_contributions")
      .delete()
      .eq("goal_id", id)
      .eq("user_id", session.user.id)

    // Delete the goal
    const { error } = await supabaseAdmin
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting goal:", error)
      return NextResponse.json(
        { error: "Failed to delete goal" },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error in DELETE /api/goals/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
