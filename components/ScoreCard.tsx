"use client"

import { ScoreData } from "@/lib/session"

interface ScoreCardProps {
  score: ScoreData
  startup: string
}

const DECISION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Pass": {
    bg: "bg-red-900/30",
    text: "text-red-400",
    border: "border-red-700",
  },
  "Maybe": {
    bg: "bg-yellow-900/30",
    text: "text-yellow-400",
    border: "border-yellow-700",
  },
  "Term Sheet": {
    bg: "bg-green-900/30",
    text: "text-green-400",
    border: "border-green-700",
  },
}

function scoreColor(s: number, max: number) {
  const pct = s / max
  return pct >= 0.7 ? "bg-green-500" : pct >= 0.4 ? "bg-yellow-500" : "bg-red-500"
}

function scoreTextColor(s: number, max: number) {
  const pct = s / max
  return pct >= 0.7 ? "text-green-400" : pct >= 0.4 ? "text-yellow-400" : "text-red-400"
}

function Badge({ label, variant }: { label: string; variant: "red" | "yellow" | "green" | "blue" | "gray" }) {
  const cls = {
    red:    "bg-red-900/40 text-red-300 border-red-800",
    yellow: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
    green:  "bg-green-900/40 text-green-300 border-green-800",
    blue:   "bg-blue-900/40 text-blue-300 border-blue-800",
    gray:   "bg-gray-700/60 text-gray-300 border-gray-600",
  }[variant]
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  )
}

const DIMENSIONS = [
  {
    key: "market" as const,
    label: "Market",
    sublabel: "Size + Urgency",
    badge: (d: ScoreData["market"]) => (
      <Badge label={d.urgency + " urgency"} variant={d.urgency === "high" ? "green" : d.urgency === "medium" ? "yellow" : "red"} />
    ),
  },
  {
    key: "problemSolutionFit" as const,
    label: "Problem–Solution Fit",
    sublabel: "Painkiller vs. Vitamin",
    badge: (d: ScoreData["problemSolutionFit"]) => (
      <Badge label={d.type} variant={d.type === "painkiller" ? "green" : "yellow"} />
    ),
  },
  {
    key: "distribution" as const,
    label: "Distribution",
    sublabel: "GTM Reality Check",
    badge: (d: ScoreData["distribution"]) => (
      <Badge label={d.difficulty + " GTM"} variant={d.difficulty === "easy" ? "green" : d.difficulty === "moderate" ? "yellow" : "red"} />
    ),
  },
  {
    key: "competition" as const,
    label: "Competition + Moat",
    sublabel: "Defensibility",
    badge: (d: ScoreData["competition"]) => (
      <Badge label={d.intensity + " competition"} variant={d.intensity === "low" ? "green" : d.intensity === "medium" ? "yellow" : "red"} />
    ),
  },
  {
    key: "monetization" as const,
    label: "Monetization",
    sublabel: "Economics",
    badge: (d: ScoreData["monetization"]) => (
      <Badge label={d.model} variant="blue" />
    ),
  },
] as const

export function ScoreCard({ score, startup }: ScoreCardProps) {
  const style = DECISION_STYLES[score.decision] || DECISION_STYLES["Pass"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl border ${style.border} ${style.bg} p-6 text-center`}>
        <p className="text-gray-400 text-sm mb-1">Investment Decision</p>
        <p className={`text-3xl font-bold ${style.text}`}>{score.decision}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex-1 max-w-48 bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-1000 ${scoreColor(score.score, 100)}`}
              style={{ width: `${score.score}%` }}
            />
          </div>
          <span className={`text-2xl font-bold ${scoreTextColor(score.score, 100)}`}>{score.score}/100</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">{startup}</p>
      </div>

      {/* 5 Dimension Scores */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">5-Dimension Analysis</p>
        {DIMENSIONS.map(({ key, label, sublabel, badge }) => {
          const dim = score[key]
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-200 font-medium shrink-0">{label}</span>
                  <span className="text-xs text-gray-500 hidden sm:inline shrink-0">— {sublabel}</span>
                  {badge(dim as never)}
                </div>
                <span className={`text-sm font-bold shrink-0 ${scoreTextColor(dim.score, 10)}`}>{dim.score}/10</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${scoreColor(dim.score, 10)}`}
                    style={{ width: `${dim.score * 10}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 italic">{dim.insight}</p>
            </div>
          )
        })}
      </div>

      {/* Verdict */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Victor&apos;s Verdict</p>
        <p className="text-gray-200 text-sm leading-relaxed italic">&ldquo;{score.verdict}&rdquo;</p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <p className="text-xs text-green-400 uppercase tracking-wider mb-3 font-semibold">Strengths</p>
          <ul className="space-y-2">
            {(score.strengths ?? []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-green-400 mt-0.5 flex-shrink-0">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-3 font-semibold">Weaknesses</p>
          <ul className="space-y-2">
            {(score.weaknesses ?? []).map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-red-400 mt-0.5 flex-shrink-0">−</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Fatal Flaw */}
      <div className="bg-red-950/40 rounded-xl p-5 border border-red-800/60">
        <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-semibold">Fatal Flaw</p>
        <p className="text-gray-200 text-sm leading-relaxed text-red-300">{score.fatalFlaw}</p>
      </div>

      {/* What Would Make This Investable */}
      <div className="bg-green-950/30 rounded-xl p-5 border border-green-800/50">
        <p className="text-xs text-green-400 uppercase tracking-wider mb-2 font-semibold">What Would Make This Investable</p>
        <p className="text-gray-200 text-sm leading-relaxed">{score.whatWouldMakeInvestable}</p>
      </div>
    </div>
  )
}
