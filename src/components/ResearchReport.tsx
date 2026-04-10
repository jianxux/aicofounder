"use client";

import { useEffect, useState } from "react";
import type { ResearchCitation, ResearchReport as ResearchReportData, ResearchSource } from "@/lib/research";
import type { ProjectResearchArtifact } from "@/lib/types";

type ResearchReportProps = {
  status: "empty" | "loading" | "success" | "error";
  report?: ResearchReportData | null;
  artifact?: ProjectResearchArtifact;
  errorMessage?: string;
  lastUpdatedAt?: string;
  researchQuestion?: string;
  sourceContext?: string;
  onRunResearch?: () => void;
};

function getRelevanceClasses(relevance: "high" | "medium" | "low") {
  if (relevance === "high") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (relevance === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-stone-200 text-stone-600";
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSourceMeta(source: Pick<
  ResearchSource,
  "sourceType" | "publicationSignal" | "recencySignal" | "accessibilityStatus" | "publicationDate"
>) {
  return [
    source.sourceType !== "other" ? source.sourceType : null,
    source.publicationSignal && source.publicationSignal !== "unknown" ? source.publicationSignal.replace(/_/g, " ") : null,
    source.recencySignal && source.recencySignal !== "unknown" ? source.recencySignal : null,
    source.accessibilityStatus && source.accessibilityStatus !== "unknown"
      ? source.accessibilityStatus.replace(/_/g, " ")
      : null,
    source.publicationDate ? `published ${source.publicationDate}` : null,
  ].filter(Boolean);
}

function getCitationAnchor(citationId: string) {
  return `citation-${citationId}`;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  items.forEach((item) => {
    if (!item.id || seen.has(item.id)) {
      return;
    }

    seen.add(item.id);
    result.push(item);
  });

  return result;
}

function getReportCitations(report?: ResearchReportData | null) {
  if (report?.citations?.length) {
    return dedupeById(report.citations);
  }

  return dedupeById((report?.sections ?? []).flatMap((section) => section.citations));
}

function getSourceInventory(report?: ResearchReportData | null, artifact?: ProjectResearchArtifact) {
  if (report?.sources?.length) {
    return {
      selected: report.sources,
      rejected: artifact?.sourceInventory?.rejected ?? [],
    };
  }

  if (artifact?.sourceInventory) {
    return artifact.sourceInventory;
  }

  const selected = (artifact?.selectedSources ?? []).map((citation) => ({
    id: `selected-${citation.id}`,
    title: citation.source,
    canonicalId: citation.url ?? citation.source,
    sourceType: citation.sourceType ?? "other",
    status: "selected" as const,
    citationIds: [citation.id],
    sectionIds: [],
    url: citation.url,
    publicationDate: citation.publicationDate,
    publicationSignal: citation.publicationSignal ?? "unknown",
    recencySignal: citation.recencySignal ?? "unknown",
    accessibilityStatus: citation.accessibilityStatus ?? "unknown",
    claimCount: 1,
  }));

  return {
    selected,
    rejected: [],
  };
}

function CitationReferences({ citationIds, citationsById }: { citationIds: string[]; citationsById: Map<string, ResearchCitation> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {citationIds.map((citationId) => {
        const citation = citationsById.get(citationId);

        return (
          <a
            key={citationId}
            href={`#${getCitationAnchor(citationId)}`}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700 underline decoration-stone-300 underline-offset-4"
          >
            {citationId}
            {citation ? ` · ${citation.source}` : ""}
          </a>
        );
      })}
    </div>
  );
}

function ResearchSummary({
  status,
  errorMessage,
  lastUpdatedAt,
  researchQuestion,
  sourceContext,
  onRunResearch,
}: Omit<ResearchReportProps, "report">) {
  const buttonLabel =
    status === "loading"
      ? "Updating memo..."
      : status === "success"
        ? "Refresh customer research memo"
        : status === "error"
          ? "Retry customer research memo"
          : "Create customer research memo";

  return (
    <section className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Workspace artifact
            </div>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">Customer research memo</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Run deep research to create or update the memo attached to this project with evidence, risks, and open questions.
            </p>
          </div>
          <button
            type="button"
            onClick={onRunResearch}
            disabled={status === "loading" || !onRunResearch}
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {buttonLabel}
          </button>
        </div>

        {status === "empty" ? (
          <p className="rounded-3xl border border-dashed border-stone-300 bg-white px-4 py-4 text-sm leading-6 text-stone-600">
            No customer research memo yet. Run deep research to create one with opportunities, risks, and supporting evidence.
          </p>
        ) : null}

        {status === "loading" ? (
          <div
            className="rounded-3xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900"
            aria-live="polite"
          >
            Updating the customer research memo for this project.
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900">
            {errorMessage ?? "Deep research failed. Please try again."}
          </div>
        ) : null}

        {researchQuestion ? (
          <div className="rounded-3xl bg-white px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Research question</div>
            <p className="mt-2 text-sm leading-6 text-stone-700">{researchQuestion}</p>
            {sourceContext ? (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Research context
                </div>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-stone-600">{sourceContext}</p>
              </>
            ) : null}
            {lastUpdatedAt ? (
              <p className="mt-4 text-xs leading-5 text-stone-500">Last updated {formatTimestamp(lastUpdatedAt)}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ResearchReport({
  status,
  report,
  artifact,
  errorMessage,
  lastUpdatedAt,
  researchQuestion,
  sourceContext,
  onRunResearch,
}: ResearchReportProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const selectedSources = artifact?.selectedSources ?? [];
  const rejectedSources = artifact?.rejectedSources ?? [];
  const sourceInventory = getSourceInventory(report, artifact);
  const failures = artifact?.failures ?? [];
  const metrics = artifact?.metrics;
  const reportCitations = getReportCitations(report);
  const citationsById = new Map(reportCitations.map((citation) => [citation.id, citation] as const));
  const hasArtifactDetails =
    Boolean(artifact?.status) ||
    Boolean(artifact?.generatedAt) ||
    Boolean(artifact?.plan) ||
    selectedSources.length > 0 ||
    rejectedSources.length > 0 ||
    sourceInventory.selected.length > 0 ||
    sourceInventory.rejected.length > 0 ||
    failures.length > 0 ||
    Boolean(metrics);

  useEffect(() => {
    if (!report) {
      setExpandedSections({});
      return;
    }

    setExpandedSections((current) => ({
      ...Object.fromEntries(report.sections.map((section) => [section.id, true])),
      ...current,
    }));
  }, [report]);

  return (
    <div className="space-y-4">
      <ResearchSummary
        status={status}
        errorMessage={errorMessage}
        lastUpdatedAt={lastUpdatedAt}
        researchQuestion={researchQuestion ?? report?.researchQuestion}
        sourceContext={sourceContext}
        onRunResearch={onRunResearch}
      />

      {(status === "success" || status === "error") && report ? (
        <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Deep research</div>
            <p className="mt-2 text-sm font-medium text-stone-600">{report.researchQuestion}</p>
            <div className="mt-4 rounded-3xl bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Executive summary</div>
              <div className="mt-3 space-y-3">
                {report.executiveSummary.split(/\n+/).map((paragraph, index) =>
                  paragraph.trim() ? (
                    <p key={`summary-${index + 1}`} className="text-sm leading-6 text-stone-700">
                      {paragraph.trim()}
                    </p>
                  ) : null,
                )}
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Research conducted {formatTimestamp(report.generatedAt)}
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {report.keyFindings?.length ||
            report.caveats?.length ||
            report.contradictions?.length ||
            report.unansweredQuestions?.length ? (
              <section className="grid gap-4 lg:grid-cols-2">
                {report.keyFindings?.length ? (
                  <div className="rounded-3xl border border-stone-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Key findings</div>
                    <div className="mt-3 space-y-3">
                      {report.keyFindings.map((finding) => (
                        <div key={finding.id} className="rounded-2xl bg-[#fcfaf6] px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-stone-800">{finding.statement}</span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getRelevanceClasses(
                              finding.strength === "strong"
                                ? "high"
                                : finding.strength === "moderate"
                                  ? "medium"
                                  : "low",
                            )}`}>
                              {finding.strength}
                            </span>
                          </div>
                          <CitationReferences citationIds={finding.citationIds} citationsById={citationsById} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {report.caveats?.length ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Caveats</div>
                    <div className="mt-3 space-y-2">
                      {report.caveats.map((caveat) => (
                        <div key={caveat.id} className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-sm leading-6 text-amber-900">{caveat.statement}</p>
                          {caveat.citationIds?.length ? (
                            <CitationReferences citationIds={caveat.citationIds} citationsById={citationsById} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {report.contradictions?.length ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-800">Contradictions</div>
                    <div className="mt-3 space-y-2">
                      {report.contradictions.map((contradiction) => (
                        <div key={contradiction.id} className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-sm leading-6 text-rose-900">{contradiction.statement}</p>
                          <CitationReferences citationIds={contradiction.citationIds} citationsById={citationsById} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {report.unansweredQuestions?.length ? (
                  <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Unanswered questions
                    </div>
                    <div className="mt-3 space-y-2">
                      {report.unansweredQuestions.map((question) => (
                        <div key={question.id} className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-sm leading-6 text-stone-700">{question.question}</p>
                          {question.citationIds?.length ? (
                            <CitationReferences citationIds={question.citationIds} citationsById={citationsById} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {hasArtifactDetails ? (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-stone-200 bg-[#fcfaf6] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Run details</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {artifact?.status ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-stone-700">
                        {artifact.status}
                      </span>
                    ) : null}
                    {typeof metrics?.attemptedAngles === "number" ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                        {metrics.attemptedAngles} angles
                      </span>
                    ) : null}
                    {typeof metrics?.completedSections === "number" ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                        {metrics.completedSections} sections
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      {metrics?.selectedSources ?? selectedSources.length} selected sources
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      {metrics?.rejectedSources ?? rejectedSources.length} rejected
                    </span>
                  </div>
                  {artifact?.plan?.steps?.length ? (
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      Scope: {artifact.plan.steps.length} planned research angles.
                    </p>
                  ) : null}
                </div>

                {sourceInventory.selected.length > 0 ? (
                  <div className="rounded-3xl border border-stone-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Evidence inventory
                    </div>
                    <div className="mt-3 space-y-2">
                      {sourceInventory.selected.slice(0, 4).map((source) => (
                        <div key={source.id} className="rounded-2xl bg-[#fcfaf6] px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-stone-800">{source.title}</p>
                            {formatSourceMeta(source).map((meta) => (
                              <span key={`${source.id}-${meta}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                                {meta}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-stone-600">
                            {source.claimCount} supporting claim{source.claimCount === 1 ? "" : "s"}
                          </p>
                          {source.citationIds.length ? (
                            <CitationReferences citationIds={source.citationIds} citationsById={citationsById} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {sourceInventory.rejected.length > 0 || rejectedSources.length > 0 ? (
                  <div className="rounded-3xl border border-stone-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Rejected sources
                    </div>
                    <div className="mt-3 space-y-2">
                      {(sourceInventory.rejected.length > 0 ? sourceInventory.rejected : rejectedSources).slice(0, 4).map((source, index) =>
                        "title" in source ? (
                          <p key={`${source.title}-${index + 1}`} className="text-sm leading-6 text-stone-600">
                            <span className="font-medium text-stone-800">{source.title}</span>
                            {" - "}
                            {source.rejectionReason ?? "rejected"}
                          </p>
                        ) : (
                          <p key={`${source.source}-${index + 1}`} className="text-sm leading-6 text-stone-600">
                            <span className="font-medium text-stone-800">{source.source}</span>
                            {" - "}
                            {source.reason}
                          </p>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {failures.length > 0 ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Run notes</div>
                    <div className="mt-3 space-y-2">
                      {failures.slice(0, 4).map((failure, index) => (
                        <p key={`${failure.stage}-${failure.code}-${index + 1}`} className="text-sm leading-6 text-amber-900">
                          <span className="font-medium capitalize">{failure.stage}</span>
                          {" - "}
                          {failure.message}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Source collection</div>
                {sourceInventory.selected.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {sourceInventory.selected.map((source) => (
                      <div key={source.id} className="rounded-2xl bg-[#fcfaf6] px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-stone-800">{source.title}</p>
                          {formatSourceMeta(source).map((meta) => (
                            <span key={`${source.id}-${meta}`} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                              {meta}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-stone-600">
                          {source.claimCount} supporting claim{source.claimCount === 1 ? "" : "s"}
                        </p>
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4"
                          >
                            {source.url}
                          </a>
                        ) : null}
                        {source.citationIds.length ? (
                          <CitationReferences citationIds={source.citationIds} citationsById={citationsById} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    No normalized sources were retained for this run.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Citation index</div>
                {reportCitations.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {reportCitations.map((citation) => (
                      <div key={citation.id} className="rounded-2xl bg-[#fcfaf6] px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-stone-800">{citation.source}</p>
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                            {citation.id}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-stone-600">{citation.claim}</p>
                        {citation.url ? (
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4"
                          >
                            {citation.url}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    No citations were retained for this run.
                  </p>
                )}
              </div>
            </section>

            {report.sections.map((section) => {
              const isExpanded = expandedSections[section.id] ?? true;

              return (
                <article key={section.id} className="rounded-3xl border border-stone-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((current) => ({
                        ...current,
                        [section.id]: !isExpanded,
                      }))
                    }
                    className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <h3 className="text-base font-semibold text-stone-950">{section.title}</h3>
                      <div className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                        {section.angle}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-stone-500">{isExpanded ? "Hide" : "Show"}</span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4">
                      <div className="space-y-3">
                        {section.findings.split(/\n+/).map((paragraph, index) =>
                          paragraph.trim() ? (
                            <p key={`${section.id}-finding-${index + 1}`} className="text-sm leading-6 text-stone-700">
                              {paragraph.trim()}
                            </p>
                          ) : null,
                        )}
                      </div>

                      <div className="mt-5 border-t border-stone-200 pt-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Citations</div>
                        {section.citations.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {section.citations.map((citation) => (
                              <div key={citation.id} id={getCitationAnchor(citation.id)} className="rounded-3xl bg-[#fcfaf6] px-4 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium text-stone-800">{citation.source}</p>
                                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600">
                                        {citation.id}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-stone-600">{citation.claim}</p>
                                    {citation.sourceType || citation.publicationDate || citation.publicationSignal || citation.recencySignal || citation.accessibilityStatus ? (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {formatSourceMeta({
                                          sourceType: citation.sourceType ?? "other",
                                          publicationSignal: citation.publicationSignal ?? "unknown",
                                          recencySignal: citation.recencySignal ?? "unknown",
                                          accessibilityStatus: citation.accessibilityStatus ?? "unknown",
                                          publicationDate: citation.publicationDate,
                                        }).map((meta) => (
                                          <span
                                            key={`${citation.id}-${meta}`}
                                            className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-stone-600"
                                          >
                                            {meta}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                    {citation.url ? (
                                      <a
                                        href={citation.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-xs font-medium text-stone-500 underline decoration-stone-300 underline-offset-4"
                                      >
                                        {citation.url}
                                      </a>
                                    ) : null}
                                  </div>
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getRelevanceClasses(
                                      citation.relevance,
                                    )}`}
                                  >
                                    {citation.relevance} relevance
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-stone-600">
                            No citations were retained for this section.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
