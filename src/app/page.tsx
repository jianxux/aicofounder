import Link from "next/link";
import Navbar from "@/components/Navbar";

const features = [
  {
    title: "Deep research",
    description: "Do market research in minutes by searching through social media discussions",
  },
  {
    title: "Visual canvas",
    description: "Turn concepts into something real, organize your ideas, and get a complete overview",
  },
  {
    title: "Intelligent and critical",
    description: "Your idea to sell hats for ducks won't be an Amazing idea!",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-sm text-stone-600 shadow-sm backdrop-blur">
            Warm, opinionated product thinking for founders
          </div>
          <h1
            className="mt-8 text-5xl leading-tight text-stone-950 sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Make something people actually want
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
            Research and build your product with AI.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-full bg-stone-950 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Get started free
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-stone-300 px-7 py-3.5 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              See the workspace
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-stone-300 bg-stone-100 p-8 shadow transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-lg text-stone-900">
                {feature.title.charAt(0)}
              </div>
              <h2 className="text-xl font-semibold text-stone-900">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-[36px] border border-stone-300 bg-stone-100 px-8 py-12 shadow lg:px-12">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Founders say</div>
            <blockquote
              className="mt-6 text-2xl leading-10 text-stone-900 sm:text-3xl"
              style={{ fontFamily: "Georgia, serif" }}
            >
              “It feels like having a product strategist, researcher, and critical thinking partner in the room every
              time I sit down to work.”
            </blockquote>
            <p className="mt-5 text-sm font-medium text-stone-600">Independent founder, early-stage SaaS</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-center lg:flex-row lg:px-8 lg:text-left">
          <div>
            <div className="text-lg font-semibold text-stone-900">Start building with your AI cofounder</div>
            <p className="mt-1 text-sm text-stone-600">Research faster, think more critically, and ship with confidence.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            Get started free
          </Link>
        </div>
      </footer>
    </main>
  );
}
