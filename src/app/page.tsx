import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { DollarSign, TrendingUp, Shield, Zap } from "lucide-react"

export default async function Home() {
  const session = await auth()

  // If user is already logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Pocket Pilot
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Navigate your finances with confidence using AI-powered insights
          </p>
          <div className="pt-4">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started - Sign in with Google
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card>
            <CardHeader>
              <DollarSign className="h-10 w-10 mb-2 text-green-600" />
              <CardTitle>Track Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor your spending and income with easy-to-use transaction tracking
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 mb-2 text-blue-600" />
              <CardTitle>Visual Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Understand your financial trends with beautiful charts and insights
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 mb-2 text-purple-600" />
              <CardTitle>Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your data is encrypted and secure with Google authentication
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 mb-2 text-yellow-600" />
              <CardTitle>Quick & Easy</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Add transactions in seconds and stay on top of your finances
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to get started?</CardTitle>
              <CardDescription className="text-base">
                Sign in with your Google account and start tracking your finances today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Sign in with Google
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
