"use client"

import { useState } from "react"
import { format } from "date-fns"
import { History, Undo2, Trash2, Receipt, Target, Wallet, Calendar, CreditCard, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useActionHistory } from "@/components/providers"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const ENTITY_ICONS = {
  transaction: Receipt,
  goal: Target,
  budget: Wallet,
  bill: Calendar,
  account: CreditCard,
  category: Tags,
}

const ACTION_LABELS = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
}

const ACTION_COLORS = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export function RecentActionsDialog() {
  const { actions, undoAction, clearHistory } = useActionHistory()
  const [isUndoing, setIsUndoing] = useState<string | null>(null)

  const handleUndo = async (actionId: string) => {
    setIsUndoing(actionId)
    try {
      const success = await undoAction(actionId)
      if (success) {
        toast.success("Action undone successfully")
      } else {
        toast.error("Failed to undo action")
      }
    } catch {
      toast.error("Failed to undo action")
    } finally {
      setIsUndoing(null)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <History className="h-4 w-4" />
          {actions.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {actions.length > 9 ? "9+" : actions.length}
            </span>
          )}
          <span className="sr-only">Recent actions</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Actions
          </DialogTitle>
          <DialogDescription>
            View your recent changes and undo them if needed.
          </DialogDescription>
        </DialogHeader>

        {actions.length === 0 ? (
          <div className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No recent actions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your actions will appear here as you make changes.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {actions.map((action) => {
                  const Icon = ENTITY_ICONS[action.entity]
                  const canUndo = action.type === "delete" || action.type === "create"

                  return (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", ACTION_COLORS[action.type])}
                          >
                            {ACTION_LABELS[action.type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {action.entity}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{action.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(action.timestamp), "MMM d, h:mm a")}
                        </p>
                      </div>
                      {canUndo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleUndo(action.id)}
                          disabled={isUndoing === action.id}
                        >
                          <Undo2 className={cn("h-4 w-4", isUndoing === action.id && "animate-spin")} />
                          <span className="sr-only">Undo</span>
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="ghost" size="sm" onClick={clearHistory} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear History
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
