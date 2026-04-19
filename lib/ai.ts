import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

export type Provider = "openai" | "anthropic"

export interface Message {
  role: "user" | "assistant"
  content: string
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Chat responses are kept short — Victor is a busy VC, 2-4 sentences max.
const CHAT_MAX_TOKENS = 400
// Scoring needs room for structured JSON with multiple fields.
const SCORE_MAX_TOKENS = 1024

function isQuotaError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const status = (err as { status?: number }).status
    const code   = (err as { code?: string }).code
    if (status === 429 || code === "insufficient_quota") return true
  }
  return false
}

function otherProvider(p: Provider): Provider {
  return p === "openai" ? "anthropic" : "openai"
}

export async function generateText(
  provider: Provider,
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const providers: Provider[] = [provider, otherProvider(provider)]
  let lastErr: unknown
  for (const p of providers) {
    try {
      if (p === "openai") {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: CHAT_MAX_TOKENS,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        })
        return response.choices[0].message.content ?? ""
      } else {
        const response = await anthropic.messages.create({
          model: "claude-opus-4-6",
          max_tokens: CHAT_MAX_TOKENS,
          system: systemPrompt,
          messages,
        })
        return response.content[0].type === "text" ? response.content[0].text : ""
      }
    } catch (err) {
      if (isQuotaError(err)) { lastErr = err; continue }
      throw err
    }
  }
  throw lastErr
}

export async function streamChat(
  provider: Provider,
  messages: Message[],
  systemPrompt: string
): Promise<ReadableStream> {
  const providers: Provider[] = [provider, otherProvider(provider)]
  let lastErr: unknown
  for (const p of providers) {
    try {
      if (p === "openai") {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: CHAT_MAX_TOKENS,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        })
        return new ReadableStream({
          async start(controller) {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content || ""
              if (text) controller.enqueue(new TextEncoder().encode(text))
            }
            controller.close()
          },
        })
      } else {
        const stream = await anthropic.messages.create({
          model: "claude-opus-4-6",
          max_tokens: CHAT_MAX_TOKENS,
          system: systemPrompt,
          messages,
          stream: true,
        })
        return new ReadableStream({
          async start(controller) {
            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                controller.enqueue(new TextEncoder().encode(event.delta.text))
              }
            }
            controller.close()
          },
        })
      }
    } catch (err) {
      if (isQuotaError(err)) { lastErr = err; continue }
      throw err
    }
  }
  throw lastErr
}

const DIMENSION_SCHEMA = (extraProps: Record<string, unknown>, extraRequired: string[]) => ({
  type: "object",
  properties: {
    score:   { type: "number", description: "0–10" },
    insight: { type: "string" },
    ...extraProps,
  },
  required: ["score", "insight", ...extraRequired],
  additionalProperties: false,
})

const SCORE_JSON_SCHEMA = {
  type: "object",
  properties: {
    score:      { type: "number", description: "Overall integer 0–100" },
    decision:   { type: "string", enum: ["Pass", "Maybe", "Term Sheet"] },
    strengths:  { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    verdict:    { type: "string" },
    market: DIMENSION_SCHEMA(
      { urgency: { type: "string", enum: ["low", "medium", "high"] } },
      ["urgency"]
    ),
    problemSolutionFit: DIMENSION_SCHEMA(
      { type: { type: "string", enum: ["painkiller", "vitamin"] } },
      ["type"]
    ),
    distribution: DIMENSION_SCHEMA(
      { difficulty: { type: "string", enum: ["easy", "moderate", "hard"] } },
      ["difficulty"]
    ),
    competition: DIMENSION_SCHEMA(
      { intensity: { type: "string", enum: ["low", "medium", "high"] } },
      ["intensity"]
    ),
    monetization: DIMENSION_SCHEMA(
      { model: { type: "string" } },
      ["model"]
    ),
    fatalFlaw:              { type: "string" },
    whatWouldMakeInvestable: { type: "string" },
  },
  required: [
    "score", "decision", "strengths", "weaknesses", "verdict",
    "market", "problemSolutionFit", "distribution", "competition", "monetization",
    "fatalFlaw", "whatWouldMakeInvestable",
  ],
  additionalProperties: false,
}

export async function generateJSON(
  provider: Provider,
  messages: Message[],
  systemPrompt: string
): Promise<object> {
  const providers: Provider[] = [provider, otherProvider(provider)]
  let lastErr: unknown
  for (const p of providers) {
    try {
      if (p === "openai") {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: SCORE_MAX_TOKENS,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          response_format: {
            type: "json_schema" as const,
            json_schema: { name: "score_data", strict: true, schema: SCORE_JSON_SCHEMA as Record<string, unknown> },
          },
        })
        return JSON.parse(response.choices[0].message.content ?? "{}")
      } else {
        const response = await anthropic.messages.create({
          model: "claude-opus-4-6",
          max_tokens: SCORE_MAX_TOKENS,
          system: systemPrompt,
          messages,
          tools: [{
            name: "submit_score",
            description: "Submit structured investment score. MUST call this tool — do not emit JSON as text.",
            input_schema: {
              type: "object" as const,
              properties: SCORE_JSON_SCHEMA.properties as Record<string, unknown>,
              required: [...SCORE_JSON_SCHEMA.required],
            },
          }],
          tool_choice: { type: "tool", name: "submit_score" },
        })
        const toolUseBlock = response.content.find((b) => b.type === "tool_use")
        if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
          throw new Error("Anthropic did not call submit_score tool")
        }
        return toolUseBlock.input as object
      }
    } catch (err) {
      if (isQuotaError(err)) { lastErr = err; continue }
      throw err
    }
  }
  throw lastErr
}
