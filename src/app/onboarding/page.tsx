"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  ArrowRight,
  Wallet,
  PiggyBank,
  BarChart3,
  Check,
  Loader2,
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
import {
  onboardingSchema,
  type OnboardingFormData,
  BUDGETING_FRAMEWORKS,
  FRAMEWORK_LABELS,
  FRAMEWORK_DESCRIPTIONS,
  type BudgetingFramework,
} from "@/lib/validators/user-profile"
import { cn } from "@/lib/utils"

const ACCOUNT_TYPES = ["Checking", "Savings", "Credit", "Cash"] as const

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      display_name: session?.user?.name || "",
      budgeting_framework: undefined,
      create_default_account: true,
      default_account_name: "Main Account",
      default_account_type: "Checking",
    },
  })

  const selectedFramework = form.watch("budgeting_framework")
  const createAccount = form.watch("create_default_account")

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

      toast.success("Welcome! Your account is ready.")
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
    setStep(2)
  }

  function handleBack() {
    setStep(1)
  }

  const firstName = session?.user?.name?.split(" ")[0] || "there"

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your personal finance tracker in just a minute.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={cn(
              "h-2 w-16 rounded-full transition-colors",
              step >= 1 ? "bg-primary" : "bg-muted"
            )}
          />
          <div
            className={cn(
              "h-2 w-16 rounded-full transition-colors",
              step >= 2 ? "bg-primary" : "bg-muted"
            )}
          />
        </div>

        {/* Step 1: Choose Framework */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-1">
                How do you want to budget?
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose an approach that works for you. You can change this later.
              </p>
            </div>

            <div className="grid gap-4">
              {BUDGETING_FRAMEWORKS.map((framework) => (
                <Card
                  key={framework}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedFramework === framework && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleFrameworkSelect(framework)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {framework === "basic" && (
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          <Wallet className="h-5 w-5" />
                        </div>
                      )}
                      {framework === "50-30-20" && (
                        <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          <PiggyBank className="h-5 w-5" />
                        </div>
                      )}
                      {framework === "tracking-only" && (
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {FRAMEWORK_LABELS[framework]}
                        </CardTitle>
                        <CardDescription>
                          {FRAMEWORK_DESCRIPTIONS[framework]}
                        </CardDescription>
                      </div>
                      {selectedFramework === framework && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Account Setup */}
        {step === 2 && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-1">Almost done!</h2>
              <p className="text-sm text-muted-foreground">
                Confirm your details and we&apos;ll set everything up.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    {...form.register("display_name")}
                    placeholder="Your name"
                  />
                  {form.formState.errors.display_name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.display_name.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
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
                    Create a default account to get started
                  </Label>
                </div>

                {createAccount && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-2 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="default_account_name">Account Name</Label>
                      <Input
                        id="default_account_name"
                        {...form.register("default_account_name")}
                        placeholder="e.g., Main Account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_account_type">Account Type</Label>
                      <Select
                        value={form.watch("default_account_type")}
                        onValueChange={(value) =>
                          form.setValue("default_account_type", value)
                        }
                      >
                        <SelectTrigger id="default_account_type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">
                  We&apos;ll set up your account with:
                </p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>
                      {FRAMEWORK_LABELS[selectedFramework as BudgetingFramework]}{" "}
                      approach
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Default spending categories</span>
                  </li>
                  {createAccount && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>
                        {form.watch("default_account_name") || "Main Account"} (
                        {form.watch("default_account_type") || "Checking"})
                      </span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleBack}>
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
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
