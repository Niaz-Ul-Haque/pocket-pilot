import { z } from "zod"

// Default tag colors (Tailwind palette)
export const TAG_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
] as const

// Schema for creating a tag
export const tagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(30, "Tag name is too long")
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format")
    .default("#6b7280"),
})

// Schema for updating a tag
export const tagUpdateSchema = tagSchema.partial()

// Type inferred from schema - use z.input for form data to handle defaults correctly
export type TagFormData = z.input<typeof tagSchema>

// Full tag type including database fields
export type Tag = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

// Tag with usage count
export type TagWithCount = Tag & {
  transaction_count: number
}

// Transaction tag association
export type TransactionTag = {
  transaction_id: string
  tag_id: string
  created_at: string
}

/**
 * Get contrasting text color (black or white) for a background color
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "")

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? "#000000" : "#ffffff"
}

/**
 * Get tag style object for inline styling
 */
export function getTagStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: color,
    color: getContrastColor(color),
  }
}
