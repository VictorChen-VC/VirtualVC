"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const STAGES = ["Just a thought", "Pre-seed", "Seed", "Series A", "Series B+"]

export function PitchForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    startup: "",
    stage: "Just a thought",
    market: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/pitch/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      sessionStorage.setItem(`pitch-init-${data.id}`, JSON.stringify({ firstMessage: data.firstMessage, aiResponse: data.aiResponse }))
      router.push(`/pitch/${data.id}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Describe your startup
        </label>
        <textarea
          required
          value={form.startup}
          onChange={(e) => setForm({ ...form, startup: e.target.value })}
          placeholder="e.g. We're building an AI-powered platform that helps small restaurants manage inventory and reduce food waste by 40%..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-28 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Stage
          </label>
          <select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Market
          </label>
          <input
            required
            type="text"
            value={form.market}
            onChange={(e) => setForm({ ...form, market: e.target.value })}
            placeholder="e.g. US restaurants, SMBs"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? "Setting up..." : "Start Pitch"}
        </button>
      </div>
    </form>
  )
}
