import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateGoalDetails } from "@/lib/validators/goal"

type RouteContext = {
  params: Promise<{ id: string }>
}

// DELETE /api/goals/contributions/[id] - Delete a contribution
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    // First, get the contribution to know how much to subtract
    const { data: contribution, error: fetchError } = await supabaseAdmin
      .from("goal_contributions")
      .select("*, goals(*)")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError || !contribution) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      )
    }

    const contributionAmount = parseFloat(contribution.amount)
    const goal = contribution.goals as {
      id: string
      current_amount: string
      target_amount: string
      is_completed: boolean
    }

    // Delete the contribution
    const { error: deleteError } = await supabaseAdmin
      .from("goal_contributions")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id)

    if (deleteError) {
      console.error("Error deleting contribution:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete contribution" },
        { status: 500 }
      )
    }

    // Update the goal's current_amount
    const newCurrentAmount = Math.max(
      parseFloat(goal.current_amount) - contributionAmount,
      0
    )
    const targetAmount = parseFloat(goal.target_amount)
    const is_completed = newCurrentAmount >= targetAmount

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from("goals")
      .update({
        current_amount: newCurrentAmount,
        is_completed,
        completed_at: is_completed ? undefined : null,
      })
      .eq("id", goal.id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating goal amount:", updateError)
    }

    // Return updated goal
    return NextResponse.json({
      goal: updatedGoal
        ? calculateGoalDetails({
            ...updatedGoal,
            target_amount: parseFloat(updatedGoal.target_amount),
            current_amount: parseFloat(updatedGoal.current_amount),
          })
        : null,
    })
  } catch (error) {
    console.error("Error in DELETE /api/goals/contributions/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
