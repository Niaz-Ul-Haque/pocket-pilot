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
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import type { SpendingTrendData } from "@/app/api/chart-data/route"

interface IncomeVsExpenseChartProps {
  months?: number
  className?: string
}

export function IncomeVsExpenseChart({ months = 6, className }: IncomeVsExpenseChartProps) {
  const [data, setData] = useState<SpendingTrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/chart-data?type=spending-trend&months=${months}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch income vs expense data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [months])

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
            <BarChart3 className="h-4 w-4" />
            Income vs Expenses
          </CardTitle>
          <CardDescription>Monthly comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No transaction data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0)
  const avgSavingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
    : 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Income vs Expenses
        </CardTitle>
        <CardDescription>
          {avgSavingsRate >= 0
            ? `Saving ${avgSavingsRate}% on average`
            : `Overspending by ${Math.abs(avgSavingsRate)}% on average`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const income = payload.find(p => p.dataKey === "income")?.value as number || 0
                  const expenses = payload.find(p => p.dataKey === "expenses")?.value as number || 0
                  const net = income - expenses
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-green-600">Income: {formatCurrency(income)}</p>
                      <p className="text-sm text-red-600">Expenses: {formatCurrency(expenses)}</p>
                      <p className={`text-sm font-medium ${net >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                        Net: {formatCurrency(net)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            <Bar
              dataKey="income"
              name="Income"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
