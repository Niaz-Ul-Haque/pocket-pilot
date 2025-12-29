"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  Receipt,
  Target,
  RefreshCw,
  Wallet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Clock,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FinancialEvent {
  date: string
  type: "bill" | "recurring_transaction" | "goal_contribution" | "payday" | "budget_reset"
  title: string
  amount?: number
  category?: string
  priority: "high" | "medium" | "low"
  is_upcoming: boolean
  days_away: number
}

interface PaymentSuggestion {
  bill_id: string
  bill_name: string
  amount: number
  due_date: string
  suggested_pay_date: string
  reason: string
  priority: "high" | "medium" | "low"
  savings_tip?: string
}

interface AIFinancialCalendarProps {
  compact?: boolean
}

export function AIFinancialCalendar({ compact = false }: AIFinancialCalendarProps) {
  const [events, setEvents] = useState<FinancialEvent[]>([])
  const [suggestions, setSuggestions] = useState<PaymentSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const [calendarRes, scheduleRes] = await Promise.all([
        fetch(
          `/api/ai-calendar?start=${startDate.toISOString().split("T")[0]}&end=${endDate.toISOString().split("T")[0]}`
        ),
        fetch("/api/ai-calendar?action=payment-schedule"),
      ])

      const calendarData = await calendarRes.json()
      const scheduleData = await scheduleRes.json()

      if (calendarData.events) {
        setEvents(calendarData.events)
      }
      if (scheduleData.suggestions) {
        setSuggestions(scheduleData.suggestions)
      }
    } catch (err) {
      console.error("Failed to fetch calendar data:", err)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getEventIcon = (type: FinancialEvent["type"]) => {
    switch (type) {
      case "bill":
        return <Receipt className="h-4 w-4" />
      case "goal_contribution":
        return <Target className="h-4 w-4" />
      case "payday":
        return <Wallet className="h-4 w-4" />
      case "budget_reset":
        return <RefreshCw className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getEventColor = (type: FinancialEvent["type"], priority: string) => {
    if (priority === "high") return "text-red-600 dark:text-red-400"
    if (priority === "medium") return "text-yellow-600 dark:text-yellow-400"

    switch (type) {
      case "bill":
        return "text-orange-600 dark:text-orange-400"
      case "goal_contribution":
        return "text-blue-600 dark:text-blue-400"
      case "payday":
        return "text-green-600 dark:text-green-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const eventsByDate: Record<string, FinancialEvent[]> = {}
  events.forEach((e) => {
    if (!eventsByDate[e.date]) {
      eventsByDate[e.date] = []
    }
    eventsByDate[e.date].push(e)
  })

  const today = new Date().toISOString().split("T")[0]

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {events
                .filter((e) => e.is_upcoming)
                .slice(0, 5)
                .map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <div className={getEventColor(event.type, event.priority)}>
                        {getEventIcon(event.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[120px]">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.days_away === 0
                            ? "Today"
                            : event.days_away === 1
                            ? "Tomorrow"
                            : `In ${event.days_away} days`}
                        </p>
                      </div>
                    </div>
                    {event.amount !== undefined && (
                      <span className="text-sm font-medium">
                        ${event.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Financial Calendar
            </CardTitle>
            <CardDescription>AI-powered payment scheduling and reminders</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calendar">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="schedule">Smart Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            {loading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <div className="space-y-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">
                    {currentMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                      )
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}

                  {/* Empty cells before first day */}
                  {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                    const day = i + 1
                    const date = formatDate(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                    )
                    const dayEvents = eventsByDate[date] || []
                    const isToday = date === today
                    const isSelected = date === selectedDate

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(date === selectedDate ? null : date)}
                        className={cn(
                          "aspect-square p-1 rounded-lg relative hover:bg-muted/50 transition-colors",
                          isToday && "bg-primary/10 font-bold",
                          isSelected && "ring-2 ring-primary"
                        )}
                      >
                        <span className="text-sm">{day}</span>
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayEvents.slice(0, 3).map((e, j) => (
                              <div
                                key={j}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  e.priority === "high"
                                    ? "bg-red-500"
                                    : e.priority === "medium"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Date Events */}
                {selectedDate && eventsByDate[selectedDate] && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">Events on {selectedDate}</p>
                    {eventsByDate[selectedDate].map((event, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2 rounded-full bg-muted",
                              getEventColor(event.type, event.priority)
                            )}
                          >
                            {getEventIcon(event.type)}
                          </div>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {event.type.replace("_", " ")}
                              {event.category && ` • ${event.category}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {event.amount !== undefined && (
                            <p className="font-medium">${event.amount.toFixed(2)}</p>
                          )}
                          <Badge
                            variant={
                              event.priority === "high"
                                ? "destructive"
                                : event.priority === "medium"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {event.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AI-recommended payment schedule optimized for your cash flow
              </p>

              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div key={i} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{s.bill_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {s.due_date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${s.amount.toFixed(2)}</p>
                          <Badge
                            variant={
                              s.priority === "high"
                                ? "destructive"
                                : s.priority === "medium"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {s.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <Clock className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Suggested: {s.suggested_pay_date}
                          </p>
                          <p className="text-xs text-muted-foreground">{s.reason}</p>
                        </div>
                      </div>

                      {s.savings_tip && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                          <Lightbulb className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {s.savings_tip}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {suggestions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming bills to schedule</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
