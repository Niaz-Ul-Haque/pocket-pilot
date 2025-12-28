"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PieChartIcon } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import type { CategoryBreakdownData } from "@/app/api/chart-data/route"

interface CategoryBreakdownChartProps {
  className?: string
}

export function CategoryBreakdownChart({ className }: CategoryBreakdownChartProps) {
  const [data, setData] = useState<CategoryBreakdownData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/chart-data?type=category-breakdown")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch category breakdown:", error)
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
            <PieChartIcon className="h-4 w-4" />
            Category Breakdown
          </CardTitle>
          <CardDescription>Where your money is going this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No expense data for this month
          </div>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-4 w-4" />
          Category Breakdown
        </CardTitle>
        <CardDescription>
          {formatCurrency(total)} spent this month across {data.length} categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} (${Math.round((percent || 0) * 100)}%)`}
              labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as CategoryBreakdownData
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.value)} ({item.percentage}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {data.slice(0, 6).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
              <span className="ml-auto text-muted-foreground">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
