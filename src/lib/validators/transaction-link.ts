import { z } from "zod"

// Link types
export const LINK_TYPES = ["refund", "related", "partial_refund", "chargeback"] as const
export type LinkType = (typeof LINK_TYPES)[number]

// Human-readable labels for link types
export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  refund: "Refund",
  related: "Related",
  partial_refund: "Partial Refund",
  chargeback: "Chargeback",
}

// Icons for link types (for UI)
export const LINK_TYPE_ICONS: Record<LinkType, string> = {
  refund: "↩️",
  related: "🔗",
  partial_refund: "↩️",
  chargeback: "⚠️",
}

// Schema for creating a transaction link
export const transactionLinkSchema = z.object({
  source_transaction_id: z.string().uuid("Source transaction is required"),
  target_transaction_id: z.string().uuid("Target transaction is required"),
  link_type: z.enum(LINK_TYPES, {
    message: "Please select a link type",
  }),
  notes: z.string().max(500, "Notes are too long").optional().nullable(),
}).refine(
  (data) => data.source_transaction_id !== data.target_transaction_id,
  {
    message: "Cannot link a transaction to itself",
    path: ["target_transaction_id"],
  }
)

// Schema for updating a transaction link
export const transactionLinkUpdateSchema = z.object({
  link_type: z.enum(LINK_TYPES).optional(),
  notes: z.string().max(500, "Notes are too long").optional().nullable(),
})

// Type inferred from schema
export type TransactionLinkFormData = z.infer<typeof transactionLinkSchema>

// Full transaction link type including database fields
export type TransactionLink = {
  id: string
  user_id: string
  source_transaction_id: string
  target_transaction_id: string
  link_type: LinkType
  notes: string | null
  created_at: string
}

// Transaction link with joined transaction details
export type TransactionLinkWithDetails = TransactionLink & {
  source_transaction?: {
    id: string
    date: string
    description: string | null
    amount: number
    account_name?: string
    category_name?: string
  }
  target_transaction?: {
    id: string
    date: string
    description: string | null
    amount: number
    account_name?: string
    category_name?: string
  }
}

/**
 * Get a description for a link type
 */
export function getLinkTypeDescription(linkType: LinkType): string {
  switch (linkType) {
    case "refund":
      return "Full refund of the original transaction"
    case "partial_refund":
      return "Partial refund of the original transaction"
    case "chargeback":
      return "Bank-initiated reversal of a transaction"
    case "related":
      return "Related transactions (e.g., installment payments)"
    default:
      return ""
  }
}
