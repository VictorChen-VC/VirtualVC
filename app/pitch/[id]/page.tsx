"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChatBubble } from "@/components/ChatBubble"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function PitchPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [wrappingUp, setWrappingUp] = useState(false)
  const [wrapError, setWrapError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // On mount: read the first exchange that was pre-generated during session creation
  useEffect(() => {
    const stored = sessionStorage.getItem(`pitch-init-${id}`)
    if (stored) {
      const { firstMessage, aiResponse } = JSON.parse(stored)
      if (firstMessage && aiResponse) {
        setMessages([
          { role: "user",      content: firstMessage },
          { role: "assistant", content: aiResponse   },
        ])
        setExchangeCount(1)
      } else {
        setInitError(true)
      }
    } else {
      setInitError(true)
    }
    setLoading(false)
    textareaRef.current?.focus()
  }, [id])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch(`/api/pitch/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!res.ok) throw new Error("Chat failed")

      const newCount = Number(res.headers.get("X-Exchange-Count") || 0)
      setExchangeCount(newCount)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let aiText = ""

      setMessages((prev) => [...prev, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        aiText += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "assistant", content: aiText }
          return updated
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  async function handleWrapUp() {
    setWrappingUp(true)
    setWrapError("")
    try {
      const res = await fetch(`/api/pitch/${id}/score`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      router.push(`/results/${id}`)
    } catch (err) {
      console.error("Wrap up failed:", err)
      setWrapError(err instanceof Error ? err.message : "Scoring failed. Try again.")
      setWrappingUp(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            VC
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Victor Chen</p>
            <p className="text-xs text-gray-500">General Partner, Apex Ventures</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{exchangeCount} exchanges</span>
          {wrapError && (
            <span className="text-xs text-red-400">{wrapError}</span>
          )}
          {exchangeCount >= 5 && (
            <button
              onClick={handleWrapUp}
              disabled={wrappingUp || loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {wrappingUp ? "Scoring..." : "Wrap Up"}
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {initError && (
          <div className="text-center py-6 text-sm text-gray-400">
            Victor couldn&apos;t be reached. The session may have expired.{" "}
            <a href="/" className="text-indigo-400 underline">Start a new pitch</a>
          </div>
        )}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">
              VC
            </div>
            <div className="bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-3 bg-gray-950 flex-shrink-0">
        {exchangeCount === 4 && (
          <p className="text-xs text-yellow-500/80 mb-2 text-center">
            One more exchange and Victor will be ready to score your pitch.
          </p>
        )}
        {exchangeCount >= 5 && (
          <p className="text-xs text-indigo-400 mb-2 text-center">
            Victor is ready to decide. Click &ldquo;Wrap Up&rdquo; when you&apos;re done, or keep pitching.
          </p>
        )}
        <form onSubmit={sendMessage} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Make your case..."
            disabled={loading || wrappingUp}
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || wrappingUp || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors self-end"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
