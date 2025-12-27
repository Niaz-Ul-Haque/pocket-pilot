"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  transactionSchema,
  TRANSACTION_TYPES,
  type TransactionFormData,
  type TransactionWithDetails,
  getDefaultTransactionValues,
  dbToFormData,
} from "@/lib/validators/transaction"
import type { Account } from "@/lib/validators/account"
import type { Category } from "@/lib/validators/category"
import { TagPicker } from "@/components/tag-picker"

interface TransactionFormProps {
  transaction?: TransactionWithDetails
  accounts: Account[]
  categories: Category[]
  onSuccess: (transaction: TransactionWithDetails) => void
  onCancel: () => void
}

export function TransactionForm({
  transaction,
  accounts,
  categories,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const isEditing = !!transaction

  // Fetch existing tags when editing
  useEffect(() => {
    if (transaction?.id) {
      fetch(`/api/transactions/${transaction.id}/tags`)
        .then((res) => res.json())
        .then((tags) => {
          if (Array.isArray(tags)) {
            setSelectedTagIds(tags.map((t: { id: string }) => t.id))
          }
        })
        .catch(console.error)
    }
  }, [transaction?.id])

  // Get default values - convert DB format to form format if editing
  const getFormDefaults = (): Partial<TransactionFormData> => {
    if (transaction) {
      const { amount, type } = dbToFormData(transaction)
      return {
        account_id: transaction.account_id,
        category_id: transaction.category_id ?? undefined,
        date: transaction.date,
        amount,
        description: transaction.description ?? "",
        type,
      }
    }
    return getDefaultTransactionValues()
  }

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: getFormDefaults(),
  })

  const selectedType = form.watch("type")

  // Filter categories based on selected type
  const filteredCategories = categories.filter((cat) => {
    if (selectedType === "expense") return cat.type === "expense"
    if (selectedType === "income") return cat.type === "income"
    if (selectedType === "transfer") return cat.type === "transfer"
    return true
  })

  async function onSubmit(data: TransactionFormData) {
    setIsSubmitting(true)

    try {
      const url = isEditing
        ? `/api/transactions/${transaction.id}`
        : "/api/transactions"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save transaction")
      }

      const savedTransaction = await response.json()

      // Save tags for the transaction
      if (savedTransaction.id) {
        // Get current tags on the transaction
        const currentTagsRes = await fetch(`/api/transactions/${savedTransaction.id}/tags`)
        const currentTags = currentTagsRes.ok ? await currentTagsRes.json() : []
        const currentTagIds = Array.isArray(currentTags)
          ? currentTags.map((t: { id: string }) => t.id)
          : []

        // Add new tags
        for (const tagId of selectedTagIds) {
          if (!currentTagIds.includes(tagId)) {
            await fetch(`/api/transactions/${savedTransaction.id}/tags`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tag_id: tagId }),
            })
          }
        }

        // Remove deselected tags
        for (const tagId of currentTagIds) {
          if (!selectedTagIds.includes(tagId)) {
            await fetch(`/api/transactions/${savedTransaction.id}/tags`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tag_id: tagId }),
            })
          }
        }
      }

      onSuccess(savedTransaction)
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save transaction",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        {/* Type Selection */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <DatePicker
                date={field.value ? new Date(field.value + "T00:00:00") : undefined}
                onDateChange={(date) => {
                  if (date) {
                    field.onChange(date.toISOString().split("T")[0])
                  }
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value ? parseFloat(value) : undefined)
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account */}
        <FormField
          control={form.control}
          name="account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No categories available
                    </SelectItem>
                  ) : (
                    filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags (Optional)</Label>
          <TagPicker
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Grocery shopping at Walmart"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Transaction" : "Add Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
