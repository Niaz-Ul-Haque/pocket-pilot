"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useUserPreferences } from "@/components/providers"

type TourStep = {
  id: string
  title: string
  description: string
  tip?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Pocket Pilot! 🚀",
    description:
      "Let's take a quick tour of the key features that will help you manage your finances effectively.",
    tip: "This tour takes about 1 minute.",
  },
  {
    id: "command-palette",
    title: "Command Palette",
    description:
      "Press Cmd/Ctrl + K anytime to open the command palette. Search for anything, navigate quickly, or switch themes.",
    tip: "Try pressing Cmd/Ctrl + K after this tour!",
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    description:
      "Power users love shortcuts! Press 'g' then a letter to navigate: g+h for Home, g+t for Transactions, g+b for Budgets, and more.",
    tip: "Press '?' to see all available shortcuts.",
  },
  {
    id: "quick-add",
    title: "Quick Add Button",
    description:
      "The floating + button in the bottom right lets you quickly add transactions, goals, budgets, and more without navigating away.",
    tip: "Press 'n' for an even faster way to add transactions!",
  },
  {
    id: "ai-assistant",
    title: "AI Financial Advisor",
    description:
      "Click 'AI Advisor' in Quick Actions to chat with your personal finance assistant. Ask questions like 'How much did I spend on groceries?' or 'What's my savings rate?'",
    tip: "The AI can also help categorize transactions and suggest savings!",
  },
  {
    id: "dark-mode",
    title: "Dark Mode",
    description:
      "Prefer dark mode? Click the sun/moon icon in the header or use the command palette to switch themes. You can also set it to follow your system preference.",
    tip: "Your preference is automatically saved.",
  },
  {
    id: "pinning",
    title: "Pin Important Items",
    description:
      "Star your most important transactions, goals, or bills to keep them easily accessible. Pinned items appear first in lists.",
    tip: "Look for the star icon on cards and list items.",
  },
  {
    id: "done",
    title: "You're All Set! 🎉",
    description:
      "That's the basics! Remember, you can always press Cmd/Ctrl + K for quick access to everything, or '?' for keyboard shortcuts.",
    tip: "Start by adding your accounts and a few transactions!",
  },
]

type OnboardingTourProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OnboardingTour({ open, onOpenChange }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const { updatePreferences } = useUserPreferences()

  const step = TOUR_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TOUR_STEPS.length - 1
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = () => {
    updatePreferences({ hasSeenOnboardingTour: true })
    onOpenChange(false)
    setCurrentStep(0)
  }

  const handleSkip = () => {
    updatePreferences({ hasSeenOnboardingTour: true })
    onOpenChange(false)
    setCurrentStep(0)
  }

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip} className="h-8 w-8">
              <X className="h-4 w-4" />
              <span className="sr-only">Skip tour</span>
            </Button>
          </div>
          <Progress value={progress} className="h-1 mt-4" />
          <DialogTitle className="mt-4">{step.title}</DialogTitle>
          <DialogDescription className="text-base">{step.description}</DialogDescription>
        </DialogHeader>

        {step.tip && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <span className="font-medium text-primary">💡 Tip:</span>{" "}
            <span className="text-muted-foreground">{step.tip}</span>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {!isLastStep && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
            )}
            <Button onClick={handleNext} className="gap-1">
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook to auto-show tour for new users
export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  const { preferences, isPreferencesLoaded } = useUserPreferences()

  useEffect(() => {
    // Wait for preferences to be loaded from localStorage before checking
    if (!isPreferencesLoaded || hasChecked) return

    // Show tour if user hasn't seen it yet (after a small delay for page load)
    const timer = setTimeout(() => {
      if (!preferences.hasSeenOnboardingTour) {
        setShowTour(true)
      }
      setHasChecked(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [isPreferencesLoaded, preferences.hasSeenOnboardingTour, hasChecked])

  return { showTour, setShowTour }
}
