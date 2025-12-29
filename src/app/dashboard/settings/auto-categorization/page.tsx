"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  GripVertical,
  Power,
  PowerOff,
  Wand2,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CategorizationRuleForm } from "@/components/forms/categorization-rule-form"
import {
  type CategorizationRuleWithCategory,
  RULE_TYPE_LABELS,
} from "@/lib/validators/categorization-rule"
import type { Category } from "@/lib/validators/category"

export default function AutoCategorizationPage() {
  const [rules, setRules] = useState<CategorizationRuleWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CategorizationRuleWithCategory | undefined>()
  const [deletingRule, setDeletingRule] = useState<CategorizationRuleWithCategory | undefined>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{
    total_checked: number
    total_matched: number
    message: string
  } | null>(null)

  async function fetchData() {
    try {
      const [rulesRes, categoriesRes] = await Promise.all([
        fetch("/api/categorization-rules"),
        fetch("/api/categories"),
      ])

      if (!rulesRes.ok) throw new Error("Failed to fetch rules")
      if (!categoriesRes.ok) throw new Error("Failed to fetch categories")

      const [rulesData, categoriesData] = await Promise.all([
        rulesRes.json(),
        categoriesRes.json(),
      ])

      setRules(rulesData)
      setCategories(categoriesData)
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

  function handleAddRule() {
    setEditingRule(undefined)
    setIsDialogOpen(true)
  }

  function handleEditRule(rule: CategorizationRuleWithCategory) {
    setEditingRule(rule)
    setIsDialogOpen(true)
  }

  function handleFormSuccess(savedRule: CategorizationRuleWithCategory) {
    if (editingRule) {
      setRules((prev) =>
        prev.map((r) => (r.id === savedRule.id ? savedRule : r))
      )
      toast.success("Rule updated")
    } else {
      setRules((prev) => [...prev, savedRule])
      toast.success("Rule created")
    }
    setIsDialogOpen(false)
    setEditingRule(undefined)
  }

  async function handleDeleteRule() {
    if (!deletingRule) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/categorization-rules/${deletingRule.id}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete rule")
      }

      setRules((prev) => prev.filter((r) => r.id !== deletingRule.id))
      toast.success("Rule deleted")
    } catch (error) {
      console.error("Failed to delete rule:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete rule"
      )
    } finally {
      setIsDeleting(false)
      setDeletingRule(undefined)
    }
  }

  async function handleToggleActive(rule: CategorizationRuleWithCategory) {
    try {
      const response = await fetch(`/api/categorization-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })

      if (!response.ok) {
        throw new Error("Failed to update rule")
      }

      const updatedRule = await response.json()
      setRules((prev) =>
        prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
      )
      toast.success(updatedRule.is_active ? "Rule activated" : "Rule deactivated")
    } catch (error) {
      console.error("Failed to toggle rule:", error)
      toast.error("Failed to update rule")
    }
  }

  async function handleApplyRules(dryRun: boolean) {
    setIsApplying(true)
    setApplyResult(null)

    try {
      const response = await fetch("/api/categorization-rules/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uncategorized_only: true,
          dry_run: dryRun,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to apply rules")
      }

      const result = await response.json()
      setApplyResult({
        total_checked: result.total_checked,
        total_matched: result.total_matched,
        message: result.message,
      })

      if (!dryRun && result.total_matched > 0) {
        toast.success(`Applied categories to ${result.total_matched} transaction(s)`)
      }
    } catch (error) {
      console.error("Failed to apply rules:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to apply rules"
      )
    } finally {
      setIsApplying(false)
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Auto-Categorization</h1>
            <p className="text-muted-foreground">
              Create rules to automatically categorize transactions
            </p>
          </div>
          <Button onClick={handleAddRule}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>

        {/* Apply Rules Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Apply Rules to Transactions
            </CardTitle>
            <CardDescription>
              Run your rules against uncategorized transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => handleApplyRules(true)}
                disabled={isApplying || rules.filter((r) => r.is_active).length === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                {isApplying ? "Checking..." : "Preview Changes"}
              </Button>
              <Button
                onClick={() => handleApplyRules(false)}
                disabled={isApplying || rules.filter((r) => r.is_active).length === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                {isApplying ? "Applying..." : "Apply Now"}
              </Button>
            </div>
            {applyResult && (
              <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                <p className="text-sm">
                  Checked {applyResult.total_checked} transaction(s),
                  matched {applyResult.total_matched} transaction(s).
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {applyResult.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rules List */}
        {rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wand2 className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No rules yet</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                Create rules to automatically categorize transactions based on their description.
                For example: &quot;UBER&quot; → Transportation
              </p>
              <Button className="mt-4" onClick={handleAddRule}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Rules ({rules.length})</CardTitle>
              <CardDescription>
                Rules are applied in order from top to bottom. First matching rule wins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    !rule.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-sm font-mono w-6">{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{rule.name}</span>
                      {!rule.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-xs">
                        {RULE_TYPE_LABELS[rule.rule_type]}
                      </Badge>
                      <span className="font-mono text-xs bg-muted px-1 rounded">
                        {rule.pattern}
                      </span>
                      <span>→</span>
                      <Badge variant="outline">
                        {rule.category_name}
                      </Badge>
                      {rule.case_sensitive && (
                        <span className="text-xs">(case-sensitive)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                      aria-label={rule.is_active ? "Deactivate rule" : "Activate rule"}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeletingRule(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Rule" : "Create Rule"}
              </DialogTitle>
              <DialogDescription>
                {editingRule
                  ? "Update the categorization rule."
                  : "Create a rule to automatically categorize transactions."}
              </DialogDescription>
            </DialogHeader>
            <CategorizationRuleForm
              rule={editingRule}
              categories={categories}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingRule}
          onOpenChange={(open) => !open && setDeletingRule(undefined)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the rule &quot;{deletingRule?.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRule}
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
