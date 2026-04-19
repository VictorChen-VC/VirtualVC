import { PitchForm } from "@/components/PitchForm"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col px-4 pt-16 pb-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row md:items-start md:gap-16 md:pt-20">

        {/* Header — left column on desktop, top on mobile */}
        <div className="md:flex-1 md:sticky md:top-20 mb-8 md:mb-0">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Virtual VC</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Pitch your startup to Victor Chen, a sharp Silicon Valley investor with 20 years of experience.
            Get a real score and investment decision.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mt-3">
            Victor can be a bit terse at times — like a good VC, he doesn&apos;t sugar coat it. Have fun!
          </p>
        </div>

        {/* Form card — right column on desktop */}
        <div className="md:flex-1">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
              Set Up Your Pitch
            </h2>
            <PitchForm />
          </div>
        </div>

      </div>
    </main>
  )
}
