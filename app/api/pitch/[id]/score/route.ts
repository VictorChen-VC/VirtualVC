import { NextRequest, NextResponse } from "next/server"
import { getSession, saveScore, parseScoreData } from "@/lib/session"
import { generateJSON } from "@/lib/ai"
import { SCORING_PROMPT } from "@/lib/prompts"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const session = await getSession(id)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.score) {
      return NextResponse.json(session.score)
    }

    const contextPrompt = `${SCORING_PROMPT}

Startup being evaluated:
- Name/Concept: ${session.startup}
- Stage: ${session.stage}
- Target Market: ${session.market}`

    // Anthropic requires the last message to be from the user.
    // Ensure the messages array ends with a user turn before scoring.
    const messages = [...session.messages]
    if (messages.length === 0 || messages[messages.length - 1].role === "assistant") {
      messages.push({ role: "user", content: "Please now score this pitch based on our conversation." })
    }

    const raw = await generateJSON(session.provider, messages, contextPrompt)
    const scoreData = parseScoreData(raw)

    await saveScore(id, scoreData)

    // Update Supabase row with score, decision, and full conversation (non-blocking)
    const supabase = createClient()
    supabase.from("pitch_sessions")
      .update({ score: scoreData.score, decision: scoreData.decision, messages: session.messages })
      .eq("session_id", id)
      .then(({ error }) => {
        if (error) console.error("Supabase update error:", error)
      })

    return NextResponse.json(scoreData)
  } catch (error) {
    console.error("Scoring error:", error)
    return NextResponse.json({ error: "Failed to generate score" }, { status: 500 })
  }
}
