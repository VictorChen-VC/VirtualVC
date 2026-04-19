import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { Message, Provider } from "./ai"
import { Vertical } from "./prompts"

// In-memory cache — survives HMR in dev, acts as a fast layer in prod
const g = globalThis as typeof globalThis & { __pitchStore?: Map<string, Session> }
if (!g.__pitchStore) g.__pitchStore = new Map()
const store: Map<string, Session> = g.__pitchStore

// Supabase client for cross-instance persistence (serverless safe)
function getSupabase() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key)
}

export interface Session {
  id: string
  startup: string
  stage: string
  market: string
  provider: Provider
  vertical: Vertical
  messages: Message[]
  score?: ScoreData
  createdAt: string
}

export interface DimensionScore {
  score: number
  insight: string
}

export interface ScoreData {
  score: number
  decision: "Pass" | "Maybe" | "Term Sheet"
  strengths: string[]
  weaknesses: string[]
  verdict: string
  market:             DimensionScore & { urgency: "low" | "medium" | "high" }
  problemSolutionFit: DimensionScore & { type: "painkiller" | "vitamin" }
  distribution:       DimensionScore & { difficulty: "easy" | "moderate" | "hard" }
  competition:        DimensionScore & { intensity: "low" | "medium" | "high" }
  monetization:       DimensionScore & { model: string }
  fatalFlaw: string
  whatWouldMakeInvestable: string
}

function assertString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim() === "") throw new Error(`Invalid score: ${field} must be a non-empty string`)
  return v
}

function parseDimensionBase(raw: unknown, name: string): DimensionScore {
  if (typeof raw !== "object" || raw === null) throw new Error(`Invalid score: ${name} must be an object`)
  const r = raw as Record<string, unknown>
  const s = Number(r.score)
  if (!isFinite(s)) throw new Error(`Invalid score: ${name}.score must be a number`)
  return { score: Math.max(0, Math.min(10, s)), insight: assertString(r.insight, `${name}.insight`) }
}

export function parseScoreData(raw: unknown): ScoreData {
  if (typeof raw !== "object" || raw === null) throw new Error("Invalid score: expected object")
  const r = raw as Record<string, unknown>

  const rawScore = Number(r.score)
  if (!isFinite(rawScore)) throw new Error("Invalid score: score must be a number")
  const score = Math.max(0, Math.min(100, rawScore))

  const DECISIONS = ["Pass", "Maybe", "Term Sheet"] as const
  if (!DECISIONS.includes(r.decision as (typeof DECISIONS)[number])) {
    throw new Error(`Invalid decision: expected one of ${DECISIONS.join(", ")}`)
  }

  if (!Array.isArray(r.strengths) || !r.strengths.every((s) => typeof s === "string")) {
    throw new Error("Invalid score: strengths must be a string array")
  }
  if (!Array.isArray(r.weaknesses) || !r.weaknesses.every((s) => typeof s === "string")) {
    throw new Error("Invalid score: weaknesses must be a string array")
  }

  const marketRaw = r.market as Record<string, unknown>
  const psRaw     = r.problemSolutionFit as Record<string, unknown>
  const distRaw   = r.distribution as Record<string, unknown>
  const compRaw   = r.competition as Record<string, unknown>
  const monoRaw   = r.monetization as Record<string, unknown>

  const URGENCIES   = ["low", "medium", "high"] as const
  const PS_TYPES    = ["painkiller", "vitamin"] as const
  const DIFFS       = ["easy", "moderate", "hard"] as const
  const INTENSITIES = ["low", "medium", "high"] as const

  if (!URGENCIES.includes(marketRaw?.urgency as (typeof URGENCIES)[number])) throw new Error("Invalid score: market.urgency invalid")
  if (!PS_TYPES.includes(psRaw?.type as (typeof PS_TYPES)[number]))          throw new Error("Invalid score: problemSolutionFit.type invalid")
  if (!DIFFS.includes(distRaw?.difficulty as (typeof DIFFS)[number]))         throw new Error("Invalid score: distribution.difficulty invalid")
  if (!INTENSITIES.includes(compRaw?.intensity as (typeof INTENSITIES)[number])) throw new Error("Invalid score: competition.intensity invalid")
  if (typeof monoRaw?.model !== "string" || monoRaw.model.trim() === "")     throw new Error("Invalid score: monetization.model invalid")

  return {
    score,
    decision: r.decision as ScoreData["decision"],
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    verdict: assertString(r.verdict, "verdict"),
    market:             { ...parseDimensionBase(r.market, "market"),             urgency:    marketRaw.urgency    as ScoreData["market"]["urgency"]    },
    problemSolutionFit: { ...parseDimensionBase(r.problemSolutionFit, "problemSolutionFit"), type: psRaw.type as ScoreData["problemSolutionFit"]["type"] },
    distribution:       { ...parseDimensionBase(r.distribution, "distribution"), difficulty: distRaw.difficulty  as ScoreData["distribution"]["difficulty"] },
    competition:        { ...parseDimensionBase(r.competition, "competition"),   intensity:  compRaw.intensity   as ScoreData["competition"]["intensity"]   },
    monetization:       { ...parseDimensionBase(r.monetization, "monetization"), model:      monoRaw.model       as string },
    fatalFlaw:              assertString(r.fatalFlaw, "fatalFlaw"),
    whatWouldMakeInvestable: assertString(r.whatWouldMakeInvestable, "whatWouldMakeInvestable"),
  }
}

export async function getSession(id: string): Promise<Session | null> {
  // Fast path: in-memory cache
  const cached = store.get(id)
  if (cached) return cached

  // Slow path: fetch from Supabase (handles cross-instance serverless scenario)
  try {
    const supabase = getSupabase()
    if (!supabase) return null

    const { data } = await supabase
      .from("pitch_sessions")
      .select("session_id, startup, stage, market, provider, vertical, messages, score_data, created_at")
      .eq("session_id", id)
      .single()

    if (!data) return null

    const session: Session = {
      id:        data.session_id,
      startup:   data.startup,
      stage:     data.stage,
      market:    data.market,
      provider:  data.provider as Provider,
      vertical:  (data.vertical ?? "general") as Vertical,
      messages:  (data.messages as Message[]) ?? [],
      score:     data.score_data ?? undefined,
      createdAt: data.created_at,
    }
    store.set(id, session)
    return session
  } catch (err) {
    console.error("getSession Supabase error:", err)
    return null
  }
}

export async function saveSession(session: Session): Promise<void> {
  store.set(session.id, session)
}

export async function createSession(data: Omit<Session, "id" | "messages" | "createdAt">): Promise<Session> {
  const { v4: uuidv4 } = await import("uuid")
  const id = uuidv4()
  const session: Session = { ...data, id, messages: [], createdAt: new Date().toISOString() }
  store.set(id, session)

  // Write to Supabase synchronously so other instances can find it
  try {
    const supabase = getSupabase()
    if (supabase) {
      const { error } = await supabase.from("pitch_sessions").insert({
        session_id: id,
        startup:    data.startup,
        stage:      data.stage,
        market:     data.market,
        provider:   data.provider,
        vertical:   data.vertical,
        messages:   [],
      })
      if (error) console.error("createSession Supabase error:", error)
    }
  } catch (err) {
    console.error("createSession Supabase error:", err)
  }

  return session
}

export async function appendMessage(id: string, message: Message): Promise<Session | null> {
  const session = store.get(id)
  if (!session) return null
  session.messages.push(message)
  store.set(id, session)

  // Persist updated messages so other instances see them
  try {
    const supabase = getSupabase()
    if (supabase) {
      const { error } = await supabase
        .from("pitch_sessions")
        .update({ messages: session.messages })
        .eq("session_id", id)
      if (error) console.error("appendMessage Supabase error:", error)
    }
  } catch (err) {
    console.error("appendMessage Supabase error:", err)
  }

  return session
}

export async function saveScore(id: string, score: ScoreData): Promise<Session | null> {
  const session = store.get(id)
  if (!session) return null
  session.score = score
  store.set(id, session)

  try {
    const supabase = getSupabase()
    if (supabase) {
      const { error } = await supabase
        .from("pitch_sessions")
        .update({ score_data: score, score: score.score, decision: score.decision, messages: session.messages })
        .eq("session_id", id)
      if (error) console.error("saveScore Supabase error:", error)
    }
  } catch (err) {
    console.error("saveScore Supabase error:", err)
  }

  return session
}
