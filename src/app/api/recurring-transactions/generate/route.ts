import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateNextOccurrence } from "@/lib/validators/recurring-transaction"

// POST /api/recurring-transactions/generate - Generate transactions from due recurring templates
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]

    // Find all active recurring transactions due today or earlier
    const { data: dueRecurring, error: fetchError } = await supabaseAdmin
      .from("recurring_transactions")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .lte("next_occurrence_date", today)

    if (fetchError) {
      console.error("Error fetching due recurring transactions:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch recurring transactions" },
        { status: 500 }
      )
    }

    if (!dueRecurring || dueRecurring.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recurring transactions due",
        created: 0,
        transactions: [],
      })
    }

    const createdTransactions = []
    const errors = []

    // Process each due recurring transaction
    for (const recurring of dueRecurring) {
      try {
        // Check if we already created a transaction for this date
        // (prevents duplicates if called multiple times)
        const { data: existingTx } = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("recurring_transaction_id", recurring.id)
          .eq("date", recurring.next_occurrence_date)
          .single()

        if (existingTx) {
          // Already created, just update next occurrence
          const nextDate = calculateNextOccurrence(
            recurring.next_occurrence_date,
            recurring.frequency
          )

          await supabaseAdmin
            .from("recurring_transactions")
            .update({
              next_occurrence_date: nextDate,
              last_created_date: recurring.next_occurrence_date,
            })
            .eq("id", recurring.id)

          continue
        }

        // Create the transaction
        const { data: transaction, error: txError } = await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: session.user.id,
            account_id: recurring.account_id,
            category_id: recurring.category_id,
            date: recurring.next_occurrence_date,
            amount: recurring.amount,
            description: recurring.description,
            is_transfer: false,
            recurring_transaction_id: recurring.id,
          })
          .select()
          .single()

        if (txError) {
          errors.push({
            recurring_id: recurring.id,
            description: recurring.description,
            error: txError.message,
          })
          continue
        }

        // Update next occurrence date
        const nextDate = calculateNextOccurrence(
          recurring.next_occurrence_date,
          recurring.frequency
        )

        const { error: updateError } = await supabaseAdmin
          .from("recurring_transactions")
          .update({
            next_occurrence_date: nextDate,
            last_created_date: recurring.next_occurrence_date,
          })
          .eq("id", recurring.id)

        if (updateError) {
          console.error("Error updating next occurrence:", updateError)
          // Transaction was created, so we continue
        }

        createdTransactions.push({
          id: transaction.id,
          description: recurring.description,
          amount: recurring.amount,
          date: recurring.next_occurrence_date,
          next_occurrence: nextDate,
        })
      } catch (err) {
        errors.push({
          recurring_id: recurring.id,
          description: recurring.description,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdTransactions.length} transaction(s)`,
      created: createdTransactions.length,
      transactions: createdTransactions,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error in POST /api/recurring-transactions/generate:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
