"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Wallet,
  Target,
  Receipt,
  AlertCircle,
} from "lucide-react"
import type { WeeklySummaryContent } from "@/lib/validators/ai-features"

interface WeeklySummaryCardProps {
  onViewDetails?: () => void
}

export function WeeklySummaryCard({ onViewDetails }: WeeklySummaryCardProps) {
  const [summary, setSummary] = useState<{
    id: string
    content: WeeklySummaryContent
    health_score: number
    highlights: string[]
    recommendations: string[]
    created_at: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async (generate = false) => {
    try {
      if (generate) {
        setGenerating(true)
        const res = await fetch("/api/ai-summary?type=weekly", { method: "POST" })
        const data = await res.json()
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        setLoading(true)
        const res = await fetch("/api/ai-summary?type=weekly&limit=1")
        const data = await res.json()
        if (data.summaries && data.summaries.length > 0) {
          setSummary(data.summaries[0])
        } else {
          // No existing summary, generate one
          const genRes = await fetch("/api/ai-summary?type=weekly", { method: "POST" })
          const genData = await genRes.json()
          if (genData.summary) {
            setSummary(genData.summary)
          }
        }
      }
      setError(null)
    } catch (err) {
      setError("Failed to load summary")
      console.error(err)
    } finally {
      setLoading(false)
      setGenerating(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly Summary
          </CardTitle>
          <CardDescription>Your week at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{error || "No summary available"}</p>
            <Button onClick={() => fetchSummary(true)} disabled={generating}>
              {generating ? "Generating..." : "Generate Summary"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const content = summary.content
  const trend = content.comparison.trend
  const trendPercent = Math.abs(content.comparison.vsLastWeek).toFixed(0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Weekly Summary
            </CardTitle>
            <CardDescription>
              {content.period.start} to {content.period.end}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => fetchSummary(true)} disabled={generating}>
              <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            </Button>
            {onViewDetails && (
              <Button variant="ghost" size="icon" onClick={onViewDetails}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Health Score */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Financial Health</p>
              <p className="text-3xl font-bold">{summary.health_score}</p>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  summary.health_score >= 80 ? "default" : summary.health_score >= 60 ? "secondary" : "destructive"
                }
              >
                {summary.health_score >= 80 ? "Excellent" : summary.health_score >= 60 ? "Good" : "Needs Work"}
              </Badge>
              <div className="flex items-center gap-1 mt-1 text-sm">
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                ) : trend === "down" ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : null}
                <span className={trend === "up" ? "text-destructive" : trend === "down" ? "text-green-500" : ""}>
                  {trend !== "stable" && `${trendPercent}% vs last week`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Wallet className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="font-semibold">${content.spending.total.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="font-semibold">${content.income.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Budgets Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Budget Status</span>
              <div className="flex gap-2">
                <Badge variant="default" className="text-xs">
                  {content.budgets.onTrack} on track
                </Badge>
                {content.budgets.warning > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {content.budgets.warning} warning
                  </Badge>
                )}
                {content.budgets.exceeded > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {content.budgets.exceeded} exceeded
                  </Badge>
                )}
              </div>
            </div>
            <Progress
              value={
                (content.budgets.onTrack /
                  (content.budgets.onTrack + content.budgets.warning + content.budgets.exceeded || 1)) *
                100
              }
              className="h-2"
            />
          </div>

          {/* Goals Progress */}
          {content.goals.nearCompletion.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Almost There!
              </p>
              {content.goals.nearCompletion.slice(0, 2).map((goal, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[60%]">{goal.name}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={goal.percentage} className="w-20 h-2" />
                    <span className="text-xs text-muted-foreground">{goal.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Bills */}
          {content.bills.nextDue.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Upcoming Bills
              </p>
              <div className="space-y-1">
                {content.bills.nextDue.slice(0, 3).map((bill, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[50%]">{bill.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">${bill.amount.toFixed(2)}</span>
                      <Badge variant="outline" className="text-xs">
                        {bill.dueDate}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Insight */}
          {content.insights.length > 0 && (
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-sm">{content.insights[0]}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
