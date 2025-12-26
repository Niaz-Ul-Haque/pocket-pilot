"use client"

import { useEffect, useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react"
import { toast } from "sonner"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Skeleton } from "@/components/ui/skeleton"
import { AccountForm } from "@/components/forms/account-form"
import type { Account } from "@/lib/validators/account"

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>()
  const [deletingAccount, setDeletingAccount] = useState<Account | undefined>()
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    try {
      const response = await fetch("/api/accounts")
      if (!response.ok) {
        throw new Error("Failed to fetch accounts")
      }
      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast.error("Failed to load accounts")
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddAccount() {
    setEditingAccount(undefined)
    setIsDialogOpen(true)
  }

  function handleEditAccount(account: Account) {
    setEditingAccount(account)
    setIsDialogOpen(true)
  }

  function handleFormSuccess(savedAccount: Account) {
    if (editingAccount) {
      // Update existing account in list
      setAccounts((prev) =>
        prev.map((a) => (a.id === savedAccount.id ? savedAccount : a))
      )
      toast.success("Account updated successfully")
    } else {
      // Add new account to list
      setAccounts((prev) => [...prev, savedAccount])
      toast.success("Account created successfully")
    }
    setIsDialogOpen(false)
    setEditingAccount(undefined)
  }

  async function handleDeleteAccount() {
    if (!deletingAccount) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/accounts/${deletingAccount.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete account")
      }

      setAccounts((prev) => prev.filter((a) => a.id !== deletingAccount.id))
      toast.success("Account deleted successfully")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account")
    } finally {
      setIsDeleting(false)
      setDeletingAccount(undefined)
    }
  }

  function getAccountIcon(type: string) {
    // You could expand this with different icons per type
    return <Wallet className="h-5 w-5" />
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">
              Manage your financial accounts
            </p>
          </div>
          <Button onClick={handleAddAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first account to start tracking your finances.
              </p>
              <Button onClick={handleAddAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    {getAccountIcon(account.type)}
                  <CardTitle className="text-lg font-medium">
                    {account.name}
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeletingAccount(account)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <CardDescription>{account.type}</CardDescription>
                {/* Balance will be calculated from transactions in the future */}
                <p className="text-2xl font-bold mt-2">$0.00</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Account" : "Create Account"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update your account details."
                : "Add a new financial account to track your money."}
            </DialogDescription>
          </DialogHeader>
          <AccountForm
            account={editingAccount}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAccount?.name}&quot;? This
              action cannot be undone and will also delete all associated
              transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
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
