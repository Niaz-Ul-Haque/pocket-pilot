"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Archive,
  Tag,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
  Receipt,
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryForm } from "@/components/forms/category-form"
import { type Category, type CategoryType } from "@/lib/validators/category"

// Icon component for category types
function CategoryTypeIcon({ type }: { type: CategoryType }) {
  switch (type) {
    case "income":
      return <ArrowUpCircle className="h-4 w-4 text-green-500" />
    case "expense":
      return <ArrowDownCircle className="h-4 w-4 text-red-500" />
    case "transfer":
      return <ArrowRightLeft className="h-4 w-4 text-blue-500" />
    default:
      return <Tag className="h-4 w-4" />
  }
}

// Badge variant based on category type
function getTypeBadgeVariant(type: CategoryType) {
  switch (type) {
    case "income":
      return "default" as const
    case "expense":
      return "destructive" as const
    case "transfer":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()
  const [archivingCategory, setArchivingCategory] = useState<Category | undefined>()
  const [isArchiving, setIsArchiving] = useState(false)

  useEffect(() => {
    seedAndFetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function seedAndFetchCategories() {
    setIsSeeding(true)
    try {
      // First, try to seed default categories (idempotent)
      const seedResponse = await fetch("/api/categories/seed", { method: "POST" })
      if (seedResponse.ok) {
        const seedResult = await seedResponse.json()
        if (seedResult.seeded) {
          toast.success("Default categories created!")
        }
      }
    } catch (error) {
      console.error("Failed to seed categories:", error)
    } finally {
      setIsSeeding(false)
    }

    // Then fetch categories
    await fetchCategories()
  }

  async function fetchCategories() {
    try {
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Failed to fetch categories")
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      toast.error("Failed to load categories")
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddCategory() {
    setEditingCategory(undefined)
    setIsDialogOpen(true)
  }

  function handleEditCategory(category: Category) {
    setEditingCategory(category)
    setIsDialogOpen(true)
  }

  function handleFormSuccess(savedCategory: Category) {
    if (editingCategory) {
      // Update existing category in list
      setCategories((prev) =>
        prev.map((c) => (c.id === savedCategory.id ? savedCategory : c))
      )
      toast.success("Category updated")
    } else {
      // Add new category to list
      setCategories((prev) => [...prev, savedCategory])
      toast.success("Category created")
    }
    setIsDialogOpen(false)
    setEditingCategory(undefined)
  }

  async function handleArchiveCategory() {
    if (!archivingCategory) return

    setIsArchiving(true)
    try {
      const response = await fetch(`/api/categories/${archivingCategory.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to archive category")
      }

      // Remove from list (it's now archived)
      setCategories((prev) => prev.filter((c) => c.id !== archivingCategory.id))
      toast.success("Category archived")
    } catch (error) {
      console.error("Failed to archive category:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to archive category"
      )
    } finally {
      setIsArchiving(false)
      setArchivingCategory(undefined)
    }
  }

  // Group categories by type
  const groupedCategories = categories.reduce(
    (acc, category) => {
      if (!acc[category.type]) {
        acc[category.type] = []
      }
      acc[category.type].push(category)
      return acc
    },
    {} as Record<CategoryType, Category[]>
  )

  const typeOrder: CategoryType[] = ["expense", "income", "transfer"]

  if (isLoading || isSeeding) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage your expense and income categories
          </p>
        </div>
        <Button onClick={handleAddCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories grouped by type */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first category to start organizing your transactions.
            </p>
            <Button className="mt-4" onClick={handleAddCategory}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {typeOrder.map((type) => {
            const typeCategories = groupedCategories[type]
            if (!typeCategories || typeCategories.length === 0) return null

            return (
              <div key={type}>
                <div className="mb-4 flex items-center gap-2">
                  <CategoryTypeIcon type={type} />
                  <h2 className="text-xl font-semibold capitalize">{type}</h2>
                  <Badge variant="outline" className="ml-2">
                    {typeCategories.length}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {typeCategories.map((category) => (
                    <Card key={category.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CategoryTypeIcon type={category.type} />
                            <CardTitle className="text-base">
                              {category.name}
                            </CardTitle>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                onClick={() => handleEditCategory(category)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setArchivingCategory(category)}
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {category.is_tax_related && (
                          <CardDescription className="flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            Tax related
                            {category.tax_tag && ` • ${category.tax_tag}`}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category details below."
                : "Create a new category to organize your transactions."}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            category={editingCategory}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!archivingCategory}
        onOpenChange={(open) => !open && setArchivingCategory(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &quot;{archivingCategory?.name}&quot;?
              <br />
              <br />
              Archived categories won&apos;t appear in dropdowns but existing
              transactions will keep their categorization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveCategory}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
