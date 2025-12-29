"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Bell,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Target,
  Receipt,
  Lightbulb,
  Sparkles,
  Calendar,
  Trophy,
  BellOff,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AINotification } from "@/lib/validators/ai-features"
import Link from "next/link"

interface AINotificationsPanelProps {
  compact?: boolean
  maxItems?: number
}

export function AINotificationsPanel({ compact = false, maxItems = 10 }: AINotificationsPanelProps) {
  const [notifications, setNotifications] = useState<AINotification[]>([])
  const [counts, setCounts] = useState({ total: 0, unread: 0, critical: 0, high: 0 })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<AINotification | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai-notifications?limit=${maxItems}`)
      const data = await res.json()
      if (data.notifications) {
        setNotifications(data.notifications)
        setCounts(data.counts)
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [maxItems])

  const generateNotifications = useCallback(async () => {
    setGenerating(true)
    try {
      await fetch("/api/ai-notifications?action=generate", { method: "POST" })
      // Re-fetch after generating
      const res = await fetch(`/api/ai-notifications?limit=${maxItems}`)
      const data = await res.json()
      if (data.notifications) {
        setNotifications(data.notifications)
        setCounts(data.counts)
      }
    } catch (err) {
      console.error("Failed to generate notifications:", err)
    } finally {
      setGenerating(false)
    }
  }, [maxItems])

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch("/api/ai-notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "read" }),
      })
      setNotifications(
        notifications.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
      )
      setCounts({ ...counts, unread: Math.max(0, counts.unread - ids.length) })
    } catch (err) {
      console.error("Failed to mark as read:", err)
    }
  }

  const dismissNotification = async (id: string) => {
    try {
      await fetch("/api/ai-notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action: "dismiss" }),
      })
      setNotifications(notifications.filter((n) => n.id !== id))
      setCounts({ ...counts, total: counts.total - 1 })
    } catch (err) {
      console.error("Failed to dismiss notification:", err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Generate proactive notifications on load
    generateNotifications()
  }, [fetchNotifications, generateNotifications])

  const getNotificationIcon = (type: AINotification["notification_type"]) => {
    switch (type) {
      case "spending_alert":
        return <TrendingUp className="h-4 w-4" />
      case "budget_warning":
        return <AlertTriangle className="h-4 w-4" />
      case "goal_reminder":
        return <Target className="h-4 w-4" />
      case "bill_reminder":
        return <Receipt className="h-4 w-4" />
      case "savings_opportunity":
        return <Lightbulb className="h-4 w-4" />
      case "unusual_activity":
        return <AlertTriangle className="h-4 w-4" />
      case "weekly_insight":
      case "monthly_insight":
        return <Calendar className="h-4 w-4" />
      case "achievement":
        return <Trophy className="h-4 w-4" />
      case "recommendation":
        return <Sparkles className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: AINotification["priority"]) => {
    switch (priority) {
      case "critical":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
      case "high":
        return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30"
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30"
      default:
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  if (compact) {
    const displayedNotifications = notifications.slice(0, 3)
    const displayedCount = displayedNotifications.length
    const remainingCount = notifications.length - displayedCount

    return (
      <>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">AI Alerts</span>
            </div>
            {displayedCount > 0 && (
              <Badge variant="destructive" className="h-5">
                {displayedCount}{remainingCount > 0 ? `+${remainingCount}` : ""}
              </Badge>
            )}
          </div>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2">
              {displayedNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedNotification(n)
                    if (!n.is_read) {
                      markAsRead([n.id])
                    }
                  }}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border text-sm transition-colors hover:bg-muted/80 cursor-pointer",
                    !n.is_read && "bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("p-1 rounded", getPriorityColor(n.priority))}>
                      {getNotificationIcon(n.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
              {displayedCount === 0 && !loading && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No AI alerts
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Modal for Compact View */}
        <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
          <DialogContent className="max-w-md">
            {selectedNotification && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg", getPriorityColor(selectedNotification.priority))}>
                      {getNotificationIcon(selectedNotification.notification_type)}
                    </div>
                    <div>
                      <DialogTitle>{selectedNotification.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {selectedNotification.notification_type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs">{formatTime(selectedNotification.created_at)}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selectedNotification.message}</p>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        selectedNotification.priority === "critical" && "border-red-500 text-red-600",
                        selectedNotification.priority === "high" && "border-orange-500 text-orange-600",
                        selectedNotification.priority === "medium" && "border-yellow-500 text-yellow-600",
                        selectedNotification.priority === "low" && "border-blue-500 text-blue-600"
                      )}
                    >
                      {selectedNotification.priority} priority
                    </Badge>

                    {selectedNotification.action_url && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={selectedNotification.action_url}>
                          {selectedNotification.action_label || "View Details"}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        dismissNotification(selectedNotification.id)
                        setSelectedNotification(null)
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setSelectedNotification(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              AI Notifications
              {counts.unread > 0 && (
                <Badge variant="destructive">{counts.unread} new</Badge>
              )}
            </CardTitle>
            <CardDescription>Proactive alerts and insights</CardDescription>
          </div>
          <div className="flex gap-2">
            {counts.unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsRead(notifications.filter((n) => !n.is_read).map((n) => n.id))}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={generateNotifications}
              disabled={generating}
            >
              <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No notifications at the moment</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    !n.is_read && "bg-muted/50 border-primary/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", getPriorityColor(n.priority))}>
                      {getNotificationIcon(n.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{n.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => dismissNotification(n.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {n.notification_type.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(n.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!n.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead([n.id])}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark read
                            </Button>
                          )}
                          {n.action_url && (
                            <Link href={n.action_url}>
                              <Button variant="outline" size="sm">
                                {n.action_label || "View"}
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
