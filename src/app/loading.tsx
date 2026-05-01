export default function Loading() {
  const progressSteps = [
    "Mapping your startup input into a scored strategy brief with clear feedback.",
    "Converting manual research tasks into a context-aware AI workflow with structured outputs.",
    "Generating actionable next-step guidance with customer proof and integrated templates.",
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-stone-100 px-6 py-20 text-stone-900" aria-busy="true">
      <section
        className="mx-auto w-full max-w-3xl rounded-3xl border border-amber-200/70 bg-white/95 p-8 shadow-[0_18px_45px_rgba(120,53,15,0.12)]"
        role="status"
        aria-live="polite"
        aria-label="Preparing your AI Cofounder workspace"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Loading workspace</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-stone-900">Preparing your founder plan in minutes</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-700">
          We are assembling a fast strategy workflow that replaces manual docs and disconnected AI chats with structured,
          context-aware outputs built for real execution.
        </p>

        <ul className="mt-7 space-y-3" aria-label="Loading progress steps">
          {progressSteps.map((step) => (
            <li key={step} className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
              <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-amber-500" aria-hidden="true" />
              <span className="text-sm leading-relaxed text-stone-700">{step}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
