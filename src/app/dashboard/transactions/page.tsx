"use client"

import { useState, useEffect, useCallback } from "react"
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
  Upload,
  Download,
  FileJson,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Split,
  Link2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
  DropdownMenuSeparator,
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
import { Checkbox } from "@/components/ui/checkbox"
import { TransactionForm } from "@/components/forms/transaction-form"
import { TransferForm } from "@/components/forms/transfer-form"
import { CsvImportForm } from "@/components/forms/csv-import-form"
import { BulkActionsToolbar } from "@/components/bulk-actions-toolbar"
import { SplitTransactionDialog } from "@/components/split-transaction-dialog"
import { TransactionLinkDialog } from "@/components/transaction-link-dialog"
import {
  type TransactionWithDetails,
  formatAmount,
  getAmountColorClass,
} from "@/lib/validators/transaction"
import type { Account } from "@/lib/validators/account"
import type { Category } from "@/lib/validators/category"
import { type Tag, getTagStyle } from "@/lib/validators/tag"
import { NaturalLanguageSearch } from "@/components/natural-language-search"

// Extended type with tags
interface TransactionWithTags extends TransactionWithDetails {
  tags?: Array<{ id: string; name: string; color: string }>
  linked_account_name?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithTags[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<
    TransactionWithTags | undefined
  >()
  const [deletingTransaction, setDeletingTransaction] = useState<
    TransactionWithTags | undefined
  >()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Split and link dialogs
  const [splittingTransaction, setSplittingTransaction] = useState<
    TransactionWithTags | undefined
  >()
  const [linkingTransaction, setLinkingTransaction] = useState<
    TransactionWithTags | undefined
  >()

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAccount, setFilterAccount] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterTag, setFilterTag] = useState<string>("all")

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1)
  }, [filterAccount, filterCategory])

  async function fetchData() {
    try {
      // Build query params for transactions
      const offset = (page - 1) * pageSize
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
        withCount: "true",
      })

      // Add server-side filters
      if (filterAccount !== "all") {
        params.set("accountId", filterAccount)
      }
      if (filterCategory !== "all") {
        params.set("categoryId", filterCategory)
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch)
      }

      // Fetch transactions, accounts, categories, and tags in parallel
      const [transRes, accountsRes, categoriesRes, tagsRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch("/api/accounts"),
        fetch("/api/categories"),
        fetch("/api/tags"),
      ])

      if (!transRes.ok) throw new Error("Failed to fetch transactions")
      if (!accountsRes.ok) throw new Error("Failed to fetch accounts")
      if (!categoriesRes.ok) throw new Error("Failed to fetch categories")

      const [transData, accountsData, categoriesData, tagsData] = await Promise.all([
        transRes.json(),
        accountsRes.json(),
        categoriesRes.json(),
        tagsRes.ok ? tagsRes.json() : [],
      ])

      // Extract pagination data
      const { transactions: transactionsArray, pagination } = transData
      setTotalCount(pagination?.total ?? 0)

      // Fetch tags for each transaction
      const transWithTags = await Promise.all(
        transactionsArray.map(async (t: TransactionWithTags) => {
          try {
            const tagsRes = await fetch(`/api/transactions/${t.id}/tags`)
            const txTags = tagsRes.ok ? await tagsRes.json() : []
            return { ...t, tags: txTags }
          } catch {
            return { ...t, tags: [] }
          }
        })
      )

      setTransactions(transWithTags)
      setAccounts(accountsData)
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load transactions")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data when pagination or filters change
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, filterAccount, filterCategory])

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

  async function handleExport(format: "csv" | "json") {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/export?format=${format}&type=transactions`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to export transactions")
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `transactions.${format}`

      // Create a blob and download it
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Transactions exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error("Failed to export:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to export transactions"
      )
    } finally {
      setIsExporting(false)
    }
  }

  // Filter transactions (only tags are client-side now, account/category/search are server-side)
  const filteredTransactions = transactions.filter((t) => {
    // Tag filter (client-side since tags are fetched separately)
    if (filterTag !== "all") {
      const hasTag = t.tags?.some((tag) => tag.id === filterTag)
      if (!hasTag) return false
    }
    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

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

  // Multi-select handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)))
    }
  }, [filteredTransactions, selectedIds.size])

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Clear selection when filters or page changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, debouncedSearch, filterAccount, filterCategory, filterTag])

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
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={transactions.length === 0 || isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={() => setIsTransferDialogOpen(true)}
              disabled={accounts.length < 2}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              disabled={accounts.length === 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={handleAddTransaction} disabled={accounts.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
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

        {/* AI-Powered Natural Language Search */}
        <NaturalLanguageSearch />

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Quick search..."
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
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedIds.size}
            selectedIds={Array.from(selectedIds)}
            categories={categories}
            tags={tags}
            onClearSelection={clearSelection}
            onBulkComplete={fetchData}
          />
        )}

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No transactions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {totalCount === 0 && !debouncedSearch && filterAccount === "all" && filterCategory === "all" && filterTag === "all"
                  ? "Start tracking your finances by adding your first transaction."
                  : "No transactions match your filters."}
              </p>
              {totalCount === 0 && !debouncedSearch && filterAccount === "all" && filterCategory === "all" && filterTag === "all" && accounts.length > 0 && (
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
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          filteredTransactions.length > 0 &&
                          selectedIds.size === filteredTransactions.length
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className={selectedIds.has(transaction.id) ? "bg-muted/50" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(transaction.id)}
                          onCheckedChange={() => toggleSelectOne(transaction.id)}
                          aria-label={`Select transaction ${transaction.description || transaction.id}`}
                        />
                      </TableCell>
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
                      <TableCell>
                        {transaction.tags && transaction.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {transaction.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                style={getTagStyle(tag.color)}
                                className="text-xs"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{transaction.account_name}</span>
                          {transaction.is_transfer && transaction.linked_transaction_id && (
                            <span className="text-xs text-muted-foreground">
                              {transaction.amount < 0 ? "→" : "←"}{" "}
                              {transaction.linked_account_name || "Linked account"}
                            </span>
                          )}
                        </div>
                      </TableCell>
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
                            {!transaction.is_transfer && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setSplittingTransaction(transaction)}
                                >
                                  <Split className="mr-2 h-4 w-4" />
                                  Split
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setLinkingTransaction(transaction)}
                                >
                                  <Link2 className="mr-2 h-4 w-4" />
                                  Link to Another
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
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

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {startItem} to {endItem} of {totalCount} transactions
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                    <span className="sr-only">First page</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                  </Button>
                  <span className="px-3 text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                    <span className="sr-only">Last page</span>
                  </Button>
                </div>
              </div>
            )}
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

        {/* CSV Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Transactions from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file from your bank to import transactions.
              </DialogDescription>
            </DialogHeader>
            <CsvImportForm
              accounts={accounts}
              onSuccess={() => {
                setIsImportDialogOpen(false)
                fetchData()
              }}
              onCancel={() => setIsImportDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog */}
        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Transfer Between Accounts</DialogTitle>
              <DialogDescription>
                Move money from one account to another.
              </DialogDescription>
            </DialogHeader>
            <TransferForm
              accounts={accounts}
              onSuccess={() => {
                setIsTransferDialogOpen(false)
                fetchData()
              }}
              onCancel={() => setIsTransferDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Split Transaction Dialog */}
        <SplitTransactionDialog
          isOpen={!!splittingTransaction}
          onOpenChange={(open) => !open && setSplittingTransaction(undefined)}
          transaction={splittingTransaction || null}
          categories={categories}
          onSuccess={() => {
            setSplittingTransaction(undefined)
            fetchData()
          }}
        />

        {/* Link Transaction Dialog */}
        <TransactionLinkDialog
          isOpen={!!linkingTransaction}
          onOpenChange={(open) => !open && setLinkingTransaction(undefined)}
          sourceTransaction={linkingTransaction || null}
          onSuccess={() => {
            setLinkingTransaction(undefined)
            fetchData()
          }}
        />
      </div>
    </div>
  )
}
