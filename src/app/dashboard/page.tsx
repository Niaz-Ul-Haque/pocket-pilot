"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import {
  ArrowRight,
  Wallet,
  PiggyBank,
  Receipt,
  TrendingUp,
  Plus,
  CreditCard,
  Banknote,
  Building2,
  CircleDollarSign,
  AlertTriangle,
  X,
  Clock,
  CalendarClock,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
  MessageSquare,
  Send,
  Loader2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type Account, formatBalance, getBalanceColorClass } from "@/lib/validators/account"
import { type BudgetWithDetails, getBudgetStatus, formatCurrency } from "@/lib/validators/budget"
import { type BillWithStatus, getBillStatusColor, getBillStatusLabel } from "@/lib/validators/bill"
import { type GoalWithDetails } from "@/lib/validators/goal"
import { type TransactionWithDetails, formatAmount, getAmountColorClass } from "@/lib/validators/transaction"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { TextStreamChatTransport } from "ai"

// Get icon based on account type
function getAccountIcon(type: string) {
  switch (type) {
    case "Checking":
      return <Building2 className="h-4 w-4" />
    case "Savings":
      return <PiggyBank className="h-4 w-4" />
    case "Credit":
      return <CreditCard className="h-4 w-4" />
    case "Cash":
      return <Banknote className="h-4 w-4" />
    case "Investment":
      return <TrendingUp className="h-4 w-4" />
    default:
      return <CircleDollarSign className="h-4 w-4" />
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] || "there"

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([])
  const [goals, setGoals] = useState<GoalWithDetails[]>([])
  const [bills, setBills] = useState<BillWithStatus[]>([])
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Alert dismiss state
  const [budgetAlertDismissed, setBudgetAlertDismissed] = useState(false)
  const [billAlertDismissed, setBillAlertDismissed] = useState(false)

  // AI Chat
  const [chatInput, setChatInput] = useState("")
  const chatTransport = new TextStreamChatTransport({ api: "/api/chat" })
  const { messages, sendMessage, status } = useChat({
    transport: chatTransport,
  })
  const isChatLoading = status === "streaming" || status === "submitted"

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isChatLoading) return
    const message = chatInput
    setChatInput("")
    sendMessage({ parts: [{ type: "text", text: message }] })
  }

  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, budgetsRes, billsRes, goalsRes, transactionsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/budgets"),
        fetch("/api/bills?upcoming=true&days=7"),
        fetch("/api/goals"),
        fetch("/api/transactions?limit=5"),
      ])

      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (budgetsRes.ok) setBudgets(await budgetsRes.json())
      if (billsRes.ok) setBills(await billsRes.json())
      if (goalsRes.ok) setGoals(await goalsRes.json())
      if (transactionsRes.ok) setTransactions(await transactionsRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculations
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const overBudgetCategories = budgets.filter((b) => b.spent > b.amount)
  const warningBudgetCategories = budgets.filter((b) => {
    const pct = (b.spent / b.amount) * 100
    return pct >= 90 && pct < 100
  })
  const hasBudgetAlerts = overBudgetCategories.length > 0 || warningBudgetCategories.length > 0

  const urgentBills = bills.filter((b) => b.status === "overdue" || b.status === "due-today" || b.status === "due-soon")
  const hasBillAlerts = urgentBills.length > 0

  const activeGoals = goals.filter((g) => !g.is_completed)

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Bill Alerts */}
      {hasBillAlerts && !billAlertDismissed && (
        <Alert variant={bills.some((b) => b.status === "overdue") ? "destructive" : "default"} className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
          <Clock className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle className="flex items-center justify-between">
              <span>Bills Need Attention</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBillAlertDismissed(true)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription>
              {urgentBills.map((b) => b.name).join(", ")} {urgentBills.length === 1 ? "needs" : "need"} attention.{" "}
              <Link href="/dashboard/bills" className="underline font-medium">View bills →</Link>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Budget Alerts */}
      {hasBudgetAlerts && !budgetAlertDismissed && (
        <Alert variant={overBudgetCategories.length > 0 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle className="flex items-center justify-between">
              <span>{overBudgetCategories.length > 0 ? "Over Budget" : "Budget Warning"}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBudgetAlertDismissed(true)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription>
              {overBudgetCategories.length > 0 && <span><strong>{overBudgetCategories.map((b) => b.category_name).join(", ")}</strong> over budget. </span>}
              {warningBudgetCategories.length > 0 && <span>Nearing limit: <strong>{warningBudgetCategories.map((b) => b.category_name).join(", ")}</strong>. </span>}
              <Link href="/dashboard/budgets" className="underline font-medium">View budgets →</Link>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}!</h1>
          <p className="text-muted-foreground">Here&apos;s your financial overview.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/transactions">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/transactions">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Top Row: Net Worth + Accounts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Net Worth Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Net Worth</CardDescription>
            <CardTitle className={cn("text-3xl", getBalanceColorClass(totalBalance))}>
              {formatBalance(totalBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        {/* Accounts Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Accounts</CardTitle>
              <CardDescription>Your financial accounts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/accounts">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No accounts yet</p>
                <Button size="sm" asChild><Link href="/dashboard/accounts"><Plus className="h-4 w-4 mr-1" />Add Account</Link></Button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {accounts.slice(0, 4).map((account) => (
                  <Link key={account.id} href="/dashboard/accounts" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="p-2 rounded-lg bg-muted">{getAccountIcon(account.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.type}</p>
                    </div>
                    <p className={cn("text-sm font-medium", getBalanceColorClass(account.balance || 0))}>
                      {formatBalance(account.balance || 0)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Transactions + Budgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <CardDescription>Latest activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/transactions">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-6">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((t) => (
                  <Link key={t.id} href="/dashboard/transactions" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="p-2 rounded-lg bg-muted">
                      {t.amount < 0 ? <ArrowDownCircle className="h-4 w-4 text-red-500" /> : <ArrowUpCircle className="h-4 w-4 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description || "No description"}</p>
                      <p className="text-xs text-muted-foreground">{t.category_name || "Uncategorized"} • {format(new Date(t.date + "T00:00:00"), "MMM d")}</p>
                    </div>
                    <p className={cn("text-sm font-medium", getAmountColorClass(t.amount))}>
                      {formatAmount(t.amount)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Budget Status</CardTitle>
              <CardDescription>This month&apos;s spending</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/budgets">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="text-center py-6">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No budgets set</p>
                <Button size="sm" asChild><Link href="/dashboard/budgets"><Plus className="h-4 w-4 mr-1" />Create Budget</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.slice(0, 4).map((budget) => {
                  const pct = Math.min((budget.spent / budget.amount) * 100, 100)
                  const status = getBudgetStatus(pct)
                  return (
                    <Link key={budget.id} href="/dashboard/budgets" className="block p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{budget.category_name}</span>
                        <span className="text-xs text-muted-foreground">{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</span>
                      </div>
                      <Progress value={pct} className={cn("h-1.5", status === "over" && "[&>div]:bg-destructive", status === "warning" && "[&>div]:bg-yellow-500")} />
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Goals + Bills + AI Chat */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Goals */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Savings Goals</CardTitle>
              <CardDescription>{activeGoals.length} active</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/goals">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <div className="text-center py-4">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No active goals</p>
                <Button size="sm" asChild><Link href="/dashboard/goals"><Plus className="h-4 w-4 mr-1" />Create Goal</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.slice(0, 3).map((goal) => (
                  <Link key={goal.id} href="/dashboard/goals" className="block p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{goal.name}</span>
                      <span className="text-xs font-medium">{goal.percentage}%</span>
                    </div>
                    <Progress value={goal.percentage} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bills */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Upcoming Bills</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/bills">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="text-center py-4">
                <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No upcoming bills</p>
                <Button size="sm" asChild><Link href="/dashboard/bills"><Plus className="h-4 w-4 mr-1" />Add Bill</Link></Button>
              </div>
            ) : (
              <div className="space-y-2">
                {bills.slice(0, 4).map((bill) => {
                  const colors = getBillStatusColor(bill.status)
                  return (
                    <Link key={bill.id} href="/dashboard/bills" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{bill.name}</p>
                        <p className="text-xs text-muted-foreground">{bill.amount ? formatCurrency(bill.amount) : "Variable"}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", colors.bg, colors.text, colors.border)}>
                        {getBillStatusLabel(bill.status, bill.days_until_due)}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Chat */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </CardTitle>
            <CardDescription>Ask about your finances</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 h-32 mb-3 pr-3">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Try: &quot;Add $25 for lunch&quot; or &quot;How much did I spend on groceries?&quot;</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn("text-xs p-2 rounded-lg", m.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4")}>
                      {m.parts?.map((part, i) => part.type === "text" ? part.text : null).join("") || ""}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask or add a transaction..."
                className="text-sm h-8"
                disabled={isChatLoading}
              />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={isChatLoading || !chatInput.trim()}>
                {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
