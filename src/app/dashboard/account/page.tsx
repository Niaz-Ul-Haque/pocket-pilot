"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  User,
  Mail,
  Calendar,
  Wallet,
  Save,
  Loader2,
  Settings,
  CreditCard,
  Sparkles,
  RotateCcw,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  profileUpdateSchema,
  type ProfileUpdateData,
  type UserProfile,
  BUDGETING_FRAMEWORKS,
  FRAMEWORK_LABELS,
  type BudgetingFramework,
} from "@/lib/validators/user-profile"
import { type Account } from "@/lib/validators/account"
import { useUserPreferences } from "@/components/providers"
import { format } from "date-fns"

export default function AccountPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { preferences, updatePreferences } = useUserPreferences()

  const form = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      display_name: "",
      budgeting_framework: undefined,
    },
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, accountsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/accounts"),
        ])

        if (profileRes.ok) {
          const data = await profileRes.json()
          setProfile(data.profile)
          if (data.profile) {
            form.reset({
              display_name: data.profile.display_name || "",
              budgeting_framework: data.profile.budgeting_framework,
            })
          }
        }

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [form])

  async function onSubmit(data: ProfileUpdateData) {
    setIsSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      toast.success("Profile updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your account details from Google sign-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
              <AvatarFallback className="text-lg">{userInitials || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{session?.user?.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {session?.user?.email}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                {...form.register("display_name")}
                placeholder="Your preferred name"
              />
              {form.formState.errors.display_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.display_name.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This name will be shown in greetings and reports
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgeting_framework">Budgeting Approach</Label>
              <Select
                value={form.watch("budgeting_framework")}
                onValueChange={(value) =>
                  form.setValue("budgeting_framework", value as BudgetingFramework)
                }
              >
                <SelectTrigger id="budgeting_framework">
                  <SelectValue placeholder="Select approach" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGETING_FRAMEWORKS.map((framework) => (
                    <SelectItem key={framework} value={framework}>
                      {FRAMEWORK_LABELS[framework]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This affects default categories and budget suggestions
              </p>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            App Preferences
          </CardTitle>
          <CardDescription>
            Customize your Pocket Pilot experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Account */}
          <div className="space-y-2">
            <Label htmlFor="default_account">Default Account</Label>
            <Select
              value={preferences.defaultAccountId || "none"}
              onValueChange={(value) =>
                updatePreferences({ defaultAccountId: value === "none" ? null : value })
              }
            >
              <SelectTrigger id="default_account">
                <SelectValue placeholder="Select default account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3 w-3" />
                      {account.name} ({account.type})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This account will be pre-selected when adding new transactions
            </p>
          </div>

          <Separator />

          {/* Show Onboarding Tour Again */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Onboarding Tour</Label>
              <p className="text-xs text-muted-foreground">
                Show the guided tour again to learn about features
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updatePreferences({ hasSeenOnboardingTour: false })
                toast.success("Tour reset! Refresh the page to see it.")
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Tour
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {profile?.created_at
                  ? format(new Date(profile.created_at), "MMMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Currency</p>
              <p className="text-sm text-muted-foreground">{profile?.currency || "CAD"} (Canadian Dollar)</p>
            </div>
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-sm text-green-600">Active</p>
            </div>
            <div>
              <p className="text-sm font-medium">Onboarding</p>
              <p className="text-sm text-muted-foreground">
                {profile?.has_completed_onboarding ? "Completed" : "Pending"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
