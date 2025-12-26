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
}
