"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import { cn } from "@/lib/utils"
import { format, parseISO, differenceInDays } from "date-fns"
import type { GoalTimelineData } from "@/app/api/chart-data/route"

interface GoalTimelineChartProps {
  className?: string
}

export function GoalTimelineChart({ className }: GoalTimelineChartProps) {
  const [data, setData] = useState<GoalTimelineData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/chart-data?type=goal-timeline")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch goal timeline:", error)
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
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
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
            <Target className="h-4 w-4" />
            Goal Progress Timeline
          </CardTitle>
          <CardDescription>Track your progress towards goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No active goals
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Goal Progress Timeline
        </CardTitle>
        <CardDescription>
          {data.length} active goal{data.length !== 1 ? "s" : ""} in progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((goal) => (
            <GoalTimelineItem key={goal.id} goal={goal} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function GoalTimelineItem({ goal }: { goal: GoalTimelineData }) {
  const isOnTrack = goal.projectedDate && goal.daysRemaining
    ? parseISO(goal.projectedDate) <= new Date(Date.now() + goal.daysRemaining * 24 * 60 * 60 * 1000)
    : null

  const getStatusColor = () => {
    if (goal.percentage >= 100) return "text-green-600 dark:text-green-400"
    if (goal.daysRemaining !== null && goal.daysRemaining <= 0) return "text-red-600 dark:text-red-400"
    if (isOnTrack === false) return "text-yellow-600 dark:text-yellow-400"
    return "text-blue-600 dark:text-blue-400"
  }

  const getStatusBadge = () => {
    if (goal.percentage >= 100) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">Complete</Badge>
    }
    if (goal.daysRemaining !== null && goal.daysRemaining <= 0) {
      return <Badge variant="destructive">Overdue</Badge>
    }
    if (isOnTrack === false) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">Behind</Badge>
    }
    if (isOnTrack === true) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">On Track</Badge>
    }
    return <Badge variant="secondary">In Progress</Badge>
  }

  return (
    <div className="p-4 rounded-lg border space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{goal.name}</h4>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(goal.current)} of {formatCurrency(goal.target)}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className={cn("font-medium", getStatusColor())}>
            {goal.percentage.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">
            {formatCurrency(goal.target - goal.current)} remaining
          </span>
        </div>
        <Progress value={goal.percentage} className="h-2" />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {goal.daysRemaining !== null && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {goal.daysRemaining > 0 ? (
              <span>{goal.daysRemaining} days remaining</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                {Math.abs(goal.daysRemaining)} days overdue
              </span>
            )}
          </div>
        )}
        {goal.projectedDate && (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>
              Projected: {format(parseISO(goal.projectedDate), "MMM d, yyyy")}
            </span>
          </div>
        )}
        {!goal.projectedDate && goal.percentage < 100 && (
          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-3 w-3" />
            <span>Add contributions to see projection</span>
          </div>
        )}
      </div>
    </div>
  )
}
