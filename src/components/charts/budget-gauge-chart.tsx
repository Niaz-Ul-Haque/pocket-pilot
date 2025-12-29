"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Gauge } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import { cn } from "@/lib/utils"

interface BudgetGaugeData {
  id: string
  category: string
  spent: number
  budget: number
  percentage: number
}

interface BudgetGaugeChartProps {
  className?: string
}

export function BudgetGaugeChart({ className }: BudgetGaugeChartProps) {
  const [data, setData] = useState<BudgetGaugeData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/budgets")
      if (res.ok) {
        const budgets = await res.json()
        setData(budgets.map((b: { id: string; category_name: string; spent: number; amount: number; percentage: number }) => ({
          id: b.id,
          category: b.category_name,
          spent: b.spent,
          budget: b.amount,
          percentage: Math.min(b.percentage, 100),
        })))
      }
    } catch (error) {
      console.error("Failed to fetch budgets:", error)
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4" />
            Budget Gauges
          </CardTitle>
          <CardDescription>Visual budget utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No budgets set up yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4" />
          Budget Gauges
        </CardTitle>
        <CardDescription>Visualizing budget utilization across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.slice(0, 6).map((item) => (
            <GaugeItem key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function GaugeItem({ item }: { item: BudgetGaugeData }) {
  const getColor = (pct: number) => {
    if (pct >= 100) return "#ef4444" // red
    if (pct >= 90) return "#f59e0b" // amber
    if (pct >= 75) return "#eab308" // yellow
    return "#22c55e" // green
  }

  const color = getColor(item.percentage)
  const chartData = [{ name: item.category, value: item.percentage, fill: color }]

  return (
    <div className="flex flex-col items-center p-2 rounded-lg border">
      <div className="relative w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={8}
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: "hsl(var(--muted))" }}
              dataKey="value"
              cornerRadius={4}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "text-lg font-bold",
              item.percentage >= 100 ? "text-red-600" : "text-foreground"
            )}
          >
            {Math.round(item.percentage)}%
          </span>
        </div>
      </div>
      <p className="text-sm font-medium truncate w-full text-center mt-1">
        {item.category}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
      </p>
    </div>
  )
}
