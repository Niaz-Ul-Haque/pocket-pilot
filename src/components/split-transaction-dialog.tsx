"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Trash2, Split, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  validateSplitAmounts,
  type SplitItem,
} from "@/lib/validators/split-transaction"
import { formatAmount } from "@/lib/validators/transaction"
import type { Category } from "@/lib/validators/category"

interface SplitTransactionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  transaction: {
    id: string
    amount: number
    description: string | null
    date: string
  } | null
  categories: Category[]
  onSuccess: () => void
}

export function SplitTransactionDialog({
  isOpen,
  onOpenChange,
  transaction,
  categories,
  onSuccess,
}: SplitTransactionDialogProps) {
  const [splits, setSplits] = useState<SplitItem[]>([
    { category_id: null, amount: 0, description: null },
    { category_id: null, amount: 0, description: null },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset splits when dialog opens with a new transaction
  useEffect(() => {
    if (isOpen && transaction) {
      const halfAmount = Math.abs(transaction.amount) / 2
      setSplits([
        { category_id: null, amount: parseFloat(halfAmount.toFixed(2)), description: null },
        { category_id: null, amount: parseFloat(halfAmount.toFixed(2)), description: null },
      ])
      setError(null)
    }
  }, [isOpen, transaction])

  if (!transaction) return null

  const parentAmount = Math.abs(transaction.amount)
  const totalSplits = splits.reduce((sum, s) => sum + (s.amount || 0), 0)
  const remaining = parentAmount - totalSplits
  const validation = validateSplitAmounts(transaction.amount, splits)

  function addSplit() {
    if (splits.length >= 10) {
      toast.error("Maximum 10 splits allowed")
      return
    }
    setSplits([...splits, { category_id: null, amount: 0, description: null }])
  }

  function removeSplit(index: number) {
    if (splits.length <= 2) {
      toast.error("At least 2 splits are required")
      return
    }
    setSplits(splits.filter((_, i) => i !== index))
  }

  function updateSplit(index: number, field: keyof SplitItem, value: unknown) {
    setSplits(
      splits.map((split, i) =>
        i === index ? { ...split, [field]: value } : split
      )
    )
  }

  function distributeRemaining() {
    if (remaining <= 0) return

    const perSplit = remaining / splits.length
    setSplits(
      splits.map((split) => ({
        ...split,
        amount: parseFloat((split.amount + perSplit).toFixed(2)),
      }))
    )
  }

  async function handleSubmit() {
    if (!transaction) return

    if (!validation.valid) {
      setError(validation.message || "Invalid split amounts")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/transactions/${transaction.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splits }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to split transaction")
      }

      toast.success("Transaction split successfully")
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to split transaction:", err)
      setError(err instanceof Error ? err.message : "Failed to split transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter to expense and income categories only
  const availableCategories = categories.filter((c) => c.type !== "transfer")

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Split Transaction
          </DialogTitle>
          <DialogDescription>
            Divide this transaction across multiple categories.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Original transaction info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {transaction.description || "No description"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transaction.date}
                </p>
              </div>
              <p className="text-lg font-bold">
                {formatAmount(transaction.amount)}
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Splits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Splits ({splits.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSplit}
                disabled={splits.length >= 10}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Split
              </Button>
            </div>

            {splits.map((split, index) => (
              <div
                key={index}
                className="rounded-lg border p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Split {index + 1}</span>
                  {splits.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeSplit(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={split.amount || ""}
                      onChange={(e) =>
                        updateSplit(index, "amount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={split.category_id || "none"}
                      onValueChange={(value) =>
                        updateSplit(index, "category_id", value === "none" ? null : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {availableCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    value={split.description || ""}
                    onChange={(e) =>
                      updateSplit(index, "description", e.target.value || null)
                    }
                    placeholder="Enter description"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total to split:</span>
              <span className="font-medium">{formatAmount(parentAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Split total:</span>
              <span className="font-medium">{formatAmount(totalSplits)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>Remaining:</span>
              <span
                className={`font-medium ${
                  Math.abs(remaining) < 0.01
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {formatAmount(remaining)}
              </span>
            </div>
            {Math.abs(remaining) > 0.01 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={distributeRemaining}
              >
                Distribute remaining equally
              </Button>
            )}
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
            disabled={isSubmitting || !validation.valid}
          >
            {isSubmitting ? "Splitting..." : "Split Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
