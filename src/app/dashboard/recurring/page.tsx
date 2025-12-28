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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  Repeat,
  ArrowDownCircle,
  ArrowUpCircle,
  Play,
} from "lucide-react"
import { RecurringTransactionForm } from "@/components/forms/recurring-transaction-form"
import {
  type RecurringTransactionWithDetails,
  formatCurrency,
  formatDate,
  getDaysUntilOccurrence,
  FREQUENCY_LABELS,
} from "@/lib/validators/recurring-transaction"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function RecurringTransactionsPage() {
  const [recurring, setRecurring] = useState<RecurringTransactionWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransactionWithDetails | null>(null)
  const [deleting, setDeleting] = useState<RecurringTransactionWithDetails | null>(null)

  const fetchRecurring = useCallback(async () => {
    try {
      const activeParam = showInactive ? "" : "?active=true"
      const response = await fetch(`/api/recurring-transactions${activeParam}`)
      if (!response.ok) throw new Error("Failed to fetch recurring transactions")
      const data = await response.json()
      setRecurring(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    fetchRecurring()
  }, [fetchRecurring])

  const handleOpenDialog = (rt?: RecurringTransactionWithDetails) => {
    setEditing(rt ?? null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const handleSuccess = (saved: RecurringTransactionWithDetails) => {
    if (editing) {
      setRecurring((prev) =>
        prev.map((r) => (r.id === saved.id ? saved : r))
      )
    } else {
      setRecurring((prev) => [saved, ...prev])
    }
    handleCloseDialog()
    toast.success(editing ? "Recurring transaction updated" : "Recurring transaction created")
  }

  const handleDelete = async () => {
    if (!deleting) return

    try {
      const response = await fetch(`/api/recurring-transactions/${deleting.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete recurring transaction")
      }

      setRecurring((prev) => prev.filter((r) => r.id !== deleting.id))
      toast.success("Recurring transaction deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleActive = async (rt: RecurringTransactionWithDetails) => {
    try {
      const response = await fetch(`/api/recurring-transactions/${rt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rt.is_active }),
      })

      if (!response.ok) throw new Error("Failed to update")

      const updated = await response.json()
      if (showInactive) {
        setRecurring((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        )
      } else {
        setRecurring((prev) =>
          updated.is_active
            ? prev.map((r) => (r.id === updated.id ? updated : r))
            : prev.filter((r) => r.id !== updated.id)
        )
      }
      toast.success(updated.is_active ? "Activated" : "Deactivated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/recurring-transactions/generate", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to generate transactions")

      const result = await response.json()
      if (result.created > 0) {
        toast.success(`Created ${result.created} transaction(s)`)
        // Refresh the list to show updated dates
        fetchRecurring()
      } else {
        toast.info("No recurring transactions due")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate")
    } finally {
      setIsGenerating(false)
    }
  }

  // Calculate summary stats
  const activeRecurring = recurring.filter((r) => r.is_active)
  const monthlyExpenses = activeRecurring
    .filter((r) => r.amount < 0 && r.frequency === "monthly")
    .reduce((sum, r) => sum + Math.abs(r.amount), 0)
  const monthlyIncome = activeRecurring
    .filter((r) => r.amount > 0 && r.frequency === "monthly")
    .reduce((sum, r) => sum + r.amount, 0)
  const dueToday = activeRecurring.filter(
    (r) => getDaysUntilOccurrence(r.next_occurrence_date) <= 0
  )

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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
                fetchRecurring()
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
          <h1 className="text-2xl font-bold tracking-tight">Recurring Transactions</h1>
          <p className="text-muted-foreground">
            Automate transactions that happen on a schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-sm">
              Show inactive
            </Label>
          </div>
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Generate Due
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {recurring.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Repeat className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                {showInactive
                  ? "No recurring transactions found."
                  : "No active recurring transactions."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Set up recurring transactions like salary, rent, or subscriptions.
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Recurring Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-2xl">{activeRecurring.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">recurring transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Monthly Expenses</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  -{formatCurrency(monthlyExpenses)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">recurring outflows</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Monthly Income</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  +{formatCurrency(monthlyIncome)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">recurring inflows</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Due Today</CardDescription>
                <CardTitle className="text-2xl">{dueToday.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {dueToday.length > 0 ? "ready to generate" : "none due"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Due Today Alert */}
          {dueToday.length > 0 && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Clock className="h-5 w-5" />
                  Transactions Due
                </CardTitle>
                <CardDescription className="text-amber-600 dark:text-amber-500">
                  {dueToday.length} transaction(s) are ready to be generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {isGenerating ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Generate Now
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recurring Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                All Recurring Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurring.map((rt) => {
                    const daysUntil = getDaysUntilOccurrence(rt.next_occurrence_date)
                    const isExpense = rt.amount < 0
                    return (
                      <TableRow
                        key={rt.id}
                        className={cn(!rt.is_active && "opacity-50")}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isExpense ? (
                              <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <ArrowUpCircle className="h-4 w-4 text-green-500" />
                            )}
                            <div>
                              <div className="font-medium">{rt.description}</div>
                              {rt.category_name && (
                                <div className="text-xs text-muted-foreground">
                                  {rt.category_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              isExpense ? "text-red-600" : "text-green-600"
                            )}
                          >
                            {isExpense ? "-" : "+"}
                            {formatCurrency(rt.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Repeat className="h-3 w-3 text-muted-foreground" />
                            {FREQUENCY_LABELS[rt.frequency]}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDate(rt.next_occurrence_date)}</div>
                            <div className="text-xs text-muted-foreground">
                              {daysUntil <= 0 ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                  Due
                                </Badge>
                              ) : daysUntil === 1 ? (
                                "Tomorrow"
                              ) : (
                                `In ${daysUntil} days`
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{rt.account_name || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(rt)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(rt)}>
                                {rt.is_active ? (
                                  <>
                                    <Clock className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleting(rt)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Recurring Transaction" : "Add Recurring Transaction"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update your recurring transaction details."
                : "Set up a transaction that repeats on a schedule."}
            </DialogDescription>
          </DialogHeader>
          <RecurringTransactionForm
            recurringTransaction={editing ?? undefined}
            onSuccess={handleSuccess}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleting?.description}&quot;?
              This won&apos;t delete any transactions already created from it.
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
