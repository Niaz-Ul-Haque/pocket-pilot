"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import type { BillWithStatus } from "@/lib/validators/bill"
import type { Account } from "@/lib/validators/account"

// Local form schema for mark paid
const markPaidFormSchema = z.object({
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  create_transaction: z.boolean(),
  amount: z.number().positive().optional(),
  account_id: z.string().uuid().optional(),
})

type MarkPaidFormData = z.infer<typeof markPaidFormSchema>

interface MarkPaidFormProps {
  bill: BillWithStatus
  onSuccess: (result: { bill: BillWithStatus; transaction?: unknown }) => void
  onCancel: () => void
}

export function MarkPaidForm({ bill, onSuccess, onCancel }: MarkPaidFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])

  // Fetch accounts for transaction creation
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch("/api/accounts")
        if (response.ok) {
          const data = await response.json()
          setAccounts(data)
        }
      } catch (error) {
        console.error("Failed to fetch accounts:", error)
      }
    }
    fetchAccounts()
  }, [])

  const form = useForm<MarkPaidFormData>({
    resolver: zodResolver(markPaidFormSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split("T")[0],
      create_transaction: true,
      amount: bill.amount ?? undefined,
      account_id: undefined,
    },
  })

  const createTransaction = form.watch("create_transaction")

  async function onSubmit(data: MarkPaidFormData) {
    setIsSubmitting(true)

    try {
      // Validate account is selected if creating transaction
      if (data.create_transaction && !data.account_id) {
        form.setError("account_id", {
          message: "Please select an account for the transaction",
        })
        setIsSubmitting(false)
        return
      }

      const response = await fetch(`/api/bills/${bill.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to mark bill as paid")
      }

      const result = await response.json()
      onSuccess(result)
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to mark bill as paid",
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

        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            Marking <span className="font-medium text-foreground">{bill.name}</span> as paid
            {bill.amount && (
              <> for <span className="font-medium text-foreground">${bill.amount.toFixed(2)}</span></>
            )}
          </p>
        </div>

        {/* Payment Date */}
        <FormField
          control={form.control}
          name="payment_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Payment Date</FormLabel>
              <DatePicker
                date={field.value ? new Date(field.value) : undefined}
                onDateChange={(date) => {
                  field.onChange(
                    date ? date.toISOString().split("T")[0] : undefined
                  )
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Create Transaction Toggle */}
        <FormField
          control={form.control}
          name="create_transaction"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Create Transaction</FormLabel>
                <FormDescription>
                  Record this payment as a transaction?
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Transaction Details (conditional) */}
        {createTransaction && (
          <>
            {/* Amount (if bill has no fixed amount) */}
            {!bill.amount && (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
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
            )}

            {/* Account Selection */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Which account did you pay from?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

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
            Mark as Paid
          </Button>
        </div>
      </form>
    </Form>
  )
}
