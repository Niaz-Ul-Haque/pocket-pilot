"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Star,
  FileText,
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
  DialogFooter,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransactionTemplateForm } from "@/components/forms/transaction-template-form"
import {
  type TransactionTemplateWithDetails,
  getDefaultApplyTemplateValues,
} from "@/lib/validators/transaction-template"
import { formatAmount } from "@/lib/validators/transaction"
import { getTagStyle, type Tag } from "@/lib/validators/tag"
import type { Account } from "@/lib/validators/account"
import type { Category } from "@/lib/validators/category"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TransactionTemplateWithDetails[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplateWithDetails | undefined>()
  const [deletingTemplate, setDeletingTemplate] = useState<TransactionTemplateWithDetails | undefined>()
  const [applyingTemplate, setApplyingTemplate] = useState<TransactionTemplateWithDetails | undefined>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applyDate, setApplyDate] = useState(getDefaultApplyTemplateValues().date || "")

  async function fetchData() {
    try {
      const [templatesRes, accountsRes, categoriesRes, tagsRes] = await Promise.all([
        fetch("/api/transaction-templates"),
        fetch("/api/accounts"),
        fetch("/api/categories"),
        fetch("/api/tags"),
      ])

      if (!templatesRes.ok) throw new Error("Failed to fetch templates")
      if (!accountsRes.ok) throw new Error("Failed to fetch accounts")
      if (!categoriesRes.ok) throw new Error("Failed to fetch categories")

      const [templatesData, accountsData, categoriesData, tagsData] = await Promise.all([
        templatesRes.json(),
        accountsRes.json(),
        categoriesRes.json(),
        tagsRes.ok ? tagsRes.json() : [],
      ])

      setTemplates(templatesData)
      setAccounts(accountsData)
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleAddTemplate() {
    setEditingTemplate(undefined)
    setIsDialogOpen(true)
  }

  function handleEditTemplate(template: TransactionTemplateWithDetails) {
    setEditingTemplate(template)
    setIsDialogOpen(true)
  }

  function handleFormSuccess(savedTemplate: TransactionTemplateWithDetails) {
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === savedTemplate.id ? savedTemplate : t))
      )
      toast.success("Template updated")
    } else {
      setTemplates((prev) => [savedTemplate, ...prev])
      toast.success("Template created")
    }
    setIsDialogOpen(false)
    setEditingTemplate(undefined)
  }

  async function handleDeleteTemplate() {
    if (!deletingTemplate) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/transaction-templates/${deletingTemplate.id}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete template")
      }

      setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id))
      toast.success("Template deleted")
    } catch (error) {
      console.error("Failed to delete template:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete template"
      )
    } finally {
      setIsDeleting(false)
      setDeletingTemplate(undefined)
    }
  }

  async function handleApplyTemplate() {
    if (!applyingTemplate) return

    setIsApplying(true)
    try {
      const response = await fetch(
        `/api/transaction-templates/${applyingTemplate.id}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: applyDate }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to apply template")
      }

      toast.success("Transaction created from template")
      fetchData() // Refresh to update usage count
    } catch (error) {
      console.error("Failed to apply template:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to apply template"
      )
    } finally {
      setIsApplying(false)
      setApplyingTemplate(undefined)
    }
  }

  function openApplyDialog(template: TransactionTemplateWithDetails) {
    setApplyingTemplate(template)
    setApplyDate(getDefaultApplyTemplateValues().date || "")
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transaction Templates</h1>
            <p className="text-muted-foreground">
              Save common transactions for quick entry
            </p>
          </div>
          <Button onClick={handleAddTemplate} disabled={accounts.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        </div>

        {accounts.length === 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
            <CardContent className="py-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You need to create at least one account before adding templates.{" "}
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

        {/* Templates List */}
        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No templates yet</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                Create templates for transactions you enter frequently, like weekly groceries
                or monthly subscriptions.
              </p>
              {accounts.length > 0 && (
                <Button className="mt-4" onClick={handleAddTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className={template.is_favorite ? "border-yellow-300" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {template.is_favorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge variant={template.type === "expense" ? "destructive" : "default"}>
                      {template.type}
                    </Badge>
                  </div>
                  <CardDescription>
                    {template.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatAmount(template.type === "expense" ? -template.amount : template.amount)}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      {template.account_name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {template.category_name && (
                      <Badge variant="outline">{template.category_name}</Badge>
                    )}
                    {template.tags && template.tags.length > 0 && (
                      <>
                        {template.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            style={getTagStyle(tag.color)}
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </>
                    )}
                  </div>

                  {template.usage_count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Used {template.usage_count} time{template.usage_count !== 1 ? "s" : ""}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeletingTemplate(template)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openApplyDialog(template)}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? "Update the transaction template."
                  : "Create a template for quick transaction entry."}
              </DialogDescription>
            </DialogHeader>
            <TransactionTemplateForm
              template={editingTemplate}
              accounts={accounts}
              categories={categories}
              tags={tags}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Apply Template Dialog */}
        <Dialog
          open={!!applyingTemplate}
          onOpenChange={(open) => !open && setApplyingTemplate(undefined)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Use Template</DialogTitle>
              <DialogDescription>
                Create a transaction from &quot;{applyingTemplate?.name}&quot;
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex justify-between items-center">
                  <span>{applyingTemplate?.description || "No description"}</span>
                  <span className="font-bold">
                    {applyingTemplate && formatAmount(
                      applyingTemplate.type === "expense"
                        ? -applyingTemplate.amount
                        : applyingTemplate.amount
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apply-date">Date</Label>
                <Input
                  id="apply-date"
                  type="date"
                  value={applyDate}
                  onChange={(e) => setApplyDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setApplyingTemplate(undefined)}
                disabled={isApplying}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyTemplate}
                disabled={isApplying || !applyDate}
              >
                {isApplying ? "Creating..." : "Create Transaction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingTemplate}
          onOpenChange={(open) => !open && setDeletingTemplate(undefined)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the template &quot;{deletingTemplate?.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTemplate}
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
