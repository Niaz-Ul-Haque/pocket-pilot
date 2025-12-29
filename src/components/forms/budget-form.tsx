"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Loader2 } from "lucide-react"
import {
  budgetSchema,
  type BudgetFormData,
  type BudgetWithDetails,
  BUDGET_PERIODS,
  BUDGET_PERIOD_LABELS,
  DEFAULT_ALERT_THRESHOLD,
} from "@/lib/validators/budget"
import type { Category } from "@/lib/validators/category"

interface BudgetFormProps {
  budget?: BudgetWithDetails
  categories: Category[]
  existingBudgetCategoryIds: string[]
  onSuccess: (budget: BudgetWithDetails) => void
  onCancel: () => void
}

export function BudgetForm({
  budget,
  categories,
  existingBudgetCategoryIds,
  onSuccess,
  onCancel,
}: BudgetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!budget

  // Filter to only expense categories without existing budgets (unless editing)
  const availableCategories = categories.filter((cat) => {
    if (cat.type !== "expense") return false
    if (isEditing && cat.id === budget.category_id) return true
    return !existingBudgetCategoryIds.includes(cat.id)
  })

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: budget?.category_id ?? "",
      amount: budget?.amount ?? undefined,
      rollover: budget?.rollover ?? false,
      period: budget?.period ?? "MONTHLY",
      notes: budget?.notes ?? "",
      alert_threshold: budget?.alert_threshold ?? DEFAULT_ALERT_THRESHOLD,
    },
  })

  const alertThreshold = form.watch("alert_threshold") ?? DEFAULT_ALERT_THRESHOLD

  async function onSubmit(data: BudgetFormData) {
    setIsSubmitting(true)

    try {
      const url = isEditing ? `/api/budgets/${budget.id}` : "/api/budgets"
      const method = isEditing ? "PUT" : "POST"

      // When editing, send all updatable fields
      const body = isEditing
        ? {
            amount: data.amount,
            rollover: data.rollover,
            period: data.period,
            notes: data.notes || null,
            alert_threshold: data.alert_threshold,
          }
        : data

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save budget")
      }

      const savedBudget = await response.json()
      onSuccess(savedBudget)
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save budget",
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

        {/* Category (only for new budgets) */}
        {!isEditing && (
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableCategories.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No categories available
                      </SelectItem>
                    ) : (
                      availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Only expense categories without existing budgets are shown
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Editing: Show category name as read-only */}
        {isEditing && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Input value={budget.category_name} disabled />
          </div>
        )}

        {/* Budget Period */}
        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Period</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BUDGET_PERIODS.map((period) => (
                    <SelectItem key={period} value={period}>
                      {BUDGET_PERIOD_LABELS[period]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                How often this budget resets
              </FormDescription>
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
              <FormLabel>Budget Amount</FormLabel>
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
              <FormDescription>
                Set your spending limit for this category
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Alert Threshold */}
        <FormField
          control={form.control}
          name="alert_threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alert Threshold: {alertThreshold}%</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[field.value ?? DEFAULT_ALERT_THRESHOLD]}
                  onValueChange={(values) => field.onChange(values[0])}
                  className="py-4"
                />
              </FormControl>
              <FormDescription>
                Get warned when spending reaches this percentage of your budget
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rollover Toggle */}
        <FormField
          control={form.control}
          name="rollover"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Rollover unused budget</FormLabel>
                <FormDescription>
                  Carry over unspent budget to the next period
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

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes or reminders for this budget..."
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Add reminders or context for this budget category
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (!isEditing && availableCategories.length === 0)}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Budget" : "Create Budget"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
