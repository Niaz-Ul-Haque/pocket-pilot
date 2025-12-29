import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { type PublicGoalView, type GoalCategory } from "@/lib/validators/goal"

type RouteContext = {
  params: Promise<{ token: string }>
}

// GET /api/goals/share/[token] - Get a shared goal (public endpoint)
export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params

    if (!token) {
      return NextResponse.json({ error: "Invalid share token" }, { status: 400 })
    }

    // Fetch the goal by share token
    const { data: goal, error: goalError } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("share_token", token)
      .eq("is_shared", true)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found or not shared" }, { status: 404 })
    }

    // Fetch milestones for this goal
    const { data: milestones } = await supabaseAdmin
      .from("goal_milestones")
      .select("name, target_percentage, is_reached")
      .eq("goal_id", goal.id)
      .order("target_percentage", { ascending: true })

    const targetAmount = parseFloat(goal.target_amount)
    const currentAmount = parseFloat(goal.current_amount)
    const percentage = Math.min((currentAmount / targetAmount) * 100, 100)
    const remaining = Math.max(targetAmount - currentAmount, 0)

    // Return public view only (no user_id, no sensitive data)
    const publicGoal: PublicGoalView = {
      name: goal.name,
      target_amount: targetAmount,
      current_amount: currentAmount,
      target_date: goal.target_date,
      category: (goal.category as GoalCategory) || "other",
      percentage,
      remaining,
      is_completed: goal.is_completed,
      milestones: (milestones ?? []).map((m) => ({
        name: m.name,
        target_percentage: m.target_percentage,
        is_reached: m.is_reached,
      })),
    }

    return NextResponse.json(publicGoal)
  } catch (error) {
    console.error("Error in GET /api/goals/share/[token]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
