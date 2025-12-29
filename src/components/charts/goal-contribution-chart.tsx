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
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import type { ContributionData } from "@/app/api/chart-data/route"

interface GoalContributionChartProps {
  goalId?: string
  months?: number
  className?: string
}

export function GoalContributionChart({
  goalId,
  months = 6,
  className,
}: GoalContributionChartProps) {
  const [data, setData] = useState<ContributionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        type: "goal-contributions",
        months: months.toString(),
      })
      if (goalId) {
        params.set("goalId", goalId)
      }
      const res = await fetch(`/api/chart-data?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch goal contributions:", error)
    } finally {
      setIsLoading(false)
    }
  }, [goalId, months])

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
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0)
  const avgMonthly = data.length > 0 ? total / data.length : 0

  if (total === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Goal Contributions
          </CardTitle>
          <CardDescription>Monthly contribution history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No contributions recorded yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Goal Contributions
        </CardTitle>
        <CardDescription>
          Total: {formatCurrency(total)} | Avg: {formatCurrency(avgMonthly)}/month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                  const value = payload[0].value as number
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-green-600">
                        Contributed: {formatCurrency(value)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="amount"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
