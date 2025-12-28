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
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BudgetForm } from "@/components/forms/budget-form"
import {
  type BudgetWithDetails,
  getBudgetStatus,
  getBudgetStatusColor,
  formatCurrency,
} from "@/lib/validators/budget"
import type { Category } from "@/lib/validators/category"
import { cn } from "@/lib/utils"
import {
  BudgetGaugeChart,
  BudgetComparisonChart,
  BudgetHeatmap,
} from "@/components/charts"

export default function BudgetsPage() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete budget")
    } finally {
      setDeletingBudget(null)
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
          <h1 className="text-2xl font-bold tracking-tight">Monthly Budgets</h1>
          <p className="text-muted-foreground">
            Track your spending limits for {currentMonth}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">No budgets set up yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a budget to start tracking your spending by category.
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Budget
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            // Use effective_budget for percentage calculation if rollover is active
            const effectiveBudget = budget.effective_budget ?? budget.amount
            const percentage = Math.min(
              (budget.spent / effectiveBudget) * 100,
              100
            )
            const status = getBudgetStatus(percentage)
            const statusColors = getBudgetStatusColor(status)
            const remaining = effectiveBudget - budget.spent
            const hasRollover = budget.rollover && budget.rollover_amount && budget.rollover_amount > 0

            return (
              <Card key={budget.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {budget.category_name}
                        </CardTitle>
                        {budget.rollover && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <RefreshCw className="h-3 w-3" />
                                  Rollover
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Unused budget rolls over to next month</p>
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
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Budget Visualizations */}
      {budgets.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-semibold">Budget Analytics</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <BudgetGaugeChart />
            <BudgetComparisonChart />
          </div>
          <BudgetHeatmap />
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? "Edit Budget" : "Create Budget"}
            </DialogTitle>
            <DialogDescription>
              {editingBudget
                ? "Update the monthly limit for this category."
                : "Set a monthly spending limit for a category."}
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
