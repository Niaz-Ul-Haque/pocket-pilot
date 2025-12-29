"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowDownUp } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import type { WaterfallData } from "@/app/api/chart-data/route"

interface CashFlowWaterfallProps {
  className?: string
}

export function CashFlowWaterfall({ className }: CashFlowWaterfallProps) {
  const [data, setData] = useState<WaterfallData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/chart-data?type=cash-flow-waterfall")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch waterfall data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownUp className="h-4 w-4" />
            Cash Flow Waterfall
          </CardTitle>
          <CardDescription>Income to expenses breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No transaction data for this month
          </div>
        </CardContent>
      </Card>
    )
  }

  const income = data.find(d => d.type === "income")?.value || 0
  const net = data.find(d => d.type === "net")?.value || 0
  const expenses = income - net

  // Transform data for waterfall visualization
  // We need to calculate cumulative values for the waterfall effect
  const waterfallData = data.map((item, index) => {
    if (item.type === "income") {
      return { ...item, start: 0, end: item.value }
    }
    if (item.type === "net") {
      return { ...item, start: 0, end: item.value }
    }
    // For expenses, calculate running total
    const prevExpenses = data
      .slice(1, index)
      .filter(d => d.type === "expense")
      .reduce((sum, d) => sum + Math.abs(d.value), 0)
    const start = income - prevExpenses
    const end = start - Math.abs(item.value)
    return { ...item, start, end, displayValue: Math.abs(item.value) }
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowDownUp className="h-4 w-4" />
          Cash Flow Waterfall
        </CardTitle>
        <CardDescription>
          {formatCurrency(income)} income - {formatCurrency(expenses)} expenses = {formatCurrency(net)} net
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={waterfallData}
            margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as WaterfallData & { displayValue?: number }
                  const displayValue = item.displayValue || Math.abs(item.value)
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-medium">{item.name}</p>
                      <p
                        className="text-sm"
                        style={{ color: item.fill }}
                      >
                        {item.type === "expense" ? "-" : ""}
                        {formatCurrency(displayValue)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(income)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(expenses)}
            </p>
          </div>
          <div className={`text-center p-3 rounded-lg ${net >= 0 ? "bg-blue-50 dark:bg-blue-950/30" : "bg-orange-50 dark:bg-orange-950/30"}`}>
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`text-lg font-semibold ${net >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
              {net >= 0 ? "+" : ""}{formatCurrency(net)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
