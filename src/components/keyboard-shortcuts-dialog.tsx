"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { KEYBOARD_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts"

type KeyboardShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ShortcutKey({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-6 select-none items-center justify-center rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground min-w-[24px]">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">then</span>
          )}
        </span>
      ))}
    </div>
  )
}

function ShortcutSection({
  title,
  shortcuts,
}: {
  title: string
  shortcuts: { keys: string[]; description: string }[]
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm">{shortcut.description}</span>
            <ShortcutKey keys={shortcut.keys} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to quickly navigate and perform actions.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            <ShortcutSection
              title="Navigation"
              shortcuts={KEYBOARD_SHORTCUTS.navigation}
            />
            <ShortcutSection
              title="Actions"
              shortcuts={KEYBOARD_SHORTCUTS.actions}
            />
            <ShortcutSection
              title="General"
              shortcuts={KEYBOARD_SHORTCUTS.misc}
            />
          </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p>
            <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">g</kbd> to enter
            navigation mode, then press the target key within 1 second.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
