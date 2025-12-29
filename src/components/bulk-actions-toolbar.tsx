"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Trash2,
  Tag,
  FolderEdit,
  X,
  CheckSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import type { Category } from "@/lib/validators/category"
import { type Tag as TagType, getTagStyle } from "@/lib/validators/tag"

interface BulkActionsToolbarProps {
  selectedCount: number
  selectedIds: string[]
  categories: Category[]
  tags: TagType[]
  onClearSelection: () => void
  onBulkComplete: () => void
}

export function BulkActionsToolbar({
  selectedCount,
  selectedIds,
  categories,
  tags,
  onClearSelection,
  onBulkComplete,
}: BulkActionsToolbarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Category dialog state
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  // Tags dialog state
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [replaceExisting, setReplaceExisting] = useState(false)

  async function handleBulkDelete() {
    setIsProcessing(true)
    try {
      const response = await fetch("/api/transactions/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_ids: selectedIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete transactions")
      }

      const result = await response.json()
      toast.success(result.message)
      onClearSelection()
      onBulkComplete()
    } catch (error) {
      console.error("Bulk delete failed:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete transactions"
      )
    } finally {
      setIsProcessing(false)
      setIsDeleteDialogOpen(false)
    }
  }

  async function handleBulkUpdateCategory() {
    if (!selectedCategory) {
      toast.error("Please select a category")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch("/api/transactions/bulk/update-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_ids: selectedIds,
          category_id: selectedCategory === "none" ? null : selectedCategory,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update category")
      }

      const result = await response.json()
      toast.success(result.message)
      onClearSelection()
      onBulkComplete()
    } catch (error) {
      console.error("Bulk update category failed:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to update category"
      )
    } finally {
      setIsProcessing(false)
      setIsCategoryDialogOpen(false)
      setSelectedCategory("")
    }
  }

  async function handleBulkAddTags() {
    if (selectedTags.length === 0) {
      toast.error("Please select at least one tag")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch("/api/transactions/bulk/add-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_ids: selectedIds,
          tag_ids: selectedTags,
          replace_existing: replaceExisting,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add tags")
      }

      const result = await response.json()
      toast.success(result.message)
      onClearSelection()
      onBulkComplete()
    } catch (error) {
      console.error("Bulk add tags failed:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to add tags"
      )
    } finally {
      setIsProcessing(false)
      setIsTagsDialogOpen(false)
      setSelectedTags([])
      setReplaceExisting(false)
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
        <div className="flex items-center gap-2 px-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCategoryDialogOpen(true)}
          disabled={isProcessing}
        >
          <FolderEdit className="mr-2 h-4 w-4" />
          Change Category
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsTagsDialogOpen(true)}
          disabled={isProcessing || tags.length === 0}
        >
          <Tag className="mr-2 h-4 w-4" />
          Add Tags
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isProcessing}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} transaction
              {selectedCount > 1 ? "s" : ""}? This action cannot be undone.
              <br />
              <br />
              <strong>Note:</strong> If any selected transactions are transfers,
              their linked transactions will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Category</DialogTitle>
            <DialogDescription>
              Update the category for {selectedCount} selected transaction
              {selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="category">New Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category" className="mt-2">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No category</span>
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCategoryDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdateCategory}
              disabled={isProcessing || !selectedCategory}
            >
              {isProcessing ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tags Dialog */}
      <Dialog open={isTagsDialogOpen} onOpenChange={setIsTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Add tags to {selectedCount} selected transaction
              {selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label>Select Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={selectedTags.includes(tag.id) ? getTagStyle(tag.color) : undefined}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No tags available. Create some tags first.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="replace-existing"
                checked={replaceExisting}
                onCheckedChange={(checked) => setReplaceExisting(checked === true)}
              />
              <Label htmlFor="replace-existing" className="text-sm font-normal">
                Replace existing tags (instead of adding to them)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTagsDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAddTags}
              disabled={isProcessing || selectedTags.length === 0}
            >
              {isProcessing ? "Adding..." : "Add Tags"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
