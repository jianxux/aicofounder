"use client";

import ResearchMemoCanvasMap from "@/components/ResearchMemoCanvasMap";
import ResearchReport from "@/components/ResearchReport";
import type { CustomerResearchMemoArtifact, ProjectResearchArtifact } from "@/lib/types";
import type { ResearchReport as ResearchReportData } from "@/lib/research";

type ResearchMemoDualViewProps = {
  artifact: CustomerResearchMemoArtifact | null;
  status: "empty" | "loading" | "success" | "error";
  report?: ResearchReportData | null;
  researchArtifact?: ProjectResearchArtifact;
  errorMessage?: string;
  lastUpdatedAt?: string;
  researchQuestion?: string;
  sourceContext?: string;
  onRunResearch?: () => void;
};

export default function ResearchMemoDualView({
  artifact,
  status,
  report,
  researchArtifact,
  errorMessage,
  lastUpdatedAt,
  researchQuestion,
  sourceContext,
  onRunResearch,
}: ResearchMemoDualViewProps) {
  return (
    <section data-testid="research-memo-dual-view" className="rounded-[32px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="rounded-[28px] border border-stone-200 bg-[#f4efe7] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Dual view</div>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">Customer research memo + canvas map</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              The memo and map are derived from the same research state, so new findings, contradictions, questions, and sources update together.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
            Synchronized
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <ResearchReport
          status={status}
          report={report}
          artifact={researchArtifact}
          errorMessage={errorMessage}
          lastUpdatedAt={lastUpdatedAt}
          researchQuestion={researchQuestion}
          sourceContext={sourceContext}
          onRunResearch={onRunResearch}
        />
        <ResearchMemoCanvasMap artifact={artifact} />
      </div>
    </section>
  );
}
