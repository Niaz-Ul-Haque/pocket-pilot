"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
  Sparkles,
  FileSpreadsheet,
  Layers,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
} from "lucide-react"
import {
  type BudgetTemplateWithItems,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPE_DESCRIPTIONS,
  type TemplateType,
} from "@/lib/validators/budget-template"
import { formatCurrency } from "@/lib/validators/budget"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const TEMPLATE_ICONS: Record<TemplateType, React.ReactNode> = {
  FIFTY_THIRTY_TWENTY: <Sparkles className="h-6 w-6" />,
  ENVELOPE: <FileSpreadsheet className="h-6 w-6" />,
  ZERO_BASED: <Layers className="h-6 w-6" />,
  CUSTOM: <Plus className="h-6 w-6" />,
}

export default function BudgetTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<BudgetTemplateWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplateWithItems | null>(null)
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [monthlyIncome, setMonthlyIncome] = useState<string>("")
  const [isApplying, setIsApplying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/budget-templates")
      if (!response.ok) throw new Error("Failed to fetch templates")
      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return

    setIsApplying(true)
    try {
      const response = await fetch(
        `/api/budget-templates/${selectedTemplate.id}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
            replace_existing: replaceExisting,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply template")
      }

      toast.success(
        `Created ${data.created?.length || 0} budget(s). ${
          data.skipped?.length
            ? `Skipped ${data.skipped.length} (no matching categories or already exists).`
            : ""
        }`
      )

      setShowApplyDialog(false)
      setMonthlyIncome("")
      router.push("/dashboard/budgets")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply template")
    } finally {
      setIsApplying(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/budget-templates/${selectedTemplate.id}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete template")
      }

      toast.success(`"${selectedTemplate.name}" has been deleted.`)

      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplate.id))
      setShowDeleteDialog(false)
      setSelectedTemplate(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mx-auto mt-4 block"
              onClick={() => {
                setError(null)
                setIsLoading(true)
                fetchTemplates()
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const systemTemplates = templates.filter((t) => t.is_system)
  const customTemplates = templates.filter((t) => !t.is_system)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/dashboard/budgets")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Budgets
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Budget Templates</h1>
        <p className="text-muted-foreground">
          Choose a template to quickly set up your budget categories
        </p>
      </div>

      {/* System Templates */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Recommended Templates</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systemTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => {
                setSelectedTemplate(template)
                setShowApplyDialog(true)
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      {TEMPLATE_ICONS[template.template_type]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        System Template
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {TEMPLATE_TYPE_DESCRIPTIONS[template.template_type]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground">
                    {template.items.length} budget categories:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.items.slice(0, 5).map((item) => (
                      <Badge key={item.id} variant="outline" className="text-xs">
                        {item.category_name}
                        {item.percentage && ` (${item.percentage}%)`}
                      </Badge>
                    ))}
                    {template.items.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.items.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Your Custom Templates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customTemplates.map((template) => (
              <Card key={template.id} className="group relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTemplate(template)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {template.items.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{item.category_name}</span>
                        <span className="text-muted-foreground">
                          {item.percentage
                            ? `${item.percentage}%`
                            : item.fixed_amount
                            ? formatCurrency(item.fixed_amount)
                            : ""}
                        </span>
                      </div>
                    ))}
                    {template.items.length > 4 && (
                      <p className="text-sm text-muted-foreground">
                        +{template.items.length - 4} more categories
                      </p>
                    )}
                  </div>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowApplyDialog(true)
                    }}
                  >
                    Apply Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Apply Template Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              This will create budgets based on the template. You&apos;ll need matching
              expense categories for each budget item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="income">Monthly Income (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="income"
                  type="number"
                  step="0.01"
                  placeholder="5000.00"
                  className="pl-7"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Used to calculate budget amounts from percentages. Defaults to $5,000
                if not provided.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="replaceExisting"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="replaceExisting" className="text-sm">
                Replace existing budgets (delete all current budgets first)
              </Label>
            </div>

            {selectedTemplate && (
              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm font-medium">Template Preview:</p>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {selectedTemplate.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{item.category_name}</span>
                      <span className="text-muted-foreground">
                        {item.percentage
                          ? `${item.percentage}% → ${formatCurrency(
                              (item.percentage / 100) *
                                (parseFloat(monthlyIncome) || 5000)
                            )}`
                          : item.fixed_amount
                          ? formatCurrency(item.fixed_amount)
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyTemplate} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Apply Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedTemplate?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
  )
}
