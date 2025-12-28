"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { transferSchema, type TransferFormData } from "@/lib/validators/transaction"
import type { Account } from "@/lib/validators/account"

interface TransferFormProps {
  accounts: Account[]
  onSuccess: () => void
  onCancel: () => void
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0]
}

export function TransferForm({ accounts, onSuccess, onCancel }: TransferFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      from_account_id: "",
      to_account_id: "",
      amount: undefined,
      date: getTodayString(),
      description: "",
    },
  })

  const fromAccountId = form.watch("from_account_id")

  // Filter out the selected "from" account from "to" options
  const toAccountOptions = accounts.filter((a) => a.id !== fromAccountId)

  async function onSubmit(data: TransferFormData) {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/transactions/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create transfer")
      }

      onSuccess()
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to create transfer",
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

        {/* From/To Accounts Row */}
        <div className="flex items-end gap-2">
          {/* From Account */}
          <FormField
            control={form.control}
            name="from_account_id"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>From Account</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
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
                <FormMessage />
              </FormItem>
            )}
          />

          <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />

          {/* To Account */}
          <FormField
            control={form.control}
            name="to_account_id"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>To Account</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!fromAccountId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {toAccountOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        {/* Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" max={getTodayString()} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description (optional) */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Moving to savings"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Leave blank to auto-generate based on account names
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || accounts.length < 2}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </div>
      </form>
    </Form>
  )
}
