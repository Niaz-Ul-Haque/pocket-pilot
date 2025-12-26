import { z } from "zod"

// Category types: expense, income, or transfer
export const CATEGORY_TYPES = ["expense", "income", "transfer"] as const

export type CategoryType = (typeof CATEGORY_TYPES)[number]

// Tax tags for categorizing tax-related expenses
export const TAX_TAGS = [
  "Charity",
  "Medical",
  "Business",
  "Education",
  "Home Office",
  "Other",
] as const

export type TaxTag = (typeof TAX_TAGS)[number]

// Schema for creating a category (API expects these fields)
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name is too long"),
  type: z.enum(CATEGORY_TYPES, {
    message: "Please select a category type",
  }),
  is_tax_related: z.boolean(),
  tax_tag: z.string().max(50).optional().nullable(),
})

// Schema for updating a category (all fields optional)
export const categoryUpdateSchema = categorySchema.partial()

// Type inferred from create schema
export type CategoryFormData = z.infer<typeof categorySchema>

// Full category type including database fields
export type Category = {
  id: string
  user_id: string
  name: string
  type: CategoryType
  is_tax_related: boolean
  tax_tag: string | null
  is_archived: boolean
  created_at: string
}

// Default category type for seeding
type DefaultCategory = {
  name: string
  type: CategoryType
  is_tax_related: boolean
  tax_tag: string | null
}

// Default categories to seed for new users (Basic Budget framework)
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Expense categories
  { name: "Housing", type: "expense", is_tax_related: false, tax_tag: null },
  { name: "Transportation", type: "expense", is_tax_related: false, tax_tag: null },
  { name: "Food & Dining", type: "expense", is_tax_related: false, tax_tag: null },
  { name: "Utilities", type: "expense", is_tax_related: false, tax_tag: null },
  { name: "Healthcare", type: "expense", is_tax_related: true, tax_tag: "Medical" },
  { name: "Entertainment", type: "expense", is_tax_related: false, tax_tag: null },
  { name: "Shopping", type: "expense", is_tax_related: false, tax_tag: null },
  { name: "Personal Care", type: "expense", is_tax_related: false, tax_tag: null },
  { name: "Education", type: "expense", is_tax_related: true, tax_tag: "Education" },
  { name: "Savings", type: "transfer", is_tax_related: false, tax_tag: null },
  { name: "Other", type: "expense", is_tax_related: false, tax_tag: null },
  // Income category
  { name: "Income", type: "income", is_tax_related: false, tax_tag: null },
]
