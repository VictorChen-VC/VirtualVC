import { NextRequest } from "next/server"
import { getSession, appendMessage } from "@/lib/session"
import { streamChat } from "@/lib/ai"
import { buildSystemPrompt } from "@/lib/prompts"
import { rateLimit, getIP, LIMITS } from "@/lib/ratelimit"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Per-IP rate limit
    const ip = getIP(req)
    const rl = rateLimit(`chat:${ip}`, LIMITS.chatsPerWindow.limit, LIMITS.chatsPerWindow.windowMs)
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many messages. Slow down." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      })
    }

    const { message } = await req.json()
    const { id } = params

    const session = await getSession(id)
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 2. Per-session message cap
    if (session.messages.length >= LIMITS.messagesPerSession) {
      return new Response(JSON.stringify({ error: "Session limit reached. Please wrap up your pitch." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 3. Truncate input to prevent abuse
    const sanitized = String(message).slice(0, LIMITS.maxInputChars)

    // Save user message
    await appendMessage(id, { role: "user", content: sanitized })

    const exchangeCount = Math.floor(session.messages.length / 2)
    const systemPrompt = buildSystemPrompt(
      session.vertical,
      session.startup,
      session.stage,
      session.market,
      exchangeCount
    )

    const updatedSession = await getSession(id)
    const messages = updatedSession?.messages || [...session.messages, { role: "user" as const, content: sanitized }]

    // Stream AI response
    const stream = await streamChat(session.provider, messages, systemPrompt)

    // Collect the full response to save it
    const [streamForClient, streamForSave] = stream.tee()

    // Save assistant response in background
    ;(async () => {
      const reader = streamForSave.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullResponse += decoder.decode(value, { stream: true })
      }
      await appendMessage(id, { role: "assistant", content: fullResponse })
    })()

    return new Response(streamForClient, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Exchange-Count": String(exchangeCount + 1),
      },
    })
  } catch (error) {
    console.error("Chat error:", error)
    return new Response(JSON.stringify({ error: "Failed to process message" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
