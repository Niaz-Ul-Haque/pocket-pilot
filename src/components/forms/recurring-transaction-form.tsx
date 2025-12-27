"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import {
  recurringTransactionSchema,
  type RecurringTransactionFormInput,
  type RecurringTransactionWithDetails,
  RECURRING_FREQUENCIES,
  FREQUENCY_LABELS,
  getTransactionType,
} from "@/lib/validators/recurring-transaction"
import type { Category } from "@/lib/validators/category"
import type { Account } from "@/lib/validators/account"

interface RecurringTransactionFormProps {
  recurringTransaction?: RecurringTransactionWithDetails
  onSuccess: (rt: RecurringTransactionWithDetails) => void
  onCancel: () => void
}

export function RecurringTransactionForm({
  recurringTransaction,
  onSuccess,
  onCancel,
}: RecurringTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const isEditing = !!recurringTransaction

  // Fetch categories and accounts
  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, accRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/accounts"),
        ])
        if (catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData)
        }
        if (accRes.ok) {
          const accData = await accRes.json()
          setAccounts(accData)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      }
    }
    fetchData()
  }, [])

  const form = useForm<RecurringTransactionFormInput>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: {
      description: recurringTransaction?.description ?? "",
      amount: recurringTransaction ? Math.abs(recurringTransaction.amount) : undefined,
      type: recurringTransaction
        ? getTransactionType(recurringTransaction.amount)
        : "expense",
      account_id: recurringTransaction?.account_id ?? "",
      category_id: recurringTransaction?.category_id ?? undefined,
      frequency: recurringTransaction?.frequency ?? "monthly",
      next_occurrence_date:
        recurringTransaction?.next_occurrence_date ??
        new Date().toISOString().split("T")[0],
      notes: recurringTransaction?.notes ?? "",
    },
  })

  async function onSubmit(data: RecurringTransactionFormInput) {
    setIsSubmitting(true)

    try {
      const url = isEditing
        ? `/api/recurring-transactions/${recurringTransaction.id}`
        : "/api/recurring-transactions"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save recurring transaction")
      }

      const saved = await response.json()
      onSuccess(saved)
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save recurring transaction",
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

        {/* Transaction Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="expense" />
                    </FormControl>
                    <FormLabel className="font-normal">Expense</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="income" />
                    </FormControl>
                    <FormLabel className="font-normal">Income</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Salary, Rent, Netflix" {...field} />
              </FormControl>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
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
                onValueChange={(value) =>
                  field.onChange(value === "none" ? null : value)
                }
                defaultValue={field.value ?? "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Frequency */}
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RECURRING_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {FREQUENCY_LABELS[freq]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Next Occurrence Date */}
        <FormField
          control={form.control}
          name="next_occurrence_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Next Occurrence</FormLabel>
              <DatePicker
                date={field.value ? new Date(field.value) : undefined}
                onDateChange={(date) => {
                  field.onChange(date ? date.toISOString().split("T")[0] : undefined)
                }}
              />
              <FormDescription>
                When should this transaction first occur?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
