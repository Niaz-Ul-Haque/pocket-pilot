import { z } from "zod"

// Schema for a single split item
export const splitItemSchema = z.object({
  category_id: z.string().uuid("Please select a category").optional().nullable(),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  description: z.string().max(255, "Description is too long").optional().nullable(),
})

export type SplitItem = z.infer<typeof splitItemSchema>

// Schema for splitting a transaction
export const splitTransactionSchema = z.object({
  splits: z
    .array(splitItemSchema)
    .min(2, "At least 2 splits are required")
    .max(10, "Maximum 10 splits allowed"),
}).refine(
  (data) => {
    // Splits will be validated against the parent amount on the server
    return data.splits.every((s) => s.amount > 0)
  },
  {
    message: "All split amounts must be positive",
    path: ["splits"],
  }
)

export type SplitTransactionFormData = z.infer<typeof splitTransactionSchema>

// Schema for unsplitting (merging back)
export const unsplitTransactionSchema = z.object({
  category_id: z.string().uuid("Please select a category").optional().nullable(),
  description: z.string().max(255, "Description is too long").optional().nullable(),
})

export type UnsplitTransactionFormData = z.infer<typeof unsplitTransactionSchema>

// Split transaction display type
export type SplitTransactionDisplay = {
  parent_id: string
  split_group_id: string
  parent_amount: number
  parent_description: string | null
  parent_date: string
  account_name: string
  splits: Array<{
    id: string
    amount: number
    description: string | null
    category_id: string | null
    category_name: string | null
  }>
}

/**
 * Calculate the remaining amount after existing splits
 */
export function calculateRemainingAmount(
  parentAmount: number,
  existingSplits: Array<{ amount: number }>
): number {
  const usedAmount = existingSplits.reduce((sum, s) => sum + Math.abs(s.amount), 0)
  return Math.abs(parentAmount) - usedAmount
}

/**
 * Validate that splits sum to the parent amount
 */
export function validateSplitAmounts(
  parentAmount: number,
  splits: Array<{ amount: number }>
): { valid: boolean; message?: string } {
  const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0)
  const absParent = Math.abs(parentAmount)

  // Allow for small floating point differences
  const difference = Math.abs(totalSplits - absParent)

  if (difference > 0.01) {
    if (totalSplits < absParent) {
      return {
        valid: false,
        message: `Split amounts total $${totalSplits.toFixed(2)}, but the transaction is $${absParent.toFixed(2)}. Missing $${(absParent - totalSplits).toFixed(2)}.`,
      }
    } else {
      return {
        valid: false,
        message: `Split amounts total $${totalSplits.toFixed(2)}, which exceeds the transaction amount of $${absParent.toFixed(2)}.`,
      }
    }
  }

  return { valid: true }
}
