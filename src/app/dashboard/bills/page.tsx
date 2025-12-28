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
  Receipt,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Repeat,
} from "lucide-react"
import { BillForm } from "@/components/forms/bill-form"
import { MarkPaidForm } from "@/components/forms/mark-paid-form"
import {
  type BillWithStatus,
  formatCurrency,
  getBillStatusColor,
  getBillStatusLabel,
} from "@/lib/validators/bill"
import { cn } from "@/lib/utils"
import {
  BillCalendar,
  MonthlyBillsChart,
  BillTimeline,
} from "@/components/charts"

export default function BillsPage() {
  const [bills, setBills] = useState<BillWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  // Dialog states
  const [billDialogOpen, setBillDialogOpen] = useState(false)
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<BillWithStatus | null>(null)
  const [payingBill, setPayingBill] = useState<BillWithStatus | null>(null)
  const [deletingBill, setDeletingBill] = useState<BillWithStatus | null>(null)

  const fetchBills = useCallback(async () => {
    try {
      const activeParam = showInactive ? "" : "?active=true"
      const response = await fetch(`/api/bills${activeParam}`)
      if (!response.ok) throw new Error("Failed to fetch bills")
      const data = await response.json()
      setBills(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const handleOpenBillDialog = (bill?: BillWithStatus) => {
    setEditingBill(bill ?? null)
    setBillDialogOpen(true)
  }

  const handleCloseBillDialog = () => {
    setBillDialogOpen(false)
    setEditingBill(null)
  }

  const handleBillSuccess = (savedBill: BillWithStatus) => {
    if (editingBill) {
      setBills((prev) =>
        prev.map((b) => (b.id === savedBill.id ? savedBill : b))
      )
    } else {
      setBills((prev) => [savedBill, ...prev])
    }
    handleCloseBillDialog()
  }

  const handleOpenMarkPaidDialog = (bill: BillWithStatus) => {
    setPayingBill(bill)
    setMarkPaidDialogOpen(true)
  }

  const handleCloseMarkPaidDialog = () => {
    setMarkPaidDialogOpen(false)
    setPayingBill(null)
  }

  const handleMarkPaidSuccess = (result: { bill: BillWithStatus }) => {
    setBills((prev) =>
      prev.map((b) => (b.id === result.bill.id ? result.bill : b))
    )
    handleCloseMarkPaidDialog()
  }

  const handleDelete = async () => {
    if (!deletingBill) return

    try {
      const response = await fetch(`/api/bills/${deletingBill.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete bill")
      }

      setBills((prev) => prev.filter((b) => b.id !== deletingBill.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bill")
    } finally {
      setDeletingBill(null)
    }
  }

  const handleToggleActive = async (bill: BillWithStatus) => {
    try {
      const response = await fetch(`/api/bills/${bill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !bill.is_active }),
      })

      if (!response.ok) throw new Error("Failed to update bill")

      const updatedBill = await response.json()
      if (showInactive) {
        setBills((prev) =>
          prev.map((b) => (b.id === updatedBill.id ? updatedBill : b))
        )
      } else {
        // Filter out inactive bills when not showing them
        setBills((prev) =>
          updatedBill.is_active
            ? prev.map((b) => (b.id === updatedBill.id ? updatedBill : b))
            : prev.filter((b) => b.id !== updatedBill.id)
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bill")
    }
  }

  // Get status icon
  const getStatusIcon = (status: BillWithStatus["status"]) => {
    switch (status) {
      case "overdue":
        return <AlertTriangle className="h-4 w-4" />
      case "due-today":
        return <Clock className="h-4 w-4" />
      case "due-soon":
        return <Calendar className="h-4 w-4" />
      case "upcoming":
        return <CheckCircle className="h-4 w-4" />
    }
  }

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString + "T00:00:00").toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Separate bills by status urgency
  const urgentBills = bills.filter(
    (b) => b.status === "overdue" || b.status === "due-today"
  )
  const upcomingBills = bills.filter(
    (b) => b.status === "due-soon" || b.status === "upcoming"
  )

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
                fetchBills()
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
          <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground">
            Track your recurring bills and due dates
          </p>
        </div>
        <div className="flex items-center gap-4">
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
          <Button onClick={() => handleOpenBillDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
          </Button>
        </div>
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                {showInactive
                  ? "No bills found."
                  : "No active bills found."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your recurring bills to track due dates and payments.
              </p>
              <Button className="mt-4" onClick={() => handleOpenBillDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Bills Due Soon</CardDescription>
                <CardTitle className="text-2xl">
                  {urgentBills.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Overdue or due today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Monthly Total</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(
                    bills
                      .filter((b) => b.is_active && b.frequency === "monthly")
                      .reduce((sum, b) => sum + (b.amount ?? 0), 0)
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Fixed monthly bills
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Auto-Pay Enabled</CardDescription>
                <CardTitle className="text-2xl">
                  {bills.filter((b) => b.auto_pay && b.is_active).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Bills on auto-pay
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Urgent Bills */}
          {urgentBills.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Attention Required
                </CardTitle>
                <CardDescription>
                  These bills are overdue or due today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BillsTable
                  bills={urgentBills}
                  onEdit={handleOpenBillDialog}
                  onMarkPaid={handleOpenMarkPaidDialog}
                  onDelete={setDeletingBill}
                  onToggleActive={handleToggleActive}
                  formatDate={formatDate}
                  formatFrequency={formatFrequency}
                  getStatusIcon={getStatusIcon}
                />
              </CardContent>
            </Card>
          )}

          {/* Upcoming Bills */}
          {upcomingBills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Bills
                </CardTitle>
                <CardDescription>
                  Bills due in the coming days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BillsTable
                  bills={upcomingBills}
                  onEdit={handleOpenBillDialog}
                  onMarkPaid={handleOpenMarkPaidDialog}
                  onDelete={setDeletingBill}
                  onToggleActive={handleToggleActive}
                  formatDate={formatDate}
                  formatFrequency={formatFrequency}
                  getStatusIcon={getStatusIcon}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bill Visualizations */}
      {bills.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-semibold">Bill Analytics</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlyBillsChart />
            <BillTimeline days={30} />
          </div>
          <BillCalendar />
        </div>
      )}

      {/* Create/Edit Bill Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBill ? "Edit Bill" : "Add Bill"}
            </DialogTitle>
            <DialogDescription>
              {editingBill
                ? "Update your recurring bill details."
                : "Add a new recurring bill to track."}
            </DialogDescription>
          </DialogHeader>
          <BillForm
            bill={editingBill ?? undefined}
            onSuccess={handleBillSuccess}
            onCancel={handleCloseBillDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
            <DialogDescription>
              Record this payment and advance the due date.
            </DialogDescription>
          </DialogHeader>
          {payingBill && (
            <MarkPaidForm
              bill={payingBill}
              onSuccess={handleMarkPaidSuccess}
              onCancel={handleCloseMarkPaidDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingBill}
        onOpenChange={(open) => !open && setDeletingBill(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingBill?.name}&quot;?
              This action cannot be undone.
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

// Bills Table Component
interface BillsTableProps {
  bills: BillWithStatus[]
  onEdit: (bill: BillWithStatus) => void
  onMarkPaid: (bill: BillWithStatus) => void
  onDelete: (bill: BillWithStatus) => void
  onToggleActive: (bill: BillWithStatus) => void
  formatDate: (date: string) => string
  formatFrequency: (freq: string) => string
  getStatusIcon: (status: BillWithStatus["status"]) => React.ReactNode
}

function BillsTable({
  bills,
  onEdit,
  onMarkPaid,
  onDelete,
  onToggleActive,
  formatDate,
  formatFrequency,
  getStatusIcon,
}: BillsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bill</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bills.map((bill) => (
          <TableRow
            key={bill.id}
            className={cn(!bill.is_active && "opacity-50")}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <div>
                  <div className="font-medium">{bill.name}</div>
                  {bill.category_name && (
                    <div className="text-xs text-muted-foreground">
                      {bill.category_name}
                    </div>
                  )}
                </div>
                {bill.auto_pay && (
                  <Badge variant="outline" className="ml-2">
                    <CreditCard className="mr-1 h-3 w-3" />
                    Auto
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              {bill.amount ? formatCurrency(bill.amount) : "Variable"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Repeat className="h-3 w-3 text-muted-foreground" />
                {formatFrequency(bill.frequency)}
              </div>
            </TableCell>
            <TableCell>{formatDate(bill.next_due_date)}</TableCell>
            <TableCell>
              {(() => {
                const colors = getBillStatusColor(bill.status)
                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1",
                      colors.bg,
                      colors.text,
                      colors.border
                    )}
                  >
                    {getStatusIcon(bill.status)}
                    {getBillStatusLabel(bill.status, bill.days_until_due)}
                  </Badge>
                )
              })()}
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
                  <DropdownMenuItem onClick={() => onMarkPaid(bill)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(bill)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(bill)}>
                    {bill.is_active ? (
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
                    onClick={() => onDelete(bill)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
