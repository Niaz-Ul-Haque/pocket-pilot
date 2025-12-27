"use client"

import { useState, useEffect } from "react"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, Tags } from "lucide-react"
import { TagForm } from "@/components/forms/tag-form"
import { type Tag, type TagWithCount, getTagStyle } from "@/lib/validators/tag"

interface TagManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTagsChange?: () => void
}

type ModalView = "list" | "create" | "edit"

export function TagManagerModal({
  open,
  onOpenChange,
  onTagsChange,
}: TagManagerModalProps) {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<ModalView>("list")
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagWithCount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch tags when modal opens
  useEffect(() => {
    if (open) {
      fetchTags()
    }
  }, [open])

  async function fetchTags() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/tags")
      if (response.ok) {
        const data = await response.json()
        setTags(data)
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleTagSaved(savedTag: Tag) {
    if (view === "create") {
      setTags((prev) => [...prev, { ...savedTag, transaction_count: 0 }])
    } else {
      setTags((prev) =>
        prev.map((t) =>
          t.id === savedTag.id ? { ...t, ...savedTag } : t
        )
      )
    }
    setView("list")
    setEditingTag(null)
    onTagsChange?.()
  }

  async function handleDeleteTag() {
    if (!deletingTag) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tags/${deletingTag.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTags((prev) => prev.filter((t) => t.id !== deletingTag.id))
        onTagsChange?.()
      }
    } catch (error) {
      console.error("Failed to delete tag:", error)
    } finally {
      setIsDeleting(false)
      setDeletingTag(null)
    }
  }

  function handleClose() {
    setView("list")
    setEditingTag(null)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              {view === "list" && "Manage Tags"}
              {view === "create" && "Create Tag"}
              {view === "edit" && "Edit Tag"}
            </DialogTitle>
            <DialogDescription>
              {view === "list" &&
                "Create and manage tags to organize your transactions."}
              {view === "create" && "Add a new tag to categorize transactions."}
              {view === "edit" && "Update the tag details."}
            </DialogDescription>
          </DialogHeader>

          {view === "list" && (
            <div className="space-y-4">
              {/* Add Tag Button */}
              <Button
                onClick={() => setView("create")}
                className="w-full"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Tag
              </Button>

              {/* Tags List */}
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {isLoading ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : tags.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Tags className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No tags yet</p>
                    <p className="text-sm">Create your first tag above</p>
                  </div>
                ) : (
                  tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge style={getTagStyle(tag.color)}>{tag.name}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {tag.transaction_count} transaction
                          {tag.transaction_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTag(tag)
                            setView("edit")
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTag(tag)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {view === "create" && (
            <TagForm
              onSuccess={handleTagSaved}
              onCancel={() => setView("list")}
            />
          )}

          {view === "edit" && editingTag && (
            <TagForm
              tag={editingTag}
              onSuccess={handleTagSaved}
              onCancel={() => {
                setView("list")
                setEditingTag(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTag} onOpenChange={() => setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag &quot;{deletingTag?.name}&quot;?
              {deletingTag && deletingTag.transaction_count > 0 && (
                <span className="mt-2 block font-medium text-destructive">
                  This tag is used by {deletingTag.transaction_count} transaction
                  {deletingTag.transaction_count !== 1 ? "s" : ""}. It will be
                  removed from all of them.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
