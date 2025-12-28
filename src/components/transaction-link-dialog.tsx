"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Link2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LINK_TYPES,
  LINK_TYPE_LABELS,
  getLinkTypeDescription,
  type LinkType,
} from "@/lib/validators/transaction-link"
import { formatAmount, getAmountColorClass } from "@/lib/validators/transaction"
import { format } from "date-fns"

interface TransactionLinkDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  sourceTransaction: {
    id: string
    amount: number
    description: string | null
    date: string
    account_name?: string
    category_name?: string
  } | null
  onSuccess: () => void
}

interface Transaction {
  id: string
  amount: number
  description: string | null
  date: string
  account_name?: string
  category_name?: string
}

export function TransactionLinkDialog({
  isOpen,
  onOpenChange,
  sourceTransaction,
  onSuccess,
}: TransactionLinkDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [linkType, setLinkType] = useState<LinkType>("refund")
  const [notes, setNotes] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("")
      setSearchResults([])
      setSelectedTransaction(null)
      setLinkType("refund")
      setNotes("")
    }
  }, [isOpen])

  async function handleSearch() {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        limit: "20",
      })
      const response = await fetch(`/api/transactions?${params}`)

      if (!response.ok) {
        throw new Error("Failed to search transactions")
      }

      const data = await response.json()
      // Filter out the source transaction and already linked transactions
      const filtered = (data.transactions || data).filter(
        (t: Transaction) => t.id !== sourceTransaction?.id
      )
      setSearchResults(filtered)
    } catch (error) {
      console.error("Search failed:", error)
      toast.error("Failed to search transactions")
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSubmit() {
    if (!sourceTransaction || !selectedTransaction) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/transaction-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_transaction_id: sourceTransaction.id,
          target_transaction_id: selectedTransaction.id,
          link_type: linkType,
          notes: notes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create link")
      }

      toast.success("Transactions linked successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create link:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to create link"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!sourceTransaction) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Transaction
          </DialogTitle>
          <DialogDescription>
            Link this transaction to another related transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Source transaction info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Source Transaction</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {sourceTransaction.description || "No description"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(sourceTransaction.date), "MMM d, yyyy")} •{" "}
                  {sourceTransaction.account_name}
                </p>
              </div>
              <p className={`text-lg font-bold ${getAmountColorClass(sourceTransaction.amount)}`}>
                {formatAmount(sourceTransaction.amount)}
              </p>
            </div>
          </div>

          {/* Link type selection */}
          <div className="space-y-2">
            <Label>Link Type</Label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-col">
                      <span>{LINK_TYPE_LABELS[type]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getLinkTypeDescription(linkType)}
            </p>
          </div>

          {/* Search for target transaction */}
          {!selectedTransaction ? (
            <div className="space-y-2">
              <Label>Find Transaction to Link</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSearch}
                  disabled={isSearching || !searchTerm.trim()}
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <ScrollArea className="h-48 rounded-md border">
                  <div className="p-2 space-y-1">
                    {searchResults.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        className="w-full text-left rounded-md p-2 hover:bg-muted transition-colors"
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {tx.description || "No description"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.date), "MMM d, yyyy")}
                              {tx.account_name && ` • ${tx.account_name}`}
                            </p>
                          </div>
                          <span className={`text-sm font-medium ml-2 ${getAmountColorClass(tx.amount)}`}>
                            {formatAmount(tx.amount)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {searchResults.length === 0 && searchTerm && !isSearching && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No transactions found. Try a different search term.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Target Transaction</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTransaction(null)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Change
                </Button>
              </div>
              <div className="rounded-lg border bg-primary/5 p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {selectedTransaction.description || "No description"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedTransaction.date), "MMM d, yyyy")}
                      {selectedTransaction.account_name && ` • ${selectedTransaction.account_name}`}
                    </p>
                  </div>
                  <p className={`text-lg font-bold ${getAmountColorClass(selectedTransaction.amount)}`}>
                    {formatAmount(selectedTransaction.amount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this link..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedTransaction}
          >
            {isSubmitting ? "Linking..." : "Link Transactions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
