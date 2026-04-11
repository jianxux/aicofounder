"use client";

import GeneratedDiagram from "@/components/GeneratedDiagram";
import { buildResearchMemoCanvasMap, summarizeResearchMemoCanvasMap } from "@/lib/research-memo-map";
import type { CustomerResearchMemoArtifact } from "@/lib/types";

type ResearchMemoCanvasMapProps = {
  artifact: CustomerResearchMemoArtifact | null;
};

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function ResearchMemoCanvasMap({ artifact }: ResearchMemoCanvasMapProps) {
  const diagram = buildResearchMemoCanvasMap(artifact);
  const summary = summarizeResearchMemoCanvasMap(artifact);
  const hasMemoEntities = summary.nodeCount > 0;

  return (
    <section
      data-testid="research-memo-canvas-map"
      className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm"
      aria-label="Synchronized customer research memo canvas map"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Synchronized canvas map</div>
          <h3 className="mt-2 text-lg font-semibold text-stone-950">Memo map</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Key memo pieces are mapped from the current customer research memo revision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-medium text-stone-700">
            {formatCount(summary.nodeCount, "memo node", "memo nodes")}
          </span>
          <span className="rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-medium text-stone-700">
            {formatCount(summary.sourceCount, "source", "sources")}
          </span>
          <span className="rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-medium text-stone-700">
            {formatCount(summary.evidenceCount, "evidence link", "evidence links")}
          </span>
        </div>
      </div>

      <div className="mt-4 h-[440px] overflow-hidden rounded-[24px] border border-stone-200 bg-[#faf7f2]">
        <div
          data-testid="research-memo-map-surface"
          className="relative h-[900px] w-[1760px] origin-top-left scale-[0.58] sm:scale-[0.64] lg:scale-[0.5] xl:scale-[0.58]"
        >
          <GeneratedDiagram diagram={diagram} />
        </div>
      </div>

      {!hasMemoEntities ? (
        <p className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-stone-600">
          Run or refresh the customer research memo to populate the synchronized map.
        </p>
      ) : null}
    </section>
  );
}
