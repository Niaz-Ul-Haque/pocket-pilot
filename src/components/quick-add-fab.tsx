"use client"

import { useState } from "react"
import { Plus, X, Receipt, Target, Wallet, Calendar, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type QuickAddFABProps = {
  onNewTransaction: () => void
  onNewGoal?: () => void
  onNewBudget?: () => void
  onNewBill?: () => void
  onNewRecurring?: () => void
}

export function QuickAddFAB({
  onNewTransaction,
  onNewGoal,
  onNewBudget,
  onNewBill,
  onNewRecurring,
}: QuickAddFABProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const actions = [
    {
      icon: Receipt,
      label: "Transaction",
      onClick: onNewTransaction,
      shortcut: "N",
    },
    {
      icon: Wallet,
      label: "Budget",
      onClick: onNewBudget,
    },
    {
      icon: Target,
      label: "Goal",
      onClick: onNewGoal,
    },
    {
      icon: Calendar,
      label: "Bill",
      onClick: onNewBill,
    },
    {
      icon: Repeat,
      label: "Recurring",
      onClick: onNewRecurring,
    },
  ].filter((action) => action.onClick)

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-center gap-3">
        {/* Action buttons */}
        <div
          className={cn(
            "flex flex-col-reverse items-center gap-2 transition-all duration-200 ease-out",
            isExpanded
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {actions.map((action, index) => (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
                    "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700",
                    isExpanded
                      ? "scale-100 opacity-100"
                      : "scale-75 opacity-0"
                  )}
                  style={{
                    transitionDelay: isExpanded ? `${index * 50}ms` : "0ms",
                  }}
                  onClick={() => {
                    setIsExpanded(false)
                    action.onClick?.()
                  }}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="sr-only">{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="flex items-center gap-2">
                <span>New {action.label}</span>
                {action.shortcut && (
                  <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    {action.shortcut}
                  </kbd>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Main FAB button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200",
                "bg-primary hover:bg-primary/90",
                isExpanded && "rotate-45"
              )}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <X className="h-6 w-6" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
              <span className="sr-only">Quick Add</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <span>{isExpanded ? "Close" : "Quick Add"}</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
