"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  ArrowRight,
  ArrowLeft,
  Wallet,
  PiggyBank,
  BarChart3,
  Check,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  CircleDollarSign,
  Building2,
  CreditCard,
  Banknote,
  TrendingUp,
  Target,
  Receipt,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  onboardingSchema,
  type OnboardingFormData,
  BUDGETING_FRAMEWORKS,
  FRAMEWORK_LABELS,
  FRAMEWORK_DESCRIPTIONS,
  type BudgetingFramework,
} from "@/lib/validators/user-profile"
import { cn } from "@/lib/utils"

const ACCOUNT_TYPES = [
  { value: "Checking", label: "Checking", icon: Building2, description: "Primary bank account" },
  { value: "Savings", label: "Savings", icon: PiggyBank, description: "For your savings" },
  { value: "Credit", label: "Credit Card", icon: CreditCard, description: "Track credit spending" },
  { value: "Cash", label: "Cash", icon: Banknote, description: "Physical cash tracking" },
  { value: "Investment", label: "Investment", icon: TrendingUp, description: "Stocks, ETFs, etc." },
] as const

const FEATURES = [
  { icon: Receipt, title: "Track Transactions", description: "Log income & expenses easily" },
  { icon: Wallet, title: "Smart Budgets", description: "Set limits per category" },
  { icon: Target, title: "Savings Goals", description: "Reach your financial goals" },
  { icon: MessageSquare, title: "AI Assistant", description: "Ask questions about your finances" },
]

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all",
              index + 1 < currentStep
                ? "bg-primary text-primary-foreground"
                : index + 1 === currentStep
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            {index + 1 < currentStep ? (
              <Check className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 transition-colors",
                index + 1 < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Welcome step component
function WelcomeStep({ firstName, onContinue }: { firstName: string; onContinue: () => void }) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-3">
        <div className="inline-flex p-4 rounded-full bg-primary/10 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Welcome, {firstName}! 🎉
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Let&apos;s set up your personal finance tracker in just a few quick steps.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <feature.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Value props */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span>Privacy-first</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span>Under 2 minutes</span>
        </div>
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-blue-500" />
          <span>100% free</span>
        </div>
      </div>

      <Button size="lg" onClick={onContinue} className="px-8">
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

// Framework selection step
function FrameworkStep({
  selectedFramework,
  onSelect,
  onBack,
}: {
  selectedFramework: BudgetingFramework | undefined
  onSelect: (framework: BudgetingFramework) => void
  onBack: () => void
}) {
  const frameworkDetails = {
    basic: {
      icon: Wallet,
      color: "blue",
      features: ["Custom category limits", "Flexible spending rules", "Best for: Most users"],
    },
    "50-30-20": {
      icon: PiggyBank,
      color: "green",
      features: ["50% needs, 30% wants, 20% savings", "Automatic category allocation", "Best for: Balanced lifestyle"],
    },
    "tracking-only": {
      icon: BarChart3,
      color: "purple",
      features: ["No budget limits", "Just track spending", "Best for: Getting started"],
    },
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Budgeting Style</h2>
        <p className="text-muted-foreground">
          Pick an approach that works for you. You can always change this later.
        </p>
      </div>

      <div className="grid gap-4">
        {BUDGETING_FRAMEWORKS.map((framework) => {
          const details = frameworkDetails[framework]
          const isSelected = selectedFramework === framework
          const Icon = details.icon
          
          return (
            <Card
              key={framework}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "hover:border-primary/50"
              )}
              onClick={() => onSelect(framework)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-xl shrink-0",
                      details.color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                      details.color === "green" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                      details.color === "purple" && "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{FRAMEWORK_LABELS[framework]}</h3>
                        <p className="text-sm text-muted-foreground">{FRAMEWORK_DESCRIPTIONS[framework]}</p>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {details.features.map((feature, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={!selectedFramework}
          onClick={() => selectedFramework && onSelect(selectedFramework)}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Account setup step
function AccountStep({
  form,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  form: ReturnType<typeof useForm<OnboardingFormData>>
  onSubmit: (data: OnboardingFormData) => void
  onBack: () => void
  isSubmitting: boolean
}) {
  const createAccount = form.watch("create_default_account")
  const selectedAccountType = form.watch("default_account_type")
  const selectedFramework = form.watch("budgeting_framework")

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Almost There!</h2>
        <p className="text-muted-foreground">
          Confirm your details and we&apos;ll set everything up.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              {...form.register("display_name")}
              placeholder="How should we call you?"
              className="bg-background"
            />
            {form.formState.errors.display_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.display_name.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Creation Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              First Account
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="create_default_account"
                checked={createAccount}
                onCheckedChange={(checked) =>
                  form.setValue("create_default_account", !!checked)
                }
              />
              <Label
                htmlFor="create_default_account"
                className="text-sm font-normal cursor-pointer"
              >
                Create now
              </Label>
            </div>
          </div>
          <CardDescription>
            {createAccount
              ? "Set up your first account to start tracking"
              : "You can add accounts later from the dashboard"}
          </CardDescription>
        </CardHeader>
        
        {createAccount && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_account_name">Account Name</Label>
              <Input
                id="default_account_name"
                {...form.register("default_account_name")}
                placeholder="e.g., Main Bank, TD Checking"
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Account Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map((type) => {
                  const isSelected = selectedAccountType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => form.setValue("default_account_type", type.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <type.icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <div>
                        <p className={cn("text-xs font-medium", isSelected && "text-primary")}>{type.label}</p>
                        <p className="text-[10px] text-muted-foreground">{type.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Card */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="font-medium text-sm">What we&apos;ll set up for you:</p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>
                <strong>{selectedFramework ? FRAMEWORK_LABELS[selectedFramework] : "Budget"}</strong> approach
              </span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>Default spending categories based on your framework</span>
            </li>
            {createAccount && (
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                <span>
                  <strong>{form.watch("default_account_name") || "Main Account"}</strong> ({selectedAccountType || "Checking"})
                </span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Complete Setup
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [step, setStep] = useState(0) // 0: welcome, 1: framework, 2: account
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      display_name: "",
      budgeting_framework: undefined,
      create_default_account: true,
      default_account_name: "Main Account",
      default_account_type: "Checking",
    },
  })

  // Update display name when session loads
  useEffect(() => {
    if (session?.user?.name && !form.getValues("display_name")) {
      form.setValue("display_name", session.user.name)
    }
  }, [session, form])

  const firstName = session?.user?.name?.split(" ")[0] || "there"

  async function onSubmit(data: OnboardingFormData) {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete onboarding")
      }

      toast.success("Welcome! Your account is ready. 🎉")
      router.push("/dashboard")
    } catch (error) {
      console.error("Onboarding error:", error)
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFrameworkSelect(framework: BudgetingFramework) {
    form.setValue("budgeting_framework", framework)
    if (step === 1) {
      setStep(2)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-primary">Pocket Pilot</h2>
        </div>

        {/* Step Indicator (show after welcome) */}
        {step > 0 && (
          <div className="mb-8">
            <StepIndicator currentStep={step} totalSteps={2} />
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border p-6 sm:p-8 shadow-xl">
          {step === 0 && (
            <WelcomeStep firstName={firstName} onContinue={() => setStep(1)} />
          )}
          
          {step === 1 && (
            <FrameworkStep
              selectedFramework={form.watch("budgeting_framework")}
              onSelect={handleFrameworkSelect}
              onBack={() => setStep(0)}
            />
          )}
          
          {step === 2 && (
            <AccountStep
              form={form}
              onSubmit={onSubmit}
              onBack={() => setStep(1)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Your data stays private and secure. We never share your financial information.</p>
        </div>
      </div>
    </div>
  )
}
