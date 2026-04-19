import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(params.id)
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }
  return NextResponse.json({
    startup: session.startup,
    stage: session.stage,
    market: session.market,
  })
}
