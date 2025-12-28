"use client"

import {
  SpendingTrendChart,
  CategoryBreakdownChart,
  IncomeVsExpenseChart,
  NetWorthChart,
  DailySpendingSparklineCard,
  CashFlowWaterfall,
  CategoryTrendsChart,
  BudgetGaugeChart,
  BudgetComparisonChart,
  BudgetHeatmap,
  GoalTimelineChart,
  GoalContributionChart,
  BillCalendar,
  MonthlyBillsChart,
  BillTimeline,
} from "@/components/charts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Target,
  Receipt,
} from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive visualizations of your financial data
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4 hidden sm:block" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="spending" className="gap-2">
            <TrendingUp className="h-4 w-4 hidden sm:block" />
            Spending
          </TabsTrigger>
          <TabsTrigger value="budgets" className="gap-2">
            <Wallet className="h-4 w-4 hidden sm:block" />
            Budgets
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4 hidden sm:block" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-2">
            <Receipt className="h-4 w-4 hidden sm:block" />
            Bills
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SpendingTrendChart months={6} />
            <CategoryBreakdownChart />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <IncomeVsExpenseChart months={6} />
            <NetWorthChart months={12} />
          </div>
        </TabsContent>

        {/* Spending Tab */}
        <TabsContent value="spending" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SpendingTrendChart months={12} />
            <CashFlowWaterfall />
          </div>
          <CategoryTrendsChart months={6} />
          <div className="grid gap-6 lg:grid-cols-3">
            <CategoryBreakdownChart />
            <div className="lg:col-span-2">
              <NetWorthChart months={12} />
            </div>
          </div>
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <BudgetGaugeChart />
            <BudgetComparisonChart />
          </div>
          <BudgetHeatmap />
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <GoalTimelineChart />
            <GoalContributionChart months={12} />
          </div>
        </TabsContent>

        {/* Bills Tab */}
        <TabsContent value="bills" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlyBillsChart />
            <BillTimeline days={30} />
          </div>
          <BillCalendar />
        </TabsContent>
      </Tabs>
    </div>
  )
}
