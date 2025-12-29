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
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
  Share2,
  Copy,
  Check,
  Flag,
  CalendarClock,
  Shield,
  Plane,
  GraduationCap,
  Sunset,
  Home,
  Car,
  Heart,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import { GoalForm } from "@/components/forms/goal-form"
import { ContributionForm } from "@/components/forms/contribution-form"
import {
  type GoalWithDetails,
  type ContributionWithGoal,
  type GoalCategory,
  type GoalMilestone,
  formatCurrency,
  formatDate,
  getGoalStatusColor,
  getGoalCategoryColor,
  GOAL_CATEGORY_LABELS,
} from "@/lib/validators/goal"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"

// Category icon mapping
const CATEGORY_ICONS: Record<GoalCategory, React.ReactNode> = {
  emergency: <Shield className="h-4 w-4" />,
  vacation: <Plane className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  retirement: <Sunset className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  wedding: <Heart className="h-4 w-4" />,
  debt_payoff: <TrendingDown className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  other: <Target className="h-4 w-4" />,
}
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithDetails | null>(null)
  const [contributingToGoal, setContributingToGoal] =
    useState<GoalWithDetails | null>(null)
  const [deletingGoal, setDeletingGoal] = useState<GoalWithDetails | null>(null)
  const [sharingGoal, setSharingGoal] = useState<GoalWithDetails | null>(null)
  const [shareUrl, setShareUrl] = useState<string>("")
  const [copiedUrl, setCopiedUrl] = useState(false)

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

  const handleOpenShareDialog = (goal: GoalWithDetails) => {
    setSharingGoal(goal)
    if (goal.share_token) {
      setShareUrl(`${window.location.origin}/goals/share/${goal.share_token}`)
    }
    setShareDialogOpen(true)
  }

  const handleToggleSharing = async () => {
    if (!sharingGoal) return

    try {
      const newSharedState = !sharingGoal.is_shared
      const response = await fetch(`/api/goals/${sharingGoal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_shared: newSharedState }),
      })

      if (!response.ok) {
        throw new Error("Failed to update sharing settings")
      }

      const updatedGoal = await response.json()

      // Update local state
      setGoals((prev) =>
        prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
      )
      setSharingGoal(updatedGoal)

      if (newSharedState && updatedGoal.share_token) {
        setShareUrl(`${window.location.origin}/goals/share/${updatedGoal.share_token}`)
        toast.success("Sharing enabled! Your share link is ready.")
      } else {
        setShareUrl("")
        toast.success("Sharing disabled.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update sharing")
    }
  }

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedUrl(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      toast.error("Failed to copy link")
    }
  }

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false)
    setSharingGoal(null)
    setShareUrl("")
    setCopiedUrl(false)
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
                    onShare={handleOpenShareDialog}
                    onRefresh={fetchGoals}
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
                    onShare={handleOpenShareDialog}
                    onRefresh={fetchGoals}
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

      {/* Share Goal Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={(open) => !open && handleCloseShareDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Goal</DialogTitle>
            <DialogDescription>
              Share your progress with friends and family using a public link.
            </DialogDescription>
          </DialogHeader>
          {sharingGoal && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Public Sharing</div>
                  <div className="text-sm text-muted-foreground">
                    {sharingGoal.is_shared
                      ? "Your goal is publicly visible"
                      : "Enable sharing to create a public link"}
                  </div>
                </div>
                <Switch
                  checked={sharingGoal.is_shared}
                  onCheckedChange={handleToggleSharing}
                />
              </div>

              {sharingGoal.is_shared && shareUrl && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Share Link</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyShareUrl}
                    >
                      {copiedUrl ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view your goal progress.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={handleCloseShareDialog}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Goal Card Component
interface GoalCardProps {
  goal: GoalWithDetails
  onEdit: () => void
  onContribute: () => void
  onDelete: () => void
  onShare: (goal: GoalWithDetails) => void
  onRefresh: () => void
}

function GoalCard({ goal, onEdit, onContribute, onDelete, onShare, onRefresh }: GoalCardProps) {
  const statusColor = getGoalStatusColor(goal)
  const categoryColors = getGoalCategoryColor(goal.category || "other")
  const [showMilestones, setShowMilestones] = useState(false)
  const [celebratingMilestone, setCelebratingMilestone] = useState<GoalMilestone | null>(null)

  // Check for newly reached milestones
  useEffect(() => {
    if (goal.milestones) {
      const newlyReached = goal.milestones.find(
        m => m.is_reached && !m.celebration_shown
      )
      if (newlyReached) {
        setCelebratingMilestone(newlyReached)
      }
    }
  }, [goal.milestones])

  const handleDismissCelebration = async () => {
    if (!celebratingMilestone) return

    try {
      await fetch(`/api/goals/${goal.id}/milestones?id=${celebratingMilestone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ celebration_shown: true }),
      })
      setCelebratingMilestone(null)
      onRefresh()
    } catch (error) {
      console.error("Failed to dismiss celebration:", error)
    }
  }

  return (
    <TooltipProvider>
      <Card className={cn(goal.is_completed && "opacity-75")}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Category Badge */}
              <div className="mb-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs", categoryColors.bg, categoryColors.text, categoryColors.border)}
                >
                  {CATEGORY_ICONS[goal.category || "other"]}
                  <span className="ml-1">{GOAL_CATEGORY_LABELS[goal.category || "other"]}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
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
                {goal.is_shared && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs">
                        <Share2 className="h-3 w-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Shared publicly</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <CardDescription>
                Target: {formatCurrency(goal.target_amount)}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onShare(goal)}
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share goal</TooltipContent>
              </Tooltip>
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
            {/* Milestone Celebration */}
            {celebratingMilestone && (
              <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 p-3 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">
                      Milestone Reached!
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">
                      {celebratingMilestone.name} ({celebratingMilestone.target_percentage}%)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismissCelebration}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

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

            {/* Auto-contribute info */}
            {goal.auto_contribute_amount && goal.auto_contribute_day && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                <span>
                  Auto: {formatCurrency(goal.auto_contribute_amount)}/mo on day {goal.auto_contribute_day}
                </span>
              </div>
            )}

            {/* Milestones Section */}
            {goal.milestones && goal.milestones.length > 0 && (
              <Collapsible open={showMilestones} onOpenChange={setShowMilestones}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-8">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Flag className="h-3.5 w-3.5" />
                      {goal.milestones.filter(m => m.is_reached).length}/{goal.milestones.length} Milestones
                    </span>
                    {showMilestones ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2">
                    {goal.milestones
                      .sort((a, b) => a.target_percentage - b.target_percentage)
                      .map((milestone) => (
                        <div
                          key={milestone.id}
                          className={cn(
                            "flex items-center gap-2 text-sm p-2 rounded",
                            milestone.is_reached
                              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                              : "bg-muted/50"
                          )}
                        >
                          {milestone.is_reached ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Flag className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="flex-1">{milestone.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {milestone.target_percentage}%
                          </span>
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

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
    </TooltipProvider>
  )
}
