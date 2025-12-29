"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Calculator,
  Calendar,
  CreditCard,
  Home,
  Moon,
  Plus,
  Receipt,
  Search,
  Settings,
  Sun,
  Target,
  Wallet,
  PiggyBank,
  BarChart3,
  Tags,
  Repeat,
  FileText,
  TrendingUp,
  Monitor,
  Clock,
  Star,
  History,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useActionHistory } from "@/components/providers"

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewTransaction?: () => void
}

type SearchResult = {
  id: string
  type: "transaction" | "goal" | "bill" | "category" | "account" | "budget"
  title: string
  subtitle: string
}

export function CommandPalette({ open, onOpenChange, onNewTransaction }: CommandPaletteProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { actions } = useActionHistory()
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Search across entities
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

  const navigateToResult = (result: SearchResult) => {
    runCommand(() => {
      switch (result.type) {
        case "transaction":
          router.push(`/dashboard/transactions?highlight=${result.id}`)
          break
        case "goal":
          router.push(`/dashboard/goals?highlight=${result.id}`)
          break
        case "bill":
          router.push(`/dashboard/bills?highlight=${result.id}`)
          break
        case "category":
          router.push(`/dashboard/categories?highlight=${result.id}`)
          break
        case "account":
          router.push(`/dashboard/accounts?highlight=${result.id}`)
          break
        case "budget":
          router.push(`/dashboard/budgets?highlight=${result.id}`)
          break
      }
    })
  }

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "transaction":
        return <Receipt className="mr-2 h-4 w-4" />
      case "goal":
        return <Target className="mr-2 h-4 w-4" />
      case "bill":
        return <Calendar className="mr-2 h-4 w-4" />
      case "category":
        return <Tags className="mr-2 h-4 w-4" />
      case "account":
        return <CreditCard className="mr-2 h-4 w-4" />
      case "budget":
        return <Wallet className="mr-2 h-4 w-4" />
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <CommandGroup heading="Search Results">
            {searchResults.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                onSelect={() => navigateToResult(result)}
              >
                {getResultIcon(result.type)}
                <div className="flex flex-col">
                  <span>{result.title}</span>
                  <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => onNewTransaction?.())}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/goals"))}>
            <Target className="mr-2 h-4 w-4" />
            Add Goal
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/budgets"))}>
            <Wallet className="mr-2 h-4 w-4" />
            Set Budget
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/bills"))}>
            <Calendar className="mr-2 h-4 w-4" />
            Add Bill
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/templates"))}>
            <FileText className="mr-2 h-4 w-4" />
            Use Template
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
            <CommandShortcut>G H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/transactions"))}>
            <Receipt className="mr-2 h-4 w-4" />
            Transactions
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/budgets"))}>
            <Wallet className="mr-2 h-4 w-4" />
            Budgets
            <CommandShortcut>G B</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/goals"))}>
            <Target className="mr-2 h-4 w-4" />
            Goals
            <CommandShortcut>G G</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/bills"))}>
            <Calendar className="mr-2 h-4 w-4" />
            Bills
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/accounts"))}>
            <CreditCard className="mr-2 h-4 w-4" />
            Accounts
            <CommandShortcut>G A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/categories"))}>
            <Tags className="mr-2 h-4 w-4" />
            Categories
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/recurring"))}>
            <Repeat className="mr-2 h-4 w-4" />
            Recurring
            <CommandShortcut>G E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/reports"))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
            <CommandShortcut>G R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/analytics"))}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
            <CommandShortcut>G Y</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/account"))}>
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings/auto-categorization"))}>
            <Calculator className="mr-2 h-4 w-4" />
            Auto-Categorization Rules
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/templates"))}>
            <FileText className="mr-2 h-4 w-4" />
            Transaction Templates
            <CommandShortcut>G M</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Theme */}
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
            {theme === "light" && <Star className="ml-auto h-4 w-4 text-yellow-500" />}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
            {theme === "dark" && <Star className="ml-auto h-4 w-4 text-yellow-500" />}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="mr-2 h-4 w-4" />
            System Theme
            {theme === "system" && <Star className="ml-auto h-4 w-4 text-yellow-500" />}
          </CommandItem>
        </CommandGroup>

        {/* Recent Actions */}
        {actions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Actions">
              {actions.slice(0, 5).map((action) => (
                <CommandItem key={action.id} disabled>
                  <History className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{action.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
