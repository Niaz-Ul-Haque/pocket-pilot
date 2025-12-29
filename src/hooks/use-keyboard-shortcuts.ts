"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

type ShortcutHandler = () => void

type ShortcutConfig = {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: ShortcutHandler
  description: string
  category: "navigation" | "actions" | "search" | "misc"
}

// Global shortcuts registry
const SHORTCUTS: ShortcutConfig[] = [
  // Navigation shortcuts (g+key pattern)
  { key: "h", description: "Go to Dashboard (Home)", category: "navigation", handler: () => {} },
  { key: "t", description: "Go to Transactions", category: "navigation", handler: () => {} },
  { key: "b", description: "Go to Budgets", category: "navigation", handler: () => {} },
  { key: "g", description: "Go to Goals", category: "navigation", handler: () => {} },
  { key: "i", description: "Go to Bills", category: "navigation", handler: () => {} },
  { key: "a", description: "Go to Accounts", category: "navigation", handler: () => {} },
  { key: "c", description: "Go to Categories", category: "navigation", handler: () => {} },
  { key: "r", description: "Go to Reports", category: "navigation", handler: () => {} },
  { key: "y", description: "Go to Analytics", category: "navigation", handler: () => {} },

  // Action shortcuts
  { key: "n", description: "New Transaction", category: "actions", handler: () => {} },
  { key: "k", meta: true, description: "Open Command Palette", category: "search", handler: () => {} },
  { key: "k", ctrl: true, description: "Open Command Palette", category: "search", handler: () => {} },
  { key: "/", description: "Open Search", category: "search", handler: () => {} },
  { key: "?", shift: true, description: "Show Keyboard Shortcuts", category: "misc", handler: () => {} },
  { key: "Escape", description: "Close dialogs", category: "misc", handler: () => {} },
]

export function useKeyboardShortcuts(
  onOpenCommandPalette: () => void,
  onOpenSearch: () => void,
  onNewTransaction: () => void,
  onShowShortcuts: () => void
) {
  const router = useRouter()
  const goModeRef = useRef(false)
  const goModeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape and Cmd/Ctrl+K in input fields
        if (event.key !== "Escape" && !(event.key === "k" && (event.metaKey || event.ctrlKey))) {
          return
        }
      }

      // Command Palette (Cmd/Ctrl + K)
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenCommandPalette()
        return
      }

      // Search (/)
      if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        onOpenSearch()
        return
      }

      // Show shortcuts (?)
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault()
        onShowShortcuts()
        return
      }

      // Escape - handled by dialogs

      // "g" key for navigation mode
      if (event.key === "g" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        if (goModeRef.current) {
          // Already in go mode, go to Goals
          goModeRef.current = false
          if (goModeTimeoutRef.current) {
            clearTimeout(goModeTimeoutRef.current)
          }
          router.push("/dashboard/goals")
          return
        }
        // Enter go mode
        goModeRef.current = true
        if (goModeTimeoutRef.current) {
          clearTimeout(goModeTimeoutRef.current)
        }
        goModeTimeoutRef.current = setTimeout(() => {
          goModeRef.current = false
        }, 1000) // 1 second timeout for go mode
        return
      }

      // Navigation shortcuts (when in go mode)
      if (goModeRef.current) {
        goModeRef.current = false
        if (goModeTimeoutRef.current) {
          clearTimeout(goModeTimeoutRef.current)
        }

        switch (event.key) {
          case "h":
            event.preventDefault()
            router.push("/dashboard")
            break
          case "t":
            event.preventDefault()
            router.push("/dashboard/transactions")
            break
          case "b":
            event.preventDefault()
            router.push("/dashboard/budgets")
            break
          case "i":
            event.preventDefault()
            router.push("/dashboard/bills")
            break
          case "a":
            event.preventDefault()
            router.push("/dashboard/accounts")
            break
          case "c":
            event.preventDefault()
            router.push("/dashboard/categories")
            break
          case "r":
            event.preventDefault()
            router.push("/dashboard/reports")
            break
          case "y":
            event.preventDefault()
            router.push("/dashboard/analytics")
            break
          case "e":
            event.preventDefault()
            router.push("/dashboard/recurring")
            break
          case "s":
            event.preventDefault()
            router.push("/dashboard/settings/auto-categorization")
            break
          case "m":
            event.preventDefault()
            router.push("/dashboard/templates")
            break
        }
        return
      }

      // New transaction (n)
      if (event.key === "n" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        onNewTransaction()
        return
      }
    },
    [router, onOpenCommandPalette, onOpenSearch, onNewTransaction, onShowShortcuts]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (goModeTimeoutRef.current) {
        clearTimeout(goModeTimeoutRef.current)
      }
    }
  }, [handleKeyDown])
}

// Export shortcuts for display in help dialog
export const KEYBOARD_SHORTCUTS = {
  navigation: [
    { keys: ["g", "h"], description: "Go to Dashboard (Home)" },
    { keys: ["g", "t"], description: "Go to Transactions" },
    { keys: ["g", "b"], description: "Go to Budgets" },
    { keys: ["g", "g"], description: "Go to Goals" },
    { keys: ["g", "i"], description: "Go to Bills" },
    { keys: ["g", "a"], description: "Go to Accounts" },
    { keys: ["g", "c"], description: "Go to Categories" },
    { keys: ["g", "r"], description: "Go to Reports" },
    { keys: ["g", "y"], description: "Go to Analytics" },
    { keys: ["g", "e"], description: "Go to Recurring" },
    { keys: ["g", "m"], description: "Go to Templates" },
    { keys: ["g", "s"], description: "Go to Settings" },
  ],
  actions: [
    { keys: ["n"], description: "New Transaction" },
    { keys: ["⌘", "k"], description: "Open Command Palette" },
    { keys: ["/"], description: "Open Search" },
  ],
  misc: [
    { keys: ["?"], description: "Show Keyboard Shortcuts" },
    { keys: ["Esc"], description: "Close dialogs" },
  ],
}
