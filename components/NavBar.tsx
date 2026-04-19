import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "./LogoutButton"
import Link from "next/link"

export async function NavBar() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b border-gray-800 bg-gray-950 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-white font-semibold text-sm">
          Virtual VC
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs truncate max-w-[200px]">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
