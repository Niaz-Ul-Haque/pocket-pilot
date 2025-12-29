"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Search, X, ArrowRight, Sparkles, History, Loader2 } from "lucide-react"
import type { ParsedSearchFilters } from "@/lib/validators/ai-features"
import { cn } from "@/lib/utils"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  categories: { id: string; name: string } | null
  accounts: { id: string; name: string } | null
}

interface SearchResult {
  query: string
  parsed_filters: ParsedSearchFilters
  transactions: Transaction[]
  summary: {
    total_count: number
    total_amount: number
    total_expenses: number
    total_income: number
  }
}

interface NaturalLanguageSearchProps {
  onResultClick?: (transaction: Transaction) => void
  placeholder?: string
  className?: string
  compact?: boolean
}

export function NaturalLanguageSearch({
  onResultClick,
  placeholder = "Search with natural language (e.g., 'coffee purchases last month')",
  className,
  compact = false,
}: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Load suggestions and history
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch("/api/natural-search?action=suggestions")
        const data = await res.json()
        if (data.suggestions) {
          setSuggestions(data.suggestions.slice(0, 5))
        }
      } catch (err) {
        console.error("Failed to load suggestions:", err)
      }
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/natural-search?action=history&limit=5")
        const data = await res.json()
        if (data.history) {
          setHistory(data.history.map((h: { query: string }) => h.query))
        }
      } catch (err) {
        console.error("Failed to load history:", err)
      }
    }

    fetchSuggestions()
    fetchHistory()
  }, [])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setQuery(searchQuery)
    setOpen(false)

    try {
      const res = await fetch("/api/natural-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })
      const data = await res.json()
      setResults(data)

      // Update history
      if (!history.includes(searchQuery)) {
        setHistory([searchQuery, ...history.slice(0, 4)])
      }
    } catch (err) {
      console.error("Search failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults(null)
    setQuery("")
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion)
  }

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-start text-muted-foreground", className)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            <span className="truncate">{query || "AI Search..."}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  handleSearch(query)
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Searching...</span>
                  </div>
                ) : (
                  "Type a natural language query and press Enter"
                )}
              </CommandEmpty>
              {suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((s, i) => (
                    <CommandItem key={i} onSelect={() => handleSuggestionClick(s)}>
                      <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" />
                      {s}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {history.length > 0 && (
                <CommandGroup heading="Recent">
                  {history.map((h, i) => (
                    <CommandItem key={i} onSelect={() => handleSuggestionClick(h)}>
                      <History className="mr-2 h-4 w-4 text-muted-foreground" />
                      {h}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              handleSearch(query)
            }
          }}
          placeholder={placeholder}
          className="pl-9 pr-20"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
          {query && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearResults}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={() => handleSearch(query)} disabled={!query.trim() || loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Suggestions */}
      {!results && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 4).map((s, i) => (
            <Button key={i} variant="outline" size="sm" onClick={() => handleSuggestionClick(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Search Results</CardTitle>
                <CardDescription>Found {results.summary.total_count} transactions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={clearResults}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            {/* Parsed Filters */}
            <div className="flex flex-wrap gap-1 mt-2">
              {results.parsed_filters.start_date && (
                <Badge variant="secondary">
                  From: {results.parsed_filters.start_date}
                </Badge>
              )}
              {results.parsed_filters.end_date && (
                <Badge variant="secondary">
                  To: {results.parsed_filters.end_date}
                </Badge>
              )}
              {results.parsed_filters.type && (
                <Badge variant="secondary">
                  Type: {results.parsed_filters.type}
                </Badge>
              )}
              {results.parsed_filters.category && (
                <Badge variant="secondary">
                  Category: {results.parsed_filters.category}
                </Badge>
              )}
              {results.parsed_filters.min_amount && (
                <Badge variant="secondary">
                  Min: ${results.parsed_filters.min_amount}
                </Badge>
              )}
              {results.parsed_filters.max_amount && (
                <Badge variant="secondary">
                  Max: ${results.parsed_filters.max_amount}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-semibold">
                  ${Math.abs(results.summary.total_amount).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="font-semibold text-red-600">
                  ${results.summary.total_expenses.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="font-semibold text-green-600">
                  ${results.summary.total_income.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Count</p>
                <p className="font-semibold">{results.summary.total_count}</p>
              </div>
            </div>

            {/* Transaction List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {results.transactions.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors",
                      onResultClick && "cursor-pointer"
                    )}
                    onClick={() => onResultClick?.(t)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.description || "No description"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t.date}</span>
                        {t.categories && (
                          <>
                            <span>•</span>
                            <span>{t.categories.name}</span>
                          </>
                        )}
                        {t.accounts && (
                          <>
                            <span>•</span>
                            <span>{t.accounts.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-semibold",
                          t.amount < 0 ? "text-red-600" : "text-green-600"
                        )}
                      >
                        {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toFixed(2)}
                      </span>
                      {onResultClick && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                ))}
                {results.transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found matching your search
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
