import { notFound } from "next/navigation"
import { getSession } from "@/lib/session"
import { ScoreCard } from "@/components/ScoreCard"
import Link from "next/link"
import { ShareButton } from "./ShareButton"

export default async function ResultsPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession(params.id)

  if (!session) {
    notFound()
  }

  if (!session.score) {
    // Score hasn't been generated yet — redirect to pitch
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">This pitch hasn&apos;t been scored yet.</p>
          <Link
            href={`/pitch/${params.id}`}
            className="text-indigo-400 hover:text-indigo-300 underline text-sm"
          >
            Continue the pitch
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm flex items-center gap-1 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            New pitch
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Pitch Results</h1>
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{session.startup}</p>
            </div>
            <ShareButton />
          </div>
          <div className="flex gap-2 mt-3">
            <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full border border-gray-700">
              {session.stage}
            </span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full border border-gray-700">
              {session.market}
            </span>
          </div>
        </div>

        <ScoreCard score={session.score} startup={session.startup} />

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Pitch another startup
          </Link>
        </div>
      </div>
    </main>
  )
}
