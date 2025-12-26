"use client"

import { signOut } from "next-auth/react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <DropdownMenuItem
      className="cursor-pointer text-red-600"
      onClick={handleSignOut}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </DropdownMenuItem>
  )
}
