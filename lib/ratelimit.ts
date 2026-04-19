// In-memory sliding window rate limiter.
// For Vercel production: swap the `store` Map for @vercel/kv or Upstash Redis
// so limits persist across serverless instances.

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // unix ms
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const win = store.get(key)

  if (!win || now > win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (win.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: win.resetAt }
  }

  win.count++
  return { allowed: true, remaining: limit - win.count, resetAt: win.resetAt }
}

// Convenience: extract real IP from Next.js request headers
export function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

// Shared limit config
export const LIMITS = {
  // How many pitch sessions one IP can start per hour
  sessionsPerHour: { limit: 3, windowMs: 60 * 60 * 1000 },
  // How many chat messages one IP can send per 10 minutes
  chatsPerWindow: { limit: 20, windowMs: 10 * 60 * 1000 },
  // Hard cap on total messages in a single session (10 exchanges = 20 messages)
  messagesPerSession: 20,
  // Max characters accepted from the user in a single message
  maxInputChars: 800,
}
