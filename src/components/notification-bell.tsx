"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Wallet,
  TrendingUp,
  Target,
  Lightbulb,
  Sparkles,
  Calendar,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "bill" | "budget" | "ai"
  title: string
  message: string
  priority: "critical" | "warning" | "info" | "high" | "medium" | "low"
  route: string
  createdAt: string
  aiType?: string
}

interface NotificationsResponse {
  notifications: Notification[]
  counts: {
    total: number
    critical: number
    warning: number
  }
}

interface AINotification {
  id: string
  notification_type: string
  title: string
  message: string
  priority: "critical" | "high" | "medium" | "low"
  is_read: boolean
  action_url?: string
  created_at: string
}

// Helper to get AI notification icon
function getAINotificationIcon(aiType: string | undefined) {
  switch (aiType) {
    case "spending_alert":
      return <TrendingUp className="h-4 w-4 text-orange-500" />
    case "budget_warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case "goal_reminder":
      return <Target className="h-4 w-4 text-blue-500" />
    case "bill_reminder":
      return <Receipt className="h-4 w-4 text-purple-500" />
    case "savings_opportunity":
      return <Lightbulb className="h-4 w-4 text-green-500" />
    case "weekly_insight":
    case "monthly_insight":
      return <Calendar className="h-4 w-4 text-blue-500" />
    case "achievement":
      return <Trophy className="h-4 w-4 text-yellow-500" />
    case "recommendation":
      return <Sparkles className="h-4 w-4 text-purple-500" />
    default:
      return <Sparkles className="h-4 w-4 text-primary" />
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      // Fetch both regular and AI notifications
      const [notifResponse, aiResponse] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/ai-notifications?limit=10"),
      ])

      const notifications: Notification[] = []
      let criticalCount = 0
      let warningCount = 0

      // Process regular notifications
      if (notifResponse.ok) {
        const regularData = await notifResponse.json()
        if (regularData.notifications) {
          notifications.push(...regularData.notifications)
          criticalCount += regularData.counts?.critical || 0
          warningCount += regularData.counts?.warning || 0
        }
      }

      // Process AI notifications
      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        if (aiData.notifications) {
          const aiNotifications: Notification[] = aiData.notifications
            .filter((n: AINotification) => !n.is_read)
            .map((n: AINotification) => ({
              id: `ai-${n.id}`,
              type: "ai" as const,
              title: n.title,
              message: n.message,
              priority: n.priority === "critical" ? "critical" :
                       n.priority === "high" ? "warning" : "info",
              route: n.action_url || "/dashboard",
              createdAt: n.created_at,
              aiType: n.notification_type,
            }))
          notifications.push(...aiNotifications)

          // Count AI notifications by priority
          aiData.notifications.filter((n: AINotification) => !n.is_read).forEach((n: AINotification) => {
            if (n.priority === "critical") criticalCount++
            else if (n.priority === "high") warningCount++
          })
        }
      }

      // Sort by priority (critical first) then by date
      notifications.sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 0, warning: 1, high: 1, info: 2, medium: 2, low: 3 }
        const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
        if (pDiff !== 0) return pDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      setData({
        notifications,
        counts: {
          total: notifications.length,
          critical: criticalCount,
          warning: warningCount,
        },
      })
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Refresh notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleNotificationClick = (notification: Notification) => {
    setIsOpen(false)
    router.push(notification.route)
  }

  const totalCount = data?.counts.total ?? 0
  const hasCritical = (data?.counts.critical ?? 0) > 0

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full"
          aria-label={`Notifications${totalCount > 0 ? ` (${totalCount})` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs",
                !hasCritical && "bg-yellow-500 hover:bg-yellow-500"
              )}
            >
              {totalCount > 9 ? "9+" : totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-hidden flex flex-col">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              {totalCount} alert{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : totalCount === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              No pending alerts
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-1 p-1">
              {data?.notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer rounded-md",
                    notification.priority === "critical" && "bg-red-50 dark:bg-red-950/20",
                    (notification.priority === "warning" || notification.priority === "high") && "bg-yellow-50 dark:bg-yellow-950/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="shrink-0 mt-0.5">
                    {notification.type === "ai" ? (
                      getAINotificationIcon(notification.aiType)
                    ) : notification.priority === "critical" ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : notification.priority === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : notification.type === "bill" ? (
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none mb-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {notification.type === "bill" ? (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        Bill
                      </Badge>
                    ) : notification.type === "ai" ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 bg-primary/10 text-primary border-primary/30">
                        AI
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        Budget
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        )}

        {totalCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  setIsOpen(false)
                  router.push("/dashboard/bills")
                }}
              >
                <Receipt className="h-3 w-3 mr-1" />
                View Bills
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  setIsOpen(false)
                  router.push("/dashboard/budgets")
                }}
              >
                <Wallet className="h-3 w-3 mr-1" />
                View Budgets
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
