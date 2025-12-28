"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  transactionTemplateFormSchema,
  type TransactionTemplateFormData,
  type TransactionTemplateWithDetails,
} from "@/lib/validators/transaction-template"
import type { Account } from "@/lib/validators/account"
import type { Category } from "@/lib/validators/category"
import { type Tag, getTagStyle } from "@/lib/validators/tag"

interface TransactionTemplateFormProps {
  template?: TransactionTemplateWithDetails
  accounts: Account[]
  categories: Category[]
  tags: Tag[]
  onSuccess: (template: TransactionTemplateWithDetails) => void
  onCancel: () => void
}

export function TransactionTemplateForm({
  template,
  accounts,
  categories,
  tags,
  onSuccess,
  onCancel,
}: TransactionTemplateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>(
    template?.tags?.map((t) => t.id) || []
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionTemplateFormData>({
    resolver: zodResolver(transactionTemplateFormSchema),
    defaultValues: {
      name: template?.name || "",
      account_id: template?.account_id || "",
      category_id: template?.category_id || null,
      amount: template?.amount || undefined,
      type: template?.type || "expense",
      description: template?.description || "",
      is_favorite: template?.is_favorite || false,
      tag_ids: template?.tags?.map((t) => t.id) || [],
    },
  })

  const transactionType = watch("type")
  const isFavorite = watch("is_favorite")

  async function onSubmit(data: TransactionTemplateFormData) {
    setIsSubmitting(true)
    setError(null)

    try {
      const url = template
        ? `/api/transaction-templates/${template.id}`
        : "/api/transaction-templates"
      const method = template ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tag_ids: selectedTags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save template")
      }

      const savedTemplate = await response.json()
      onSuccess(savedTemplate)
    } catch (err) {
      console.error("Failed to save template:", err)
      setError(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Filter categories by type
  const availableCategories = categories.filter((c) =>
    transactionType === "expense" ? c.type === "expense" : c.type === "income"
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          placeholder="e.g., Weekly Groceries"
          {...register("name")}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={transactionType}
            onValueChange={(value) => {
              setValue("type", value as "expense" | "income")
              setValue("category_id", null) // Reset category when type changes
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            {...register("amount", { valueAsNumber: true })}
            disabled={isSubmitting}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="account_id">Account</Label>
          <Select
            value={watch("account_id")}
            onValueChange={(value) => setValue("account_id", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="account_id">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.account_id && (
            <p className="text-sm text-destructive">{errors.account_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <Select
            value={watch("category_id") || "none"}
            onValueChange={(value) =>
              setValue("category_id", value === "none" ? null : value)
            }
            disabled={isSubmitting}
          >
            <SelectTrigger id="category_id">
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

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Enter description"
          {...register("description")}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {tags.length > 0 && (
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                style={selectedTags.includes(tag.id) ? getTagStyle(tag.color) : undefined}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Star className={`h-4 w-4 ${isFavorite ? "text-yellow-500 fill-yellow-500" : ""}`} />
          <div className="space-y-0.5">
            <Label htmlFor="is_favorite">Favorite</Label>
            <p className="text-xs text-muted-foreground">
              Favorites appear at the top
            </p>
          </div>
        </div>
        <Switch
          id="is_favorite"
          checked={isFavorite}
          onCheckedChange={(checked) => setValue("is_favorite", checked)}
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
          {isSubmitting ? "Saving..." : template ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </form>
  )
}
