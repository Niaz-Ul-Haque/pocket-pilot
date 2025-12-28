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
  Legend,
  ReferenceLine,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeftRight } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import type { BudgetComparisonData } from "@/app/api/chart-data/route"

interface BudgetComparisonChartProps {
  className?: string
}

export function BudgetComparisonChart({ className }: BudgetComparisonChartProps) {
  const [data, setData] = useState<BudgetComparisonData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/chart-data?type=budget-comparison")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch budget comparison:", error)
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
            <ArrowLeftRight className="h-4 w-4" />
            Budget Comparison
          </CardTitle>
          <CardDescription>This month vs last month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No budget data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals for description
  const thisMonthTotal = data.reduce((sum, d) => sum + d.thisMonth, 0)
  const lastMonthTotal = data.reduce((sum, d) => sum + d.lastMonth, 0)
  const change = thisMonthTotal - lastMonthTotal
  const changePercent = lastMonthTotal > 0
    ? Math.round((change / lastMonthTotal) * 100)
    : 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRight className="h-4 w-4" />
          Budget Comparison
        </CardTitle>
        <CardDescription>
          {change > 0 ? "Up" : "Down"} {formatCurrency(Math.abs(change))} ({Math.abs(changePercent)}%) from last month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as BudgetComparisonData
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-blue-600">
                        This Month: {formatCurrency(item.thisMonth)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last Month: {formatCurrency(item.lastMonth)}
                      </p>
                      <p className="text-sm text-primary">
                        Budget: {formatCurrency(item.budget)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            <Bar
              dataKey="thisMonth"
              name="This Month"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="lastMonth"
              name="Last Month"
              fill="#94a3b8"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
