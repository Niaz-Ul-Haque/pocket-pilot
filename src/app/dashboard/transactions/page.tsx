"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TransactionForm } from "@/components/forms/transaction-form"
import {
  type TransactionWithDetails,
  formatAmount,
  getAmountColorClass,
} from "@/lib/validators/transaction"
import type { Account } from "@/lib/validators/account"
import type { Category } from "@/lib/validators/category"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<
    TransactionWithDetails | undefined
  >()
  const [deletingTransaction, setDeletingTransaction] = useState<
    TransactionWithDetails | undefined
  >()
  const [isDeleting, setIsDeleting] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAccount, setFilterAccount] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch transactions, accounts, and categories in parallel
      const [transRes, accountsRes, categoriesRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ])

      if (!transRes.ok) throw new Error("Failed to fetch transactions")
      if (!accountsRes.ok) throw new Error("Failed to fetch accounts")
      if (!categoriesRes.ok) throw new Error("Failed to fetch categories")

      const [transData, accountsData, categoriesData] = await Promise.all([
        transRes.json(),
        accountsRes.json(),
        categoriesRes.json(),
      ])

      setTransactions(transData)
      setAccounts(accountsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load transactions")
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddTransaction() {
    setEditingTransaction(undefined)
    setIsDialogOpen(true)
  }

  function handleEditTransaction(transaction: TransactionWithDetails) {
    setEditingTransaction(transaction)
    setIsDialogOpen(true)
  }

  function handleFormSuccess(savedTransaction: TransactionWithDetails) {
    if (editingTransaction) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === savedTransaction.id ? savedTransaction : t))
      )
      toast.success("Transaction updated")
    } else {
      setTransactions((prev) => [savedTransaction, ...prev])
      toast.success("Transaction added")
    }
    setIsDialogOpen(false)
    setEditingTransaction(undefined)
  }

  async function handleDeleteTransaction() {
    if (!deletingTransaction) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/transactions/${deletingTransaction.id}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete transaction")
      }

      setTransactions((prev) =>
        prev.filter((t) => t.id !== deletingTransaction.id)
      )
      toast.success("Transaction deleted")
    } catch (error) {
      console.error("Failed to delete transaction:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete transaction"
      )
    } finally {
      setIsDeleting(false)
      setDeletingTransaction(undefined)
    }
  }

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    // Search filter
    if (
      searchTerm &&
      !t.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }
    // Account filter
    if (filterAccount !== "all" && t.account_id !== filterAccount) {
      return false
    }
    // Category filter
    if (filterCategory !== "all" && t.category_id !== filterCategory) {
      return false
    }
    return true
  })

  // Get icon for transaction type
  function getTransactionIcon(amount: number, isTransfer: boolean) {
    if (isTransfer) {
      return <ArrowRightLeft className="h-4 w-4 text-blue-500" />
    }
    if (amount < 0) {
      return <ArrowDownCircle className="h-4 w-4 text-red-500" />
    }
    return <ArrowUpCircle className="h-4 w-4 text-green-500" />
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="mt-2 h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Track your income and expenses
            </p>
          </div>
          <Button onClick={handleAddTransaction} disabled={accounts.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Warning if no accounts */}
        {accounts.length === 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
            <CardContent className="py-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You need to create at least one account before adding
                transactions.{" "}
                <a
                  href="/dashboard/accounts"
                  className="font-medium underline underline-offset-4"
                >
                  Create an account
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No transactions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {transactions.length === 0
                  ? "Start tracking your finances by adding your first transaction."
                  : "No transactions match your filters."}
              </p>
              {transactions.length === 0 && accounts.length > 0 && (
                <Button className="mt-4" onClick={handleAddTransaction}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Transaction
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(new Date(transaction.date + "T00:00:00"), "MMM d")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(
                            transaction.amount,
                            transaction.is_transfer
                          )}
                          <span>
                            {transaction.description || (
                              <span className="text-muted-foreground italic">
                                No description
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.category_name ? (
                          <Badge variant="outline">
                            {transaction.category_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{transaction.account_name}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${getAmountColorClass(
                          transaction.amount
                        )}`}
                      >
                        {formatAmount(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <span className="sr-only">Open menu</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingTransaction(transaction)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction
                  ? "Update the transaction details below."
                  : "Enter the details of your transaction."}
              </DialogDescription>
            </DialogHeader>
            <TransactionForm
              transaction={editingTransaction}
              accounts={accounts}
              categories={categories}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingTransaction}
          onOpenChange={(open) => !open && setDeletingTransaction(undefined)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction?
                <br />
                <br />
                <strong>
                  {deletingTransaction?.description || "No description"}
                </strong>
                {" — "}
                {deletingTransaction &&
                  formatAmount(deletingTransaction.amount)}
                <br />
                <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTransaction}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
