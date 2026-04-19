import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: "Missing env vars", url: !!url, key: !!key })
  }

  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase
      .from("pitch_sessions")
      .select("session_id")
      .limit(1)

    if (error) return NextResponse.json({ error: error.message, code: error.code })
    return NextResponse.json({ ok: true, rows: data?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ error: String(err) })
  }
}
