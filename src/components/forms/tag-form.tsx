"use client"

import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import {
  tagSchema,
  type TagFormData,
  type Tag,
  TAG_COLORS,
  getTagStyle,
} from "@/lib/validators/tag"
import { cn } from "@/lib/utils"

interface TagFormProps {
  tag?: Tag
  onSuccess: (tag: Tag) => void
  onCancel: () => void
}

export function TagForm({ tag, onSuccess, onCancel }: TagFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!tag

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: tag?.name ?? "",
      color: tag?.color ?? TAG_COLORS[0].value,
    },
  })

  const selectedColor = form.watch("color") ?? TAG_COLORS[0].value
  const tagName = form.watch("name")

  async function onSubmit(data: TagFormData) {
    setIsSubmitting(true)

    try {
      const url = isEditing ? `/api/tags/${tag.id}` : "/api/tags"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save tag")
      }

      const savedTag = await response.json()
      onSuccess(savedTag)
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Failed to save tag",
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

        {/* Tag Preview */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Preview:</span>
          <Badge style={getTagStyle(selectedColor)} className="text-sm">
            {tagName || "Tag Name"}
          </Badge>
        </div>

        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tag Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Groceries, Business, Vacation"
                  maxLength={30}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Color Picker */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="grid grid-cols-6 gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => field.onChange(color.value)}
                      className={cn(
                        "h-8 w-full rounded-md transition-all hover:scale-110",
                        field.value === color.value &&
                          "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
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
            {isEditing ? "Update Tag" : "Create Tag"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
