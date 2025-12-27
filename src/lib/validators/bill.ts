import { z } from "zod"

// ============================================================================
// BILL FREQUENCY
// ============================================================================

export const BILL_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
] as const
export type BillFrequency = (typeof BILL_FREQUENCIES)[number]

export const FREQUENCY_LABELS: Record<BillFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  yearly: "Yearly",
}

// ============================================================================
// BILL SCHEMAS
// ============================================================================

// Schema for creating a bill
export const billSchema = z.object({
  name: z
    .string()
    .min(1, "Bill name is required")
    .max(100, "Bill name must be 100 characters or less"),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .nullable()
    .optional(),
  frequency: z.enum(BILL_FREQUENCIES, {
    message: "Please select a frequency",
  }),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  category_id: z.string().uuid().nullable().optional(),
  auto_pay: z.boolean().default(false),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
})

// Schema for updating a bill
export const billUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Bill name is required")
    .max(100, "Bill name must be 100 characters or less")
    .optional(),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .nullable()
    .optional(),
  frequency: z.enum(BILL_FREQUENCIES).optional(),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional(),
  category_id: z.string().uuid().nullable().optional(),
  auto_pay: z.boolean().optional(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
  is_active: z.boolean().optional(),
})

// Schema for marking a bill as paid
export const markPaidSchema = z.object({
  create_transaction: z.boolean().optional().default(false),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .multipleOf(0.01, "Amount can only have up to 2 decimal places")
    .optional(),
  account_id: z.string().uuid().optional(),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional(),
})

// Type inferred from create schema (form input - with optional fields)
export type BillFormInput = z.input<typeof billSchema>
// Type inferred from create schema (form output - with defaults applied)
export type BillFormData = z.infer<typeof billSchema>

// Full bill type including database fields
export type Bill = {
  id: string
  user_id: string
  name: string
  amount: number | null
  frequency: BillFrequency
  next_due_date: string
  category_id: string | null
  auto_pay: boolean
  last_paid_date: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

// Bill with category name for display
export type BillWithCategory = Bill & {
  category_name: string | null
}

// Bill with calculated status
export type BillWithStatus = BillWithCategory & {
  status: BillStatus
  days_until_due: number
}

// Bill status
export type BillStatus = "overdue" | "due-today" | "due-soon" | "upcoming"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate days until due and status
 */
export function calculateBillStatus(bill: Bill | BillWithCategory): BillWithStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(bill.next_due_date)
  dueDate.setHours(0, 0, 0, 0)
  
  const diffTime = dueDate.getTime() - today.getTime()
  const days_until_due = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  let status: BillStatus
  if (days_until_due < 0) {
    status = "overdue"
  } else if (days_until_due === 0) {
    status = "due-today"
  } else if (days_until_due <= 3) {
    status = "due-soon"
  } else {
    status = "upcoming"
  }
  
  return {
    ...bill,
    category_name: (bill as BillWithCategory).category_name ?? null,
    status,
    days_until_due,
  }
}

/**
 * Calculate next due date based on frequency
 */
export function calculateNextDueDate(
  currentDueDate: string,
  frequency: BillFrequency
): string {
  const date = new Date(currentDueDate)
  
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7)
      break
    case "biweekly":
      date.setDate(date.getDate() + 14)
      break
    case "monthly":
      date.setMonth(date.getMonth() + 1)
      break
    case "yearly":
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  
  return date.toISOString().split("T")[0]
}

/**
 * Get status color classes
 */
export function getBillStatusColor(status: BillStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case "overdue":
      return {
        bg: "bg-red-50 dark:bg-red-950/30",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
      }
    case "due-today":
      return {
        bg: "bg-orange-50 dark:bg-orange-950/30",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-800",
      }
    case "due-soon":
      return {
        bg: "bg-yellow-50 dark:bg-yellow-950/30",
        text: "text-yellow-600 dark:text-yellow-400",
        border: "border-yellow-200 dark:border-yellow-800",
      }
    default:
      return {
        bg: "bg-muted/50",
        text: "text-muted-foreground",
        border: "border-border",
      }
  }
}

/**
 * Get status label
 */
export function getBillStatusLabel(status: BillStatus, daysUntilDue: number): string {
  switch (status) {
    case "overdue":
      return `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"} overdue`
    case "due-today":
      return "Due today"
    case "due-soon":
      return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`
    default:
      return `Due in ${daysUntilDue} days`
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return "Variable"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
