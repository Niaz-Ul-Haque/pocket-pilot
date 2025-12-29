"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChartIcon } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import type { CategoryTrendData } from "@/app/api/chart-data/route"

interface CategoryTrendsChartProps {
  categories?: string[]
  months?: number
  className?: string
}

const TREND_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
]

export function CategoryTrendsChart({
  categories = [],
  months = 6,
  className,
}: CategoryTrendsChartProps) {
  const [data, setData] = useState<CategoryTrendData[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        type: "category-trends",
        months: months.toString(),
      })
      if (categories.length > 0) {
        params.set("categories", categories.join(","))
      }
      const res = await fetch(`/api/chart-data?${params}`)
      if (res.ok) {
        const result: CategoryTrendData[] = await res.json()
        setData(result)

        // Extract category names from the first data point
        if (result.length > 0) {
          const names = Object.keys(result[0]).filter(
            key => key !== "month" && key !== "label"
          )
          setCategoryNames(names)
        }
      }
    } catch (error) {
      console.error("Failed to fetch category trends:", error)
    } finally {
      setIsLoading(false)
    }
  }, [categories, months])

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

  if (data.length === 0 || categoryNames.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="h-4 w-4" />
            Category Trends
          </CardTitle>
          <CardDescription>Compare spending across categories over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No category data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChartIcon className="h-4 w-4" />
          Category Trends
        </CardTitle>
        <CardDescription>
          Comparing {categoryNames.length} categories over {months} months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-medium mb-1">{label}</p>
                      {payload.map((entry, index) => (
                        <p
                          key={index}
                          className="text-sm"
                          style={{ color: entry.color }}
                        >
                          {entry.name}: {formatCurrency(entry.value as number)}
                        </p>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            {categoryNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                name={name}
                stroke={TREND_COLORS[index % TREND_COLORS.length]}
                strokeWidth={2}
                dot={{ fill: TREND_COLORS[index % TREND_COLORS.length], strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Category legend with totals */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
          {categoryNames.map((name, index) => {
            const total = data.reduce((sum, d) => sum + ((d[name] as number) || 0), 0)
            const avg = total / data.length
            return (
              <div
                key={name}
                className="p-2 rounded-lg border text-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: TREND_COLORS[index % TREND_COLORS.length] }}
                  />
                  <span className="font-medium truncate">{name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(avg)}/mo
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
