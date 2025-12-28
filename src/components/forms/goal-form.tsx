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
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Loader2,
  Shield,
  Plane,
  GraduationCap,
  Sunset,
  Home,
  Car,
  Heart,
  TrendingDown,
  TrendingUp,
  Target,
} from "lucide-react"
import {
  goalSchema,
  type GoalFormInput,
  type GoalWithDetails,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_LABELS,
  type GoalCategory,
} from "@/lib/validators/goal"

// Category icon mapping
const CATEGORY_ICONS: Record<GoalCategory, React.ReactNode> = {
  emergency: <Shield className="h-4 w-4" />,
  vacation: <Plane className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  retirement: <Sunset className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  wedding: <Heart className="h-4 w-4" />,
  debt_payoff: <TrendingDown className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  other: <Target className="h-4 w-4" />,
}

interface GoalFormProps {
  goal?: GoalWithDetails
  onSuccess: (goal: GoalWithDetails) => void
  onCancel: () => void
}

export function GoalForm({ goal, onSuccess, onCancel }: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAutoContribute, setShowAutoContribute] = useState(
    !!(goal?.auto_contribute_amount && goal?.auto_contribute_day)
  )
  const isEditing = !!goal

  const form = useForm<GoalFormInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: goal?.name ?? "",
      target_amount: goal?.target_amount ?? undefined,
      current_amount: goal?.current_amount ?? 0,
      target_date: goal?.target_date ?? null,
      category: goal?.category ?? "other",
      auto_contribute_amount: goal?.auto_contribute_amount ?? undefined,
      auto_contribute_day: goal?.auto_contribute_day ?? undefined,
    },
  })

  async function onSubmit(data: GoalFormInput) {
    setIsSubmitting(true)

    try {
      const url = isEditing ? `/api/goals/${goal.id}` : "/api/goals"
      const method = isEditing ? "PUT" : "POST"

      // When editing, only send allowed fields
      const body = isEditing
        ? {
            name: data.name,
            target_amount: data.target_amount,
            target_date: data.target_date,
            category: data.category,
            auto_contribute_amount: showAutoContribute ? data.auto_contribute_amount : null,
            auto_contribute_day: showAutoContribute ? data.auto_contribute_day : null,
          }
        : {
            ...data,
            auto_contribute_amount: showAutoContribute ? data.auto_contribute_amount : null,
            auto_contribute_day: showAutoContribute ? data.auto_contribute_day : null,
          }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save goal")
      }

      const savedGoal = await response.json()
      onSuccess(savedGoal)
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Failed to save goal",
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

        {/* Goal Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Vacation Fund" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GOAL_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[category]}
                        <span>{GOAL_CATEGORY_LABELS[category]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Categorize your goal for better organization
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Target Amount */}
        <FormField
          control={form.control}
          name="target_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Amount</FormLabel>
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
                The total amount you want to save
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Initial Amount (only for new goals) */}
        {!isEditing && (
          <FormField
            control={form.control}
            name="current_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Amount (Optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value ? parseFloat(value) : 0)
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Amount you&apos;ve already saved toward this goal
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Target Date */}
        <FormField
          control={form.control}
          name="target_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Target Date (Optional)</FormLabel>
              <DatePicker
                date={field.value ? new Date(field.value) : undefined}
                onDateChange={(date) => {
                  field.onChange(
                    date ? date.toISOString().split("T")[0] : null
                  )
                }}
              />
              <FormDescription>
                When do you want to reach this goal?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Auto-Contribute Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Auto-Contribute Reminder</div>
            <div className="text-sm text-muted-foreground">
              Set a monthly contribution target and reminder day
            </div>
          </div>
          <Switch
            checked={showAutoContribute}
            onCheckedChange={setShowAutoContribute}
          />
        </div>

        {/* Auto-Contribute Fields */}
        {showAutoContribute && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <FormField
              control={form.control}
              name="auto_contribute_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Contribution Amount</FormLabel>
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
                    How much do you want to contribute each month?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_contribute_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contribution Day of Month</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day === 1 ? "1st" : day === 2 ? "2nd" : day === 3 ? "3rd" : `${day}th`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Which day of the month should we remind you?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Goal" : "Create Goal"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
