"use client"

import { useState, useEffect } from "react"
import { Settings, GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useUserPreferences } from "@/components/providers"
import { cn } from "@/lib/utils"

const WIDGET_CONFIG = [
  { id: "stats", name: "Stats Cards", description: "Net worth, income, expenses, net change" },
  { id: "quick-actions", name: "Quick Actions", description: "Common action buttons" },
  { id: "ai-insights", name: "AI Insights", description: "AI-powered financial insights" },
  { id: "spending-trend", name: "Spending Trend", description: "Line chart of spending over time" },
  { id: "category-breakdown", name: "Category Breakdown", description: "Donut chart of expenses by category" },
  { id: "income-vs-expense", name: "Income vs Expense", description: "Bar chart comparison" },
  { id: "cash-flow", name: "Cash Flow Waterfall", description: "Income to net visualization" },
  { id: "accounts", name: "Accounts", description: "Account balances overview" },
  { id: "transactions", name: "Recent Transactions", description: "Latest transaction activity" },
  { id: "budgets", name: "Budget Status", description: "Budget progress overview" },
  { id: "categories", name: "Categories", description: "Category summary" },
  { id: "goals", name: "Savings Goals", description: "Goal progress cards" },
  { id: "bills", name: "Upcoming Bills", description: "Bills due soon" },
]

const DEFAULT_WIDGETS = WIDGET_CONFIG.map((w) => w.id)

export function DashboardSettings() {
  const { preferences, updatePreferences } = useUserPreferences()
  const [localWidgets, setLocalWidgets] = useState<string[]>(preferences.dashboardWidgets)
  const [open, setOpen] = useState(false)
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)

  useEffect(() => {
    setLocalWidgets(preferences.dashboardWidgets)
  }, [preferences.dashboardWidgets, open])

  const toggleWidget = (widgetId: string) => {
    setLocalWidgets((prev) => {
      if (prev.includes(widgetId)) {
        return prev.filter((id) => id !== widgetId)
      }
      return [...prev, widgetId]
    })
  }

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetId) return

    setLocalWidgets((prev) => {
      const newOrder = [...prev]
      const draggedIndex = newOrder.indexOf(draggedWidget)
      const targetIndex = newOrder.indexOf(targetId)

      if (draggedIndex === -1) return prev

      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, draggedWidget)

      return newOrder
    })
  }

  const handleDragEnd = () => {
    setDraggedWidget(null)
  }

  const handleSave = () => {
    updatePreferences({ dashboardWidgets: localWidgets })
    setOpen(false)
  }

  const handleReset = () => {
    setLocalWidgets(DEFAULT_WIDGETS)
  }

  const enabledWidgets = localWidgets.filter((id) => WIDGET_CONFIG.some((w) => w.id === id))
  const disabledWidgets = WIDGET_CONFIG.filter((w) => !localWidgets.includes(w.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Show, hide, and reorder dashboard widgets. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {/* Enabled Widgets */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visible Widgets ({enabledWidgets.length})
              </h4>
              <div className="space-y-2">
                {enabledWidgets.map((widgetId) => {
                  const widget = WIDGET_CONFIG.find((w) => w.id === widgetId)
                  if (!widget) return null
                  return (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={() => handleDragStart(widget.id)}
                      onDragOver={(e) => handleDragOver(e, widget.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border bg-card cursor-move transition-colors",
                        draggedWidget === widget.id && "opacity-50 border-primary"
                      )}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{widget.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {widget.description}
                        </p>
                      </div>
                      <Switch
                        checked={true}
                        onCheckedChange={() => toggleWidget(widget.id)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Disabled Widgets */}
            {disabledWidgets.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Hidden Widgets ({disabledWidgets.length})
                  </h4>
                  <div className="space-y-2">
                    {disabledWidgets.map((widget) => (
                      <div
                        key={widget.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                      >
                        <div className="w-4" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-muted-foreground">
                            {widget.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {widget.description}
                          </p>
                        </div>
                        <Switch
                          checked={false}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
