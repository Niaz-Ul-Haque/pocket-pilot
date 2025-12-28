"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  PiggyBank,
} from "lucide-react"
import { GoalForm } from "@/components/forms/goal-form"
import { ContributionForm } from "@/components/forms/contribution-form"
import {
  type GoalWithDetails,
  type ContributionWithGoal,
  formatCurrency,
  formatDate,
  getGoalStatusColor,
} from "@/lib/validators/goal"
import { cn } from "@/lib/utils"
import {
  GoalTimelineChart,
  GoalContributionChart,
} from "@/components/charts"

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithDetails | null>(null)
  const [contributingToGoal, setContributingToGoal] =
    useState<GoalWithDetails | null>(null)
  const [deletingGoal, setDeletingGoal] = useState<GoalWithDetails | null>(null)

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals")
      if (!response.ok) throw new Error("Failed to fetch goals")
      const data = await response.json()
      setGoals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleOpenGoalDialog = (goal?: GoalWithDetails) => {
    setEditingGoal(goal ?? null)
    setGoalDialogOpen(true)
  }

  const handleCloseGoalDialog = () => {
    setGoalDialogOpen(false)
    setEditingGoal(null)
  }

  const handleGoalSuccess = (savedGoal: GoalWithDetails) => {
    if (editingGoal) {
      setGoals((prev) =>
        prev.map((g) => (g.id === savedGoal.id ? savedGoal : g))
      )
    } else {
      setGoals((prev) => [savedGoal, ...prev])
    }
    handleCloseGoalDialog()
  }

  const handleOpenContributionDialog = (goal: GoalWithDetails) => {
    setContributingToGoal(goal)
    setContributionDialogOpen(true)
  }

  const handleCloseContributionDialog = () => {
    setContributionDialogOpen(false)
    setContributingToGoal(null)
  }

  const handleContributionSuccess = (
    _contribution: ContributionWithGoal,
    updatedGoal: GoalWithDetails
  ) => {
    // Update the goal in the list
    setGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
    )
    handleCloseContributionDialog()
  }

  const handleDelete = async () => {
    if (!deletingGoal) return

    try {
      const response = await fetch(`/api/goals/${deletingGoal.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete goal")
      }

      setGoals((prev) => prev.filter((g) => g.id !== deletingGoal.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal")
    } finally {
      setDeletingGoal(null)
    }
  }

  // Separate active and completed goals
  const activeGoals = goals.filter((g) => !g.is_completed)
  const completedGoals = goals.filter((g) => g.is_completed)

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mx-auto mt-4 block"
              onClick={() => {
                setError(null)
                setIsLoading(true)
                fetchGoals()
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Savings Goals</h1>
          <p className="text-muted-foreground">
            Track your progress toward financial milestones
          </p>
        </div>
        <Button onClick={() => handleOpenGoalDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No goals created yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a savings goal to start tracking your progress.
              </p>
              <Button className="mt-4" onClick={() => handleOpenGoalDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Goal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">Active Goals</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => handleOpenGoalDialog(goal)}
                    onContribute={() => handleOpenContributionDialog(goal)}
                    onDelete={() => setDeletingGoal(goal)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-muted-foreground">
                Completed Goals
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => handleOpenGoalDialog(goal)}
                    onContribute={() => handleOpenContributionDialog(goal)}
                    onDelete={() => setDeletingGoal(goal)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Goal Analytics */}
      {goals.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-semibold">Goal Analytics</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <GoalTimelineChart />
            <GoalContributionChart months={6} />
          </div>
        </div>
      )}

      {/* Create/Edit Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? "Edit Goal" : "Create Goal"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update your savings goal details."
                : "Set a new savings goal to track your progress."}
            </DialogDescription>
          </DialogHeader>
          <GoalForm
            goal={editingGoal ?? undefined}
            onSuccess={handleGoalSuccess}
            onCancel={handleCloseGoalDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Add Contribution Dialog */}
      <Dialog
        open={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Record a contribution toward your savings goal.
            </DialogDescription>
          </DialogHeader>
          {contributingToGoal && (
            <ContributionForm
              goal={contributingToGoal}
              onSuccess={handleContributionSuccess}
              onCancel={handleCloseContributionDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingGoal}
        onOpenChange={(open) => !open && setDeletingGoal(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingGoal?.name}&quot;?
              This will also delete all contributions. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Goal Card Component
interface GoalCardProps {
  goal: GoalWithDetails
  onEdit: () => void
  onContribute: () => void
  onDelete: () => void
}

function GoalCard({ goal, onEdit, onContribute, onDelete }: GoalCardProps) {
  const statusColor = getGoalStatusColor(goal)

  return (
    <Card className={cn(goal.is_completed && "opacity-75")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{goal.name}</CardTitle>
              {goal.is_completed && (
                <Badge
                  variant="outline"
                  className="border-green-500 text-green-600"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Complete
                </Badge>
              )}
              {goal.is_overdue && !goal.is_completed && (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>
            <CardDescription>
              Target: {formatCurrency(goal.target_amount)}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1">
            <Progress
              value={goal.percentage}
              className={cn(
                "h-2",
                goal.is_completed && "[&>div]:bg-green-500",
                goal.is_overdue && !goal.is_completed && "[&>div]:bg-destructive"
              )}
            />
          </div>

          {/* Progress text */}
          <div className="flex items-center justify-between text-sm">
            <span className={cn("font-medium", statusColor)}>
              {formatCurrency(goal.current_amount)} saved
            </span>
            <span className="text-muted-foreground">
              {goal.percentage.toFixed(0)}%
            </span>
          </div>

          {/* Remaining and target date */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {!goal.is_completed && goal.remaining > 0 && (
              <div className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                <span>{formatCurrency(goal.remaining)} to go</span>
              </div>
            )}
            {goal.target_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(goal.target_date)}</span>
              </div>
            )}
            {goal.monthly_required && !goal.is_completed && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{formatCurrency(goal.monthly_required)}/mo needed</span>
              </div>
            )}
          </div>

          {/* Add contribution button */}
          {!goal.is_completed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={onContribute}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contribution
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
