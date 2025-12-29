"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { CommandPalette } from "@/components/command-palette"
import { QuickAddFAB } from "@/components/quick-add-fab"
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog"
import { OnboardingTour, useOnboardingTour } from "@/components/onboarding-tour"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TransactionForm } from "@/components/forms/transaction-form"
import { useUserPreferences } from "@/components/providers"
import type { Account } from "@/lib/validators/account"
import type { Category } from "@/lib/validators/category"

type DashboardShellProps = {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)
  const { showTour, setShowTour } = useOnboardingTour()

  // Data for transaction form
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingFormData, setIsLoadingFormData] = useState(false)
  const { preferences } = useUserPreferences()

  // Fetch accounts and categories when transaction dialog opens
  useEffect(() => {
    if (newTransactionOpen && accounts.length === 0) {
      setIsLoadingFormData(true)
      Promise.all([
        fetch("/api/accounts").then((res) => res.json()),
        fetch("/api/categories").then((res) => res.json()),
      ])
        .then(([accountsData, categoriesData]) => {
          setAccounts(accountsData)
          setCategories(categoriesData)
        })
        .catch(console.error)
        .finally(() => setIsLoadingFormData(false))
    }
  }, [newTransactionOpen, accounts.length])

  // Keyboard shortcuts
  useKeyboardShortcuts(
    () => setCommandPaletteOpen(true),
    () => setCommandPaletteOpen(true), // Use command palette for search
    () => setNewTransactionOpen(true),
    () => setShortcutsDialogOpen(true)
  )

  const handleNewTransaction = useCallback(() => {
    setNewTransactionOpen(true)
  }, [])

  const handleTransactionSuccess = useCallback(() => {
    setNewTransactionOpen(false)
    router.refresh()
  }, [router])

  return (
    <>
      {children}

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNewTransaction={handleNewTransaction}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />

      {/* Quick Add FAB */}
      <QuickAddFAB
        onNewTransaction={handleNewTransaction}
        onNewGoal={() => router.push("/dashboard/goals")}
        onNewBudget={() => router.push("/dashboard/budgets")}
        onNewBill={() => router.push("/dashboard/bills")}
        onNewRecurring={() => router.push("/dashboard/recurring")}
      />

      {/* Onboarding Tour */}
      <OnboardingTour open={showTour} onOpenChange={setShowTour} />

      {/* New Transaction Dialog */}
      <Dialog open={newTransactionOpen} onOpenChange={setNewTransactionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
          </DialogHeader>
          {isLoadingFormData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TransactionForm
              accounts={accounts}
              categories={categories}
              onSuccess={handleTransactionSuccess}
              onCancel={() => setNewTransactionOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
