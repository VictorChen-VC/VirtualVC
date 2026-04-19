"use client"

import { Provider } from "@/lib/ai"

interface ProviderToggleProps {
  value: Provider
  onChange: (provider: Provider) => void
}

export function ProviderToggle({ value, onChange }: ProviderToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">AI Model:</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        <button
          onClick={() => onChange("openai")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === "openai"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          GPT-4o
        </button>
        <button
          onClick={() => onChange("anthropic")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === "anthropic"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          Claude Opus
        </button>
      </div>
    </div>
  )
}
