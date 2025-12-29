"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, TrendingUp, TrendingDown, Minus, Download } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  type BudgetVsActualReport as ReportType,
  type BudgetStatus,
  formatCurrency,
  getBudgetStatusColor,
} from "@/lib/validators/budget"
import { cn } from "@/lib/utils"

type DateRange = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "ytd" | "custom"

function getDateRange(range: DateRange): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (range) {
    case "this_month": {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      }
    }
    case "last_month": {
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0)
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      }
    }
    case "last_3_months": {
      const start = new Date(year, month - 2, 1)
      const end = new Date(year, month + 1, 0)
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      }
    }
    case "last_6_months": {
      const start = new Date(year, month - 5, 1)
      const end = new Date(year, month + 1, 0)
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      }
    }
    case "ytd": {
      const start = new Date(year, 0, 1)
      const end = now
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      }
    }
    default:
      return getDateRange("this_month")
  }
}

const STATUS_COLORS: Record<BudgetStatus, string> = {
  safe: "#22c55e",
  warning: "#eab308",
  over: "#ef4444",
}

export function BudgetVsActualReport() {
  const [report, setReport] = useState<ReportType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>("this_month")

  const fetchReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { start, end } = getDateRange(dateRange)
      const response = await fetch(
        `/api/budgets/report?start_date=${start}&end_date=${end}`
      )

      if (!response.ok) {
        throw new Error("Failed to fetch report")
      }

      const data = await response.json()
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExport = () => {
    if (!report) return

    const csvContent = [
      ["Category", "Budgeted", "Actual", "Variance", "Variance %", "Status"],
      ...report.items.map((item) => [
        item.category_name,
        item.budgeted.toFixed(2),
        item.actual.toFixed(2),
        item.variance.toFixed(2),
        item.variance_percentage.toFixed(1) + "%",
        item.status,
      ]),
      [],
      ["Total", report.summary.total_budgeted.toFixed(2), report.summary.total_actual.toFixed(2), report.summary.total_variance.toFixed(2), "", report.summary.overall_status],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `budget-vs-actual-${report.period.start}-to-${report.period.end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mx-auto mt-4 block"
            onClick={fetchReport}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!report || report.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Budget vs Actual Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No budget data available for this period.
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = report.items.map((item) => ({
    name: item.category_name.length > 12
      ? item.category_name.substring(0, 12) + "..."
      : item.category_name,
    fullName: item.category_name,
    budgeted: item.budgeted,
    actual: item.actual,
    variance: item.variance,
    status: item.status,
  }))

  const summaryColors = getBudgetStatusColor(report.summary.overall_status)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Budget vs Actual Report
            </CardTitle>
            <CardDescription>
              Compare your budgeted amounts with actual spending
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={dateRange}
              onValueChange={(value) => setDateRange(value as DateRange)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Budgeted</p>
            <p className="text-2xl font-bold">
              {formatCurrency(report.summary.total_budgeted)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold">
              {formatCurrency(report.summary.total_actual)}
            </p>
          </div>
          <div className={cn("rounded-lg border p-4", summaryColors.bg)}>
            <p className="text-sm text-muted-foreground">Variance</p>
            <div className="flex items-center gap-2">
              <p className={cn("text-2xl font-bold", summaryColors.text)}>
                {formatCurrency(Math.abs(report.summary.total_variance))}
              </p>
              {report.summary.total_variance > 0 ? (
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  Under
                </Badge>
              ) : report.summary.total_variance < 0 ? (
                <Badge variant="outline" className="bg-red-100 text-red-700">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Over
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Minus className="mr-1 h-3 w-3" />
                  On Target
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `$${value}`} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  name === "budgeted" ? "Budgeted" : "Actual",
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName
                  }
                  return label
                }}
              />
              <Legend />
              <Bar dataKey="budgeted" name="Budgeted" fill="#94a3b8" />
              <Bar dataKey="actual" name="Actual">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Category</th>
                <th className="py-2 text-right font-medium">Budgeted</th>
                <th className="py-2 text-right font-medium">Actual</th>
                <th className="py-2 text-right font-medium">Variance</th>
                <th className="py-2 text-right font-medium">%</th>
                <th className="py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => {
                const statusColors = getBudgetStatusColor(item.status)
                return (
                  <tr key={item.category_id} className="border-b">
                    <td className="py-2">{item.category_name}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(item.budgeted)}
                    </td>
                    <td className="py-2 text-right">
                      {formatCurrency(item.actual)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-medium",
                        item.variance > 0
                          ? "text-green-600"
                          : item.variance < 0
                          ? "text-red-600"
                          : ""
                      )}
                    >
                      {item.variance > 0 ? "+" : ""}
                      {formatCurrency(item.variance)}
                    </td>
                    <td className="py-2 text-right">
                      {item.variance_percentage.toFixed(1)}%
                    </td>
                    <td className="py-2 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          statusColors.bg,
                          statusColors.text
                        )}
                      >
                        {item.status === "safe"
                          ? "On Track"
                          : item.status === "warning"
                          ? "Warning"
                          : "Over"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
