"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import type { NetWorthData } from "@/app/api/chart-data/route"

interface NetWorthChartProps {
  months?: number
  className?: string
}

export function NetWorthChart({ months = 12, className }: NetWorthChartProps) {
  const [data, setData] = useState<NetWorthData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/chart-data?type=net-worth&months=${months}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch net worth history:", error)
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
            <Wallet className="h-4 w-4" />
            Net Worth Over Time
          </CardTitle>
          <CardDescription>Track your financial progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No transaction history available
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentBalance = data[data.length - 1]?.balance || 0
  const startBalance = data[0]?.balance || 0
  const change = currentBalance - startBalance
  const changePercent = startBalance !== 0 ? Math.round((change / Math.abs(startBalance)) * 100) : 0

  // Determine gradient colors based on current balance
  const gradientId = "netWorthGradient"
  const lineColor = currentBalance >= 0 ? "#22c55e" : "#ef4444"
  const gradientColorStart = currentBalance >= 0 ? "#22c55e" : "#ef4444"
  const gradientColorEnd = currentBalance >= 0 ? "#dcfce7" : "#fee2e2"

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4" />
          Net Worth Over Time
        </CardTitle>
        <CardDescription>
          {change >= 0 ? "+" : ""}{formatCurrency(change)} ({changePercent >= 0 ? "+" : ""}{changePercent}%)
          over {months} months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColorStart} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientColorEnd} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => {
                if (Math.abs(value) >= 1000) {
                  return `$${(value / 1000).toFixed(0)}k`
                }
                return `$${value}`
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const balance = payload[0].value as number
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-medium">{label}</p>
                      <p className={`text-sm ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        Balance: {formatCurrency(balance)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
