"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Target,
  Wallet,
  Receipt,
  Calendar,
  Sparkles,
  Copy,
  CheckCircle,
  XCircle,
  ArrowRight,
  Activity,
  DollarSign,
  PiggyBank,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface AIInsightsData {
  healthScore: {
    score: number
    breakdown: Record<string, number>
    factors: string[]
    grade: string
  }
  proactiveInsights: Array<{
    type: string
    priority: "high" | "medium" | "low"
    message: string
    action?: string
  }>
  predictiveAlerts: Array<{
    category: string
    currentSpent: number
    projectedTotal: number
    budget: number
    daysUntilExceed: number | null
  }>
  anomalies: {
    items: Array<{
      transaction: {
        id: string
        amount: number
        description: string | null
        date: string
      }
      reason: string
      severity: "high" | "medium" | "low"
    }>
    count: number
  }
  duplicates: {
    items: Array<{
      transactions: Array<{
        id: string
        amount: number
        date: string
      }>
      reason: string
    }>
    count: number
  }
  spendingPatterns: {
    dayOfWeek: Record<string, number>
    timeOfMonth: { early: number; mid: number; late: number }
    peakDay: string
    insight: string
  }
  subscriptionAudit: {
    identified: Array<{
      name: string
      amount: number
      frequency: string
      annualCost: number
    }>
    totalMonthly: number
    totalAnnual: number
    suggestions: string[]
  }
  expensePredictions: {
    projectedMonthlyTotal: number
    projectedByCategory: Array<{
      category: string
      projected: number
      trend: "up" | "down" | "stable"
    }>
    dailyAverage: number
    weeklyPrediction: number
  }
  cashFlowForecast: {
    projectedBalance30Days: number
    upcomingInflows: number
    upcomingOutflows: number
    criticalDates: Array<{
      date: string
      description: string
      impact: number
    }>
    insight: string
  }
  goalPredictions: Array<{
    goal: {
      id: string
      name: string
      target_amount: number
      current_amount: number
    }
    predictedCompletionDate: string | null
    monthsRemaining: number | null
    requiredMonthly: number
    onTrack: boolean
    insight: string
  }>
  billImpact: {
    totalMonthlyBills: number
    percentageOfIncome: number
    upcomingImpact: Array<{
      bill: { name: string; amount: number }
      impact: number
      percentOfBalance: number
    }>
    recommendations: string[]
  }
  summary: {
    currentBalance: number
    monthlyIncome: number
    monthlyExpenses: number
    savingsRate: number
    spendingTrend: "up" | "down" | "stable"
    budgetsOverLimit: number
    activeGoals: number
    upcomingBills: number
  }
  generatedAt: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  if (score >= 40) return "text-orange-600"
  return "text-red-600"
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30"
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30"
  if (score >= 40) return "bg-orange-100 dark:bg-orange-900/30"
  return "bg-red-100 dark:bg-red-900/30"
}

function getPriorityBadge(priority: "high" | "medium" | "low") {
  switch (priority) {
    case "high":
      return <Badge variant="destructive" className="text-xs">High</Badge>
    case "medium":
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium</Badge>
    case "low":
      return <Badge variant="outline" className="text-xs">Low</Badge>
  }
}

function getTrendIcon(trend: "up" | "down" | "stable") {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-3 w-3 text-red-500" />
    case "down":
      return <TrendingDown className="h-3 w-3 text-green-500" />
    default:
      return <ArrowRight className="h-3 w-3 text-gray-500" />
  }
}

export function AIInsightsWidget() {
  const [data, setData] = useState<AIInsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/ai-insights")
      if (!response.ok) {
        throw new Error("Failed to fetch insights")
      }
      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32 md:col-span-3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchInsights}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="col-span-full bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">AI Financial Insights</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchInsights}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh insights</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <CardDescription>
          Powered by AI analysis of your financial data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 lg:w-fit">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs">Predictions</TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">Patterns</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {/* Health Score */}
              <div className={cn(
                "p-4 rounded-lg border",
                getScoreBgColor(data.healthScore.score)
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Health Score</span>
                  <Badge variant="outline" className={cn("text-lg font-bold", getScoreColor(data.healthScore.score))}>
                    {data.healthScore.grade}
                  </Badge>
                </div>
                <div className={cn("text-4xl font-bold mb-2", getScoreColor(data.healthScore.score))}>
                  {data.healthScore.score}
                </div>
                <Progress value={data.healthScore.score} className="h-2 mb-3" />
                <div className="space-y-1">
                  {data.healthScore.factors.slice(0, 3).map((factor, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {factor}
                    </p>
                  ))}
                </div>
              </div>

              {/* Proactive Insights */}
              <div className="md:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Key Insights
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {data.proactiveInsights.length} insights
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.proactiveInsights.slice(0, 6).map((insight, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-lg border text-sm",
                        insight.priority === "high" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
                        insight.priority === "medium" && "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30",
                        insight.priority === "low" && "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        {getPriorityBadge(insight.priority)}
                      </div>
                      <p className="text-xs">{insight.message}</p>
                      {insight.action && (
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-1">
                          {insight.action} <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Stats Row */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Savings Rate</span>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  data.summary.savingsRate >= 20 ? "text-green-600" : data.summary.savingsRate >= 10 ? "text-yellow-600" : "text-red-600"
                )}>
                  {data.summary.savingsRate}%
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Spending Trend</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(data.summary.spendingTrend)}
                  <span className="text-xl font-bold capitalize">{data.summary.spendingTrend}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Active Goals</span>
                </div>
                <p className="text-xl font-bold">{data.summary.activeGoals}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Upcoming Bills</span>
                </div>
                <p className="text-xl font-bold">{data.summary.upcomingBills}</p>
              </div>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Expense Predictions */}
              <div className="p-4 rounded-lg border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4" />
                  Expense Forecast
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Projected Monthly</span>
                    <span className="text-lg font-bold">{formatCurrency(data.expensePredictions.projectedMonthlyTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Daily Average</span>
                    <span className="font-medium">{formatCurrency(data.expensePredictions.dailyAverage)}/day</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Weekly Projection</span>
                    <span className="font-medium">{formatCurrency(data.expensePredictions.weeklyPrediction)}/week</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground mb-2">By Category</p>
                    {data.expensePredictions.projectedByCategory.slice(0, 3).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(cat.trend)}
                          <span className="text-sm">{cat.category}</span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(cat.projected)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cash Flow Forecast */}
              <div className="p-4 rounded-lg border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Wallet className="h-4 w-4" />
                  30-Day Cash Flow
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Projected Balance</span>
                    <span className={cn(
                      "text-lg font-bold",
                      data.cashFlowForecast.projectedBalance30Days >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(data.cashFlowForecast.projectedBalance30Days)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-green-50 dark:bg-green-900/20">
                      <p className="text-xs text-muted-foreground">Expected Inflows</p>
                      <p className="text-sm font-medium text-green-600">+{formatCurrency(data.cashFlowForecast.upcomingInflows)}</p>
                    </div>
                    <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
                      <p className="text-xs text-muted-foreground">Expected Outflows</p>
                      <p className="text-sm font-medium text-red-600">-{formatCurrency(data.cashFlowForecast.upcomingOutflows)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">{data.cashFlowForecast.insight}</p>
                </div>
              </div>

              {/* Goal Predictions */}
              {data.goalPredictions.length > 0 && (
                <div className="p-4 rounded-lg border md:col-span-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4" />
                    Goal Progress Predictions
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.goalPredictions.slice(0, 3).map((pred, i) => (
                      <div key={i} className={cn(
                        "p-3 rounded-lg border",
                        pred.onTrack ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{pred.goal.name}</span>
                          {pred.onTrack ? (
                            <Badge variant="outline" className="text-xs text-green-600">On Track</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-yellow-600">Needs Attention</Badge>
                          )}
                        </div>
                        <Progress
                          value={(pred.goal.current_amount / pred.goal.target_amount) * 100}
                          className="h-1.5 mb-2"
                        />
                        <p className="text-xs text-muted-foreground">{pred.insight}</p>
                        {pred.requiredMonthly > 0 && (
                          <p className="text-xs font-medium mt-1">
                            Need: {formatCurrency(pred.requiredMonthly)}/month
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Spending Patterns */}
              <div className="p-4 rounded-lg border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4" />
                  Spending Patterns
                </h4>
                <p className="text-xs text-muted-foreground mb-3">{data.spendingPatterns.insight}</p>
                <div className="space-y-2">
                  <p className="text-xs font-medium">By Day of Week</p>
                  {Object.entries(data.spendingPatterns.dayOfWeek)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([day, amount]) => (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm">{day}</span>
                        <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                </div>
                <div className="border-t mt-3 pt-3">
                  <p className="text-xs font-medium mb-2">By Time of Month</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted">
                      <p className="text-xs text-muted-foreground">Early</p>
                      <p className="text-sm font-medium">{formatCurrency(data.spendingPatterns.timeOfMonth.early)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <p className="text-xs text-muted-foreground">Mid</p>
                      <p className="text-sm font-medium">{formatCurrency(data.spendingPatterns.timeOfMonth.mid)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <p className="text-xs text-muted-foreground">Late</p>
                      <p className="text-sm font-medium">{formatCurrency(data.spendingPatterns.timeOfMonth.late)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Audit */}
              <div className="p-4 rounded-lg border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4" />
                  Subscription Audit
                </h4>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-muted-foreground">Monthly Total</span>
                  <span className="text-lg font-bold">{formatCurrency(data.subscriptionAudit.totalMonthly)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-muted-foreground">Annual Cost</span>
                  <span className="font-medium text-red-600">{formatCurrency(data.subscriptionAudit.totalAnnual)}/year</span>
                </div>
                {data.subscriptionAudit.identified.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    {data.subscriptionAudit.identified.slice(0, 4).map((sub, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate">{sub.name}</span>
                        <span className="font-medium">{formatCurrency(sub.amount)}/{sub.frequency.charAt(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {data.subscriptionAudit.suggestions.length > 0 && (
                  <div className="mt-3 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">{data.subscriptionAudit.suggestions[0]}</p>
                  </div>
                )}
              </div>

              {/* Bill Impact */}
              <div className="p-4 rounded-lg border md:col-span-2">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" />
                  Bill Impact Analysis
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Bills</p>
                    <p className="text-xl font-bold">{formatCurrency(data.billImpact.totalMonthlyBills)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.billImpact.percentageOfIncome.toFixed(1)}% of income
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    {data.billImpact.upcomingImpact.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Upcoming (7 days)</p>
                        {data.billImpact.upcomingImpact.slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{item.bill.name}</span>
                            <span className="font-medium">{formatCurrency(item.impact)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {data.billImpact.recommendations.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {data.billImpact.recommendations[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Predictive Spending Alerts */}
              {data.predictiveAlerts.length > 0 && (
                <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Predictive Spending Alerts
                  </h4>
                  <div className="space-y-3">
                    {data.predictiveAlerts.slice(0, 4).map((alert, i) => (
                      <div key={i} className="p-2 rounded bg-white dark:bg-background border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{alert.category}</span>
                          {alert.daysUntilExceed !== null && (
                            <Badge variant="destructive" className="text-xs">
                              ~{alert.daysUntilExceed} days
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current: {formatCurrency(alert.currentSpent)} / Budget: {formatCurrency(alert.budget)}
                        </div>
                        <div className="text-xs">
                          Projected: <span className="font-medium text-red-600">{formatCurrency(alert.projectedTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {data.anomalies.count > 0 && (
                <div className="p-4 rounded-lg border">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4" />
                    Unusual Transactions ({data.anomalies.count})
                  </h4>
                  <div className="space-y-2">
                    {data.anomalies.items.slice(0, 4).map((anomaly, i) => (
                      <div key={i} className={cn(
                        "p-2 rounded border",
                        anomaly.severity === "high" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
                        anomaly.severity === "medium" && "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30",
                        anomaly.severity === "low" && "border-gray-200"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{formatCurrency(Math.abs(anomaly.transaction.amount))}</span>
                          <span className="text-xs text-muted-foreground">{anomaly.transaction.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{anomaly.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {data.duplicates.count > 0 && (
                <div className="p-4 rounded-lg border">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Copy className="h-4 w-4" />
                    Potential Duplicates ({data.duplicates.count})
                  </h4>
                  <div className="space-y-2">
                    {data.duplicates.items.slice(0, 3).map((dup, i) => (
                      <div key={i} className="p-2 rounded border bg-muted/50">
                        <p className="text-xs">{dup.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Alerts */}
              {data.predictiveAlerts.length === 0 && data.anomalies.count === 0 && data.duplicates.count === 0 && (
                <div className="p-8 rounded-lg border md:col-span-2 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <h4 className="text-lg font-medium">All Clear!</h4>
                  <p className="text-sm text-muted-foreground">No alerts or unusual activity detected.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
