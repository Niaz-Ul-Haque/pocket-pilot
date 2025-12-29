"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MoreHorizontal,
  FileSpreadsheet,
  Copy,
  BarChart3,
  StickyNote,
  Bell,
  CalendarDays,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BudgetForm } from "@/components/forms/budget-form"
import {
  type BudgetWithDetails,
  getBudgetStatus,
  getBudgetStatusColor,
  formatCurrency,
  BUDGET_PERIOD_LABELS,
  type BudgetPeriod,
} from "@/lib/validators/budget"
import type { Category } from "@/lib/validators/category"
import { cn } from "@/lib/utils"
import {
  BudgetGaugeChart,
  BudgetComparisonChart,
  BudgetHeatmap,
  BudgetVsActualReport,
} from "@/components/charts"
import { toast } from "sonner"

export default function BudgetsPage() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithDetails | null>(
    null
  )
  const [deletingBudget, setDeletingBudget] =
    useState<BudgetWithDetails | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [activeTab, setActiveTab] = useState("budgets")

  const fetchData = useCallback(async () => {
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        fetch("/api/budgets"),
        fetch("/api/categories"),
      ])

      if (!budgetsRes.ok) throw new Error("Failed to fetch budgets")
      if (!categoriesRes.ok) throw new Error("Failed to fetch categories")

      const [budgetsData, categoriesData] = await Promise.all([
        budgetsRes.json(),
        categoriesRes.json(),
      ])

      setBudgets(budgetsData)
      setCategories(categoriesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenDialog = (budget?: BudgetWithDetails) => {
    setEditingBudget(budget ?? null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingBudget(null)
  }

  const handleSuccess = (savedBudget: BudgetWithDetails) => {
    if (editingBudget) {
      setBudgets((prev) =>
        prev.map((b) => (b.id === savedBudget.id ? savedBudget : b))
      )
    } else {
      setBudgets((prev) => [...prev, savedBudget])
    }
    handleCloseDialog()
  }

  const handleDelete = async () => {
    if (!deletingBudget) return

    try {
      const response = await fetch(`/api/budgets/${deletingBudget.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete budget")
      }

      setBudgets((prev) => prev.filter((b) => b.id !== deletingBudget.id))
      toast.success(`Budget for "${deletingBudget.category_name}" has been deleted.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget")
    } finally {
      setDeletingBudget(null)
    }
  }

  const handleCopyForward = async () => {
    setIsCopying(true)
    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      // Copy from last month to current month
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear

      const response = await fetch("/api/budgets/copy-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_year: lastYear,
          source_month: lastMonth,
          target_year: currentYear,
          target_month: currentMonth,
          include_amounts: true,
          include_notes: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to copy budgets")
      }

      toast.success(data.message)

      // Refresh budgets
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to copy budgets")
    } finally {
      setIsCopying(false)
    }
  }

  const existingBudgetCategoryIds = budgets.map((b) => b.category_id)

  // Get current month name for display
  const currentMonth = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

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
                fetchData()
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
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Track your spending limits for {currentMonth}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/dashboard/budgets/templates")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Budget Templates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyForward} disabled={isCopying}>
                <Copy className="mr-2 h-4 w-4" />
                {isCopying ? "Copying..." : "Copy Last Month"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab("report")}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets">
          {budgets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground">No budgets set up yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a budget to start tracking your spending by category.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Budget
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard/budgets/templates")}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Use Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {budgets.map((budget) => {
                const effectiveBudget = budget.effective_budget ?? budget.amount
                const percentage = Math.min(
                  (budget.spent / effectiveBudget) * 100,
                  100
                )
                const status = getBudgetStatus(percentage, budget.alert_threshold)
                const statusColors = getBudgetStatusColor(status)
                const remaining = effectiveBudget - budget.spent
                const hasRollover =
                  budget.rollover &&
                  budget.rollover_amount &&
                  budget.rollover_amount > 0

                return (
                  <Card key={budget.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg">
                              {budget.category_name}
                            </CardTitle>
                            {budget.period !== "MONTHLY" && (
                              <Badge variant="outline" className="text-xs">
                                <CalendarDays className="mr-1 h-3 w-3" />
                                {BUDGET_PERIOD_LABELS[budget.period as BudgetPeriod]}
                              </Badge>
                            )}
                            {budget.rollover && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="gap-1 text-xs"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      Rollover
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Unused budget rolls over to next period</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {budget.alert_threshold !== 90 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="gap-1 text-xs"
                                    >
                                      <Bell className="h-3 w-3" />
                                      {budget.alert_threshold}%
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Alert when spending reaches{" "}
                                      {budget.alert_threshold}%
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <CardDescription>
                            {hasRollover ? (
                              <>
                                Base: {formatCurrency(budget.amount)}
                                <span className="mx-1.5 text-green-600">
                                  +{formatCurrency(budget.rollover_amount!)} rollover
                                </span>
                                = {formatCurrency(effectiveBudget)}
                              </>
                            ) : (
                              <>Budget: {formatCurrency(budget.amount)}</>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(budget)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingBudget(budget)}
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
                            value={percentage}
                            className={cn(
                              "h-2",
                              status === "over" && "[&>div]:bg-destructive",
                              status === "warning" && "[&>div]:bg-yellow-500"
                            )}
                          />
                        </div>

                        {/* Status indicator */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            {status === "safe" && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {status === "warning" && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            {status === "over" && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className={cn("font-medium", statusColors.text)}>
                              {status === "safe" && "On track"}
                              {status === "warning" && "Nearing limit"}
                              {status === "over" && "Over budget"}
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>

                        {/* Spent and remaining */}
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">Spent: </span>
                            <span className="font-medium">
                              {formatCurrency(budget.spent)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {remaining >= 0 ? "Remaining: " : "Over by: "}
                            </span>
                            <span
                              className={cn(
                                "font-medium",
                                remaining < 0 && "text-destructive"
                              )}
                            >
                              {formatCurrency(Math.abs(remaining))}
                            </span>
                          </div>
                        </div>

                        {/* Notes */}
                        {budget.notes && (
                          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm">
                            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <p className="text-muted-foreground">{budget.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          {budgets.length > 0 ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <BudgetGaugeChart />
                <BudgetComparisonChart />
              </div>
              <BudgetHeatmap />
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Create budgets to see analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="report">
          <BudgetVsActualReport />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? "Edit Budget" : "Create Budget"}
            </DialogTitle>
            <DialogDescription>
              {editingBudget
                ? "Update the settings for this budget category."
                : "Set a spending limit for a category."}
            </DialogDescription>
          </DialogHeader>
          <BudgetForm
            budget={editingBudget ?? undefined}
            categories={categories}
            existingBudgetCategoryIds={existingBudgetCategoryIds}
            onSuccess={handleSuccess}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingBudget}
        onOpenChange={(open) => !open && setDeletingBudget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the budget for &quot;
              {deletingBudget?.category_name}&quot;? This action cannot be
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
