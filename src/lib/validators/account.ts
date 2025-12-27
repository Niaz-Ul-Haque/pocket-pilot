import { z } from "zod"

export const ACCOUNT_TYPES = [
  "Checking",
  "Savings",
  "Credit",
  "Cash",
  "Investment",
  "Other",
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100, "Account name is too long"),
  type: z.enum(ACCOUNT_TYPES, {
    message: "Please select an account type",
  }),
})

export const accountUpdateSchema = accountSchema.partial()

export type AccountFormData = z.infer<typeof accountSchema>

export type Account = {
  id: string
  user_id: string
  name: string
  type: AccountType
  created_at: string
  balance?: number
}

// Format balance for display
export function formatBalance(balance: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(balance)
}

// Get balance color class
export function getBalanceColorClass(balance: number): string {
  if (balance < 0) return "text-red-600 dark:text-red-400"
  if (balance > 0) return "text-green-600 dark:text-green-400"
  return "text-muted-foreground"
}
