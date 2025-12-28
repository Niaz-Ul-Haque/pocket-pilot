import { z } from "zod"

// Schema for bulk delete
export const bulkDeleteSchema = z.object({
  transaction_ids: z
    .array(z.string().uuid())
    .min(1, "At least one transaction is required")
    .max(100, "Maximum 100 transactions can be deleted at once"),
})

export type BulkDeleteFormData = z.infer<typeof bulkDeleteSchema>

// Schema for bulk update category
export const bulkUpdateCategorySchema = z.object({
  transaction_ids: z
    .array(z.string().uuid())
    .min(1, "At least one transaction is required")
    .max(100, "Maximum 100 transactions can be updated at once"),
  category_id: z.string().uuid("Please select a category").nullable(),
})

export type BulkUpdateCategoryFormData = z.infer<typeof bulkUpdateCategorySchema>

// Schema for bulk add tags
export const bulkAddTagsSchema = z.object({
  transaction_ids: z
    .array(z.string().uuid())
    .min(1, "At least one transaction is required")
    .max(100, "Maximum 100 transactions can be updated at once"),
  tag_ids: z
    .array(z.string().uuid())
    .min(1, "At least one tag is required"),
  replace_existing: z.boolean().default(false),
})

export type BulkAddTagsFormData = z.infer<typeof bulkAddTagsSchema>

// Result types
export type BulkOperationResult = {
  success: boolean
  affected_count: number
  errors?: Array<{ id: string; error: string }>
}
