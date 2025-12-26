import { z } from "zod"

// Transaction types for filtering
export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

// Get today's date in YYYY-MM-DD format
function getTodayString(): string {
  return new Date().toISOString().split("T")[0]
}

// Schema for creating a transaction
export const transactionSchema = z.object({
  account_id: z.string().uuid("Please select an account"),
  category_id: z.string().uuid("Please select a category").optional().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine(
      (date) => {
        const inputDate = new Date(date)
        const today = new Date()
        today.setHours(23, 59, 59, 999) // End of today
        return inputDate <= today
      },
      { message: "Future dates are not allowed" }
    ),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places"),
  description: z.string().max(255, "Description is too long").optional().nullable(),
  type: z.enum(TRANSACTION_TYPES, {
    message: "Please select a transaction type",
  }),
})

// Schema for updating a transaction (all fields optional)
export const transactionUpdateSchema = transactionSchema.partial()

// Type inferred from create schema (form data)
export type TransactionFormData = z.infer<typeof transactionSchema>

// Full transaction type including database fields
export type Transaction = {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  date: string
  amount: number // Stored as signed: negative = expense, positive = income
  description: string | null
  is_transfer: boolean
  created_at: string
}

// Transaction with joined data for display
export type TransactionWithDetails = Transaction & {
  account_name?: string
  category_name?: string
  category_type?: string
}

// Helper to convert form data to database format
// Form uses positive amount + type, DB uses signed amount
export function formToDbAmount(amount: number, type: TransactionType): number {
  if (type === "expense") {
    return -Math.abs(amount)
  }
  return Math.abs(amount)
}

// Helper to convert database format to form data
// DB uses signed amount, form uses positive amount + type
export function dbToFormData(transaction: Transaction): {
  amount: number
  type: TransactionType
} {
  if (transaction.is_transfer) {
    return {
      amount: Math.abs(transaction.amount),
      type: "transfer",
    }
  }
  if (transaction.amount < 0) {
    return {
      amount: Math.abs(transaction.amount),
      type: "expense",
    }
  }
  return {
    amount: transaction.amount,
    type: "income",
  }
}

// Format amount for display (with currency symbol)
export function formatAmount(amount: number): string {
  const formatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  })
  return formatter.format(amount)
}

// Format amount with color class
export function getAmountColorClass(amount: number): string {
  if (amount < 0) return "text-red-600 dark:text-red-400"
  if (amount > 0) return "text-green-600 dark:text-green-400"
  return "text-muted-foreground"
}

// Default form values
export function getDefaultTransactionValues(): Partial<TransactionFormData> {
  return {
    date: getTodayString(),
    type: "expense",
    description: "",
  }
}
