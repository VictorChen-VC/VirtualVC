import { NextRequest, NextResponse } from "next/server"
import { createSession, appendMessage } from "@/lib/session"
import { Provider, generateText } from "@/lib/ai"
import { detectVertical, buildSystemPrompt } from "@/lib/prompts"
import { createClient } from "@/lib/supabase/server"
import { rateLimit, getIP, LIMITS } from "@/lib/ratelimit"

// gpt-4o: $2.50/1M input tokens (~$0.0000025/token)
// claude-opus-4-6: $15/1M input tokens (~$0.000015/token)
// For short sessions gpt-4o is cheapest; claude-opus is worth the premium for longer, nuanced pitches.
const TOKEN_THRESHOLD = 200 // ~800 chars of input

function pickProvider(startup: string, market: string): Provider {
  const estimatedTokens = (startup.length + market.length) / 4
  return estimatedTokens > TOKEN_THRESHOLD ? "anthropic" : "openai"
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req)
    const rl = rateLimit(`start:${ip}`, LIMITS.sessionsPerHour.limit, LIMITS.sessionsPerHour.windowMs)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many sessions. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      )
    }

    const { startup, stage, market } = await req.json()

    if (!startup || !stage || !market) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const provider = pickProvider(startup, market)
    const vertical = detectVertical(startup, market)
    const session = await createSession({ startup, stage, market, provider, vertical })

    // Log to Supabase (non-blocking — never let this kill session creation)
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from("pitch_sessions").insert({
          session_id: session.id,
          user_id: user?.id ?? null,
          startup,
          stage,
          market,
          provider,
        })
        if (error) console.error("Supabase insert error:", error)
      } catch (err) {
        console.error("Supabase logging failed:", err)
      }
    })()

    // Generate Victor's opening — isolated try/catch so a failed AI call doesn't kill session creation
    const firstUserMessage = `${startup}\n\nStage: ${stage}\nTarget market: ${market}`
    let aiResponse = ""
    try {
      const systemPrompt = buildSystemPrompt(vertical, startup, stage, market, 0)
      aiResponse = await generateText(provider, [{ role: "user", content: firstUserMessage }], systemPrompt)
      await appendMessage(session.id, { role: "user", content: firstUserMessage })
      await appendMessage(session.id, { role: "assistant", content: aiResponse })
    } catch (aiError) {
      console.error("Opening generation failed:", aiError)
      // Session is still valid — chat page will show an error and let user type manually
    }

    return NextResponse.json({ id: session.id, firstMessage: firstUserMessage, aiResponse })
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
