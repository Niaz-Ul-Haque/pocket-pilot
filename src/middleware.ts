import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("next-auth.session-token") || request.cookies.get("__Secure-next-auth.session-token")

  const isAuthPage = request.nextUrl.pathname.startsWith("/login")
  const isProtectedPage = request.nextUrl.pathname.startsWith("/dashboard")
  const isOnboardingPage = request.nextUrl.pathname.startsWith("/onboarding")

  // If accessing protected page or onboarding without session, redirect to login
  if ((isProtectedPage || isOnboardingPage) && !sessionToken) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If accessing login page with session, redirect to dashboard
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/onboarding"],
}
