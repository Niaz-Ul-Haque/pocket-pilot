"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { 
  ArrowRight, 
  Wallet, 
  PiggyBank, 
  Receipt, 
  TrendingUp, 
  Plus,
  CreditCard,
  Banknote,
  PiggyBankIcon,
  Building2,
  CircleDollarSign,
  Tag,
  AlertTriangle,
  X,
  Clock,
  CalendarClock,
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
import type { Account } from "@/lib/validators/account"
import type { BudgetWithDetails } from "@/lib/validators/budget"
import type { BillWithStatus } from "@/lib/validators/bill"
import { cn } from "@/lib/utils"

// Get icon based on account type
function getAccountIcon(type: string) {
  switch (type) {
    case "Checking":
      return <Building2 className="h-5 w-5" />
    case "Savings":
      return <PiggyBankIcon className="h-5 w-5" />
    case "Credit":
      return <CreditCard className="h-5 w-5" />
    case "Cash":
      return <Banknote className="h-5 w-5" />
    case "Investment":
      return <TrendingUp className="h-5 w-5" />
    default:
      return <CircleDollarSign className="h-5 w-5" />
  }
}

// Get color based on account type
function getAccountColor(type: string) {
  switch (type) {
    case "Checking":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
    case "Savings":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
    case "Credit":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    case "Cash":
      return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "Investment":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] || "there"
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [budgets, setBudgets] = useState<BudgetWithDetails[]>([])
  const [urgentBills, setUrgentBills] = useState<BillWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [budgetAlertDismissed, setBudgetAlertDismissed] = useState(false)
  const [billAlertDismissed, setBillAlertDismissed] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsRes, budgetsRes, billsRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/budgets"),
          fetch("/api/bills?upcoming=true&days=3"),
        ])
        
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData)
        }
        
        if (budgetsRes.ok) {
          const budgetsData = await budgetsRes.json()
          setBudgets(budgetsData)
        }

        if (billsRes.ok) {
          const billsData = await billsRes.json()
          // Filter to only overdue or due-today bills
          setUrgentBills(
            billsData.filter(
              (b: BillWithStatus) => b.status === "overdue" || b.status === "due-today" || b.status === "due-soon"
            )
          )
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const quickActions = [
    {
      title: "Transactions",
      description: "Log your income and expenses",
      icon: Receipt,
      href: "/dashboard/transactions",
      color: "text-green-500",
      disabled: false,
    },
    {
      title: "Categories",
      description: "Organize your transactions",
      icon: Tag,
      href: "/dashboard/categories",
      color: "text-blue-500",
      disabled: false,
    },
    {
      title: "Budgets",
      description: "Create monthly spending limits",
      icon: TrendingUp,
      href: "/dashboard/budgets",
      color: "text-orange-500",
      disabled: false,
    },
    {
      title: "Goals",
      description: "Save for what matters to you",
      icon: PiggyBank,
      href: "/dashboard/goals",
      color: "text-purple-500",
      disabled: false,
    },
    {
      title: "Bills",
      description: "Track recurring payments",
      icon: CalendarClock,
      href: "/dashboard/bills",
      color: "text-red-500",
      disabled: false,
    },
  ]

  const hasAccounts = accounts.length > 0
  
  // Calculate budget alerts
  const overBudgetCategories = budgets.filter((b) => b.spent > b.amount)
  const warningBudgetCategories = budgets.filter((b) => {
    const percentage = (b.spent / b.amount) * 100
    return percentage >= 90 && percentage < 100
  })
  const hasBudgetAlerts = overBudgetCategories.length > 0 || warningBudgetCategories.length > 0

  // Calculate bill alerts
  const overdueBills = urgentBills.filter((b) => b.status === "overdue")
  const dueTodayBills = urgentBills.filter((b) => b.status === "due-today")
  const dueSoonBills = urgentBills.filter((b) => b.status === "due-soon")
  const hasBillAlerts = overdueBills.length > 0 || dueTodayBills.length > 0 || dueSoonBills.length > 0

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Bill Alerts Banner */}
        {hasBillAlerts && !billAlertDismissed && (
          <Alert 
            variant={overdueBills.length > 0 ? "destructive" : "default"}
            className={cn(
              "mb-4",
              overdueBills.length === 0 && "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100 [&>svg]:text-yellow-600"
            )}
          >
            <Clock className="h-4 w-4" />
            <div className="flex-1">
              <AlertTitle className="flex items-center justify-between">
                <span>
                  {overdueBills.length > 0 
                    ? "Bills Overdue" 
                    : dueTodayBills.length > 0 
                    ? "Bills Due Today"
                    : "Bills Due Soon"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-2"
                  onClick={() => setBillAlertDismissed(true)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </AlertTitle>
              <AlertDescription>
                {overdueBills.length > 0 && (
                  <span>
                    <strong>{overdueBills.map((b) => b.name).join(", ")}</strong>
                    {overdueBills.length === 1 ? " is" : " are"} overdue.{" "}
                  </span>
                )}
                {dueTodayBills.length > 0 && (
                  <span>
                    <strong>{dueTodayBills.map((b) => b.name).join(", ")}</strong>
                    {dueTodayBills.length === 1 ? " is" : " are"} due today.{" "}
                  </span>
                )}
                {dueSoonBills.length > 0 && (
                  <span>
                    <strong>{dueSoonBills.map((b) => b.name).join(", ")}</strong>
                    {dueSoonBills.length === 1 ? " is" : " are"} due soon.{" "}
                  </span>
                )}
                <Link 
                  href="/dashboard/bills" 
                  className="underline font-medium hover:no-underline"
                >
                  View bills →
                </Link>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Budget Alerts Banner */}
        {hasBudgetAlerts && !budgetAlertDismissed && (
          <Alert 
            variant={overBudgetCategories.length > 0 ? "destructive" : "default"}
            className={cn(
              "mb-6",
              overBudgetCategories.length === 0 && "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100 [&>svg]:text-yellow-600"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            <div className="flex-1">
              <AlertTitle className="flex items-center justify-between">
                <span>
                  {overBudgetCategories.length > 0 
                    ? "Budget Alert" 
                    : "Budget Warning"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-2"
                  onClick={() => setBudgetAlertDismissed(true)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </AlertTitle>
              <AlertDescription>
                {overBudgetCategories.length > 0 && (
                  <span>
                    You&apos;ve exceeded your budget in{" "}
                    <strong>
                      {overBudgetCategories.map((b) => b.category_name).join(", ")}
                    </strong>
                    .{" "}
                  </span>
                )}
                {warningBudgetCategories.length > 0 && (
                  <span>
                    {overBudgetCategories.length > 0 ? "Also nearing " : "Nearing "}
                    limit in{" "}
                    <strong>
                      {warningBudgetCategories.map((b) => b.category_name).join(", ")}
                    </strong>
                    .{" "}
                  </span>
                )}
                <Link 
                  href="/dashboard/budgets" 
                  className="underline font-medium hover:no-underline"
                >
                  View budgets →
                </Link>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            {hasAccounts 
              ? "Here's an overview of your finances."
              : "Get started by setting up your accounts and tracking your finances."
            }
          </p>
        </div>

        {/* Accounts Section */}
        {isLoading ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-28" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          </div>
        ) : hasAccounts ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Accounts</h2>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/accounts">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <Card key={account.id} className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2.5 ${getAccountColor(account.type)}`}>
                          {getAccountIcon(account.type)}
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.type}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-bold">$0.00</p>
                      <p className="text-xs text-muted-foreground">Current balance</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Add Account Card */}
              <Link href="/dashboard/accounts">
                <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[140px] text-muted-foreground">
                    <Plus className="h-8 w-8 mb-2" />
                    <p className="font-medium">Add Account</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        ) : (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Get Started</CardTitle>
              <CardDescription>
                Complete these steps to start tracking your finances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Create your first account</p>
                    <p className="text-sm text-muted-foreground">
                      Add a checking, savings, or credit card account
                    </p>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link href="/dashboard/accounts">
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Accounts action - only show if no accounts yet */}
            {!hasAccounts && (
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2 text-blue-600 dark:text-blue-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">Accounts</CardTitle>
                    <CardDescription className="text-sm">
                      Set up your financial accounts
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/dashboard/accounts">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className={cn(
                  "transition-colors",
                  action.disabled ? "opacity-50" : "hover:border-primary/50"
                )}
              >
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                  <div className={`rounded-lg bg-muted p-2 ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {action.disabled ? (
                    <Button variant="outline" disabled className="w-full">
                      Coming Soon
                    </Button>
                  ) : (
                    <Button variant="outline" asChild className="w-full">
                      <Link href={action.href}>
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
