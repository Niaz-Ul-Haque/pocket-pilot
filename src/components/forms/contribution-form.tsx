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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Loader2 } from "lucide-react"
import {
  contributionSchema,
  type ContributionFormData,
  type GoalWithDetails,
  type ContributionWithGoal,
} from "@/lib/validators/goal"

interface ContributionFormProps {
  goal: GoalWithDetails
  onSuccess: (contribution: ContributionWithGoal, updatedGoal: GoalWithDetails) => void
  onCancel: () => void
}

export function ContributionForm({
  goal,
  onSuccess,
  onCancel,
}: ContributionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      goal_id: goal.id,
      amount: undefined,
      date: new Date().toISOString().split("T")[0],
      note: "",
    },
  })

  async function onSubmit(data: ContributionFormData) {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/goals/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add contribution")
      }

      const result = await response.json()
      onSuccess(result.contribution, result.goal)
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to add contribution",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const remaining = goal.target_amount - goal.current_amount

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        {/* Goal Info */}
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm text-muted-foreground">Adding to</p>
          <p className="font-medium">{goal.name}</p>
          <p className="text-sm text-muted-foreground">
            ${goal.current_amount.toFixed(2)} of ${goal.target_amount.toFixed(2)} saved
            {remaining > 0 && ` • $${remaining.toFixed(2)} remaining`}
          </p>
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
              {remaining > 0 && (
                <FormDescription>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => field.onChange(remaining)}
                  >
                    Add remaining ${remaining.toFixed(2)}
                  </Button>
                </FormDescription>
              )}
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
                date={field.value ? new Date(field.value) : undefined}
                onDateChange={(date) => {
                  field.onChange(
                    date
                      ? date.toISOString().split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  )
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Note */}
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Monthly savings deposit"
                  className="resize-none"
                  {...field}
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
            Add Contribution
          </Button>
        </div>
      </form>
    </Form>
  )
}
