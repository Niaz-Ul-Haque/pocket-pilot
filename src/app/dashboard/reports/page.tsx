"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Store,
  FolderOpen,
  PiggyBank,
  FileText,
  Download,
  ArrowUpDown,
  Minus,
  AlertCircle,
} from "lucide-react"
import {
  type CustomDateRangeReport,
  type YearOverYearReport,
  type MerchantReport,
  type CategoryDeepDiveReport,
  type MonthlySummaryReport,
  type SavingsRateReport,
  type TaxSummaryReport,
  formatCurrency,
  formatPercentage,
  getDefaultDateRange,
  getDefaultYears,
  getTrendColor,
  getSavingsRateColor,
  getMonthName,
} from "@/lib/validators/reports"
import { cn } from "@/lib/utils"

// Import Recharts components
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("date-range")

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Comprehensive financial reports and analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="date-range" className="gap-2">
            <Calendar className="h-4 w-4 hidden sm:block" />
            Date Range
          </TabsTrigger>
          <TabsTrigger value="year-over-year" className="gap-2">
            <ArrowUpDown className="h-4 w-4 hidden sm:block" />
            Year vs Year
          </TabsTrigger>
          <TabsTrigger value="merchant" className="gap-2">
            <Store className="h-4 w-4 hidden sm:block" />
            Merchant
          </TabsTrigger>
          <TabsTrigger value="category" className="gap-2">
            <FolderOpen className="h-4 w-4 hidden sm:block" />
            Category
          </TabsTrigger>
          <TabsTrigger value="savings" className="gap-2">
            <PiggyBank className="h-4 w-4 hidden sm:block" />
            Savings Rate
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <FileText className="h-4 w-4 hidden sm:block" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-2">
            <FileText className="h-4 w-4 hidden sm:block" />
            Tax
          </TabsTrigger>
        </TabsList>

        <TabsContent value="date-range">
          <CustomDateRangeReportSection />
        </TabsContent>

        <TabsContent value="year-over-year">
          <YearOverYearReportSection />
        </TabsContent>

        <TabsContent value="merchant">
          <MerchantReportSection />
        </TabsContent>

        <TabsContent value="category">
          <CategoryDeepDiveSection />
        </TabsContent>

        <TabsContent value="savings">
          <SavingsRateSection />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlySummarySection />
        </TabsContent>

        <TabsContent value="tax">
          <TaxSummarySection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Custom Date Range Report Section
function CustomDateRangeReportSection() {
  const defaultDates = getDefaultDateRange()
  const [startDate, setStartDate] = useState(defaultDates.start_date)
  const [endDate, setEndDate] = useState(defaultDates.end_date)
  const [report, setReport] = useState<CustomDateRangeReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateReport = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "custom_date_range",
          start_date: startDate,
          end_date: endDate,
          include_categories: true,
          include_accounts: true,
        }),
      })
      if (!response.ok) throw new Error("Failed to generate report")
      const data = await response.json()
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Date Range Report</CardTitle>
          <CardDescription>Analyze transactions for any date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={generateReport} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {report && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Income</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(report.summary.total_income)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Expenses</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {formatCurrency(report.summary.total_expenses)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net Flow</CardDescription>
                <CardTitle className={cn("text-2xl", report.summary.net_flow >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(report.summary.net_flow)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Daily Spending</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(report.summary.avg_daily_spending)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={report.by_category.slice(0, 8)}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name }) => name}
                    >
                      {report.by_category.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Spending */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={report.daily_spending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Table */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.by_category.map((cat) => (
                    <TableRow key={cat.category_id || "uncategorized"}>
                      <TableCell className="font-medium">{cat.category_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                      <TableCell className="text-right">{cat.transaction_count}</TableCell>
                      <TableCell className="text-right">{formatPercentage(cat.percentage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Year-Over-Year Report Section
function YearOverYearReportSection() {
  const defaultYears = getDefaultYears()
  const [year1, setYear1] = useState(defaultYears.year1.toString())
  const [year2, setYear2] = useState(defaultYears.year2.toString())
  const [compareBy, setCompareBy] = useState<"month" | "quarter">("month")
  const [report, setReport] = useState<YearOverYearReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "year_over_year",
          year1: parseInt(year1),
          year2: parseInt(year2),
          compare_by: compareBy,
        }),
      })
      if (!response.ok) throw new Error("Failed to generate report")
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Year-Over-Year Comparison</CardTitle>
          <CardDescription>Compare financial data between two years</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Year 1</Label>
              <Input
                type="number"
                value={year1}
                onChange={(e) => setYear1(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Year 2</Label>
              <Input
                type="number"
                value={year2}
                onChange={(e) => setYear2(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Compare By</Label>
              <Select value={compareBy} onValueChange={(v) => setCompareBy(v as "month" | "quarter")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && !isLoading && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{report.year1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Income:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(report.summary.year1_income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expenses:</span>
                  <span className="text-red-600 font-medium">{formatCurrency(report.summary.year1_expenses)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{report.year2}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Income:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(report.summary.year2_income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expenses:</span>
                  <span className="text-red-600 font-medium">{formatCurrency(report.summary.year2_expenses)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.periods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period_label" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="year1_expenses" name={report.year1.toString()} fill="#94a3b8" />
                  <Bar dataKey="year2_expenses" name={report.year2.toString()} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Changes */}
          <Card>
            <CardHeader>
              <CardTitle>Category Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">{report.year1}</TableHead>
                    <TableHead className="text-right">{report.year2}</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.categories.slice(0, 10).map((cat) => (
                    <TableRow key={cat.category_id || "uncategorized"}>
                      <TableCell>{cat.category_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cat.year1_total)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cat.year2_total)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(cat.change >= 0 ? "text-red-600" : "text-green-600")}>
                          {cat.change >= 0 ? "+" : ""}{formatPercentage(cat.change_percent)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Merchant Report Section
function MerchantReportSection() {
  const defaultDates = getDefaultDateRange()
  const [startDate, setStartDate] = useState(defaultDates.start_date)
  const [endDate, setEndDate] = useState(defaultDates.end_date)
  const [report, setReport] = useState<MerchantReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "merchant",
          start_date: startDate,
          end_date: endDate,
          min_transactions: 1,
          limit: 50,
        }),
      })
      if (!response.ok) throw new Error("Failed to generate report")
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Merchant Spending Report</CardTitle>
          <CardDescription>See where you spend money most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={generateReport} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && !isLoading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Top Merchants</CardTitle>
              <CardDescription>Total spending: {formatCurrency(report.total_spending)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Avg</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.merchants.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{m.merchant_name}</span>
                          {m.category_name && (
                            <span className="block text-xs text-muted-foreground">{m.category_name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(m.total)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.avg_transaction)}</TableCell>
                      <TableCell className="text-right">{m.transaction_count}</TableCell>
                      <TableCell className="text-right">{formatPercentage(m.percentage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Category Deep Dive Section
function CategoryDeepDiveSection() {
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [months, setMonths] = useState("12")
  const [report, setReport] = useState<CategoryDeepDiveReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch categories on mount
  useState(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.filter((c: { type: string }) => c.type === "expense")))
      .catch(console.error)
  })

  const generateReport = async () => {
    if (!categoryId) return
    setIsLoading(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "category_deep_dive",
          category_id: categoryId,
          months: parseInt(months),
        }),
      })
      if (!response.ok) throw new Error("Failed to generate report")
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Category Deep Dive</CardTitle>
          <CardDescription>Detailed analysis of a single category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[200px]">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Months</Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={isLoading || !categoryId}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && !isLoading && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Spent</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(report.summary.total)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Transaction</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(report.summary.avg_transaction)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Monthly Avg</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(report.insights.avg_monthly)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Trend</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {report.insights.trend === "increasing" ? (
                    <TrendingUp className="h-5 w-5 text-red-500" />
                  ) : report.insights.trend === "decreasing" ? (
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  ) : (
                    <Minus className="h-5 w-5" />
                  )}
                  {formatPercentage(Math.abs(report.insights.trend_percentage))}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend - {report.category_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={report.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Anomalies */}
          {report.anomalies.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Unusual Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.anomalies.map((a) => (
                      <TableRow key={a.transaction_id}>
                        <TableCell>{a.date}</TableCell>
                        <TableCell>{a.description}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(a.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Savings Rate Section
function SavingsRateSection() {
  const [months, setMonths] = useState("12")
  const [report, setReport] = useState<SavingsRateReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "savings_rate",
          months: parseInt(months),
        }),
      })
      if (!response.ok) throw new Error("Failed to generate report")
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Savings Rate Dashboard</CardTitle>
          <CardDescription>Track how much of your income you&apos;re saving</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Period (Months)</Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && !isLoading && (
        <>
          {/* Overall Savings Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={cn("text-5xl font-bold", getSavingsRateColor(report.overall.savings_rate).text)}>
                  {formatPercentage(report.overall.savings_rate)}
                </div>
                <p className="text-muted-foreground mt-2">
                  {formatCurrency(report.overall.total_savings)} saved of {formatCurrency(report.overall.total_income)} income
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  {report.trend.direction === "improving" && (
                    <Badge className="bg-green-500">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Improving
                    </Badge>
                  )}
                  {report.trend.direction === "declining" && (
                    <Badge className="bg-red-500">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Declining
                    </Badge>
                  )}
                  {report.trend.direction === "stable" && (
                    <Badge variant="secondary">
                      <Minus className="h-3 w-3 mr-1" />
                      Stable
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Bar dataKey="savings_rate" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Best/Worst Months */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardDescription>Best Month</CardDescription>
                <CardTitle className="text-green-600">{report.trend.best_month}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatPercentage(report.trend.best_rate)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardDescription>Worst Month</CardDescription>
                <CardTitle className="text-red-600">{report.trend.worst_month}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatPercentage(report.trend.worst_rate)}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// Monthly Summary Section
function MonthlySummarySection() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear().toString())
  const [month, setMonth] = useState((today.getMonth() + 1).toString())
  const [report, setReport] = useState<MonthlySummaryReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "monthly_summary",
          year: parseInt(year),
          month: parseInt(month),
        }),
      })
      if (!response.ok) throw new Error("Failed to generate report")
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Summary</CardTitle>
          <CardDescription>Comprehensive view of a single month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {getMonthName(i + 1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-24"
              />
            </div>
            <Button onClick={generateReport} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && !isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Income</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(report.summary.total_income)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("text-sm", report.comparison_to_previous.income_change >= 0 ? "text-green-600" : "text-red-600")}>
                  {report.comparison_to_previous.income_change >= 0 ? "+" : ""}
                  {formatPercentage(report.comparison_to_previous.income_change_percent)} vs last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Expenses</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {formatCurrency(report.summary.total_expenses)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("text-sm", report.comparison_to_previous.expenses_change <= 0 ? "text-green-600" : "text-red-600")}>
                  {report.comparison_to_previous.expenses_change >= 0 ? "+" : ""}
                  {formatPercentage(report.comparison_to_previous.expenses_change_percent)} vs last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Savings Rate</CardDescription>
                <CardTitle className={cn("text-2xl", getSavingsRateColor(report.summary.savings_rate).text)}>
                  {formatPercentage(report.summary.savings_rate)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Transactions</CardDescription>
                <CardTitle className="text-2xl">
                  {report.summary.transaction_count}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Budget Status */}
          {report.budget_status.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Budget Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.budget_status.map((b) => (
                  <div key={b.category_id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{b.category_name}</span>
                      <span className={cn(b.percentage_used > 100 ? "text-red-600" : "text-muted-foreground")}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.budget_amount)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(b.percentage_used, 100)}
                      className={cn(b.percentage_used > 100 && "[&>div]:bg-red-500")}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Tax Summary Section
function TaxSummarySection() {
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString())
  const [report, setReport] = useState<TaxSummaryReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: "tax_summary",
          tax_year: parseInt(taxYear),
        }),
      })
      if (!response.ok) throw new Error("Failed to generate report")
      const data = await response.json()
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!report) return

    const rows: string[] = ["Type,Category,Amount"]

    report.income.by_category.forEach((c) => {
      rows.push(`Income,${c.category_name},${c.total}`)
    })

    report.deductions.by_category.forEach((c) => {
      rows.push(`Deduction,${c.category_name},${c.total}`)
    })

    report.charitable_donations.transactions.forEach((t) => {
      rows.push(`Charitable,${t.description},${t.amount}`)
    })

    const csv = rows.join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tax-summary-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Summary</CardTitle>
          <CardDescription>Income and potential deductions summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Tax Year</Label>
              <Input
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                className="w-24"
              />
            </div>
            <Button onClick={generateReport} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
            {report && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {report && !isLoading && (
        <>
          {/* Disclaimer */}
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                {report.disclaimer}
              </p>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Income</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(report.income.total)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Potential Deductions</CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {formatCurrency(report.deductions.total)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Charitable Donations</CardDescription>
                <CardTitle className="text-2xl text-purple-600">
                  {formatCurrency(report.charitable_donations.total)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Quarterly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={report.quarterly_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#16a34a" />
                  <Bar dataKey="deductions" name="Deductions" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Income by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Income by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.income.by_category.map((c) => (
                    <TableRow key={c.category_id || "uncategorized"}>
                      <TableCell>{c.category_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
