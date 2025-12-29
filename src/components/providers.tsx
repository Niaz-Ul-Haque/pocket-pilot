"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { ReactNode, createContext, useContext, useState, useCallback, useEffect, useRef } from "react"

// Action History Context for Undo/Redo
type Action = {
  id: string
  type: "create" | "update" | "delete"
  entity: "transaction" | "account" | "category" | "budget" | "goal" | "bill"
  data: Record<string, unknown>
  timestamp: number
  description: string
}

type ActionHistoryContextType = {
  actions: Action[]
  addAction: (action: Omit<Action, "id" | "timestamp">) => void
  undoAction: (id: string) => Promise<boolean>
  clearHistory: () => void
}

const ActionHistoryContext = createContext<ActionHistoryContextType | null>(null)

export function useActionHistory() {
  const context = useContext(ActionHistoryContext)
  if (!context) {
    throw new Error("useActionHistory must be used within Providers")
  }
  return context
}

// User Preferences Context
type UserPreferences = {
  defaultAccountId: string | null
  dashboardWidgets: string[]
  pinnedItems: { type: string; id: string }[]
  hasSeenOnboardingTour: boolean
}

type UserPreferencesContextType = {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
  togglePinnedItem: (type: string, id: string) => void
  isPinned: (type: string, id: string) => boolean
  isPreferencesLoaded: boolean
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null)

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error("useUserPreferences must be used within Providers")
  }
  return context
}

const DEFAULT_DASHBOARD_WIDGETS = [
  "stats",
  "ai-advisor",
  "accounts",
  "transactions",
  "budgets",
  "goals",
  "bills",
]

function ActionHistoryProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Action[]>([])

  const addAction = useCallback((action: Omit<Action, "id" | "timestamp">) => {
    const newAction: Action = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    setActions((prev) => [newAction, ...prev].slice(0, 50)) // Keep last 50 actions
  }, [])

  const undoAction = useCallback(async (id: string): Promise<boolean> => {
    const action = actions.find((a) => a.id === id)
    if (!action) return false

    try {
      // Perform undo based on action type
      if (action.type === "delete") {
        // Recreate the deleted item
        const response = await fetch(`/api/${action.entity}s`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.data),
        })
        if (!response.ok) return false
      } else if (action.type === "create" && action.data.id) {
        // Delete the created item
        const response = await fetch(`/api/${action.entity}s/${action.data.id}`, {
          method: "DELETE",
        })
        if (!response.ok) return false
      }

      // Remove the action from history
      setActions((prev) => prev.filter((a) => a.id !== id))
      return true
    } catch {
      return false
    }
  }, [actions])

  const clearHistory = useCallback(() => {
    setActions([])
  }, [])

  return (
    <ActionHistoryContext.Provider value={{ actions, addAction, undoAction, clearHistory }}>
      {children}
    </ActionHistoryContext.Provider>
  )
}

function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultAccountId: null,
    dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
    pinnedItems: [],
    hasSeenOnboardingTour: false,
  })
  const [isLoaded, setIsLoaded] = useState(false)
  const previousUserIdRef = useRef<string | null>(null)

  // Get user-specific storage key
  const getStorageKey = useCallback((userId: string | undefined) => {
    return userId ? `user-preferences-${userId}` : null
  }, [])

  // Load preferences from localStorage when user changes
  useEffect(() => {
    if (status === "loading") return

    const userId = session?.user?.id
    const storageKey = getStorageKey(userId)

    // If user changed, reset to defaults first
    if (previousUserIdRef.current !== null && previousUserIdRef.current !== userId) {
      setPreferences({
        defaultAccountId: null,
        dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
        pinnedItems: [],
        hasSeenOnboardingTour: false,
      })
    }
    previousUserIdRef.current = userId ?? null

    // Load user-specific preferences
    if (storageKey) {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setPreferences((prev) => ({ ...prev, ...parsed }))
        } catch {
          // Ignore parse errors
        }
      }
      // For new users (no stored data), keep defaults
    }
    setIsLoaded(true)
  }, [session?.user?.id, status, getStorageKey])

  // Save preferences to localStorage when they change (only after initial load)
  useEffect(() => {
    if (!isLoaded) return

    const storageKey = getStorageKey(session?.user?.id)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(preferences))
    }
  }, [preferences, isLoaded, session?.user?.id, getStorageKey])

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }))
  }, [])

  const togglePinnedItem = useCallback((type: string, id: string) => {
    setPreferences((prev) => {
      const exists = prev.pinnedItems.some((item) => item.type === type && item.id === id)
      if (exists) {
        return {
          ...prev,
          pinnedItems: prev.pinnedItems.filter((item) => !(item.type === type && item.id === id)),
        }
      }
      return {
        ...prev,
        pinnedItems: [...prev.pinnedItems, { type, id }],
      }
    })
  }, [])

  const isPinned = useCallback(
    (type: string, id: string) => {
      return preferences.pinnedItems.some((item) => item.type === type && item.id === id)
    },
    [preferences.pinnedItems]
  )

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreferences, togglePinnedItem, isPinned, isPreferencesLoaded: isLoaded }}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <ActionHistoryProvider>
          <UserPreferencesProvider>
            {children}
          </UserPreferencesProvider>
        </ActionHistoryProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
