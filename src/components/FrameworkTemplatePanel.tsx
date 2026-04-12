"use client";

import {
  frameworkHasRenderableContent,
  getFrameworkTemplateLabel,
  type ArtifactFramework,
  type FrameworkEvidence,
  type FrameworkPoint,
  type FrameworkIntensity,
} from "@/lib/frameworks";

type FrameworkTemplatePanelProps = {
  framework?: ArtifactFramework | null;
  heading?: string;
  citationsById?: Map<string, { source: string }>;
  sourceIndexById?: Map<string, number>;
};

function getIntensityClasses(intensity: FrameworkIntensity | undefined) {
  if (intensity === "high") {
    return "bg-rose-100 text-rose-800";
  }

  if (intensity === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-emerald-100 text-emerald-800";
}

function PointList({
  items,
  emptyLabel,
  citationsById,
  sourceIndexById,
}: {
  items: Array<{ id: string; title: string; detail?: string; evidence?: FrameworkEvidence[] }>;
  emptyLabel: string;
  citationsById?: Map<string, { source: string }>;
  sourceIndexById?: Map<string, number>;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-stone-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl bg-white px-4 py-3">
          <p className="text-sm font-medium text-stone-800">{item.title}</p>
          {item.detail ? <p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p> : null}
          {item.evidence?.length ? (
            <EvidenceChips evidence={item.evidence} itemId={item.id} citationsById={citationsById} sourceIndexById={sourceIndexById} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getCitationAnchor(citationId: string) {
  return `citation-${citationId}`;
}

function getSourceAnchor(sourceId: string) {
  return `source-${sourceId}`;
}

function getEvidenceLabel(
  entry: FrameworkEvidence,
  citationsById?: Map<string, { source: string }>,
  sourceIndexById?: Map<string, number>,
) {
  if (entry.type === "citation") {
    const citation = citationsById?.get(entry.citationId);

    if (entry.label !== entry.citationId) {
      return entry.label;
    }

    return citation ? `${entry.citationId} · ${citation.source}` : entry.label;
  }

  if (entry.type === "source") {
    if (entry.label !== entry.sourceId) {
      return entry.label;
    }

    const sourceIndex = sourceIndexById?.get(entry.sourceId);
    return sourceIndex ? `S${sourceIndex}` : entry.label;
  }

  return entry.label;
}

function EvidenceChips({
  evidence,
  itemId,
  citationsById,
  sourceIndexById,
}: {
  evidence: FrameworkEvidence[];
  itemId: string;
  citationsById?: Map<string, { source: string }>;
  sourceIndexById?: Map<string, number>;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {evidence.map((entry) => {
        const label = getEvidenceLabel(entry, citationsById, sourceIndexById);
        const commonProps = {
          className: "rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600",
        };

        if (entry.type === "citation" && citationsById?.has(entry.citationId)) {
          return (
            <a key={`${itemId}-citation-${entry.citationId}`} href={`#${getCitationAnchor(entry.citationId)}`} {...commonProps}>
              {label}
            </a>
          );
        }

        if (entry.type === "source" && sourceIndexById?.has(entry.sourceId)) {
          return (
            <a key={`${itemId}-source-${entry.sourceId}`} href={`#${getSourceAnchor(entry.sourceId)}`} {...commonProps}>
              {label}
            </a>
          );
        }

        const fallbackKey =
          entry.type === "citation"
            ? entry.citationId
            : entry.type === "source"
              ? entry.sourceId
              : entry.label;

        return (
          <span key={`${itemId}-${entry.type}-${fallbackKey}`} {...commonProps}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

export default function FrameworkTemplatePanel({
  framework,
  heading = "Framework template",
  citationsById,
  sourceIndexById,
}: FrameworkTemplatePanelProps) {
  if (!frameworkHasRenderableContent(framework)) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{heading}</div>
          <h3 className="mt-2 text-base font-semibold text-stone-950">{getFrameworkTemplateLabel(framework.type)}</h3>
        </div>
        <span className="rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-medium text-stone-600">Optional structure</span>
      </div>

      {framework.type === "swot" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-emerald-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Strengths</div>
            <div className="mt-3">
              <PointList
                items={framework.strengths}
                emptyLabel="No strengths captured."
                citationsById={citationsById}
                sourceIndexById={sourceIndexById}
              />
            </div>
          </div>
          <div className="rounded-3xl bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Weaknesses</div>
            <div className="mt-3">
              <PointList
                items={framework.weaknesses}
                emptyLabel="No weaknesses captured."
                citationsById={citationsById}
                sourceIndexById={sourceIndexById}
              />
            </div>
          </div>
          <div className="rounded-3xl bg-sky-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">Opportunities</div>
            <div className="mt-3">
              <PointList
                items={framework.opportunities}
                emptyLabel="No opportunities captured."
                citationsById={citationsById}
                sourceIndexById={sourceIndexById}
              />
            </div>
          </div>
          <div className="rounded-3xl bg-rose-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-800">Threats</div>
            <div className="mt-3">
              <PointList
                items={framework.threats}
                emptyLabel="No threats captured."
                citationsById={citationsById}
                sourceIndexById={sourceIndexById}
              />
            </div>
          </div>
        </div>
      ) : null}

      {framework.type === "five-forces" ? (
        <div className="mt-4 grid gap-3">
          {framework.forces.map((entry) => (
            <article key={entry.id} className="rounded-2xl bg-[#fcfaf6] px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm font-medium text-stone-800">{entry.label}</p>
                {entry.intensity ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getIntensityClasses(entry.intensity)}`}>
                    {entry.intensity}
                  </span>
                ) : null}
              </div>
              {entry.summary ? <p className="mt-2 text-sm leading-6 text-stone-600">{entry.summary}</p> : null}
              {entry.evidence?.length ? (
                <EvidenceChips
                  evidence={entry.evidence}
                  itemId={entry.id}
                  citationsById={citationsById}
                  sourceIndexById={sourceIndexById}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {framework.type === "problem-solution-fit" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {([
            ["Customer segments", framework.customerSegments],
            ["Problems", framework.problems],
            ["Existing alternatives", framework.existingAlternatives],
            ["Solution fit signals", framework.solutionFitSignals],
            ["Adoption risks", framework.adoptionRisks],
          ] as Array<[string, FrameworkPoint[]]>).map(([label, items]) => (
            <div key={label} className="rounded-3xl bg-[#fcfaf6] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{label}</div>
              <div className="mt-3">
                <PointList
                  items={items}
                  emptyLabel={`No ${label.toLowerCase()} captured.`}
                  citationsById={citationsById}
                  sourceIndexById={sourceIndexById}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {framework.type === "validation-experiment-planning" ? (
        <div className="mt-4 space-y-3">
          {framework.experiments.map((experiment) => (
            <article key={experiment.id} className="rounded-2xl bg-[#fcfaf6] px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h4 className="text-sm font-semibold text-stone-900">{experiment.name}</h4>
                <div className="flex flex-wrap gap-2">
                  {experiment.timeframe ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600">
                      {experiment.timeframe}
                    </span>
                  ) : null}
                  {experiment.effort ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600">
                      {experiment.effort}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Hypothesis</div>
                  <p className="mt-1 text-sm leading-6 text-stone-700">{experiment.hypothesis}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Method</div>
                  <p className="mt-1 text-sm leading-6 text-stone-700">{experiment.method}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Success metric</div>
                  <p className="mt-1 text-sm leading-6 text-stone-700">{experiment.successMetric}</p>
                </div>
                {experiment.signal ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Signal to watch</div>
                    <p className="mt-1 text-sm leading-6 text-stone-700">{experiment.signal}</p>
                  </div>
                ) : null}
              </div>
              {experiment.evidence?.length ? (
                <EvidenceChips
                  evidence={experiment.evidence}
                  itemId={experiment.id}
                  citationsById={citationsById}
                  sourceIndexById={sourceIndexById}
                />
              ) : null}
              {experiment.risks?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {experiment.risks.map((risk) => (
                    <span key={`${experiment.id}-${risk}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                      {risk}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
