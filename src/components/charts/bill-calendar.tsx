"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"
import { formatCurrency } from "@/lib/validators/budget"
import { cn } from "@/lib/utils"
import { format, startOfMonth, getDay } from "date-fns"
import type { BillCalendarData } from "@/app/api/chart-data/route"

interface BillCalendarProps {
  className?: string
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function BillCalendar({ className }: BillCalendarProps) {
  const [data, setData] = useState<BillCalendarData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/chart-data?type=bill-calendar")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch bill calendar:", error)
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

  const now = new Date()
  const monthStart = startOfMonth(now)
  const startDayOfWeek = getDay(monthStart)

  // Count bills and calculate total
  const totalBills = data.reduce((sum, d) => sum + d.bills.length, 0)
  const totalAmount = data.reduce(
    (sum, d) => sum + d.bills.reduce((s, b) => s + (b.amount || 0), 0),
    0
  )

  // Create calendar grid
  const weeks: (BillCalendarData | null)[][] = []
  let currentWeek: (BillCalendarData | null)[] = []

  // Add empty cells for days before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null)
  }

  // Add data cells
  data.forEach((day) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
      case "due-today":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
      case "due-soon":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
    }
  }

  const getDayBgColor = (day: BillCalendarData) => {
    if (day.bills.some(b => b.status === "overdue")) return "bg-red-50 dark:bg-red-950/20"
    if (day.bills.some(b => b.status === "due-today")) return "bg-orange-50 dark:bg-orange-950/20"
    if (day.bills.some(b => b.status === "due-soon")) return "bg-yellow-50 dark:bg-yellow-950/20"
    if (day.bills.length > 0) return "bg-blue-50 dark:bg-blue-950/20"
    return ""
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          Bill Calendar
        </CardTitle>
        <CardDescription>
          {format(now, "MMMM yyyy")} - {totalBills} bill{totalBills !== 1 ? "s" : ""} totaling {formatCurrency(totalAmount)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center font-medium">
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
                  className={cn(
                    "min-h-[80px] p-1 rounded-md border text-xs",
                    day ? getDayBgColor(day) : "bg-muted/30"
                  )}
                >
                  {day && (
                    <>
                      <div className="font-medium text-muted-foreground mb-1">
                        {new Date(day.date).getDate()}
                      </div>
                      <div className="space-y-1">
                        {day.bills.slice(0, 2).map((bill) => (
                          <div
                            key={bill.id}
                            className={cn(
                              "px-1 py-0.5 rounded text-[10px] truncate",
                              getStatusColor(bill.status)
                            )}
                            title={`${bill.name}: ${bill.amount ? formatCurrency(bill.amount) : "Variable"}`}
                          >
                            {bill.name}
                          </div>
                        ))}
                        {day.bills.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{day.bills.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-950" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-950" />
              <span>Due Today</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-950" />
              <span>Due Soon</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950" />
              <span>Upcoming</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
