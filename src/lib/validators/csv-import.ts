import { z } from "zod"

// CSV column mapping schema
export const csvMappingSchema = z.object({
  date_column: z.string().min(1, "Date column is required"),
  amount_column: z.string().min(1, "Amount column is required"),
  description_column: z.string().optional(),
  category_column: z.string().optional(),
  // For split debit/credit columns
  debit_column: z.string().optional(),
  credit_column: z.string().optional(),
  // Whether amounts are in separate columns
  split_amounts: z.boolean().default(false),
  // Date format
  date_format: z.enum(["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "YYYY/MM/DD"]).default("YYYY-MM-DD"),
  // Whether to skip first row (header)
  has_header: z.boolean().default(true),
  // Account to import into
  account_id: z.string().uuid("Please select an account"),
})

export type CsvMappingData = z.infer<typeof csvMappingSchema>

// Import request schema
export const csvImportSchema = z.object({
  mapping: csvMappingSchema,
  rows: z.array(z.record(z.string(), z.unknown())),
  preview_only: z.boolean().default(false),
})

export type CsvImportData = z.infer<typeof csvImportSchema>

// Parsed transaction from CSV
export type ParsedCsvTransaction = {
  date: string
  amount: number
  description: string | null
  category_name: string | null
  is_duplicate: boolean
  row_number: number
  error: string | null
}

// Import result
export type ImportResult = {
  success: boolean
  imported: number
  skipped: number
  duplicates: number
  errors: string[]
  transactions?: ParsedCsvTransaction[]
}

// Parse date from various formats
export function parseDate(value: string, format: string): string | null {
  if (!value) return null

  const cleaned = value.trim()
  let parts: string[]

  switch (format) {
    case "YYYY-MM-DD":
      // Already correct format
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned
      }
      break

    case "MM/DD/YYYY":
      parts = cleaned.split("/")
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
      }
      break

    case "DD/MM/YYYY":
      parts = cleaned.split("/")
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
      }
      break

    case "YYYY/MM/DD":
      parts = cleaned.split("/")
      if (parts.length === 3) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
      }
      break
  }

  // Try to parse as ISO date
  try {
    const date = new Date(cleaned)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0]
    }
  } catch {
    // Ignore parse errors
  }

  return null
}

// Parse amount from string
export function parseAmount(value: string): number | null {
  if (!value) return null

  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, "").trim()

  // Handle parentheses for negative numbers: (100.00) -> -100.00
  if (/^\([\d.]+\)$/.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/[()]/g, ""))
    return isNaN(num) ? null : -num
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Check for duplicate transaction
export function isDuplicate(
  transaction: { date: string; amount: number; description: string | null },
  existingTransactions: Array<{ date: string; amount: number; description: string | null }>
): boolean {
  return existingTransactions.some(
    (t) =>
      t.date === transaction.date &&
      Math.abs(t.amount - transaction.amount) < 0.01 &&
      t.description?.toLowerCase() === transaction.description?.toLowerCase()
  )
}

// Common date formats to try
export const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "2024-12-25 (ISO)" },
  { value: "MM/DD/YYYY", label: "12/25/2024 (US)" },
  { value: "DD/MM/YYYY", label: "25/12/2024 (UK/EU)" },
  { value: "YYYY/MM/DD", label: "2024/12/25" },
]
