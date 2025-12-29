"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import { cn } from "@/lib/utils"
import { format, startOfMonth, getDay, addDays } from "date-fns"
import type { HeatmapData } from "@/app/api/chart-data/route"

interface BudgetHeatmapProps {
  className?: string
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function BudgetHeatmap({ className }: BudgetHeatmapProps) {
  const [data, setData] = useState<HeatmapData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/chart-data?type=spending-heatmap")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch heatmap data:", error)
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
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Spending Heatmap
          </CardTitle>
          <CardDescription>Daily spending intensity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No spending data for this month
          </div>
        </CardContent>
      </Card>
    )
  }

  const now = new Date()
  const monthStart = startOfMonth(now)
  const startDayOfWeek = getDay(monthStart)
  const totalSpent = data.reduce((sum, d) => sum + d.amount, 0)
  const avgDaily = data.length > 0 ? totalSpent / data.filter(d => d.amount > 0).length : 0

  // Create calendar grid (6 weeks max)
  const weeks: (HeatmapData | null)[][] = []
  let currentWeek: (HeatmapData | null)[] = []

  // Add empty cells for days before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null)
  }

  // Add data cells
  data.forEach((day, index) => {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  // Fill remaining cells in last week
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push(null)
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-muted hover:bg-muted/80"
      case 1:
        return "bg-red-100 dark:bg-red-950/30 hover:bg-red-200 dark:hover:bg-red-950/50"
      case 2:
        return "bg-red-300 dark:bg-red-900/50 hover:bg-red-400 dark:hover:bg-red-900/70"
      case 3:
        return "bg-red-500 dark:bg-red-700 hover:bg-red-600 dark:hover:bg-red-600"
      case 4:
        return "bg-red-700 dark:bg-red-500 hover:bg-red-800 dark:hover:bg-red-400"
      default:
        return "bg-muted"
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          Spending Heatmap
        </CardTitle>
        <CardDescription>
          {format(now, "MMMM yyyy")} - Total: {formatCurrency(totalSpent)} | Avg: {formatCurrency(avgDaily || 0)}/day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="aspect-square"
                >
                  {day ? (
                    <div
                      className={cn(
                        "w-full h-full rounded-sm flex items-center justify-center text-xs cursor-default transition-colors relative group",
                        getLevelColor(day.level)
                      )}
                      title={`${format(new Date(day.date), "MMM d")}: ${formatCurrency(day.amount)}`}
                    >
                      <span className="text-[10px] opacity-70">
                        {new Date(day.date).getDate()}
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="bg-popover text-popover-foreground text-xs rounded-md border px-2 py-1 shadow-md whitespace-nowrap">
                          <p className="font-medium">{format(new Date(day.date), "MMM d")}</p>
                          <p>{formatCurrency(day.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn("w-3 h-3 rounded-sm", getLevelColor(level))}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
