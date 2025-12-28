"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle, CheckCircle2, Calendar } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import { cn } from "@/lib/utils"
import { format, parseISO, differenceInDays } from "date-fns"
import type { BillWithStatus } from "@/lib/validators/bill"

interface BillTimelineProps {
  className?: string
  days?: number
}

export function BillTimeline({ className, days = 30 }: BillTimelineProps) {
  const [bills, setBills] = useState<BillWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/bills?upcoming=true&days=${days}`)
      if (res.ok) {
        setBills(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch bills:", error)
    } finally {
      setIsLoading(false)
    }
  }, [days])

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
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (bills.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Bill Payment Timeline
          </CardTitle>
          <CardDescription>Upcoming bills in the next {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No upcoming bills
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalUpcoming = bills.reduce((sum, b) => sum + (b.amount || 0), 0)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "due-today":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "due-soon":
        return <Calendar className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColors = (status: string) => {
    switch (status) {
      case "overdue":
        return {
          bg: "bg-red-50 dark:bg-red-950/30",
          border: "border-red-200 dark:border-red-900",
          line: "bg-red-500",
        }
      case "due-today":
        return {
          bg: "bg-orange-50 dark:bg-orange-950/30",
          border: "border-orange-200 dark:border-orange-900",
          line: "bg-orange-500",
        }
      case "due-soon":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-950/30",
          border: "border-yellow-200 dark:border-yellow-900",
          line: "bg-yellow-500",
        }
      default:
        return {
          bg: "bg-muted/50",
          border: "border-border",
          line: "bg-muted-foreground",
        }
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Bill Payment Timeline
        </CardTitle>
        <CardDescription>
          {bills.length} bill{bills.length !== 1 ? "s" : ""} totaling {formatCurrency(totalUpcoming)} in the next {days} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted" />

          <div className="space-y-3">
            {bills.map((bill, index) => {
              const colors = getStatusColors(bill.status)
              return (
                <div key={bill.id} className="relative flex gap-4 pl-8">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute left-1 top-4 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center",
                      colors.border
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", colors.line)} />
                  </div>

                  {/* Bill card */}
                  <div
                    className={cn(
                      "flex-1 p-3 rounded-lg border transition-colors",
                      colors.bg,
                      colors.border
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(bill.status)}
                          <span className="font-medium truncate">{bill.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(parseISO(bill.next_due_date), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">
                          {bill.amount ? formatCurrency(bill.amount) : "Variable"}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs mt-1",
                            bill.status === "overdue" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
                            bill.status === "due-today" && "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
                            bill.status === "due-soon" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                          )}
                        >
                          {bill.status === "overdue" && `${Math.abs(bill.days_until_due)} days overdue`}
                          {bill.status === "due-today" && "Due today"}
                          {bill.status === "due-soon" && `Due in ${bill.days_until_due} days`}
                          {bill.status === "upcoming" && `In ${bill.days_until_due} days`}
                        </Badge>
                      </div>
                    </div>
                    {bill.auto_pay && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Auto-pay enabled
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
