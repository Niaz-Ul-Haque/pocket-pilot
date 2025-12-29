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
  TrendingDown,
  Plus,
  CreditCard,
  Banknote,
  Building2,
  CircleDollarSign,
  AlertTriangle,
  X,
  CalendarClock,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
  Upload,
  Tags,
  DollarSign,
  ChevronRight,
  Sparkles,
  Bell,
  Repeat,
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
import { Separator } from "@/components/ui/separator"
import { type Account, formatBalance, getBalanceColorClass } from "@/lib/validators/account"
import { type BudgetWithDetails, getBudgetStatus, formatCurrency } from "@/lib/validators/budget"
import { type BillWithStatus, getBillStatusColor, getBillStatusLabel } from "@/lib/validators/bill"
import { type GoalWithDetails } from "@/lib/validators/goal"
import { type TransactionWithDetails, formatAmount, getAmountColorClass } from "@/lib/validators/transaction"
import { type Category } from "@/lib/validators/category"
import { cn } from "@/lib/utils"
import { AIChatModal } from "@/components/ai-chat-modal"
import { AIInsightsWidget } from "@/components/ai-insights-widget"
import { DashboardSettings } from "@/components/dashboard-settings"
import { WeeklySummaryCard } from "@/components/weekly-summary-card"
import { AINotificationsPanel } from "@/components/ai-notifications-panel"
import {
  SpendingTrendChart,
  CategoryBreakdownChart,
  IncomeVsExpenseChart,
  CashFlowWaterfall,
  DailySpendingSparklineCard,
} from "@/components/charts"
import { useUserPreferences } from "@/components/providers"

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

// Quick Actions Component
function QuickActions({ onOpenAIChat }: { onOpenAIChat: () => void }) {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
            <Link href="/dashboard/transactions">
              <Plus className="h-4 w-4" />
              <span className="text-xs">Add Transaction</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
            <Link href="/dashboard/recurring">
              <Repeat className="h-4 w-4" />
              <span className="text-xs">Recurring</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
            <Link href="/dashboard/budgets">
              <Wallet className="h-4 w-4" />
              <span className="text-xs">Set Budget</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
            <Link href="/dashboard/goals">
              <Target className="h-4 w-4" />
              <span className="text-xs">New Goal</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
            <Link href="/dashboard/transactions">
              <Upload className="h-4 w-4" />
              <span className="text-xs">Import CSV</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
            <Link href="/dashboard/analytics">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Analytics</span>
            </Link>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-auto py-3 flex-col gap-1 bg-primary hover:bg-primary/90"
            onClick={onOpenAIChat}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs">AI Advisor</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// AI Advisor Widget Component
function AIAdvisorWidget({ onOpenAIChat }: { onOpenAIChat: () => void }) {
  return (
    <Card className="bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-purple-200 dark:border-purple-800">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="p-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shrink-0">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold mb-1">AI Financial Advisor</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get personalized insights, ask questions about your spending, and receive smart recommendations to improve your financial health.
            </p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start text-xs text-muted-foreground mb-4">
              <span className="px-2 py-1 bg-muted rounded-full">Spending analysis</span>
              <span className="px-2 py-1 bg-muted rounded-full">Budget advice</span>
              <span className="px-2 py-1 bg-muted rounded-full">Savings tips</span>
              <span className="px-2 py-1 bg-muted rounded-full">Goal tracking</span>
            </div>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shrink-0"
            onClick={onOpenAIChat}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Chat with AI
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Stats Cards Component
function StatsCards({
  totalBalance,
  accountCount,
  monthlyIncome,
  monthlyExpenses,
}: {
  totalBalance: number
  accountCount: number
  monthlyIncome: number
  monthlyExpenses: number
}) {
  const netChange = monthlyIncome - monthlyExpenses
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", getBalanceColorClass(totalBalance))}>
            {formatBalance(totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Across {accountCount} account{accountCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month&apos;s Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(monthlyIncome)}
          </div>
          <p className="text-xs text-muted-foreground">Total income received</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month&apos;s Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(monthlyExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">Total spent this month</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Change</CardTitle>
          {netChange >= 0 ? (
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", netChange >= 0 ? "text-green-600" : "text-red-600")}>
            {netChange >= 0 ? "+" : ""}{formatCurrency(netChange)}
          </div>
          <p className="text-xs text-muted-foreground">Income minus expenses</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] || "there"
  const { preferences } = useUserPreferences()

  // Helper to check if a widget is visible
  const isWidgetVisible = (widgetId: string) => preferences.dashboardWidgets.includes(widgetId)

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([])
  const [goals, setGoals] = useState<GoalWithDetails[]>([])
  const [bills, setBills] = useState<BillWithStatus[]>([])
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Alert dismiss state
  const [budgetAlertDismissed, setBudgetAlertDismissed] = useState(false)
  const [billAlertDismissed, setBillAlertDismissed] = useState(false)

  // AI Chat Modal state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, budgetsRes, billsRes, goalsRes, transactionsRes, categoriesRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/budgets"),
        fetch("/api/bills?upcoming=true&days=7"),
        fetch("/api/goals"),
        fetch("/api/transactions?limit=5"),
        fetch("/api/categories"),
      ])

      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (budgetsRes.ok) setBudgets(await budgetsRes.json())
      if (billsRes.ok) setBills(await billsRes.json())
      if (goalsRes.ok) setGoals(await goalsRes.json())
      if (transactionsRes.ok) setTransactions(await transactionsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
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
  
  // Calculate monthly income and expenses from transactions
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth)
  const monthlyIncome = monthlyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const monthlyExpenses = Math.abs(monthlyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
  
  const overBudgetCategories = budgets.filter((b) => b.spent > b.amount)
  const warningBudgetCategories = budgets.filter((b) => {
    const pct = (b.spent / b.amount) * 100
    return pct >= 90 && pct < 100
  })
  const hasBudgetAlerts = overBudgetCategories.length > 0 || warningBudgetCategories.length > 0

  const urgentBills = bills.filter((b) => b.status === "overdue" || b.status === "due-today" || b.status === "due-soon")
  const hasBillAlerts = urgentBills.length > 0

  const activeGoals = goals.filter((g) => !g.is_completed)
  
  // Category stats
  const expenseCategories = categories.filter(c => c.type === "expense")
  const incomeCategories = categories.filter(c => c.type === "income")

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
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
      {/* Alerts Section */}
      <div className="space-y-3">
        {/* Bill Alerts */}
        {hasBillAlerts && !billAlertDismissed && (
          <Alert variant={bills.some((b) => b.status === "overdue") ? "destructive" : "default"} className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
            <Bell className="h-4 w-4" />
            <div className="flex-1">
              <AlertTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>Bills Need Attention</span>
                  <Badge variant="secondary" className="text-xs">{urgentBills.length}</Badge>
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => setBillAlertDismissed(true)}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {urgentBills.slice(0, 3).map((b) => b.name).join(", ")}
                  {urgentBills.length > 3 && ` +${urgentBills.length - 3} more`}
                </span>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href="/dashboard/bills">View all <ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
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
                <span className="flex items-center gap-2">
                  <span>{overBudgetCategories.length > 0 ? "Over Budget" : "Budget Warning"}</span>
                  <Badge variant={overBudgetCategories.length > 0 ? "destructive" : "secondary"} className="text-xs">
                    {overBudgetCategories.length + warningBudgetCategories.length}
                  </Badge>
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => setBudgetAlertDismissed(true)}>
                  <X className="h-4 w-4" />
                </Button>
              </AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {overBudgetCategories.length > 0 && <span><strong>{overBudgetCategories.map((b) => b.category_name).join(", ")}</strong> exceeded. </span>}
                  {warningBudgetCategories.length > 0 && <span>Nearing limit: <strong>{warningBudgetCategories.map((b) => b.category_name).join(", ")}</strong></span>}
                </span>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href="/dashboard/budgets">View all <ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your financial overview for {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <DashboardSettings />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/transactions">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/transactions">
              <Plus className="h-4 w-4 mr-2" />
              Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isWidgetVisible("stats") && (
        <StatsCards
          totalBalance={totalBalance}
          accountCount={accounts.length}
          monthlyIncome={monthlyIncome}
          monthlyExpenses={monthlyExpenses}
        />
      )}

      {/* Quick Actions */}
      {isWidgetVisible("quick-actions") && (
        <QuickActions onOpenAIChat={() => setIsAIChatOpen(true)} />
      )}

      {/* AI Advisor Widget */}
      {isWidgetVisible("ai-advisor") && (
        <AIAdvisorWidget onOpenAIChat={() => setIsAIChatOpen(true)} />
      )}

      {/* AI Insights Widget */}
      {isWidgetVisible("ai-insights") && <AIInsightsWidget />}

      {/* AI Summary and Notifications */}
      {isWidgetVisible("ai-insights") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <WeeklySummaryCard />
          <AINotificationsPanel compact maxItems={5} />
        </div>
      )}

      {/* Data Visualization Charts */}
      {(isWidgetVisible("spending-trend") || isWidgetVisible("category-breakdown")) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {isWidgetVisible("spending-trend") && <SpendingTrendChart months={6} />}
          {isWidgetVisible("category-breakdown") && <CategoryBreakdownChart />}
        </div>
      )}

      {(isWidgetVisible("income-vs-expense") || isWidgetVisible("cash-flow")) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {isWidgetVisible("income-vs-expense") && <IncomeVsExpenseChart months={6} />}
          {isWidgetVisible("cash-flow") && <CashFlowWaterfall />}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accounts Overview */}
          {isWidgetVisible("accounts") && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Accounts
                </CardTitle>
                <CardDescription>{accounts.length} total accounts</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/accounts">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-6">
                  <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No accounts yet</p>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/accounts">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Account
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {accounts.slice(0, 4).map((account) => (
                    <Link
                      key={account.id}
                      href="/dashboard/accounts"
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all"
                    >
                      <div className="p-2 rounded-lg bg-muted">{getAccountIcon(account.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.type}</p>
                      </div>
                      <p className={cn("text-sm font-semibold", getBalanceColorClass(account.balance || 0))}>
                        {formatBalance(account.balance || 0)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              {accounts.length > 4 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  +{accounts.length - 4} more accounts
                </p>
              )}
            </CardContent>
          </Card>
          )}

          {/* Recent Transactions */}
          {isWidgetVisible("transactions") && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Latest activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/transactions">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-6">
                  <Receipt className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No transactions yet</p>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/transactions">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Transaction
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {transactions.map((t, index) => (
                    <div key={t.id}>
                      <Link
                        href="/dashboard/transactions"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={cn(
                          "p-2 rounded-full",
                          t.amount < 0 ? "bg-red-100 dark:bg-red-950" : "bg-green-100 dark:bg-green-950"
                        )}>
                          {t.amount < 0 ? (
                            <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.description || "No description"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{t.category_name || "Uncategorized"}</span>
                            <span>•</span>
                            <span>{format(new Date(t.date + "T00:00:00"), "MMM d")}</span>
                          </div>
                        </div>
                        <p className={cn("text-sm font-semibold", getAmountColorClass(t.amount))}>
                          {formatAmount(t.amount)}
                        </p>
                      </Link>
                      {index < transactions.length - 1 && <Separator className="my-1" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Budget Overview */}
          {isWidgetVisible("budgets") && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Budget Status
                </CardTitle>
                <CardDescription>This month&apos;s spending vs limits</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/budgets">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <div className="text-center py-6">
                  <Wallet className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No budgets set up yet</p>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/budgets">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Budget
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgets.slice(0, 5).map((budget) => {
                    const pct = Math.min((budget.spent / budget.amount) * 100, 100)
                    const status = getBudgetStatus(pct)
                    const remaining = budget.amount - budget.spent
                    return (
                      <Link
                        key={budget.id}
                        href="/dashboard/budgets"
                        className="block p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{budget.category_name}</span>
                            {status === "over" && (
                              <Badge variant="destructive" className="text-xs">Over</Badge>
                            )}
                            {status === "warning" && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                Warning
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className={cn(
                            "h-2",
                            status === "over" && "[&>div]:bg-destructive",
                            status === "warning" && "[&>div]:bg-yellow-500"
                          )}
                        />
                        <p className={cn(
                          "text-xs mt-1",
                          remaining < 0 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {remaining >= 0
                            ? `${formatCurrency(remaining)} remaining`
                            : `${formatCurrency(Math.abs(remaining))} over budget`}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Categories Summary */}
          {isWidgetVisible("categories") && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Categories
                </CardTitle>
                <CardDescription>{categories.length} categories</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/categories">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-4">
                  <Tags className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground mb-2">No categories yet</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/categories">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Categories
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-500" />
                      <span>Expense</span>
                    </div>
                    <Badge variant="secondary">{expenseCategories.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-500" />
                      <span>Income</span>
                    </div>
                    <Badge variant="secondary">{incomeCategories.length}</Badge>
                  </div>
                  <Separator className="my-2" />
                  <div className="text-xs text-muted-foreground">
                    Recent: {categories.slice(0, 3).map(c => c.name).join(", ")}
                    {categories.length > 3 && "..."}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Savings Goals */}
          {isWidgetVisible("goals") && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Savings Goals
                </CardTitle>
                <CardDescription>{activeGoals.length} active goal{activeGoals.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/goals">
                  View <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeGoals.length === 0 ? (
                <div className="text-center py-4">
                  <Target className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground mb-2">No active goals</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/goals">
                      <Plus className="h-3 w-3 mr-1" />
                      Create Goal
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <Link
                      key={goal.id}
                      href="/dashboard/goals"
                      className="block p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{goal.name}</span>
                        <span className="text-xs font-medium text-primary">{goal.percentage}%</span>
                      </div>
                      <Progress value={goal.percentage} className="h-1.5 mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Upcoming Bills */}
          {isWidgetVisible("bills") && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Upcoming Bills
                </CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/bills">
                  View <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-center py-4">
                  <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground mb-2">No upcoming bills</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/bills">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Bill
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {bills.slice(0, 4).map((bill) => {
                    const colors = getBillStatusColor(bill.status)
                    return (
                      <Link
                        key={bill.id}
                        href="/dashboard/bills"
                        className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{bill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {bill.amount ? formatCurrency(bill.amount) : "Variable"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs shrink-0", colors.bg, colors.text, colors.border)}
                        >
                          {getBillStatusLabel(bill.status, bill.days_until_due)}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>

      {/* AI Chat Modal */}
      <AIChatModal open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
    </div>
  )
}
