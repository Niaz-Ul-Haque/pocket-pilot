import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  csvImportSchema,
  parseDate,
  parseAmount,
  type ParsedCsvTransaction,
  type ImportResult,
} from "@/lib/validators/csv-import"

/**
 * POST /api/transactions/import
 * Import transactions from CSV data
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const validationResult = csvImportSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 }
    )
  }

  const { mapping, rows, preview_only } = validationResult.data

  // Verify account belongs to user
  const { data: account, error: accountError } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("id", mapping.account_id)
    .eq("user_id", session.user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // Get user's categories for matching
  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("user_id", session.user.id)
    .eq("is_archived", false)

  const categoryMap = new Map(
    categories?.map((c) => [c.name.toLowerCase(), c.id]) || []
  )

  // Get existing transactions for duplicate detection
  const { data: existingTransactions } = await supabaseAdmin
    .from("transactions")
    .select("date, amount, description")
    .eq("user_id", session.user.id)
    .eq("account_id", mapping.account_id)

  const existingSet = new Set(
    existingTransactions?.map(
      (t) => `${t.date}|${t.amount}|${(t.description || "").toLowerCase()}`
    ) || []
  )

  // Parse and validate rows
  const parsedTransactions: ParsedCsvTransaction[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + (mapping.has_header ? 2 : 1) // Account for header

    // Parse date
    const dateValue = String(row[mapping.date_column] || "")
    const date = parseDate(dateValue, mapping.date_format)
    if (!date) {
      parsedTransactions.push({
        date: "",
        amount: 0,
        description: null,
        category_name: null,
        is_duplicate: false,
        row_number: rowNumber,
        error: `Invalid date: "${dateValue}"`,
      })
      continue
    }

    // Parse amount
    let amount: number | null = null

    if (mapping.split_amounts && mapping.debit_column && mapping.credit_column) {
      // Separate debit/credit columns
      const debit = parseAmount(String(row[mapping.debit_column] || ""))
      const credit = parseAmount(String(row[mapping.credit_column] || ""))

      if (debit && debit > 0) {
        amount = -debit // Debits are expenses (negative)
      } else if (credit && credit > 0) {
        amount = credit // Credits are income (positive)
      } else if (debit === 0 && credit === 0) {
        // Skip zero-amount rows
        continue
      }
    } else {
      // Single amount column
      const amountValue = String(row[mapping.amount_column] || "")
      amount = parseAmount(amountValue)
    }

    if (amount === null || amount === 0) {
      parsedTransactions.push({
        date: "",
        amount: 0,
        description: null,
        category_name: null,
        is_duplicate: false,
        row_number: rowNumber,
        error: `Invalid amount in row ${rowNumber}`,
      })
      continue
    }

    // Get description
    const description = mapping.description_column
      ? String(row[mapping.description_column] || "").trim() || null
      : null

    // Get category
    const category_name = mapping.category_column
      ? String(row[mapping.category_column] || "").trim() || null
      : null

    // Check for duplicate
    const duplicateKey = `${date}|${amount}|${(description || "").toLowerCase()}`
    const is_duplicate = existingSet.has(duplicateKey)

    parsedTransactions.push({
      date,
      amount,
      description,
      category_name,
      is_duplicate,
      row_number: rowNumber,
      error: null,
    })
  }

  // If preview only, return parsed transactions
  if (preview_only) {
    return NextResponse.json({
      success: true,
      preview: true,
      transactions: parsedTransactions.slice(0, 10), // Return first 10 for preview
      total: parsedTransactions.length,
      valid: parsedTransactions.filter((t) => !t.error).length,
      duplicates: parsedTransactions.filter((t) => t.is_duplicate).length,
      errors: parsedTransactions.filter((t) => t.error).length,
    })
  }

  // Import valid, non-duplicate transactions
  const toImport = parsedTransactions.filter((t) => !t.error && !t.is_duplicate)

  if (toImport.length === 0) {
    return NextResponse.json({
      success: true,
      imported: 0,
      skipped: parsedTransactions.length - toImport.length,
      duplicates: parsedTransactions.filter((t) => t.is_duplicate).length,
      errors: parsedTransactions
        .filter((t) => t.error)
        .map((t) => `Row ${t.row_number}: ${t.error}`),
    } as ImportResult)
  }

  // Prepare inserts
  const inserts = toImport.map((t) => {
    let category_id = null
    if (t.category_name) {
      category_id = categoryMap.get(t.category_name.toLowerCase()) || null
    }

    return {
      user_id: session.user.id,
      account_id: mapping.account_id,
      category_id,
      date: t.date,
      amount: t.amount,
      description: t.description,
      is_transfer: false,
    }
  })

  // Insert in batches
  const BATCH_SIZE = 100
  let imported = 0

  for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
    const batch = inserts.slice(i, i + BATCH_SIZE)
    const { error } = await supabaseAdmin.from("transactions").insert(batch)

    if (error) {
      errors.push(`Batch import error: ${error.message}`)
    } else {
      imported += batch.length
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped: parsedTransactions.length - imported,
    duplicates: parsedTransactions.filter((t) => t.is_duplicate).length,
    errors: [
      ...errors,
      ...parsedTransactions
        .filter((t) => t.error)
        .map((t) => `Row ${t.row_number}: ${t.error}`),
    ],
  } as ImportResult)
}
