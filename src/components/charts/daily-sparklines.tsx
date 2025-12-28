"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/validators/budget"
import type { DailySpendingData } from "@/app/api/chart-data/route"

interface DailySparklineProps {
  className?: string
  height?: number
}

// Small inline sparkline for transaction lists or cards
export function DailySparkline({ className, height = 40 }: DailySparklineProps) {
  const [data, setData] = useState<DailySpendingData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/chart-data?type=daily-spending")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch daily spending:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return <Skeleton className={`h-[${height}px] w-full ${className}`} />
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[${height}px] text-xs text-muted-foreground ${className}`}>
        No data
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0)
  const max = Math.max(...data.map(d => d.amount))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as DailySpendingData
                return (
                  <div className="rounded-md border bg-background px-2 py-1 shadow-sm text-xs">
                    <p className="font-medium">{new Date(item.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</p>
                    <p className="text-muted-foreground">{formatCurrency(item.amount)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#sparklineGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Total: {formatCurrency(total)}</span>
        <span>Max: {formatCurrency(max)}</span>
      </div>
    </div>
  )
}

// Sparkline widget for dashboard
export function DailySpendingSparklineCard({ className }: { className?: string }) {
  return (
    <div className={`p-3 rounded-lg border ${className}`}>
      <p className="text-sm font-medium mb-2">Daily Spending This Month</p>
      <DailySparkline height={60} />
    </div>
  )
}
