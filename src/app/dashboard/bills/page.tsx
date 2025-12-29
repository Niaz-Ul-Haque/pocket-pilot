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
  Zap,
  Tv,
  Shield,
  Home,
  Wifi,
  Users,
  TrendingUp,
  Award,
  Flame,
  Sparkles,
  DollarSign,
  Loader2,
} from "lucide-react"
import { BillForm } from "@/components/forms/bill-form"
import { MarkPaidForm } from "@/components/forms/mark-paid-form"
import {
  type BillWithStatus,
  type BillType,
  type AnnualCostSummary,
  formatCurrency,
  getBillStatusColor,
  getBillStatusLabel,
  getBillTypeColor,
  getStreakBadgeColor,
  getStreakStatusMessage,
  getOnTimeRate,
  BILL_TYPES,
  BILL_TYPE_LABELS,
} from "@/lib/validators/bill"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { AIFinancialCalendar } from "@/components/ai-financial-calendar"

// Bill type icon mapping
const BILL_TYPE_ICONS: Record<BillType, React.ReactNode> = {
  utilities: <Zap className="h-4 w-4" />,
  subscriptions: <Tv className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  rent_mortgage: <Home className="h-4 w-4" />,
  loans: <CreditCard className="h-4 w-4" />,
  phone_internet: <Wifi className="h-4 w-4" />,
  memberships: <Users className="h-4 w-4" />,
  other: <Receipt className="h-4 w-4" />,
}
import { cn } from "@/lib/utils"
import {
  BillCalendar,
  MonthlyBillsChart,
  BillTimeline,
} from "@/components/charts"

// Detected bill type from auto-detection
type DetectedBill = {
  merchant_name: string
  suggested_amount: number
  suggested_frequency: string
  confidence: number
  transaction_count: number
  last_transaction_date: string
  average_days_between: number
  suggested_bill_type: BillType
  category_id: string | null
  category_name: string | null
}

export default function BillsPage() {
  const [bills, setBills] = useState<BillWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  // Annual cost state
  const [annualCost, setAnnualCost] = useState<AnnualCostSummary | null>(null)
  const [loadingAnnualCost, setLoadingAnnualCost] = useState(false)

  // Detected bills state
  const [detectedBills, setDetectedBills] = useState<DetectedBill[]>([])
  const [loadingDetection, setLoadingDetection] = useState(false)
  const [showDetectedBills, setShowDetectedBills] = useState(false)

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

  const fetchAnnualCost = useCallback(async () => {
    setLoadingAnnualCost(true)
    try {
      const response = await fetch("/api/bills/annual-cost")
      if (!response.ok) throw new Error("Failed to fetch annual cost")
      const data = await response.json()
      setAnnualCost(data)
    } catch (err) {
      console.error("Failed to fetch annual cost:", err)
    } finally {
      setLoadingAnnualCost(false)
    }
  }, [])

  const detectBills = async () => {
    setLoadingDetection(true)
    try {
      const response = await fetch("/api/bills/detect")
      if (!response.ok) throw new Error("Failed to detect bills")
      const data = await response.json()
      setDetectedBills(data.detected_bills || [])
      setShowDetectedBills(true)
      if (data.detected_bills?.length === 0) {
        toast.info("No new recurring bills detected from your transactions.")
      } else {
        toast.success(`Found ${data.detected_bills.length} potential recurring bills!`)
      }
    } catch (err) {
      toast.error("Failed to detect bills")
    } finally {
      setLoadingDetection(false)
    }
  }

  const addDetectedBill = async (detected: DetectedBill) => {
    // Calculate next due date based on last transaction and frequency
    const lastDate = new Date(detected.last_transaction_date)
    const avgDays = detected.average_days_between
    const nextDue = new Date(lastDate.getTime() + avgDays * 24 * 60 * 60 * 1000)
    const nextDueStr = nextDue.toISOString().split("T")[0]

    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detected.merchant_name,
          amount: detected.suggested_amount,
          frequency: detected.suggested_frequency,
          next_due_date: nextDueStr,
          bill_type: detected.suggested_bill_type,
          category_id: detected.category_id,
          auto_pay: false,
        }),
      })

      if (!response.ok) throw new Error("Failed to add bill")

      const newBill = await response.json()
      setBills((prev) => [newBill, ...prev])
      setDetectedBills((prev) => prev.filter((d) => d.merchant_name !== detected.merchant_name))
      toast.success(`Added "${detected.merchant_name}" as a bill!`)
      fetchAnnualCost()
    } catch (err) {
      toast.error("Failed to add bill")
    }
  }

  useEffect(() => {
    fetchBills()
    fetchAnnualCost()
  }, [fetchBills, fetchAnnualCost])

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
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
            onClick={detectBills}
            disabled={loadingDetection}
          >
            {loadingDetection ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Detect Bills
          </Button>
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
          {/* Detected Bills Section */}
          {showDetectedBills && detectedBills.length > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Detected Recurring Bills</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetectedBills(false)}
                  >
                    Dismiss
                  </Button>
                </div>
                <CardDescription>
                  We found these potential bills from your transaction patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {detectedBills.map((detected) => {
                    const typeColors = getBillTypeColor(detected.suggested_bill_type)
                    return (
                      <div
                        key={detected.merchant_name}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{detected.merchant_name}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", typeColors.bg, typeColors.text, typeColors.border)}
                          >
                            {BILL_TYPE_ICONS[detected.suggested_bill_type]}
                            <span className="ml-1">{BILL_TYPE_LABELS[detected.suggested_bill_type]}</span>
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>{formatCurrency(detected.suggested_amount)} / {detected.suggested_frequency}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <span>Confidence:</span>
                            <Progress value={detected.confidence} className="h-1.5 w-16" />
                            <span>{detected.confidence}%</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => addDetectedBill(detected)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Bill
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <CardDescription>Monthly Average</CardDescription>
                <CardTitle className="text-2xl">
                  {loadingAnnualCost ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(annualCost?.total_monthly_average ?? 0)
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  All bills combined
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Annual Total</CardDescription>
                <CardTitle className="text-2xl">
                  {loadingAnnualCost ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(annualCost?.total_annual_cost ?? 0)
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Yearly bill expenses
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

          {/* Annual Cost Breakdown */}
          {annualCost && annualCost.by_type.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Annual Cost by Category
                </CardTitle>
                <CardDescription>
                  See how your bill expenses break down by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {annualCost.by_type.map((item) => {
                    const typeColors = getBillTypeColor(item.type)
                    return (
                      <div
                        key={item.type}
                        className={cn(
                          "rounded-lg border p-3",
                          typeColors.bg,
                          typeColors.border
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {BILL_TYPE_ICONS[item.type]}
                          <span className={cn("text-sm font-medium", typeColors.text)}>
                            {BILL_TYPE_LABELS[item.type]}
                          </span>
                        </div>
                        <div className={cn("text-xl font-bold mt-1", typeColors.text)}>
                          {formatCurrency(item.annual_cost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.count} bill{item.count !== 1 ? "s" : ""} / year
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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
          {/* AI-Powered Financial Calendar */}
          <AIFinancialCalendar />
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
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bill</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Streak</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => {
            const typeColors = getBillTypeColor(bill.bill_type || "other")
            const streakColors = getStreakBadgeColor(bill.current_streak || 0)
            const onTimeRate = getOnTimeRate(bill.on_time_payments || 0, bill.total_payments || 0)

            return (
              <TableRow
                key={bill.id}
                className={cn(!bill.is_active && "opacity-50")}
              >
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{bill.name}</div>
                      {bill.auto_pay && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              <CreditCard className="h-3 w-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Auto-pay enabled</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", typeColors.bg, typeColors.text, typeColors.border)}
                      >
                        {BILL_TYPE_ICONS[bill.bill_type || "other"]}
                        <span className="ml-1">{BILL_TYPE_LABELS[bill.bill_type || "other"]}</span>
                      </Badge>
                      {bill.category_name && (
                        <span className="text-xs text-muted-foreground">
                          {bill.category_name}
                        </span>
                      )}
                    </div>
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
                  {(bill.current_streak ?? 0) > 0 ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="outline"
                          className={cn("gap-1", streakColors.bg, streakColors.text, streakColors.border)}
                        >
                          <Flame className="h-3 w-3" />
                          {bill.current_streak}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p>{getStreakStatusMessage(bill.current_streak || 0, bill.longest_streak || 0)}</p>
                          {(bill.total_payments ?? 0) > 0 && (
                            <p className="mt-1">On-time rate: {onTimeRate}%</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
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
            )
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
