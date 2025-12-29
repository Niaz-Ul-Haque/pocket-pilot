import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { goalUpdateSchema, calculateGoalDetails, type Goal } from "@/lib/validators/goal"
import { randomUUID } from "crypto"

type RouteContext = {
  params: Promise<{ id: string }>
}

// Helper function to parse goal data
function parseGoalData(data: Record<string, unknown>): Goal {
  return {
    ...data,
    target_amount: parseFloat(data.target_amount as string),
    current_amount: parseFloat(data.current_amount as string),
    auto_contribute_amount: data.auto_contribute_amount ? parseFloat(data.auto_contribute_amount as string) : null,
    category: (data.category as Goal["category"]) || "other",
    is_shared: (data.is_shared as boolean) || false,
    share_token: (data.share_token as string) || null,
    auto_contribute_day: (data.auto_contribute_day as number) || null,
  } as Goal
}

// GET /api/goals/[id] - Get a single goal
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    // Fetch goal with milestones
    const { data, error } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    // Fetch milestones for this goal
    const { data: milestones } = await supabaseAdmin
      .from("goal_milestones")
      .select("*")
      .eq("goal_id", id)
      .eq("user_id", session.user.id)
      .order("target_percentage", { ascending: true })

    const goalData = parseGoalData(data)
    const goalWithDetails = calculateGoalDetails(goalData)

    // Add milestones to the response
    if (milestones && milestones.length > 0) {
      goalWithDetails.milestones = milestones.map((m) => ({
        ...m,
        target_amount: parseFloat(m.target_amount || "0"),
      }))
    }

    return NextResponse.json(goalWithDetails)
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
    if (validation.data.category !== undefined) {
      updateData.category = validation.data.category
    }
    if (validation.data.auto_contribute_amount !== undefined) {
      updateData.auto_contribute_amount = validation.data.auto_contribute_amount
    }
    if (validation.data.auto_contribute_day !== undefined) {
      updateData.auto_contribute_day = validation.data.auto_contribute_day
    }

    // Handle sharing toggle
    if (validation.data.is_shared !== undefined) {
      updateData.is_shared = validation.data.is_shared
      // Generate share token if enabling sharing
      if (validation.data.is_shared && !existingGoal.share_token) {
        updateData.share_token = randomUUID()
      }
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

    const goalData = parseGoalData(data)

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

    // Delete milestones first
    await supabaseAdmin
      .from("goal_milestones")
      .delete()
      .eq("goal_id", id)
      .eq("user_id", session.user.id)

    // Delete contributions (cascade should handle this, but being explicit)
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
