import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/LoginForm"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect(searchParams.next ?? "/")

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Sign in to Virtual VC</h1>
          <p className="text-gray-400 text-sm mt-2">
            Create an account to start pitching.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <LoginForm next={searchParams.next} />
        </div>
        {searchParams.error && (
          <p className="text-red-400 text-sm text-center mt-4">
            Authentication failed. Please try again.
          </p>
        )}
      </div>
    </main>
  )
}
