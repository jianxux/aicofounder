"use client";

import { UltraplanResult } from "@/lib/ultraplan";

type UltraplanReportProps = {
  result: UltraplanResult;
};

function getSeverityColor(severity: number) {
  if (severity <= 2) {
    return "bg-emerald-500";
  }

  if (severity === 3) {
    return "bg-amber-400";
  }

  if (severity === 4) {
    return "bg-orange-500";
  }

  return "bg-rose-500";
}

function getLevelBadgeColor(level: "low" | "medium" | "high") {
  if (level === "low") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (level === "medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

export default function UltraplanReport({ result }: UltraplanReportProps) {
  return (
    <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="rounded-3xl bg-[#fcfaf6] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">ULTRAPLAN</div>
        <p className="mt-3 text-sm leading-6 text-stone-700">{result.rationale}</p>

        <div className="mt-4 rounded-3xl bg-sky-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">NEXT STEP</div>
          <p className="mt-2 text-sm leading-6 text-sky-950">{result.nextStep}</p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-950">{result.blocker.title}</h3>
            <div className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
              {result.blocker.category}
            </div>
          </div>

          <div
            className="flex items-center gap-1"
            aria-label={`Severity ${result.blocker.severity} out of 5`}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={`${result.blocker.id}-${index + 1}`}
                className={`h-2.5 w-2.5 rounded-full ${
                  index < result.blocker.severity ? getSeverityColor(result.blocker.severity) : "bg-stone-200"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-stone-700">{result.blocker.description}</p>
      </div>

      <div className="mt-4 space-y-4">
        {result.actions.map((action, index) => (
          <article key={action.id} className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  Action {index + 1}
                </div>
                <h3 className="mt-2 text-base font-semibold text-stone-950">{action.title}</h3>
              </div>
              <div className="text-sm font-medium text-stone-500">{action.timelineHours}h</div>
            </div>

            <p className="mt-4 text-sm leading-6 text-stone-700">{action.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className={`rounded-full px-3 py-1 ${getLevelBadgeColor(action.effort)}`}>
                Effort: {action.effort}
              </span>
              <span className={`rounded-full px-3 py-1 ${getLevelBadgeColor(action.impact)}`}>
                Impact: {action.impact}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
