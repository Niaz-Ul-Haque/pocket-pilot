import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { milestoneSchema, milestoneUpdateSchema, type GoalMilestone } from "@/lib/validators/goal"

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/goals/[id]/milestones - List milestones for a goal
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: goalId } = await context.params

    // Verify goal belongs to user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from("goals")
      .select("id, target_amount, current_amount")
      .eq("id", goalId)
      .eq("user_id", session.user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from("goal_milestones")
      .select("*")
      .eq("goal_id", goalId)
      .eq("user_id", session.user.id)
      .order("target_percentage", { ascending: true })

    if (error) {
      console.error("Error fetching milestones:", error)
      return NextResponse.json(
        { error: "Failed to fetch milestones" },
        { status: 500 }
      )
    }

    // Calculate target amounts and check if reached
    const targetAmount = parseFloat(goal.target_amount)
    const currentAmount = parseFloat(goal.current_amount)

    const milestones = (data ?? []).map((m) => ({
      ...m,
      target_amount: (m.target_percentage / 100) * targetAmount,
      is_reached: currentAmount >= (m.target_percentage / 100) * targetAmount,
    }))

    return NextResponse.json(milestones)
  } catch (error) {
    console.error("Error in GET /api/goals/[id]/milestones:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/goals/[id]/milestones - Create a milestone
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: goalId } = await context.params
    const body = await request.json()

    // Verify goal belongs to user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from("goals")
      .select("id, target_amount, current_amount")
      .eq("id", goalId)
      .eq("user_id", session.user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const validation = milestoneSchema.safeParse({ ...body, goal_id: goalId })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, target_percentage } = validation.data
    const targetAmount = parseFloat(goal.target_amount)
    const currentAmount = parseFloat(goal.current_amount)
    const milestoneTargetAmount = (target_percentage / 100) * targetAmount
    const isReached = currentAmount >= milestoneTargetAmount

    const { data, error } = await supabaseAdmin
      .from("goal_milestones")
      .insert({
        user_id: session.user.id,
        goal_id: goalId,
        name,
        target_percentage,
        target_amount: milestoneTargetAmount,
        is_reached: isReached,
        reached_at: isReached ? new Date().toISOString().split("T")[0] : null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating milestone:", error)
      return NextResponse.json(
        { error: "Failed to create milestone" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/goals/[id]/milestones:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/goals/[id]/milestones - Delete a milestone (by milestone_id in query)
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: goalId } = await context.params
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get("milestone_id")

    if (!milestoneId) {
      return NextResponse.json(
        { error: "milestone_id is required" },
        { status: 400 }
      )
    }

    // Verify goal belongs to user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", session.user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from("goal_milestones")
      .delete()
      .eq("id", milestoneId)
      .eq("goal_id", goalId)
      .eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting milestone:", error)
      return NextResponse.json(
        { error: "Failed to delete milestone" },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error in DELETE /api/goals/[id]/milestones:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/goals/[id]/milestones - Update milestone celebration_shown status
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: goalId } = await context.params
    const body = await request.json()
    const milestoneId = body.milestone_id

    if (!milestoneId) {
      return NextResponse.json(
        { error: "milestone_id is required" },
        { status: 400 }
      )
    }

    const validation = milestoneUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    // Verify goal belongs to user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", session.user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name
    }
    if (validation.data.target_percentage !== undefined) {
      updateData.target_percentage = validation.data.target_percentage
    }
    if (validation.data.celebration_shown !== undefined) {
      updateData.celebration_shown = validation.data.celebration_shown
    }

    const { data, error } = await supabaseAdmin
      .from("goal_milestones")
      .update(updateData)
      .eq("id", milestoneId)
      .eq("goal_id", goalId)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating milestone:", error)
      return NextResponse.json(
        { error: "Failed to update milestone" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/goals/[id]/milestones:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
