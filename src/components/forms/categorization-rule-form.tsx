"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  categorizationRuleFormSchema,
  type CategorizationRuleFormData,
  type CategorizationRuleWithCategory,
  RULE_TYPES,
  RULE_TYPE_LABELS,
} from "@/lib/validators/categorization-rule"
import type { Category } from "@/lib/validators/category"

interface CategorizationRuleFormProps {
  rule?: CategorizationRuleWithCategory
  categories: Category[]
  onSuccess: (rule: CategorizationRuleWithCategory) => void
  onCancel: () => void
}

export function CategorizationRuleForm({
  rule,
  categories,
  onSuccess,
  onCancel,
}: CategorizationRuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategorizationRuleFormData>({
    resolver: zodResolver(categorizationRuleFormSchema),
    defaultValues: {
      name: rule?.name || "",
      rule_type: rule?.rule_type || "contains",
      pattern: rule?.pattern || "",
      case_sensitive: rule?.case_sensitive || false,
      target_category_id: rule?.target_category_id || "",
      is_active: rule?.is_active ?? true,
    },
  })

  const ruleType = watch("rule_type")
  const caseSensitive = watch("case_sensitive")
  const isActive = watch("is_active")

  async function onSubmit(data: CategorizationRuleFormData) {
    setIsSubmitting(true)
    setError(null)

    try {
      const url = rule
        ? `/api/categorization-rules/${rule.id}`
        : "/api/categorization-rules"
      const method = rule ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save rule")
      }

      const savedRule = await response.json()
      onSuccess(savedRule)
    } catch (err) {
      console.error("Failed to save rule:", err)
      setError(err instanceof Error ? err.message : "Failed to save rule")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter to expense and income categories only (not transfer)
  const availableCategories = categories.filter((c) => c.type !== "transfer")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          placeholder="e.g., Uber Rides"
          {...register("name")}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rule_type">Match Type</Label>
          <Select
            value={ruleType}
            onValueChange={(value) => setValue("rule_type", value as typeof ruleType)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="rule_type">
              <SelectValue placeholder="Select match type" />
            </SelectTrigger>
            <SelectContent>
              {RULE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {RULE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.rule_type && (
            <p className="text-sm text-destructive">{errors.rule_type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_category_id">Category</Label>
          <Select
            value={watch("target_category_id")}
            onValueChange={(value) => setValue("target_category_id", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="target_category_id">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.target_category_id && (
            <p className="text-sm text-destructive">{errors.target_category_id.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pattern">
          Pattern
          {ruleType === "regex" && (
            <span className="ml-1 text-xs text-muted-foreground">(Regular expression)</span>
          )}
        </Label>
        <Input
          id="pattern"
          placeholder={
            ruleType === "contains"
              ? "e.g., UBER"
              : ruleType === "regex"
              ? "e.g., UBER.*EATS"
              : "Enter pattern"
          }
          {...register("pattern")}
          disabled={isSubmitting}
        />
        {errors.pattern && (
          <p className="text-sm text-destructive">{errors.pattern.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {ruleType === "contains" && "Transaction description must contain this text"}
          {ruleType === "starts_with" && "Transaction description must start with this text"}
          {ruleType === "ends_with" && "Transaction description must end with this text"}
          {ruleType === "exact" && "Transaction description must exactly match this text"}
          {ruleType === "regex" && "Transaction description must match this regular expression"}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="case_sensitive">Case Sensitive</Label>
          <p className="text-xs text-muted-foreground">
            Match exact letter casing
          </p>
        </div>
        <Switch
          id="case_sensitive"
          checked={caseSensitive}
          onCheckedChange={(checked) => setValue("case_sensitive", checked)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="is_active">Active</Label>
          <p className="text-xs text-muted-foreground">
            Inactive rules won&apos;t be applied
          </p>
        </div>
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={(checked) => setValue("is_active", checked)}
          disabled={isSubmitting}
        />
      </div>

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
          {isSubmitting ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
        </Button>
      </div>
    </form>
  )
}
