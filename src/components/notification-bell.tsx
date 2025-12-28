"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, AlertCircle, AlertTriangle, Receipt, Wallet } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "bill" | "budget"
  title: string
  message: string
  priority: "critical" | "warning" | "info"
  route: string
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  counts: {
    total: number
    critical: number
    warning: number
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
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
      <DropdownMenuContent align="end" className="w-80">
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
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1 p-1">
              {data?.notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer rounded-md",
                    notification.priority === "critical" && "bg-red-50 dark:bg-red-950/20",
                    notification.priority === "warning" && "bg-yellow-50 dark:bg-yellow-950/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="shrink-0 mt-0.5">
                    {notification.priority === "critical" ? (
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
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        Budget
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
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
