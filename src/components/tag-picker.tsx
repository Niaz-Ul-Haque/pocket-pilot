"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { type Tag, getTagStyle } from "@/lib/validators/tag"
import { TagManagerModal } from "@/components/tag-manager-modal"

interface TagPickerProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  disabled?: boolean
}

export function TagPicker({
  selectedTagIds,
  onChange,
  disabled = false,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch tags on mount and when manager closes
  useEffect(() => {
    fetchTags()
  }, [])

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

  function handleTagToggle(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  function handleRemoveTag(tagId: string) {
    onChange(selectedTagIds.filter((id) => id !== tagId))
  }

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id))

  return (
    <div className="space-y-2">
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              style={getTagStyle(tag.color)}
              className="pr-1"
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Tag Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            {isLoading
              ? "Loading tags..."
              : selectedTagIds.length > 0
                ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""} selected`
                : "Select tags..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleTagToggle(tag.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedTagIds.includes(tag.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <Badge style={getTagStyle(tag.color)} className="mr-2">
                      {tag.name}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setManagerOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Manage Tags...
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Tag Manager Modal */}
      <TagManagerModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        onTagsChange={fetchTags}
      />
    </div>
  )
}
